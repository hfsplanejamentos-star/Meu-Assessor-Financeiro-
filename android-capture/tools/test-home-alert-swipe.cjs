const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const html=fs.readFileSync(process.argv[2]||'android-capture/app/src/main/assets/snake-finance-mobile.html','utf8');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const p=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.dismiss());
 await p.addInitScript(()=>{localStorage.setItem('assessor_tx_v43',JSON.stringify([{id:1,d:'2026-10-01',t:'r',s:'r',v:1000,a:'c6',n:'Synthetic'}]));localStorage.setItem('assessor_openings_v83',JSON.stringify({c6:0,caju:0,cajuFunds:0}));});
 await p.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:html}):r.abort());
 async function fixture(){await p.evaluate(()=>{closeModal();YM='2026-11';window.fixtureAlerts=[{key:'carbon',severity:'warning',text:'Carbon atenção',ids:[1]},{key:'caju',severity:'warning',text:'Caju baixo',ids:[2]}];financialAlerts=()=>fixtureAlerts;window.opened=0;openAlertReview=()=>{opened++;};TAB='ini';draw();});}
 await p.goto('https://snake-test.local/');await p.waitForTimeout(100);await fixture();
 const snapshot=await p.evaluate(()=>JSON.stringify(L));
 async function swipe(direction,vertical=false,cancel=false){const el=p.locator('[data-home-alert]').first();await el.scrollIntoViewIfNeeded();const b=await el.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;await p.evaluate(({x,y,direction,vertical,cancel})=>{const el=document.elementFromPoint(x,y);el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:77,isPrimary:true,clientX:x,clientY:y,bubbles:true}));window.dispatchEvent(new PointerEvent('pointermove',{pointerId:77,isPrimary:true,clientX:x+(vertical?2:direction*120),clientY:y+(vertical?120:2),bubbles:true,cancelable:true}));window.dispatchEvent(new PointerEvent(cancel?'pointercancel':'pointerup',{pointerId:77,isPrimary:true,clientX:x+(vertical?2:direction*120),clientY:y+(vertical?120:2),bubbles:true}));},{x,y,direction,vertical,cancel});await p.waitForTimeout(50);}
 assert.equal(await p.locator('[data-home-alert]').count(),2);
 await swipe(-1,true);assert.equal(await p.locator('[data-home-alert]').count(),2,'Vertical scroll must preserve alerts');
 await swipe(-1,false,true);assert.equal(await p.locator('[data-home-alert]').count(),2,'Canceled gesture must preserve alerts');
 await swipe(-1);assert.equal(await p.locator('[data-home-alert]').count(),1);assert.equal(await p.evaluate(()=>financialAlerts(YM).length),2,'Bell source must retain both alerts');
 await p.evaluate(()=>{AS='av';TAB='as';draw();});assert.equal(await p.locator('.advisorNotice').count(),2);assert.equal(await p.locator('[data-home-alert]').count(),0);
 await p.reload();await p.waitForTimeout(100);await fixture();assert.equal(await p.locator('[data-home-alert]').count(),1,'Hidden state survives reload');
 await swipe(1);assert.equal(await p.locator('[data-home-alert]').count(),0);
 await p.evaluate(()=>{fixtureAlerts[0].severity='critical';draw();});assert.equal(await p.locator('[data-home-alert]').count(),1,'Escalation returns to Home');
 await swipe(-1);await p.evaluate(()=>{fixtureAlerts[1].ids=[3];draw();});assert.equal(await p.locator('[data-home-alert]').count(),1,'New occurrence returns to Home');
 await p.evaluate(()=>{restoreHomeAlerts();});assert.equal(await p.locator('[data-home-alert]').count(),2);
 await p.waitForTimeout(550);await p.locator('[data-home-alert] .noticeBody').first().click();assert.equal(await p.evaluate(()=>opened),1,'Tap still opens details');
 await p.evaluate(()=>{const original=Storage.prototype.setItem;window.realSet=original;Storage.prototype.setItem=function(k,v){if(k==='snake_home_alert_dismissals_v1')throw Error('quota');return original.call(this,k,v);};});
 await swipe(-1);assert.equal(await p.locator('[data-home-alert]').count(),2,'Failed preference save must retain alert');
 assert.equal(await p.evaluate(()=>JSON.stringify(L)),snapshot,'Gesture must not change financial entries');assert.deepEqual(errors,[]);
 await browser.close();console.log('PASS: left/right swipe, vertical scroll, cancellation, bell retention, reload persistence, escalation, new occurrence, restore, tap and quota failure.');
})().catch(e=>{console.error(e);process.exit(1)});
