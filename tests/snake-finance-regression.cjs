'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('snake-finance-mobile.html','utf8');
const bundled=fs.readFileSync('android-capture/app/src/main/assets/snake-finance-mobile.html','utf8');
assert.equal(html,bundled,'Android bundled HTML must equal deployed dashboard');
const extract=(start,end)=>{const a=html.indexOf(start);assert.ok(a>=0,'missing '+start);const b=html.indexOf(end,a+start.length);assert.ok(b>a,'missing boundary '+end);return html.slice(a,b);};
const context={Date,Math,Number,String,Array,Set,Map,JSON,console};
vm.createContext(context);
vm.runInContext(extract('function validISO(','function moneyInput('),context);
assert.equal(context.validISO('2026-02-29'),false);
assert.equal(context.validISO('2024-02-29'),true);
assert.equal(context.validISO('2026-10-10'),true);
assert.equal(context.validISO('2026-13-01'),false);
vm.runInContext(extract('function moneyInput(','function monthBefore('),context);
assert.equal(context.moneyInput('1.234,56'),123456);
assert.equal(context.moneyInput('7,50'),750);
assert.ok(Number.isNaN(context.moneyInput('abc')));
vm.runInContext(extract('function dailyWindow(','function gastos7('),context);
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
for(const [ym,today] of [['2026-10','2026-10-10'],['2026-09','2026-10-10'],['2027-01','2026-10-10']]){
 context.YM=ym;context.APP_TODAY=today;
 const dates=Array.from(context.dailyWindow());
 assert.equal(dates.length,7,'seven days');
 assert.equal(new Date(dates[0]+'T12:00:00').getDay(),1,'Monday');
 assert.equal(new Date(dates[6]+'T12:00:00').getDay(),0,'Sunday');
 for(let i=1;i<7;i++)assert.equal((new Date(dates[i]+'T12:00:00')-new Date(dates[i-1]+'T12:00:00'))/86400000,1);
 assert.equal(dates[0],iso(new Date(dates[0]+'T12:00:00')));
}
assert.match(html,/onclick="graphDetail\('daily'\)"/,'details button');
assert.match(html,/onclick="openDay\('\$\{z\.d\}'\)"/,'daily point click');
assert.match(html,/function graphDetail\(kind,key\)/,'daily modal handler');
assert.match(html,/function persistLedger\(/,'ledger persistence');
assert.match(html,/function validateLedger\(/,'ledger validation');
assert.match(html,/function confirmEfet\(/,'recurring realization');
assert.match(html,/function cajuBalance\(/,'Caju balance');
assert.match(html,/function creditUsed\(/,'Carbon balance');
assert.match(html,/function localFinancialAnswer\(/,'local financial query');
const gradle=fs.readFileSync('android-capture/app/build.gradle.kts','utf8');
assert.match(gradle,/versionCode = 30/);
assert.match(gradle,/versionName = "1\.5\.6"/);
console.log('PASS Snake Finance: web/Android parity, dates, 7-day window, links, finance entry points and build version');


/* Deterministic finance-engine fixtures: no real bank or personal data. */
vm.runInContext(extract('function addMonthsYM(','function invMonthlyRate('),context);
vm.runInContext(extract('function cajuCompetence(','function openCajuSettings('),context);
vm.runInContext(extract('function accountDelta(','function setInvParam('),context);
vm.runInContext(extract('function creditUsed(','function financialAlerts('),context);
vm.runInContext(extract('function validateLedger(','function completeBackupCategories('),context);
vm.runInContext("var L=[];var ACC={c6:10000,caju:0,carbon:0,xp:0};var CAJU_CFG={'2026-10':{opening:10000,reload:150000},'2026-11':{reload:150000}};var ORIGINAL_FUNDS=0;var AC={c6:['C6'],caju:['Caju'],carbon:['Carbon'],xp:['XP']};",context);
const fixture=[
 {id:1,d:'2026-10-02',a:'c6',t:'r',s:'r',v:50000,n:'Salário'},
 {id:2,d:'2026-10-03',a:'c6',t:'d',s:'r',v:12000,n:'Mercado'},
 {id:3,d:'2026-10-04',a:'c6',t:'d',s:'p',v:9000,n:'Previsto'},
 {id:4,d:'2026-10-05',a:'c6',to:'xp',t:'t',s:'r',v:5000,n:'Meta'},
 {id:5,d:'2026-10-06',a:'caju',t:'d',s:'r',v:750,n:'Padaria'},
 {id:6,d:'2026-10-06',a:'caju',t:'d',s:'p',v:2000,n:'Previsto Caju'},
 {id:7,d:'2026-11-01',a:'caju',t:'d',s:'r',v:1000,n:'Mercado novembro'},
 {id:8,d:'2026-10-07',a:'carbon',t:'d',s:'r',v:10000,n:'Combustível'},
 {id:9,d:'2026-10-08',a:'carbon',t:'r',s:'r',v:2000,n:'Pagamento Carbon'}
];
context.L=fixture;
assert.equal(context.accountBalance('c6','2026-10-10'),43000,'C6 real balance: opening + salary - expense - transfer');
assert.equal(context.accountBalance('c6','2026-10-10',true),34000,'C6 projected includes pending');
assert.equal(context.accountBalance('xp','2026-10-10'),5000,'XP transfer credited once');
assert.equal(context.cajuBalance('2026-10'),159250,'Caju October: opening + reload - actual only');
assert.equal(context.cajuBalance('2026-11'),308250,'Caju November: previous closing + new reload - actual');
assert.equal(context.creditUsed('2026-10-10',{opening:0}),8000,'Carbon charges less payments');
assert.equal(context.creditUsed('2026-10-07',{opening:0}),10000,'Carbon cutoff respects date');
assert.equal(context.validateLedger(fixture).length,fixture.length,'valid ledger accepted');
assert.throws(()=>context.validateLedger([...fixture,{...fixture[0]}]),/duplicado/,'duplicate ID rejected');
assert.throws(()=>context.validateLedger([{...fixture[0],d:'2026-02-30'}]),/inválido/,'invalid date rejected');
assert.throws(()=>context.validateLedger([{...fixture[0],v:-1}]),/inválido/,'negative amount rejected');
assert.throws(()=>context.validateLedger([{...fixture[0],captureId:'invalid-source'}]),/captura inválida/,'invalid capture source rejected');
assert.equal(context.accountBalance('c6','2026-10-10'),43000,'test fixtures must not mutate balances');
console.log('PASS Snake Finance: independent C6/XP/Caju/Carbon, projected vs actual, ledger integrity');
