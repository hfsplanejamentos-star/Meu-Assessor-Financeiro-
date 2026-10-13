const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const code=fs.readFileSync(path.join(__dirname,"..","assessor-mobile-api.js"),"utf8");
const html=fs.readFileSync(path.join(__dirname,"..","assessor-ia-mobile.html"),"utf8");
const screen=fs.readFileSync(path.join(__dirname,"..","assessor-mobile-screen.js"),"utf8");
for(const id of ["settingsDialog","syncKeyField","connectFinance","disconnectFinance","syncConnectionStatus"])
 assert(html.includes('id="'+id+'"'),"Settings control missing: "+id);
assert(html.includes('id="syncKeyField" type="password"'),"Never display the sync key as plain text");
assert(screen.includes('api.disconnectSync();clearCloudView()'),"Disconnect must remove stale balances");
assert(screen.includes('const result=await api.readFinanceState()'),"Connection must verify real financeState");
assert(screen.includes('if(!result?.state)throw'),"No blind confirmation of a non-existent financeState");
const data=new Map(),headers=[];
const window={
  localStorage:{
    getItem:key=>data.get(key)||null,
    setItem:(key,val)=>data.set(key,String(val)),
    removeItem:key=>data.delete(key)
  },
  fetch:async(url,options)=>{
    headers.push({url,header:options.headers["X-Sync-Key"],method:options.method});
    return{ok:true,status:200,json:async()=>({ok:true,state:{version:8,payload:{accounts:[],transactions:[]}}})};
  },
  SNAKE_ASSESSOR_PREVIEW_ONLY:true
};
vm.runInNewContext(code,{window});
const api=window.SnakeAssessorApi;
const SYNC_KEY="snake-assessor-sync-key-0123456789";
(async()=>{
 assert.equal(api.hasSyncKey(),false);
 await assert.rejects(()=>api.readFinanceState(),/chave de sincroniza/i);
 assert.equal(headers.length,0,"missing key must not send HTTP requests");
 assert.throws(()=>api.setSyncKey("123"),/chave inv[aá]lida/i);
 assert.throws(()=>api.setSyncKey(SYNC_KEY+"\n"),/chave inv[aá]lida/i);
 assert.equal(data.size,0,"invalid keys must not be saved");
 api.setSyncKey(SYNC_KEY);
 assert.equal(api.hasSyncKey(),true);
 const res=await api.readFinanceState();
 assert.equal(res.state.version,8);
 assert.equal(headers.length,1);
 assert.equal(headers[0].header,SYNC_KEY);
 assert.equal(headers[0].method,"GET");
 assert.equal(html.includes(SYNC_KEY),false,"never embed real key in HTML");
 api.disconnectSync();
 assert.equal(api.hasSyncKey(),false);
 await assert.rejects(()=>api.readFinanceState(),/chave de sincroniza/i);
 assert.equal(headers.length,1,"disconnect must stop authorized requests");
 console.log("Assessor sync connection: masked key, verified read-only GET, invalid-key rejection and disconnect PASS");
})().catch(error=>{console.error(error);process.exitCode=1});
