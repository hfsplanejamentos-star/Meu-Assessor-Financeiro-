/* V10 FinanceEngine — pure calculations, one source of truth */
(()=>{'use strict';const n=v=>Number(v)||0,abs=v=>Math.abs(n(v)),key=v=>String(v||'').slice(0,7);
const planned=s=>/^(planned|planejada|planejado|prevista|previsto)$/i.test(String(s||''));const realized=s=>/^(posted|realized|realizada|realizado|confirmada|confirmado)$/i.test(String(s||''));
function recurringFor(state,k){return(state.recurring||[]).filter(r=>r.active!==false&&(!key(r.startDate)||k>=key(r.startDate))&&(!key(r.endDate)||k<=key(r.endDate)))}
function summary(state,k){const tx=(state.transactions||[]).filter(t=>key(t.date)===k),op=tx.filter(t=>!t.transfer&&!t.excludeFromExpense);
 const realizedIncome=op.filter(t=>realized(t.status)&&n(t.value)>0).reduce((a,t)=>a+n(t.value),0),realizedExpense=op.filter(t=>realized(t.status)&&n(t.value)<0).reduce((a,t)=>a+abs(t.value),0);
 const plannedIncome=op.filter(t=>planned(t.status)&&n(t.value)>0).reduce((a,t)=>a+n(t.value),0),direct=op.filter(t=>planned(t.status)&&n(t.value)<0).reduce((a,t)=>a+abs(t.value),0),rec=recurringFor(state,k).reduce((a,r)=>a+abs(r.value),0);
 const investment=(state.transactions||[]).filter(t=>key(t.date)===k&&t.transfer&&planned(t.status)&&String(t.destAccountId||t.dest)==='acc_invest_plan').reduce((a,t)=>a+abs(t.value),0);
 return{k,realizedIncome,realizedExpense,plannedIncome,plannedExpense:direct+rec,recurringExpense:rec,investment}}
function balances(state){const inv=a=>/invest/i.test(String(a.type||''));const usable=(state.accounts||[]).filter(a=>!a.excludeFromPatrimony);const liquid=usable.filter(a=>!inv(a)).reduce((a,x)=>a+n(x.balance),0),invest=usable.filter(inv).reduce((a,x)=>a+n(x.balance),0);return{liquid,invest,patrimony:liquid+invest}}
function projection(state,start='2026-10',count=12){let b=balances(state),liq=b.liquid,iv=b.invest,pat=b.patrimony;const[y,m]=start.split('-').map(Number),rows=[];for(let i=0;i<count;i++){const d=new Date(y,m-1+i,1),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),s=summary(state,k);liq+=s.plannedIncome-s.plannedExpense-s.investment;iv+=s.investment;pat+=s.plannedIncome-s.plannedExpense;rows.push({...s,liquid:liq,invest:iv,patrimony:pat})}return rows}
window.FinanceEngineV10={recurringFor,summary,balances,projection};
})();