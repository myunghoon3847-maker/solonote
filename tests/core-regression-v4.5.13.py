import asyncio
import json
import re
from pathlib import Path

from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT.parent / "hoonnote_v4_5_13_regression_shots"
OUT.mkdir(exist_ok=True)

HTML = (ROOT / "index.html").read_text(encoding="utf-8")
CSS = (ROOT / "css/style.css").read_text(encoding="utf-8")
SCRIPT_NAMES = [
    "config.js",
    "auth.js",
    "storage.js",
    "ui.js",
    "app.js",
    "account.js",
]

MOCK_SUPABASE = r'''
(() => {
  const makeStorage = () => {
    const data = new Map();
    return {
      get length() { return data.size; },
      key(index) { return [...data.keys()][index] ?? null; },
      getItem(key) { return data.has(String(key)) ? data.get(String(key)) : null; },
      setItem(key, value) { data.set(String(key), String(value)); },
      removeItem(key) { data.delete(String(key)); },
      clear() { data.clear(); },
    };
  };

  Object.defineProperty(window, "localStorage", {
    value: makeStorage(),
    configurable: true,
  });
  Object.defineProperty(window, "sessionStorage", {
    value: makeStorage(),
    configurable: true,
  });

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();
  const matches = (row, filters) =>
    filters.every(([key, value]) => String(row[key]) === String(value));

  let sequence = 1;
  const user = { id: "user-1", email: "tester@example.com" };
  const state = {
    session: null,
    password: "password123",
    listeners: [],
    memos: [],
    memo_categories: [],
  };

  class Query {
    constructor(table) {
      this.table = table;
      this.operation = "select";
      this.payload = null;
      this.filters = [];
      this.orders = [];
    }

    select() { return this; }
    insert(payload) { this.operation = "insert"; this.payload = payload; return this; }
    update(payload) { this.operation = "update"; this.payload = payload; return this; }
    delete() { this.operation = "delete"; return this; }
    eq(key, value) { this.filters.push([key, value]); return this; }
    order(key, options = {}) {
      this.orders.push([key, options.ascending !== false]);
      return this;
    }
    single() { return this.execute("single"); }
    maybeSingle() { return this.execute("maybeSingle"); }
    then(resolve, reject) { return this.execute("many").then(resolve, reject); }

    async execute(mode) {
      let rows = state[this.table];
      if (!rows) return { data: null, error: { message: "Unknown table" } };

      const selected = rows.filter((row) => matches(row, this.filters));

      if (this.operation === "select") {
        const result = selected.slice();
        for (const [key, ascending] of this.orders.slice().reverse()) {
          result.sort((a, b) =>
            String(a[key] ?? "").localeCompare(String(b[key] ?? "")) *
            (ascending ? 1 : -1)
          );
        }
        if (mode === "single") {
          return result.length === 1
            ? { data: clone(result[0]), error: null }
            : { data: null, error: { message: "Expected a single row" } };
        }
        if (mode === "maybeSingle") {
          return { data: result[0] ? clone(result[0]) : null, error: null };
        }
        return { data: clone(result), error: null };
      }

      if (this.operation === "insert") {
        const input = Array.isArray(this.payload) ? this.payload : [this.payload];
        const inserted = [];

        for (const item of input) {
          if (
            this.table === "memo_categories" &&
            rows.some(
              (row) =>
                row.user_id === item.user_id &&
                row.name.toLocaleLowerCase("ko-KR") ===
                  String(item.name).toLocaleLowerCase("ko-KR")
            )
          ) {
            return { data: null, error: { code: "23505", message: "Duplicate" } };
          }

          const row = { ...clone(item) };
          row.id ||= `${this.table === "memos" ? "memo" : "category"}-${sequence++}`;
          row.created_at ||= now();
          row.updated_at ||= row.created_at;

          if (this.table === "memos") {
            row.title ||= "";
            row.content ||= "";
            row.category ||= "업무";
            row.project ||= "";
            row.is_important = Boolean(row.is_important);
            row.is_deleted = Boolean(row.is_deleted);
            row.tasks = Array.isArray(row.tasks) ? row.tasks : [];
          }

          rows.push(row);
          inserted.push(row);
        }

        return {
          data: clone(mode === "single" ? inserted[0] : inserted),
          error: null,
        };
      }

      if (this.operation === "update") {
        const updated = [];
        for (const row of selected) {
          Object.assign(row, clone(this.payload), { updated_at: now() });
          updated.push(row);
        }
        return {
          data: clone(
            mode === "single"
              ? updated[0]
              : mode === "maybeSingle"
                ? updated[0] || null
                : updated
          ),
          error: null,
        };
      }

      if (this.operation === "delete") {
        state[this.table] = rows.filter((row) => !matches(row, this.filters));
        return { data: null, error: null };
      }

      return { data: null, error: null };
    }
  }

  const notify = (event, session) => {
    state.listeners.forEach((listener) =>
      queueMicrotask(() => listener(event, clone(session)))
    );
  };

  const client = {
    auth: {
      async getSession() {
        return { data: { session: clone(state.session) }, error: null };
      },
      async getUser() {
        return { data: { user: state.session ? clone(user) : null }, error: null };
      },
      onAuthStateChange(listener) {
        state.listeners.push(listener);
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async signInWithPassword({ email, password }) {
        if (password !== state.password) {
          return {
            data: { session: null },
            error: { message: "Invalid login credentials" },
          };
        }
        state.session = {
          access_token: "mock-access-token",
          user: { ...user, email },
        };
        notify("SIGNED_IN", state.session);
        return { data: { session: clone(state.session) }, error: null };
      },
      async signUp({ email }) {
        return { data: { session: null, user: { ...user, email } }, error: null };
      },
      async resetPasswordForEmail() {
        return { data: {}, error: null };
      },
      async updateUser({ password }) {
        state.password = password;
        return { data: { user: clone(user) }, error: null };
      },
      async signOut() {
        state.session = null;
        notify("SIGNED_OUT", null);
        return { error: null };
      },
    },
    from(table) {
      return new Query(table);
    },
    async rpc(name, args) {
      if (name === "rename_memo_category") {
        const category = state.memo_categories.find(
          (item) => item.id === args.target_category_id
        );
        if (!category) return { data: null, error: { message: "Not found" } };
        const oldName = category.name;
        category.name = args.replacement_name;
        category.updated_at = now();
        state.memos.forEach((memo) => {
          if (memo.category === oldName) {
            memo.category = category.name;
            memo.updated_at = now();
          }
        });
        return { data: null, error: null };
      }

      if (name === "delete_memo_category") {
        const category = state.memo_categories.find(
          (item) => item.id === args.target_category_id
        );
        if (!category) return { data: 0, error: null };
        let affected = 0;
        state.memos.forEach((memo) => {
          if (memo.category === category.name) {
            memo.category = "미분류";
            memo.updated_at = now();
            affected += 1;
          }
        });
        state.memo_categories = state.memo_categories.filter(
          (item) => item.id !== category.id
        );
        return { data: affected, error: null };
      }

      return { data: null, error: { message: "Unknown RPC" } };
    },
  };

  window.__mockDb = state;
  window.supabase = { createClient() { return client; } };
})();
'''


