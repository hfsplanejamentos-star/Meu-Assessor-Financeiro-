const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const js=fs.readFileSync(path.join(__dirname,"..","assessor-mobile-api.js"),"utf8");
const syncKey="assessor-test-key-0123456789-abcdefgh";
const calls=[];
const window={
 SNAKE_ASSESSOR_PREVIEW_ONLY:true,
 localStorage:{getItem:()=>syncKey},
 fetch:async(url,options)=>{
  calls.push({url,method:options.method});
  return{ok:true,status:200,json:async()=>({ok:true,state:null})};
 }
};
vm.runInNewContext(js,{window});
const api=window.SnakeAssessorApi;
(async()=>{
 for(const [label,fn] of [
  ["prepare",()=>api.prepare({draftId:"notif-12345678",sourceType:"notification",amountCents:1500})],
  ["confirm",()=>api.confirm("notif-12345678")],
  ["reject",()=>api.reject("notif-12345678")],
  ["postCash",()=>api.postCash("notif-12345678")],
  ["confirmCash",()=>api.confirmCash("notif-12345678")],
  ["repairCarbonSettings",()=>api.repairCarbonSettings("card-carbon",1)]
 ]){
  await assert.rejects(fn,error=>error.code==="preview_read_only",label+" must fail closed");
  assert.equal(calls.length,0,"no backend write attempted: "+label);
 }
 const state=await api.readFinanceState();
 assert.equal(state.ok,true,"read-only preview must still allow viewing finance state");
 assert.equal(calls.length,1);
 assert.equal(calls[0].method,"GET");
 assert(calls[0].url.includes("/finance/state"));
 await api.interpretText("Qual foi o total?",{});
 assert.equal(calls.length,2,"AI interpretation can be posted as a read-only analysis");
 assert(calls[1].url.includes("/ai/finance"));
 assert.equal(calls[1].method,"POST");
 console.log("Assessor preview API: all financial mutations blocked, GET and non-ledger analysis permitted PASS");
})().catch(error=>{console.error(error);process.exitCode=1});
