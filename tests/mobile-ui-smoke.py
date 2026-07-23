import asyncio
import re
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
SCREENSHOT_DIR = Path('/mnt/data/hoonnote_v4_5_7_testshots')
HTML = (ROOT / 'index.html').read_text(encoding='utf-8')
CSS = (ROOT / 'css/style.css').read_text(encoding='utf-8')
SCRIPTS = [
    (ROOT / 'js/config.js').read_text(encoding='utf-8'),
    (ROOT / 'js/storage.js').read_text(encoding='utf-8'),
    (ROOT / 'js/ui.js').read_text(encoding='utf-8'),
    (ROOT / 'js/app.js').read_text(encoding='utf-8'),
    (ROOT / 'js/account.js').read_text(encoding='utf-8'),
]


def stripped_html():
    html = HTML
    html = re.sub(r'<link[^>]+(?:stylesheet|manifest|apple-touch-icon)[^>]*>', '', html)
    html = re.sub(r'<script[^>]*src=["\'][^"\']+["\'][^>]*></script>', '', html)
    return html


async def load_app(page):
    await page.set_content(stripped_html(), wait_until='domcontentloaded')
    css = CSS.replace(
        '@import url("https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700;800&display=swap");',
        '',
    )
    await page.add_style_tag(content=css)
    await page.add_script_tag(content="""
      (() => {
        const values = new Map();
        const storage = {
          getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
          setItem(key, value) { values.set(String(key), String(value)); },
          removeItem(key) { values.delete(String(key)); },
          clear() { values.clear(); },
          key(index) { return [...values.keys()][index] ?? null; },
          get length() { return values.size; }
        };
        Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
      })();
    """)
    await page.add_script_tag(content="""
      window.supabase={createClient(){return {auth:{
        getSession:async()=>({data:{session:null},error:null}),
        getUser:async()=>({data:{user:null},error:null}),
        onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
      }}}};
    """)
    for source in SCRIPTS:
        await page.add_script_tag(content=source)
    await page.evaluate("""() => {
      const auth = document.querySelector('#authScreen');
      const app = document.querySelector('#appShell');
      if (auth) auth.hidden = true;
      if (app) { app.hidden = false; app.setAttribute('aria-hidden', 'false'); }
      document.body.classList.remove('auth-pending', 'auth-logged-out');
      document.body.classList.add('auth-logged-in');
      window.dispatchEvent(new Event('resize'));
    }""")
    await page.wait_for_timeout(120)


async def visible_overflows(page):
    return await page.evaluate("""() => {
      const vw = document.documentElement.clientWidth;
      return [...document.body.querySelectorAll('*')].flatMap((el) => {
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || el.closest('[hidden]')) return [];
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return [];
        if (rect.right > vw + 1 || rect.left < -1) {
          return [{ tag: el.tagName, id: el.id, cls: String(el.className), left: rect.left, right: rect.right, width: rect.width, vw }];
        }
        return [];
      });
    }""")


async def run():
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            executable_path='/usr/bin/chromium',
            args=['--no-sandbox'],
        )
        try:
            for width in [320, 360, 375, 390, 412, 430]:
                page = await browser.new_page(viewport={"width": width, "height": 740})
                errors = []
                page.on('pageerror', lambda exc: errors.append(str(exc)))
                await load_app(page)

                layout = await page.evaluate("""() => ({
                  scrollWidth: document.documentElement.scrollWidth,
                  clientWidth: document.documentElement.clientWidth,
                  bodyWidth: document.body.scrollWidth
                })""")
                assert layout['scrollWidth'] <= layout['clientWidth'], (width, layout)
                assert layout['bodyWidth'] <= layout['clientWidth'], (width, layout)
                overflow = await visible_overflows(page)
                assert not overflow, (width, overflow[:5])

                await page.evaluate("""() => {
                  const tabs = document.querySelector('#categoryTabs');
                  ['장기 프로젝트','개인 공부','운동 기록','콘텐츠 제작','아이디어 보관'].forEach((name) => {
                    const button = document.createElement('button');
                    button.type='button';
                    button.className='category-tab';
                    button.dataset.category=name;
                    button.textContent=name;
                    tabs.append(button);
                  });
                  window.dispatchEvent(new Event('resize'));
                }""")
                await page.wait_for_timeout(150)
                more = page.locator('#categoryMoreButton')
                assert await more.is_visible(), width
                collapsed_height = await page.locator('#categoryTabs').evaluate(
                    '(el) => el.getBoundingClientRect().height'
                )
                assert collapsed_height <= 35, (width, collapsed_height)
                await more.click()
                expanded_height = await page.locator('#categoryTabs').evaluate(
                    '(el) => el.getBoundingClientRect().height'
                )
                assert expanded_height > collapsed_height + 10, (
                    width,
                    collapsed_height,
                    expanded_height,
                )
                manage_below = await page.evaluate("""() => {
                  const shell = document.querySelector('#categoryTabsShell').getBoundingClientRect();
                  const manage = document.querySelector('#openCategoryManagerButton').getBoundingClientRect();
                  return manage.top >= shell.bottom - 1;
                }""")
                assert manage_below, width

                await page.locator('#mobileNewMemoButton').click()
                assert await page.locator('#editorCategoryManagerButton').evaluate(
                    '(el) => !!el.closest(".editor-category-panel")'
                )
                await page.locator('#homeLogoButton').click()

                await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                await page.locator('#appMenuButton').click()
                await page.wait_for_timeout(280)
                menu_box = await page.locator('#appMenuPanel').bounding_box()
                assert menu_box and menu_box['width'] <= width * 0.85 + 2, (width, menu_box)
                assert menu_box['x'] >= width * 0.14, (width, menu_box)
                assert await page.locator('#accountManagementContent').is_hidden()
                await page.locator('#accountManagementToggleButton').click()
                assert await page.locator('#openAccountDeletionButton').is_visible()
                await page.locator('.menu-scroll').evaluate(
                    '(el) => { el.scrollTop = el.scrollHeight; }'
                )
                await page.wait_for_timeout(80)
                footer = await page.locator('.menu-footer').bounding_box()
                panel = await page.locator('#appMenuPanel').bounding_box()
                assert footer and panel
                assert footer['y'] + footer['height'] <= 741, (width, footer, panel)
                assert panel['y'] + panel['height'] <= 741, (width, panel)

                overflow_menu = await visible_overflows(page)
                overflow_menu = [
                    item
                    for item in overflow_menu
                    if 'app-menu-backdrop' not in item.get('cls', '')
                ]
                assert not overflow_menu, (width, overflow_menu[:5])

                await page.mouse.click(8, 300)
                await page.wait_for_timeout(300)
                assert (
                    await page.locator('#appMenuPanel').get_attribute('aria-hidden')
                    == 'true'
                )
                assert not errors, (width, errors)

                if width in (320, 390, 430):
                    await page.screenshot(
                        path=str(SCREENSHOT_DIR / f'mobile-{width}.png'),
                        full_page=True,
                    )
                await page.close()

            page = await browser.new_page(viewport={"width": 390, "height": 844})
            await load_app(page)
            await page.locator('#appMenuButton').click()
            await page.wait_for_timeout(280)
            await page.locator('#accountManagementToggleButton').click()
            await page.screenshot(
                path=str(SCREENSHOT_DIR / 'menu-390.png'),
                full_page=False,
            )
            await page.close()
        finally:
            await browser.close()

    print(f'Mobile UI smoke passed. Screenshots: {SCREENSHOT_DIR}')


if __name__ == '__main__':
    asyncio.run(run())
