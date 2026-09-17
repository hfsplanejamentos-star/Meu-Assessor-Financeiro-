/* Meu Assessor Financeiro — reconciliação controlada dos compromissos reais aprovados v2 */
(()=>{'use strict';
const approved=[
 {id:'rec_pensao',desc:'Pensão alimentícia',description:'Pensão alimentícia',cat:'Família',value:-1500,startDate:'2026-10-10',endDate:'2027-07-10',dueDay:10,frequency:'monthly',active:true,source:'user-approved'},
 {id:'rec_carro',desc:'Prestação do carro',description:'Prestação do carro',cat:'Transporte',value:-1000,startDate:'2026-10-10',endDate:'2027-07-10',dueDay:10,frequency:'monthly',active:true,source:'user-approved'},
 {id:'rec_aluguel',desc:'Aluguel',description:'Aluguel',cat:'Moradia',value:-1250,startDate:'2026-10-10',endDate:'2027-07-10',dueDay:10,frequency:'monthly',active:true,source:'user-approved'},
 {id:'rec_internet',desc:'Internet',description:'Internet',cat:'Moradia',value:-80,startDate:'2026-10-10',endDate:'2027-07-10',dueDay:10,frequency:'monthly',active:true,source:'user-approved'},
 {id:'rec_tim',desc:'Plano TIM',description:'Plano TIM',cat:'Comunicação',value:-79.90,startDate:'2026-10-10',endDate:'2027-07-10',dueDay:10,frequency:'monthly',active:true,source:'user-approved'},
 {id:'rec_emp_mae',desc:'Empréstimo mãe',description:'Empréstimo mãe',cat:'Empréstimos/Compromissos',value:-300,startDate:'2026-10-10',endDate:'2027-05-10',dueDay:10,frequency:'monthly',active:true,source:'user-approved',installments:8}
];
let running=false;
function same(a,b){return a&&Number(a.value)===Number(b.value)&&String(a.startDate||'')===b.startDate&&String(a.endDate||'')===b.endDate&&Number(a.dueDay)===b.dueDay&&a.active!==false;}
function run(){
 if(running||typeof db!=='object'||!db)return;
 db.recurring=Array.isArray(db.recurring)?db.recurring:[];
 let changed=false;
 for(const item of approved){const i=db.recurring.findIndex(x=>x&&String(x.id)===item.id);if(i<0){db.recurring.push({...item});changed=true;}else if(!same(db.recurring[i],item)){db.recurring[i]={...db.recurring[i],...item};changed=true;}}
 if(!changed)return;
 running=true;
 try{if(typeof save==='function')save();else localStorage.setItem('assessor_v180_simulacao_ficticia',JSON.stringify(db));if(typeof renderAll==='function')renderAll();document.dispatchEvent(new CustomEvent('finance-data-changed',{detail:{reason:'reconcile_real_budget_v2'}}));console.info('[R6.9] Compromissos reais reconciliados após hidratação.');}catch(e){console.error('[R6.9] Falha na reconciliação do orçamento real',e);}finally{setTimeout(()=>{running=false},800);}
}
function kick(){setTimeout(run,400)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,1800));else setTimeout(run,1800);
setTimeout(run,4000);setTimeout(run,8000);setTimeout(run,14000);window.addEventListener('focus',kick);window.addEventListener('online',kick);
})();