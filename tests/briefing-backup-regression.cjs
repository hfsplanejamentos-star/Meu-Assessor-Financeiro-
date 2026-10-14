'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const web=fs.readFileSync('snake-finance-mobile.html','utf8');
const bundled=fs.readFileSync('android-capture/app/src/main/assets/snake-finance-mobile.html','utf8');
assert.equal(bundled,web,'APK fallback and hosted Mobile must have identical financial logic');
assert.match(web,/if\(!Array\.isArray\(L\)\|\|!L\.length\)/,'empty ledger export must be blocked');
assert.match(web,/if\(!ledger\.length\)throw Error\('Backup sem lançamentos/,'empty ledger import must be blocked');
assert.match(web,/data\.schema==='snake-finance-raw-recovery'/,'raw recovery must support ledger extraction');

const match=web.match(/<script id="snake-daily-briefing">([\s\S]*?)<\/script>/);
assert.ok(match,'daily briefing script missing');
new vm.Script(match[1],{filename:'snake-daily-briefing.js'});
const transactions=[
  {id:1,d:'2026-10-14',s:'r',t:'d',a:'c6',v:2500,c:'out',n:'Compra'},
  {id:2,d:'2026-10-14',s:'r',t:'r',a:'c6',v:10000,n:'Recebido'},
  {id:3,d:'2026-10-14',s:'r',t:'d',a:'caju',v:4000,c:'trab',sub:'Refeição',n:'Almoço'},
  {id:4,d:'2026-10-13',s:'r',t:'d',a:'c6',v:5000,c:'trab',sub:'Combustível',n:'Gasolina'},
  {id:5,d:'2026-10-17',s:'p',t:'d',a:'c6',v:30000,c:'mor',n:'Aluguel'},
  {id:6,d:'2026-10-23',s:'p',t:'d',a:'c6',v:70000,c:'mor',n:'Fora dos 7 dias'}
];
function offset(iso,days){const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+days);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
const state={
  window:{},L:transactions,PERSIST_BLOCKED:false,
  ST:{hide:false},AS:'av',
  ALERT_CFG:{goal:{enabled:true,amount:3000},carbon:{enabled:true,limit:2500}},
  CAJU_CFG:{'2026-10':{opening:10000,reload:50000}},
  localToday:()=> '2026-10-14',
  validISO:value=>/^\d{4}-\d{2}-\d{2}$/.test(value),
  dateOffset:offset,
  accountBalance:()=>100000,
  cajuBalance:()=>25000,
  creditUsed:()=>50000,
  financialAlerts:()=>[{text:'Vencimento R$ 100,00'}],
  escapeHTML:t=>String(t).replace(/</g,'&lt;'),
  brl:cents=>'R$ '+(cents/100).toFixed(2),
  vAs:()=>'<section>Alertas antigos</section>',
  draw:()=>{}
};
vm.createContext(state);
vm.runInContext(match[1],state);
const snapshot=state.window.SnakeDailyBriefing.snapshot('morning');
assert.equal(snapshot.ready,true);
assert.equal(snapshot.c6Balance,100000);
assert.equal(snapshot.cajuAvailable,25000);
assert.equal(snapshot.c6Due,30000);
assert.equal(snapshot.availableWeek,70000);
assert.equal(snapshot.spendingPerDay,10000);
assert.equal(snapshot.earnedToday,10000);
assert.equal(snapshot.spentToday,6500);
assert.equal(snapshot.spentMonth,11500);
assert.equal(snapshot.monthlyGoal,300000);
assert.equal(snapshot.investedMonth,0);
assert.equal(snapshot.carbonUsed,50000);
assert.equal(snapshot.carbonLimit,250000);
assert.equal(snapshot.due.length,1,'future expense outside the seven-day horizon must be excluded');
assert.equal(snapshot.workPlan.days,13,'October 2026 has 13 Tue/Wed/Thu workdays');
assert.equal(snapshot.workPlan.mealCents,52000);
assert.equal(snapshot.workPlan.fuelCents,65000);
assert.equal(snapshot.workPlan.parkingCents,7800);
assert.equal(snapshot.spentWork.mealCents,4000);
assert.equal(snapshot.spentWork.fuelCents,5000);
assert.match(state.vAs(),/Briefing financeiro/);
assert.match(state.vAs(),/R\$ 1000\.00/);
state.ST.hide=true;
assert.match(state.vAs(),/R\$ ••••/);
state.PERSIST_BLOCKED=true;
assert.equal(state.window.SnakeDailyBriefing.snapshot().ready,false,'blocked database must never generate financial amounts');
state.PERSIST_BLOCKED=false;
state.L=[];
assert.equal(state.window.SnakeDailyBriefing.snapshot().ready,false,'empty database must not render zeroed briefing');

// Reconciliation must continue to work after the original bank notification
// has been saved and acknowledged (therefore removed from the native queue).
const begin=web.indexOf('function captureMerchant(value)');
const finish=web.indexOf('function normalized(source)',begin);
assert.ok(begin>0&&finish>begin,'Wallet reconciliation helpers must be present');
const matcherContext={L:[{
  id:77,d:'2026-10-14',t:'d',s:'r',v:5000,a:'c6',
  n:'Compra aprovada em Posto Trevo',
  captureSourcePackage:'com.c6bank.app',capturePostedAt:1000000,
  captureMerchant:'posto trevo'
}]};
vm.createContext(matcherContext);
vm.runInContext(web.slice(begin,finish),matcherContext);
const wallet=(text,when=1030000)=>({
  source:'bank',sourcePackage:'com.google.android.apps.walletnfcrel',
  direction:'expense',title:'Pagamento realizado',text,postedAt:when
});
const draft={type:'d',amount:5000,day:'2026-10-14'};
assert.equal(matcherContext.recordedWalletMatch(
  wallet('Você pagou R$ 50,00 em POSTO TREVO'),draft).id,77);
assert.equal(matcherContext.recordedWalletMatch(
  wallet('Você pagou R$ 50,00 em OUTRO MERCADO'),draft),null,'different merchant must not match');
assert.equal(matcherContext.recordedWalletMatch(
  wallet('Você pagou R$ 50,00 em POSTO TREVO',1500000),draft),null,'different time must not match');
assert.equal(matcherContext.recordedWalletMatch({
  ...wallet('Pix de R$ 50,00 para POSTO TREVO'),title:'Pix recebido'},draft),null,'Pix must not match card spending');

const native=fs.readFileSync('android-capture/app/src/main/java/br/com/meuassessor/capture/DailyFinanceReminder.java','utf8');
assert.match(native,/private static final int MORNING = 1108/);
assert.match(native,/private static final int EVENING = 1109/);
assert.match(native,/private static final int WEEKLY = 1110/);
assert.match(native,/Calendar\.SUNDAY, 7/);
assert.match(native,/VISIBILITY_PRIVATE/);
console.log('Snake Finance: briefing, backup and reminder regression passed');
