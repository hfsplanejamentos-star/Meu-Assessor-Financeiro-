const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"assessor-ia-mobile.html"),"utf8");
const screen=fs.readFileSync(path.join(root,"assessor-mobile-screen.js"),"utf8");
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
const references=[...screen.matchAll(/\$\("([^"]+)"\)/g)].map(x=>x[1]);
for(const id of references)assert(ids.has(id)||id==="reviewStatus","missing DOM id: "+id);
for(const name of ["screenHome","screenChat","screenAgenda","draftDialog","photoFile","documentFile","voiceBtn"])
 assert(ids.has(name),"missing screen control: "+name);
for(const t of ["dourado","limao","branco"])assert(html.includes('data-theme-option="'+t+'"'));
assert(html.includes('src="./assessor-mobile-api.js"')&&html.includes('src="./assessor-mobile-screen.js"'));

class El{
 constructor(tag="div"){this.tag=tag;this.children=[];this.style={};this.value="";this.textContent="";this.dataset={};this.options=[];this.events={};this.classList={toggle(){}};this.scrollHeight=99;this.disabled=false}
 addEventListener(name,fn){this.events[name]=fn}replaceChildren(...xs){this.children=xs;this.options=xs}
 append(...xs){this.children.push(...xs)}appendChild(x){this.children.push(x)}insertBefore(x){this.children.push(x)}add(x){this.options.push(x)}
 showModal(){this.open=true}close(){this.open=false}
 querySelectorAll(selector){
  if(selector!=="button")return [];
  const result=[],walk=x=>{if(x.tag==="button")result.push(x);for(const child of x.children)walk(child)};
  walk(this);return result
 }
 querySelector(selector){
  if(selector!=="#reviewStatus")return new El();
  let result;const walk=x=>{if(x.id==="reviewStatus")result=x;for(const child of x.children)walk(child)};
  walk(this);return result
 }
}
function Option(text,value){this.textContent=text;this.value=value}
async function scenario(accountType,duplicate=false){
 const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new El());return elements.get(id)};
 const document={getElementById:get,createElement:t=>new El(t),querySelectorAll:()=>[],querySelector:()=>new El(),addEventListener:()=>{}};
 const localStorage={getItem:()=>null,setItem:()=>{}};
 let prepares=0,posts=0,reads=0;
 const account={id:accountType==="Benefício"?"caju":"c6",name:accountType==="Benefício"?"Caju Alimentação":"C6 Conta Corrente",type:accountType,balance:500};
 const window={localStorage,scrollTo:()=>{},SnakeAssessorApi:{
  hasSyncKey:()=>true,
  newDraftId:()=> "draft-00001",readFinanceState:async()=>{reads++;return{state:{version:3,payload:{accounts:[account],transactions:[],cards:[]}}}},
  interpretText:async()=>null,prepare:async()=>{prepares++;return{ok:true,duplicate,draftId:"draft-00001"}},
  confirmCash:async()=>{posts++;return{posted:true,syncPending:false}}
 }};
 vm.runInNewContext(screen,{window,document,localStorage,Option,setTimeout:()=>1,clearTimeout:()=>{},console});
 for(let i=0;i<4;i++)await Promise.resolve();
 assert.equal(prepares,0,"no posting on startup");
 assert.equal(posts,0,"no posting on startup");
 get("messageInput").value="Gastei 78 reais de combustível no "+(accountType==="Benefício"?"Caju":"C6")+" por Pix";
 await get("sendBtn").onclick();
 const card=get("draftMount").children[0];
 assert(card,"missing review card");
 assert.equal(prepares,0,"draft creation must require explicit confirmation");
 const buttons=card.querySelectorAll("button");
 assert.equal(buttons.length,3);
 await buttons[0].onclick();
 if(accountType==="Benefício"){assert.equal(prepares,0);assert.equal(posts,0)}
 else if(duplicate){assert.equal(prepares,1);assert.equal(posts,0)}
 else{assert.equal(prepares,1);assert.equal(posts,1)}
}
(async()=>{
 await scenario("Conta corrente");
 await scenario("Benefício");
 await scenario("Conta corrente",true);
 console.log("Assessor UI: DOM contract, explicit confirmation, special-account and stale draft guards OK");
})().catch(e=>{console.error(e);process.exitCode=1});
