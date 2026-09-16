/* Meu Assessor Financeiro IA — R6.7 health no-data guard */
(()=>{
'use strict';
const hasFinancialData=()=>{
 try{return !!((db.transactions||[]).length||(db.accounts||[]).length||(db.cards||[]).length||(db.investments||[]).length||(db.budgets||[]).length||(db.goals||[]).length||(db.recurring||[]).length);}catch(_){return false;}
};
function patchText(root){
 if(!root||hasFinancialData())return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){
  const t=(node.nodeValue||'').trim();
  if(/^80\s*\/\s*100$/i.test(t))node.nodeValue=node.nodeValue.replace(/80\s*\/\s*100/i,'— / 100');
  else if(/^Muito Boa$/i.test(t)||/^Boa$/i.test(t)||/^Excelente$/i.test(t))node.nodeValue='Aguardando dados';
  else if(/100%.*orçamento/i.test(t)||/orçamentos.*100%/i.test(t))node.nodeValue='Orçamentos: ainda sem dados';
 }
}
function addNotice(){
 if(hasFinancialData())return;
 const candidates=[...document.querySelectorAll('.card,.panel')];
 const card=candidates.find(e=>/Saúde Financeira/i.test(e.textContent||''));
 if(!card)return;
 patchText(card);
 let n=card.querySelector('.r67-health-empty');
 if(!n){n=document.createElement('div');n.className='r67-health-empty notice';n.style.marginTop='10px';n.textContent='Ainda sem histórico suficiente. A nota será calculada quando houver dados financeiros reais para análise.';card.appendChild(n);}
}
function refresh(){if(!hasFinancialData())requestAnimationFrame(addNotice);else document.querySelectorAll('.r67-health-empty').forEach(e=>e.remove());}
const obs=new MutationObserver(()=>{clearTimeout(obs._t);obs._t=setTimeout(refresh,80);});
function start(){refresh();obs.observe(document.body,{subtree:true,childList:true,characterData:true});document.addEventListener('finance-cloud-status',refresh);document.addEventListener('finance-real-mode',refresh);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.FinanceHealthGuard={refresh,hasFinancialData};
})();