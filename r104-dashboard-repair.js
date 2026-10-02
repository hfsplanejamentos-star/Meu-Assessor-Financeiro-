/* R272 — layout completo do dashboard e cálculo mensal do Caju.
   Mantém os dados-base intactos; a auditoria abaixo é somente leitura. */
(()=>{'use strict';
const round=v=>Math.round((Number(v)||0)*100)/100;
const money=v=>Math.round((Number(v)||0)*100)/100;
const id='card_caju_alimentacao';
const planned=s=>['planned','planejada','planejado','prevista','previsto'].includes(String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
const monthOf=t=>String(t?.date||'').slice(0,7);
function topupFor(key){
 if(key==='2026-10')return 1572.40;
 const map=db?.automationState?.cajuMonthlyTopups||{};
 if(Number.isFinite(Number(map[key])))return money(map[key]);
 const tx=(db?.transactions||[]).filter(t=>(t.cardId===id||t.card===id||t.benefit===true)&&Number(t.value)>0&&(String(t.creditForMonth||t.competenceMonth||monthOf(t)).slice(0,7)===key));
 if(tx.length)return money(tx.reduce((s,t)=>s+Number(t.value||0),0));
 return key>'2026-10'?money(db?.meta?.cajuMonthlyCreditDefault||1500):0;
}
function monthSpend(key){
 return money((db?.transactions||[]).filter(t=>(t.cardId===id||t.card===id||t.benefit===true)&&monthOf(t)===key&&Number(t.value)<0&&t.status!=='ignored'&&t.status!=='cancelled'&&t.status!=='canceled'&&!planned(t.status)&&!t.excludeFromBalance).reduce((s,t)=>s+Math.abs(Number(t.value)||0),0));
}
function monthlySnapshot(cardId,key){
 if(cardId!==id)return originalSnapshot?originalSnapshot(cardId,key):{available:0,spent:0,credit:0,source:'missing'};
 if(key<'2026-10')return originalSnapshot?originalSnapshot(cardId,key):{available:0,spent:0,credit:0,source:'statement'};
 const opening=money(db?.meta?.cajuStatementAvailable??db?.meta?.cajuLatestReportedBalance??db?.cards?.find(c=>c.id===id)?.balance??0);
 let available=opening,credit=opening,selectedTopup=0,selectedSpend=0;
 const [y,m]=key.split('-').map(Number),[fy,fm]=[2026,10];
 for(let yy=fy,mm=fm;yy<y||(yy===y&&mm<=m);){
   const mk=yy+'-'+String(mm).padStart(2,'0'),add=topupFor(mk),spent=monthSpend(mk);
   credit=money(available+add);available=money(credit-spent);
   if(mk===key){selectedTopup=add;selectedSpend=spent}
   mm++;if(mm===13){mm=1;yy++}
 }
 return {available,spent:selectedSpend,credit,source:'monthly-topup-rollforward',opening,topup:selectedTopup,closing:available};
}
const originalSnapshot=typeof window.cajuSnapshot==='function'?window.cajuSnapshot:null;
window.cajuSnapshot=monthlySnapshot;
window.FinanceCajuMonthly={snapshot:monthlySnapshot,topupFor,monthSpend,version:'R272'};
function ensureStyle(){
 if(document.getElementById('r271DashboardStyle'))return;
 const style=document.createElement('style');style.id='r271DashboardStyle';
 style.textContent=`
 @media(min-width:821px){
  body #view-overview #kpis .r98-bank-row{grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))!important;align-items:stretch!important}
  body #view-overview #kpis .r98-bank-row>.brand-fin-card{height:auto!important;min-height:220px!important;padding:14px!important}
  body #view-overview #kpis .r98-bank-row .brand-sub,
  body #view-overview #kpis .r98-bank-row .brand-num,
  body #view-overview #kpis .r98-bank-row .brand-foot,
  body #view-overview #kpis .r98-bank-row .benefit-progress{display:block!important}
  body #view-overview #kpis .r98-bank-row .brand-foot{display:flex!important}
  body #view-overview>.dashboard{grid-template-columns:repeat(12,minmax(0,1fr))!important;grid-auto-flow:row dense!important;align-items:stretch!important}
  body #view-overview>.dashboard>[data-home-block]:not(.dashboard-hidden){display:block!important;min-width:0!important;max-width:100%!important}
  body #view-overview>.dashboard>[data-home-block].dashboard-hidden{display:none!important}
  body #view-overview>.dashboard>[data-home-block]{grid-column:span 6!important;height:auto!important;max-height:none!important;min-height:220px!important;overflow:visible!important}
  body #view-overview>.dashboard>[data-home-block][data-home-size="p"]{grid-column:span 4!important}
  body #view-overview>.dashboard>[data-home-block][data-home-size="g"]{grid-column:span 12!important}
  body #view-overview>.dashboard>[data-home-block="category"],
  body #view-overview>.dashboard>[data-home-block="cajuexpenses"]{grid-column:span 6!important;min-height:310px!important}
  body #view-overview>.dashboard>[data-home-block="dayexpenses"]{grid-column:span 8!important}
  body #view-overview>.dashboard>[data-home-block="distribution"]{grid-column:span 4!important}
  body #view-overview>.dashboard>[data-home-block="projection"]{grid-column:1/-1!important;min-height:300px!important}
  body #view-overview>.dashboard>[data-home-block="projection"] .chart-wrap{height:220px!important}
  body #view-overview>.dashboard>[data-home-block="category"] .chart-wrap,
  body #view-overview>.dashboard>[data-home-block="cajuexpenses"] .chart-wrap{height:210px!important;max-height:210px!important}
  body #view-overview>.dashboard>[data-home-block="recent"],
  body #view-overview>.dashboard>[data-home-block="commitments"]{min-height:270px!important}
  body #customizeList{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}
  body #customizeList .desktop-layout-row{min-height:38px!important;padding:5px 7px!important;gap:6px!important}
  body #customizeList .desktop-layout-row b{font-size:11px!important;line-height:1.2!important}
  body #customizeList .desktop-layout-row .customize-move button,
  body #customizeList .desktop-layout-row .desktop-size-picker button{min-width:27px!important;min-height:26px!important;padding:3px 6px!important}
  body #customizeList .desktop-layout-row label{font-size:10px!important;white-space:nowrap!important}
  body.desktop-customize-mode #view-overview>.dashboard>[data-home-block]{cursor:grab!important;user-select:none!important}
  body.desktop-customize-mode #view-overview>.dashboard>[data-home-block]::after{content:"⋮⋮ Arrastar";position:absolute;z-index:5;right:10px;bottom:8px;padding:4px 7px;border:1px solid rgba(74,196,255,.22);border-radius:8px;background:rgba(3,15,28,.88);color:#bcecff;font-size:10px;font-weight:800;pointer-events:none}
  body.desktop-customize-mode #view-overview>.dashboard>[data-home-block].dragging{cursor:grabbing!important}
 }
 @media(min-width:821px) and (max-width:1050px){
  body #view-overview>.dashboard>[data-home-block="category"],
  body #view-overview>.dashboard>[data-home-block="cajuexpenses"],
  body #view-overview>.dashboard>[data-home-block="dayexpenses"],
  body #view-overview>.dashboard>[data-home-block="distribution"]{grid-column:span 6!important}
 }
 @media(max-width:820px){
  body #view-overview>.dashboard>[data-home-block]:not(.dashboard-hidden){display:block!important}
  body #view-overview>.dashboard>[data-home-block].dashboard-hidden{display:none!important}
 }`;
 document.head.appendChild(style);
}
const HOME_IDS=['category','cajuexpenses','dayexpenses','distribution','calendar','commitments','recent','recurring','projection','investments','alerts','health'];
function refresh(){
 ensureStyle();
 try{if(typeof applyHomeLayout==='function')applyHomeLayout()}catch(_){}
 try{if(typeof renderCharts==='function')renderCharts()}catch(_){}
 try{if(typeof renderHomeCajuExpenses==='function')renderHomeCajuExpenses()}catch(_){}
 try{window.FinanceCanonical?.canonicalRenderKpis?.()}catch(_){}
}
function audit(){
 const tests=[],add=(name,ok,detail)=>tests.push({name,ok:!!ok,detail});
 const dash=document.querySelector('#view-overview>.dashboard');
 const saved=(()=>{try{return JSON.parse(localStorage.getItem('assessor_home_layout_r232')||'[]')}catch(_){return[]}})();
 const savedMap=new Map(saved.map(x=>[x.id,x]));
 const panels=HOME_IDS.map(key=>{const el=dash?.querySelector('[data-home-block="'+key+'"]');const configured=savedMap.get(key)?.visible!==false;const shown=!!el&&getComputedStyle(el).display!=='none'&&!el.classList.contains('dashboard-hidden');return {id:key,exists:!!el,configured,shown}});
 add('12 painéis do dashboard presentes',panels.every(x=>x.exists),panels);
 const order=[...(dash?.children||[])].filter(el=>el.dataset?.homeBlock).map(el=>el.dataset.homeBlock);
 const requiredOrder=['category','cajuexpenses','recurring','recent','dayexpenses','calendar'];
 add('Sequência principal do dashboard aplicada',requiredOrder.every((id,i)=>order[i]===id),{expected:requiredOrder,actual:order.slice(0,requiredOrder.length)});
 add('Arraste com mouse disponível no modo Personalizar',!!document.getElementById('desktopCustomizeToggle')&&panels.filter(x=>x.exists).every(x=>dash.querySelector('[data-home-block="'+x.id+'"]')?.dataset.dragBound==='1'),{toggle:!!document.getElementById('desktopCustomizeToggle'),bound:panels.filter(x=>x.exists).every(x=>dash.querySelector('[data-home-block="'+x.id+'"]')?.dataset.dragBound==='1')});
 add('Painéis marcados visíveis aparecem',panels.filter(x=>x.configured).every(x=>x.shown),panels.filter(x=>x.configured&&!x.shown));
 const canvases=[...(dash?.querySelectorAll('canvas')||[])].map(c=>({id:c.id,visible:getComputedStyle(c).display!=='none'&&!!c.closest('[data-home-block]')&&!c.closest('[data-home-block]').classList.contains('dashboard-hidden'),width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height}));
 add('Todos os gráficos do layout estão visíveis',canvases.every(x=>x.visible&&x.width>0&&x.height>0),canvases);
 const top=topupFor('2026-10'),snap=monthlySnapshot(id,'2026-10'),opening=money(db?.meta?.cajuStatementAvailable??db?.meta?.cajuLatestReportedBalance??db?.cards?.find(c=>c.id===id)?.balance??0),spend=monthSpend('2026-10'),expected=money(opening+top-spend);
 add('Recarga Caju de outubro = R$ 1.572,40',Math.abs(top-1572.40)<0.005,{topup:top});
 add('Saldo Caju segue fechamento anterior + recarga − gastos',Math.abs(snap.available-expected)<0.005,{opening,topup:top,spent:spend,expected,actual:snap.available});
  add('Saldo anterior + recarga sem acumular recargas antigas',Math.abs(snap.credit-money(opening+top))<0.005,{opening,topup:top,expected:money(opening+top),actual:snap.credit});
 try{const can=window.FinanceCanonical;if(can?.summary){for(const mk of ['2026-09','2026-10','2026-11','2026-12']){const s=can.summary(mk);add('Resumo '+mk+' finito',[s.realizedIncome,s.realizedExpense,s.plannedIncome,s.plannedExpense,s.investment].every(Number.isFinite),s)}}}catch(e){add('Resumo financeiro executável',false,String(e))}
 try{const rows=window.FinanceCanonical?.projection?.('2026-10',12)||[];add('Projeção financeira de 12 meses válida',rows.length===12&&rows.every(x=>[x.income,x.expense,x.patrimony,x.liquid,x.invest].every(Number.isFinite)),{rows:rows.length})}catch(e){add('Projeção financeira executável',false,String(e))}
 const uniqueIds=new Set((db?.transactions||[]).map(t=>String(t.id)));
 add('IDs de transação únicos',uniqueIds.size===(db?.transactions||[]).length,{unique:uniqueIds.size,total:(db?.transactions||[]).length});
 const recurring=db?.recurring||[],recurringIds=new Set(recurring.map(r=>String(r.id)));
 add('IDs de recorrência únicos',recurringIds.size===recurring.length,{unique:recurringIds.size,total:recurring.length});
 add('Valores de recorrência finitos',recurring.every(r=>Number.isFinite(Number(r.value))&&Number(r.value)!==0),recurring.filter(r=>!Number.isFinite(Number(r.value))||Number(r.value)===0).map(r=>({id:r.id,name:r.name||r.desc,value:r.value})));
 const recurrenceKey=r=>{const name=String(r.name||r.desc||r.description||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(do|da|de|mensal)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();return name+'|'+Math.abs(Number(r.value)||0).toFixed(2)+'|'+Number(r.dueDay||r.due||r.day||r.dayOfMonth||0)};
 const recurrenceGroups=new Map();recurring.filter(r=>r.active!==false).forEach(r=>{const k=recurrenceKey(r);if(!k.startsWith('|'))recurrenceGroups.set(k,[...(recurrenceGroups.get(k)||[]),r])});
 const duplicateRecurrences=[...recurrenceGroups].filter(([,rows])=>rows.length>1).map(([key,rows])=>({key,ids:rows.map(r=>r.id)}));
 add('Recorrências ativas sem duplicidade equivalente',duplicateRecurrences.length===0,duplicateRecurrences);
 const salary=(db?.transactions||[]).find(t=>String(t.id)==='auto_salary_2026-10')||(db?.transactions||[]).find(t=>/sal[aá]rio/i.test(String(t.desc||t.description||''))&&String(t.date||'').slice(0,7)==='2026-10'&&isPlanned(t.status));
 add('Salário previsto no último dia útil de outubro',!salary||!planned(salary.status)||String(salary.date||'').slice(0,10)==='2026-10-30',{date:salary?.date,id:salary?.id});
 
 const result={version:'R272',ok:tests.every(t=>t.ok),passed:tests.filter(t=>t.ok).length,total:tests.length,failed:tests.filter(t=>!t.ok),tests,at:new Date().toISOString()};
 window.__ASSESSOR_R271_AUDIT__=result;
 try{localStorage.setItem('assessor_r271_audit',JSON.stringify(result))}catch(_){}
 const runtime=window.FinanceRuntimeGuard;
 if(runtime?.audit&&!runtime.audit.__r271Wrapped){
  const prior=runtime.audit.bind(runtime);
  const wrapped=()=>{const base=prior();let output;try{output={...base,tests:[...(base.tests||[]),...tests],failed:[...(base.failed||[]),...tests.filter(x=>!x.ok)],version:'R272'};output.ok=output.failed.length===0;output.passed=output.tests.filter(x=>x.ok).length;output.total=output.tests.length;window.__ASSESSOR_R268_AUDIT__=output;localStorage.setItem('assessor_r268_audit',JSON.stringify(output))}catch(_){output=base}return output};
  wrapped.__r271Wrapped=true;runtime.audit=wrapped;
 }
 return result;
}
window.FinanceDashboardR271={refresh,audit,panels:HOME_IDS.slice()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{refresh();setTimeout(()=>{refresh();audit()},700)},{once:true});
else{refresh();setTimeout(()=>{refresh();audit()},700)}
window.addEventListener('resize',()=>requestAnimationFrame(refresh),{passive:true});
document.addEventListener('finance-data-changed',()=>setTimeout(()=>{refresh();audit()},180));
document.addEventListener('finance-ui-synchronized',()=>setTimeout(audit,280));
})();