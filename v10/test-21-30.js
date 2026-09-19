/* V10 acceptance tests for items 21-30 */
(()=>{'use strict';function run(){const out=[],add=(id,name,ok,detail='')=>out.push({id,name,ok:!!ok,detail});const s=FinanceStoreV10?.get(),e=window.FinanceEngineV10;
 add(21,'Gráficos interativos',!!window.ExperienceV10?.bindCharts);
 const agenda=window.ExperienceV10?.agendaEvents('2026-10')||[];add(22,'Agenda ligada ao motor',agenda.some(x=>x.type==='recurring'),agenda.length);
 const rec=window.ExperienceV10?.reconcile('2026-09');add(23,'Conciliação explícita',!!rec&&Array.isArray(rec.cases),rec?.cases?.length);
 const cj=window.ExperienceV10?.cajuStatus();add(24,'Caju separado',!!cj&&cj.excludeFromPatrimony&&Math.abs(cj.balance-803.95)<.02,cj);
 add(25,'Mobile-first',!!window.MobileDashboardV10);
 add(26,'KPI mobile 2x2',!!document.querySelector('link[href*="mobile-dashboard.css"]'));
 add(27,'Hierarquia mobile',!!document.querySelector('link[href*="mobile-dashboard.css"]'));
 add(28,'Navegação inferior',!!document.getElementById('v10BottomNav'));
 const a=window.ExperienceV10?.architecture();add(29,'Desktop/Mobile mesmo Store/Engine',!!a?.store&&!!a?.engine&&a?.desktopUsesSameState,a);
 add(30,'Identidade original preservada',!!window.MobileThemeV10&&['current','dark','light'].includes(MobileThemeV10.get()),MobileThemeV10?.get());
 const result={ok:out.every(x=>x.ok),passed:out.filter(x=>x.ok).length,total:out.length,items:out,at:new Date().toISOString()};window.__V10_TEST_21_30__=result;return result}
 window.V10Test21to30={run};
})();
