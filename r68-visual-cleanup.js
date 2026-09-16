/* Meu Assessor Financeiro — R6.8 visual cleanup */
(()=>{'use strict';
const DEV=/\b(simula[cç][aã]o|fase\s*1|r6\.?\d*|v1\.\d+|popups? edit[aá]veis|dados fict[ií]cios)\b/i;
const mobileClean=new URLSearchParams(location.search).get('mobile')==='clean';
function addMobileClean(){
 if(!mobileClean||document.getElementById('r68NativeMobileClean'))return;
 document.documentElement.classList.add('r68-mobile-clean');
 const s=document.createElement('style');s.id='r68NativeMobileClean';s.textContent=`
 @media(max-width:820px){
  html,body{width:100%!important;max-width:100%!important;overflow-x:hidden!important;overscroll-behavior-y:auto!important;scroll-behavior:auto!important}
  body{touch-action:pan-y!important;-webkit-overflow-scrolling:touch!important}
  .sim-badge,.sidefoot,.badge-card,#realModeFab,footer{display:none!important}
  .main{padding:8px 8px calc(94px + env(safe-area-inset-bottom))!important;overflow:visible!important}
  .grid-kpi{grid-template-columns:1fr 1fr!important;gap:7px!important}
  .kpi{min-height:92px!important;padding:11px!important;border-radius:15px!important}
  .kpi .label{font-size:10px!important}.kpi .value{font-size:18px!important}
  .dashboard{display:grid!important;grid-template-columns:1fr!important;gap:9px!important;margin-top:9px!important}
  .panel{padding:12px!important}.card{border-radius:16px!important}
  .chart-wrap{height:210px!important}.quick{grid-template-columns:repeat(2,1fr)!important}
  .sidebar{height:100dvh!important;overflow-y:auto!important}.fab-wrap{bottom:calc(16px + env(safe-area-inset-bottom))!important}
 }
 `;document.head.appendChild(s);
}
function clean(){
 document.title='Meu Assessor Financeiro IA';addMobileClean();
 document.querySelectorAll('.sim-badge').forEach(el=>el.remove());
 document.querySelectorAll('.sidefoot .badge-card,.sidefoot small,.sidefoot .tag').forEach(el=>{if(DEV.test(el.textContent||''))el.remove();});
 document.querySelectorAll('.tag').forEach(el=>{if(/^R\d/i.test((el.textContent||'').trim()))el.style.display='none';});
 document.querySelectorAll('footer').forEach(el=>{const t=(el.textContent||'').trim();if(!t||DEV.test(t))el.style.display='none';});
 document.querySelectorAll('small,p,span,div').forEach(el=>{if(el.children.length)return;const t=(el.textContent||'').trim();if(t.length<120&&/SIMULAÇÃO R6|POPUPS EDITÁVEIS|Fase 1 v/i.test(t))el.style.display='none';});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(clean,150));else setTimeout(clean,150);
window.FinanceVisualCleanup={refresh:clean};
})();