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
vm.runInContext(between('function snakeOwnTransferPairs(events){','function rows(source)'),env);
const event=(id,source,text,amount=600)=>({id,sourcePackage:source,title:source==='com.c6bank.app'?'C6 Bank':'XP',text,amountCents:amount,direction:'expense',postedAt:'2026-10-22T08:00:00-03:00'});
env.pending=[event('own1','com.c6bank.app','Pix enviado C6 para XP entre minhas contas',10000)];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,1);assert.equal(env.L[0].t,'t');assert.equal(env.L[0].to,'xp');
env.pending=[event('own2','br.com.xp.carteira','Pix enviado XP para C6 entre minhas contas',12000)];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,2);assert.equal(env.L[1].a,'xp');assert.equal(env.L[1].to,'c6');
env.pending=[event('park','br.com.xp.carteira','Pix enviado estacionamento')];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,3);assert.equal(env.L[2].c,'trab');assert.equal(env.L[2].sub,'Estacionamento');
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
env.persistLedger=()=>true;env.L=[];env.pending=[{...event('native-timestamp','br.com.xp.carteira','Pix enviado estacionamento',600),postedAt:Date.parse('2026-10-22T08:00:00-03:00')}];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,1,'Native numeric postedAt must remain eligible for safe parking capture');assert.equal(env.L[0].a,'xp');assert.equal(env.L[0].c,'trab');assert.equal(env.L[0].sub,'Estacionamento');env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,1,'Numeric timestamp resync must not duplicate');console.log('PASS: Android epoch timestamps accepted and deduplicated.');

// Confirmed owner, unambiguous matched two-bank notifications, and replay safety.
env.localStorage={getItem:k=>k==='snake_transfer_holder_v1'?'Nome Teste Pessoa':null};env.bridge={acknowledgeNotifications:()=>true};env.persistLedger=()=>true;env.L=[];env.pending=[{id:'xp-a',sourcePackage:'br.com.xp.carteira',title:'Pix realizado',text:'Você enviou um Pix para Nome Teste Pessoa no valor de R$ 1.000,00.',amountCents:100000,direction:'expense',postedAt:'2026-11-10T08:00:00-03:00'},{id:'c6-b',sourcePackage:'com.c6bank.app',title:'Você recebeu um Pix',text:'Pix recebido no valor de R$ 1.000,00, de Nome Teste Pessoa, CPF: ***.000.000-**, em 10/11/2026.',amountCents:100000,direction:'income',postedAt:'2026-11-10T08:01:00-03:00'}];const pairedSample=env.pending.slice();env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,2);assert.equal(env.L[0].t,'t');assert.equal(env.L[0].a,'xp');assert.equal(env.L[0].to,'cdb');assert.equal(env.L[0].captureIds.length,2);assert.equal(env.L[1].t,'r');assert.equal(env.L[1].bal,false);env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,2,'Replay must not duplicate');
vm.runInContext(between('function snakeCarbonEffectiveLimit(','function snakeCarbonLimitReconciliation('),env);assert.equal(env.snakeCarbonEffectiveLimit('2026-11-30',{limit:2500}),350000);env.L.push({id:200,d:'2026-11-11',a:'cdb',to:'xp',v:20000,t:'t',s:'r'});assert.equal(env.snakeCarbonEffectiveLimit('2026-11-30',{limit:2500}),330000);console.log('PASS: paired Pix CDB transfer, replay protection, estimated credit and redemption.');
const sample=pairedSample;env.L=[];env.pending=[...sample,{...sample[1],id:'second-same'}];env.safeAutoRegisterBankExpenses();assert.equal(env.L.filter(x=>x.t==='t').length,0,'Ambiguous transfer not matched');env.L=[];env.pending=sample;env.localStorage={getItem:()=> 'Pessoa Diferente'};env.safeAutoRegisterBankExpenses();assert.equal(env.L.filter(x=>x.t==='t').length,0,'Different holder is not automatic');env.L=[];env.localStorage={getItem:()=> 'Nome Teste Pessoa'};env.persistLedger=()=>false;env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,0,'Failed storage rolls back both sides');env.persistLedger=()=>true;console.log('PASS: ambiguous/mismatched pairs held and persistence failure rolled back.');

