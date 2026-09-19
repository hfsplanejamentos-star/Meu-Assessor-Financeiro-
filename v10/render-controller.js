/* V10 Render Controller — single batched render path */
(()=>{'use strict';
 let raf=0,pending=new Set(),running=false,last=0,count=0;
 function perform(){
   raf=0;if(running)return;running=true;const reasons=[...pending];pending.clear();
   try{
     if(typeof renderKpis==='function')renderKpis();
     if(typeof renderLists==='function')renderLists();
     if(typeof renderCommitments==='function')renderCommitments();
     if(typeof renderCalendar==='function')renderCalendar();
     if(typeof renderInvestment==='function')renderInvestment();
     if(typeof renderCardDashboard==='function')renderCardDashboard();
     if(typeof renderInvoiceManagement==='function')renderInvoiceManagement();
     if(typeof renderAudit==='function')renderAudit();
     if(typeof renderAlerts==='function')renderAlerts();
     if(typeof renderBudgetsGoals==='function')renderBudgetsGoals();
     if(typeof renderCharts==='function')renderCharts();
     if(typeof renderReconciliation==='function')renderReconciliation();
     if(typeof FinanceCanonical?.renderCanonicalExpenseChart==='function')FinanceCanonical.renderCanonicalExpenseChart();
     last=performance.now();count++;
     window.dispatchEvent(new CustomEvent('v10-render-complete',{detail:{reasons,count}}));
   }finally{running=false;if(pending.size)schedule('queued')}
 }
 function schedule(reason='update'){pending.add(reason);if(!raf)raf=requestAnimationFrame(perform)}
 function stats(){return{count,last,pending:[...pending],running}}
 window.RenderControllerV10={schedule,perform,stats};
 document.addEventListener('finance-data-changed',()=>schedule('data'));
 document.addEventListener('finance-cloud-status',e=>{if(/Sincronizado|Conectado|Desktop enviado/.test(String(e.detail?.text||'')))schedule('cloud')});
 window.addEventListener('resize',()=>schedule('resize'),{passive:true});
})();