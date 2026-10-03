const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const db = {
 meta:{cajuStatementAvailable:1419.88,cajuStatementCredit:1006.89,cajuStatementVersion:'2026-09-30-final',cajuStatementSupplementVersion:'2026-10-03-r277'},
 cards:[{id:'card_caju_alimentacao',balance:1419.88,availableLimit:1419.88}],accounts:[],
 automationState:{cajuMonthlyTopups:{'2026-10':1572.40}},
 transactions:[
  {id:'oct-restored',date:'2026-10-01',desc:'IFD VITOR',value:-36.01,status:'realized',cardId:'card_caju_alimentacao',benefit:true,excludeFromExpense:true},
  {id:'oct-canceled-by-r276',date:'2026-10-02',desc:'Mercado Caju',value:-20,status:'cancelled',cardId:'card_caju_alimentacao',benefit:true,excludeFromExpense:true},
  {id:'oct-user-canceled',date:'2026-10-02',desc:'Compra cancelada pelo usuário',value:-15,status:'realized',cardId:'card_caju_alimentacao',benefit:true,excludeFromExpense:true},
  {id:'oct-planned',date:'2026-10-10',desc:'Delivery futuro',value:-50,status:'planned',cardId:'card_caju_alimentacao',benefit:true,excludeFromExpense:true},
  {id:'sept-existing',date:'2026-09-17',desc:'PADARIA E CONFEITARIA',value:-1,status:'realized',cardId:'card_caju_alimentacao',benefit:true,excludeFromExpense:true}
 ],
 audit:[
  {action:'caju_month_cleared',id:'2026-10:oct-canceled-by-r276',note:'Gastos Caju de outubro cancelados após restauração histórica; migração aplicada uma única vez.'},
  {action:'caju_month_cleared',id:'2026-10:oct-user-canceled',at:'2026-10-02T22:37:09.000Z',note:'Lançamento Caju de outubro cancelado a pedido do usuário; mantido no histórico.'},
  {action:'caju_month_restored',id:'2026-10:oct-canceled-by-r276,oct-user-canceled',note:'R277 restored old transactions'}
 ]
};
const storage={};
const document={readyState:'loading',addEventListener(){}};
const localStorage={getItem:k=>storage[k]||null,setItem:(k,v)=>{storage[k]=String(v)}};
const window={addEventListener(){}};
const context={db,document,localStorage,window,Date,Math,Number,String,Array,Set,Map,JSON,RegExp,Promise,setTimeout(){}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('r103-financial-runtime-guard.js','utf8'),context);
assert.equal(db.transactions.find(t=>t.id==='oct-restored').status,'realized');
assert.equal(db.transactions.find(t=>t.id==='oct-canceled-by-r276').status,'realized','restores only transactions canceled by R276');
assert.equal(db.transactions.find(t=>t.id==='oct-user-canceled').status,'cancelled','preserves an expense explicitly canceled by the user');
assert.equal(db.transactions.find(t=>t.id==='oct-planned').status,'planned');
assert.equal(db.meta.cajuCurrentAvailable,1235.78,'uses the user-reported available balance after October was cleared');
assert.equal(db.meta.cajuCurrentReportedDate,'2026-10-02','restores the latest user-reported Caju balance date');
const count=db.transactions.length,balance=db.cards[0].balance;
const result=context.window.FinanceRuntimeGuard.audit();
assert.equal(db.transactions.length,count,'audit is read-only');
assert.equal(db.cards[0].balance,balance,'audit does not overwrite balances');
assert.equal(result.tests.find(t=>t.name==='Caju saldo finito e consistente').ok,true);
context.window.FinanceRuntimeGuard.establish();
assert.equal(db.transactions.length,count,'migration does not repeat');
db.transactions.push({id:'oct-later',date:'2026-10-03',desc:'Compra Caju',value:-4,status:'realized',cardId:'card_caju_alimentacao',benefit:true,excludeFromExpense:true});
context.window.FinanceRuntimeGuard.establish();
assert.equal(db.cards[0].balance,1231.78,'new realized expenses after the reported balance date update the saved Caju balance');
console.log('R278 Caju balance reconciliation and read-only audit regression passed');