// Income is saved once; a later matching outgoing converts its balance contribution to the transfer.
env.localStorage={getItem:()=> 'Nome Teste Pessoa'};env.L=[];env.pending=[pairedSample[1]];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,1);assert.equal(env.L[0].pixReceipt,true);assert.notEqual(env.L[0].bal,false);env.pending=[pairedSample[0]];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,2);assert.equal(env.L.filter(x=>x.t==='t').length,1);assert.equal(env.L.find(x=>x.t==='r').bal,false);console.log('PASS: delayed counterpart reconciles once.');

vm.runInContext(between('function accountDelta(','function accountBalance('),env);assert.equal(env.L.reduce((v,x)=>v+env.accountDelta(x,'xp'),0),-100000);assert.equal(env.L.reduce((v,x)=>v+env.accountDelta(x,'cdb'),0),100000);assert.equal(env.L.reduce((v,x)=>v+env.accountDelta(x,'c6'),0),0);console.log('PASS: own-transfer balance credited only once.');
env.L=[];env.persistLedger=()=>true;let incoming={id:'income-external',sourcePackage:'br.com.xp.carteira',title:'Pix recebido',text:'Você recebeu um Pix de Outra Pessoa, CPF: ***.000.000-** de R$ 25,00.',amountCents:2500,direction:'income',postedAt:'2026-10-27T20:46:00-03:00'};env.pending=[incoming];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,1);assert.equal(env.L[0].t,'r');assert.equal(env.L[0].v,2500);assert.equal(env.accountDelta(env.L[0],'xp'),2500);env.pending=[incoming];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,1);console.log('PASS: external Pix income posted once and credited to XP.');
env.L=[];env.pending=[{id:'sample-parking',sourcePackage:'br.com.xp.carteira',title:'Pix realizado',text:'Você enviou um Pix para Prestador Teste no valor de R$ 6,00.',amountCents:600,direction:'expense',postedAt:'2026-10-28T06:49:00-03:00'},{id:'sample-fuel',sourcePackage:'br.com.xp.carteira',title:'Cartão de Débito XP',text:'Compra APROVADA de R$ 20,00 em AutoPostoTeste via cartão digital.',amountCents:2000,direction:'expense',postedAt:'2026-10-28T05:39:00-03:00'}];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,2);assert.equal(env.L.find(x=>x.v===600).c,'trab');assert.equal(env.L.find(x=>x.v===600).sub,'Estacionamento');assert.equal(env.L.find(x=>x.v===2000).c,'trab');assert.equal(env.L.find(x=>x.v===2000).sub,'Abastecimento');env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,2);env.L=[];env.pending=[{...env.pending[0],id:'own-six',text:'Você enviou um Pix para Nome Teste Pessoa no valor de R$ 6,00.'}];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,0,'Own Pix should not be classified as parking');console.log('PASS: XP parking and AutoPosto text; no duplicated or own-account parking.');

vm.runInContext(between('function isWork(', '\n'),env);
for(const [date,work] of [['2026-10-28T04:59:00-03:00',true],['2026-10-28T05:00:00-03:00',true],['2026-10-28T11:59:00-03:00',true],['2026-10-28T12:00:00-03:00',true],['2026-10-30T06:00:00-03:00',false]]){const cls=env.snakeAutoExpenseClass('xp',2000,'Compra AutoPostoTeste',date,false);assert.equal(env.isWork(cls),work,date);}
assert.equal(env.snakeAutoExpenseClass('carbon',2000,'Combustível','2026-10-28T06:00:00-03:00',false).c,'trab');
assert.equal(env.snakeAutoExpenseClass('caju',4000,'Refeição','2026-10-28T12:00:00-03:00',false).sub,'Refeição');
const canonical=env.snakeAutoExpenseClass('xp',600,'Pix realizado','2026-10-28T06:49:00-03:00',true);delete canonical.ctx;assert(env.isWork(canonical),'Work survives review removing context text');
env.L=[{id:900,d:'2026-10-28',n:'Compra APROVADA em AutoPostoTeste',t:'d',s:'r',v:2000,a:'xp',c:'abs',sub:'',ctx:'Pessoal · Combustível',autoSource:'bank',reviewPending:true,autoPostedAt:'2026-10-28T05:39:00-03:00'},{id:901,d:'2026-10-28',n:'Compra APROVADA em AutoPostoTeste',t:'d',s:'r',v:2000,a:'xp',c:'abs',sub:'',ctx:'Pessoal · Combustível',autoSource:'bank',reviewPending:false,autoPostedAt:'2026-10-28T05:39:00-03:00'}];env.pending=[];env.persistLedger=()=>true;const priorReviewed=JSON.stringify(env.L[1]);env.safeAutoRegisterBankExpenses();assert.equal(env.L[0].c,'trab');assert.equal(env.L[0].sub,'Abastecimento');assert.equal(env.L[0].v,2000);assert.equal(env.L[0].id,900);assert.equal(JSON.stringify(env.L[1]),priorReviewed);const once=JSON.stringify(env.L);env.safeAutoRegisterBankExpenses();assert.equal(JSON.stringify(env.L),once);console.log('PASS: Brazil work-window boundaries, canonical classification, and idempotent correction preserving reviewed transactions.');

