/* V10 Experience — items 21-30 integration */
(()=>{'use strict';
const E=()=>window.FinanceEngineV10,S=()=>window.FinanceStoreV10?.get(),key=v=>String(v||'').slice(0,7),abs=v=>Math.abs(Number(v)||0);
function month(){return window.activeMonth||new Date().toISOString().slice(0,7)}
/* 21 interactive charts: canonical category click opens existing detail UI */
function bindCharts(){document.querySelectorAll('#categoryLegend .legend-line,[data-canonical-category]').forEach(el=>{el.tabIndex=0;const go=()=>{const name=el.dataset.canonicalCategory||el.textContent?.trim().split(/R\$/)[0]?.trim();if(name&&typeof openCategoryDetail==='function')openCategoryDetail(name)};el.onclick=go;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')go()}})}
/* 22 agenda derives from the same store/recurrence rules */
function agendaEvents(k=month()){const s=S();if(!s||!E())return[];const events=[];(s.transactions||[]).filter(t=>key(t.date)===k).forEach(t=>events.push({date:t.date,type:t.transfer?'investment':'transaction',title:t.desc||t.description||'Lançamento',value:Number(t.value)||0,status:t.status,id:t.id}));E().recurringFor(s,k).forEach(r=>events.push({date:k+'-'+String(r.dueDay||r.due||10).padStart(2,'0'),type:'recurring',title:r.desc||r.description||'Compromisso',value:-abs(r.value),status:'planned',id:r.id}));return events.sort((a,b)=>a.date.localeCompare(b.date))}
/* 23 explicit reconciliation, never silently changes values */
function reconcile(k=month()){const s=S();if(!s)return{month:k,cases:[],unclassified:0};const tx=(s.transactions||[]).filter(t=>key(t.date)===k),cases=[];tx.filter(t=>t.classificationPending).forEach(t=>cases.push({id:t.id,type:'classification',status:'pending',description:t.desc,value:t.value}));const seen=new Map();tx.forEach(t=>{const sig=[t.date,t.value,t.desc,t.accountId||t.cardId||''].join('|');if(seen.has(sig))cases.push({id:t.id,type:'possible-duplicate',status:'review',matches:seen.get(sig),description:t.desc,value:t.value});else seen.set(sig,t.id)});return{month:k,cases,unclassified:cases.filter(x=>x.type==='classification').length}}
/* 24 Caju is benefit spending: expense yes, patrimony/cash no */
function cajuStatus(){const s=S();if(!s)return null;const c=(s.cards||[]).find(x=>x.id==='card_caju_alimentacao');const spent=(s.transactions||[]).filter(t=>t.cardId==='card_caju_alimentacao'&&Number(t.value)<0&&/posted|realized|confirm/i.test(String(t.status))).reduce((a,t)=>a+abs(t.value),0);return c?{limit:Number(c.limit)||0,balance:Number(c.balance)||0,spent,excludeFromPatrimony:c.excludeFromPatrimony===true}:null}
/* 29 desktop/mobile share Store + Engine; only presentation changes */
function architecture(){return{store:!!window.FinanceStoreV10,engine:!!window.FinanceEngineV10,mobile:!!window.MobileDashboardV10,desktopUsesSameState:window.db===window.FinanceStoreV10?.get()}}
function refresh(){bindCharts();window.V10AgendaEvents=agendaEvents(month());window.V10Reconciliation=reconcile(month());window.V10Caju=cajuStatus()}
function install(){refresh();document.addEventListener('v10-render-complete',refresh);document.addEventListener('finance-store-changed',()=>window.RenderControllerV10?.schedule('experience'))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
window.ExperienceV10={bindCharts,agendaEvents,reconcile,cajuStatus,architecture,refresh};
})();