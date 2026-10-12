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


/* Recurrence: effectuation must commit once and roll back on storage errors. */
vm.runInContext(extract('function confirmEfet(','const oldSaveLanc='),context);
context.YM='2026-10';
context.L=[{id:101,d:'2026-10-12',a:'c6',t:'d',s:'p',v:8990,n:'Plano',c:'con'}];
context.AC={c6:['C6'],caju:['Caju'],carbon:['Carbon'],xp:['XP']};
context.$=id=>({ed:{value:'12'},ev:{value:'95,50'},ea:{value:'c6'}}[id]);
context.brl=n=>'R$ '+n;context.closeDay=()=>{};context.draw=()=>{};context.persistLedger=()=>true;
context.confirmEfet(101);
assert.equal(context.L[0].v,9550,'actualized amount');
assert.equal(context.L[0].s,'r','recurrence marked realized');
assert.equal(context.L[0].comp,'2026-10-01','competence retained');
context.undo();
assert.equal(context.L[0].s,'p','undo restores planned status');
assert.equal(context.L[0].v,8990,'undo restores original amount');
context.persistLedger=()=>false;
context.alert=()=>{};
context.confirmEfet(101);
assert.equal(context.L[0].s,'p','storage failure must roll back');
assert.equal(context.L[0].v,8990,'storage failure restores value');
/* Captured events: same amount is allowed with distinct capture IDs. */
const sameAmount=[
 {id:201,d:'2026-10-09',a:'c6',t:'d',s:'r',v:5000,n:'Pix para A',captureId:'bank:pix-a'},
 {id:202,d:'2026-10-09',a:'c6',t:'d',s:'r',v:5000,n:'Débito para B',captureId:'bank:debit-b'}
];
assert.equal(context.validateLedger(sameAmount).length,2,'different transactions with equal amounts remain distinct');
assert.match(html,/function captureKey\(e\)\{return e\.source\+':'\+e\.id;\}/,'capture event identity');
assert.match(html,/function recorded\(e\)\{return L\.find\(x=>x\.captureId===captureKey\(e\)\);\}/,'capture identity checked before save');
/* Backup must include ledger and relevant settings, and save must fail safely. */
assert.match(html,/function backupState\(\)/,'backup export payload');
assert.match(html,/schema:'snake-finance-backup',version:2/,'versioned backup');
assert.match(html,/function saveSafetyBackup\(\)/,'pre-import safety backup');
assert.match(html,/function exportBackup\(\)/,'backup export entrypoint');
assert.match(html,/function persistLedger\(\)/,'ledger persistence');
console.log('PASS Snake Finance: recurrence, rollback, capture identity and backup structure');


