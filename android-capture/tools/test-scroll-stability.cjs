const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const path=process.argv[2]||'android-capture/app/src/main/assets/snake-finance-mobile.html';
let html=fs.readFileSync(path,'utf8');
const graphPath='android-capture/app/src/main/assets/snake-graphs-3d.js';
if(fs.existsSync(graphPath))html=html.replace('</body>','<script>'+fs.readFileSync(graphPath,'utf8')+'</script></body>');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const p=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.dismiss());
 await p.addInitScript(()=>{localStorage.setItem('assessor_tx_v43',JSON.stringify(Array.from({length:40},(_,i)=>({id:i+1,d:'2026-10-'+String(1+i%24).padStart(2,'0'),t:'d',s:'r',v:1000+i,a:i%2?'c6':'caju',c:'ali',n:'Synthetic '+i}))));localStorage.setItem('assessor_openings_v83',JSON.stringify({c6:500000,caju:100000,cajuFunds:0}));});
 await p.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:html}):r.abort());
 await p.goto('https://scroll-test.local/');await p.waitForTimeout(400);
 await p.evaluate(()=>{closeModal();YM='2026-10';const old=draw;window.redrawCount=0;draw=function(){redrawCount++;return old();};});
 const ledger=await p.evaluate(()=>JSON.stringify(L)),session=await p.context().newCDPSession(p);
 async function scroll(down){const x=190,y=down?670:330,to=down?330:670;await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+(to-y)*i/8}]});await p.waitForTimeout(20);}await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(120);}
 for(const tab of ['ger','inv','ini']){
  await p.evaluate(tab=>{TAB=tab;draw();window.scrollTo(0,0);},tab);await p.waitForTimeout(250);
  await p.evaluate(()=>{window.topNode=document.getElementById('v').firstElementChild;window.redrawCount=0;});
  for(const down of [true,true,false,true,false])await scroll(down);
  assert.equal(await p.evaluate(()=>redrawCount),0,'Ordinary touch scrolling must not redraw '+tab);
  assert(await p.evaluate(()=>document.getElementById('v').firstElementChild===topNode),'Cards must retain identity while scrolling');
 }
 // Background cancellation outside an alert or an organizer gesture is also a no-op.
 await p.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:999,bubbles:true})));
 assert.equal(await p.evaluate(()=>redrawCount),0);
 const before=await p.evaluate(()=>({ym:YM,sel:SEL,tab:TAB,y:scrollY}));
 await p.evaluate(()=>{window.refreshBank=0;window.refreshRemote=0;window.meuAssessorAndroidAutoSync=()=>refreshBank++;window.captureSyncLedger=async()=>{refreshRemote++;await new Promise(r=>setTimeout(r,100));};});
 assert.equal(await p.evaluate(()=>snakeRefreshDashboard()),true);assert.equal(await p.evaluate(()=>snakeRefreshDashboard()),false);
 await p.waitForTimeout(150);
 assert.deepEqual(await p.evaluate(()=>({ym:YM,sel:SEL,tab:TAB,y:scrollY})),before,'Refresh must retain month, selection, tab and scroll');
 assert.deepEqual(await p.evaluate(()=>[refreshBank,refreshRemote,redrawCount]),[1,1,0]);
 assert.equal(await p.evaluate(()=>JSON.stringify(L)),ledger);assert.equal(p.url(),'https://scroll-test.local/');
 await p.evaluate(()=>{MD='capture-settings';});assert.equal(await p.evaluate(()=>snakeRefreshDashboard()),false);
 assert.deepEqual(errors,[]);await browser.close();
 console.log('PASS: long bidirectional native-touch scrolling in overview/investments/home keeps DOM; cancellation no-op; refresh retains navigation, scroll and ledger without page reload.');
})().catch(e=>{console.error(e);process.exit(1)});
