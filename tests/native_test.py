import asyncio, json
from playwright.async_api import async_playwright
MOCK = r'''
window.__calls=[];window.__prefs=window.__prefs||JSON.parse(sessionStorage.getItem('prefs')||'{}');
function rec(n,a){__calls.push([n,a]);}
window.Capacitor={isNativePlatform:()=>true,Plugins:{
 Preferences:{get:({key})=>Promise.resolve({value:__prefs[key]??null}),set:({key,value})=>{__prefs[key]=value;sessionStorage.setItem('prefs',JSON.stringify(__prefs));return Promise.resolve()}},
 Haptics:{impact:a=>rec('impact',a),notification:a=>rec('notif',a)},
 Share:{share:a=>{rec('share',a);return Promise.resolve()}},
 Filesystem:{writeFile:a=>{rec('write',a);return Promise.resolve({uri:'file:///cache/'+a.path})}},
 LocalNotifications:{cancel:a=>Promise.resolve(),checkPermissions:()=>Promise.resolve({display:'granted'}),requestPermissions:()=>Promise.resolve({display:'granted'}),schedule:a=>{rec('schedule',a);return Promise.resolve()}}}};
(function(){var owned=false,cb={};var p={id:'com.pocketappstudio.dialysislog.pro',pricing:{price:'$4.99'},getOffer:()=>({id:'o'})};
var chain={productUpdated(f){cb.u=f;return chain},approved(f){cb.a=f;return chain},finished(f){cb.f=f;return chain},receiptUpdated(f){cb.r=f;return chain}};
window.CdvPurchase={ProductType:{NON_CONSUMABLE:'nc'},Platform:{APPLE_APPSTORE:'ios'},store:{register:a=>rec('register',a),when:()=>chain,get:()=>p,owned:()=>owned,
 initialize:()=>Promise.resolve(),order:o=>{rec('order',o);owned=true;setTimeout(()=>cb.f&&cb.f(),50);return Promise.resolve()},restorePurchases:()=>{rec('restore',1);return Promise.resolve()}}};})();
'''
res=[]
def ck(n,c): res.append(c); print(('PASS ' if c else 'FAIL ')+n)
async def main():
  async with async_playwright() as pw:
    b=await pw.webkit.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}); await ctx.add_init_script(MOCK)
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto('http://127.0.0.1:8767/'); await pg.wait_for_timeout(500)
    ck('terms shown first', await pg.locator('#agree-box').count()==1)
    await pg.check('#agree-box'); await pg.click('#agree-btn'); await pg.wait_for_timeout(300)
    ck('terms mirrored to Preferences', 'dialysislog:terms' in await pg.evaluate('__prefs'))
    st=await pg.evaluate("JSON.parse(localStorage.getItem('dialysislog:v1')||'null')")
    # finish setup via seed
    await pg.evaluate("""(()=>{var s=Dialysis.state();s.settings.setupDone=true;localStorage.setItem('dialysislog:v1',JSON.stringify(s));__prefs['dialysislog:v1']=JSON.stringify(s);sessionStorage.setItem('prefs',JSON.stringify(__prefs));})()""")
    await pg.reload(); await pg.wait_for_timeout(500)
    body=await pg.inner_text('body'); ck('Today renders + disclaimer', 'Not medical advice' in body)
    await pg.locator('[data-act=add]').first.click(); await pg.wait_for_timeout(200)
    ck('haptic on add drink', any(c[0]=='impact' for c in await pg.evaluate('__calls')))
    await pg.click('#share-summary'); await pg.wait_for_timeout(200)
    ck('share today uses native share', any(c[0]=='share' and 'text' in c[1] for c in await pg.evaluate('__calls')))
    gum=False
    for r in ['#/','#/more','#/pro','#/about','#/settings','#/trends','#/sessions','#/reminders','#/labs','#/pd']:
      await pg.evaluate(f"location.hash='{r}'"); await pg.wait_for_timeout(250)
      h=await pg.content(); gum = gum or ('umroad' in h) or ('license key' in h.lower())
    ck('no Gumroad/license key text on any native screen', not gum)
    for f in ['terms.html','privacy.html','terms-es.html','privacy-es.html']:
      t=await (await pg.request.get('http://127.0.0.1:8767/'+f)).text(); ck(f+' has no Gumroad, mentions Apple', 'umroad' not in t and 'Apple' in t)
    await pg.evaluate("location.hash='#/more'"); await pg.wait_for_timeout(200)
    ck('reminders card in More', await pg.locator('#rem-link').count()==1)
    await pg.click('[data-act=backup]'); await pg.wait_for_timeout(300)
    calls=await pg.evaluate('__calls')
    ck('backup -> file + share sheet', any(c[0]=='write' and c[1]['path'].endswith('.json') for c in calls) and any(c[0]=='share' and c[1].get('files') for c in calls))
    await pg.click('[data-act=csv]'); await pg.wait_for_timeout(300)
    ck('csv -> file', any(c[0]=='write' and c[1]['path'].endswith('.csv') for c in await pg.evaluate('__calls')))
    await pg.evaluate("location.hash='#/pd'"); await pg.wait_for_timeout(200)
    ck('PD gated when not Pro', 'Pro' in await pg.inner_text('main') and await pg.locator('#pdform').count()==0)
    await pg.evaluate("location.hash='#/pro'"); await pg.wait_for_timeout(300)
    ck('restore purchases button', await pg.locator('#iap-restore').count()==1)
    ck('buy shows store price', '$4.99' in await pg.inner_text('#iap-buy'))
    await pg.click('#iap-restore'); await pg.wait_for_timeout(100)
    ck('restore calls store', any(c[0]=='restore' for c in await pg.evaluate('__calls')))
    await pg.click('#iap-buy'); await pg.wait_for_timeout(500)
    ck('purchase unlocks Pro', await pg.evaluate("JSON.parse(localStorage.getItem('dialysislog:v1')).settings.license.source")=='apple')
    ck('pro status shown', await pg.locator('#pro-status').count()==1)
    await pg.evaluate("location.hash='#/pd'"); await pg.wait_for_timeout(200)
    ck('PD page opens after purchase', await pg.locator('#pdform').count()==1)
    await pg.evaluate("location.hash='#/reminders'"); await pg.wait_for_timeout(200)
    await pg.check('#rem-drink'); await pg.fill('.rem-t','08:30'); await pg.click('[data-act=rem-add]'); await pg.locator('.rem-t').nth(1).fill('13:00')
    await pg.check('#rem-sess'); await pg.click('.rem-day[data-v="1"]'); await pg.click('.rem-day[data-v="3"]'); await pg.fill('#rem-stime','05:45')
    await pg.click('#rem-save'); await pg.wait_for_timeout(300)
    sch=[c for c in await pg.evaluate('__calls') if c[0]=='schedule']
    n=sch[-1][1]['notifications'] if sch else []
    ck('4 reminders scheduled (2 daily, 2 weekly)', len(n)==4 and n[2]['schedule']['on'].get('weekday')==2)
    ck('reminder text is not advice', all('log' in x['body'] for x in n))
    # storage restore from Preferences after web storage wiped
    await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(600)
    ck('data restored from Preferences after storage wipe', await pg.evaluate("JSON.parse(localStorage.getItem('dialysislog:v1')||'{}').settings?.license?.source")=='apple' and await pg.locator('#agree-box').count()==0)
    await pg.evaluate("localStorage.setItem('dialysislog:v1',JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('dialysislog:v1')),{})));var s=JSON.parse(localStorage.getItem('dialysislog:v1'));s.settings.lang='es';localStorage.setItem('dialysislog:v1',JSON.stringify(s))")
    await pg.reload(); await pg.wait_for_timeout(500); await pg.evaluate("location.hash='#/pro'"); await pg.wait_for_timeout(300)
    ck('Spanish native Pro screen', 'Restaurar compras' in await pg.inner_text('main'))
    await pg.evaluate("location.hash='#/reminders'"); await pg.wait_for_timeout(300)
    ck('Spanish reminders', 'Recordatorios' in await pg.inner_text('main'))
    ck('no page errors', not errs); print(errs)
    await b.close()
  print(f'{sum(res)}/{len(res)} passed')
asyncio.run(main())
