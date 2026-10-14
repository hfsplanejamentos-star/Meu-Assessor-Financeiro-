const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const screen=fs.readFileSync("assessor-mobile-screen.js","utf8");
const html=fs.readFileSync("assessor-ia-mobile.html","utf8");
assert(html.includes('id="categoryDonut"')&&html.includes('id="cashFlowBar"'));
class El{
 constructor(){this.textContent="";this.style={};this.value="";this.children=[];this.options=[];this.dataset={};this.events={};
  this.classList={toggle(){}};this.scrollHeight=100;this.scrollTop=0;this.disabled=false}
 addEventListener(name,fn){this.events[name]=fn}replaceChildren(...x){this.children=x;this.options=x}
 append(...x){this.children.push(...x)}appendChild(x){this.children.push(x)}insertBefore(x){this.children.push(x)}
 add(x){this.options.push(x)}showModal(){this.open=true}close(){this.open=false}
 querySelectorAll(){return[]}querySelector(){return new El()}
}
const controls=new Map(),get=id=>{if(!controls.has(id))controls.set(id,new El());return controls.get(id)};
const categoryItems=new Map(["moradia","alimentacao","transporte","lazer","outros"].map(k=>[k,new El()]));
const document={
 getElementById:get,createElement:()=>new El(),
 querySelectorAll:q=>q==="[data-category-percent]"?[...categoryItems.values()]:[],
 querySelector:q=>{
  const m=q.match(/^\[data-category-percent="([a-z]+)"\]$/);
  return m?categoryItems.get(m[1]):new El()
 },addEventListener:()=>{}
};
const yy=new Date().getFullYear(),mm=String(new Date().getMonth()+1).padStart(2,"0");
const month=yy+"-"+mm;
let connected=true;
const payload={accounts:[{id:"c6",name:"C6 Conta Corrente",type:"Conta corrente",balance:340}],
 cards:[],transactions:[
  {id:"house",date:month+"-01",value:-100,status:"realized",category:"Moradia"},
  {id:"food",date:month+"-02",value:-50,status:"realized",category:"Alimentação"},
  {id:"fuel",date:month+"-03",value:-20,status:"realized",category:"Combustível"},
  {id:"fun",date:month+"-04",value:-10,status:"realized",category:"Lazer"},
  {id:"other",date:month+"-05",value:-20,status:"realized",category:"Pensão"},
  {id:"salary",date:month+"-06",value:300,status:"realized",category:"Salário"},
  {id:"forecast",date:month+"-07",value:-999,status:"planned",category:"Moradia"},
  {id:"old",date:"2020-01-01",value:-500,status:"realized",category:"Moradia"}
 ]};
const localStorage={getItem:()=>null,setItem:()=>{}};
const api={hasSyncKey:()=>connected,readFinanceState:async()=>({state:{version:3,payload}}),
 newDraftId:()=> "test-12345678",disconnectSync:()=>{connected=false}};
const window={SnakeAssessorApi:api,localStorage,scrollTo(){},confirm:()=>true};
vm.runInNewContext(screen,{window,document,localStorage,Option:function(t,v){this.textContent=t;this.value=v},
 setTimeout:()=>1,clearTimeout:()=>{},console});
(async()=>{
 for(let i=0;i<15;i++)await Promise.resolve();
 assert.equal(get("monthExpense").textContent,"R$ 200,00","no planned expense in realized chart");
 assert.equal(get("monthIncome").textContent,"R$ 300,00");
 assert.equal(get("donutSum").textContent,"R$ 200,00");
 const actual=[...categoryItems.values()].map(e=>e.textContent);
 assert.deepEqual(actual,["50%","25%","10%","5%","10%"],"percentages based on actual realized categories");
 assert.equal(actual.reduce((sum,x)=>sum+Number(x.replace("%","")),0),100);
 assert.match(get("categoryDonut").style.background,/conic-gradient/);
 assert.match(get("cashFlowBar").style.background,/linear-gradient/);
 await get("disconnectFinance").onclick();
 assert.equal(get("donutSum").textContent,"—");
 assert.equal(get("categoryDonut").style.background,"conic-gradient(var(--track) 0 100%)");
 assert.deepEqual([...categoryItems.values()].map(x=>x.textContent),["—","—","—","—","—"]);
 console.log("Assessor finance graphics: realized data, correct shares, no fabricated categories and disconnect reset PASS");
})().catch(e=>{console.error(e);process.exitCode=1});