/* Recurring transaction and persistence behavior with isolated in-memory storage. */
const storage=new Map();
context.L=fixture.slice();
context.localStorage={setItem(k,v){storage.set(k,v)},getItem(k){return storage.get(k)||null}};
context.alert=()=>{};
context.LEDGER_KEY='snake_test_ledger';
context.PERSIST_BLOCKED=false;
vm.runInContext(extract('function persistLedger(','function nextId('),context);
assert.equal(context.persistLedger(),true);
assert.equal(JSON.parse(storage.get('snake_test_ledger')).length,fixture.length);
context.PERSIST_BLOCKED=true;
assert.equal(context.persistLedger(),false,'blocked persistence must not claim success');
context.PERSIST_BLOCKED=false;
context.localStorage={setItem(){throw Error('quota exceeded')}};
assert.equal(context.persistLedger(),false,'storage quota failure must not claim success');
context.localStorage={setItem(k,v){storage.set(k,v)},getItem(k){return storage.get(k)||null}};
const fields={ed:{value:'12'},ev:{value:'89,90'},ea:{value:'c6'}};
context.$=id=>fields[id];
context.YM='2026-10';
context.closeDay=()=>{};
context.draw=()=>{};
context.brl=v=>String(v);
context.L=[{id:101,d:'2026-10-12',n:'Recorrência teste',t:'d',s:'p',v:7500,a:'c6'}];
vm.runInContext(extract('let EFFECT_UNDO=null;','const oldSaveLanc=saveLanc;'),context);
context.confirmEfet(101);
assert.equal(context.L[0].s,'r','recurrence realized');
assert.equal(context.L[0].v,8990,'realized with edited amount');
assert.equal(context.L[0].comp,'2026-10-01','competence preserved');
assert.equal(JSON.parse(storage.get('snake_test_ledger'))[0].v,8990,'saved after realization');
context.undo();
assert.equal(context.L[0].s,'p','undo returns planned state');
assert.equal(context.L[0].v,7500,'undo restores original amount');
assert.equal(JSON.parse(storage.get('snake_test_ledger'))[0].s,'p','undo persisted');
const oldCount=context.L.length;
context.confirmEfet(101);
context.confirmEfet(101);
assert.equal(context.L.length,oldCount,'double confirmation does not create transactions');
/* Same monetary value is NOT a duplicate when source event identity differs. */
vm.runInContext('function captureKey(e){return e.source+":"+e.id;} function recorded(e){return L.find(x=>x.captureId===captureKey(e));}',context);
context.L=[{id:1,captureId:'bank:pix-001',v:5000},{id:2,captureId:'bank:debit-002',v:5000}];
assert.equal(context.recorded({source:'bank',id:'pix-001'}).id,1);
assert.equal(context.recorded({source:'bank',id:'debit-002'}).id,2);
assert.equal(context.recorded({source:'bank',id:'new-003'}),undefined);
console.log('PASS Snake Finance: persistence failures, recurring effective/undo, and event identity dedup');


/* Recurrence confirmation and persistence rollback tests with isolated DOM mocks. */
{
 const values={ed:{value:'12'},ev:{value:'89,90'},ea:{value:'c6'}};
 const store=new Map();
 let fail=false,draws=0,closed=0,alerts=[];
 const env={Date,Math,Number,String,Array,Set,Map,JSON,console,
  L:[{id:301,d:'2026-10-12',a:'c6',t:'d',s:'p',v:7990,n:'Conta de luz',c:'con'}],
  YM:'2026-10',AC:{c6:['C6']},PERSIST_BLOCKED:false,LEDGER_KEY:'test-ledger',
  localStorage:{setItem(k,v){if(fail)throw Error('quota');store.set(k,v);}},
  alert(msg){alerts.push(msg)},$:(id)=>values[id],brl:v=>String(v),
  closeDay(){closed++},draw(){draws++},OPEN:1,LAST:0,TOAST:'',EFFECT_UNDO:null};
 vm.createContext(env);
 vm.runInContext(extract('function validISO(','function moneyInput('),env);
 vm.runInContext(extract('function moneyInput(','function monthBefore('),env);
 vm.runInContext(extract('function persistLedger(','function nextId('),env);
 vm.runInContext(extract('function confirmEfet(','const oldSaveLanc='),env);
 env.confirmEfet(301);
 assert.equal(env.L[0].s,'r','recurrence paid');
 assert.equal(env.L[0].v,8990,'actual amount overrides planned');
 assert.equal(env.L[0].comp,'2026-10-01','competence retained');
 assert.equal(JSON.parse(store.get('test-ledger'))[0].v,8990,'saved value matches ledger');
 env.undo();
 assert.equal(env.L[0].s,'p','undo returns planned');
 assert.equal(env.L[0].v,7990,'undo restores original amount');
 assert.equal(JSON.parse(store.get('test-ledger'))[0].s,'p','undo persists');
 fail=true;
 env.confirmEfet(301);
 assert.equal(env.L[0].s,'p','failed storage must roll back recurrence');
 assert.equal(env.L[0].v,7990,'failed storage must preserve amount');
 assert.ok(alerts.some(x=>x.includes('Não foi possível salvar')),'storage failure reported');
 assert.equal(draws,2,'failed transaction must not redraw as success');
 assert.equal(closed,1,'failed transaction must not close as success');
}
console.log('PASS Snake Finance: recurring actualization, undo, persistence and rollback on storage failure');
