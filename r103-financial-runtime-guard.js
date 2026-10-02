/* R268 — trava canônica e autoteste financeiro em tempo de execução.
   Objetivo: impedir migrações históricas de reescrever saldos já conciliados. */
(()=>{'use strict';
 const LOCK='R268',n=v=>Number(v)||0,ym=v=>String(v||'').slice(0,7),round=v=>Math.round(n(v)*100)/100;
 function isPlanned(s){return ['planned','planejada','planejado','prevista','previsto'].includes(String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())}
 function isReal(s){const x=String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return !x||['realized','real','realizada','realizado','posted','confirmada','confirmado','paid','received','pago','recebido'].includes(x)}
 function excluded(t){return !!(t.transfer||t.transferId||t.excludeFromExpense||t.invoicePayment||t.cardPayment||t.kind==='invoice_payment'||t.kind==='transfer')}
 function establish(){
  if(typeof db!=='object'||!db)return false;db.meta=db.meta||{};let changed=false;
  if(db.meta.runtimeFinancialLockVersion!==LOCK){db.meta.runtimeFinancialLockVersion=LOCK;changed=true}
  /* Últimos saldos confirmados pelo usuário/extrato. Snapshot é autoridade; transações futuras alteram a partir dele. */
  const c6=(db.accounts||[]).find(a=>a.id==='acc_c6');
  if(c6&&String(c6.balanceDate||'')<='2026-09-30'&&db.meta.c6StatementVersion!=='2026-09-30-final'){
    c6.balance=.61;c6.statementBalance=.61;c6.balanceDate='2026-09-30';c6.statementBalanceDate='2026-09-30';c6.statementVerified=true;
    Object.assign(db.meta,{c6StatementBalance:.61,c6StatementAvailable:.61,c6StatementBalanceDate:'2026-09-30',c6StatementVersion:'2026-09-30-final'});changed=true;
  }
  const cj=(db.cards||[]).find(c=>c.id==='card_caju_alimentacao');
  if(cj&&String(cj.balanceDate||'')<='2026-09-30'&&db.meta.cajuStatementVersion!=='2026-09-30-final'){
    cj.balance=1419.88;cj.availableLimit=1419.88;cj.balanceDate='2026-09-30';cj.excludeFromPatrimony=true;
    Object.assign(db.meta,{cajuStatementAvailable:1419.88,cajuLatestReportedBalance:1419.88,cajuLatestReportedAt:'2026-09-30T07:12:00-03:00',cajuStatementVersion:'2026-09-30-final',cajuOctoberCredit:1572.40,cajuOctoberCreditPostedAt:'2026-09-28',cajuOctoberCreditCompetence:'2026-10',cajuMonthlyCreditVariable:true});changed=true;
  }
  db.automationState=db.automationState||{};db.automationState.cajuMonthlyTopups=db.automationState.cajuMonthlyTopups||{};
  if(Number(db.automationState.cajuMonthlyTopups['2026-10'])!==1572.40){db.automationState.cajuMonthlyTopups['2026-10']=1572.40;changed=true}
  const oct=(db.transactions||[]).find(t=>String(t.id)==='caju_20260928_credit_157240'||(String(t.date||'').slice(0,10)==='2026-09-28'&&Math.abs(n(t.value)-1572.40)<.01&&/caju/i.test([t.origin,t.source,t.desc].join(' '))));
  if(oct){if(oct.competenceMonth!=='2026-10'||oct.creditForMonth!=='2026-10'){oct.competenceMonth='2026-10';oct.creditForMonth='2026-10';oct.excludeFromExpense=true;oct.statementVerified=true;changed=true}}
  if(changed){try{localStorage.setItem('assessor_v180_simulacao_ficticia',JSON.stringify(db))}catch(_){}}
  return changed;
 }
 function audit(){
  const tests=[],add=(name,ok,detail)=>tests.push({name,ok:!!ok,detail});
  const tx=db?.transactions||[],accounts=db?.accounts||[],cards=db?.cards||[],ids=tx.map(t=>String(t.id));
  add('IDs únicos',new Set(ids).size===ids.length,{unique:new Set(ids).size,total:ids.length});
  add('Valores finitos',tx.every(t=>Number.isFinite(Number(t.value||0))),tx.filter(t=>!Number.isFinite(Number(t.value||0))).map(t=>t.id));
  add('Status reconhecidos',tx.every(t=>isReal(t.status)||isPlanned(t.status)||['ignored','cancelled','canceled'].includes(String(t.status||'').toLowerCase())),tx.filter(t=>!(isReal(t.status)||isPlanned(t.status)||['ignored','cancelled','canceled'].includes(String(t.status||'').toLowerCase()))).map(t=>[t.id,t.status]));
  add('Contas com saldo finito',accounts.every(a=>Number.isFinite(Number(a.balance||0))),accounts.map(a=>[a.id,a.balance]));
  add('Cartões com saldo finito',cards.every(c=>Number.isFinite(Number(c.balance??c.availableLimit??0))),cards.map(c=>[c.id,c.balance,c.availableLimit]));
  const c6=accounts.find(a=>a.id==='acc_c6'),cj=cards.find(c=>c.id==='card_caju_alimentacao');
  add('C6 snapshot coerente',!c6||db.meta?.c6StatementVersion!=='2026-09-30-final'||(round(c6.balance)===round(db.meta.c6StatementBalance)&&String(c6.balanceDate)>='2026-09-30'),{balance:c6?.balance,meta:db.meta?.c6StatementBalance,date:c6?.balanceDate});
  add('Caju snapshot coerente',!cj||db.meta?.cajuStatementVersion!=='2026-09-30-final'||(round(cj.balance)===round(cj.availableLimit)&&round(cj.balance)===round(db.meta.cajuStatementAvailable)),{balance:cj?.balance,available:cj?.availableLimit,meta:db.meta?.cajuStatementAvailable});
  add('Caju fora despesa geral',tx.filter(t=>t.card==='card_caju_alimentacao'||t.cardId==='card_caju_alimentacao'||t.benefit===true).every(t=>t.excludeFromExpense===true||n(t.value)>=0),true);
  add('Transferências fora despesa',tx.filter(t=>t.transfer||t.transferId||t.kind==='transfer').every(t=>t.excludeFromExpense===true||excluded(t)),true);
  const android=tx.filter(t=>t.androidNotificationId),androidIds=android.map(t=>String(t.androidNotificationId));
  add('Android sem duplicidade por notificationId',new Set(androidIds).size===androidIds.length,{unique:new Set(androidIds).size,total:androidIds.length});
  add('Android importado realizado',android.every(t=>isReal(t.status)),android.filter(t=>!isReal(t.status)).map(t=>[t.id,t.status]));
  /* Extrato Caju confirmado nas imagens 17/09–01/10. Somente linhas novas/ausentes.
     O reembolso é entrada; a recarga de 28/09 continua competência 2026-10. */
  const cajuRows=[
   ['caju_20260917_padaria_1','2026-09-17','PADARIA E CONFEITARIA',-1.00,'Alimentação'],
   ['caju_20260930_reembolso_netos','2026-09-30','IFD NETOS DELIVERY · Reembolso',53.90,'Reembolso'],
   ['caju_20260930_supermarket_9661','2026-09-30','SUPER MARKET CAXIAS',-96.61,'Mercado'],
   ['caju_20260930_candido_5148','2026-09-30','CANDIDO REIS DA FO...',-51.48,'Alimentação'],
   ['caju_20261001_ifd_vitor_3601','2026-10-01','IFD VITOR',-36.01,'Delivery']
  ];
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
  cajuRows.forEach(([id,date,desc,value,sub])=>{
   const duplicate=(db.transactions||[]).some(t=>String(t.id)===id||(String(t.date||'').slice(0,10)===date&&Math.abs(n(t.value)-value)<.005&&norm(t.desc||t.description).includes(norm(desc).slice(0,8))));
   if(!duplicate){db.transactions.push({id,date,desc,value,cat:value>0?'Reembolso':'Alimentação',sub,status:'realized',card:'card_caju_alimentacao',cardId:'card_caju_alimentacao',benefit:true,excludeFromExpense:true,statementVerified:true,origin:'Extrato Caju confirmado'});changed=true}
  });
  /* O snapshot R$ 1.419,88 é de 30/09. A despesa confirmada de 01/10 reduz o disponível atual. */
  if(cj&&db.meta.cajuStatementVersion==='2026-09-30-final'){
   const octReal=(db.transactions||[]).filter(t=>String(t.date||'').slice(0,7)==='2026-10'&&n(t.value)<0&&(t.card==='card_caju_alimentacao'||t.cardId==='card_caju_alimentacao')&&isReal(t.status));
   const octRefund=(db.transactions||[]).filter(t=>String(t.date||'').slice(0,7)==='2026-10'&&n(t.value)>0&&(t.card==='card_caju_alimentacao'||t.cardId==='card_caju_alimentacao')&&isReal(t.status)&&!/recarga|beneficios/i.test(String(t.desc||'')));
   const current=round(1419.88-octReal.reduce((s,t)=>s+Math.abs(n(t.value)),0)+octRefund.reduce((s,t)=>s+n(t.value),0));
   cj.balance=current;cj.availableLimit=current;db.meta.cajuCurrentAvailable=current;db.meta.cajuCurrentBalanceThrough='2026-10-01';changed=true;
  }
  const top=db.automationState?.cajuMonthlyTopups?.['2026-10'];
  add('Recarga Caju outubro',Math.abs(n(top)-1572.40)<.01,top);
  try{const can=window.FinanceCanonical;if(can?.summary){['2026-09','2026-10','2026-11','2026-12'].forEach(m=>{const s=can.summary(m);add('Resumo canônico '+m,[s.realizedIncome,s.realizedExpense,s.plannedIncome,s.plannedExpense,s.investment].every(Number.isFinite),s)})}}catch(e){add('Motor canônico executável',false,String(e))}
  try{const p=window.FinanceCanonical?.projection?.('2026-10',12)||[];add('Projeção 12 meses',p.length===12&&p.every(r=>[r.income,r.expense,r.patrimony,r.liquid,r.invest].every(Number.isFinite)),p)}catch(e){add('Projeção executável',false,String(e))}
  const out={ok:tests.every(t=>t.ok),passed:tests.filter(t=>t.ok).length,total:tests.length,failed:tests.filter(t=>!t.ok),tests,at:new Date().toISOString()};
  window.__ASSESSOR_R268_AUDIT__=out;try{localStorage.setItem('assessor_r268_audit',JSON.stringify(out))}catch(_){};return out;
 }
 establish();
 const run=()=>{establish();setTimeout(audit,120)};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
 document.addEventListener('finance-data-changed',()=>setTimeout(audit,260));
 document.addEventListener('finance-ui-synchronized',()=>setTimeout(audit,260));
 window.FinanceRuntimeGuard={establish,audit,version:LOCK};
})();