const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,"..");
const ui=fs.readFileSync(path.join(root,"assessor-mobile-screen.js"),"utf8");
const html=fs.readFileSync(path.join(root,"assessor-ia-mobile.html"),"utf8");
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
for(const required of ["syncKeyField","syncConnectionStatus","connectFinance","disconnectFinance"])
 assert(ids.includes(required),"Missing sync control "+required);
class Element{
 constructor(){this.value="";this.textContent="";this.style={};this.dataset={};this.events={};this.options=[];
 this.children=[];this.classList={toggle(){}};this.disabled=false;this.scrollHeight=100;this.scrollTop=0}
 addEventListener(n,f){this.events[n]=f}replaceChildren(...xs){this.options=xs;this.children=xs}
 add(x){this.options.push(x)}append(...xs){this.children.push(...xs)}appendChild(x){this.children.push(x)}
 insertBefore(x){this.children.push(x)}showModal(){this.open=true}close(){this.open=false}
 querySelectorAll(){return[]}querySelector(){return null}
}
const registry=new Map(),get=id=>{if(!registry.has(id))registry.set(id,new Element());return registry.get(id)};
const document={getElementById:get,createElement:()=>new Element(),querySelectorAll:()=>[],querySelector:()=>new Element(),addEventListener:()=>{}};
const storage=new Map(),localStorage={
 getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)
};
const keyName="assessor_cloud_sync_key";
let nextRead;
let reads=0,posts=0;
const accountState=()=>({version:3,payload:{accounts:[{id:"c6",name:"C6 Conta Corrente",type:"Conta corrente",balance:123.45}],cards:[],transactions:[]}});
const api={
 hasSyncKey:()=>Boolean(storage.get(keyName)),
 setSyncKey:value=>{if(value.length<32)throw Error("invalid_key");storage.set(keyName,value)},
 disconnectSync:()=>{storage.delete(keyName)},
 readFinanceState:async()=>{reads++;return nextRead?nextRead():{state:accountState()}},
 newDraftId:()=> "draft-12345678",
 interpretText:async()=>null,
 prepare:async()=>{posts++;throw Error("posting forbidden")}
};
const window={localStorage,SnakeAssessorApi:api,scrollTo:()=>{},confirm:()=>true,
 SNAKE_ASSESSOR_PREVIEW_ONLY:true};
const context={window,document,localStorage,Option:function(label,value){this.textContent=label;this.value=value},setTimeout:()=>1,clearTimeout:()=>{},console};
vm.runInNewContext(ui,context);
(async()=>{
 assert.equal(reads,0,"no auto-reading without key");
 assert.match(get("syncConnectionStatus").textContent,/Não conectado/);
 get("settingsBtn").onclick();
 assert.equal(get("settingsDialog").open,true);
 assert.equal(get("syncKeyField").value,"");
 const key="snake-sync-valid-key-0123456789-abcdef";
 get("syncKeyField").value=key;
 await get("connectFinance").onclick();
 assert.equal(reads,1);
 assert.equal(storage.get(keyName),key);
 assert.match(get("syncConnectionStatus").textContent,/Conectado/);
 assert.equal(get("balanceC6").textContent,"R$ 123,45");
 assert.equal(get("syncKeyField").value,"","do not retain key in visible DOM");

 // Replacing an existing key with one that has no financeState must roll back.
 get("syncKeyField").value="another-snake-key-0123456789-abcdef";
 nextRead=async()=>({state:null});
 await get("connectFinance").onclick();
 assert.equal(storage.get(keyName),key);
 assert.equal(get("syncKeyField").value,"");

 // Disconnection must hide balances and prevent a pending refresh from reviving them.
 let finish;
 nextRead=()=>new Promise(resolve=>{finish=resolve});
 const pending=get("refreshState").onclick();
 await Promise.resolve();
 await get("disconnectFinance").onclick();
 assert.equal(storage.has(keyName),false);
 assert.equal(get("balanceC6").textContent,"—");
 assert.match(get("syncConnectionStatus").textContent,/Não conectado/);
 finish({state:accountState()});
 await pending;
 assert.equal(get("balanceC6").textContent,"—");
 assert.equal(posts,0);
 console.log("Assessor UI connection: explicit read-only connection, bad-key rollback, hidden key, disconnect race PASS");
})().catch(e=>{console.error(e);process.exitCode=1});
