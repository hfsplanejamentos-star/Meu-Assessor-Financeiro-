/* Meu Assessor Financeiro — limpeza controlada do teste identificado v2 */
(()=>{'use strict';
const FLAG='assessor_r69_cleanup_test_cloud_v29_done';
const DBKEY='assessor_v180_simulacao_ficticia';
const TARGET='1789607053514';
let attempts=0,done=false;
function run(){
 if(done||localStorage.getItem(FLAG)==='1')return;
 attempts++;
 if(typeof db!=='object'||!db){if(attempts<40)setTimeout(run,1000);return;}
 const txs=Array.isArray(db.transactions)?db.transactions:[];
 const i=txs.findIndex(t=>String(t.id)===TARGET);
 if(i<0){if(attempts<40)setTimeout(run,1000);return;}
 const t=txs[i],desc=String(t.desc||t.description||'').trim().toUpperCase(),value=Number(t.value);
 if(desc!=='TESTE CLOUD V29'||value!==-1||String(t.account)!=='acc_c6'||String(t.status)!=='realized'){done=true;return;}
 const account=(Array.isArray(db.accounts)?db.accounts:[]).find(a=>String(a.id)==='acc_c6');
 if(!account){if(attempts<40)setTimeout(run,1000);return;}
 const oldBalance=Number(account.balance||0);
 try{
   account.balance=oldBalance+1;
   txs.splice(i,1);
   localStorage.setItem(DBKEY,JSON.stringify(db));
   if(typeof save==='function')save();
   localStorage.setItem(FLAG,'1');
   done=true;
   if(typeof renderAll==='function')renderAll();
   document.dispatchEvent(new CustomEvent('finance-data-changed',{detail:{reason:'cleanup_test_cloud_v29'}}));
 }catch(e){
   account.balance=oldBalance;
   if(!txs.some(x=>String(x.id)===TARGET))txs.splice(i,0,t);
 }
}
function kick(){setTimeout(run,700)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',kick);else kick();
window.addEventListener('focus',kick);window.addEventListener('online',kick);setTimeout(run,2500);setTimeout(run,6000);
})();