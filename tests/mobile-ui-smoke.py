import asyncio, re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parent.parent
HTML=(ROOT/'index.html').read_text(encoding='utf-8')
CSS=(ROOT/'css/style.css').read_text(encoding='utf-8')
SCRIPTS=[(ROOT/f).read_text(encoding='utf-8') for f in ['js/config.js','js/storage.js','js/ui.js','js/app.js','js/account.js']]

def stripped_html():
    h=HTML
    h=re.sub(r'<link[^>]+(?:stylesheet|manifest|apple-touch-icon)[^>]*>', '', h)
    h=re.sub(r'<script[^>]*src=["\'][^"\']+["\'][^>]*></script>', '', h)
    return h

async def load(page):
    await page.set_content(stripped_html(), wait_until='domcontentloaded')
    css='\n'.join(line for line in CSS.splitlines() if not line.lstrip().startswith('@import'))
    await page.add_style_tag(content=css)
    await page.add_script_tag(content='''
      (()=>{const m=new Map(); const st={getItem:k=>m.has(String(k))?m.get(String(k)):null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}}; Object.defineProperty(window,'localStorage',{value:st,configurable:true});})();
      window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>({data:{user:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}};
    ''')
    for src in SCRIPTS:
        await page.add_script_tag(content=src)
    await page.evaluate('''() => { const a=document.querySelector('#authScreen'); const app=document.querySelector('#appShell'); if(a)a.hidden=true; if(app){app.hidden=false;app.setAttribute('aria-hidden','false')} document.body.classList.remove('auth-pending','auth-logged-out'); document.body.classList.add('auth-logged-in'); }''')
    await page.wait_for_timeout(150)

async def visible_overflows(page):
    return await page.evaluate('''() => {const vw=document.documentElement.clientWidth;return [...document.body.querySelectorAll('*')].flatMap(el=>{const st=getComputedStyle(el); if(st.display==='none'||st.visibility==='hidden'||el.closest('[hidden]')) return []; const r=el.getBoundingClientRect(); if(r.width<=0||r.height<=0)return[]; if(r.right>vw+1||r.left<-1)return[{tag:el.tagName,id:el.id,cls:String(el.className),left:r.left,right:r.right,width:r.width,vw}];return[];});}''')

async def run():
  out = ROOT.parent / 'hoonnote_v4_5_9_testshots'; out.mkdir(exist_ok=True)
  async with async_playwright() as pw:
    browser=await pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    try:
      for width in [320,360,375,390,412,430]:
        page=await browser.new_page(viewport={'width':width,'height':780})
        errors=[]; page.on('pageerror', lambda e: errors.append(str(e)))
        await load(page)
        assert await page.locator('.brand-name').inner_text()=='HOONNOTE'
        assert await page.locator('#openCategoryManagerButton').count()==0
        assert await page.locator('#appMenuCloseButton').count()==0
        layout=await page.evaluate('''()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,bw:document.body.scrollWidth})''')
        assert layout['sw']<=layout['cw'] and layout['bw']<=layout['cw'],(width,layout)
        assert not await visible_overflows(page),(width,(await visible_overflows(page))[:5])
        # categories wrap and never become a horizontal scroller
        await page.evaluate('''()=>{const tabs=document.querySelector('#categoryTabs'); ['장기 프로젝트','개인 공부','운동 기록','콘텐츠 제작','아이디어 보관','생활 기록'].forEach(n=>{const b=document.createElement('button');b.type='button';b.className='category-tab';b.textContent=n;tabs.append(b);});}''')
        await page.wait_for_timeout(60)
        cm=await page.locator('#categoryTabs').evaluate('''el=>({h:el.getBoundingClientRect().height,sw:el.scrollWidth,cw:el.clientWidth,wrap:getComputedStyle(el).flexWrap,overflow:getComputedStyle(el).overflowX})''')
        assert cm['h']>34,(width,cm)
        assert cm['sw']<=cm['cw']+1,(width,cm)
        assert cm['wrap']=='wrap',(width,cm)
        # dedicated editor screen
        await page.locator('#mobileNewMemoButton').click()
        await page.wait_for_timeout(100)
        assert await page.locator('#editorView').is_visible()
        assert await page.locator('#notesView').is_hidden()
        assert await page.locator('.primary-view-tabs').is_hidden()
        assert await page.locator('#editorCategoryManagerButton').is_visible()
        assert not await visible_overflows(page),(width,(await visible_overflows(page))[:5])
        await page.locator('#editorBackButton').click()
        await page.wait_for_timeout(180)
        assert await page.locator('#notesView').is_visible()
        # task duplicate heading removed
        await page.locator('#tasksViewTab').click(); await page.wait_for_timeout(80)
        assert await page.locator('#tasksView').is_visible()
        assert await page.locator('#taskHubTitle').count()==0
        assert await page.locator('#taskHubResultText').count()==0
        await page.locator('#notesViewTab').click(); await page.wait_for_timeout(80)
        # menu gear -> dedicated settings view
        await page.locator('#appMenuButton').click(); await page.wait_for_timeout(280)
        assert await page.locator('#openSettingsButton').is_visible()
        gear_color=await page.locator('#openSettingsButton').evaluate('el=>getComputedStyle(el).color')
        assert gear_color in ('rgb(107, 114, 128)','rgb(71, 85, 105)'),gear_color
        menu=await page.locator('#appMenuPanel').bounding_box(); assert menu and menu['width']<=width*.85+3,(width,menu)
        await page.mouse.click(8, 300)
        await page.wait_for_timeout(340)
        assert await page.locator('#appMenuPanel').is_hidden()
        await page.locator('#appMenuButton').click(); await page.wait_for_timeout(300)
        await page.locator('#openSettingsButton').click(); await page.wait_for_timeout(320)
        assert await page.locator('#appMenuPanel').is_hidden()
        assert await page.locator('#settingsView').is_visible()
        assert await page.locator('#accountManagementToggleButton').is_visible()
        assert await page.locator('#menuCategorySettingsButton').count()==0
        assert await page.locator('.primary-view-tabs').is_hidden()
        await page.locator('#accountManagementToggleButton').click()
        assert await page.locator('#openAccountDeletionButton').is_visible()
        assert not await visible_overflows(page),(width,(await visible_overflows(page))[:5])
        await page.locator('#settingsBackButton').click(); await page.wait_for_timeout(180)
        assert await page.locator('#notesView').is_visible()
        assert not errors,(width,errors)
        if width==390:
          await page.screenshot(path=str(out/'main-390.png'),full_page=True)
          await page.locator('#mobileNewMemoButton').click(); await page.wait_for_timeout(80)
          await page.screenshot(path=str(out/'editor-390.png'),full_page=True)
          await page.locator('#editorBackButton').click(); await page.wait_for_timeout(150)
          await page.locator('#appMenuButton').click(); await page.wait_for_timeout(260)
          await page.screenshot(path=str(out/'menu-390.png'),full_page=False)
          await page.locator('#openSettingsButton').click(); await page.wait_for_timeout(320)
          await page.screenshot(path=str(out/'settings-390.png'),full_page=True)
        await page.close()
    finally:
      await browser.close()
  print('PASS',out)
asyncio.run(run())
