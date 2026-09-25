/* R9.2.1 — mês vigente no início e restauração estável local/Cloud */
(()=>{'use strict';
const root=document.documentElement,start=Date.now(),minimum=1700,maximum=8000;
/* Toda nova abertura começa no mês vigente. A navegação manual permanece livre depois disso. */
try{
 const d=new Date(),key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
 activeMonth=key;MONTH_SCOPES.forEach(scope=>monthScopes[scope]=key);
 localStorage.setItem('assessor_active_month',key);
 localStorage.setItem('assessor_month_scopes',JSON.stringify(monthScopes));
}catch(_){}
let cloudSettled=!localStorage.getItem('assessor_cloud_sync_key'),released=false;
function release(){
 if(released)return;
 const wait=Math.max(0,minimum-(Date.now()-start));
 if(wait){setTimeout(release,wait);return}
 released=true;
 try{if(typeof renderAll==='function')renderAll()}catch(_){}
 root.classList.remove('finance-booting');root.classList.add('finance-ready');
 document.dispatchEvent(new CustomEvent('finance-startup-ready'));
}
document.addEventListener('finance-cloud-status',e=>{
 const text=String(e.detail?.text||''),state=String(e.detail?.state||'');
 if(state==='ok'||/Sincronizado|Conectado/.test(text)){cloudSettled=true;setTimeout(release,280)}
});
setTimeout(()=>{if(cloudSettled)release()},minimum);
setTimeout(release,maximum);
})();
