/* R10.0 — estabilidade do desktop e próximos compromissos */
(()=>{'use strict';
 const brlValue=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 function nextCommitments(){
  const box=document.getElementById('commitments');if(!box||typeof db!=='object')return;
  const now=new Date();now.setHours(12,0,0,0);
  const days=Number(document.getElementById('commitDays')?.value||7),end=new Date(now.getTime()+days*86400000),candidates=[];
  (db.recurring||[]).filter(r=>r.active!==false).forEach(r=>{
   const start=String(r.startDate||'').slice(0,10),finish=String(r.endDate||'').slice(0,10),due=Number(r.dueDay||r.due||10);
   for(let i=0;i<14;i++){
    const d=new Date(now.getFullYear(),now.getMonth()+i,Math.min(due,new Date(now.getFullYear(),now.getMonth()+i+1,0).getDate()),12);
    const iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    if(d>=now&&(!start||iso>=start)&&(!finish||iso<=finish)){candidates.push({...r,next:d});break}
   }
  });
  candidates.sort((a,b)=>a.next-b.next);let rows=candidates.filter(r=>r.next<=end),extended=false;
  if(!rows.length&&candidates.length){const first=candidates[0].next.toISOString().slice(0,10);rows=candidates.filter(r=>r.next.toISOString().slice(0,10)===first);extended=true}
  box.innerHTML=rows.length?(extended?'<div class="notice" style="margin-bottom:8px">Próximo vencimento após o período selecionado.</div>':'')+rows.map(r=>`<div class="item"><div class="ico">⟳</div><div><b>${r.desc||r.description||'Compromisso'}</b><small>${r.next.toLocaleDateString('pt-BR')} · dia ${String(r.dueDay||r.due||10).padStart(2,'0')}</small></div><div class="amount">${brlValue(-Math.abs(Number(r.value)||0))}</div></div>`).join(''):'<div class="notice">Nenhum compromisso futuro cadastrado.</div>';
 }
 function showBlock(){
  try{const saved=JSON.parse(localStorage.getItem('assessor_home_layout')||'[]');if(Array.isArray(saved)){const item=saved.find(x=>x?.id==='commitments');if(item&&item.visible===false){item.visible=true;localStorage.setItem('assessor_home_layout',JSON.stringify(saved))}}}catch(_){}
  document.querySelector('[data-home-block="commitments"]')?.classList.remove('dashboard-hidden');
 }
 function install(){window.renderCommitments=nextCommitments;showBlock();nextCommitments();const select=document.getElementById('commitDays');if(select)select.onchange=nextCommitments}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
 document.addEventListener('finance-startup-ready',install);
 document.addEventListener('finance-data-changed',()=>setTimeout(nextCommitments,50));
 window.FinanceDesktopStability={refresh:install,nextCommitments};
})();
