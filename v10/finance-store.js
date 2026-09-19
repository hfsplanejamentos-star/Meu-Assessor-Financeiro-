/* V10 FinanceStore — production/real state, versioned and migration-safe */
(()=>{'use strict';
const KEY='meu_assessor_financeiro_v10_real',LEGACY='assessor_v180_simulacao_ficticia',SCHEMA=3;
const clone=x=>JSON.parse(JSON.stringify(x));
const arrays=['accounts','cards','transactions','recurring','investments','invoices','budgets','goals'];
function clean(s){s=s&&typeof s==='object'?clone(s):{};arrays.forEach(k=>s[k]=Array.isArray(s[k])?s[k]:[]);
 s.accounts=s.accounts.filter(a=>!/nubank|btg/i.test(String(a.name||'')));
 s.transactions=s.transactions.filter(t=>!/(demo|fict[ií]ci|simula[cç][aã]o)/i.test([t.source,t.origin,t.desc].join(' ')));
 /* User reset 2026-09-19: remove imported C6 statement rows and severance; keep other real sources such as Caju. */
 s.transactions=s.transactions.filter(t=>{const src=[t.source,t.origin,t.statementPeriod].join(' ');const isC6Statement=/C6 Bank statement/i.test(src)||/^c6_/i.test(String(t.id||''));const isSeverance=String(t.id||'')==='real_rescisao_20260918'||/rescis[aã]o contratual/i.test(String(t.desc||t.description||''));return !isC6Statement&&!isSeverance});
 s.meta={...(s.meta||{}),schemaVersion:SCHEMA,environment:'production',dataMode:'real'};
 return s}
function valid(s){return !!(s&&s.meta?.schemaVersion===SCHEMA&&s.meta?.environment==='production'&&s.meta?.dataMode==='real'&&Array.isArray(s.transactions))}
function migrateSchema(s){s=clean(s);s.meta={...(s.meta||{}),schemaVersion:SCHEMA,environment:'production',dataMode:'real',migratedAt:s.meta?.migratedAt||new Date().toISOString()};return s}
function migrate(){let s;try{s=JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){}
 if(!valid(s)){if(!s){try{s=JSON.parse(localStorage.getItem(LEGACY)||'null')}catch(_){}};s=migrateSchema(s);localStorage.setItem(KEY,JSON.stringify(s))}
 return clean(s)}
let state=migrate(),listeners=new Set();
function persist(reason='save'){state=clean(state);localStorage.setItem(KEY,JSON.stringify(state));try{window.db=state}catch(_){};listeners.forEach(fn=>fn(state,reason));document.dispatchEvent(new CustomEvent('finance-store-changed',{detail:{reason}}));return state}
function get(){return state}
function set(next,reason='set'){state=clean(next);return persist(reason)}
function update(fn,reason='update'){const draft=clone(state);fn(draft);return set(draft,reason)}
function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
function upsertTx(tx){return update(s=>{const i=s.transactions.findIndex(x=>x.id===tx.id);i<0?s.transactions.push(tx):s.transactions.splice(i,1,{...s.transactions[i],...tx})},'transaction')}
function seedKnownReal(){
 update(s=>{
 const tx=[
 {id:'caju_20260918_bakery_3090',date:'2026-09-18',time:'10:26',desc:'Bakery and Confectionery Real',cat:'Alimentação',sub:'Padaria',value:-30.90,status:'posted',source:'Caju',origin:'Caju Crédito',cardId:'card_caju_alimentacao',excludeFromPatrimony:true},
 {id:'caju_20260918_4905',date:'2026-09-18',time:'12:42',desc:'Compra Caju',cat:'Alimentação',value:-49.05,status:'posted',source:'Caju',origin:'Caju Crédito',cardId:'card_caju_alimentacao',excludeFromPatrimony:true}
 ];tx.forEach(t=>{const i=s.transactions.findIndex(x=>x.id===t.id);if(i<0)s.transactions.push(t);else s.transactions[i]={...s.transactions[i],...t}});
 let cj=s.cards.find(c=>c.id==='card_caju_alimentacao');if(cj){cj.limit=1500;cj.balance=881.95;cj.availableLimit=881.95;cj.excludeFromPatrimony=true}\n let c6=s.accounts.find(a=>a.id==='acc_c6');if(c6&&(!c6.balanceDate||c6.balanceDate<'2026-09-18')){c6.balance=1103.67;c6.balanceDate='2026-09-18';c6.source='statement + user-confirmed rescisao'}
 s.meta={...(s.meta||{}),cajuKnownBalance:881.95,cajuKnownBalanceAt:'2026-09-18T12:42:00-03:00',c6KnownBalance:1103.67,c6KnownBalanceAt:'2026-09-18'};
 },'known-real-data')
}
seedKnownReal();window.db=state;
window.FinanceStoreV10={KEY,SCHEMA,get,set,update,subscribe,upsertTx,persist,valid,clean,migrateSchema};
})();