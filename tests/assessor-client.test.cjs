const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const code=fs.readFileSync(require("node:path").join(__dirname,"..","assessor-mobile-api.js"),"utf8");
async function scenario({failPost=false,failRefresh=false,networkError=false}={}){
 const calls=[];let pulled=0;
 const win={
  localStorage:{getItem:()=> "a".repeat(40)},
  crypto:{randomUUID:()=> "00000000-0000-4000-8000-000000000001"},
  FinanceCloud:{pull:async()=>{pulled++;if(failRefresh)throw new Error("sync_unavailable")}},
  fetch:async(url,options)=>{
   calls.push({path:new URL(url).pathname,body:options.body?JSON.parse(options.body):null});
   if(url.endsWith("/assessor/post")&&networkError)throw new Error("network_timeout");
   if(url.endsWith("/assessor/post")&&failPost)return {ok:false,status:409,json:async()=>({ok:false,error:"version_conflict"})};
   return {ok:true,status:200,json:async()=>url.endsWith("/assessor/post")?
     {ok:true,financeStateUpdated:true,version:3}:
     {ok:true,status:"confirmed",financeStateUpdated:false}};
  },
 };
 vm.runInNewContext(code,{window:win});
 assert.equal(calls.length,0,"no automatic posting");
 assert.equal(typeof win.SnakeAssessorApi.confirmCash,"function");
 const id=win.SnakeAssessorApi.newDraftId();
 assert.equal(id.length,36);
 if(failPost||networkError){
  await assert.rejects(win.SnakeAssessorApi.confirmCash(id,2),err=>
    err.code===(networkError?"posting_status_unknown":"confirmed_not_posted"));
  assert.equal(pulled,0);
 }else{
  const result=await win.SnakeAssessorApi.confirmCash(id,2);
  assert.equal(result.posted,true);
  assert.equal(result.syncPending,failRefresh);
  assert.equal(pulled,1);
 }
 assert.deepEqual(calls.map(x=>x.path),["/assessor/decision","/assessor/post"]);
 assert.equal(calls[1].body.draftId,id);
 assert.equal(calls[1].body.baseVersion,2);
}
(async()=>{await scenario();await scenario({failPost:true});await scenario({failRefresh:true});await scenario({networkError:true});console.log("Assessor client: confirmation, sync failure and unknown posting flows OK")})().catch(e=>{console.error(e);process.exitCode=1});
