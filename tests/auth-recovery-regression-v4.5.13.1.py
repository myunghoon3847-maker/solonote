import asyncio
import re
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
CONFIG = (ROOT / "js/config.js").read_text(encoding="utf-8")
AUTH = (ROOT / "js/auth.js").read_text(encoding="utf-8")

# The harness replaces the final page reload with an observable in-page login reset.
# Production code still performs location.replace() to fully discard recovery state.
AUTH_FOR_TEST = AUTH.replace(
    'return new URL("./", window.location.href).href;',
    'return "https://example.test/";',
).replace(
    'window.location.replace(getAuthRedirectUrl());\n      return;',
    'window.__recoveryRedirected = true; cleanAuthParametersFromUrl(); showLoginScreen("비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.", "success");\n      return;',
)


def stripped_html():
    html = re.sub(r'<link[^>]+(?:stylesheet|manifest|apple-touch-icon)[^>]*>', '', HTML)
    html = re.sub(r'<script[^>]*src=["\'][^"\']+["\'][^>]*></script>', '', html)
    return html


MOCK = r'''
(() => {
  const user = { id: "user-1", email: "tester@example.com" };
  let session = location.hash.includes("type=recovery")
    ? { access_token: "recovery-token", user }
    : null;
  const listeners = [];
  window.__resetCalls = 0;

  const notify = (event, value) => {
    listeners.forEach((listener) => queueMicrotask(() => listener(event, value)));
  };

  const client = {
    auth: {
      onAuthStateChange(listener) {
        listeners.push(listener);
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async getSession() { return { data: { session }, error: null }; },
      async signInWithPassword({ email, password }) {
        if (password !== "new-password-123") {
          return { data: { session: null }, error: { message: "Invalid login credentials" } };
        }
        session = { access_token: "login-token", user: { ...user, email } };
        notify("SIGNED_IN", session);
        return { data: { session }, error: null };
      },
      async updateUser({ password }) {
        window.__updatedPassword = password;
        notify("USER_UPDATED", session);
        return { data: { user }, error: null };
      },
      async signOut() {
        session = null;
        notify("SIGNED_OUT", null);
        return { error: null };
      },
      async resetPasswordForEmail() {
        window.__resetCalls += 1;
        if (window.__mockRateLimit) {
          return {
            data: null,
            error: {
              status: 429,
              code: "over_email_send_rate_limit",
              message: "Email rate limit exceeded",
            },
          };
        }
        return { data: {}, error: null };
      },
      async signUp() { return { data: { session: null }, error: null }; },
    },
  };

  window.supabase = { createClient() { return client; } };
})();
'''


async def load(page, recovery=False):
    await page.set_content(stripped_html(), wait_until="domcontentloaded")
    if recovery:
        await page.evaluate("location.hash = 'type=recovery'")
    else:
        await page.evaluate("location.hash = ''")
    await page.add_script_tag(content=MOCK)
    await page.add_script_tag(content=CONFIG)
    await page.add_script_tag(content=AUTH_FOR_TEST)
    await page.wait_for_timeout(100)


async def run():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            executable_path="/usr/bin/chromium",
            args=["--no-sandbox"],
        )
        try:
            page = await browser.new_page()
            await load(page, recovery=True)
            assert await page.locator("#passwordRecoveryForm").is_visible()
            await page.fill("#newPassword", "new-password-123")
            await page.fill("#confirmNewPassword", "new-password-123")
            await page.click("#updatePasswordButton")
            await page.wait_for_timeout(120)
            assert await page.evaluate("window.__recoveryRedirected") is True
            assert await page.locator("#loginForm").is_visible()
            assert await page.locator("#passwordRecoveryForm").is_hidden()

            await page.fill("#loginEmail", "tester@example.com")
            await page.fill("#loginPassword", "new-password-123")
            await page.click("#loginButton")
            await page.wait_for_timeout(100)
            assert await page.locator("#appShell").is_visible()
            assert await page.locator("#passwordRecoveryForm").is_hidden()
            await page.close()

            page = await browser.new_page()
            await load(page)
            await page.evaluate("window.__mockRateLimit = true")
            await page.click("#forgotPasswordButton")
            await page.fill("#resetEmail", "tester@example.com")
            await page.click("#resetRequestButton")
            await page.wait_for_timeout(100)
            message = await page.locator("#authMessage").inner_text(); assert "최대 1시간" in message
            assert await page.locator("#resetRequestButton").is_disabled()
            assert "초 후 다시 보내기" in await page.locator("#resetRequestButton").inner_text()
            assert await page.evaluate("window.__resetCalls") == 1
            await page.close()
        finally:
            await browser.close()

    print("PASS password recovery single-flow and reset-email rate-limit handling")


asyncio.run(run())
