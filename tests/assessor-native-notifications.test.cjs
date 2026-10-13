const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const code=fs.readFileSync(path.join(__dirname,"..","assessor-mobile-notifications.js"),"utf8");
const BASE=Date.UTC(2026,9,13,15,0,0);
const event=(id,extra={})=>({
 id,sourcePackage:"com.c6bank.app",title:"Pix enviado",
 text:"Pagamento R$ 15,00 para Loja A",amountCents:1500,
 direction:"expense",postedAt:BASE,...extra
});
function load(events,{available=true}={}){
 const acknowledged=[];
 const android={
  getPendingNotifications:()=>JSON.stringify(events),
  acknowledgeNotifications:json=>{
   acknowledged.push(...JSON.parse(json));return true;
  }
 };
 const window=available?{AndroidBridge:android}:{};
 vm.runInNewContext(code,{window});
 return{api:window.SnakeAssessorNativeNotifications,acknowledged,android};
}
const source=[
 event("event-0000001"),
 event("event-0000002"), // Same bank, amount, timestamp and text: distinct operation
 event("event-0000002"), // Actual same notification: re-delivery, count once
 event("event-0000003",{sourcePackage:"com.google.android.apps.walletnfcrel"}),
 event("event-0000004",{sourcePackage:"br.com.itau",title:"Compra aprovada",text:"Crédito de R$ 39,00",amountCents:3900}),
 event("event-0000005",{sourcePackage:"com.caju.employee",title:"Pagamento aprovado",text:"Compra R$ 26,99",amountCents:2699}),
 event("event-0000006",{sourcePackage:"br.com.xp.carteira",title:"Pix recebido",direction:"income",text:"R$ 100,00"})
];
const {api,acknowledged}=load(source);
const result=api.list();
assert.equal(result.available,true);
assert.equal(result.error,null);
assert.equal(result.rows.length,5);
assert.equal(result.invalid,1);
assert.equal(result.rows.filter(r=>r.amountCents===1500).length,2);
assert.equal(result.rows[0].sourceId,"event-0000001");
assert.equal(result.rows[0].sourceType,"notification");
assert.equal(result.rows[0].paymentType,"Pix");
assert.equal(result.rows[3].bank,"Caju");
assert.equal(result.rows[4].direction,"income");
assert.equal(result.rows[2].bank,"Itaú");
assert.equal(result.rows[2].paymentType,"Crédito");
assert.equal(acknowledged.length,0,"listing must not discard or post transactions");
assert.equal(api.acknowledge("event-0000001"),true);
assert.equal(acknowledged.length,1);
assert.equal(acknowledged[0],"event-0000001");
assert.equal(api.acknowledge(""),false);
assert.equal(acknowledged.length,1);

const unknown=load([event("event-0000007",{direction:"unknown",title:"Aviso",text:"R$ 50,00"})]).api.list();
assert.equal(unknown.rows[0].direction,"","ambiguous direction requires user choice");
assert.equal(unknown.rows[0].paymentType,"","unknown payment type requires user choice");
assert.equal(load([],{available:false}).api.list().available,false);
const corrupt=load([event("event-0000008")]);
corrupt.android.getPendingNotifications=()=>"{broken";
assert.equal(corrupt.api.list().error,"native_queue_unreadable");
console.log("Assessor Android bridge: unique notifications, C6/Caju/Itaú/XP, privacy, explicit ACK and review-only PASS");
