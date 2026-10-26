const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),p=await browser.newPage({viewport:{width:393,height:852},isMobile:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.dismiss());const html=fs.readFileSync('android-capture/app/src/main/assets/snake-finance-mobile.html','utf8');await p.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:html}):r.abort());await p.clock.setFixedTime(new Date('2026-10-26T15:00:00Z'));await p.goto('https://projection-reconcile.local');await p.waitForTimeout(300);
await p.evaluate(()=>{closeModal();ACC.xp=0;ACC.c6=0;L=[
{id:1,d:'2026-11-01',t:'r',s:'p',a:'xp',v:1010450,n:'Salário'},
{id:2,d:'2026-11-30',t:'r',s:'p',a:'xp',v:226667,n:'13º salário · 1ª parcela'},
{id:3,d:'2026-11-05',t:'d',s:'p',a:'xp',v:503780,n:'Despesas novembro',c:'out'},
{id:4,d:'2026-10-20',comp:'2026-11-01',t:'d',s:'r',a:'carbon',v:199147,n:'Parcela novembro',c:'out'},
{id:5,d:'2026-12-01',t:'r',s:'p',a:'xp',v:1010450,n:'Salário'},
{id:6,d:'2026-12-20',t:'r',s:'p',a:'xp',v:157843,n:'13º salário · 2ª parcela'},
{id:7,d:'2026-12-05',t:'d',s:'p',a:'xp',v:443780,n:'Despesas dezembro',c:'out'},
{id:8,d:'2026-10-20',comp:'2026-12-01',t:'d',s:'r',a:'carbon',v:9024,n:'Parcela dezembro',c:'out'}];TAB='ger';});
const before=await p.evaluate(()=>JSON.stringify(L));
for(const [date,novIncome,decIncome]of [['2026-10-26',1010450,1010450],['2026-11-25',1010450,1010450],['2026-11-26',1237117,1010450],['2026-12-20',1237117,1010450],['2026-12-21',1237117,1168293]]){
await p.clock.setFixedTime(new Date(date+'T15:00:00Z'));
const r=await p.evaluate(()=>{const old=Date.prototype.toLocaleDateString;Date.prototype.toLocaleDateString=function(){return '26/10/2026'};APP_TODAY='2099-01-01';const result={};for(const month of ['2026-11','2026-12']){YM=month;draw();const f=snakeMonthlyFlow(month),summary=snakeProjectionReconciliation(month);result[month]={f,summary,card:document.querySelector('.snakeApprovedMetrics').innerText};}Date.prototype.toLocaleDateString=old;return result;});
assert.equal(r['2026-11'].f.incoming,novIncome,date);assert.equal(r['2026-12'].f.incoming,decIncome,date);assert.equal(r['2026-11'].summary.revenue,novIncome,date);assert.equal(r['2026-12'].summary.revenue,decIncome,date);assert.equal(r['2026-11'].f.outgoing,702927);assert.equal(r['2026-12'].f.outgoing,452804);assert.equal(r['2026-11'].summary.projected,novIncome-702927);assert.equal(r['2026-12'].summary.projected,novIncome+decIncome-702927-452804);assert.equal(r['2026-12'].summary.previousInvoices,199147);assert.equal(r['2026-12'].summary.invoice,9024);
}
await p.clock.setFixedTime(new Date('2026-10-26T15:00:00Z'));
await p.evaluate(()=>{L.push({id:9,d:'2026-11-12',t:'t',s:'r',a:'xp',to:'carbon',v:50000,invoiceId:'2026-11',n:'Pagamento parcial'});YM='2026-12';draw();});
assert.equal(await p.evaluate(()=>snakeProjectionReconciliation('2026-12').projected),865169,'Actual partial payment releases the same pending debt once');assert.equal(await p.evaluate(()=>snakeProjectionReconciliation('2026-12').previousInvoices),149147);
await p.evaluate(()=>{L.push({id:10,d:'2027-01-12',t:'t',s:'r',a:'xp',to:'carbon',v:149147,invoiceId:'2026-11',n:'Pagamento posterior'});});
assert.equal(await p.evaluate(()=>snakeProjectionReconciliation('2026-12').projected),865169,'Later payment cannot alter December projection');
await p.evaluate(()=>{L=L.filter(x=>x.id<9);L[1].s='r';});assert.equal(await p.evaluate(()=>snakeMonthlyFlow('2026-11').incoming),1237117,'Received bonus is visible before calendar cutoff');
await p.evaluate(()=>{L[1].s='p';});assert.equal(await p.evaluate(()=>JSON.stringify(L)),before,'Calculations and redraws must not edit or duplicate the ledger');assert.deepEqual(errors,[]);await browser.close();console.log('PASS: November/December exact screenshot amounts; 13th thresholds, locale independence and stale APP_TODAY; prior invoices, partial and future payments, received bonus and immutable ledger.');})().catch(e=>{console.error(e);process.exit(1)});
