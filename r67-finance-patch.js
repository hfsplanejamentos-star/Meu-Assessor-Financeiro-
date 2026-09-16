/* Meu Assessor Financeiro IA — R6.7 finance patch */
(()=>{
'use strict';
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const pct=(cur,prev,hasPrev)=>!hasPrev?null:(prev===0?(cur===0?0:null):((cur-prev)/Math.abs(prev))*100);
const trendText=(v,invert=false)=>{if(v===null||v===undefined||!Number.isFinite(Number(v)))return '— sem histórico';v=n(v);const effective=invert?-v:v;const arrow=effective>0?'↑':effective<0?'↓':'→';return `${arrow} ${Math.abs(v).toFixed(1).replace('.',',')}%`;};
const trendClass=(v,invert=false)=>{if(v===null||v===undefined||!Number.isFinite(Number(v)))return 'neutral';const effective=(invert?-1:1)*n(v);return effective>0?'up':effective<0?'down':'neutral';};
const prevMonthKey=key=>{const [y,m]=String(key).split('-').map(Number),d=new Date(y,m-2,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
const expenseTx=(key,cat=null)=>(db.transactions||[]).filter(t=>n(t.value)<0&&!t.transfer&&!t.excludeFromExpense&&!t.invoicePayment&&t.kind!=='invoice_payment'&&String(t.date||'').slice(0,7)===key&&t.status!=='planned'&&(!cat||t.cat===cat));
const categoryBreakdown=(name,key)=>{const tx=expenseTx(key,name);let account=0,card=0;tx.forEach(t=>{const v=Math.abs(n(t.value));if(t.card)card+=v;else account+=v;});return {tx,account,card,total:account+card};};
const hasMonthData=key=>(db.transactions||[]).some(t=>String(t.date||'').slice(0,7)===key&&t.status!=='planned');

window.kpiCard=function(label,val,trend='— sem histórico',cls='neutral',sparkValue=null){
 const known=sparkValue!==null&&sparkValue!==undefined&&Number.isFinite(Number(sparkValue));
 const flat=!known||Math.abs(n(sparkValue))<0.0001;
 const points=flat?'0,15 15,15 28,15 41,15 55,15 69,15 82,15 100,15':(n(sparkValue)>0?'0,24 15,21 28,23 41,15 55,18 69,10 82,12 100,5':'0,5 15,10 28,8 41,16 55,13 69,21 82,19 100,25');
 return `<div class="card kpi"><div class="label">${label}</div><div class="value">${val}</div><div class="${cls}">${trend}</div><svg class="spark" viewBox="0 0 100 30"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2"/></svg></div>`;
};

window.renderKpis=function(){
 const b=balances(),key=typeof activeMonth==='string'?activeMonth:monthKey(new Date()),prev=prevMonthKey(key);
 const curS=FinanceDomain.ledgerSummary(key),prevS=FinanceDomain.ledgerSummary(prev),hasPrev=hasMonthData(prev);
 const incTrend=pct(curS.income,prevS.income,hasPrev),expTrend=pct(curS.expenses,prevS.expenses,hasPrev);
 const patrTrend=null,liqTrend=null,invTrend=null;
 const box=document.getElementById('kpis');if(!box)return;
 box.innerHTML=[
  kpiCard('PATRIMÔNIO TOTAL',brl(b.patrimony),trendText(patrTrend),trendClass(patrTrend),patrTrend),
  kpiCard('DISPONÍVEL HOJE',brl(b.liquid),trendText(liqTrend),trendClass(liqTrend),liqTrend),
  kpiCard('RECEITAS (MÊS)',brl(b.inc),trendText(incTrend),trendClass(incTrend),incTrend),
  kpiCard('DESPESAS (MÊS)',brl(b.exp),trendText(expTrend,true),trendClass(expTrend,true),expTrend===null?null:-expTrend),
  kpiCard('INVESTIMENTOS',brl(b.invest),trendText(invTrend),trendClass(invTrend),invTrend)
 ].join('');
 const routes=['accounts','accounts','transactions','transactions','investments'];
 [...box.children].forEach((el,i)=>{el.classList.add('clickable-card');el.tabIndex=0;el.dataset.cardNav=routes[i]});
};

const originalRenderCharts=window.renderCharts;
window.renderCharts=function(){
 if(typeof originalRenderCharts==='function')originalRenderCharts();
 const key=scopeMonth('category'),map={};
 expenseTx(key).forEach(t=>map[t.cat||'Outros']=(map[t.cat||'Outros']||0)+Math.abs(n(t.value)));
 const items=Object.entries(map).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
 const canvas=document.getElementById('categoryChart');if(canvas)drawDonut(canvas,items);
 const leg=document.getElementById('categoryLegend');if(leg)leg.innerHTML=items.map((it,i)=>`<div class="legend-line clickable" data-r67-category="${String(it.name).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"><span><i class="dot" style="background:${colors[i%colors.length]}"></i>${it.name}</span><b>${brl(it.value)}</b></div>`).join('');
 if(canvas)bindCategoryInteraction(canvas);
 if(leg)leg.querySelectorAll('[data-r67-category]').forEach(el=>bindCategoryElement(el,el.dataset.r67Category));
};

window.openCategoryDetail=function(name){
 const key=scopeMonth('category'),b=categoryBreakdown(name,key),subs=[...new Set(b.tx.map(t=>t.sub).filter(Boolean))];
 openDetail(`Categoria · ${name}`,[['Mês',monthLabelKey(key)],['Total',brl(b.total)],['Conta corrente',brl(b.account)],['Cartão de crédito',brl(b.card)],['Lançamentos',String(b.tx.length)],['Subcategorias',subs.join(', ')||'—']]);
};

function showCategoryTip(name,clientX,clientY){
 const key=scopeMonth('category'),b=categoryBreakdown(name,key),tip=document.getElementById('tooltip');if(!tip)return;
 tip.innerHTML=`<b>${name}</b><br>Total: ${brl(b.total)}<br>Conta corrente: ${brl(b.account)}<br>Cartão de crédito: ${brl(b.card)}<br><small>Toque/clique novamente para abrir detalhes</small>`;
 tip.style.display='block';positionTooltip(tip,{clientX,clientY});
 clearTimeout(tip._r67Timer);tip._r67Timer=setTimeout(()=>{tip.style.display='none'},3500);
}
let lastTap={name:null,time:0};
function categoryTap(name,x,y){const now=Date.now();if(lastTap.name===name&&now-lastTap.time<420){lastTap={name:null,time:0};const tip=document.getElementById('tooltip');if(tip)tip.style.display='none';openCategoryDetail(name);return;}lastTap={name,time:now};showCategoryTip(name,x,y);}
function bindCategoryInteraction(c){
 c.onmousemove=e=>{const hit=chartHit(c,e),tip=document.getElementById('tooltip');if(!hit){if(tip)tip.style.display='none';c.style.cursor='crosshair';return;}if(hit.detail?.type==='category'){const b=categoryBreakdown(hit.detail.name,scopeMonth('category'));tip.innerHTML=`<b>${hit.detail.name}</b><br>Total: ${brl(b.total)}<br>Conta corrente: ${brl(b.account)}<br>Cartão de crédito: ${brl(b.card)}`;}else tip.innerHTML=hit.html;tip.style.display='block';positionTooltip(tip,e);c.style.cursor='pointer';};
 c.onmouseleave=()=>{const tip=document.getElementById('tooltip');if(tip)tip.style.display='none';};
 c.onclick=e=>{const hit=chartHit(c,e);if(hit?.detail?.type==='category')categoryTap(hit.detail.name,e.clientX,e.clientY);};
 c.ondblclick=e=>{e.preventDefault();const hit=chartHit(c,e);if(hit?.detail?.type==='category'){lastTap={name:null,time:0};openCategoryDetail(hit.detail.name);}};
}
function bindCategoryElement(el,name){el.onclick=e=>categoryTap(name,e.clientX,e.clientY);el.ondblclick=e=>{e.preventDefault();lastTap={name:null,time:0};openCategoryDetail(name);};}

const note=document.querySelector('#categoryChart')?.closest('.card')?.querySelector('.chart-note');if(note)note.textContent='1 toque/clique: valores consolidados · 2 toques/cliques: detalhamento completo.';
try{renderKpis();requestAnimationFrame(renderCharts);}catch(e){console.error('[R6.7]',e);}
})();
