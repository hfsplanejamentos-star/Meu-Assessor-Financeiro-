/* R9.6 - Detalhamento de categorias por subcategoria e valor */
(()=>{
 const num=v=>Number(v)||0,abs=v=>Math.abs(num(v));
 const key=t=>String(t?.date||'').slice(0,7);
 const planned=s=>['planned','pending','forecast','prevista','previsto','planejada','planejado'].includes(String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
 const money=v=>typeof window.brl==='function'?window.brl(v):v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 function details(category){
  const month=window.activeMonth||new Date().toISOString().slice(0,7),now=new Date().toISOString().slice(0,7),future=month>now,rows=[];
  (window.db?.transactions||[]).filter(t=>key(t)===month&&num(t.value)<0&&!t.transfer&&!t.excludeFromExpense&&String(t.cat||'Outros')===category&&(future?true:!planned(t.status))).forEach(t=>rows.push({sub:t.sub||t.subcategory||t.desc||'Sem subcategoria',desc:t.desc||t.description||'',value:abs(t.value)}));
  if(future)(window.db?.recurring||[]).filter(r=>r.active!==false&&String(r.cat||'Outros')===category).forEach(r=>rows.push({sub:r.sub||r.subcategory||r.name||r.desc||'Recorrente',desc:r.name||r.desc||'',value:abs(r.value)}));
  const grouped={};rows.forEach(r=>{const k=r.sub||'Sem subcategoria';(grouped[k]??={value:0,items:[]}).value+=r.value;grouped[k].items.push(r)});
  let modal=document.getElementById('categoryDetailModal');
  if(!modal){modal=document.createElement('div');modal.id='categoryDetailModal';modal.className='modal';modal.innerHTML='<div class="modal-card"><div class="modal-head"><h3 id="categoryDetailTitle"></h3><button class="close" type="button">×</button></div><div id="categoryDetailBody"></div></div>';document.body.appendChild(modal);modal.querySelector('.close').onclick=()=>modal.classList.remove('open');modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')}}
  document.getElementById('categoryDetailTitle').textContent=category+' · '+month;
  const body=document.getElementById('categoryDetailBody'),entries=Object.entries(grouped).sort((a,b)=>b[1].value-a[1].value);
  body.innerHTML=entries.length?entries.map(([sub,g])=>'<div class="detail-row"><span>'+sub+'</span><b>'+money(g.value)+'</b></div>').join('')+'<div class="detail-row" style="margin-top:8px"><span><b>Total</b></span><b>'+money(entries.reduce((s,[,g])=>s+g.value,0))+'</b></div>':'<div class="notice">Sem lançamentos nesta categoria para o mês selecionado.</div>';
  modal.classList.add('open');
 }
 window.openCategoryDetail=details;
})();
