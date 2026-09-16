/* Meu Assessor Financeiro IA — R6.7 Convex cloud sync */
(()=>{
'use strict';
const API='https://effervescent-marlin-88.convex.site/finance/state';
const KEY_STORE='assessor_cloud_sync_key';
const DEVICE_STORE='assessor_cloud_device_id';
const VERSION_STORE='assessor_cloud_version';
let busy=false,timer=null;
const deviceId=localStorage.getItem(DEVICE_STORE)||(()=>{const v='dev-'+crypto.randomUUID();localStorage.setItem(DEVICE_STORE,v);return v})();
const getKey=()=>localStorage.getItem(KEY_STORE)||'';
const setStatus=(text,state='')=>{window.__financeCloudStatus={text,state,at:Date.now()};document.dispatchEvent(new CustomEvent('finance-cloud-status',{detail:window.__financeCloudStatus}));};
async function request(method,body){const key=getKey();if(!key)throw new Error('sync_not_configured');const r=await fetch(API,{method,headers:{'Content-Type':'application/json','X-Sync-Key':key},body:body?JSON.stringify(body):undefined});const data=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(data.error||('HTTP '+r.status));e.data=data;e.status=r.status;throw e;}return data;}
function localPayload(){return typeof db!=='undefined'?JSON.parse(JSON.stringify(db)):null;}
function redraw(){try{if(typeof renderAll==='function')renderAll();else{if(typeof renderKpis==='function')renderKpis();if(typeof renderCharts==='function')renderCharts();}}catch(e){console.warn('[CloudSync] redraw',e);}}
async function pull({preferCloud=false}={}){if(busy||!getKey())return null;busy=true;setStatus('Sincronizando…','syncing');try{const out=await request('GET');const row=out.state;if(!row){setStatus('Cloud vazio','ready');return null;}const localVersion=Number(localStorage.getItem(VERSION_STORE)||0);if(preferCloud||row.version>localVersion){db=row.payload;localStorage.setItem(STORAGE,JSON.stringify(db));localStorage.setItem(VERSION_STORE,String(row.version));redraw();}setStatus('Sincronizado','ok');return row;}catch(e){setStatus(navigator.onLine?'Erro de sincronização':'Offline',navigator.onLine?'error':'offline');console.warn('[CloudSync] pull',e);return null;}finally{busy=false;}}
async function push(){if(busy||!getKey())return null;busy=true;setStatus('Salvando na nuvem…','syncing');try{const baseVersion=Number(localStorage.getItem(VERSION_STORE)||0);const out=await request('POST',{payload:localPayload(),baseVersion,deviceId});localStorage.setItem(VERSION_STORE,String(out.version));setStatus('Sincronizado','ok');return out;}catch(e){if(e.status===409){setStatus('Atualizando versão…','syncing');busy=false;await pull({preferCloud:true});return null;}setStatus(navigator.onLine?'Erro de sincronização':'Salvo offline',navigator.onLine?'error':'offline');console.warn('[CloudSync] push',e);return null;}finally{busy=false;}}
function schedulePush(){clearTimeout(timer);timer=setTimeout(()=>push(),700);}
window.FinanceCloud={
 configured:()=>!!getKey(),
 status:()=>window.__financeCloudStatus||{text:getKey()?'Pronto':'Não configurado'},
 configure:key=>{key=String(key||'').trim();if(key.length<12)throw new Error('Use uma chave de sincronização com pelo menos 12 caracteres.');localStorage.setItem(KEY_STORE,key);localStorage.setItem(VERSION_STORE,'0');setStatus('Configurado','ready');return pull({preferCloud:true});},
 disconnect:()=>{localStorage.removeItem(KEY_STORE);localStorage.removeItem(VERSION_STORE);setStatus('Cloud desconectado','');},
 pull,push,sync:()=>pull().then(()=>push())
};
const originalSave=typeof window.save==='function'?window.save:null;
if(originalSave){window.save=function(...args){const r=originalSave.apply(this,args);schedulePush();return r;};}
window.addEventListener('online',()=>pull().then(()=>push()));
window.addEventListener('focus',()=>pull());
setInterval(()=>pull(),60000);
if(getKey())setTimeout(()=>pull({preferCloud:true}),1200);else setStatus('Cloud não configurado','');
})();
