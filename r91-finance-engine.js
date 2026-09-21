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
function accumulatedRealized(key){
 // Exclusivo do card Saldo Acumulado.
 // Mês-base real (set/26): usa somente o que existe no mês, realizado ou previsto.
 // Meses posteriores: considera receitas, despesas e recorrências do próprio mês como efetivadas.
 const until=String(key||'9999-12'),base='2026-09';
 let income=0,expense=0,investment=0;
 const openingBalance=21.41; // 632,61 atual - 2.639,62 entradas + 2.028,42 saídas
 const accountType=id=>String((db.accounts||[]).find(a=>a.id===id)?.type||'').toLowerCase();
 const months=[];let d=new Date(base+'-01T12:00:00'),last=new Date(until+'-01T12:00:00');
 while(d<=last){months.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));d=new Date(d.getFullYear(),d.getMonth()+1,1)}
 months.forEach(mk=>{
   const tx=(db.transactions||[]).filter(t=>keyOf(t.date)===mk);
   const op=tx.filter(t=>!t.transfer&&!t.excludeFromExpense);
   income+=op.filter(t=>n(t.value)>0).reduce((s,t)=>s+n(t.value),0);
   const monthExpense=op.filter(t=>n(t.value)<0);
   expense+=monthExpense.reduce((s,t)=>s+abs(t.value),0);
   investment+=tx.filter(t=>t.transfer&&(t.dest===INV||t.destAccountId===INV||/invest/.test(accountType(t.dest||t.destAccountId)))).reduce((s,t)=>s+abs(t.value),0);
   if(mk>base){
     recurringFor(mk).forEach(r=>{
       const rv=abs(r.value);if(!rv)return;
       const name=String(r.name||r.desc||'').trim().toLowerCase();
       const already=monthExpense.some(t=>(r.id&&String(t.recurringId||'')===String(r.id))||(name&&String(t.desc||t.description||'').trim().toLowerCase()===name&&Math.abs(abs(t.value)-rv)<.02));
       if(!already)expense+=rv;
     });
   }
 });
 return {income,expense,investment,balance:openingBalance+income-expense-investment};
}
function projection(start='2026-10',count=12){
 let p=currentBalances().patrimony,liq=currentBalances().liquid,inv=currentBalances().invest,costs=0;const [y,m]=start.split('-').map(Number),rows=[];
 for(let i=0;i<count;i++){const d=new Date(y,m-1+i,1),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),s=summary(k),income=s.plannedIncome,expense=s.plannedExpense,move=s.investment;
   liq+=income-expense-move;inv+=move;p+=income-expense;costs+=expense;rows.push({...s,date:d,label:d.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),income,expense,investmentMove:move,liquid:liq,invest:inv,patrimony:p,costs});
 }return rows;
}
function normalizeCore(){
 db.accounts=db.accounts||[];db.transactions=db.transactions||[];db.investments=db.investments||[];db.recurring=db.recurring||[];let changed=false;
 db.transactions.forEach(t=>{if(/^sal_/.test(String(t.id||''))||/salário/i.test(String(t.desc||t.description||''))){if(t.cat!=='Receitas'){t.cat='Receitas';changed=true}if(t.sub!=='Salário'){t.sub='Salário';changed=true}}if(String(t.id||'')==='decimo_2026'&&t.cat!=='Receitas'){t.cat='Receitas';changed=true}const caju=/caju/i.test(String(t.cardId||t.card||t.origin||t.source||''))||t.benefit===true;if(caju&&t.excludeFromExpense!==true){t.excludeFromExpense=true;changed=true}});
 db.recurring.forEach(r=>{if(n(r.value)>0){r.value=-Math.abs(n(r.value));changed=true}if((String(r.id||'')==='rec_pensao'||/pensão alimentícia|pensao alimenticia|^pensão$|^pensao$/i.test(String(r.name||r.desc||'')))&&r.cat!=='Pensão'){r.cat='Pensão';r.desc='Pensão';r.description='Pensão';changed=true}if(String(r.id||'')==='rec_emp_mae'&&r.cat!=='Móveis'){r.cat='Móveis';r.desc='Móveis';r.description='Móveis';changed=true}if((String(r.id||'')==='rec_tim'||(/plano tim/i.test(String(r.name||r.desc||r.description||''))&&Math.abs(n(r.value))===79.9))&&r.cat!=='Plano TIM'){r.cat='Plano TIM';r.desc='Plano TIM';r.description='Plano TIM';changed=true}if((String(r.id||'')==='rec_carro'||/prestação do carro|prestacao do carro/i.test(String(r.name||r.desc||'')))&&r.cat!=='C4 Cactus'){r.cat='C4 Cactus';changed=true}});
 return changed;
}
function ensurePlan(){
 db.accounts=db.accounts||[];db.transactions=db.transactions||[];db.investments=db.investments||[];let changed=normalizeCore();
 let ia=db.accounts.find(a=>a.id===INV);if(!ia){ia={id:INV,name:'Investimentos planejados',type:'Investimento',balance:0,openingBalance:0,source:PLAN_SOURCE};db.accounts.push(ia);changed=true}else if(ia.type!=='Investimento'){ia.type='Investimento';changed=true}
 for(let i=0;i<9;i++){const d=new Date(2026,10+i,1),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),id='aporte_'+k.replace('-','_');
   const same=(db.transactions||[]).filter(t=>t.source===PLAN_SOURCE&&keyOf(t.date)===k&&t.transfer);if(same.length>1){const keep=same.find(t=>t.id===id)||same[0];db.transactions=db.transactions.filter(t=>t===keep||!(t.source===PLAN_SOURCE&&keyOf(t.date)===k&&t.transfer));changed=true}if(!db.transactions.some(t=>t.source===PLAN_SOURCE&&keyOf(t.date)===k&&t.transfer)){db.transactions.push({id,date:k+'-10',desc:'Aporte mensal de investimento',cat:'Investimentos',sub:'Aporte mensal',value:-3000,status:'planned',source:PLAN_SOURCE,origin:'Planejamento real',account:'acc_c6',accountId:'acc_c6',dest:INV,destAccountId:INV,transfer:true,kind:'transfer',excludeFromExpense:true});changed=true}
   const im=(db.investments||[]).filter(x=>x.source===PLAN_SOURCE&&keyOf(x.month||x.date)===k);if(im.length>1){const keep=im.find(x=>x.id===id)||im[0];db.investments=db.investments.filter(x=>x===keep||!(x.source===PLAN_SOURCE&&keyOf(x.month||x.date)===k));changed=true}let ix=db.investments.find(x=>x.source===PLAN_SOURCE&&keyOf(x.month||x.date)===k);if(!ix){db.investments.push({id,date:k+'-10',month:k,desc:'Aporte planejado',value:3000,amount:3000,planned:3000,realized:0,status:'planned',accountId:INV,source:PLAN_SOURCE});changed=true}else{if(ix.month!==k){ix.month=k;changed=true}if(Number(ix.planned)!==3000){ix.planned=3000;changed=true}if(ix.status!=='planned'){ix.status='planned';changed=true}}
 }
 if(changed){try{save()}catch(_){localStorage.setItem('assessor_v180_simulacao_ficticia',JSON.stringify(db))}window.FinanceCloud?.detectLocalChange?.();setTimeout(()=>window.FinanceCloud?.pushLocalControlled?.(),700)}
 return changed;
}
const expected={
 '2026-10':[6500,4209.90,0,2922.71],'2026-11':[10104.50,4209.90,3000,8817.31],'2026-12':[13997.94,4209.90,3000,18605.35],
 '2027-01':[10104.50,4209.90,3000,24499.95],'2027-02':[10104.50,4209.90,3000,30394.55],'2027-03':[10104.50,4209.90,3000,36289.15],
 '2027-04':[10104.50,4209.90,3000,42183.75],'2027-05':[10104.50,4209.90,3000,48078.35],'2027-06':[10104.50,3909.90,3000,54272.95],
 '2027-07':[10104.50,3909.90,3000,60467.55],'2027-08':[0,0,0,60467.55],'2027-09':[0,0,0,60467.55]
};
function audit(){
 const rows=projection('2026-10',12),tests=[];for(const r of rows){const e=expected[r.key];tests.push({month:r.key,income:r.income,expense:r.expense,investment:r.investmentMove,patrimony:r.patrimony,ok:!!e&&Math.abs(r.income-e[0])<.02&&Math.abs(r.expense-e[1])<.02&&Math.abs(r.investmentMove-e[2])<.02&&Math.abs(r.patrimony-e[3])<.02})}
 const filters=[...document.querySelectorAll('.month-filter')].map(x=>({scope:x.dataset.monthScope||'global',nov:[...x.options].some(o=>o.value==='2026-11'),enabled:!x.disabled}));
 const cards=[...document.querySelectorAll('#kpis [data-card-nav]')].map(x=>({route:x.dataset.cardNav,pointer:getComputedStyle(x).pointerEvents}));
 const out={ok:tests.every(x=>x.ok)&&filters.every(x=>x.nov&&x.enabled)&&cards.every(x=>x.pointer!=='none'),tests,filters,cards,at:new Date().toISOString()};window.__ASSESSOR_R91_AUDIT__=out;return out;
}
function renderCanonicalExpenseChart(){
 const key=(typeof activeMonth!=='undefined'?activeMonth:(typeof scopeMonth==='function'?scopeMonth('category'):'2026-09'));
 try{if(typeof monthScopes==='object'&&monthScopes)monthScopes.category=key;const s=document.querySelector('[data-month-scope="category"]');if(s&&s.value!==key)s.value=key}catch(_){};
 const current=typeof monthKey==='function'?monthKey(today):new Date().toISOString().slice(0,7),cats={};
 (db.transactions||[]).filter(t=>String(t.date||'').slice(0,7)===key&&Number(t.value)<0&&!t.transfer&&!t.excludeFromExpense&&t.status!=='planned').forEach(t=>cats[t.cat||'Outros']=(cats[t.cat||'Outros']||0)+Math.abs(n(t.value)));
 if(key>=current){
   recurringFor(key).forEach(r=>cats[r.cat||'Outros']=(cats[r.cat||'Outros']||0)+Math.abs(n(r.value)));
   (db.transactions||[]).filter(t=>String(t.date||'').slice(0,7)===key&&t.status==='planned'&&Number(t.value)<0&&!t.transfer&&!t.excludeFromExpense).forEach(t=>cats[t.cat||'Outros']=(cats[t.cat||'Outros']||0)+Math.abs(n(t.value)));
 }
 const items=Object.entries(cats).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
 const canvas=document.getElementById('categoryChart'),legend=document.getElementById('categoryLegend'),panel=document.getElementById('categoryPanel');
 if(canvas&&typeof drawDonut==='function')drawDonut(canvas,items);
 if(panel)panel.classList.toggle('category-empty',items.length===0);
 if(legend)legend.innerHTML=items.length?items.map((it,i)=>`<div class="legend-line clickable" data-canonical-category="${String(it.name).replace(/"/g,'&quot;')}"><span><i class="dot" style="background:${(typeof colors!=='undefined'?colors:['#20d8ff','#9a6cff','#2ce6b8','#ffb74d'])[i%(typeof colors!=='undefined'?colors.length:4)]}"></i>${it.name}</span><b>${brl(it.value)}</b></div>`).join(''):`<div class="notice">Sem despesas ${key>current?'previstas':'realizadas'} em ${typeof monthLabelKey==='function'?monthLabelKey(key):key}.</div>`;
 const note=panel?.querySelector('.chart-note');if(note)note.textContent=key>current?'Despesas previstas · recorrências e lançamentos planejados.':'Gastos realizados · transferências, estornos e pagamentos de fatura não entram no total.';if(legend)legend.querySelectorAll('[data-canonical-category]').forEach(el=>el.onclick=()=>typeof openCategoryDetail==='function'&&openCategoryDetail(el.dataset.canonicalCategory));
}
function canonicalRenderKpis(){
 const b=currentBalances(),k=(typeof activeMonth!=='undefined'?activeMonth:'2026-09'),s=summary(k),acc=accumulatedRealized(k),box=document.getElementById('kpis');if(!box||typeof brl!=='function')return;
 let pref;try{pref=JSON.parse(localStorage.getItem('assessor_kpi_layout')||'[]')}catch(_){pref=[]}
 const defs={
  c6account:{html:typeof accountBrandCard==='function'?accountBrandCard('c6account',k):'',route:'accounts'},
  itauaccount:{html:typeof accountBrandCard==='function'?accountBrandCard('itauaccount',k):'',route:'accounts'},
  xpaccount:{html:typeof accountBrandCard==='function'?accountBrandCard('xpaccount',k):'',route:'accounts'},
  creditcard:{html:typeof financeBrandCard==='function'?financeBrandCard('creditcard',k):'',route:'cards'},
  caju:{html:typeof financeBrandCard==='function'?financeBrandCard('caju',k):'',route:'cards'},
  patrimony:{html:kpiCard('PATRIMÔNIO TOTAL',brl(b.patrimony),'Abrir contas','neutral'),route:'accounts'},
  available:{html:kpiCard('DISPONÍVEL HOJE',brl(b.liquid),'Abrir contas','neutral'),route:'accounts'},
  accumulated:{html:kpiCard('SALDO ACUMULADO',brl(acc.balance),'Receitas e despesas consideradas efetivadas até o mês','neutral'),route:'transactions'},
  income:{html:kpiCard('RECEITAS REALIZADAS',brl(s.realizedIncome),k,'neutral'),route:'transactions'},
  income_planned:{html:kpiCard('RECEITAS PREVISTAS',brl(s.plannedIncome),k,'neutral'),route:'transactions'},
  expense:{html:kpiCard('DESPESAS REALIZADAS',brl(s.realizedExpense),k,'neutral'),route:'transactions'},
  expense_planned:{html:kpiCard('DESPESAS PREVISTAS',brl(s.plannedExpense),k,'neutral'),route:'transactions'},
  investments:{html:kpiCard('INVESTIMENTOS',brl(s.investment>0?s.investment:b.invest),s.investment>0?('Planejado · '+k):'Abrir investimentos','neutral'),route:'investments'}
 };
 const mobile=window.matchMedia('(max-width:820px)').matches;
 const fallback=(typeof KPI_ITEMS!=='undefined'?KPI_ITEMS.map(x=>({id:x[0],visible:true})):Object.keys(defs).map(id=>({id,visible:true}))),raw=Array.isArray(pref)?pref:[],order=[],known=new Set();
 raw.forEach(x=>{if(x&&defs[x.id]&&!known.has(x.id)){order.push(x);known.add(x.id)}});fallback.forEach(x=>{if(!known.has(x.id)){order.push(x);known.add(x.id)}});
 ['income_planned','expense_planned'].forEach(id=>{if(!known.has(id)){order.push({id,visible:true});known.add(id)}});
 if(mobile){
   const core=['c6account','caju'];
   const rest=order.filter(x=>!core.includes(x.id));
   order.length=0;core.forEach(id=>order.push({id,visible:true}));rest.forEach(x=>order.push(x));
 }
 const seen=new Set(),rows=[];
 order.forEach(x=>{if(x&&x.visible!==false&&defs[x.id]&&!seen.has(x.id)&&defs[x.id].html){rows.push({id:x.id,...defs[x.id]});seen.add(x.id)}});
 box.innerHTML=rows.map(x=>x.html).join('');
 [...box.children].forEach((el,i)=>{el.classList.add('clickable-card');el.tabIndex=0;el.setAttribute('role','button');el.dataset.cardNav=rows[i].route;el.dataset.kpiId=rows[i].id;el.style.pointerEvents='auto'});
 const summaryCells=[...box.children].filter(el=>!el.classList.contains('brand-fin-card'));summaryCells.forEach(el=>el.classList.remove('summary-wide'));if(summaryCells.length%2===1)summaryCells.at(-1)?.classList.add('summary-wide');
 bind();
}
function bind(){
 document.querySelectorAll('.month-filter').forEach(sel=>{sel.disabled=false;sel.style.pointerEvents='auto';if(sel.dataset.r94Bound!=='1'){sel.dataset.r94Bound='1';sel.addEventListener('change',()=>setTimeout(()=>{try{renderCanonicalExpenseChart()}catch(_){}},35))}});
 document.querySelectorAll('[data-month-scope="category"]').forEach(s=>{s.value=(typeof activeMonth!=='undefined'?activeMonth:s.value);s.onchange=e=>{if(typeof setActiveMonth==='function'){setActiveMonth(e.currentTarget.value);setTimeout(refreshCanonicalMonth,20)}}});
 const g=document.getElementById('globalMonthFilter');if(g){g.disabled=false;g.style.pointerEvents='auto';g.onchange=e=>{const k=e.currentTarget.value;if(/^\d{4}-\d{2}$/.test(k)&&typeof setActiveMonth==='function'){setActiveMonth(k);setTimeout(()=>{try{renderAll();renderCharts();renderKpis()}catch(_){}},20)}}}
 document.querySelectorAll('#kpis [data-card-nav]').forEach(card=>{card.style.pointerEvents='auto';card.style.cursor='pointer';if(card.dataset.r1019Click!=='1'){card.dataset.r1019Click='1';card.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(typeof nav==='function')nav(card.dataset.cardNav)},true)}});
}

