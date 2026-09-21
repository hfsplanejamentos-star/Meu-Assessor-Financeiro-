/* R9.7 - integridade, sincronizacao e testes da Versao Atual */
(()=>{'use strict';
 const n=v=>Number(v)||0, ym=v=>String(v||'').slice(0,7);
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 function activeRecurring(r,m){const st=ym(r.startDate),en=ym(r.endDate);return r.active!==false&&(!st||m>=st)&&(!en||m<=en)}
 function migrate(){
  let changed=false;
  (db.recurring||[]).forEach(r=>{
   if(String(r.id)==='rec_pensao'||/pensao alimenticia|^pensao$/.test(norm(r.desc||r.description))){if(r.cat!=='Pensão'){r.cat='Pensão';r.desc='Pensão';r.description='Pensão';changed=true}}\n   if(String(r.id)==='rec_emp_mae'&&r.cat!=='Móveis'){r.cat='Móveis';r.desc='Móveis';r.description='Móveis';changed=true}\n   if((String(r.id)==='rec_tim'||(/plano tim/.test(norm(r.desc||r.description))&&Math.abs(n(r.value))===79.9))&&r.cat!=='Plano TIM'){r.cat='Plano TIM';r.desc='Plano TIM';r.description='Plano TIM';changed=true}
   if(String(r.id)==='rec_carro'||/prestacao do carro/.test(norm(r.desc||r.description))){if(r.cat!=='C4 Cactus'){r.cat='C4 Cactus';changed=true}}
  });
  if(changed)try{save()}catch(_){}
  return changed;
 }
 function expenseRows(m){
  const current=new Date().toISOString().slice(0,7),rows=[];
  (db.transactions||[]).forEach(t=>{if(ym(t.date)!==m||n(t.value)>=0||t.transfer||t.excludeFromExpense)return;if(m<current&&t.status==='planned')return;rows.push({kind:'transaction',cat:t.cat||'Outros',sub:t.sub||t.subcategory||t.desc||'Sem subcategoria',value:Math.abs(n(t.value)),id:t.id})});
  if(m>=current)(db.recurring||[]).filter(r=>activeRecurring(r,m)).forEach(r=>rows.push({kind:'recurring',cat:r.cat||'Outros',sub:r.sub||r.subcategory||r.desc||r.description||'Recorrente',value:Math.abs(n(r.value)),id:r.id}));
  return rows;
 }
 function selectedMonth(){
  const s=document.querySelector('[data-month-scope="category"]');return s?.value||window.activeMonth||localStorage.getItem('assessor_active_month')||new Date().toISOString().slice(0,7);
 }
 function open(category){
  const m=selectedMonth(),rows=expenseRows(m).filter(x=>x.cat===category),g={};rows.forEach(x=>{g[x.sub]=(g[x.sub]||0)+x.value});
  let modal=document.getElementById('categoryDetailModal');if(!modal){modal=document.createElement('div');modal.id='categoryDetailModal';modal.className='modal';modal.innerHTML='<div class="modal-card"><div class="modal-head"><h3 id="categoryDetailTitle"></h3><button class="close">×</button></div><div id="categoryDetailBody"></div></div>';document.body.appendChild(modal);modal.querySelector('.close').onclick=()=>modal.classList.remove('open')}
  document.getElementById('categoryDetailTitle').textContent='Categoria · '+category;
  const entries=Object.entries(g).sort((a,b)=>b[1]-a[1]),total=entries.reduce((s,[,v])=>s+v,0);
  document.getElementById('categoryDetailBody').innerHTML='<div class="detail-row"><span>Mês</span><b>'+m+'</b></div>'+entries.map(([k,v])=>'<div class="detail-row"><span>'+k+'</span><b>'+brl(v)+'</b></div>').join('')+'<div class="detail-row"><span><b>Total</b></span><b>'+brl(total)+'</b></div>';
  modal.classList.add('open');
 }
 function audit(m=selectedMonth()){
  migrate();const rows=expenseRows(m),by={};rows.forEach(x=>by[x.cat]=(by[x.cat]||0)+x.value);
  const rec=(db.recurring||[]),tests=[
   ['Pensão categorizada',rec.some(r=>r.id==='rec_pensao'&&r.cat==='Pensão'&&Math.abs(n(r.value))===1500)],
   ['C4 Cactus categorizado',rec.some(r=>r.id==='rec_carro'&&r.cat==='C4 Cactus'&&Math.abs(n(r.value))===1000)],
   ['Moradia relacionada',rec.filter(r=>activeRecurring(r,m)&&r.cat==='Moradia').every(r=>Math.abs(n(r.value))>0)],
   ['Mês sincronizado',m===selectedMonth()],
   ['IDs de recorrência únicos',new Set(rec.map(r=>r.id)).size===rec.length]
  ];
  const result={month:m,expenseTotal:rows.reduce((s,x)=>s+x.value,0),categories:by,tests,passed:tests.filter(x=>x[1]).length,total:tests.length,timestamp:new Date().toISOString()};
  window.__FINANCE_STATUS__=result;localStorage.setItem('assessor_integrity_status',JSON.stringify(result));return result;
 }
 window.openCategoryDetail=open;window.FinanceIntegrity={audit,expenseRows,selectedMonth,migrate};
 document.addEventListener('finance-data-changed',()=>setTimeout(()=>audit(),50));
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(audit,700));else setTimeout(audit,700);
})();