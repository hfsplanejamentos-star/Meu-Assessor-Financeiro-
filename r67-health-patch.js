/* Meu Assessor Financeiro IA — health metrics guard: never show unsupported simulated score */
(()=>{
'use strict';
function root(){return document.getElementById('healthOverview')||[...document.querySelectorAll('.card,.panel')].find(e=>/Saúde Financeira/i.test(e.textContent||''));}
function neutralize(){const r=root();if(!r)return;if(r.dataset.realHealthGuard==='1')return;r.dataset.realHealthGuard='1';r.innerHTML=`<div class="r69-health-neutral"><div style="font-size:22px;font-weight:800;color:var(--cyan);margin-bottom:8px">Análise em formação</div><div style="color:var(--muted);line-height:1.55">Ainda não há histórico consolidado suficiente para atribuir uma nota confiável de saúde financeira.</div><div class="notice" style="margin-top:14px">Os indicadores serão calculados conforme receitas, despesas, orçamento, cartões e reserva forem consolidados com dados reais.</div></div>`;}
let busy=false;function refresh(){if(busy)return;busy=true;requestAnimationFrame(()=>{busy=false;const r=root();if(!r)return;if(!r.querySelector('.r69-health-neutral')||/Excelente|100\s*\/100|65%|5\.5\s*mês/i.test(r.textContent||'')){delete r.dataset.realHealthGuard;neutralize();}});}
const obs=new MutationObserver(refresh);
function start(){neutralize();obs.observe(document.body,{subtree:true,childList:true,characterData:true});document.addEventListener('finance-cloud-status',refresh);document.addEventListener('finance-real-mode',refresh);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();window.FinanceHealthGuard={refresh};
})();