function refreshCanonicalMonth(){
 try{renderAll()}catch(_){}
 requestAnimationFrame(()=>{try{renderCharts()}catch(_){};try{canonicalRenderKpis()}catch(_){};try{renderCanonicalExpenseChart()}catch(_){};try{renderMobileFinSummary()}catch(_){};try{bind()}catch(_){}});
}
function renderMobileFinSummary(){
 if(!window.matchMedia('(max-width:820px)').matches)return;
 const k=(typeof activeMonth!=='undefined'?activeMonth:'2026-09');
 const cur=(typeof monthKey==='function'?monthKey(today):new Date().toISOString().slice(0,7));
 const sum=summary(k),acc=accumulatedRealized(k),future=k>cur;
 const entry=future?sum.plannedIncome:sum.realizedIncome;
 const out=future?sum.plannedExpense:sum.realizedExpense;
 const center=future?acc.balance:currentBalances().liquid;
 const host=document.getElementById('kpis');if(!host)return;
 let dock=document.getElementById('mobileMonthDock');
 if(!dock){dock=document.createElement('section');dock.id='mobileMonthDock';dock.className='mobile-month-dock';host.parentNode.insertBefore(dock,host)}
 let box=document.getElementById('mobileFinSummary');
 if(!box){box=document.createElement('section');box.id='mobileFinSummary';box.className='mobile-fin-summary';host.parentNode.insertBefore(box,host)}
 const label=typeof monthLabelKey==='function'?monthLabelKey(k):k;
 const [yy,mm]=k.split('-').map(Number),daysInMonth=new Date(yy,mm,0).getDate();
 const anchor=Math.min(today.getDate(),daysInMonth),first=Math.max(1,anchor-6);
 const days=Array.from({length:anchor-first+1},(_,i)=>first+i);
 const isCajuTx=t=>{const aid=String(t.account||t.accountId||'');const a=(db.accounts||[]).find(x=>String(x.id)===aid);return /caju|benef[ií]cio/i.test([aid,a?.name,a?.type,t.card,t.cardId,t.origin,t.source].filter(Boolean).join(' '))||t.benefit===true};
 const isInvoicePayment=t=>!!(t.invoicePayment||t.cardPayment)||/pagamento.*fatura|fatura.*pagamento/i.test(String(t.desc||t.description||''));
 const plannedStatus=t=>planned(t.status)||['pending','forecast','prevista','previsto','planejada','planejado'].includes(String(t.status||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
 const realizedStatus=t=>!plannedStatus(t);
 const tx=(db.transactions||[]).filter(t=>keyOf(t.date)===k&&n(t.value)<0&&!t.transfer&&!t.excludeFromExpense&&!isCajuTx(t)&&!isInvoicePayment(t));
 const rec=recurringFor(k);
 const daily=days.map(day=>{
   let realized=0,forecast=0;
   tx.forEach(t=>{if((Number(String(t.date||'').slice(8,10))||0)!==day)return;const v=abs(t.value);if(realizedStatus(t))realized+=v;else if(plannedStatus(t))forecast+=v});
   if(k>=cur)rec.forEach(r=>{const due=Number(r.day||r.due||r.dueDay||r.dayOfMonth||0);if(due!==day)return;const rv=abs(r.value),name=String(r.name||r.desc||'').trim().toLowerCase();const exists=tx.some(t=>(Number(String(t.date||'').slice(8,10))||0)===day&&((r.id&&String(t.recurringId||'')===String(r.id))||(name&&String(t.desc||t.description||'').trim().toLowerCase()===name&&Math.abs(abs(t.value)-rv)<.02)));if(!exists)forecast+=rv});
   return {day,realized,planned:forecast,total:realized+forecast};
 });
 const rawMax=Math.max(1,...daily.map(p=>p.total)),step=rawMax<=100?25:rawMax<=250?50:rawMax<=500?100:rawMax<=1000?200:rawMax<=2000?500:1000,max=Math.ceil(rawMax/step)*step,w=560,h=128,padLeft=46,padRight=14,padTop=24,padBottom=24;
 const x=i=>daily.length===1?(padLeft+(w-padRight))/2:padLeft+i*(w-padLeft-padRight)/(daily.length-1),y=v=>h-padBottom-(v/max)*(h-padTop-padBottom);
 const ticks=[0,.25,.5,.75,1].map(q=>({v:max*q,y:y(max*q)}));
 const points=daily.map((p,i)=>[x(i),y(p.total)]);
 const smoothPath=pts=>{if(!pts.length)return '';if(pts.length===1)return 'M'+pts[0][0]+' '+pts[0][1];let d='M'+pts[0][0].toFixed(1)+' '+pts[0][1].toFixed(1);for(let i=1;i<pts.length;i++){const p0=pts[i-1],p1=pts[i],mx=((p0[0]+p1[0])/2).toFixed(1);d+=' C '+mx+' '+p0[1].toFixed(1)+', '+mx+' '+p1[1].toFixed(1)+', '+p1[0].toFixed(1)+' '+p1[1].toFixed(1)}return d};
 const path=smoothPath(points);
 const area=points.length?path+' L '+points.at(-1)[0].toFixed(1)+' '+(h-padBottom)+' L '+points[0][0].toFixed(1)+' '+(h-padBottom)+' Z':'';
 dock.innerHTML=`<div class="mfs-month"><button type="button" data-mfs-step="-1" aria-label="Mês anterior">‹</button><div class="mfs-label">▣ <span>${label}</span></div><button type="button" data-mfs-step="1" aria-label="Próximo mês">›</button></div>`;
 box.innerHTML=`<div class="mfs-values"><div class="mfs-metric in"><small><b class="mfs-ico">↓</b> Entrada</small><strong>${brl(entry)}</strong></div><div class="mfs-metric mid"><small><b class="mfs-ico">●</b> ${future?'Previsto':'Saldo'}</small><strong>${brl(center)}</strong><div class="mfs-sub">${future?'Saldo acumulado projetado':'Conta principal disponível'}</div></div><div class="mfs-metric out"><small><b class="mfs-ico">↑</b> Saída</small><strong>${brl(out)}</strong></div></div><div class="mfs-chart"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="Despesas diárias da semana"><defs><linearGradient id="mfsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5876" stop-opacity=".35"/><stop offset="1" stop-color="#ff5876" stop-opacity="0"/></linearGradient></defs>${ticks.map(t=>`<line x1="${padLeft}" x2="${w-padRight}" y1="${t.y}" y2="${t.y}" stroke="#8fa4ba" stroke-opacity=".12" stroke-width="1"/><text x="${padLeft-5}" y="${t.y+3}" text-anchor="end" fill="#8fa4ba" font-size="8">${t.v>=1000?(t.v/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+'k':Math.round(t.v)}</text>`).join('')}${area?`<path d="${area}" fill="url(#mfsFill)"/><path d="${path}" fill="none" stroke="#ff5876" stroke-width="3"/>`:''}${points.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${daily[i].realized>0?'#ff5876':'#9b6cff'}"/>${daily[i].total>0?`<text x="${p[0]}" y="${Math.max(11,p[1]-8)}" text-anchor="middle" fill="#dce8f5" font-size="8.5" font-weight="700">${brl(daily[i].total).replace('R$ ','').replace('R$ ','')}</text>`:''}<text x="${p[0]}" y="${h-3}" text-anchor="middle" fill="#8fa4ba" font-size="9">${String(daily[i].day).padStart(2,'0')}/${String(mm).padStart(2,'0')}</text>`).join('')}</svg></div>`;
 dock.querySelectorAll('[data-mfs-step]').forEach(b=>b.onclick=()=>{
   const d=new Date(yy,mm-1+Number(b.dataset.mfsStep),1),nk=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
   if(typeof setActiveMonth==='function'){setActiveMonth(nk);setTimeout(refreshCanonicalMonth,25)}
 });
}
function install(){
 ensurePlan();
 window.FinanceCanonical={summary,projection,recurringFor,currentBalances,accumulatedRealized,ensurePlan,normalizeCore,audit,bind,canonicalRenderKpis,renderCanonicalExpenseChart,renderMobileFinSummary,refreshCanonicalMonth};window.renderKpis=canonicalRenderKpis;
 if(typeof window.renderCharts==='function'&&!window.renderCharts.__canonicalExpenseWrapped){
   const baseRenderCharts=window.renderCharts;
   const wrappedRenderCharts=function(...args){const out=baseRenderCharts.apply(this,args);try{renderCanonicalExpenseChart()}catch(_){}return out};
   wrappedRenderCharts.__canonicalExpenseWrapped=true;window.renderCharts=wrappedRenderCharts;
 }
 window.buildProjection=function(count){const start=(typeof scopeMonth==='function'?scopeMonth('projection'):activeMonth)||'2026-10';return projection(start,Number(count)||12)};
 bind();
 const refresh=()=>{try{renderCanonicalExpenseChart()}catch(_){}};
 setTimeout(()=>{bind();try{renderAll();renderCharts();renderKpis();renderMobileFinSummary();refresh()}catch(_){};audit()},250);
 setTimeout(refresh,900);setTimeout(refresh,2200);

}
document.addEventListener('finance-cloud-status',e=>{const t=String(e.detail?.text||'');if(!/Sincronizado|Conectado|Desktop enviado/.test(t))return;setTimeout(()=>{ensurePlan();bind();try{renderCanonicalExpenseChart()}catch(_){};audit()},250)});
document.addEventListener('finance-data-changed',()=>setTimeout(()=>{bind();try{renderCanonicalExpenseChart();renderMobileFinSummary()}catch(_){};audit()},80));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
