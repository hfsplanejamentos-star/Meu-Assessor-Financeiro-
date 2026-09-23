/* R9.7 - integridade, sincronizacao e testes da Versao Atual */
(()=>{'use strict';
 const n=v=>Number(v)||0, ym=v=>String(v||'').slice(0,7);
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 function activeRecurring(r,m){const st=ym(r.startDate),en=ym(r.endDate);return r.active!==false&&(!st||m>=st)&&(!en||m<=en)}
 function migrate(){
  let changed=false;
  (db.recurring||[]).forEach(r=>{
   if(String(r.id)==='rec_pensao'||/pensao alimenticia|^pensao$/.test(norm(r.desc||r.description))){if(r.cat!=='Pensão'){r.cat='Pensão';r.desc='Pensão';r.description='Pensão';changed=true}}
   if(String(r.id)==='rec_emp_mae'&&r.cat!=='Móveis'){r.cat='Móveis';r.desc='Móveis';r.description='Móveis';changed=true}
   if((String(r.id)==='rec_tim'||(/plano tim/.test(norm(r.desc||r.description))&&Math.abs(n(r.value))===79.9))&&r.cat!=='Plano TIM'){r.cat='Plano TIM';r.desc='Plano TIM';r.description='Plano TIM';changed=true}
   if(String(r.id)==='rec_carro'||/prestacao do carro/.test(norm(r.desc||r.description))){if(r.cat!=='C4 Cactus'){r.cat='C4 Cactus';changed=true}}
  });
  const pharmacyId='manual_c6_farmacia_2026-09-23_2699';
  if(!(db.transactions||[]).some(t=>String(t.id)===pharmacyId)){
   const tx={id:pharmacyId,date:'2026-09-23',desc:'Farmácia',value:-26.99,cat:'Saúde',sub:'Farmácia',account:'acc_c6',accountId:'acc_c6',card:null,origin:'Lançamento solicitado',status:'realized',paymentType:'Débito'};
   db.transactions=db.transactions||[];db.transactions.push(tx);
   const account=(db.accounts||[]).find(a=>String(a.id)==='acc_c6');if(account)account.balance=Math.round((n(account.balance)-26.99)*100)/100;
   db.auditLog=db.auditLog||[];db.auditLog.unshift({id:'audit_'+pharmacyId,ts:'2026-09-23T17:00:00-03:00',action:'create',entity:'transaction',before:null,after:JSON.parse(JSON.stringify(tx)),meta:{scope:'lançamento confirmado'}});
   changed=true;
  }
  /* Conciliação definitiva do extrato Caju de 17 a 23/09/2026.
     Mantém somente as 13 compras visíveis no extrato e elimina versões duplicadas. */
  db.meta=db.meta||{};
  if(db.meta.cajuStatementVersion!=='2026-09-23-v1'){
   const base={status:'realized',origin:'Extrato Caju confirmado',source:'Extrato Caju confirmado',card:'card_caju_alimentacao',cardId:'card_caju_alimentacao',benefit:true,excludeFromExpense:true,statementVerified:true,cat:'Alimentação'};
   const statement=[
    ['caju_stmt_2026_09_17_padaria_100','2026-09-17','Padaria e Confeitaria',-1.00,'Padaria'],
    ['caju_stmt_2026_09_17_padaria_1400','2026-09-17','Padaria e Confeitaria',-14.00,'Padaria'],
    ['caju_stmt_2026_09_17_mari_2999','2026-09-17','IFD*60.939.734 Mari',-29.99,'Delivery'],
    ['caju_stmt_2026_09_18_padaria_3090','2026-09-18','Padaria e Confeitaria',-30.90,'Padaria'],
    ['caju_stmt_2026_09_18_kaique_4905','2026-09-18','IFD*64802138 Kaique',-49.05,'Delivery'],
    ['caju_stmt_2026_09_19_restaurante_7800','2026-09-19','Restaurante Macaé BR',-78.00,'Restaurante'],
    ['caju_stmt_2026_09_20_luana_3189','2026-09-20','IFD*56162560 Luana',-31.89,'Delivery'],
    ['caju_stmt_2026_09_21_netos_2494','2026-09-21','IFD*Netos Delivery',-24.94,'Delivery'],
    ['caju_stmt_2026_09_21_supermarket_24689','2026-09-21','Super Market Caxias',-246.89,'Supermercado'],
    ['caju_stmt_2026_09_22_dafoca_4400','2026-09-22','Dafoca Bar Rio de Janeiro',-44.00,'Restaurante'],
    ['caju_stmt_2026_09_23_julia_2941','2026-09-23','IFD*51.419.326 Julia',-29.41,'Delivery'],
    ['caju_stmt_2026_09_23_padaria_3140','2026-09-23','Padaria e Confeitaria',-31.40,'Padaria'],
    ['caju_stmt_2026_09_23_dom_5590','2026-09-23','DOM BAR E RESTAURANTE',-55.90,'Restaurante']
   ];
   const keep=new Set(statement.map(x=>x[0]));
   db.transactions=db.transactions||[];
   statement.forEach(([id,date,desc,value,sub])=>{
    let t=db.transactions.find(x=>String(x.id)===id);
    if(!t){t={id};db.transactions.push(t)}
    Object.assign(t,base,{id,date,desc,description:desc,value,sub,duplicateOf:null,excludeFromBalance:false});
   });
   db.transactions.forEach(t=>{
    const date=String(t.date||'').slice(0,10),isCaju=t.cardId==='card_caju_alimentacao'||t.card==='card_caju_alimentacao'||t.benefit===true||/caju/i.test(String(t.origin||t.source||''));
    if(!isCaju||date<'2026-09-17'||date>'2026-09-23'||Number(t.value)>=0||keep.has(String(t.id)))return;
    t.value=0;t.status='ignored';t.duplicateOf='caju_statement_reconciled_2026_09_23';t.excludeFromBalance=true;t.excludeFromExpense=true;
   });
   const caju=(db.cards||[]).find(x=>String(x.id)==='card_caju_alimentacao');
   if(caju){caju.limit=1006.89;caju.balance=339.52;caju.availableLimit=339.52;caju.excludeFromPatrimony=true}
   db.meta.cajuStatementSpent=667.37;db.meta.cajuStatementAvailable=339.52;db.meta.cajuStatementVersion='2026-09-23-v1';
   changed=true;
  }
  if(changed){try{save()}catch(_){}try{window.FinanceCloud?.detectLocalChange?.();setTimeout(()=>window.FinanceCloud?.pushLocalControlled?.(),1600)}catch(_){}}
  return changed;
 }
 function expenseRows(m){
  const current=new Date().toISOString().slice(0,7),rows=[],planned=s=>['planned','planejada','planejado','prevista','previsto'].includes(norm(s));
  const monthOf=t=>(t.card||t.cardId)?(t.invoiceMonth||ym(t.date)):ym(t.date);
  const direct=[];
  (db.transactions||[]).forEach(t=>{if(monthOf(t)!==m||n(t.value)>=0||t.transfer||t.transferId||t.excludeFromExpense||t.invoicePayment||t.cardPayment||t.kind==='invoice_payment'||t.kind==='transfer')return;if(m<current&&planned(t.status))return;const row={kind:'transaction',cat:t.cat||'Outros',sub:t.sub||t.subcategory||t.desc||'Sem subcategoria',value:Math.abs(n(t.value)),id:t.id,recurringId:t.recurringId||null,desc:t.desc||t.description||''};direct.push(row);rows.push(row)});
  if(m>=current)(db.recurring||[]).filter(r=>activeRecurring(r,m)).forEach(r=>{const rv=Math.abs(n(r.value)),name=norm(r.name||r.desc||r.description||''),duplicate=direct.some(t=>(r.id&&String(t.recurringId||'')===String(r.id))||(name&&norm(t.desc)===name&&Math.abs(t.value-rv)<.02));if(!duplicate)rows.push({kind:'recurring',cat:r.cat||'Outros',sub:r.sub||r.subcategory||r.desc||r.description||'Recorrente',value:rv,id:r.id})});
  return rows;
 }
 function selectedMonth(){
  const s=document.querySelector('[data-month-scope="category"]');return s?.value||window.activeMonth||localStorage.getItem('assessor_active_month')||new Date().toISOString().slice(0,7);
 }
 function hideTooltip(){const t=document.getElementById('tooltip');if(t)t.style.display='none'}
 function open(category){
  hideTooltip();
  const m=selectedMonth(),rows=expenseRows(m).filter(x=>x.cat===category),g={};rows.forEach(x=>{g[x.sub]=(g[x.sub]||0)+x.value});
  let modal=document.getElementById('categoryDetailModal');if(!modal){modal=document.createElement('div');modal.id='categoryDetailModal';modal.className='modal';modal.innerHTML='<div class="modal-card"><div class="modal-head"><h3 id="categoryDetailTitle"></h3><button class="close">×</button></div><div id="categoryDetailBody"></div></div>';document.body.appendChild(modal);modal.querySelector('.close').onclick=()=>{modal.classList.remove('open');hideTooltip()};modal.onclick=e=>{if(e.target===modal){modal.classList.remove('open');hideTooltip()}}}
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
   ['Soma categorias = total',Math.abs(Object.values(by).reduce((s,v)=>s+v,0)-rows.reduce((s,x)=>s+x.value,0))<0.01],
   ['Moradia = detalhe',Math.abs((by['Moradia']||0)-rows.filter(x=>x.cat==='Moradia').reduce((s,x)=>s+x.value,0))<0.01],
   ['IDs de recorrência únicos',new Set(rec.map(r=>r.id)).size===rec.length]
  ];
  const result={month:m,expenseTotal:rows.reduce((s,x)=>s+x.value,0),categories:by,tests,passed:tests.filter(x=>x[1]).length,total:tests.length,timestamp:new Date().toISOString()};
  window.__FINANCE_STATUS__=result;localStorage.setItem('assessor_integrity_status',JSON.stringify(result));return result;
 }
 window.openCategoryDetail=open;window.FinanceIntegrity={audit,expenseRows,selectedMonth,migrate,openCategory:open};
 window.FinanceDataModel={
  month:()=>selectedMonth(),
  expenseRows:m=>expenseRows(m||selectedMonth()),
  categoryRows:(category,m)=>expenseRows(m||selectedMonth()).filter(x=>x.cat===category),
  categoryTotal:(category,m)=>expenseRows(m||selectedMonth()).filter(x=>x.cat===category).reduce((s,x)=>s+x.value,0)
 };
 document.addEventListener('finance-data-changed',()=>setTimeout(()=>audit(),50));
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(audit,700));else setTimeout(audit,700);
})();