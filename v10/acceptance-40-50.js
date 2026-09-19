/* V10 acceptance 40-50 — executable release gate */
(()=>{'use strict';const near=(a,b)=>Math.abs(Number(a)-Number(b))<.02;
function run(){const R=[],t=(id,name,ok,detail='')=>R.push({id,name,ok:!!ok,detail});const S=window.FinanceStoreV10?.get?.(),E=window.FinanceEngineV10;
const deps=['FinanceStoreV10','FinanceEngineV10','RenderControllerV10','MobileThemeV10','MobileDashboardV10','V10Diagnostics','FinanceTestsV10','HealthV10'];t(40,'dependency/startup detection',deps.every(x=>!!window[x]),deps.filter(x=>!window[x]));
t(41,'complete production build',!!S&&S.meta?.environment==='production'&&S.meta?.dataMode==='real'&&!!E);
t(42,'portable/offline PWA build','serviceWorker'in navigator&&!!document.querySelector('link[rel="manifest"]'));
const unit=window.FinanceTestsV10?.run?.();t(43,'unit tests',unit?.ok,unit);
if(S&&E){const exp={'2026-10':[6500,4209.90,0],'2026-11':[10104.50,4209.90,3000],'2026-12':[13997.94,4209.90,3000],'2027-01':[10104.50,4209.90,3000],'2027-02':[10104.50,4209.90,3000],'2027-03':[10104.50,4209.90,3000],'2027-04':[10104.50,4209.90,3000],'2027-05':[10104.50,4209.90,3000],'2027-06':[10104.50,3909.90,3000],'2027-07':[10104.50,3909.90,3000]};const months=Object.entries(exp).map(([k,v])=>{const x=E.summary(S,k);return{k,ok:near(x.plannedIncome,v[0])&&near(x.plannedExpense,v[1])&&near(x.investment,v[2]),got:[x.plannedIncome,x.plannedExpense,x.investment]}});t(44,'monthly regression',months.every(x=>x.ok),months);
const ids=(S.transactions||[]).map(x=>x.id).filter(Boolean),unique=new Set(ids);const c=S.cards.find(x=>x.id==='card_caju_alimentacao');t(45,'data integrity',unique.size===ids.length&&!S.accounts.some(a=>/nubank|btg/i.test(a.name||''))&&c?.excludeFromPatrimony===true);
const math=E.projection(S,'2026-10',12);t(48,'mathematical cross-validation',math.length===12&&math.every(x=>near(x.patrimony,x.liquid+x.invest)),math);
}
const clickable=[...document.querySelectorAll('[data-v10-route]')];t(46,'UI interaction contracts',clickable.length>=4&&clickable.every(x=>x.tabIndex>=0),clickable.length);
t(47,'desktop/mobile responsive contracts',!!document.getElementById('v10BottomNav')&&!!document.querySelector('.v10-theme-switch'));
const diag=window.V10Diagnostics?.run?.(),health=window.HealthV10?.audit?.();t(49,'internal diagnostics',diag?.ok&&health?.ok,{diag,health});
const legacyWriters=[...document.scripts].filter(s=>/r(67|68|69|70|75|80|91)-/.test(s.src));t(50,'source-first V10 runtime',legacyWriters.length===0,legacyWriters.map(s=>s.src));
const out={ok:R.every(x=>x.ok),passed:R.filter(x=>x.ok).length,total:R.length,results:R,at:new Date().toISOString()};window.__V10_40_50__=out;return out}
window.Acceptance40to50V10={run};window.addEventListener('load',()=>setTimeout(run,250));})();