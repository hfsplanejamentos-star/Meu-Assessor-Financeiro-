const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||'revision12/snake-finance-mobile.html','utf8');
const between=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
const env={window:{},console,Date,Map,Set};vm.createContext(env);
vm.runInContext(between('function moneyInput(','function monthBefore('),env);
for(const [raw,want]of [['1500.50',150050],['1.500',150000],['1.500,50',150050],['1500,50',150050],['1,500.50',150050],['6',600],['0,01',1],['-10,50',-1050],['1.234.567,89',123456789]])assert.equal(env.moneyInput(raw),want,raw);
for(const raw of ['', '1.2.3','1,234','1,2,3','1e3','NaN','9007199254740991'])assert(Number.isNaN(env.moneyInput(raw)),raw);
vm.runInContext(between('function cajuCompetence(','function cajuBalance('),env);
assert.equal(env.cajuCompetence({d:'2026-10-30',comp:'2026-11-01'}),'2026-11');
assert.equal(env.cajuCompetence({d:'2026-10-30',comp:'invalid'}),'2026-10');
env.addMonthsYM=(ym,n)=>{const d=new Date(ym+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);return d.toISOString().slice(0,7)};
env.CAJU_CFG={};env.ORIGINAL_FUNDS=0;env.L=[{a:'caju',t:'r',s:'r',d:'2026-10-30',comp:'2026-11-01',n:'Recarga Caju',v:150000}];
vm.runInContext(between('function cajuBalance(','// Internal benefit allocation'),env);
assert.equal(env.cajuBalance('2026-10'),0);assert.equal(env.cajuBalance('2026-11'),150000);
env.dateOffset=(day,n)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};env.validISO=x=>/^\d{4}-\d{2}-\d{2}$/.test(x);env.accountBalance=()=>10000;
vm.runInContext(between('function accountCashShortfall(','function financialAlerts('),env);
env.L=[{id:1,a:'c6',t:'r',s:'p',d:'2026-10-23',v:100000},{id:2,a:'c6',t:'d',s:'p',d:'2026-10-24',v:90000}];assert.equal(env.accountCashShortfall('c6','2026-10-22',7).shortfall,false);
env.L[0].d='2026-10-25';assert.equal(env.accountCashShortfall('c6','2026-10-22',7).day,'2026-10-24');
// Run actual capture rules, not a rewritten approximation.
Object.assign(env,{autoSafeEnabled:true,native:true,PERSIST_BLOCKED:false,busy:false,NID:100,pending:[],persistLedger:()=>true,draw:()=>{},nextId:()=>++env.NID,L:[],APP_TODAY:'2026-10-22'});
vm.runInContext(between('function localDraft(e){','function audioError('),env);
vm.runInContext(between('function safeAutoRegisterBankExpenses(){','function rows(source)'),env);
const event=(id,source,text,amount=600)=>({id,sourcePackage:source,title:source==='com.c6bank.app'?'C6 Bank':'XP',text,amountCents:amount,direction:'expense',postedAt:'2026-10-22T08:00:00-03:00'});
env.pending=[event('own1','com.c6bank.app','Pix enviado C6 para XP entre minhas contas',10000)];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,1);assert.equal(env.L[0].t,'t');assert.equal(env.L[0].to,'xp');
env.pending=[event('own2','br.com.xp.carteira','Pix enviado XP para C6 entre minhas contas',12000)];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,2);assert.equal(env.L[1].a,'xp');assert.equal(env.L[1].to,'c6');
env.pending=[event('park','com.c6bank.app','Pix enviado estacionamento')];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,3);assert.equal(env.L[2].c,'est');
env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,3,'No duplicate on resync');
env.pending=[event('generic','com.c6bank.app','Pix enviado pessoa desconhecida',900)];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,3,'Ambiguous Pix remains in review');
const before=JSON.stringify(env.L);env.persistLedger=()=>false;env.pending=[event('rollback','com.c6bank.app','Compra combustível posto de gasolina',10000)];env.safeAutoRegisterBankExpenses();assert.equal(JSON.stringify(env.L),before,'Persistence rollback');
console.log('PASS: parser, Caju competence and balances, chronological cash-flow, own transfers both directions, parking, ambiguous Pix, resync and rollback.');

