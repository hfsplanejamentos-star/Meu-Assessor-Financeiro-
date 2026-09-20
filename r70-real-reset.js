/* R7.8 — base financeira real: migração inicial sem sobrescrever alterações do usuário */
(()=>{'use strict';const KEY='assessor_v180_simulacao_ficticia',NET=10104.50,GROSS=13600,TG=4533.33,TN=3893.44;
const rec=(id,desc,cat,value,end)=>({id,desc,description:desc,cat,sub:'',value:-Math.abs(value),startDate:'2026-10-10',endDate:end,dueDay:10,due:10,frequency:'monthly',freq:'Mensal',kind:id==='rec_emp_mae'?'Empréstimo':'Fixa',active:true,source:'user-approved'});
const recurring=[rec('rec_pensao','Pensão alimentícia','Família',1500,'2027-07-10'),rec('rec_carro','Prestação do carro','Transporte',1000,'2027-07-10'),rec('rec_aluguel','Aluguel','Moradia',1250,'2027-07-10'),rec('rec_internet','Internet','Moradia',80,'2027-07-10'),rec('rec_tim','Plano TIM','Comunicação',79.90,'2027-07-10'),{...rec('rec_emp_mae','Empréstimo mãe','Empréstimos/Compromissos',300,'2027-05-10'),installments:8}];
const raw=[['c6_pix','2026-09-10','Pix recebido','Transferências',304.57,true],['c6_recarga','2026-09-10','RECARGA CELULAR','Comunicação',-20],['c6_estorno','2026-09-10','EST RECARGA DE CEL','Estornos',20],['c6_super','2026-09-11','Pix enviado para SUPER NORTE','Alimentação',-79.05],['c6_fm','2026-09-11','FM AGENCIAMENTO','Outros',-14.85,true],['c6_deb','2026-09-11','Débito de cartão — descrição parcialmente legível','Outros',-71.50,true],['c6_drog','2026-09-11','Débito de cartão — Drogaria','Saúde',-12.99],['c6_lav1','2026-09-12','LAVLAND.JP','Serviços',-19.89],['c6_lav2','2026-09-12','LAVLAND.JP','Serviços',-19.90],['c6_nexa','2026-09-13','NEXA INTERMEDIAÇÕES','Outros',-24.99,true],['c6_jm1','2026-09-14','J.M.COM','Outros',-2.50,true],['c6_posto','2026-09-15','AutoPostoJardim','Transporte',-30],['c6_jm2','2026-09-15','J.M.COM','Outros',-4,true]];
function build(){const transactions=raw.map(x=>({id:x[0],date:x[1],desc:x[2],description:x[2],cat:x[3],sub:'',value:x[4],status:'posted',origin:'C6 Bank statement',source:'C6 Bank statement',account:'acc_c6',accountId:'acc_c6',statementPeriod:'2026-09-01/2026-09-16',classificationPending:!!x[5]}));transactions[0].excludeFromExpense=true;transactions[0].note='Possível transferência; não classificar como receita sem confirmação.';transactions[2].excludeFromExpense=true;transactions.push({id:'sal_2026_10',date:'2026-10-01',desc:'Salário líquido outubro',description:'Salário líquido outubro',cat:'Receitas',sub:'Salário',value:6500,status:'planned',origin:'Planejamento real',source:'user-approved',account:'acc_c6',accountId:'acc_c6'});for(let i=0;i<9;i++){const d=new Date(2026,10+i,1),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0');transactions.push({id:`sal_${y}_${m}`,date:`${y}-${m}-01`,desc:'Salário líquido estimado',description:'Salário líquido estimado',cat:'Receitas',sub:'Salário',value:NET,status:'planned',origin:'Planejamento real',source:'calculated-2026',account:'acc_c6',accountId:'acc_c6',grossSalary:GROSS,dependents:1,estimated:true})}transactions.push({id:'decimo_2026',date:'2026-12-20',desc:'13º proporcional estimado (4/12)',description:'13º proporcional estimado (4/12)',cat:'Receitas',sub:'13º',value:TN,status:'planned',origin:'Planejamento real',source:'calculated-2026',account:'acc_c6',accountId:'acc_c6',estimated:true,grossValue:TG,note:'Estimativa líquida separada do salário normal; valor final pode variar na folha.'});return{accounts:[{id:'acc_c6',name:'C6 Bank',type:'Conta corrente',balance:897.87,openingBalance:897.87,balanceDate:'2026-09-19',source:'statement'},{id:'acc_itau',name:'Itaú',type:'Conta corrente',balance:0,openingBalance:0,balanceUnknown:true},{id:'acc_xp',name:'Banco XP',type:'Conta corrente',balance:0,openingBalance:0,balanceUnknown:true}],cards:[{id:'card_c6_carbon',name:'C6 Bank Carbon',bank:'C6 Bank',type:'Crédito',limit:0,due:0,closing:0,source:'user-approved'},{id:'card_caju_alimentacao',name:'Caju Alimentação',bank:'Caju',type:'Benefício',category:'Alimentação',limit:1006.89,availableLimit:803.95,balance:803.95,excludeFromPatrimony:true,source:'user-approved'}],categories:Array.isArray(db?.categories)?db.categories:[],transactions,recurring,investments:[],invoices:[],auditLog:[],dismissedAlerts:{},budgets:[],goals:[],androidNotifications:[],captureIgnored:{},meta:{realBase:'R10.5',statementInReported:2639.62,statementOutReported:1751.17,statementOutVisible:1751.17,statementDifference:0,grossSalary:GROSS,netSalaryEstimated:NET,dependents:1,thirteenthGross:TG,thirteenthNetEstimated:TN,cajuBenefitLimit:1006.89}}}
/* IMPORTANTE: validade estrutural, não validade de valores. Saldo, status, datas e valores podem ser alterados pelo usuário. */
function valid(x){return !!(x&&/^R(7|8|10)\./.test(x.meta?.realBase||'')&&Array.isArray(x.accounts)&&x.accounts.some(a=>a.id==='acc_c6')&&!x.accounts.some(a=>/nubank|btg/i.test(a.name||''))&&Array.isArray(x.transactions)&&x.transactions.some(t=>t.id==='sal_2026_10')&&Array.isArray(x.recurring)&&x.recurring.some(r=>r.id==='rec_pensao'))}
function migrateSep26(){
 if(typeof db!=='object'||!db)return false;
 db.meta=db.meta||{};db.transactions=db.transactions||[];db.accounts=db.accounts||[];
 const aid='acc_c6',version='v5';
 const required=['c6_260910_pix_in','c6_260910_recarga','c6_260910_estorno','c6_260911_super','c6_260911_agencia','c6_260911_deposito','c6_260911_drogaria','c6_260912_lavland','c6_260913_lavland','c6_260913_nexa','c6_260913_jm','c6_260915_posto','c6_260915_jm','c6_260916_posto','c6_260918_pix_in','c6_260918_aluguel','c6_260918_posto','c6_260918_pb','c6_260918_pista4','c6_260918_lanche','c6_260918_pista3','c6_2026_09_19_ben_padaria_1199'];
 const hasAll=required.every(id=>db.transactions.some(t=>String(t.id)===id));
 if(db.meta.c6Sep2026Validated===version&&hasAll)return false;
 // Setembro/2026 C6 é uma base validada pelo usuário. Reconstroi somente este mês para eliminar snapshots antigos.
 db.transactions=db.transactions.filter(t=>!(String(t.date||'').slice(0,7)==='2026-09'&&(t.account===aid||t.accountId===aid)));
 const rows=[
 ['c6_260910_pix_in','2026-09-10','PIX recebido',304.57,'Receitas','PIX recebido'],
 ['c6_260910_recarga','2026-09-10','Recarga celular',-20,'Comunicação','Recarga celular'],
 ['c6_260910_estorno','2026-09-10','Estorno recarga celular',20,'Estornos','Recarga celular'],
 ['c6_260911_super','2026-09-11','PIX Super Norte',-79.06,'Alimentação','Mercado'],
 ['c6_260911_agencia','2026-09-11','Agenciamento/Publicidade',-14.85,'Serviços','Publicidade'],
 ['c6_260911_deposito','2026-09-11','Depósito Cego Duque de Caxias',-71.50,'Alimentação','Mercado'],
 ['c6_260911_drogaria','2026-09-11','Drogaria Duque de Caxias',-12.99,'Saúde','Farmácia'],
 ['c6_260912_lavland','2026-09-12','Lavland',-19.89,'Serviços','Lavanderia'],
 ['c6_260913_lavland','2026-09-13','Lavland',-19.90,'Serviços','Lavanderia'],
 ['c6_260913_nexa','2026-09-13','PIX NEXA Intermediações',-24.99,'Serviços','Outros'],
 ['c6_260913_jm','2026-09-13','JM.COM',-2.50,'Outros','Outros'],
 ['c6_260915_posto','2026-09-15','Auto Posto Jardim',-30,'Transporte','Combustível'],
 ['c6_260915_jm','2026-09-15','JM.COM',-4,'Outros','Outros'],
 ['c6_260916_posto','2026-09-16','Auto Posto Jardim',-30,'Transporte','Combustível'],
 ['c6_260918_pix_in','2026-09-18','PIX recebido',2315.05,'Receitas','PIX recebido'],
 ['c6_260918_aluguel','2026-09-18','PIX Justa Ferreira Adelino',-1250,'Moradia','Aluguel'],
 ['c6_260918_posto','2026-09-18','Posto de Gasolina',-100,'Transporte','Combustível'],
 ['c6_260918_pb','2026-09-18','PB Guapimirim',-21,'Alimentação','Restaurante'],
 ['c6_260918_pista4','2026-09-18','Pista 4 Auto Pista Flu Niterói',-10.80,'Transporte','Pedágio'],
 ['c6_260918_lanche','2026-09-18','Lanchonete Rio Macaé Casimiro',-16.90,'Alimentação','Restaurante'],
 ['c6_260918_pista3','2026-09-18','Pista 3 Auto Pista Flu Niterói',-10.80,'Transporte','Pedágio']
 ];
 rows.forEach(([id,date,desc,value,cat,sub])=>db.transactions.push({id,date,desc,description:desc,value,cat,sub,status:'realized',origin:'Extrato C6 validado',source:'C6 Bank statement validated',account:aid,accountId:aid,statementVerified:true}));
 db.transactions.push({id:'c6_2026_09_19_ben_padaria_1199',date:'2026-09-19',desc:'BEN Padaria e Mercearia — Bebida láctea Nescau 270ml',description:'BEN Padaria e Mercearia — Bebida láctea Nescau 270ml',merchant:'BEN Padaria e Mercearia Ltda.',cat:'Alimentação',sub:'Padaria',value:-11.99,status:'realized',source:'Comprovante confirmado pelo usuário',origin:'Débito C6',account:aid,accountId:aid,paymentMethod:'Débito',receiptVerified:true});

 const confirmed=[
  ['c6_2026_09_20_churrasquinho_5200','2026-09-20','Churrasquinho Sabor CA Macaé',-52.00,'Alimentação','Restaurante'],
  ['c6_2026_09_20_emporio_pao_1199','2026-09-20','Empório do Pão Macaé',-11.99,'Alimentação','Padaria'],
  ['c6_2026_09_20_agro_frutas_2437','2026-09-20','Agro Frutas Aeroporto Macaé',-24.37,'Alimentação','Mercado/Hortifruti']
 ];
 confirmed.forEach(([id,date,desc,value,cat,sub])=>{if(!db.transactions.some(t=>String(t.id)===id))db.transactions.push({id,date,desc,description:desc,value,cat,sub,status:'realized',origin:'Débito C6 confirmado pelo usuário',source:'Extrato C6 confirmado pelo usuário',account:aid,accountId:aid,paymentMethod:'Débito',statementVerified:true})});
 const a=db.accounts.find(x=>x.id===aid);if(a){a.balance=809.51;a.openingBalance=809.51;a.balanceDate='2026-09-20';a.statementVerified=true}
 db.meta.c6Sep2026Validated=version;db.meta.statementInReported=2639.62;db.meta.statementOutReported=1839.53;db.meta.realBase='R10.14';
 try{save()}catch(_){localStorage.setItem(KEY,JSON.stringify(db))}
 return true
}
function migrateCajuSep26(){
 db.transactions=db.transactions||[];db.cards=db.cards||[];db.meta=db.meta||{};
 const canonicalId='caju_2026_09_17_padaria_14',legacyId='caju_2026_09_17_padaria_xanxere';
 let canonical=db.transactions.find(t=>String(t.id)===canonicalId),legacy=db.transactions.find(t=>String(t.id)===legacyId);
 let changed=false;
 if(legacy&&!canonical){legacy.id=canonicalId;legacy.status='realized';legacy.card='card_caju_alimentacao';legacy.cardId='card_caju_alimentacao';legacy.benefit=true;legacy.excludeFromExpense=true;canonical=legacy;legacy=null;changed=true}
 if(canonical&&legacy&&String(legacy.id)===legacyId){legacy.value=0;legacy.status='ignored';legacy.duplicateOf=canonicalId;legacy.excludeFromBalance=true;legacy.excludeFromExpense=true;changed=true}
 else if(canonical&&!legacy){db.transactions.push({id:legacyId,date:'2026-09-17',desc:'Registro legado neutralizado',value:0,status:'ignored',card:'card_caju_alimentacao',cardId:'card_caju_alimentacao',duplicateOf:canonicalId,excludeFromBalance:true,excludeFromExpense:true});changed=true}
 const cj=db.cards.find(x=>x.id==='card_caju_alimentacao');
 if(cj&&db.meta.cajuKnownBalanceVersion!=='2026-09-extrato-v4'){cj.limit=1006.89;cj.availableLimit=803.95;cj.balance=803.95;cj.excludeFromPatrimony=true;db.meta.cajuKnownBalanceVersion='2026-09-extrato-v4';changed=true}
 return changed;
}
function repairCajuSep26(){
 if(!migrateCajuSep26())return false;
 try{if(typeof save==='function')save();else localStorage.setItem(KEY,JSON.stringify(db))}catch(_){}
 try{if(typeof renderKpis==='function')renderKpis();if(typeof renderCajuDetails==='function')renderCajuDetails();if(typeof renderQuickFinancialCards==='function')renderQuickFinancialCards()}catch(_){}
 return true;
}
repairCajuSep26();
[1400,4800,9300].forEach(ms=>setTimeout(repairCajuSep26,ms));
document.addEventListener('finance-data-changed',()=>setTimeout(repairCajuSep26,30));
let repairing=false;async function enforce(reason='startup'){if(repairing||typeof db!=='object'||!db)return false;if(valid(db)){let changed=migrateSep26();db.accounts=db.accounts||[];db.transactions=db.transactions||[];db.cards=db.cards||[];db.meta=db.meta||{};let ia=db.accounts.find(a=>a.id==='acc_invest_plan');if(!ia){ia={id:'acc_invest_plan',name:'Investimentos planejados',type:'Investimento',balance:0,openingBalance:0,source:'user-approved'};db.accounts.push(ia);changed=true}else if(String(ia.type||'').toLowerCase()!=='investimento'){ia.type='Investimento';changed=true}/* aportes são mantidos exclusivamente pelo motor canônico R9.2 para evitar duplicidade */const cj=db.cards.find(x=>x.id==='card_caju_alimentacao');if(cj&&db.meta.cajuKnownBalanceVersion!=='2026-09-extrato-v4'){cj.limit=1006.89;cj.availableLimit=803.95;cj.balance=803.95;cj.excludeFromPatrimony=true;db.meta.cajuKnownBalanceVersion='2026-09-extrato-v4';changed=true}if(!db.transactions.some(t=>String(t.id)==='c6_2026_09_19_ben_padaria_1199')){db.transactions.push({id:'c6_2026_09_19_ben_padaria_1199',date:'2026-09-19',desc:'BEN Padaria e Mercearia — Bebida láctea Nescau 270ml',description:'BEN Padaria e Mercearia — Bebida láctea Nescau 270ml',merchant:'BEN Padaria e Mercearia Ltda.',cat:'Alimentação',sub:'Padaria',value:-11.99,status:'realized',source:'Comprovante confirmado pelo usuário',origin:'Débito C6',account:'acc_c6',accountId:'acc_c6',paymentMethod:'Débito',receiptVerified:true});changed=true}if(db.meta.realBase!=='R10.14'){db.meta.realBase='R10.14';changed=true}if(changed){try{save()}catch(_){localStorage.setItem(KEY,JSON.stringify(db))}if(typeof renderAll==='function')renderAll();document.dispatchEvent(new CustomEvent('finance-data-changed',{detail:{reason:'real_base_r87_migration'}}));if(window.FinanceCloud?.configured?.())setTimeout(()=>window.FinanceCloud.pushLocalControlled?.(),400)}return changed}repairing=true;try{db=build();localStorage.setItem(KEY,JSON.stringify(db));localStorage.setItem('assessor_r67_real_mode','1');if(typeof save==='function')save();if(typeof renderAll==='function')renderAll();document.dispatchEvent(new CustomEvent('finance-data-changed',{detail:{reason:'real_base_r78_'+reason}}));if(window.FinanceCloud?.configured?.())await(window.FinanceCloud.pushLocalControlled?.()||window.FinanceCloud.push?.());return true}catch(e){console.error('[R7.8]',e);return false}finally{repairing=false}}
window.FinanceRealBase={build,enforce,valid,summary:{fixedMonthly:3909.90,loanMonthly:300,octIncome:6500,netSalary:NET,caju:1500,octBeforeVariable:2290.10,novMayBeforeVariable:5894.60,junJulBeforeVariable:6194.60}};function boot(){setTimeout(()=>enforce('boot'),1200);setTimeout(()=>enforce('post_cloud'),4500);setTimeout(()=>enforce('late'),9000)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();document.addEventListener('finance-cloud-status',e=>{if(/Sincronizado|Conectado/.test(e.detail?.text||''))setTimeout(()=>enforce('cloud'),250)});window.addEventListener('focus',()=>setTimeout(()=>enforce('focus'),300));})();