// Provider rename reuses the existing benefit ledger, including old backups and monthly reloads.
const legacyBenefit=[{id:900,a:'caju',t:'r',s:'r',d:'2026-10-01',n:'Recarga Caju',v:10000},{id:901,a:'caju',t:'d',s:'r',d:'2026-10-18',n:'Compra anterior',v:1700}];
env.L=JSON.parse(JSON.stringify(legacyBenefit));env.CAJU_CFG={};env.ORIGINAL_FUNDS=0;
env.pending=[{id:'ifood-meal',sourcePackage:'br.com.ifood.benefits',title:'Compra aprovada',text:'Compra de R$ 25,00 em alimentação.',amountCents:2500,direction:'expense',postedAt:'2026-10-28T12:00:00-03:00'}];
env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,3);assert.equal(env.L[2].a,'caju');assert.equal(env.L[2].c,'trab');assert.equal(env.L[2].sub,'Refeição');assert.equal(env.cajuBalance('2026-10'),5800);assert.equal(JSON.stringify(env.L.slice(0,2)),JSON.stringify(legacyBenefit));env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,3);
vm.runInContext(between('function bankMark(','const AC='),env);assert.match(env.bankMark('caju'),/iFood/);assert.doesNotMatch(env.bankMark('caju'),/>caju</);
console.log('PASS: iFood notification classification and replay; legacy benefit history and balance preserved; iFood account label.');

// Two benefit wallets top up the same account without becoming cash revenue.
env.L=[{id:990,a:'caju',t:'d',s:'r',d:'2026-10-10',v:2000,n:'Compra anterior'}];env.ORIGINAL_FUNDS=10000;env.CAJU_CFG={'2026-10':{opening:10000,reload:50000}};const preserved=JSON.stringify(env.L[0]);
const reload=(id,kind,amount)=>({id,sourcePackage:'br.com.ifood.benefits',title:'Caiu o saldo!',text:`Você recebeu seu saldo ${kind} no valor de R$ ${(amount/100).toFixed(2).replace('.',',')}.`,amountCents:amount,direction:'income',postedAt:Date.parse('2026-10-29T11:04:00-03:00')});
const topups=[reload('food-topup','Alimentação',12000),reload('meal-topup','Refeição',18000)];env.pending=topups;env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,3);assert.equal(env.cajuBalance('2026-10'),38000,'Actual top-ups replace the configured reload, not added twice');assert.equal(JSON.stringify(env.L[0]),preserved);assert.deepEqual(Array.from(env.L.slice(1),x=>x.benefitKind),['alimentacao','refeicao']);assert(env.L.slice(1).every(x=>x.t==='r'&&x.a==='caju'&&x.s==='r'));env.pending=topups;env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,3);env.pending=[{...topups[0],id:'different-replay-id'}];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,3);
env.L=[];env.pending=[reload('equal-food','Alimentação',10000),reload('equal-meal','Refeição',10000)];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,2,'Equal wallet amounts are independent credits');
env.L=[];env.pending=[{...topups[0],sourcePackage:'com.unrelated.app'}, {...topups[1],id:'snapshot',text:'Seu saldo Refeição disponível é R$ 180,00.'}];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,0,'Snapshots and unsupported apps never create top-ups');
env.pending=topups;env.persistLedger=()=>false;env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,0,'Storage failure rolls both top-ups back');env.persistLedger=()=>true;
console.log('PASS: both iFood benefit reloads, equal amounts, replay protection, preserved history, configured reload reconciliation, snapshots and rollback.');

