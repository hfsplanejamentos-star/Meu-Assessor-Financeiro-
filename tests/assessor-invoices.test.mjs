import assert from "node:assert/strict";
import { previewCarbonInvoices } from "../convex/assessorProjection.ts";

const state=()=>({
 cards:[{id:"carbon",name:"C6 Bank Carbon",type:"Crédito",closing:30,due:7}],
 transactions:[
  {id:"charge1",date:"2026-10-12",value:-78,card:"carbon",invoiceMonth:"2026-10",status:"realized"},
  {id:"part1",sourceType:"chat",sourceId:"purchase-1",installmentNo:1,date:"2026-10-29",value:-33.33,card:"carbon",invoiceMonth:"2026-10",status:"realized"},
  {id:"part2",sourceType:"chat",sourceId:"purchase-1",installmentNo:2,date:"2026-11-29",value:-33.33,cardId:"carbon",invoiceMonth:"2026-11",status:"planned"},
  {id:"part3",sourceType:"chat",sourceId:"purchase-1",installmentNo:3,date:"2026-12-29",value:-33.34,account:"carbon",invoiceMonth:"2026-12",status:"planned"},
  {id:"repeat",sourceType:"chat",sourceId:"purchase-1",installmentNo:1,date:"2026-10-29",value:-33.33,card:"carbon",invoiceMonth:"2026-10",status:"realized"},
  {id:"separate-same-value",date:"2026-11-22",value:-33.33,cardId:"carbon",invoiceMonth:"2026-11",status:"planned"},
  {id:"bill-payment",date:"2026-11-07",value:-78,card:"carbon",invoiceMonth:"2026-10",status:"realized",invoicePayment:true,kind:"invoice_payment"},
  {id:"not-carbon",date:"2026-11-05",value:-999,card:"another",invoiceMonth:"2026-11",status:"realized"},
  {id:"cancelled",date:"2026-12-05",value:-50,card:"carbon",invoiceMonth:"2026-12",status:"cancelled"}
 ]
});
const out=previewCarbonInvoices(state(),"carbon","2026-10",3);
assert.equal(out.ok,true);
assert.deepEqual(out.rows.map(r=>r.invoiceMonth),["2026-10","2026-11","2026-12"]);
assert.deepEqual(out.rows.map(r=>r.dueDate),["2026-11-07","2026-12-07","2027-01-07"]);
assert.equal(out.rows[0].committedCents,11133);
assert.equal(out.rows[0].plannedCents,0);
assert.equal(out.rows[0].transactionCount,2);
assert.equal(out.rows[1].committedCents,0);
assert.equal(out.rows[1].plannedCents,6666);
assert.equal(out.rows[1].transactionCount,2,"equal values with separate IDs are separate purchases");
assert.equal(out.rows[2].plannedCents,3334);
assert.equal(out.ledgerUpdated,false);
const badStatus=state();badStatus.transactions[0].status="unknown";
assert.equal(previewCarbonInvoices(badStatus,"carbon","2026-10",3).error,"unrecognized_card_status");
const badDue=state();badDue.cards[0].due=25;
assert.equal(previewCarbonInvoices(badDue,"carbon","2026-10",3).error,"carbon_due_day_conflict");
assert.equal(previewCarbonInvoices(state(),"carbon","2026-00",3).error,"invalid_invoice_range");
assert.equal(previewCarbonInvoices(state(),"carbon","2026-10",25).error,"invalid_invoice_range");
assert.equal(previewCarbonInvoices(state(),"missing","2026-10",3).error,"unsupported_card");
console.log("Assessor invoices: ledger closing month, due day 7, planned versus realized, no invoice payments or duplicate source rows OK");
