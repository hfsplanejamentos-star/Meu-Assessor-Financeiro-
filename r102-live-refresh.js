/* R102 — unified post-mutation refresh bus
   Keeps UI, canonical finance model and Cloud propagation coherent after any data mutation. */
(()=>{'use strict';
let timer=0, running=false, queued=false, lastHash='';
const hash=()=>{try{return window.FinanceCloud?.hashPayload?.()||JSON.stringify({t:db?.transactions?.length||0,a:(db?.accounts||[]).map(x=>[x.id,x.balance]),c:(db?.cards||[]).map(x=>[x.id,x.balance,x.availableLimit])})}catch(_){return''}};
function render(){
 try{window.FinanceCanonical?.refreshCanonicalMonth?.()}catch(_){}
 try{typeof renderAll==='function'&&renderAll()}catch(_){}
 requestAnimationFrame(()=>{
  try{typeof renderKpis==='function'&&renderKpis()}catch(_){}
  try{typeof renderCharts==='function'&&renderCharts()}catch(_){}
  try{typeof renderCardTrend==='function'&&renderCardTrend()}catch(_){}
  try{typeof renderCardPurchases==='function'&&renderCardPurchases()}catch(_){}
  try{window.FinanceIntegrity?.audit?.()}catch(_){}
 });
}
async function flush(reason='mutation'){
 if(running){queued=true;return} running=true;
 try{
  try{typeof save==='function'&&save()}catch(_){}
  try{window.FinanceCloud?.detectLocalChange?.()}catch(_){}
  render();
  document.dispatchEvent(new CustomEvent('finance-ui-synchronized',{detail:{reason,at:Date.now()}}));
  if(window.FinanceCloud?.configured?.()){
   try{await window.FinanceCloud.pushLocalControlled?.()}catch(_){}
  }
 }finally{running=false;if(queued){queued=false;schedule('queued')}}
}
function schedule(reason='mutation',delay=25){clearTimeout(timer);timer=setTimeout(()=>flush(reason),delay)}
document.addEventListener('finance-data-changed',e=>schedule(e.detail?.reason||'finance-data-changed'));
document.addEventListener('finance-cloud-status',e=>{if(/Sincronizado|Conectado|Desktop enviado/.test(String(e.detail?.text||'')))schedule('cloud-applied',40)});
window.addEventListener('storage',e=>{if(e.key&&/assessor|finance/i.test(e.key))schedule('storage-change',40)});
window.addEventListener('focus',()=>schedule('focus-check',60));
// Safety net: catches legacy paths that mutate db/save without emitting finance-data-changed.
setInterval(()=>{const h=hash();if(lastHash&&h&&h!==lastHash)schedule('legacy-change',10);lastHash=h},1000);
setTimeout(()=>{lastHash=hash();render()},350);
window.FinanceRefreshBus={refresh:schedule,flush};
})();