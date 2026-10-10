import assert from "node:assert/strict";
import { planAssessorCashPosting } from "../convex/assessorPosting.ts";

const payload = () => ({
 accounts: [
  {id:"c6",name:"C6 Conta Corrente",type:"Conta corrente",balance:500},
  {id:"xp",name:"XP Metas",type:"Investimento",balance:3000},
  {id:"caju",name:"Caju Alimentação",type:"Benefício",balance:250},
 ],
 cards: [{id:"carbon",name:"C6 Carbon",type:"Crédito"}],
 transactions: [],
 recurring: [{id:"luz",desc:"Luz",value:150,active:true}],
});
const draft = (id,overrides={}) => ({
 draftId:id,amountCents:7800,direction:"expense",account:"c6",
 category:"Transporte",subcategory:"Combustível",description:"Posto",
 date:"2026-10-10",sourceType:"chat",transactionType:"Pix",...overrides,
});

const original=payload();
const first=planAssessorCashPosting(original,draft("draft-0001"));
assert.equal(first.ok,true);
assert.equal(first.updatedBalance,422);
assert.equal(first.payload.accounts[0].balance,422);
assert.equal(first.payload.transactions[0].value,-78);
assert.equal(first.payload.transactions[0].status,"realized");
assert.equal(first.payload.transactions[0].assessorDraftId,"draft-0001");
assert.equal(first.payload.recurring[0].id,"luz");
assert.equal(original.transactions.length,0,"do not mutate original payload");
assert.equal(original.accounts[0].balance,500,"do not mutate original account");

const retry=planAssessorCashPosting(first.payload,draft("draft-0001"));
assert.equal(retry.ok,false);
assert.equal(retry.error,"already_posted");
assert.equal(retry.alreadyPosted,true);

const second=planAssessorCashPosting(first.payload,draft("draft-0002"));
assert.equal(second.ok,true,"same amount, different event ID must be allowed");
assert.equal(second.updatedBalance,344);
assert.equal(second.payload.transactions.length,2);

const income=planAssessorCashPosting(payload(),draft("draft-0003",{direction:"income",amountCents:120050}));
assert.equal(income.ok,true);
assert.equal(income.updatedBalance,1700.5);

const withSource=planAssessorCashPosting(payload(),draft("draft-0004",{sourceType:"notification",sourceId:"evt-01"}));
assert.equal(withSource.ok,true);
assert.equal(planAssessorCashPosting(withSource.payload,draft("draft-0005",{sourceType:"notification",sourceId:"evt-01"})).error,"source_already_registered");
const imported=payload();
imported.transactions.push({id:"bank-01",androidNotificationId:"evt-01"});
assert.equal(planAssessorCashPosting(imported,draft("draft-0006",{sourceType:"notification",sourceId:"evt-01"})).error,"source_already_registered");

assert.equal(planAssessorCashPosting(payload(),draft("draft-0007",{account:"caju"})).error,"special_account_requires_adapter");
assert.equal(planAssessorCashPosting(payload(),draft("draft-0008",{account:"xp"})).error,"special_account_requires_adapter");
assert.equal(planAssessorCashPosting(payload(),draft("draft-0009",{account:"carbon"})).error,"account_not_found_or_ambiguous");
assert.equal(planAssessorCashPosting(payload(),draft("draft-0010",{account:"c6",transactionType:"Crédito"})).error,"payment_type_requires_adapter");
assert.equal(planAssessorCashPosting(payload(),draft("draft-0011",{date:"2026-02-31"})).error,"invalid_date");
assert.equal(planAssessorCashPosting(payload(),draft("draft-0012",{amountCents:0})).error,"invalid_amount");
assert.equal(planAssessorCashPosting(payload(),draft("draft-0013",{account:"wrong"})).error,"account_not_found_or_ambiguous");
const invalidBalance=payload();invalidBalance.accounts[0].balance=Number.NaN;
assert.equal(planAssessorCashPosting(invalidBalance,draft("draft-0014")).error,"invalid_account_balance");
console.log("Assessor posting: 17 assertions/scenarios OK");
