/* V10 pure finance regression tests */
(()=>{'use strict';const near=(a,b)=>Math.abs(Number(a)-Number(b))<.02;
function run(){const S=FinanceStoreV10?.get(),E=FinanceEngineV10,R=[];const t=(name,ok,got)=>R.push({name,ok:!!ok,got});
t('Store real',S?.meta?.dataMode==='real');t('Production',S?.meta?.environment==='production');
if(S&&E){const oct=E.summary(S,'2026-10'),nov=E.summary(S,'2026-11'),jun=E.summary(S,'2027-06');
t('Oct recurring',near(oct.recurringExpense,4209.90),oct.recurringExpense);t('Nov recurring',near(nov.recurringExpense,4209.90),nov.recurringExpense);t('Jun recurring',near(jun.recurringExpense,3909.90),jun.recurringExpense);
t('Nov investment',near(nov.investment,3000),nov.investment);t('Investment not expense',near(nov.plannedExpense,4209.90),nov.plannedExpense);
const cats=E.categoryTotals(S,'2026-11','planned'),sum=cats.reduce((a,x)=>a+x.value,0);t('Categories equal planned expense',near(sum,nov.plannedExpense),sum);
const c=S.cards.find(x=>x.id==='card_caju_alimentacao');t('Caju excluded patrimony',!!c?.excludeFromPatrimony);t('Caju balance',near(c?.balance,881.95),c?.balance);
const aportes=S.transactions.filter(x=>x.transfer&&x.destAccountId==='acc_invest_plan');t('9 canonical investments',aportes.length===9,aportes.length);
}
const out={ok:R.every(x=>x.ok),passed:R.filter(x=>x.ok).length,total:R.length,results:R,at:new Date().toISOString()};window.__V10_FINANCE_TESTS__=out;return out}
window.FinanceTestsV10={run};})();