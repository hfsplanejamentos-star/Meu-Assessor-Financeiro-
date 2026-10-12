import assert from "node:assert/strict";
import { auditCarbonConfiguration } from "../convex/assessorCarbonAudit.ts";
import { planCarbonConfigRepair } from "../convex/assessorCarbonRepair.ts";

const stamp="2026-10-12T20:50:00.000Z";
const state=()=>({
 accounts:[{id:"c6",balance:500}],cards:[{id:"carbon",name:"C6 Carbon",type:"Crédito",closing:30,due:25,limit:2500}],
 transactions:[],invoices:[],recurring:[{id:"r1",value:10}],auditLog:[]
});
const clean=state();
const audit=auditCarbonConfiguration(clean,"carbon");
assert.equal(audit.ok,true);
assert.equal(audit.status,"safe_metadata_only");
assert.equal(audit.safeMetadataOnly,true);
assert.equal(audit.configuredClosing,30);
assert.equal(audit.configuredDue,25);
assert.equal(audit.expectedClosing,5);
assert.equal(audit.expectedDue,7);
const plan=planCarbonConfigRepair(clean,"carbon",stamp);
assert.equal(plan.ok,true);
assert.equal(plan.updated,true);
assert.equal(plan.payload.cards[0].closing,5);
assert.equal(plan.payload.cards[0].due,7);
assert.equal(plan.payload.accounts[0].balance,500);
assert.equal(plan.payload.transactions.length,0);
assert.equal(plan.payload.recurring[0].id,"r1");
assert.equal(plan.payload.auditLog[0].action,"edit");
assert.equal(clean.cards[0].closing,30,"pure plan must not modify original");
assert.equal(clean.auditLog.length,0,"pure plan must not modify original audit log");
assert.equal(planCarbonConfigRepair(plan.payload,"carbon",stamp).alreadyAligned,true);

const withTransactions=state();
withTransactions.transactions=[
 {id:"tx-1",date:"2026-10-06",value:-78,cardId:"carbon",status:"realized"},
 {id:"tx-2",date:"2026-10-04",value:-15,card:"carbon",invoiceMonth:"2026-10",status:"realized"},
 {id:"tx-3",date:"2026-10-12",value:-20,card:"carbon",invoiceMonth:"2026-10",status:"planned"},
 {id:"pay",date:"2026-10-25",value:-100,card:"carbon",kind:"invoice_payment",invoicePayment:true}
];
const history=auditCarbonConfiguration(withTransactions,"carbon");
assert.equal(history.transactions,3,"ignore invoice payment transaction");
assert.equal(history.missingInvoiceMonth,1);
assert.equal(history.cycleMismatch,2,"Oct 6 and Oct 12 shift to November");
assert.equal(history.explicitPreserved,2);
assert.equal(history.affected.length,2);
assert.equal(history.status,"manual_reconciliation_required");
const blocked=planCarbonConfigRepair(withTransactions,"carbon",stamp);
assert.equal(blocked.ok,false);
assert.equal(blocked.error,"carbon_history_requires_reconciliation");
assert.equal(withTransactions.cards[0].closing,30);
assert.equal(withTransactions.transactions.length,4);

const paid=state();paid.invoices=[
 {id:"inv1",cardId:"carbon",month:"2026-09",status:"paid",paidAt:"2026-10-25T00:00:00Z",dueDate:"2026-10-25"}
];
const paidAudit=auditCarbonConfiguration(paid,"carbon");
assert.equal(paidAudit.invoices,1);
assert.equal(paidAudit.paidInvoices,1);
assert.equal(paidAudit.dueDateConflicts,1);
assert.equal(paidAudit.safeMetadataOnly,false);
assert.equal(planCarbonConfigRepair(paid,"carbon",stamp).ok,false);

const aligned=state();aligned.cards[0].closing=5;aligned.cards[0].due=7;
aligned.transactions=[{id:"past",date:"2026-10-04",card:"carbon",value:-10,status:"realized"}];
const alignedPlan=planCarbonConfigRepair(aligned,"carbon",stamp);
assert.equal(alignedPlan.ok,true);
assert.equal(alignedPlan.alreadyAligned,true);
assert.equal(alignedPlan.updated,false);
assert.equal(aligned.auditLog.length,0);
const duplicate=state();duplicate.cards.push({...duplicate.cards[0]});
assert.equal(auditCarbonConfiguration(duplicate,"carbon").error,"card_not_found_or_ambiguous");
assert.equal(auditCarbonConfiguration(state(),"missing").error,"card_not_found_or_ambiguous");
assert.equal(auditCarbonConfiguration(null,"carbon").error,"invalid_finance_payload");
console.log("Assessor Carbon settings: history-free metadata-only repair, version-gated mutation planner, paid invoices and legacy cycles PASS");
