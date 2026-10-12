const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
const start=html.indexOf("function uniqueCajuTransactionRefs(");
const end=html.indexOf("function cajuSnapshot(",start);
assert(start>0&&end>start,"missing source-identity Caju guard");
const helper=new Function(html.slice(start,end)+";return uniqueCajuTransactionRefs;")();
const rows=[
 {id:"pix-15-1",date:"2026-10-12",value:-15,desc:"Padaria Caju",benefit:true},
 {id:"pix-15-2",date:"2026-10-12",value:-15,desc:"Padaria Caju",benefit:true},
 {id:"capture-1",sourceType:"notification",sourceId:"event-A",date:"2026-10-12",value:-20,desc:"Padaria Caju"},
 {id:"capture-2",sourceType:"notification",sourceId:"event-A",date:"2026-10-12",value:-20,desc:"Padaria Caju"},
 {date:"2026-10-12",value:-12,desc:"Sem ID"},
 {date:"2026-10-12",value:-12,desc:"Sem ID"}
];
const got=helper(rows);
assert.equal(got.length,5,"distinct same-value purchases must remain; same source event dedup once");
assert.deepEqual(got.map(t=>t.id),["pix-15-1","pix-15-2","capture-1",undefined,undefined]);
const snapshot=html.slice(html.indexOf("function cajuSnapshot("),html.indexOf("function cajuBalanceAt("));
const cajuRows=html.slice(html.indexOf("function cajuTxRows("),html.indexOf("function cajuNormalizedSub("));
assert(snapshot.includes("uniqueCajuTransactionRefs(raw)"),"monthly Caju snapshot must use source IDs");
assert(cajuRows.includes("return uniqueCajuTransactionRefs("),"category rows must use same dedup");
assert(!snapshot.includes("Number(t.value||0).toFixed(2)")&&!cajuRows.includes("Number(t.value||0).toFixed(2)"),"no value-based Caju dedup");
const rechargeStart=snapshot.indexOf("const isCajuRecharge=");
const rechargeEnd=snapshot.indexOf("const refunds=",rechargeStart);
assert(rechargeStart>=0&&rechargeEnd>rechargeStart,"recharge guard must exist");
const isCajuRecharge=new Function(snapshot.slice(rechargeStart,rechargeEnd)+";return isCajuRecharge;")();
assert(isCajuRecharge({desc:"Recarga Caju Outubro"}));
assert(isCajuRecharge({sub:"Crédito benefício"}));
assert(isCajuRecharge({description:"Caju Benefícios"}));
assert(!isCajuRecharge({desc:"Estorno de compra no mercado"}));
assert(!isCajuRecharge({desc:"Pix recebido"}));
assert(snapshot.includes("!isCajuRecharge(t)"),"recharges should not be counted as refunds");
console.log("Legacy Caju: distinct equal amounts preserved, duplicate source collapsed, snapshot/chart share rule");
