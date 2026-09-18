/* R9.1 — motor financeiro canônico e autoteste mensal */
(()=>{'use strict';
const PLAN_SOURCE='user-approved-investment-3000',INV='acc_invest_plan';
const n=v=>Number(v)||0,abs=v=>Math.abs(n(v)),keyOf=v=>String(v||'').slice(0,7);
const planned=s=>['planned','planejada','planejado','prevista','previsto'].includes(String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
const real=s=>['realized','realizada','realizado','posted','confirmada','confirmado'].includes(String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
function recurringFor(key){return (db.recurring||[]).filter(r=>{const st=keyOf(r.startDate),en=keyOf(r.endDate);return r.active!==false&&(!st||key>=st)&&(!en||key<=en)})}
function summary(key){
 const tx=(db.transactions||[]).filter(t=>keyOf(t.date)===key);
 const op=tx.filter(t=>!t.transfer&&!t.excludeFromExpense);
 const realizedIncome=op.filter(t=>real(t.status)&&n(t.value)>0).reduce((s,t)=>s+n(t.value),0);
 const realizedExpense=op.filter(t=>real(t.status)&&n(t.value)<0).reduce((s,t)=>s+abs(t.value),0);
 const plannedIncome=op.filter(t=>planned(t.status)&&n(t.value)>0).reduce((s,t)=>s+n(t.value),0);
 const directPlannedExpense=op.filter(t=>planned(t.status)&&n(t.value)<0).reduce((s,t)=>s+abs(t.value),0);
 const recurringExpense=recurringFor(key).reduce((s,r)=>s+abs(r.value),0);
 const investment=(db.transactions||[]).filter(t=>keyOf(t.date)===key&&t.transfer&&t.dest===INV&&planned(t.status)).reduce((s,t)=>s+abs(t.value),0);
 return {key,realizedIncome,realizedExpense,plannedIncome,plannedExpense:directPlannedExpense+recurringExpense,recurringExpense,investment};
}
function currentBalances(){
 const isInv=a=>['investimento','investimentos','investment'].includes(String(a.type||'').toLowerCase());
 const liquid=(db.accounts||[]).filter(a=>!isInv(a)).reduce((s,a)=>s+n(a.balance),0);
 const invest=(db.accounts||[]).filter(isInv).reduce((s,a)=>s+n(a.balance),0);
 return {liquid,invest,patrimony:liquid+invest};
}
function projection(start='2026-10',count=12){
 let p=currentBalances().patrimony,liq=currentBalances().liquid,inv=currentBalances().invest,costs=0;const [y,m]=start.split('-').map(Number),rows=[];
 for(let i=0;i<count;i++){const d=new Date(y,m-1+i,1),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),s=summary(k),income=s.plannedIncome,expense=s.plannedExpense,move=s.investment;
   liq+=income-expense-move;inv+=move;p+=income-expense;costs+=expense;rows.push({...s,date:d,label:d.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),income,expense,investmentMove:move,liquid:liq,invest,patrimony:p,costs});
 }return rows;
}
function ensurePlan(){
 db.accounts=db.accounts||[];db.transactions=db.transactions||[];db.investments=db.investments||[];let changed=false;
 let ia=db.accounts.find(a=>a.id===INV);if(!ia){ia={id:INV,name:'Investimentos planejados',type:'Investimento',balance:0,openingBalance:0,source:PLAN_SOURCE};db.accounts.push(ia);changed=true}else if(ia.type!=='Investimento'){ia.type='Investimento';changed=true}
 for(let i=0;i<9;i++){const d=new Date(2026,10+i,1),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),id='aporte_'+k.replace('-','_');
   if(!db.transactions.some(t=>t.id===id|| (t.source===PLAN_SOURCE&&keyOf(t.date)===k&&t.transfer))){db.transactions.push({id,date:k+'-10',desc:'Aporte mensal de investimento',cat:'Investimentos',sub:'Aporte mensal',value:-3000,status:'planned',source:PLAN_SOURCE,origin:'Planejamento real',account:'acc_c6',accountId:'acc_c6',dest:INV,destAccountId:INV,transfer:true,kind:'transfer',excludeFromExpense:true});changed=true}
   if(!db.investments.some(x=>x.id===id|| (x.source===PLAN_SOURCE&&keyOf(x.date)===k))){db.investments.push({id,date:k+'-10',month:k,desc:'Aporte planejado',value:3000,amount:3000,planned:3000,realized:0,status:'planned',accountId:INV,source:PLAN_SOURCE});changed=true}
 }
 if(changed){try{save()}catch(_){localStorage.setItem('assessor_v180_simulacao_ficticia',JSON.stringify(db))}window.FinanceCloud?.detectLocalChange?.();setTimeout(()=>window.FinanceCloud?.pushLocalControlled?.(),700)}
 return changed;
}
const expected={
 '2026-10':[6500,4209.90,0,2324.41],'2026-11':[10104.50,4209.90,3000,8219.01],'2026-12':[13997.94,4209.90,3000,18007.05],
 '2027-01':[10104.50,4209.90,3000,23901.65],'2027-02':[10104.50,4209.90,3000,29796.25],'2027-03':[10104.50,4209.90,3000,35690.85],
 '2027-04':[10104.50,4209.90,3000,41585.45],'2027-05':[10104.50,4209.90,3000,47480.05],'2027-06':[10104.50,3909.90,3000,53674.65],
 '2027-07':[10104.50,3909.90,3000,59869.25],'2027-08':[0,0,0,59869.25],'2027-09':[0,0,0,59869.25]
};
function audit(){
 const rows=projection('2026-10',12),tests=[];for(const r of rows){const e=expected[r.key];tests.push({month:r.key,income:r.income,expense:r.expense,investment:r.investmentMove,patrimony:r.patrimony,ok:!!e&&Math.abs(r.income-e[0])<.02&&Math.abs(r.expense-e[1])<.02&&Math.abs(r.investmentMove-e[2])<.02&&Math.abs(r.patrimony-e[3])<.02})}
 const filters=[...document.querySelectorAll('.month-filter')].map(x=>({scope:x.dataset.monthScope||'global',nov:[...x.options].some(o=>o.value==='2026-11'),enabled:!x.disabled}));
 const cards=[...document.querySelectorAll('#kpis [data-card-nav]')].map(x=>({route:x.dataset.cardNav,pointer:getComputedStyle(x).pointerEvents}));
 const out={ok:tests.every(x=>x.ok)&&filters.every(x=>x.nov&&x.enabled)&&cards.every(x=>x.pointer!=='none'),tests,filters,cards,at:new Date().toISOString()};window.__ASSESSOR_R91_AUDIT__=out;return out;
}
function bind(){
 const g=document.getElementById('globalMonthFilter');if(g){g.disabled=false;g.style.pointerEvents='auto';g.onchange=e=>{const k=e.currentTarget.value;if(/^\d{4}-\d{2}$/.test(k)&&typeof setActiveMonth==='function'){setActiveMonth(k);setTimeout(()=>{try{renderAll();renderCharts();renderKpis()}catch(_){}},20)}}}
 document.querySelectorAll('#kpis [data-card-nav]').forEach(card=>{card.style.pointerEvents='auto';card.style.cursor='pointer';card.onclick=e=>{e.preventDefault();e.stopPropagation();if(typeof nav==='function')nav(card.dataset.cardNav)}});
}
function install(){
 ensurePlan();
 window.FinanceCanonical={summary,projection,recurringFor,currentBalances,ensurePlan,audit,bind};
 window.buildProjection=function(count){const start=(typeof scopeMonth==='function'?scopeMonth('projection'):activeMonth)||'2026-10';return projection(start,Number(count)||12)};
 bind();setTimeout(()=>{bind();try{renderAll();renderCharts();renderKpis()}catch(_){};audit()},250);
}
document.addEventListener('finance-cloud-status',()=>setTimeout(()=>{ensurePlan();bind();try{renderAll();renderCharts();renderKpis()}catch(_){};audit()},500));
document.addEventListener('finance-data-changed',()=>setTimeout(()=>{bind();audit()},80));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();