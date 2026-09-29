/* R102 — unified post-mutation refresh bus
   Keeps UI, canonical finance model and Cloud propagation coherent after any data mutation. */
(()=>{'use strict';
let timer=0, running=false, queued=false, lastHash='';
const hash=()=>{try{return window.FinanceCloud?.hashPayload&&typeof db==='object'?window.FinanceCloud.hashPayload(db):JSON.stringify({t:db?.transactions?.length||0,a:(db?.accounts||[]).map(x=>[x.id,x.balance]),c:(db?.cards||[]).map(x=>[x.id,x.balance,x.availableLimit])})}catch(_){return''}};
function render(){
 /* One canonical render owner: avoid nested renderAll/renderCharts loops between legacy patches. */
 try{
  if(window.FinanceCanonical?.refreshCanonicalMonth)window.FinanceCanonical.refreshCanonicalMonth();
  else if(typeof renderAll==='function')renderAll();
 }catch(_){}
 requestAnimationFrame(()=>{
  try{window.FinanceDesktopStability?.refresh?.()}catch(_){}
  try{window.FinanceDesktopHomeLayout?.refresh?.()}catch(_){}
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
  /* Cloud propagation is pull/version-first. Never force-push from the render bus. */
  if(window.FinanceCloud?.configured?.()){
   try{window.FinanceCloud.detectLocalChange?.();window.FinanceCloud.sync?.()}catch(_){}
  }
 }finally{running=false;if(queued){queued=false;schedule('queued')}}
}
function schedule(reason='mutation',delay=25){clearTimeout(timer);timer=setTimeout(()=>flush(reason),delay)}
document.addEventListener('finance-data-changed',e=>schedule(e.detail?.reason||'finance-data-changed'));
document.addEventListener('finance-cloud-status',e=>{if(/Sincronizado|Conectado/.test(String(e.detail?.text||'')))setTimeout(render,40)});
window.addEventListener('storage',e=>{if(e.key&&/assessor|finance/i.test(e.key))setTimeout(render,40)});
window.addEventListener('focus',()=>{setTimeout(render,60);try{window.FinanceCloud?.configured?.()&&window.FinanceCloud.sync?.()}catch(_){}});
// Safety net: catches legacy paths that mutate db/save without emitting finance-data-changed.
setInterval(()=>{const h=hash();if(lastHash&&h&&h!==lastHash)schedule('legacy-change',10);lastHash=h},1000);
setTimeout(()=>{lastHash=hash();render()},350);
window.FinanceRefreshBus={refresh:schedule,flush};
})();