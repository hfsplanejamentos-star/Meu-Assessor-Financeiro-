/* R10.1 — extratos confirmados em 28/09/2026 (C6 e Caju) */
(()=>{'use strict';
 const VERSION='2026-09-28-v2',round=v=>Math.round(Number(v||0)*100)/100;
 const rows=[
  {id:'c6_2026_09_26_pix_luis_1_1500',date:'2026-09-26',desc:'PIX enviado para Luis Ricardo da Silva Sales',value:-15,cat:'Transferências',sub:'PIX'},
  {id:'c6_2026_09_26_pix_luis_2_1500',date:'2026-09-26',desc:'PIX enviado para Luis Ricardo da Silva Sales',value:-15,cat:'Transferências',sub:'PIX'},
  {id:'c6_2026_09_27_bruno_cesar_3900',date:'2026-09-27',desc:'Bruno Cesar Gonçalves',merchant:'BRUNO CESAR GONCALVES RIO DE JANEIR BRA',value:-39,cat:'Alimentação',sub:'Bebidas'},
  {id:'c6_2026_09_27_99_1233',date:'2026-09-27',desc:'99 Tecnologia',merchant:'99 Tecnologia Ltda',value:-12.33,cat:'Transporte',sub:'Aplicativo'},
  {id:'c6_2026_09_27_99_900',date:'2026-09-27',desc:'99 Tecnologia',merchant:'99 Tecnologia Ltda',value:-9,cat:'Transporte',sub:'Aplicativo'}
 ];
 function migrate(){
  if(typeof db!=='object'||!db)return false;
  db.transactions=db.transactions||[];db.accounts=db.accounts||[];db.cards=db.cards||[];db.meta=db.meta||{};
  let changed=false;
  rows.forEach(x=>{if(!db.transactions.some(t=>String(t.id)===x.id)){db.transactions.push({...x,description:x.desc,status:'realized',origin:'Extrato C6 confirmado',source:'Extrato C6 confirmado',account:'acc_c6',accountId:'acc_c6',statementVerified:true,classificationPending:false});changed=true}});
  const cajuId='card_caju_alimentacao',cajuTx={id:'caju_2026_09_28_padaria_19600',date:'2026-09-28',desc:'Padaria e Confeitaria',description:'Padaria e Confeitaria',value:-196,cat:'Alimentação',sub:'Padaria',status:'realized',origin:'Extrato Caju confirmado',source:'Extrato Caju confirmado',card:cajuId,cardId:cajuId,benefit:true,excludeFromExpense:true,excludeFromPatrimony:true,statementVerified:true};
  if(!db.transactions.some(t=>String(t.id)===cajuTx.id)){db.transactions.push(cajuTx);changed=true}
  if(db.meta.sep28ConfirmedBalances!==VERSION){
   const c6=db.accounts.find(a=>String(a.id)==='acc_c6');if(c6){c6.balance=140.40;c6.balanceDate='2026-09-28';c6.statementVerified=true}
   const caju=db.cards.find(c=>String(c.id)===cajuId);if(caju){caju.balance=107.02;caju.availableLimit=107.02;caju.excludeFromPatrimony=true}
   Object.assign(db.meta,{sep28ConfirmedBalances:VERSION,c6StatementAvailable:140.40,c6StatementVersion:VERSION,cajuStatementCredit:1006.89,cajuStatementSpent:899.87,cajuStatementAvailable:107.02,cajuStatementVersion:VERSION});
   changed=true;
  }
  if(changed){try{save()}catch(_){try{localStorage.setItem('assessor_v180_simulacao_ficticia',JSON.stringify(db))}catch(__){}}try{renderAll()}catch(_){}document.dispatchEvent(new CustomEvent('finance-data-changed',{detail:{reason:'sep28_confirmed_balances'}}))}
  return changed;
 }
 window.FinanceSep28={migrate};
 const boot=()=>{setTimeout(migrate,1100);setTimeout(migrate,4600)};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 document.addEventListener('finance-cloud-status',e=>{if(/Sincronizado|Conectado/.test(e.detail?.text||''))setTimeout(migrate,300)});
})();
