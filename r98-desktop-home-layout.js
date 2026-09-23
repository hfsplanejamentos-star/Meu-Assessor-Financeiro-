/* R9.8 Desktop home layout — bancos/cartoes em linha exclusiva; KPIs em linha seguinte. Mobile preservado. */
(()=>{'use strict';
const DESKTOP='(min-width:821px)';
const BANK_IDS=new Set(['c6account','caju','itauaccount','xpaccount','creditcard']);
let busy=false,queued=false;
function ensureStyle(){
 if(document.getElementById('r98DesktopHomeStyle'))return;
 const s=document.createElement('style');s.id='r98DesktopHomeStyle';s.textContent=`
 @media(min-width:821px){
   #view-overview #kpis.grid-kpi{display:block!important}
   #view-overview #kpis .r98-bank-row{display:grid!important;grid-template-columns:repeat(var(--r98-bank-count,5),minmax(0,1fr))!important;gap:12px!important;align-items:stretch!important;margin-bottom:12px!important}
   #view-overview #kpis .r98-summary-row{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:12px!important;align-items:stretch!important}
   #view-overview #kpis .r98-bank-row>.brand-fin-card{width:100%!important;min-width:0!important;height:100%!important;min-height:220px!important}
   #view-overview #kpis .r98-summary-row>.kpi{width:100%!important;min-width:0!important}
   #view-overview #kpis .brand-detail-btn{background:rgba(5,14,27,.72)!important;color:#eef7ff!important;border:1px solid rgba(92,196,255,.34)!important;border-radius:12px!important;padding:8px 12px!important;box-shadow:none!important}
   #view-overview #kpis .brand-detail-btn:hover{background:rgba(20,48,76,.88)!important;border-color:rgba(32,216,255,.62)!important}
   #view-overview .dashboard{grid-auto-flow:row dense!important;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr) minmax(0,.85fr)!important;min-width:0!important}
   #view-overview .dashboard>*{min-width:0!important;max-width:100%!important}
   #view-overview .dashboard .panel-head{min-width:0!important;flex-wrap:wrap!important}
   #view-overview .dashboard .panel-head>*{min-width:0!important;max-width:100%!important}
   #view-overview #kpis .brand-fin-card{overflow:hidden!important}
   #view-overview #kpis .brand-fin-card>*{min-width:0!important;max-width:100%!important}
   #view-overview #kpis .brand-stats{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:6px!important}
   #view-overview #kpis .brand-stats strong{font-size:clamp(16px,1.45vw,20px)!important;white-space:nowrap!important}
   #view-overview #kpis [data-kpi-id="caju"] .brand-stats{grid-template-columns:1fr!important;gap:8px!important}
   #view-overview #kpis [data-kpi-id="caju"] .brand-stats>div{display:flex!important;align-items:baseline!important;justify-content:space-between!important;gap:8px!important}
   #view-overview #kpis .brand-foot{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:8px!important}
 }
 @media(min-width:821px) and (max-width:1180px){
   #view-overview #kpis .r98-summary-row{grid-template-columns:repeat(3,minmax(0,1fr))!important}
 }
 `;document.head.appendChild(s);
}
function arrange(){
 if(busy||!matchMedia(DESKTOP).matches)return;
 const box=document.getElementById('kpis');if(!box)return;
 busy=true;
 try{
   ensureStyle();
   let bank=box.querySelector(':scope > .r98-bank-row'),summary=box.querySelector(':scope > .r98-summary-row');
   if(!bank){bank=document.createElement('div');bank.className='r98-bank-row'}
   if(!summary){summary=document.createElement('div');summary.className='r98-summary-row'}
   const loose=[...box.children].filter(el=>el!==bank&&el!==summary);
   loose.forEach(el=>{
     const id=el.dataset?.kpiId||'';
     if(BANK_IDS.has(id))bank.appendChild(el);else summary.appendChild(el);
   });
   if(bank.parentElement!==box)box.prepend(bank);
   if(summary.parentElement!==box)box.appendChild(summary);
   const visibleBanks=[...bank.children].filter(el=>getComputedStyle(el).display!=='none'&&!el.classList.contains('dashboard-hidden'));
   bank.style.setProperty('--r98-bank-count',String(Math.max(1,visibleBanks.length)));
   bank.style.display=visibleBanks.length?'grid':'none';
   const visibleSummary=[...summary.children].filter(el=>getComputedStyle(el).display!=='none'&&!el.classList.contains('dashboard-hidden'));
   summary.style.display=visibleSummary.length?'grid':'none';
 }finally{busy=false}
}
function restoreMobile(){
 const box=document.getElementById('kpis');if(!box)return;
 const bank=box.querySelector(':scope > .r98-bank-row'),summary=box.querySelector(':scope > .r98-summary-row');
 if(!bank&&!summary)return;
 busy=true;
 try{[...(bank?.children||[]),...(summary?.children||[])].forEach(el=>box.appendChild(el));bank?.remove();summary?.remove();}finally{busy=false}
}
function schedule(){if(queued||busy)return;queued=true;requestAnimationFrame(()=>{queued=false;matchMedia(DESKTOP).matches?arrange():restoreMobile()})}
function init(){ensureStyle();schedule();const box=document.getElementById('kpis');if(box)new MutationObserver(schedule).observe(box,{childList:true,subtree:false,attributes:true,attributeFilter:['class','style']});window.addEventListener('resize',schedule,{passive:true});document.addEventListener('finance-data-changed',schedule);document.addEventListener('change',e=>{if(e.target.closest?.('.customize-list'))setTimeout(schedule,0)},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.FinanceDesktopHomeLayout={refresh:arrange};
})();