/* R277 — fechamento mensal do Caju sem zerar lançamentos reais.
   Outubro = saldo de setembro + recarga de outubro - gastos reais + reembolsos. */
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
  if(db.meta.cajuReportedBalanceRestoreVersion!=='2026-10-03-r279'||!(Number(db.meta.cajuCurrentReportedBalance)>0)){
   /* A cleared zero is not a reported balance; preserve the user's last confirmed amount. */
   if(!(Number(db.meta.cajuCurrentReportedBalance)>0)){
    db.meta.cajuCurrentReportedBalance=1235.78;db.meta.cajuCurrentReportedDate='2026-10-02';changed=true;
   }
   db.meta.cajuReportedBalanceRestoreVersion='2026-10-03-r279';changed=true;
  }
  const oct=(db.transactions||[]).find(t=>String(t.id)==='caju_20260928_credit_157240'||(String(t.date||'').slice(0,10)==='2026-09-28'&&Math.abs(n(t.value)-1572.40)<.01&&/caju/i.test([t.origin,t.source,t.desc].join(' '))));
  if(oct){if(oct.competenceMonth!=='2026-10'||oct.creditForMonth!=='2026-10'){oct.competenceMonth='2026-10';oct.creditForMonth='2026-10';oct.excludeFromExpense=true;oct.statementVerified=true;changed=true}}
  const supplementVersion='2026-10-03-r277';
  if(cj&&db.meta.cajuStatementSupplementVersion!==supplementVersion){
   const rows=[
    ['caju_20260917_padaria_1','2026-09-17','PADARIA E CONFEITARIA',-1.00,'Alimentação'],
    ['caju_20260930_reembolso_netos','2026-09-30','IFD NETOS DELIVERY · Reembolso',53.90,'Reembolso'],
    ['caju_20260930_supermarket_9661','2026-09-30','SUPER MARKET CAXIAS',-96.61,'Mercado'],
    ['caju_20260930_candido_5148','2026-09-30','CANDIDO REIS DA FO...',-51.48,'Alimentação']
   ];
   const norm=s=>String(s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
   rows.forEach(([id,date,desc,value,sub])=>{
    const duplicate=db.transactions.some(t=>String(t.id)===id||(String(t.date||'').slice(0,10)===date&&Math.abs(n(t.value)-value)<.005&&norm(t.desc||t.description).includes(norm(desc).slice(0,8))));
    if(!duplicate)db.transactions.push({id,date,desc,description:desc,value,cat:value>0?'Reembolso':'Alimentação',sub,status:'realized',card:'card_caju_alimentacao',cardId:'card_caju_alimentacao',benefit:true,excludeFromExpense:true,excludeFromPatrimony:true,statementVerified:true,origin:'Extrato Caju confirmado'});
   });
   db.meta.cajuStatementSupplementVersion=supplementVersion;changed=true;
  }
  const rollforwardVersion='2026-10-03-r279';
  if(cj){
   if(db.meta.cajuOctoberRollforwardVersion!==rollforwardVersion){
    /* R277 may have undone a cancellation explicitly requested by the user. Put those rows back. */
    const priorRestore=(db.audit||[]).find(a=>a.action==='caju_month_restored'&&String(a.id||'').startsWith('2026-10:'));
    String(priorRestore?.id||'').slice('2026-10:'.length).split(',').filter(Boolean).forEach(id=>{
     const t=db.transactions.find(x=>String(x.id)===id);
     const userClear=(db.audit||[]).find(a=>a.action==='caju_month_cleared'&&String(a.id||'').startsWith('2026-10:')&&String(a.id||'').slice('2026-10:'.length).split(',').includes(id)&&/a pedido do usuário/i.test(String(a.note||'')));
     if(t&&userClear&&['realized','real','posted','confirmed'].includes(String(t.status||'').toLowerCase())){t.status='cancelled';t.cancelledAt=userClear.at||new Date().toISOString()}
    });
    /* R276 canceled every realized October expense. Restore only IDs recorded by that migration. */
    const previousClear=(db.audit||[]).find(a=>a.action==='caju_month_cleared'&&String(a.id||'').startsWith('2026-10:')&&/migração aplicada uma única vez/i.test(String(a.note||'')));
    const restored=[];
    String(previousClear?.id||'').slice('2026-10:'.length).split(',').filter(Boolean).forEach(id=>{
     const t=db.transactions.find(x=>String(x.id)===id);
     if(t&&['cancelled','canceled'].includes(String(t.status||'').toLowerCase())){
      t.status='realized';delete t.cancelledAt;restored.push(id);
     }
    });
    db.meta.cajuOctoberRollforwardVersion=rollforwardVersion;changed=true;
    if(restored.length){db.audit=Array.isArray(db.audit)?db.audit:[];db.audit.push({action:'caju_month_restored',id:'2026-10:'+restored.join(','),at:new Date().toISOString(),note:'Lançamentos restaurados após reversão do cancelamento amplo R276.'})}
   }
   const topup=Number(db.automationState?.cajuMonthlyTopups?.['2026-10']??db.meta.cajuOctoberCredit??1572.40);
   const opening=Number(db.meta.cajuStatementAvailable??db.meta.cajuLatestReportedBalance??cj.balance??0);
   const octRows=db.transactions.filter(t=>(t.card==='card_caju_alimentacao'||t.cardId==='card_caju_alimentacao'||t.benefit===true)&&String(t.date||'').slice(0,7)==='2026-10'&&isReal(t.status));
   const spent=octRows.filter(t=>n(t.value)<0&&!['ignored','cancelled','canceled'].includes(String(t.status||'').toLowerCase())&&!t.excludeFromBalance).reduce((s,t)=>s+Math.abs(n(t.value)),0);
   const refunds=octRows.filter(t=>n(t.value)>0&&!/recarga|beneficios/i.test(String(t.desc||t.description||''))).reduce((s,t)=>s+n(t.value),0);
   const reported=Number(db.meta.cajuCurrentReportedBalance),reportedDate=String(db.meta.cajuCurrentReportedDate||'');
   const afterReported=Number.isFinite(reported)&&reportedDate?octRows.filter(t=>String(t.date||'').slice(0,10)>reportedDate):[];
   const deltaAfterReported=afterReported.reduce((sum,t)=>sum+n(t.value),0);
   const current=Number.isFinite(reported)?round(reported+deltaAfterReported):round(opening+topup-spent+refunds);
   cj.balance=current;cj.availableLimit=current;db.meta.cajuCurrentAvailable=current;db.meta.cajuCurrentBalanceThrough='2026-10-31';
   if(round(cj.balance)!==current||round(cj.availableLimit)!==current||round(db.meta.cajuCurrentAvailable)!==current){
   cj.balance=current;cj.availableLimit=current;db.meta.cajuCurrentAvailable=current;changed=true;
   }
   if(db.meta.cajuCurrentBalanceThrough!=='2026-10-31'){db.meta.cajuCurrentBalanceThrough='2026-10-31';changed=true}
  }
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
  add('Caju saldo finito e consistente',!cj||(Number.isFinite(Number(cj.balance))&&round(cj.balance)===round(cj.availableLimit)),{balance:cj?.balance,availableLimit:cj?.availableLimit});
  add('Caju fora despesa geral',tx.filter(t=>t.card==='card_caju_alimentacao'||t.cardId==='card_caju_alimentacao'||t.benefit===true).every(t=>t.excludeFromExpense===true||n(t.value)>=0),true);
  add('Transferências fora despesa',tx.filter(t=>t.transfer||t.transferId||t.kind==='transfer').every(t=>t.excludeFromExpense===true||excluded(t)),true);
  const android=tx.filter(t=>t.androidNotificationId),androidIds=android.map(t=>String(t.androidNotificationId));
  add('Android sem duplicidade por notificationId',new Set(androidIds).size===androidIds.length,{unique:new Set(androidIds).size,total:androidIds.length});
  add('Android importado realizado',android.every(t=>isReal(t.status)),android.filter(t=>!isReal(t.status)).map(t=>[t.id,t.status]));
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
