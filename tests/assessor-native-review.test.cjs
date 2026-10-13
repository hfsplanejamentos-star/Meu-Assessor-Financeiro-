const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const root=path.join(__dirname,"..");
const bridgeCode=fs.readFileSync(path.join(root,"assessor-mobile-notifications.js"),"utf8");
const screenCode=fs.readFileSync(path.join(root,"assessor-mobile-screen.js"),"utf8");
const html=fs.readFileSync(path.join(root,"assessor-ia-mobile.html"),"utf8");
assert(html.includes('src="./assessor-mobile-notifications.js"'));
class El{
 constructor(tag="div"){this.tag=tag;this.children=[];this.style={};this.value="";
  this.textContent="";this.dataset={};this.options=[];this.hidden=false;
  this.events={};this.scrollHeight=99;this.scrollTop=0;this.disabled=false;this.classList={toggle(){}}}
 addEventListener(k,fn){this.events[k]=fn}replaceChildren(...xs){this.children=xs;this.options=xs}
 append(...xs){this.children.push(...xs)}appendChild(x){this.children.push(x)}insertBefore(x){this.children.push(x)}
 add(x){this.options.push(x)}showModal(){this.open=true}close(){this.open=false}
 querySelectorAll(q){if(q!=="button")return[];let out=[];
  const walk=x=>{if(x.tag==="button")out.push(x);for(const child of x.children)walk(child)};
  walk(this);return out}
 querySelector(q){if(q!==".invoice-projection"&&q!=="#reviewStatus")return new El();
  let out=null;const walk=x=>{if(x.id==="reviewStatus"&&q==="#reviewStatus")out=x;for(const child of x.children)walk(child)};
  walk(this);return out}
}
function Option(label,value){this.textContent=label;this.value=value}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new El());return elements.get(id)};
const document={getElementById:get,createElement:t=>new El(t),querySelectorAll:()=>[],
 querySelector:()=>new El(),addEventListener:()=>{}};
const storage={getItem:()=>null,setItem:()=>{}};
const postedAt=Date.UTC(2026,9,13,14,0,0);
const events=[
 {id:"notification-001",sourcePackage:"com.c6bank.app",title:"Pix enviado",text:"R$ 15,00 para Loja",
  amountCents:1500,direction:"expense",postedAt},
 {id:"notification-002",sourcePackage:"com.c6bank.app",title:"Pix enviado",text:"R$ 15,00 para Loja",
  amountCents:1500,direction:"expense",postedAt:postedAt+1000}
];
const ack=[],prepared=[],posted=[];
const android={
 getPendingNotifications:()=>JSON.stringify(events.filter(x=>!ack.includes(x.id))),
 acknowledgeNotifications:json=>{ack.push(...JSON.parse(json));return true}
};
const state={version:1,payload:{accounts:[{id:"c6",name:"C6 Conta Corrente",
  type:"Conta corrente",balance:100}],cards:[],transactions:[]}};
let draftCounter=0;
const window={AndroidBridge:android,localStorage:storage,scrollTo:()=>{},confirm:()=>true,
 SnakeAssessorApi:{
  newDraftId:()=> "native-draft-"+String(++draftCounter).padStart(6,"0"),
  readFinanceState:async()=>({state}),
  interpretText:async()=>null,
  prepare:async d=>{prepared.push({...d});return{ok:true,duplicate:false,draftId:d.draftId}},
  confirmCash:async id=>{
    posted.push(id);const from=prepared.find(d=>d.draftId===id);
    state.payload.transactions.push({id:"assessor_"+id,sourceType:from.sourceType,
     sourceId:from.sourceId,value:-from.amountCents/100});
    state.payload.accounts[0].balance-=from.amountCents/100;
    state.version++;
    return{posted:true,syncPending:false};
  }
 }};
