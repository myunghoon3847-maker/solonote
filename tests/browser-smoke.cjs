const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const projectRoot = path.resolve(__dirname, "..");
const screenshotDirectory = "/tmp/hoonnote-v4.5.7-browser-smoke";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

function startServer() {
  const server = http.createServer((request, response) => {
    const requestPath = new URL(request.url, "http://127.0.0.1").pathname;
    const relativePath = requestPath === "/" ? "index.html" : requestPath.slice(1);
    const filePath = path.resolve(projectRoot, relativePath);

    if (!filePath.startsWith(`${projectRoot}${path.sep}`) || !fs.existsSync(filePath)) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
    });
    fs.createReadStream(filePath).pipe(response);
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}/`,
      });
    });
  });
}

async function showApp(page) {
  await page.evaluate(() => {
    document.querySelector("#authView").hidden = true;
    document.querySelector("#appShell").hidden = false;
  });
}

async function run() {
  fs.mkdirSync(screenshotDirectory, { recursive: true });
  const { server, url } = await startServer();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

    await page.route("https://cdn.jsdelivr.net/**", async (route) => {
      await route.fulfill({
        contentType: "text/javascript",
        body: `
          window.supabase = {
            createClient() {
              return {
                auth: {
                  getSession: async () => ({ data: { session: null }, error: null }),
                  getUser: async () => ({ data: { user: null }, error: null }),
                  onAuthStateChange: () => ({
                    data: { subscription: { unsubscribe() {} } }
                  })
                }
              };
            }
          };
        `,
      });
    });

    await page.goto(url, { waitUntil: "networkidle" });
    await showApp(page);

    assert.equal(await page.locator("#filterToggleButton").count(), 0);
    assert.equal(await page.locator("#projectFilterInput").count(), 0);
    assert.equal(await page.locator("#memoCount").count(), 0);
    assert.equal(await page.locator("#resultSummary").count(), 0);
    assert.equal(await page.locator(".sort-option").count(), 5);
    assert.equal(await page.locator(".sort-separator").count(), 4);

    const layout = await page.evaluate(() => {
      const textarea = document.querySelector("#contentInput");
      const sortOption = document.querySelector(".sort-option");
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        textareaHeight: textarea.getBoundingClientRect().height,
        sortFontSize: Number.parseFloat(getComputedStyle(sortOption).fontSize),
      };
    });

    assert.ok(layout.documentWidth <= layout.viewportWidth);
    assert.ok(layout.textareaHeight >= 230);
    assert.ok(layout.sortFontSize <= 10);

    await page.locator("#appMenuButton").click();
    assert.equal(await page.locator("#appMenuPanel").getAttribute("aria-hidden"), "false");
    await page.goBack();
    await page.waitForTimeout(320);
    assert.equal(await page.locator("#appMenuPanel").getAttribute("aria-hidden"), "true");

    await page.locator("#tasksViewTab").click();
    assert.equal(await page.locator("#tasksView").isVisible(), true);
    await page.goBack();
    assert.equal(await page.locator("#notesView").isVisible(), true);

    await page.locator("#mobileNewMemoButton").click();
    assert.equal(await page.locator(".editor-panel").isVisible(), true);
    await page.goBack();
    assert.equal(await page.locator(".editor-panel").isVisible(), false);

    await page.locator("#mobileNewMemoButton").click();
    await page.locator("#editorCategoryManagerButton").click();
    assert.equal(await page.locator("#categoryManagerModal").isVisible(), true);
    await page.goBack();
    assert.equal(await page.locator("#categoryManagerModal").isVisible(), false);
    await page.locator("#homeLogoButton").click();
    assert.equal(await page.locator("#notesView").isVisible(), true);
    assert.equal(await page.locator(".editor-panel").isVisible(), false);

    await page.locator("#appMenuButton").click();
    await page.locator("#dataManagementToggleButton").click();
    assert.equal(
      await page.locator("#openTrashButton").evaluate((element) =>
        element.closest("#dataManagementContent") !== null
      ),
      true
    );

    await page.screenshot({
      path: path.join(screenshotDirectory, "mobile-data-management.png"),
      fullPage: true,
    });

    await page.locator("#openTrashButton").click();
    await page.waitForTimeout(320);
    assert.equal(await page.locator("#trashView").isVisible(), true);
    assert.equal(await page.locator("#backFromTrashButton").count(), 0);
    await page.locator("#homeLogoButton").click();
    assert.equal(await page.locator("#notesView").isVisible(), true);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({
      path: path.join(screenshotDirectory, "desktop-main.png"),
      fullPage: true,
    });

    console.log(`Browser smoke passed. Screenshots: ${screenshotDirectory}`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
