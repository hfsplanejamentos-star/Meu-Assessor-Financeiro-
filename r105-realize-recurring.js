/* R105 — efetivar recorrências previstas sem duplicar o lançamento mensal. */
(()=>{'use strict';
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const ym=s=>String(s||'').slice(0,7), amount=r=>Math.abs(Number(r?.value)||0);
 const selectedMonth=()=>document.querySelector('[data-month-scope="category"]')?.value||window.activeMonth||localStorage.getItem('assessor_active_month')||new Date().toISOString().slice(0,7);
 const monthOf=t=>(t.card||t.cardId)?(t.invoiceMonth||ym(t.date)):ym(t.date);
 const txRows=()=>typeof db!=='undefined'?(db.transactions||[]):[],recRows=()=>typeof db!=='undefined'?(db.recurring||[]):[];
 const expenseRows=m=>{
  const current=new Date().toISOString().slice(0,7),rows=[],direct=[];
  txRows().forEach(t=>{if(monthOf(t)!==m||Number(t.value)>=0||t.transfer||t.transferId||t.excludeFromExpense||t.invoicePayment||t.cardPayment||t.kind==='invoice_payment'||t.kind==='transfer'||norm(t.status)==='cancelled')return;
   const planned=['planned','planejada','planejado','prevista','previsto'].includes(norm(t.status));if(m<current&&planned)return;
   const row={kind:'transaction',cat:t.cat||'Outros',sub:t.sub||t.subcategory||t.desc||t.description||'Sem subcategoria',value:Math.abs(Number(t.value)||0),id:t.id,recurringId:t.recurringId||null,desc:t.desc||t.description||'',status:t.status};direct.push(t);rows.push(row)
  });
  if(m>=current)recRows().filter(r=>r.active!==false&&(!ym(r.startDate)||m>=ym(r.startDate))&&(!ym(r.endDate)||m<=ym(r.endDate))).forEach(r=>{
   const name=norm(r.name||r.desc||r.description),value=amount(r),duplicate=direct.some(t=>(r.id&&String(t.recurringId||'')===String(r.id))||(name&&norm(t.desc||t.description)===name&&Math.abs(Math.abs(Number(t.value)||0)-value)<.02));
   if(!duplicate)rows.push({kind:'recurring',cat:r.cat||'Outros',sub:r.sub||r.subcategory||r.desc||r.description||'Recorrente',value,id:r.id,desc:r.desc||r.name||r.description||''})
  });return rows;
 };
 const findOccurrence=(r,m)=>txRows().find(t=>monthOf(t)===m&&(
   (String(t.recurringId||'')===String(r.id))||
   (!t.recurringId&&norm(t.desc||t.description)===norm(r.desc||r.name||r.description)&&Math.abs(amount(t)-amount(r))<.02)
 ));
 const dayInMonth=(m,d)=>{const [y,mo]=m.split('-').map(Number);return Math.min(Math.max(Number(d)||1,1),new Date(y,mo,0).getDate())};
 function prepareEntry(r,m){
  const prior=findOccurrence(r,m);
  if(prior){
   if(['realized','real','realizada','realizado','paid','pago','confirmada','confirmado'].includes(norm(prior.status))){alert('Esta despesa já consta como realizada neste mês.');return}
   if(typeof window.openEditTransaction==='function'){window.openEditTransaction(prior.id);const status=document.getElementById('editStatus');if(status)status.value='realized';return}
  }
  if(typeof window.openModal!=='function')return;
  window.__ASSESSOR_REALIZING_RECURRING__={id:r.id,month:m};
  window.openModal('expense');
  const set=(id,v)=>{const e=document.getElementById(id);if(e&&v!=null)e.value=String(v)};
  set('fType','expense');set('fDate',`${m}-${String(dayInMonth(m,r.due||r.day||r.dueDay)).padStart(2,'0')}`);
  set('fDesc',r.desc||r.name||r.description||'Despesa recorrente');set('fValue',amount(r).toFixed(2));
  set('fCategory',r.cat||r.category||'Outros');set('fSub',r.sub||r.subcategory||'');set('fStatus','realized');
  set('fInstallments','1');set('fInstallmentNo','1');set('fInstallmentMode','single');set('fFrequency','');
  const account=r.accountId||r.account||r.paymentAccount,card=r.cardId||r.card;
  if(account&&[...document.getElementById('fAccount').options].some(o=>o.value===String(account)))set('fAccount',account);
  if(card&&[...document.getElementById('fCard').options].some(o=>o.value===String(card)))set('fCard',card);
  const title=document.getElementById('modalTitle');if(title)title.textContent='Efetivar despesa recorrente';
  const form=document.getElementById('entryForm'),notice=document.getElementById('recurringRealizeNotice');
  if(form&&!notice){const n=document.createElement('div');n.id='recurringRealizeNotice';n.className='notice';n.style.margin='0 0 12px';n.textContent='Confira a conta ou cartão do pagamento. Ao salvar como realizada, o saldo e os gráficos serão atualizados.';form.prepend(n)}
 }
 function addRowButtons(){
  document.querySelectorAll('.recurring-card[data-detail-id]').forEach(row=>{
   if(row.querySelector('[data-realize-recurring]'))return;
   const actions=row.querySelector('.recurring-actions');if(!actions)return;
   const b=document.createElement('button');b.type='button';b.className='secondary';b.dataset.realizeRecurring=row.dataset.detailId;b.textContent='Efetivar';actions.prepend(b);
  });
  const actions=document.querySelector('#recurringEditForm .edit-actions');
  if(actions&&!actions.querySelector('[data-realize-current-recurring]')){
   const b=document.createElement('button');b.type='button';b.className='secondary';b.dataset.realizeCurrentRecurring='1';b.textContent='Efetivar neste mês';
   const cancel=actions.querySelector('#cancelRecurringEdit');actions.insertBefore(b,cancel||actions.firstChild);
  }
 }
 function ensureCategoryModal(){
  let modal=document.getElementById('categoryDetailModal');if(modal)return modal;
  modal=document.createElement('div');modal.id='categoryDetailModal';modal.className='modal';modal.innerHTML='<div class="modal-card"><div class="modal-head"><h3 id="categoryDetailTitle"></h3><button type="button" class="close" aria-label="Fechar">×</button></div><div id="categoryDetailBody"></div></div>';document.body.appendChild(modal);
  modal.querySelector('.close').onclick=()=>modal.classList.remove('open');modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')};return modal;
 }
 function openCategory(name){
  const m=selectedMonth(),rows=(window.FinanceDataModel?.expenseRows?.(m)||expenseRows(m)).filter(x=>x.cat===name);
  const body=ensureCategoryModal().querySelector('#categoryDetailBody');
  const total=rows.reduce((s,x)=>s+amount(x),0);let html='<div class="detail-row"><span>Mês · '+m+'</span><b>Total previsto/real · '+(typeof brl==='function'?brl(total):total.toFixed(2))+'</b></div>';
  if(!rows.length)html+='<div class="notice">Nenhuma despesa nesta categoria.</div>';
  rows.forEach(row=>{
   const recurring=row.kind==='recurring'?recRows().find(x=>String(x.id)===String(row.id)):null;
   const tx=row.kind==='transaction'?txRows().find(x=>String(x.id)===String(row.id)):null;
   const isPlanned=!!recurring||!!tx&&['planned','planejada','planejado','prevista','previsto'].includes(norm(tx.status));
   const desc=row.desc||row.sub||recurring?.desc||tx?.desc||'Despesa';
   const state=isPlanned?'Prevista':'Realizada';
   html+=`<div class="item category-realize-row"><div class="ico">${typeof iconFor==='function'?iconFor(row.cat,row.sub):'•'}</div><div><b>${desc}</b><small>${row.sub||row.cat||'Despesa'} · ${state}</small></div><div class="amount down">${typeof brl==='function'?brl(-amount(row)):amount(row).toFixed(2)}${isPlanned?`<button type="button" class="secondary" data-realize-category="${String(row.id).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" data-row-kind="${recurring?'recurring':'transaction'}">Efetivar</button>`:''}</div></div>`;
  });
  body.innerHTML=html;const modal=ensureCategoryModal();modal.querySelector('#categoryDetailTitle').textContent='Despesas · '+name;modal.classList.add('open');
 }
 function openPlannedDetail(){
  const m=selectedMonth(),all=(window.FinanceDataModel?.expenseRows?.(m)||expenseRows(m)),rows=all.filter(row=>{
   if(row.kind==='recurring')return true;
   const t=txRows().find(x=>String(x.id)===String(row.id));return !!t&&['planned','planejada','planejado','prevista','previsto'].includes(norm(t.status));
  });
  let modal=document.getElementById('plannedExpenseDetailModal');
  if(!modal){modal=document.createElement('div');modal.id='plannedExpenseDetailModal';modal.className='modal';modal.innerHTML='<div class="modal-card"><div class="modal-head"><h3 id="plannedExpenseDetailTitle"></h3><button type="button" class="close" aria-label="Fechar">×</button></div><div id="plannedExpenseDetailBody"></div></div>';document.body.appendChild(modal);modal.querySelector('.close').onclick=()=>modal.classList.remove('open');modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')}}
  const body=modal.querySelector('#plannedExpenseDetailBody'),total=rows.reduce((s,r)=>s+amount(r),0);
  let html=`<div class="detail-row"><span>Total previsto</span><b>${typeof brl==='function'?brl(total):total.toFixed(2)}</b></div>`;
  if(!rows.length)html+='<div class="notice">Não há despesas previstas neste mês.</div>';
  rows.forEach(row=>{const recurring=row.kind==='recurring'?recRows().find(r=>String(r.id)===String(row.id)):null,t=recurring?null:txRows().find(x=>String(x.id)===String(row.id)),desc=row.desc||recurring?.desc||t?.desc||t?.description||row.sub||'Despesa prevista';
   html+=`<div class="item category-realize-row"><div class="ico">${typeof iconFor==='function'?iconFor(row.cat,row.sub):'•'}</div><div><b>${desc}</b><small>${row.cat||'Despesa'} · ${row.sub||'Prevista'} · Prevista</small></div><div class="amount down">${typeof brl==='function'?brl(-amount(row)):amount(row).toFixed(2)}<button type="button" class="secondary" data-realize-kpi="${String(row.id).replace(/&/g,'&amp;').replace(/\"/g,'&quot;')}" data-row-kind="${recurring?'recurring':'transaction'}">Efetivar</button></div></div>`;
  });
  modal.querySelector('#plannedExpenseDetailTitle').textContent='Despesas previstas · '+m;body.innerHTML=html;modal.classList.add('open');
 }
 function bindPlannedCards(){
  document.querySelectorAll('#kpis [data-kpi-id="expense_planned"],#cardKpis [data-kpi-id="expense_planned"]').forEach(card=>{
   card.style.pointerEvents='auto';card.style.cursor='pointer';card.tabIndex=0;card.setAttribute('role','button');
   card.onclick=e=>{e.preventDefault();e.stopPropagation();openPlannedDetail()};
   card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click()}};
  });
 }
 function bind(){
  addRowButtons();
  bindPlannedCards();
  if(window.FinanceIntegrity)window.FinanceIntegrity.openCategory=openCategory;
  window.openCategoryDetail=openCategory;
  document.addEventListener('click',e=>{
   const plannedCard=e.target.closest('#kpis [data-kpi-id="expense_planned"],#cardKpis [data-kpi-id="expense_planned"]');if(plannedCard){e.preventDefault();e.stopImmediatePropagation();openPlannedDetail();return}
   const legend=e.target.closest('[data-canonical-category]');if(legend){e.preventDefault();e.stopImmediatePropagation();openCategory(legend.dataset.canonicalCategory);return}
   const canvas=e.target.closest('#categoryChart');if(canvas&&typeof chartHit==='function'){const hit=chartHit(canvas,e);if(hit?.detail?.type==='category'){e.preventDefault();e.stopImmediatePropagation();openCategory(hit.detail.name);return}}
   const rowBtn=e.target.closest('[data-realize-recurring],[data-realize-current-recurring]');
   if(rowBtn){e.preventDefault();e.stopPropagation();const r=recRows().find(x=>String(x.id)===String(rowBtn.dataset.realizeRecurring||document.getElementById('recEditId')?.value));if(r)prepareEntry(r,selectedMonth());return}
   const catBtn=e.target.closest('[data-realize-category]');if(catBtn){e.preventDefault();e.stopPropagation();const id=catBtn.dataset.realizeCategory,m=selectedMonth();document.getElementById('categoryDetailModal')?.classList.remove('open');if(catBtn.dataset.rowKind==='recurring'){const r=recRows().find(x=>String(x.id)===String(id));if(r)prepareEntry(r,m)}else{const t=txRows().find(x=>String(x.id)===String(id));if(t&&typeof window.openEditTransaction==='function'){window.openEditTransaction(t.id);const status=document.getElementById('editStatus');if(status)status.value='realized'}}}
   const kpiBtn=e.target.closest('[data-realize-kpi]');if(kpiBtn){e.preventDefault();e.stopPropagation();const id=kpiBtn.dataset.realizeKpi,m=selectedMonth();document.getElementById('plannedExpenseDetailModal')?.classList.remove('open');if(kpiBtn.dataset.rowKind==='recurring'){const r=recRows().find(x=>String(x.id)===String(id));if(r)prepareEntry(r,m)}else{const t=txRows().find(x=>String(x.id)===String(id));if(t&&typeof window.openEditTransaction==='function'){window.openEditTransaction(t.id);const status=document.getElementById('editStatus');if(status)status.value='realized'}}}
  },true);
  const form=document.getElementById('entryForm');if(form&&form.onsubmit&&!form.dataset.recurringWrapped){const original=form.onsubmit;form.onsubmit=function(e){const context=window.__ASSESSOR_REALIZING_RECURRING__,before=new Set(txRows().map(t=>String(t.id)));const result=original.call(this,e);if(context){const created=txRows().find(t=>!before.has(String(t.id)));if(created){created.recurringId=context.id;created.recurrenceMonth=context.month;try{save()}catch(_){}try{window.refreshFinancialUI?.(context.month);window.FinanceCloud?.detectLocalChange?.()}catch(_){}}window.__ASSESSOR_REALIZING_RECURRING__=null;document.getElementById('recurringRealizeNotice')?.remove();const title=document.getElementById('modalTitle');if(title)title.textContent='Novo lançamento'}return result};form.dataset.recurringWrapped='1'}
 }
 const mo=new MutationObserver(()=>{addRowButtons();bindPlannedCards()});mo.observe(document.body,{childList:true,subtree:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
 window.RecurringRealizer={open:(id,month=selectedMonth())=>{const r=recRows().find(x=>String(x.id)===String(id));if(r)prepareEntry(r,month)},openCategory};
})();
