const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const w={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"..","assessor-mobile-summary.js"),"utf8"),{window:w});
const ask=w.SnakeAssessorSummary.summarize;
const ledger={
 accounts:[{id:"c6",name:"C6 Conta Corrente",type:"Conta corrente"}],
 cards:[{id:"card_caju_alimentacao",name:"Caju Alimentação"}],
 transactions:[
  {id:"beer-c6",date:"2026-10-10",value:-39,cat:"Alimentação",sub:"Cerveja",account:"c6",status:"realized"},
  {id:"beer-caju",date:"2026-10-10",value:-20,cat:"Alimentação",sub:"Cerveja",card:"card_caju_alimentacao",benefit:true,excludeFromExpense:true,excludeFromPatrimony:true,status:"realized"},
  {id:"pix-1",date:"2026-10-10",value:-15,cat:"Alimentação",sub:"Cerveja",account:"c6",status:"realized"},
  {id:"pix-2",date:"2026-10-10",value:-15,cat:"Alimentação",sub:"Cerveja",account:"c6",status:"realized"},
  {id:"planned",date:"2026-10-10",value:-50,cat:"Alimentação",sub:"Cerveja",account:"c6",status:"planned"},
  {id:"old-month",date:"2026-09-10",value:-40,cat:"Alimentação",sub:"Cerveja",account:"c6",status:"realized"},
  {id:"transfer",date:"2026-10-10",value:-100,cat:"Alimentação",sub:"Cerveja",account:"c6",status:"realized",transfer:true},
  {id:"delivery",date:"2026-10-10",value:-55,cat:"Alimentação",sub:"Delivery",desc:"iFood",card:"card_caju_alimentacao",benefit:true,status:"realized"},
  {id:"notif1",date:"2026-10-10",value:-10,cat:"Alimentação",sub:"Cerveja",account:"c6",status:"realized",androidNotificationId:"notif-11"},
  {id:"notif2",date:"2026-10-10",value:-10,cat:"Alimentação",sub:"Cerveja",account:"c6",status:"realized",androidNotificationId:"notif-11"},
 ]
};
const out=ask("Quanto gastei de cerveja este mês?",ledger,"2026-10");
assert.equal(out.totalCents,9900,"39+20+15+15+10 = 99 BRL");
assert.equal(out.count,5,"two independent 15 BRL payments must remain distinct");
assert.equal(out.byBank.find(x=>x.bank==="Caju").cents,2000,"include Caju despite excludeFromExpense");
assert.equal(out.byBank.find(x=>x.bank==="C6").cents,7900);
assert.equal(ask("Bom dia",ledger,"2026-10"),null,"do not invent an answer");
assert.equal(ask("Quanto gastei de cerveja?",undefined,"2026-10").available,false);
assert.equal(ask("Quanto gastei de cerveja?",ledger,"2026-09").totalCents,4000);
assert.equal(ask("Quanto gastei de combustível?",ledger,"2026-10").totalCents,0);
console.log("Assessor summary: C6 + Caju, same-value Pix, source dedup, month and status tests OK");
