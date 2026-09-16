/* Meu Assessor Financeiro IA — R6.7 health no-data guard */
(()=>{
'use strict';
const hasFinancialData=()=>{try{return !!((db.transactions||[]).length||(db.accounts||[]).length||(db.cards||[]).length||(db.investments||[]).length||(db.budgets||[]).length||(db.goals||[]).length||(db.recurring||[]).length);}catch(_){return false;}};
function card(){return [...document.querySelectorAll('.card,.panel')].find(e=>/Saúde Financeira/i.test(e.textContent||''));}
function textNodes(root){const out=[],w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode()))out.push(n);return out;}
function neutralize(root){
 if(!root||hasFinancialData())return;
 textNodes(root).forEach(node=>{
  const t=(node.nodeValue||'').trim();
  if(t==='80')node.nodeValue=node.nodeValue.replace('80','—');
  else if(/^Muito Boa$|^Boa$|^Excelente$/i.test(t))node.nodeValue='Aguardando dados';
  else if(t==='100%'){
   const p=node.parentElement?.parentElement?.textContent||'';
   if(/Orçamentos dentro do limite/i.test(p))node.nodeValue=node.nodeValue.replace('100%','—');
  }
 });
 const c=root.querySelector('canvas');if(c){const ctx=c.getContext('2d');if(ctx){ctx.clearRect(0,0,c.width,c.height);}}
 let n=root.querySelector('.r67-health-empty');if(!n){n=document.createElement('div');n.className='r67-health-empty notice';n.style.marginTop='10px';n.textContent='Ainda sem histórico suficiente. A nota será calculada quando houver dados financeiros reais para análise.';root.appendChild(n);}
}
function refresh(){const c=card();if(!c)return;if(!hasFinancialData())neutralize(c);else c.querySelectorAll('.r67-health-empty').forEach(e=>e.remove());}
const obs=new MutationObserver(()=>{clearTimeout(obs._t);obs._t=setTimeout(refresh,120);});
function start(){refresh();obs.observe(document.body,{subtree:true,childList:true,characterData:true});document.addEventListener('finance-cloud-status',refresh);document.addEventListener('finance-real-mode',refresh);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();window.FinanceHealthGuard={refresh,hasFinancialData};
})();