// Future invoice installments still commit credit at the original purchase date.
vm.runInContext(between('function snakeCarbonPaymentIsLinked(','function creditUsed('),env);
env.L=Array.from({length:3},(_,i)=>({id:i+1,a:'carbon',t:'d',s:'r',d:'2026-10-15',comp:env.addMonthsYM('2026-11',i)+'-01',v:30000}));
assert.equal(env.snakeCarbonCreditLedger('2026-11-01',{opening:0}).used,90000);
env.L.push({id:4,a:'c6',to:'carbon',t:'t',s:'r',d:'2026-11-12',v:30000,invoiceId:'2026-11'});
assert.equal(env.snakeCarbonCreditLedger('2026-11-01',{opening:0}).used,90000);
assert.equal(env.snakeCarbonCreditLedger('2026-11-12',{opening:0}).used,60000);
console.log('PASS: Carbon counts future installments and releases credit only after linked payment date.');

// Confirmed purchase with future installments still marked planned must commit its full total.
env.L=[{id:1,a:'carbon',t:'d',s:'r',d:'2026-10-15',comp:'2026-11-01',v:30000,installmentGroup:'test-group',installmentIndex:1,installmentCount:3,purchaseTotal:90000},{id:2,a:'carbon',t:'d',s:'p',d:'2026-12-01',comp:'2026-12-01',v:30000,installmentGroup:'test-group',installmentIndex:2,installmentCount:3,purchaseTotal:90000},{id:3,a:'carbon',t:'d',s:'p',d:'2027-01-01',comp:'2027-01-01',v:30000,installmentGroup:'test-group',installmentIndex:3,installmentCount:3,purchaseTotal:90000}];
const ledgerBefore=JSON.stringify(env.L);
for(const date of ['2026-10-15','2026-11-01','2026-12-01','2027-01-01'])assert.equal(env.snakeCarbonCreditLedger(date,{opening:0}).used,90000,date);
assert.equal(JSON.stringify(env.L),ledgerBefore,'Credit calculation must not edit future installment statuses');
assert.equal(env.snakeCarbonCreditLedger('2026-10-14',{opening:0}).used,0,'Do not commit before purchase confirmation');
env.L.forEach(x=>x.s='p');assert.equal(env.snakeCarbonCreditLedger('2027-02-01',{opening:0}).used,0,'A wholly planned purchase does not consume actual credit');
env.L[0].s='r';env.L[0].purchaseTotal=80000;assert.equal(env.snakeCarbonCreditLedger('2026-11-01',{opening:0}).used,30000,'Inconsistent metadata cannot invent debt');
console.log('PASS: mixed-status installment groups commit once in full; planned purchases excluded; invalid groups remain reviewable; ledger unchanged.');

// User example: BRL 2,500 limit; BRL 100 each in Nov, Dec and Jan.
env.L=Array.from({length:3},(_,i)=>({id:101+i,a:'carbon',t:'d',s:i===0?'r':'p',d:i===0?'2026-10-22':env.addMonthsYM('2026-11',i)+'-01',comp:env.addMonthsYM('2026-11',i)+'-01',v:10000,installmentGroup:'nov-dec-jan',installmentIndex:i+1,installmentCount:3,purchaseTotal:30000}));
const available=()=>250000-env.snakeCarbonCreditLedger('2026-11-30',{opening:0}).used;
assert.equal(available(),220000,'All three open installments commit BRL 300');
env.L.push({id:104,a:'c6',to:'carbon',t:'t',s:'p',d:'2026-11-12',v:10000,invoiceId:'2026-11'});
assert.equal(available(),220000,'Planned invoice payment must not release credit');
env.L[3].s='r';assert.equal(available(),230000,'Actual linked November payment releases BRL 100 once');
console.log('PASS: exact user example: BRL 2,200 available before payment, planned payment unchanged, BRL 2,300 after actual November payment.');

// Android bridge supplies postedAt as epoch milliseconds, not an ISO string.
env.persistLedger=()=>true;env.L=[];env.pending=[{...event('native-timestamp','br.com.xp.carteira','Pix enviado estacionamento',600),postedAt:Date.parse('2026-10-22T08:00:00-03:00')}];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,1,'Native numeric postedAt must remain eligible for safe parking capture');assert.equal(env.L[0].a,'xp');assert.equal(env.L[0].c,'est');env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,1,'Numeric timestamp resync must not duplicate');console.log('PASS: Android epoch timestamps accepted and deduplicated.');

