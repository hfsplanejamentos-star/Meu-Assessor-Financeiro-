/* Meu Assessor Financeiro — R6.8 visual cleanup */
(()=>{'use strict';
const DEV=/\b(simula[cç][aã]o|fase\s*1|r6\.?\d*|v1\.\d+|popups? edit[aá]veis|dados fict[ií]cios)\b/i;
function clean(){
 document.title='Meu Assessor Financeiro IA';
 document.querySelectorAll('.sim-badge').forEach(el=>el.remove());
 document.querySelectorAll('.sidefoot .badge-card,.sidefoot small,.sidefoot .tag').forEach(el=>{if(DEV.test(el.textContent||''))el.remove();});
 document.querySelectorAll('.tag').forEach(el=>{if(/^R\d/i.test((el.textContent||'').trim()))el.style.display='none';});
 document.querySelectorAll('footer').forEach(el=>{const t=(el.textContent||'').trim();if(!t||DEV.test(t))el.style.display='none';});
 document.querySelectorAll('small,p,span,div').forEach(el=>{if(el.children.length)return;const t=(el.textContent||'').trim();if(t.length<120&&/SIMULAÇÃO R6|POPUPS EDITÁVEIS|Fase 1 v/i.test(t))el.style.display='none';});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(clean,300));else setTimeout(clean,300);
window.FinanceVisualCleanup={refresh:clean};
})();