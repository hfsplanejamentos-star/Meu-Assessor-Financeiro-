import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
const target=process.env.MOBILE_HTML||'android-capture/app/src/main/assets/dashboard-mobile.html';
const html=fs.readFileSync(target,'utf8');
const output=process.env.UI_OUTPUT||'validation/mobile-ui';
fs.mkdirSync(output,{recursive:true});
const fixture=[
 {id:101,d:'2026-10-06',t:'d',s:'r',a:'c6',v:3650,n:'Compra A',c:'mer'},
 {id:102,d:'2026-10-06',t:'d',s:'r',a:'c6',v:3650,n:'Compra B',c:'mer'},
 {id:103,d:'2026-10-06',t:'d',s:'r',a:'caju',v:1200,n:'Alimentação',c:'ali'}
];
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.UI_BROWSER_CHANNEL?{channel:process.env.UI_BROWSER_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:393,height:852},timezoneId:'America/Sao_Paulo'});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('dialog',d=>d.dismiss());
await page.clock.setFixedTime(new Date('2026-10-06T12:00:00-03:00'));
await page.addInitScript(({fixture})=>{
 localStorage.setItem('assessor_openings_v83',JSON.stringify({c6:100000,caju:150000,cajuFunds:150000}));
 localStorage.setItem('assessor_tx_v43',JSON.stringify(fixture));
 localStorage.setItem('tema','ciano');
},{fixture});
const report=[];
try{
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
 await page.waitForSelector('#fixedTopShell .headerBrand');
 await page.evaluate(()=>{closeModal();YM='2026-10';ST.hide=false;draw();});
 const baseline=await page.evaluate(()=>({ledger:JSON.stringify(L),audit:auditEngine()}));
 assert.equal(baseline.audit.ok,true,JSON.stringify(baseline.audit));
 assert.equal(baseline.audit.saldoC6,92700);
 assert.equal(baseline.audit.saldoCaju,148800);
 const themes={ciano:'Tema dourado',limao:'Tema limão',claro:'Tema claro'};
 for(const width of [320,360,393,440]){
  await page.setViewportSize({width,height:852});
  for(const [theme,label] of Object.entries(themes)){
   await page.getByRole('button',{name:label,exact:true}).click();
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.tema),theme);
   for(const tab of ['ger','ini','des','rec','ag','inv','as']){
    await page.evaluate(tab=>goTab(tab),tab);
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const geometry=await page.evaluate(()=>{
     const controls=Array.from(document.querySelectorAll('.appHd button')).map(e=>{const r=e.getBoundingClientRect();return {name:e.getAttribute('aria-label'),left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
     return {doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,controls,audit:auditEngine().ok};
    });
    assert(geometry.doc<=width+1,'Horizontal overflow: '+JSON.stringify({width,theme,tab,geometry}));
    assert(geometry.audit,'Engine audit failed after navigation');
    for(const control of geometry.controls){assert(control.left>=-1&&control.right<=width+1&&control.top>=-1&&control.bottom<=121,'Clipped header control: '+JSON.stringify(control));}
    assert.equal(await page.evaluate(()=>JSON.stringify(L)),baseline.ledger,'Navigation or theme changed ledger');
    report.push({width,theme,tab,horizontalOverflow:false,engine:true});
   }
  }
 }
 await page.setViewportSize({width:393,height:852});
 await page.getByRole('button',{name:'Tema dourado',exact:true}).click();
 await page.evaluate(()=>goTab('ger'));
 await page.getByRole('button',{name:'Menu de navegação',exact:true}).click();
 assert.equal(await page.locator('#headerMenuButton').getAttribute('aria-expanded'),'true');
 assert.equal(await page.evaluate(()=>window.handleAndroidBack()),true);
 assert.equal(await page.locator('#headerMenuButton').getAttribute('aria-expanded'),'false');
 await page.getByRole('button',{name:'Menu de navegação',exact:true}).click();
 await page.locator('[data-header-tab="ag"]').click();
 assert.equal(await page.evaluate(()=>TAB),'ag');
 assert.equal(await page.locator('#headerMenuButton').getAttribute('aria-expanded'),'false');
 await page.locator('#advisorBell').click();
 assert.equal(await page.evaluate(()=>TAB+'|'+AS),'as|av');
 const duplicate=page.locator('.advisorNotice[data-alert-key="duplicate"]').first();
 assert((await duplicate.locator('.noticeMessage').innerText()).includes('36,50'));
 await duplicate.locator('.noticeBody').click();
 assert.equal(await page.locator('#md .mc .li').count(),2);
 assert((await page.locator('#md').innerText()).includes('Compra A'));
 assert((await page.locator('#md').innerText()).includes('Compra B'));
 await page.evaluate(()=>closeModal());
 const privacy=page.locator('.alertRule').filter({hasText:'Ocultar valores nos avisos'}).locator('input[type="checkbox"]');
 await privacy.check();
 assert.equal(await page.evaluate(()=>ST.hide),true);
 assert(!(await duplicate.locator('.noticeMessage').innerText()).includes('36,50'));
 assert((await duplicate.locator('.noticeMessage').innerText()).includes('••••'));
 await duplicate.locator('.noticeBody').click();
 assert((await page.locator('#md').innerText()).includes('36,50'));
 await page.evaluate(()=>closeModal());
 await privacy.uncheck();
 await duplicate.locator('.noticeOptions').click();
 assert.equal(await page.evaluate(()=>AS),'av');
 await page.getByRole('button',{name:'Configurações',exact:true}).click();
 assert(await page.locator('#settingsPop').evaluate(e=>e.classList.contains('on')));
 assert.equal(await page.locator('#settingsPop').getByText('Personalizar Visão Geral').count(),1);
 await page.locator('#settingsPop').getByText('Categorias e subcategorias').click();
 assert(await page.locator('#catManage').evaluate(e=>e.classList.contains('on')));
 await page.evaluate(()=>{closeModal();document.getElementById('catManage').classList.remove('on');document.getElementById('settingsPop').classList.remove('on');goTab('ger');});
 for(const [theme,label] of Object.entries(themes)){
  await page.getByRole('button',{name:label,exact:true}).click();
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.waitForFunction(()=>Math.abs(window.scrollY)<1);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.locator('.appHd').screenshot({path:path.join(output,'Cabecalho_'+theme+'.png')});
 }
 await page.getByRole('button',{name:'Tema dourado',exact:true}).click();
 await page.locator('#advisorBell').click();
 await page.evaluate(()=>{
  document.getElementById('v').innerHTML='<div class="c">'+renderReviewAlert({key:'preview',severity:'info',ids:[],text:'Inteligência financeira para você ir mais longe.'},'ruleAlert')+'</div>';
 });
 await page.locator('.advisorNotice').screenshot({path:path.join(output,'Modelo_Aviso.png')});
 assert.equal(await page.evaluate(()=>JSON.stringify(L)),baseline.ledger);
 assert.equal(errors.length,0,errors.join('\n'));
 if(!process.env.MOBILE_HTML){
  const native=fs.readFileSync('android-capture/app/src/main/java/br/com/meuassessor/capture/MainActivity.java','utf8');
  assert(!/INTRO_DURATION|ObjectAnimator|\.animate\(/.test(native),'Startup still contains intro animation');
  const layout=fs.readFileSync('android-capture/app/src/main/res/layout/activity_main_loading.xml','utf8');
  assert(!layout.includes('ProgressBar'),'Startup should show static image only');
 }
 fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({target,screens:report,checks:['engine','themes','navigation','bell','duplicate-review','privacy','configuration','ledger-preserved','static-startup'],errors},null,2));
 console.log('Passed: '+report.length+' mobile layouts, engine consistency, header actions, duplicate review, privacy and static startup.');
}catch(error){await page.screenshot({path:path.join(output,'Failure.png'),fullPage:true});fs.writeFileSync(path.join(output,'failure.txt'),error.stack+'\n'+errors.join('\n'));throw error;}finally{await browser.close();await new Promise(r=>server.close(r));}
