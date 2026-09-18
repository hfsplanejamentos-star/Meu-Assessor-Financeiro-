/* V10 structural smoke tests: run with V10Tests.run() in browser */
(()=>{'use strict';
 const eq=(a,b,t=.02)=>Math.abs(Number(a)-Number(b))<t;
 function run(){
  const results=[];const add=(name,ok,detail='')=>results.push({name,ok:!!ok,detail});
  add('01 theme controller',!!window.MobileThemeV10);
  if(window.MobileThemeV10){const old=MobileThemeV10.get();for(const x of ['current','dark','light']){MobileThemeV10.apply(x);add('theme '+x,document.documentElement.dataset.mobileTheme===x)}MobileThemeV10.apply(old)}
  add('02 canonical finance engine',!!window.FinanceCanonical);
  if(window.FinanceCanonical){const oct=FinanceCanonical.summary('2026-10'),nov=FinanceCanonical.summary('2026-11'),dec=FinanceCanonical.summary('2026-12');
   add('Oct income',eq(oct.plannedIncome,6500),oct.plannedIncome);add('Oct expense',eq(oct.plannedExpense,4209.90),oct.plannedExpense);
   add('Nov income',eq(nov.plannedIncome,10104.50),nov.plannedIncome);add('Nov investment',eq(nov.investment,3000),nov.investment);
   add('Dec income + 13th',eq(dec.plannedIncome,13997.94),dec.plannedIncome);
   const p=FinanceCanonical.projection('2026-10',12);add('Projection 12 months',p.length===12,p.length);add('Jul 2027 patrimony',eq(p.find(x=>x.key==='2027-07')?.patrimony,59869.25),p.find(x=>x.key==='2027-07')?.patrimony);
  }
  const dup=new Map(),tx=db?.transactions||[];tx.forEach(t=>{const k=[t.date,t.value,t.desc,t.accountId||t.account,t.destAccountId||t.dest].join('|');dup.set(k,(dup.get(k)||0)+1)});add('No exact transaction duplicates',[...dup.values()].every(n=>n===1));
  add('Caju outside patrimony',(db?.accounts||[]).filter(a=>/caju/i.test(a.name||'')).every(a=>a.excludeFromPatrimony||/benef/i.test(a.type||'')));
  add('Render controller',!!window.RenderControllerV10);
  const out={ok:results.every(x=>x.ok),passed:results.filter(x=>x.ok).length,total:results.length,results,at:new Date().toISOString()};window.__V10_TESTS__=out;return out;
 }
 window.V10Tests={run};
})();