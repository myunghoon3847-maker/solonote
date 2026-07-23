const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");

function loadClassicScript(relativePath, extraContext = {}) {
  const context = vm.createContext({
    console,
    ...extraContext,
  });
  const source = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  vm.runInContext(source, context, { filename: relativePath });
  return context;
}

test("malicious checklist identifiers are normalized and escaped", () => {
  const storageContext = loadClassicScript("js/storage.js", {
    window: {
      crypto: { randomUUID: () => "safe-generated-id" },
    },
  });
  const normalizedId = vm.runInContext(
    `normalizeTask({ id: 'x" autofocus onfocus="alert(1)', text: 'test' }).id`,
    storageContext
  );

  assert.equal(normalizedId, "task_safe-generated-id");

  const uiContext = loadClassicScript("js/ui.js");
  const rendered = vm.runInContext(
    `renderTaskChecklistHtml({
      id: 'memo" onclick="alert(1)',
      tasks: [{ id: 'task" autofocus onfocus="alert(1)', text: '<img src=x onerror=alert(1)>', done: false }]
    })`,
    uiContext
  );

  assert.doesNotMatch(rendered, /data-task-id="task" autofocus/);
  assert.doesNotMatch(rendered, /<img src=x/);
  assert.match(rendered, /&quot;/);
  assert.match(rendered, /&lt;img/);
});

test("backup import rejects oversized or malformed content", () => {
  const context = loadClassicScript("js/storage.js", {
    window: {
      crypto: { randomUUID: () => "safe-generated-id" },
    },
  });

  assert.throws(
    () =>
      vm.runInContext(
        `validateBackupForImport({}, [{ title: "a".repeat(MAX_MEMO_TITLE_LENGTH + 1), content: "ok", tasks: [] }])`,
        context
      ),
    /허용 길이/
  );

  assert.throws(
    () =>
      vm.runInContext(
        `validateBackupForImport({}, [{ title: "ok", content: "ok", tasks: "not-an-array" }])`,
        context
      ),
    /체크리스트 형식/
  );

  assert.throws(
    () =>
      vm.runInContext(
        `validateMemoForWrite({ title: "ok", content: "ok", project: "ok", category: "업무", tasks: [{ text: "x".repeat(MAX_MEMO_TASK_TEXT_LENGTH + 1) }] })`,
        context
      ),
    /체크리스트 내용/
  );

  const uniqueTaskIds = vm.runInContext(
    `normalizeTasks([
      { id: "duplicate", text: "one" },
      { id: "duplicate", text: "two" }
    ]).map((task) => task.id)`,
    context
  );
  assert.equal(new Set(uniqueTaskIds).size, 2);
});

test("cloud reads and legacy migration updates include the signed-in user id", async () => {
  const queries = [];

  class Query {
    constructor(rows = []) {
      this.data = rows;
      this.error = null;
      this.operations = [];
    }

    select(value) {
      this.operations.push(["select", value]);
      return this;
    }

    update(value) {
      this.operations.push(["update", value]);
      this.data = null;
      return this;
    }

    eq(column, value) {
      this.operations.push(["eq", column, value]);
      return this;
    }

    order(column, options) {
      this.operations.push(["order", column, options]);
      return this;
    }
  }

  const client = {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: "user-a" } } },
        error: null,
      }),
    },
    from(table) {
      const query = new Query(
        queries.length === 0
          ? [
              {
                id: "memo-1",
                title: "legacy",
                content: "content",
                category: "프로젝트",
                project: "",
                is_important: false,
                is_deleted: false,
                tasks: [],
                created_at: "2026-07-01T00:00:00.000Z",
                updated_at: "2026-07-01T00:00:00.000Z",
              },
            ]
          : []
      );
      query.table = table;
      queries.push(query);
      return query;
    },
  };

  const windowObject = {
    crypto: { randomUUID: () => "safe-generated-id" },
    solonoteSupabase: client,
  };
  const context = loadClassicScript("js/storage.js", { window: windowObject });

  await vm.runInContext("loadMemosFromCloud()", context);

  assert.deepEqual(
    queries[0].operations.find((operation) => operation[0] === "eq"),
    ["eq", "user_id", "user-a"]
  );
  assert.ok(
    queries[1].operations.some(
      (operation) => operation[0] === "eq" && operation[1] === "user_id" && operation[2] === "user-a"
    )
  );
});

