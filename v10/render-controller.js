/* V10 Render Controller — authoritative, one RAF per state/UI change */
(()=>{'use strict';let raf=0,pending=new Set(),running=false,last=0,count=0;
function perform(){raf=0;if(running)return;running=true;const reasons=[...pending];pending.clear();try{
 const ui=window.RuntimeUIV10;if(ui){ui.renderKpis?.();ui.renderCategory?.();ui.renderProjection?.()}
 else {try{window.renderKpis?.()}catch(_){} try{window.renderLists?.()}catch(_){} try{window.renderCommitments?.()}catch(_){} try{window.renderCalendar?.()}catch(_){} try{window.renderInvestment?.()}catch(_){} try{window.renderCharts?.()}catch(_){}}
 last=performance.now();count++;window.dispatchEvent(new CustomEvent('v10-render-complete',{detail:{reasons,count}}));
}finally{running=false;if(pending.size)schedule('queued')}}
function schedule(reason='update'){pending.add(reason);if(running)return;if(!raf)raf=requestAnimationFrame(perform)}
function stats(){return{count,last,pending:[...pending],running}}
window.RenderControllerV10={schedule,perform,stats};
document.addEventListener('finance-store-changed',()=>schedule('store'));
window.addEventListener('resize',()=>schedule('resize'),{passive:true});
})();