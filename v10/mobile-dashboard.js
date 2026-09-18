/* V10 Mobile Dashboard — mobile-first presentation over the same real Store/Engine */
(()=>{'use strict';
const br=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function month(){return window.activeMonth||new Date().toISOString().slice(0,7)}
function route(r){if(typeof window.nav==='function')window.nav(r)}
function mountNav(){if(document.getElementById('v10BottomNav'))return;const n=document.createElement('nav');n.id='v10BottomNav';n.className='v10-bottom-nav';[['overview','Visão Geral','⌂'],['transactions','Transações','⇄'],['add','+','+'],['projection','Relatórios','▥'],['more','Mais','☰']].forEach(([r,l,i])=>{const b=document.createElement('button');b.type='button';b.innerHTML='<b>'+i+'</b><span>'+l+'</span>';b.onclick=()=>r==='add'?(document.querySelector('.fab-main')?.click()):r==='more'?(document.querySelector('.menu-btn')?.click()):route(r);n.appendChild(b)});document.body.appendChild(n)}
function cards(){const box=document.getElementById('kpis');if(!box||!window.FinanceStoreV10||!window.FinanceEngineV10)return;const s=FinanceStoreV10.get(),k=month(),x=FinanceEngineV10.summary(s,k),b=FinanceEngineV10.balances(s);const data=[['Patrimônio',b.patrimony,'accounts'],['Disponível',b.liquid,'accounts'],['Receitas',x.realizedIncome||x.plannedIncome,'transactions'],['Despesas',x.realizedExpense||x.plannedExpense,'transactions']];box.innerHTML=data.map(([l,v,r])=>'<article class="kpi card v10-kpi" tabindex="0" data-v10-route="'+r+'"><div class="label">'+l+'</div><div class="value">'+br(v)+'</div><div class="trend">'+k+'</div></article>').join('');box.querySelectorAll('[data-v10-route]').forEach(el=>{el.onclick=()=>route(el.dataset.v10Route);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')route(el.dataset.v10Route)}})}
function caju(){const s=FinanceStoreV10?.get();if(!s)return;const c=(s.cards||[]).find(x=>x.id==='card_caju_alimentacao');if(c){c.excludeFromPatrimony=true}}
function refresh(){if(matchMedia('(max-width:820px)').matches){cards();caju()}}
function install(){mountNav();refresh();FinanceStoreV10?.subscribe?.(()=>window.RenderControllerV10?.schedule('store'));document.addEventListener('v10-render-complete',refresh)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
window.MobileDashboardV10={refresh,mountNav};
})();