/* R9.9 — lançamentos confirmados em 25/09/2026 (C6 e Caju) */
(()=>{'use strict';
 const VERSION='2026-09-25-v1';
 const round=v=>Math.round(Number(v||0)*100)/100;
 function sameTransaction(date,value,predicate){
  return (db.transactions||[]).find(t=>
   String(t.date||'').slice(0,10)===date&&
   Math.abs(Number(t.value||0)-value)<0.005&&predicate(t));
 }
 function migrate(){
  if(typeof db!=='object'||!db)return false;
  db.transactions=db.transactions||[];db.accounts=db.accounts||[];db.cards=db.cards||[];db.meta=db.meta||{};
  if(db.meta.sep25ConfirmedTransactions===VERSION)return false;
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
   if(caju){caju.balance=302.02;caju.availableLimit=302.02;caju.excludeFromPatrimony=true}
   changed=true;
  }else{
   const caju=db.cards.find(c=>String(c.id)===cajuId);
   if(caju&&Math.abs(Number(caju.balance||0)-302.02)>0.005){caju.balance=302.02;caju.availableLimit=302.02;changed=true}
  }

  db.meta.sep25ConfirmedTransactions=VERSION;
  db.meta.cajuStatementAvailable=302.02;
  db.meta.cajuStatementSpent=704.87;
  db.meta.cajuStatementVersion='2026-09-24-v2';
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
 const boot=()=>{setTimeout(migrate,900);setTimeout(migrate,4200)};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 document.addEventListener('finance-cloud-status',e=>{if(/Sincronizado|Conectado/.test(e.detail?.text||''))setTimeout(migrate,250)});
})();
