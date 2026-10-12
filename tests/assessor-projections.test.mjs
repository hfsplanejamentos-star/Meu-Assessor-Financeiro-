import assert from "node:assert/strict";
import {previewCarbonInstallments,previewCajuMonth} from "../convex/assessorProjection.ts";

const base=()=>({
 cards:[
  {id:"card_c6_carbon",name:"C6 Bank Carbon",type:"Crédito",due:7,closing:30,limit:2500},
  {id:"card_caju_alimentacao",name:"Caju Alimentação",type:"Benefício",balance:400}
 ],
 transactions:[],
 meta:{
  cajuOpeningByMonth:{"2026-10":250},
  cajuRechargeByMonth:{"2026-09":5000,"2026-10":1500}
 }
});
const request=(date,installments=3,totalCents=10000)=>({
 cardId:"card_c6_carbon",purchaseDate:date,installments,totalCents
});
const before=previewCarbonInstallments(base(),request("2026-10-29"));
assert.equal(before.ok,true);
assert.deepEqual(before.rows.map(r=>r.dueDate),["2026-11-07","2026-12-07","2027-01-07"]);
assert.deepEqual(before.rows.map(r=>r.amountCents),[3333,3333,3334]);
assert.equal(before.rows.reduce((sum,r)=>sum+r.amountCents,0),10000);
const after=previewCarbonInstallments(base(),request("2026-10-31"));
assert.equal(after.ok,true);
assert.deepEqual(after.rows.map(r=>r.dueDate),["2026-12-07","2027-01-07","2027-02-07"]);
assert.equal(new Set(after.rows.map(r=>r.invoiceMonth)).size,3,"one installment per billing cycle");
assert.equal(after.ledgerUpdated,false);
assert.equal(after.requiresLedgerCompatibilityReview,true);
const single=previewCarbonInstallments(base(),request("2026-10-12",1,7800));
assert.equal(single.ok,true);
assert.equal(single.rows[0].dueDate,"2026-11-07");
assert.equal(single.rows[0].amountCents,7800);
assert.equal(previewCarbonInstallments(base(),request("2026-02-30")).error,"invalid_date");
assert.equal(previewCarbonInstallments(base(),request("2026-10-10",49)).error,"invalid_installment_count");
const noClosing=base();delete noClosing.cards[0].closing;
assert.equal(previewCarbonInstallments(noClosing,request("2026-10-10")).error,"closing_day_missing");
const wrongDue=base();wrongDue.cards[0].due=25;
assert.equal(previewCarbonInstallments(wrongDue,request("2026-10-10")).error,"carbon_due_day_conflict");
const wrongCard=previewCarbonInstallments(base(),{...request("2026-10-10"),cardId:"card_caju_alimentacao"});
assert.equal(wrongCard.error,"unsupported_card");

const caju=base();
caju.transactions.push(
 {id:"beer-1",date:"2026-10-12",value:-15,card:"card_caju_alimentacao",benefit:true,status:"realized",desc:"Padaria"},
 {id:"beer-2",date:"2026-10-12",value:-15,card:"card_caju_alimentacao",benefit:true,status:"realized",desc:"Padaria"},
 {id:"draft-3",date:"2026-10-13",value:-50,card:"card_caju_alimentacao",benefit:true,status:"planned"},
 {id:"refund-4",date:"2026-10-14",value:5,card:"card_caju_alimentacao",benefit:true,status:"realized",desc:"Estorno compra"}
);
const snap=previewCajuMonth(caju,"2026-10");
assert.equal(snap.ok,true);
assert.equal(snap.openingCents,25000);
assert.equal(snap.rechargeCents,150000);
assert.equal(snap.expensesCents,3000);
assert.equal(snap.refundsCents,500);
assert.equal(snap.availableCents,172500,"250 + 1500 - 15 - 15 + 5");
assert.equal(snap.ledgerUpdated,false);
assert.equal(previewCajuMonth(caju,"2026-11").error,"caju_opening_or_recharge_unverified");
const missingPrevious=base();delete missingPrevious.meta.cajuOpeningByMonth;
assert.equal(previewCajuMonth(missingPrevious,"2026-10").error,"caju_opening_or_recharge_unverified");
const duplicated=base();
duplicated.transactions.push(
 {id:"entry-A",sourceType:"notification",sourceId:"event-1",date:"2026-10-14",card:"card_caju_alimentacao",value:-20,status:"realized"},
 {id:"entry-B",sourceType:"notification",sourceId:"event-1",date:"2026-10-14",card:"card_caju_alimentacao",value:-20,status:"realized"}
);
assert.equal(previewCajuMonth(duplicated,"2026-10").expensesCents,2000,"same source dedup once");
console.log("Assessor projections: due day 7, unique invoices, cents precision, Caju opening/recharge and duplicate IDs OK");
