const fs = require('fs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const base = fs.readFileSync('android-capture/app/src/main/assets/snake-finance-mobile.html', 'utf8');
  const layer = fs.readFileSync('android-capture/app/src/main/assets/snake-graphs-3d.js', 'utf8');
  const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
  const ctx = await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:2});
  await ctx.addInitScript(() => {
    const date=new Date(), ym=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
    const rows=[];
    for(let d=1;d<=28;d++) rows.push({id:d,d:ym+'-'+String(d).padStart(2,'0'),n:'Exemplo visual '+d,t:'d',v:600+d*270,a:d%3===0?'caju':'c6',s:d>22?'p':'r',c:['ali','mer','abs','laz'][d%4],sub:''});
    rows.push({id:60,d:ym+'-01',n:'Receita exemplo',t:'r',v:700000,a:'c6',s:'r',c:'out'});
    localStorage.setItem('assessor_tx_v43',JSON.stringify(rows));
    localStorage.setItem('assessor_tx',JSON.stringify(rows));
    localStorage.setItem('assessor_openings_v83',JSON.stringify({c6:240000,caju:150000,cajuFunds:0}));
    localStorage.setItem('tema','ciano');
  });
  const errors=[];
  let enhanced=false;
  await ctx.route('**/*',route=>route.fulfill({contentType:'text/html',body:enhanced?base.replace('</body>','<script>'+layer+'</script></body>'):base}));
  const page=await ctx.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>dialog.dismiss());
  await page.goto('https://snake-test.local/base');
  await page.waitForTimeout(300);
  const snapshot=()=>page.evaluate(()=>({ledger:JSON.stringify(L),openings:JSON.stringify(ACC),projection:JSON.stringify(projectionCalcSafe()),cards:[...document.querySelectorAll('#v>.c')].map(e=>({width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)}))}));
  // Compare financial state and layout on the exact same example data.
  await page.evaluate(()=>{window.projectionCalcSafe=()=>({daily:D(),month:YM});});
  const before=await snapshot();
  enhanced=true;
  await page.goto('https://snake-test.local/enhanced');
  await page.waitForTimeout(300);
  await page.evaluate(()=>{window.projectionCalcSafe=()=>({daily:D(),month:YM});});
  const after=await snapshot();
  assert.deepEqual(after,before,'Financial values or card geometry changed');
  await page.evaluate(() => {
    const before=JSON.stringify(L);
    const day=L.find(x=>x.a==='caju'&&x.t==='d'&&x.s==='r').d;
    setDailyGraphFilter('account','caju');
    if(!dailyGraphItems(day).length||dailyGraphItems(day).some(x=>x.a!=='caju'))throw Error('Account filter failed');
    openDailyGraphDetails(day);
    if(!document.getElementById('md').textContent.includes('Gastos de'))throw Error('Filtered detail missing');
    closeDay();
    setDailyGraphFilter('account','all');
    setDailyGraphFilter('context','work');
    if(dailyGraphItems(day).some(x=>!isWork(x)))throw Error('Context filter failed');
    setDailyGraphFilter('context','all');
    if(JSON.stringify(L)!==before)throw Error('Filters changed ledger');
    const realPrompt=window.prompt;window.prompt=()=> '1500.50';
    const opening=ACC.xp;setXPInitialBalance();
    if(ACC.xp!==150050)throw Error('XP monetary parser');
    ACC.xp=opening;localStorage.setItem(XP_OPENING_KEY,String(opening));window.prompt=realPrompt;
    const savedToday=APP_TODAY;APP_TODAY='2000-01-01';HJ=1;
    window.dispatchEvent(new Event('pageshow'));
    if(APP_TODAY!==savedToday)throw Error('Date refresh failed');
    openBackupPanel();
    const modal=document.getElementById('md');
    if(!modal.textContent.includes('Exportar backup completo')||!modal.textContent.includes('Importar backup'))throw Error('Backup core controls missing');
    if(modal.textContent.includes('Verificar destino')||modal.textContent.includes('Exporte no arquivo anterior'))throw Error('Obsolete backup instructions');
    if(!modal.querySelector('details')||modal.querySelector('details').open)throw Error('Advanced recovery must start collapsed');
    closeDay();
    const backup=backupState();previewBackup(backup);
    if(JSON.stringify(BACKUP_PENDING.ledger)!==JSON.stringify(L))throw Error('Backup round-trip preview');
    BACKUP_PENDING=null;closeDay();draw();
  });
  assert(await page.evaluate(()=>window.snakeGraphs3DInstalled===true));
  assert(await page.locator('feSpecularLighting').count()>0,'Missing ring bevels');
  // Every existing section must continue to render without script failures.
  for(const tab of ['ger','ini','des','age','inv','rec','as']) {
    await page.evaluate(tab=>{if(TABS.some(t=>t[0]===tab)){TAB=tab;draw();}},tab);
  }
  for(const theme of ['limao','claro','ciano']) await page.evaluate(theme=>setT(theme),theme);
  await page.evaluate(()=>{TAB='ger';draw();window.scrollTo(0,0)});
  await page.waitForTimeout(200);
  await page.addStyleTag({content:'#nav{visibility:hidden!important}'});
  const graph=page.locator('#v .c').filter({hasText:'Gastos por dia'}).last();
  if(await graph.count()) await graph.screenshot({path:'Snake_Finance_1.5.13_Gasto_Diario.png'});
  await page.addStyleTag({content:'#nav{visibility:visible!important}'});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'Snake_Finance_1.5.13_Mobile_3D.png',fullPage:true});
  assert.deepEqual(errors,[],'Browser JavaScript errors');
  console.log('PASS: ledger, balances, geometry, filters and detail popups, XP input, date refresh, backup preview, charts, sections and themes.');
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});