test("release and cache versions are consistently set to v4.5.9", () => {
  const indexHtml = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
  const serviceWorker = fs.readFileSync(path.join(projectRoot, "service-worker.js"), "utf8");
  const accountSource = fs.readFileSync(path.join(projectRoot, "js/account.js"), "utf8");
  const storageSource = fs.readFileSync(path.join(projectRoot, "js/storage.js"), "utf8");

  assert.match(indexHtml, /version-badge">v4\.5\.9/);
  assert.doesNotMatch(indexHtml, /v=458/);
  assert.match(serviceWorker, /hoonnote-v4-5-9-cache/);
  assert.doesNotMatch(serviceWorker, /v=458/);
  assert.match(accountSource, /clientVersion: "4\.5\.9"/);
  assert.match(storageSource, /backupVersion: "4\.5\.9"/);
});

test("v4.5.9 dedicated editor, settings and category UI contract is preserved", () => {
  const indexHtml = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
  const appSource = fs.readFileSync(path.join(projectRoot, "js/app.js"), "utf8");
  const uiSource = fs.readFileSync(path.join(projectRoot, "js/ui.js"), "utf8");
  const styleSource = fs.readFileSync(path.join(projectRoot, "css/style.css"), "utf8");

  assert.match(indexHtml, /class="brand-name">HOONNOTE<\/span>/);
  assert.match(indexHtml, /<section[^>]*id="editorView"[^>]*>/);
  assert.match(indexHtml.match(/<section[^>]*id="editorView"[^>]*>/)[0], /hidden/);
  assert.match(indexHtml, /<section[^>]*id="settingsView"[^>]*>/);
  assert.match(indexHtml.match(/<section[^>]*id="settingsView"[^>]*>/)[0], /hidden/);
  assert.match(indexHtml, /id="editorBackButton"/);
  assert.match(indexHtml, /id="settingsBackButton"/);
  assert.match(indexHtml, /id="openSettingsButton"/);
  assert.match(indexHtml, /class="menu-header-settings-button"/);
  assert.doesNotMatch(indexHtml, /id="appMenuCloseButton"/);
  assert.doesNotMatch(indexHtml, /id="settingsToggleButton"/);
  assert.doesNotMatch(indexHtml, /id="settingsContent"/);
  assert.doesNotMatch(indexHtml, /id="menuCategorySettingsButton"/);
  assert.doesNotMatch(indexHtml, /id="openCategoryManagerButton"/);
  assert.match(indexHtml, /id="editorCategoryManagerButton"/);
  assert.match(indexHtml, /id="accountManagementToggleButton"/);
  assert.match(indexHtml, /<div[^>]*id="accountManagementContent"[^>]*>/);
  assert.match(indexHtml.match(/<div[^>]*id="accountManagementContent"[^>]*>/)[0], /hidden/);
  assert.match(indexHtml, /id="installAppButton"/);
  assert.doesNotMatch(indexHtml, /id="taskHubTitle"/);
  assert.doesNotMatch(indexHtml, /id="taskHubResultText"/);
  assert.match(indexHtml, /icons\/logo-mark\.svg\?v=459/);
  assert.match(indexHtml, /maximum-scale=1, user-scalable=no, viewport-fit=cover/);

  const editorPosition = indexHtml.indexOf('id="editorView"');
  const notesPosition = indexHtml.indexOf('id="notesView"');
  const tasksPosition = indexHtml.indexOf('id="tasksView"');
  assert.ok(editorPosition > notesPosition && editorPosition < tasksPosition);

  assert.match(appSource, /const allowedViews = \["notes", "tasks", "trash", "settings"\]/);
  assert.match(appSource, /function handleOpenSettingsClick\(\)/);
  assert.match(appSource, /function handleSettingsBackClick\(\)/);
  assert.match(appSource, /function handleEditorBackClick\(\)/);
  assert.match(appSource, /openSettingsButton\?\.addEventListener/);
  assert.match(appSource, /editorBackButton\?\.addEventListener/);
  assert.doesNotMatch(appSource, /function handleSettingsToggle\(\)/);
  assert.match(uiSource, /document\.querySelector\("#editorView"\)/);
  assert.match(uiSource, /document\.body\.classList\.add\("editor-view-open"\)/);

  assert.match(styleSource, /\.main-category-tabs\s*\{[\s\S]*?flex-wrap:\s*wrap/);
  assert.match(styleSource, /\.main-category-tabs\s*\{[\s\S]*?overflow:\s*visible/);
  assert.match(styleSource, /body\.editor-view-open \.primary-view-tabs/);
  assert.match(styleSource, /body\[data-app-view="settings"\] \.primary-view-tabs/);
  assert.match(styleSource, /\.menu-header-settings-button\s*\{/);
  assert.match(styleSource, /color:\s*#6b7280/);
  assert.match(styleSource, /\.settings-row-button\s*\{/);
  assert.match(styleSource, /overflow-x:\s*hidden/);
  assert.match(styleSource, /font-size:\s*16px/);
});

test("browser history navigation handles internal layers before app exit", () => {
  const appSource = fs.readFileSync(path.join(projectRoot, "js/app.js"), "utf8");
  const accountSource = fs.readFileSync(path.join(projectRoot, "js/account.js"), "utf8");

  for (const layer of [
    "menu",
    "editor",
    "detail",
    "categoryManager",
    "accountDeletion",
  ]) {
    assert.match(appSource, new RegExp(`"${layer}"`));
  }

  assert.match(appSource, /window\.history\.back\(\)/);
  assert.match(appSource, /window\.addEventListener\("popstate", handleAppHistoryPopState\)/);
  assert.match(appSource, /hasUnsavedEditorChanges\(\)/);
  assert.match(accountSource, /solonote-navigation-sync/);
});

test("local HTML and service-worker asset references exist", () => {
  const htmlFiles = [
    "index.html",
    "legal/privacy.html",
    "legal/terms.html",
    "support/index.html",
    "support/delete-account.html",
  ];

  for (const relativeHtmlPath of htmlFiles) {
    const html = fs.readFileSync(path.join(projectRoot, relativeHtmlPath), "utf8");
    const baseDirectory = path.dirname(path.join(projectRoot, relativeHtmlPath));
    const references = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
      .map((match) => match[1])
      .filter((reference) => !/^(?:https?:|mailto:|data:)/i.test(reference));

    for (const reference of references) {
      const withoutQuery = reference.split("?")[0];
      assert.ok(
        fs.existsSync(path.resolve(baseDirectory, withoutQuery)),
        `${relativeHtmlPath}: missing ${reference}`
      );
    }
  }

  const serviceWorker = fs.readFileSync(path.join(projectRoot, "service-worker.js"), "utf8");
  const cachedAssets = [...serviceWorker.matchAll(/^\s*"(\.\/[^"?]+)(?:\?[^"?]+)?",?$/gm)].map(
    (match) => match[1]
  );

  for (const asset of cachedAssets) {
    assert.ok(fs.existsSync(path.resolve(projectRoot, asset)), `service worker: missing ${asset}`);
  }
});