const ctx={window,document,localStorage:storage,Option,setTimeout:()=>1,clearTimeout:()=>{},console};
async function wait(){for(let i=0;i<12;i++)await Promise.resolve()}
vm.runInNewContext(bridgeCode,ctx);
vm.runInNewContext(screenCode,ctx);
async function confirmCurrent(){
 const preview=get("draftMount").children[0];
 assert(preview,"expected a review card");
 let buttons=preview.querySelectorAll("button");
 await buttons[0].onclick(); // missing account -> opens editor, must not post
 assert.equal(prepared.length,posted.length);
 get("fieldAccount").value="c6";
 get("fieldPayment").value="Pix";
 get("fieldDirection").value="expense";
 get("fieldCategory").value="Transporte";
 get("fieldDescription").value="Pix de teste";
 get("draftForm").onsubmit({preventDefault(){}});
 buttons=get("draftMount").children[0].querySelectorAll("button");
 await buttons[0].onclick(); // explicit confirmed posting
 await wait();
}
(async()=>{
 await wait();
 assert.equal(prepared.length,0,"startup must not prepare or post");
 assert.equal(posted.length,0);
 assert.equal(ack.length,0,"listing must not ack");
 assert(get("draftMount").children[0],"new native event must open a review");
 await confirmCurrent();
 assert.equal(prepared.length,1);
 assert.equal(posted.length,1);
 assert.equal(ack.length,1);
 assert.equal(prepared[0].sourceType,"notification");
 assert.equal(prepared[0].sourceId,"notification-001","source identity must reach backend");
 assert.equal(state.payload.accounts[0].balance,85);
 assert(get("draftMount").children[0],"second equal-value Pix must await review");
 assert.equal(ack.includes("notification-002"),false);
 await confirmCurrent();
 assert.equal(prepared.length,2);
 assert.equal(posted.length,2);
 assert.equal(ack.length,2);
 assert.notEqual(prepared[0].sourceId,prepared[1].sourceId);
 assert.equal(state.payload.accounts[0].balance,70);
 window.meuAssessorAndroidAutoSync();
 await wait();
 assert.equal(posted.length,2,"redelivery must not silently post");
 // Caju remains a special benefit account, not silently debited as cash.
 state.payload.cards.push({id:"caju-card",name:"Caju Alimentação",type:"Benefício"});
 events.push({id:"notification-caju-003",sourcePackage:"com.caju.employee",
  title:"Compra aprovada",text:"R$ 26,99 na padaria",amountCents:2699,
  direction:"expense",postedAt:postedAt+2000});
 window.meuAssessorAndroidAutoSync();
 await wait();
 const cajuPreview=get("draftMount").children[0];
 assert(cajuPreview,"Caju notification must be visible for review");
 const cajuButtons=cajuPreview.querySelectorAll("button");
 await cajuButtons[0].onclick();
 assert.equal(posted.length,2,"benefit must not use a cash account posting");
 assert.equal(prepared.length,2,"benefit must not prepare a cash draft");
 assert.equal(ack.includes("notification-caju-003"),false,
  "unsupported Caju operation stays in encrypted native queue");
 await cajuButtons[2].onclick(); // explicit discard confirmation
 assert.equal(ack.includes("notification-caju-003"),true,
  "only confirmed discard should clear an unposted Caju event");
 assert.equal(posted.length,2);
 // A debug preview must never invoke the backend posting path, even if
 // the user taps its financial confirmation button.
 window.SNAKE_ASSESSOR_PREVIEW_ONLY=true;
 events.push({id:"notification-preview-004",sourcePackage:"com.c6bank.app",
  title:"Pix enviado",text:"R$ 40,00 para Posto",amountCents:4000,
  direction:"expense",postedAt:postedAt+3000});
 window.meuAssessorAndroidAutoSync();
 await wait();
 const previewGuarded=get("draftMount").children[0];
 assert(previewGuarded,"debug preview must still display the alert for checking");
 await previewGuarded.querySelectorAll("button")[0].onclick();
 assert.equal(prepared.length,2);
 assert.equal(posted.length,2);
 assert.equal(ack.includes("notification-preview-004"),false,
  "preview cannot acknowledge unposted bank expense");
 console.log("Assessor native review: equal-value Pix, Caju guard, explicit discard and read-only debug APK PASS");
})().catch(error=>{console.error(error);process.exitCode=1});
