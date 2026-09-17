/* Meu Assessor Financeiro — limpeza controlada dos testes de validação v3 */
(()=>{'use strict';
const DBKEY='assessor_v180_simulacao_ficticia';
const OLD_FLAG='assessor_r69_cleanup_test_cloud_v29_done';
const CENT_FLAG='assessor_r69_cleanup_teste_centavos_final_done';
let attempts=0,done=false;
function run(){
 if(done||localStorage.getItem(CENT_FLAG)==='1')return;
 attempts++;
 if(typeof db!=='object'||!db){if(attempts<40)setTimeout(run,1000);return;}
 const txs=Array.isArray(db.transactions)?db.transactions:[];
 const matches=txs.map((t,i)=>({t,i})).filter(({t})=>String(t.desc||t.description||'').trim().toUpperCase()==='TESTE CENTAVOS FINAL'&&Number(t.value)===-0.01&&String(t.account)==='acc_c6'&&String(t.status)==='realized');
 if(matches.length!==1){if(matches.length===0&&attempts<40)setTimeout(run,1000);else done=true;return;}
 const {t,i}=matches[0];
 const account=(Array.isArray(db.accounts)?db.accounts:[]).find(a=>String(a.id)==='acc_c6');
 if(!account){if(attempts<40)setTimeout(run,1000);return;}
 const oldBalance=Number(account.balance||0);
 try{
   account.balance=Math.round((oldBalance+0.01)*100)/100;
   txs.splice(i,1);
   localStorage.setItem(DBKEY,JSON.stringify(db));
   if(typeof save==='function')save();
   localStorage.setItem(CENT_FLAG,'1');
   localStorage.setItem(OLD_FLAG,'1');
   done=true;
   if(typeof renderAll==='function')renderAll();
   document.dispatchEvent(new CustomEvent('finance-data-changed',{detail:{reason:'cleanup_teste_centavos_final'}}));
 }catch(e){account.balance=oldBalance;if(!txs.includes(t))txs.splice(i,0,t);}
}
function kick(){setTimeout(run,700)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',kick);else kick();
window.addEventListener('focus',kick);window.addEventListener('online',kick);setTimeout(run,2500);setTimeout(run,6000);
})();