def stripped_html():
    html = HTML
    html = re.sub(
        r'<link[^>]+(?:stylesheet|manifest|apple-touch-icon)[^>]*>',
        '',
        html,
    )
    html = re.sub(r'<script[^>]*src=["\'][^"\']+["\'][^>]*></script>', '', html)
    return html


async def load_app(page):
    await page.set_content(stripped_html(), wait_until="domcontentloaded")
    css = "\n".join(line for line in CSS.splitlines() if not line.lstrip().startswith("@import"))
    await page.add_style_tag(content=css)
    await page.add_script_tag(content=MOCK_SUPABASE)

    for name in SCRIPT_NAMES:
        source = (ROOT / "js" / name).read_text(encoding="utf-8")
        if name == "auth.js":
            source = source.replace(
                'return new URL("./", window.location.href).href;',
                'return "https://example.com/";',
            )
        await page.add_script_tag(content=source)

    await page.wait_for_timeout(150)


async def run():
    passed = []

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            headless=True,
            executable_path="/usr/bin/chromium",
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        )
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            accept_downloads=True,
            service_workers="block",
        )
        page = await context.new_page()
        page.set_default_timeout(8000)

        page_errors = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))

        async def accept_dialog(dialog):
            if dialog.type == "prompt":
                await dialog.accept("테스트 변경")
            else:
                await dialog.accept()

        page.on("dialog", lambda dialog: asyncio.create_task(accept_dialog(dialog)))
        await load_app(page)

        await expect(page.locator("#loginForm")).to_be_visible()
        passed.append("로그인 초기 화면")

        await page.fill("#loginEmail", "tester@example.com")
        await page.fill("#loginPassword", "wrong-password")
        await page.click("#loginButton")
        await expect(page.locator("#authMessage")).to_contain_text(
            "이메일 또는 비밀번호가 올바르지 않습니다"
        )
        passed.append("잘못된 로그인 차단")

        await page.click("#showSignupButton")
        await page.fill("#signupEmail", "new@example.com")
        await page.fill("#signupPassword", "12345678")
        await page.fill("#signupPasswordConfirm", "12345678")
        assert await page.locator("#signupButton").is_disabled()
        await page.check("#agreeTerms")
        await page.check("#agreePrivacy")
        await page.check("#confirmAge")
        assert not await page.locator("#signupButton").is_disabled()
        await page.click("#backToLoginFromSignupButton")
        await page.click("#forgotPasswordButton")
        await page.fill("#resetEmail", "tester@example.com")
        await page.click("#resetRequestButton")
        await expect(page.locator("#authMessage")).to_contain_text("재설정 이메일")
        await page.click("#backToLoginButton")
        passed.append("회원가입 필수 동의·비밀번호 재설정 요청")

        await page.fill("#loginEmail", "tester@example.com")
        await page.fill("#loginPassword", "password123")
        await page.click("#loginButton")
        await expect(page.locator("#appShell")).to_be_visible()
        await expect(page.locator("#cloudSyncStatus")).to_contain_text(
            "클라우드 동기화 완료"
        )
        passed.append("로그인·클라우드 초기 동기화")

        await page.click("#mobileNewMemoButton")
        await page.click("#editorCategoryManagerButton")
        await page.fill("#newCategoryInput", "테스트")
        await page.click("#addCategoryButton")
        await expect(page.locator("#categoryManagerList")).to_contain_text("테스트")
        await page.evaluate("closeCategoryManager({skipHistory:true})")
        passed.append("카테고리 추가")

        await page.fill("#titleInput", "회귀 테스트 메모")
        await page.fill("#contentInput", "메모 저장과 검색을 검사합니다.")
        await page.click("#categoryPickerButton")
        await page.locator('.category-picker-option[data-value="테스트"]').click()
        await page.fill("#taskInput", "첫 번째 할 일")
        await page.click("#addTaskButton")
        await page.check("#importantInput")
        await page.click("#saveButton")
        await expect(page.locator("#memoList")).to_contain_text("회귀 테스트 메모")
        assert len(await page.evaluate("window.__mockDb.memos")) == 1
        passed.append("메모·중요 표시·체크리스트 저장")

        await page.fill("#searchInput", "없는 검색어")
        await expect(page.locator("#memoList")).to_contain_text("표시할 메모가 없습니다")
        await page.fill("#searchInput", "회귀")
        await page.locator('[data-category="테스트"]').click()
        await expect(page.locator("#memoList")).to_contain_text("회귀 테스트 메모")
        await page.locator('[data-sort="titleAsc"]').click()
        passed.append("검색·카테고리 필터·정렬")

        await page.locator(".memo-card").click()
        await page.click("#editMemoButton")
        await page.fill("#titleInput", "수정된 회귀 메모")
        await page.click("#saveButton")
        await expect(page.locator("#memoList")).to_contain_text("수정된 회귀 메모")
        passed.append("메모 상세·수정")

        await page.click("#tasksViewTab")
        await expect(page.locator("#taskHubList")).to_contain_text("첫 번째 할 일")
        await page.click(".task-hub-check-button")
        await expect(page.locator("#taskHubList")).to_contain_text(
            "남아 있는 할 일이 없습니다"
        )
        await page.locator('[data-task-view="all"]').click()
        await expect(page.locator("#taskHubList")).to_contain_text("첫 번째 할 일")
        passed.append("할 일 완료·완료 포함")

        await page.click("#notesViewTab")
        await page.locator(".memo-card").click()
        await page.click("#deleteMemoButton")
        await expect(page.locator("#memoList")).to_contain_text("표시할 메모가 없습니다")
        await page.click("#appMenuButton")
        await page.click("#dataManagementToggleButton")
        await page.click("#openTrashButton")
        await expect(page.locator("#trashList")).to_contain_text("수정된 회귀 메모")
        await page.click('[data-trash-action="restore"]')
        await expect(page.locator("#trashList")).to_contain_text("휴지통이 비어 있습니다")
        await page.click("#homeLogoButton")
        await expect(page.locator("#memoList")).to_contain_text("수정된 회귀 메모")
        passed.append("휴지통 이동·복원")

        await page.click("#mobileNewMemoButton")
        await page.click("#editorCategoryManagerButton")
        test_category = page.locator('.category-manager-item:has-text("테스트")')
        await test_category.locator('[data-category-action="rename"]').click()
        await expect(page.locator("#categoryManagerList")).to_contain_text("테스트 변경")
        await page.evaluate("closeCategoryManager({skipHistory:true})")
        await page.click("#editorBackButton")
        passed.append("카테고리 이름 변경·메모 연동")

        await page.click("#appMenuButton")
        async with page.expect_download() as download_info:
            await page.click("#backupButton")
        download = await download_info.value
        backup = json.loads(Path(await download.path()).read_text(encoding="utf-8"))
        assert backup["memos"][0]["title"] == "수정된 회귀 메모"
        passed.append("JSON 백업")

        import_result = await page.evaluate(
            """async () => importMemosFromBackup({
              categories: ['복원 분류'],
              memos: [{
                title: '복원 메모', content: '복원 테스트', category: '복원 분류',
                project: '', isImportant: false, isDeleted: false, tasks: [],
                createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
              }]
            })"""
        )
        assert import_result["addedCount"] == 1
        duplicate_result = await page.evaluate(
            """async () => importMemosFromBackup({
              categories: ['복원 분류'],
              memos: [{
                title: '복원 메모', content: '복원 테스트', category: '복원 분류',
                project: '', isImportant: false, isDeleted: false, tasks: [],
                createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
              }]
            })"""
        )
        assert duplicate_result["skippedCount"] == 1
        passed.append("백업 복원·중복 제외")

        await page.click("#openSettingsButton")
        await page.click("#menuAccountManagementToggleButton")
        await expect(page.locator("#logoutButton")).to_be_visible()
        await expect(page.locator("#openAccountDeletionButton")).to_be_visible()
        await page.click("#openAccountDeletionButton")
        await expect(page.locator("#accountDeletionModal")).to_be_visible()
        assert await page.locator("#confirmAccountDeletionButton").is_disabled()
        await page.fill("#accountDeletionPassword", "password123")
        await page.fill("#accountDeletionConfirmation", "계정 삭제")
        assert not await page.locator("#confirmAccountDeletionButton").is_disabled()
        await page.click("#cancelAccountDeletionButton")
        passed.append("계정 삭제 진입·확인 문구 검증")

        await page.click("#appMenuButton")
        await page.click("#openSettingsButton")
        await page.click("#menuAccountManagementToggleButton")
        await page.click("#logoutButton")
        await expect(page.locator("#loginForm")).to_be_visible()
        passed.append("로그아웃")

        await page.fill("#loginEmail", "tester@example.com")
        await page.fill("#loginPassword", "password123")
        await page.click("#loginButton")
        await page.click("#mobileNewMemoButton")
        await page.fill("#titleInput", "자동 초안")
        await page.fill("#contentInput", "저장하지 않은 내용")
        await page.wait_for_timeout(900)
        await page.click("#editorBackButton")
        assert await page.evaluate("window.localStorage.length > 0")
        await page.evaluate("checkForRecoverableDraft()")
        await expect(page.locator("#draftRecoveryBanner")).to_be_visible()
        await page.click("#restoreDraftButton")
        await expect(page.locator("#titleInput")).to_have_value("자동 초안")
        await page.click("#editorBackButton")
        await page.evaluate("checkForRecoverableDraft()")
        await page.click("#discardDraftButton")
        assert await page.evaluate("![...Array(localStorage.length).keys()].map(i => localStorage.key(i)).some(key => key && key.startsWith('solonote_editor_draft_v4:'))")
        passed.append("자동 초안 저장·복구·삭제")

        for width in [320, 360, 375, 390, 412, 430]:
            await page.set_viewport_size({"width": width, "height": 844})
            dimensions = await page.evaluate(
                "({scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth})"
            )
            assert dimensions["scrollWidth"] <= dimensions["clientWidth"], (
                width,
                dimensions,
            )
        passed.append("320~430px 가로 넘침")

        await page.set_viewport_size({"width": 390, "height": 844})
        await page.screenshot(path=str(OUT / "core-regression-final.png"), full_page=True)

        assert not page_errors, page_errors
        await browser.close()

    print(f"PASS {len(passed)} core regression checks")
    for item in passed:
        print(f"- {item}")
    print(f"Screenshots: {OUT}")


asyncio.run(run())
