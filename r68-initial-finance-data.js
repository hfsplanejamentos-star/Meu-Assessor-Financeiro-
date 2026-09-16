/* Meu Assessor Financeiro — base real aprovada em 16/09/2026 */
(()=>{'use strict';
const FLAG='assessor_r68_initial_data_v3';
const tx=(id,date,desc,cat,value,extra={})=>({id,date,desc,description:desc,cat,value,status:'planned',source:'user-approved',...extra});
const recurring=(id,desc,cat,value,start,end,day,extra={})=>({id,desc,description:desc,cat,value,startDate:start,endDate:end,dueDay:day,frequency:'monthly',active:true,source:'user-approved',...extra});
const c6=(id,date,desc,cat,value,extra={})=>tx(id,date,desc,cat,value,{status:'posted',source:'C6 Bank statement',accountId:'acc_c6',account:'C6 Bank',statementPeriod:'2026-09-01/2026-09-16',...extra});
const baseline={
 accounts:[
  {id:'acc_c6',name:'C6 Bank',type:'checking',bank:'C6 Bank',balance:34.31,balanceDate:'2026-09-16',source:'user-approved'},
  {id:'acc_itau',name:'Itaú',type:'checking',bank:'Itaú',balance:0,source:'user-approved'},
  {id:'acc_xp',name:'Banco XP',type:'checking',bank:'XP',balance:0,source:'user-approved'}
 ],
 cards:[{id:'card_c6_carbon',name:'C6 Bank Carbon',bank:'C6 Bank',type:'credit',source:'user-approved'}],
 recurring:[
  recurring('rec_pensao','Pensão alimentícia','Família',-1500,'2026-10-10','2027-07-10',10),recurring('rec_carro','Prestação do carro','Transporte',-1000,'2026-10-10','2027-07-10',10),recurring('rec_aluguel','Aluguel','Moradia',-1250,'2026-10-10','2027-07-10',10),recurring('rec_internet','Internet','Moradia',-80,'2026-10-10','2027-07-10',10),recurring('rec_tim','Plano TIM','Comunicação',-79.90,'2026-10-10','2027-07-10',10),recurring('rec_emp_mae','Empréstimo mãe','Empréstimos/Compromissos',-300,'2026-10-10','2027-05-10',10,{installments:8})
 ],
 transactions:[
  tx('salary_2026_10','2026-10-01','Salário outubro','Receitas',6500,{status:'planned',accountId:'acc_c6',account:'C6 Bank'}),
  ...['2026-11-01','2026-12-01','2027-01-01','2027-02-01','2027-03-01','2027-04-01','2027-05-01','2027-06-01','2027-07-01'].map(d=>tx('salary_'+d.replaceAll('-','_'),d,'Salário','Receitas',11500,{status:'planned',accountId:'acc_c6',account:'C6 Bank'})),
  tx('13_2026','2026-12-01','13º salário proporcional estimado (4/12)','Receitas',4533.33,{status:'planned',estimated:true,accountId:'acc_c6',account:'C6 Bank',note:'Estimativa bruta sobre salário-base de R$ 13.600; início informado em 11/09/2026.'}),
  c6('c6_20260910_pix_30457','2026-09-10','Pix recebido','Transferências',304.57,{sub:'Entrada PIX',classificationPending:true,note:'Possível transferência entre contas próprias; não classificar como receita até confirmação.'}),
  c6('c6_20260910_recarga_2000','2026-09-10','RECARGA CELULAR','Comunicação',-20,{sub:'Celular'}),
  c6('c6_20260910_estorno_recarga_2000','2026-09-10','EST RECARGA DE CEL','Estornos',20,{sub:'Estorno',linkedTransactionId:'c6_20260910_recarga_2000'}),
  c6('c6_20260911_supernorte_7905','2026-09-11','Pix enviado para SUPER NORTE','Alimentação',-79.05,{sub:'Mercado',merchant:'SUPER NORTE'}),
  c6('c6_20260911_fm_1485','2026-09-11','Pix enviado para FM AGENCIAMENTO PUBLICITÁRIO E INTERMEDIAÇÃO DE NEGÓCIOS LTDA','Outros',-14.85,{classificationPending:true}),
  c6('c6_20260911_deposito_7150','2026-09-11','Débito de cartão — descrição bancária parcialmente legível','Outros',-71.50,{classificationPending:true,descriptionUncertain:true}),
  c6('c6_20260911_drogaria_1299','2026-09-11','Débito de cartão — Drogaria','Saúde',-12.99,{sub:'Farmácia'}),
  c6('c6_20260912_lavland_1989','2026-09-12','LAVLAND.JP','Serviços',-19.89,{merchant:'LAVLAND.JP'}),
  c6('c6_20260912_lavland_1990','2026-09-12','LAVLAND.JP','Serviços',-19.90,{merchant:'LAVLAND.JP'}),
  c6('c6_20260913_nexa_2499','2026-09-13','Pix enviado para NEXA INTERMEDIAÇÕES DE VENDAS LTDA','Outros',-24.99,{classificationPending:true}),
  c6('c6_20260914_jmcom_250','2026-09-14','J.M.COM','Outros',-2.50,{merchant:'J.M.COM',classificationPending:true}),
  c6('c6_20260915_autoposto_3000','2026-09-15','AutoPostoJardim','Transporte',-30,{sub:'Combustível',merchant:'AutoPostoJardim'}),
  c6('c6_20260915_jmcom_400','2026-09-15','J.M.COM','Outros',-4,{merchant:'J.M.COM',classificationPending:true})
 ]
};
function upsert(base,items){const arr=Array.isArray(base)?base:[];for(const item of items){const i=arr.findIndex(x=>x&&x.id===item.id);if(i>=0)arr[i]={...arr[i],...item};else arr.push(item);}return arr;}
async function apply(){if(localStorage.getItem(FLAG)==='1')return;try{if(typeof db!=='object'||!db)return;db.accounts=upsert(db.accounts,baseline.accounts);db.cards=upsert(db.cards,baseline.cards);db.recurring=upsert(db.recurring,baseline.recurring);db.transactions=upsert(db.transactions,baseline.transactions);if(typeof save==='function')save();else if(typeof STORAGE!=='undefined')localStorage.setItem(STORAGE,JSON.stringify(db));localStorage.setItem(FLAG,'1');if(typeof renderAll==='function')renderAll();if(window.FinanceCloud?.configured?.())await window.FinanceCloud.push();console.info('[R6.8] Base financeira inicial V3 aplicada.');}catch(e){console.error('[R6.8] Falha ao aplicar base inicial',e);}}
window.FinanceInitialData={baseline,apply};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,900));else setTimeout(apply,900);
})();