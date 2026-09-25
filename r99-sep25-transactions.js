/* R9.9 — lançamentos confirmados em 25/09/2026 (C6 e Caju) */
(()=>{'use strict';
 const VERSION='2026-09-25-v6';
 const round=v=>Math.round(Number(v||0)*100)/100;
 function sameTransaction(date,value,predicate){
  return (db.transactions||[]).find(t=>
   String(t.date||'').slice(0,10)===date&&
   Math.abs(Number(t.value||0)-value)<0.005&&predicate(t));
 }
 function migrate(){
  if(typeof db!=='object'||!db)return false;
  db.transactions=db.transactions||[];db.accounts=db.accounts||[];db.cards=db.cards||[];db.meta=db.meta||{};
  if(db.meta.sep25ConfirmedTransactions===VERSION){const cj=db.cards.find(c=>String(c.id)==='card_caju_alimentacao');let fix=false;if(cj&&(Math.abs(Number(cj.balance||0)-303.02)>0.005||Math.abs(Number(cj.availableLimit||0)-303.02)>0.005)){cj.balance=303.02;cj.availableLimit=303.02;fix=true}if(Number(db.meta.cajuStatementAvailable)!==303.02){db.meta.cajuStatementAvailable=303.02;fix=true}if(Number(db.meta.cajuStatementSpent)!==703.87){db.meta.cajuStatementSpent=703.87;fix=true}if(fix){try{save()}catch(_){}try{renderAll()}catch(_){}}return fix;}
  let changed=false;

  const c6Date='2026-09-25',c6Value=-15.00;
  const existingC6=sameTransaction(c6Date,c6Value,t=>
   String(t.account||t.accountId||'')==='acc_c6'||/c6/i.test(String(t.origin||t.source||'')));
  if(!existingC6){
   db.transactions.push({
    id:'c6_2026_09_25_padaria_duque_1500',date:c6Date,
    desc:'Padaria e Confeitaria Duque de Caxias',description:'Padaria e Confeitaria Duque de Caxias',
    merchant:'PADARIA E CONFEITARIA DUQUE DE CAXI BRA',value:c6Value,
    cat:'Alimentação',sub:'Padaria',status:'realized',origin:'Extrato C6 confirmado',
    source:'Extrato C6 confirmado',account:'acc_c6',accountId:'acc_c6',paymentMethod:'Débito',
    statementVerified:true,classificationPending:false
   });
   const c6=db.accounts.find(a=>String(a.id)==='acc_c6');
   if(c6){c6.balance=round(Number(c6.balance||0)+c6Value);c6.balanceDate=c6Date;c6.statementVerified=true}
   changed=true;
  }

  const c6Base={status:'realized',origin:'Extrato C6 confirmado',source:'Extrato C6 confirmado',
   account:'acc_c6',accountId:'acc_c6',statementVerified:true,classificationPending:false};
  const c6StatementRows=[
   {id:'c6_2026_09_23_drogarias_pacheco_1498',date:'2026-09-23',desc:'Drogarias Pacheco',description:'Drogarias Pacheco',merchant:'DROGARIAS PACHECO SA DUQUE DE CAXI BRA',value:-14.98,cat:'Saúde',sub:'Farmácia',paymentMethod:'Débito'},
   {id:'c6_2026_09_24_pix_valdivino_600',date:'2026-09-24',desc:'Estacionamento',description:'Estacionamento',merchantOriginal:'Valdivino Antonio Miranda',value:-6.00,cat:'Transporte',sub:'Estacionamento',paymentMethod:'PIX',transfer:false,kind:'expense',excludeFromExpense:false},
   {id:'c6_2026_09_25_pix_hebert_in_1_100',date:'2026-09-25',desc:'PIX recebido de Hebert Ferreira da Silva',description:'PIX recebido de Hebert Ferreira da Silva',value:1.00,cat:'Transferências',sub:'Transferência própria',paymentMethod:'PIX',transfer:true,kind:'transfer',excludeFromExpense:true},
   {id:'c6_2026_09_25_pix_hebert_out_100',date:'2026-09-25',desc:'PIX enviado para Hebert Ferreira da Silva',description:'PIX enviado para Hebert Ferreira da Silva',value:-1.00,cat:'Transferências',sub:'Transferência própria',paymentMethod:'PIX',transfer:true,kind:'transfer',excludeFromExpense:true},
   {id:'c6_2026_09_25_pix_hebert_in_2_100',date:'2026-09-25',desc:'PIX recebido de Hebert Ferreira da Silva',description:'PIX recebido de Hebert Ferreira da Silva',value:1.00,cat:'Transferências',sub:'Transferência própria',paymentMethod:'PIX',transfer:true,kind:'transfer',excludeFromExpense:true}
  ];
  c6StatementRows.forEach(row=>{
   const existing=db.transactions.find(t=>String(t.id)===row.id);
   if(!existing){db.transactions.push({...c6Base,...row});changed=true}
   else if(row.id==='c6_2026_09_24_pix_valdivino_600'){
    Object.assign(existing,c6Base,row);delete existing.transferId;changed=true;
   }
  });
  const c6Account=db.accounts.find(a=>String(a.id)==='acc_c6');
  if(c6Account&&Math.abs(Number(c6Account.balance||0)-230.73)>0.005){
   c6Account.balance=230.73;c6Account.balanceDate='2026-09-25';c6Account.statementVerified=true;changed=true;
  }

  const cajuDate='2026-09-24',cajuValue=-37.50,cajuId='card_caju_alimentacao';
  const existingCaju=sameTransaction(cajuDate,cajuValue,t=>
   String(t.card||t.cardId||'')===cajuId||t.benefit===true||/caju/i.test(String(t.origin||t.source||'')));
  if(!existingCaju){
   db.transactions.push({
    id:'caju_2026_09_24_boteco_itaipava_3750',date:cajuDate,
    desc:'Boteco Itaipava Rio',description:'Boteco Itaipava Rio',value:cajuValue,
    cat:'Alimentação',sub:'Restaurante',status:'realized',origin:'Extrato Caju confirmado',
    source:'Extrato Caju confirmado',card:cajuId,cardId:cajuId,benefit:true,
    excludeFromExpense:true,excludeFromPatrimony:true,statementVerified:true
   });
   const caju=db.cards.find(c=>String(c.id)===cajuId);
   if(caju){caju.balance=303.02;caju.availableLimit=303.02;caju.excludeFromPatrimony=true}
   changed=true;
  }else{
   const caju=db.cards.find(c=>String(c.id)===cajuId);
   if(caju&&Math.abs(Number(caju.balance||0)-303.02)>0.005){caju.balance=303.02;caju.availableLimit=303.02;changed=true}
  }

  db.meta.sep25ConfirmedTransactions=VERSION;
  db.meta.c6StatementAvailable=230.73;
  db.meta.c6StatementVersion='2026-09-25-v3';
  db.meta.merchantAliases=db.meta.merchantAliases||{};
  db.meta.merchantAliases['VALDIVINO ANTONIO MIRANDA']={desc:'Estacionamento',cat:'Transporte',sub:'Estacionamento',accountId:'acc_c6'};
  db.meta.cajuStatementAvailable=303.02;
  db.meta.cajuStatementSpent=703.87;
  db.meta.cajuStatementCredit=1006.89;
  db.meta.cajuStatementAvailable=303.02;
  db.meta.cajuStatementSpent=703.87;
  db.meta.cajuStatementVersion='2026-09-25-v4';
  changed=true;
  if(changed){
   try{save()}catch(_){try{localStorage.setItem('assessor_v180_simulacao_ficticia',JSON.stringify(db))}catch(__){}}
   try{renderAll()}catch(_){}
   document.dispatchEvent(new CustomEvent('finance-data-changed',{detail:{reason:'sep25_confirmed_transactions'}}));
   try{window.FinanceCloud?.detectLocalChange?.();setTimeout(()=>window.FinanceCloud?.pushLocalControlled?.(),900)}catch(_){}
  }
  return changed;
 }
 window.FinanceSep25={migrate};
 const boot=()=>{setTimeout(migrate,900);setTimeout(migrate,4200);setTimeout(migrate,9000)};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 document.addEventListener('finance-cloud-status',e=>{if(/Sincronizado|Conectado/.test(e.detail?.text||''))setTimeout(migrate,250)});
})();
