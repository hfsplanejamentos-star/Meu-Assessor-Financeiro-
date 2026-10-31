const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||'android-capture/app/src/main/assets/snake-finance-mobile.html','utf8');
const source=html.slice(html.indexOf('function vDia(){'),html.indexOf('\nfunction pct100',html.indexOf('function vDia(){')));
const entries=[{id:1,d:'2026-10-23',comp:'2026-11',t:'d',s:'r',a:'carbon',v:1300,n:'Compra Carbon'},
{id:2,d:'2026-10-23',t:'d',s:'p',a:'c6',v:800,n:'Prevista'},
{id:3,d:'2026-10-22',t:'d',s:'r',a:'c6',v:400,n:'Outro dia'}];
const context={Date:class extends Date{constructor(){super('2026-10-23T12:00:00-03:00')}},YM:'2026-10',SEL:'2026-10-23',L:entries,CAT:{out:['Outros','list','#fff']},V35_COLORS:{},AC:{carbon:['C6 Carbon']},ML:()=>entries.filter(x=>(x.comp||x.d).startsWith('2026-10')),brl:n=>'R$ '+(n/100).toFixed(2),dd:x=>x,escapeHTML:x=>x,tile:()=>'',snakeCarbonInvoiceBalance:()=>{throw Error('Daily card must not change invoice')}};
vm.createContext(context);vm.runInContext(source,context);
const before=JSON.stringify(entries),card=vm.runInContext('vDia()',context);
assert(card.includes('R$ 13.00'));assert(card.includes('Compra Carbon'));assert(!card.includes('Prevista'));assert(!card.includes('Outro dia'));assert.equal(JSON.stringify(entries),before);
context.YM='2026-11';context.SEL='2026-11-23';assert(vm.runInContext('vDia()',context).includes('R$ 0.00'));
console.log('PASS: actual-date Carbon expense remains visible despite future invoice; planned/other dates excluded; ledger unchanged.');

const dailySource=html.slice(html.indexOf('function dailyWindow(){'),html.indexOf('function gastos7(){'));
const daily={Date,YM:'2026-11',SEL:'2026-11-02',APP_TODAY:'2026-10-30',validISO:x=>/^\d{4}-\d{2}-\d{2}$/.test(x)};vm.createContext(daily);vm.runInContext(dailySource,daily);
assert.deepEqual(Array.from(daily.dailyWindow()),['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08']);daily.SEL='2026-11-25';assert.equal(daily.dailyWindow()[0],'2026-11-23');daily.YM='2026-10';daily.SEL='2026-10-01';assert.equal(daily.dailyWindow()[0],'2026-10-26','Current month keeps current week');
console.log('PASS: selected-day week for noncurrent months; current week retained; no forced month-end week.');
