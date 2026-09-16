/* Meu Assessor Financeiro IA — R6.7 real-data mode */
(()=>{
'use strict';
const REAL_FLAG='assessor_r67_real_mode';
const SIM_KEY='assessor_v180_simulacao_ficticia';
const emptyBase=()=>({accounts:[],cards:[],categories:[],transactions:[],recurring:[],investments:[],invoices:[],auditLog:[],dismissedAlerts:{},budgets:[],goals:[],androidNotifications:[],captureIgnored:{}});
const clone=v=>JSON.parse(JSON.stringify(v));
function cleanSimulationState(){
 const x=emptyBase();
 try{
  if(typeof db==='object'&&db){
   if(Array.isArray(db.categories))x.categories=clone(db.categories);
  }
 }catch(_){}
 return x;
}
function redraw(){try{if(typeof renderAll==='function')renderAll();else{renderKpis?.();renderCharts?.();}}catch(e){console.warn('[RealMode] redraw',e);}}
async function activateRealMode(){
 if(!confirm('ATENÇÃO: esta ação remove todos os dados financeiros de teste deste dispositivo e da nuvem sincronizada. A estrutura do aplicativo será mantida. Deseja continuar?'))return false;
 if(!confirm('Confirma a limpeza definitiva dos DADOS FICTÍCIOS? Depois disso o aplicativo ficará pronto para receber dados reais.'))return false;
 const clean=cleanSimulationState();
 try{
  db=clean;
  localStorage.setItem(REAL_FLAG,'1');
  if(typeof STORAGE!=='undefined')localStorage.setItem(STORAGE,JSON.stringify(clean));
  localStorage.removeItem(SIM_KEY);
  redraw();
  if(window.FinanceCloud?.configured?.()){
   const out=await window.FinanceCloud.push();
   if(!out)throw new Error('Não foi possível confirmar a limpeza na nuvem.');
  }
  document.documentElement.dataset.financeMode='real';
  document.dispatchEvent(new CustomEvent('finance-real-mode',{detail:{active:true}}));
  alert('Base de teste removida. O aplicativo está em modo real e a limpeza foi sincronizada.');
  location.reload();
  return true;
 }catch(e){alert('A limpeza local foi feita, mas a confirmação da nuvem falhou. Não cadastre dados reais ainda. Sincronize novamente antes de continuar.');console.error('[RealMode]',e);return false;}
}
function neutralizeSimulationBadge(){
 document.querySelectorAll('.sim-badge').forEach(el=>{el.textContent='MEU ASSESSOR FINANCEIRO · MODO REAL';el.style.display=localStorage.getItem(REAL_FLAG)==='1'?'block':'none';});
}
function installUI(){
 neutralizeSimulationBadge();
 if(document.getElementById('realModeFab'))return;
 const b=document.createElement('button');b.id='realModeFab';b.type='button';b.textContent='✓ Preparar base real';b.title='Remover dados fictícios com segurança';
 b.style.cssText='position:fixed;left:14px;bottom:18px;z-index:99996;padding:10px 13px;border-radius:14px;border:1px solid #23617d;background:#08233a;color:#8de8f7;font-weight:700;box-shadow:0 8px 28px #0008';
 b.onclick=activateRealMode;document.body.appendChild(b);
 if(localStorage.getItem(REAL_FLAG)==='1'){b.textContent='✓ Modo real';b.disabled=true;b.style.opacity='.7';}
}
window.FinanceRealMode={active:()=>localStorage.getItem(REAL_FLAG)==='1',emptyBase,activate:activateRealMode};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUI);else installUI();
})();