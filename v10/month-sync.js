/* V10 Item 19 — synchronized month filters */
(()=>{'use strict';let lock=false;
const valid=v=>/^\d{4}-\d{2}$/.test(String(v||''));
function filters(){return[...document.querySelectorAll('.month-filter, #globalMonthFilter, [data-month-scope]')].filter((x,i,a)=>x.tagName==='SELECT'&&a.indexOf(x)===i)}
function apply(k,source){if(lock||!valid(k))return;lock=true;try{
 window.activeMonth=k;
 filters().forEach(s=>{if(s!==source&&[...s.options].some(o=>o.value===k))s.value=k;s.disabled=false;s.style.pointerEvents='auto'});
 try{if(typeof window.setActiveMonth==='function'&&source?.id!=='globalMonthFilter')window.setActiveMonth(k)}catch(_){}
 window.RenderControllerV10?.schedule('month:'+k);
 document.dispatchEvent(new CustomEvent('v10-month-changed',{detail:{month:k}}));
 }finally{queueMicrotask(()=>lock=false)}}
function bind(){filters().forEach(s=>{if(s.dataset.v10MonthBound==='1')return;s.dataset.v10MonthBound='1';s.addEventListener('change',e=>apply(e.currentTarget.value,e.currentTarget))});if(valid(window.activeMonth))apply(window.activeMonth)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
document.addEventListener('finance-store-changed',bind);
window.MonthSyncV10={bind,apply,filters};
})();