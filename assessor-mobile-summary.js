/* Financial Q&A from confirmed existing ledger rows; no writes, no guessing.
 * Caju benefit transactions are intentionally included in expense queries,
 * even when marked excludeFromExpense in the general dashboard.
 */
(function(root){
 "use strict";
 const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const settled=t=>!t.status||["realized","real","paid","pago","realizado","realizada","posted","received","recebido"].includes(norm(t.status));
 const transfer=t=>t.transfer||t.transferId||t.invoicePayment||t.cardPayment||
  ["transfer","goal_transfer","invoice_payment","refund","reversal"].includes(norm(t.kind))||
  t.excludeFromBalance||t.excludeFromPatrimony&&t.excludeFromExpense!==true&&t.benefit!==true;
 function categoryQuery(text){
  const s=norm(text);
  if(!/(quanto|total|soma|valor|gastei|gastos|despesas)/.test(s))return null;
  if(/cerveja|chopp|chope/.test(s))return{label:"cerveja",test:t=>/cerveja|chopp|chope|deposito cego/.test(norm([t.cat,t.sub,t.subcategory,t.desc,t.description].join(" ")))};
  if(/combustivel|gasolina|abastec/.test(s))return{label:"combustível",test:t=>/combustivel|gasolina|abastec|posto de gasolina/.test(norm([t.cat,t.sub,t.subcategory,t.desc,t.description].join(" ")))};
  if(/farmacia|medicamento/.test(s))return{label:"farmácia",test:t=>/farmacia|medicamento|drogaria/.test(norm([t.cat,t.sub,t.subcategory,t.desc,t.description].join(" ")))};
  if(/mercado|supermercado/.test(s))return{label:"mercado",test:t=>/mercado|supermercado|hortifruti/.test(norm([t.cat,t.sub,t.subcategory,t.desc,t.description].join(" ")))};
  if(/gastei|gastos|despesas/.test(s))return{label:"despesas",test:()=>true};
  return null;
 }
 function bankOf(t,db){
  const ids=[t.cardId,t.card,t.account,t.accountId].map(String);
  const card=(db.cards||[]).find(c=>ids.includes(String(c.id)));
  const acc=(db.accounts||[]).find(a=>ids.includes(String(a.id)));
  const key=norm([t.origin,t.source,t.bank,t.accountName,t.cardName,card?.name,acc?.name,acc?.institution].filter(Boolean).join(" "));
  if(t.benefit===true||ids.includes("card_caju_alimentacao")||key.includes("caju"))return "Caju";
  if(key.includes("c6")||ids.includes("c6")||ids.includes("acc_c6"))return "C6";
  if(/itau|ita[uú]/.test(key))return "Itaú";
  if(/\bxp\b/.test(key))return "XP";
  return acc?.name||card?.name||"Conta não identificada";
 }
 function summarize(text,payload,month){
  const category=categoryQuery(text);
  if(!category)return null;
  if(!payload||!Array.isArray(payload.transactions))return{supported:true,available:false,reason:"no_ledger"};
  if(!/^\d{4}-\d{2}$/.test(month))return{supported:true,available:false,reason:"invalid_month"};
  const ids=new Set(),origins=new Set(),totals=new Map();let amountCents=0,count=0;
  for(const t of payload.transactions){
    if(!t||typeof t!=="object"||String(t.date||"").slice(0,7)!==month||!settled(t)||transfer(t)||!category.test(t))continue;
    const value=Number(t.value);
    if(!Number.isFinite(value)||value>=0)continue;
    const cents=Math.round(-value*100);
    if(!Number.isSafeInteger(cents)||cents<=0||Math.abs(-value*100-cents)>0.001)continue;
    const uniqueId=t.id===undefined||t.id===null?"":String(t.id);
    const sourceId=t.androidNotificationId||((t.sourceType&&t.sourceId)?String(t.sourceType)+":"+String(t.sourceId):"");
    if((uniqueId&&ids.has(uniqueId))||(sourceId&&origins.has(sourceId)))continue;
    if(uniqueId)ids.add(uniqueId);if(sourceId)origins.add(sourceId);
    const bank=bankOf(t,payload);totals.set(bank,(totals.get(bank)||0)+cents);
    amountCents+=cents;count++;
  }
  return{supported:true,available:true,category:category.label,month,count,totalCents:amountCents,
   byBank:Array.from(totals.entries()).map(([bank,cents])=>({bank,cents})).sort((a,b)=>b.cents-a.cents),
   coverage:"Transações realizadas e identificadas no histórico; inclui Caju. Despesas sem categoria ou descrição identificável podem não ser encontradas."};
 }
 root.SnakeAssessorSummary=Object.freeze({summarize});
})(window);