// The verified iFood benefit card identifies meals even when the push only names the merchant.
for(const day of ['2026-10-27','2026-10-28','2026-10-29'])for(const time of ['08:00','12:00','18:00']){
 env.L=[];env.pending=[{id:'ifood-'+day+'-'+time,sourcePackage:'br.com.ifood.benefits',title:'Compra aprovada',text:'Compra de R$ 30,00 em Restaurante Teste.',amountCents:3000,direction:'expense',postedAt:Date.parse(day+'T'+time+':00-03:00')}];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,1);assert.equal(env.L[0].c,time==='12:00'?'trab':'ali');assert.equal(env.L[0].sub,'Refeição');assert.equal(env.L[0].a,'caju');env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,1);
}
for(const day of ['2026-10-26','2026-10-30','2026-10-31','2026-11-01']){
 env.L=[];env.pending=[{id:'personal-'+day,sourcePackage:'br.com.ifood.benefits',title:'Compra aprovada',text:'Compra de R$ 30,00 em Restaurante Teste.',amountCents:3000,direction:'expense',postedAt:Date.parse(day+'T12:00:00-03:00')}];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,1);assert.equal(env.L[0].c,'ali');assert.equal(env.L[0].ctx,'Pessoal');
}
env.L=[];env.pending=[{id:'ifood-rejected',sourcePackage:'br.com.ifood.benefits',title:'Compra negada',text:'Compra de R$ 30,00 recusada.',amountCents:3000,direction:'expense',postedAt:Date.parse('2026-10-29T12:00:00-03:00')}];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,0);
assert.equal(env.snakeAutoExpenseClass('caju',3000,'Compra em restaurante',Date.parse('2026-10-30T01:30:00Z'),false,'br.com.ifood.benefits').c,'ali','Thursday 22:30 is outside meal window');
console.log('PASS: iFood merchant-only purchases auto-register as Trabalho/Refeição Tue/Wed/Thu within meal window, Pessoal other days; Brazil weekday, replay and denied purchases.');

for(const [time,work] of [['05:59',false],['06:00',true],['10:00',true],['10:01',false]]){
 const cls=env.snakeAutoExpenseClass('xp',600,'Pix estacionamento','2026-10-29T'+time+':00-03:00',true);assert.equal(cls.c==='trab',work,time);
}
assert.equal(env.snakeAutoExpenseClass('c6',600,'Pix estacionamento','2026-10-29T08:00:00-03:00',true).c,'est','C6 parking is not XP work parking');
for(const [time,work] of [['10:59',false],['11:00',true],['13:00',true],['13:01',false]])assert.equal(env.snakeAutoExpenseClass('caju',4000,'Compra restaurante','2026-10-29T'+time+':00-03:00',false,'br.com.ifood.benefits').c==='trab',work,time);
for(const account of ['xp','c6','carbon','caju'])for(const [day,work] of [['2026-10-27',true],['2026-10-28',true],['2026-10-29',true],['2026-10-30',false]])for(const time of ['00:01','08:00','23:59'])assert.equal(env.snakeAutoExpenseClass(account,5000,'Compra abastecimento',day+'T'+time+':00-03:00').c==='trab',work,account+day+time);
console.log('PASS: exact parking/meal boundaries, XP-only parking, and all-day Tue/Wed/Thu fuel across accounts.');
env.L=[];env.pending=[{id:'carbon-work-fuel',sourcePackage:'com.c6bank.app',title:'Compra aprovada cartão crédito',text:'Compra combustível R$ 50,00.',amountCents:5000,direction:'expense',postedAt:'2026-11-03T19:00:00-03:00'}];env.safeAutoRegisterBankExpenses();assert.equal(env.L.length,1);assert.equal(env.L[0].a,'carbon');assert.equal(env.L[0].sub,'Abastecimento');assert.equal(env.L[0].c,'trab');
