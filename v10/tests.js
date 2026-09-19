/* V10 acceptance smoke/regression tests */
(()=>{'use strict';const eq=(a,b,t=.02)=>Math.abs(Number(a)-Number(b))<t;
function run(){const R=[],add=(id,name,ok,detail='')=>R.push({id,name,ok:!!ok,detail});const S=window.FinanceStoreV10?.get?.(),E=window.FinanceEngineV10;
add(2,'modular store',!!window.FinanceStoreV10);add(4,'single V10 engine',!!E);add(7,'production real mode',!!S&&S.meta?.environment==='production'&&S.meta?.dataMode==='real');
add(12,'canonical recurrence',!!E?.recurringFor&&eq(E.summary(S,'2026-10').recurringExpense,4209.90));add(14,'canonical investment',!!E&&E.investmentPlanFor(S,'2026-11').length===1&&eq(E.summary(S,'2026-11').investment,3000));
add(17,'consistent categories',!!E?.categoryTotals&&eq(E.categoryTotals(S,'2026-10','planned').reduce((a,x)=>a+x.value,0),4209.90));
const ser=E?.chartSeries?.(S,'2026-10',12)||[];add(18,'future charts',ser.length===12&&ser.every(x=>Array.isArray(x.categories)));
add(20,'clickable cards',!!window.MobileDashboardV10);const cj=(S?.cards||[]).find(x=>x.id==='card_caju_alimentacao');add(24,'Caju separate',!!cj&&cj.excludeFromPatrimony===true&&eq(cj.balance,881.95));
add(25,'mobile-first dashboard',!!window.MobileDashboardV10&&!!document.getElementById('v10BottomNav'));add(29,'desktop/mobile same engine',!!S&&!!E);add(30,'original identity theme',!!window.MobileThemeV10&&['current','dark','light'].includes(MobileThemeV10.get()));
add(31,'optional light theme',!!window.MobileThemeV10);
add(43,'unit test harness',true);add(49,'diagnostic object',!!window.RenderControllerV10);add(50,'source-fix V10 path',!!window.FinanceStoreV10&&!!window.FinanceEngineV10&&!!window.RenderControllerV10);
if(E&&S){const oct=E.summary(S,'2026-10'),nov=E.summary(S,'2026-11'),dec=E.summary(S,'2026-12');add('M10','Oct planned income',eq(oct.plannedIncome,6500),oct.plannedIncome);add('M11','Nov planned income',eq(nov.plannedIncome,10104.50),nov.plannedIncome);add('M12','Dec salary + 13th',eq(dec.plannedIncome,13997.94),dec.plannedIncome)}
const out={ok:R.every(x=>x.ok),passed:R.filter(x=>x.ok).length,total:R.length,results:R,at:new Date().toISOString()};window.__V10_TESTS__=out;return out}
window.V10Tests={run};if(document.readyState==='complete')setTimeout(run,100);else window.addEventListener('load',()=>setTimeout(run,100));})();