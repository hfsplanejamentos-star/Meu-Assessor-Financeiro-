/* Meu Assessor Financeiro — reconciliação controlada dos compromissos reais aprovados */
(()=>{'use strict';
const FLAG='assessor_r69_real_budget_repair_v1';
const approved=[
 {id:'rec_pensao',desc:'Pensão alimentícia',description:'Pensão alimentícia',cat:'Família',value:-1500,startDate:'2026-10-10',endDate:'2027-07-10',dueDay:10,frequency:'monthly',active:true,source:'user-approved'},
 {id:'rec_carro',desc:'Prestação do carro',description:'Prestação do carro',cat:'Transporte',value:-1000,startDate:'2026-10-10',endDate:'2027-07-10',dueDay:10,frequency:'monthly',active:true,source:'user-approved'},
 {id:'rec_aluguel',desc:'Aluguel',description:'Aluguel',cat:'Moradia',value:-1250,startDate:'2026-10-10',endDate:'2027-07-10',dueDay:10,frequency:'monthly',active:true,source:'user-approved'},
 {id:'rec_internet',desc:'Internet',description:'Internet',cat:'Moradia',value:-80,startDate:'2026-10-10',endDate:'2027-07-10',dueDay:10,frequency:'monthly',active:true,source:'user-approved'},
 {id:'rec_tim',desc:'Plano TIM',description:'Plano TIM',cat:'Comunicação',value:-79.90,startDate:'2026-10-10',endDate:'2027-07-10',dueDay:10,frequency:'monthly',active:true,source:'user-approved'},
 {id:'rec_emp_mae',desc:'Empréstimo mãe',description:'Empréstimo mãe',cat:'Empréstimos/Compromissos',value:-300,startDate:'2026-10-10',endDate:'2027-05-10',dueDay:10,frequency:'monthly',active:true,source:'user-approved',installments:8}
];
let tries=0;
function run(){
 if(localStorage.getItem(FLAG)==='1')return;
 tries++;if(typeof db!=='object'||!db){if(tries<30)setTimeout(run,1000);return;}
 db.recurring=Array.isArray(db.recurring)?db.recurring:[];
 for(const item of approved){const i=db.recurring.findIndex(x=>x&&String(x.id)===item.id);if(i>=0)db.recurring[i]={...db.recurring[i],...item};else db.recurring.push({...item});}
 try{if(typeof save==='function')save();else localStorage.setItem('assessor_v180_simulacao_ficticia',JSON.stringify(db));localStorage.setItem(FLAG,'1');if(typeof renderAll==='function')renderAll();document.dispatchEvent(new CustomEvent('finance-data-changed',{detail:{reason:'reconcile_real_budget'}}));}catch(e){console.error('[R6.9] Falha na reconciliação do orçamento real',e);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,1800));else setTimeout(run,1800);
})();