/* Meu Assessor Financeiro — limpeza controlada do teste identificado */
(()=>{'use strict';
const FLAG='assessor_r69_cleanup_test_cloud_v29_done';
const DBKEY='assessor_v180_simulacao_ficticia';
const TARGET='1789607053514';
function run(){
 if(localStorage.getItem(FLAG)==='1'||typeof db!=='object'||!db)return;
 const txs=Array.isArray(db.transactions)?db.transactions:[];
 const i=txs.findIndex(t=>String(t.id)===TARGET);
 if(i<0)return;
 const t=txs[i];
 const desc=String(t.desc||t.description||'').trim().toUpperCase();
 const value=Number(t.value);
 if(desc!=='TESTE CLOUD V29'||value!==-1||String(t.account)!=='acc_c6'||String(t.status)!=='realized')return;
 const account=(Array.isArray(db.accounts)?db.accounts:[]).find(a=>String(a.id)==='acc_c6');
 if(!account)return;
 account.balance=Number(account.balance||0)+1;
 txs.splice(i,1);
 try{
   localStorage.setItem(DBKEY,JSON.stringify(db));
   localStorage.setItem(FLAG,'1');
   if(typeof save==='function')save();
   if(typeof renderAll==='function')renderAll();
   document.dispatchEvent(new CustomEvent('finance-data-changed',{detail:{reason:'cleanup_test_cloud_v29'}}));
 }catch(e){
   account.balance=Number(account.balance||0)-1;
   txs.splice(i,0,t);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,1800));else setTimeout(run,1800);
})();