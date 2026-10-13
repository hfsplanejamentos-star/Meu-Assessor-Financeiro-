/**
 * Read-only bridge from Android's encrypted notification queue to Assessor IA.
 * No posting, preparation, upload, or acknowledgement occurs during list().
 * Equal-value events with distinct IDs always remain separate.
 */
(function(root) {
 "use strict";
 const ALLOWED = Object.freeze({
  "com.c6bank.app":"C6",
  "br.com.xp.carteira":"XP",
  "com.caju.employee":"Caju",
  "br.com.itau":"Itaú"
 });
 const clean = value => String(value??"").replace(/[\u0000-\u001f]/g," ").trim();
 const formatDate = ms => {
  const date=new Date(ms);
  if(!Number.isFinite(date.getTime())||date.getFullYear()<2020||date.getFullYear()>2100)return "";
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),
   String(date.getDate()).padStart(2,"0")].join("-");
 };
 function nativeBridge(){
  for(const name of ["AndroidBridge","AndroidApp"]){
   const bridge=root[name];
   if(bridge&&typeof bridge.getPendingNotifications==="function"&&
     typeof bridge.acknowledgeNotifications==="function")return bridge;
  }
  return null;
 }
 function normalize(raw){
  if(!raw||typeof raw!=="object")return null;
  const sourcePackage=clean(raw.sourcePackage);
  const accountHint=ALLOWED[sourcePackage];
  if(!accountHint)return null;
  const eventId=clean(raw.id);
  const amountCents=Number(raw.amountCents);
  const postedAt=Number(raw.postedAt);
  const date=formatDate(postedAt);
  if(eventId.length<8||eventId.length>128||!Number.isSafeInteger(amountCents)||
     amountCents<=0||amountCents>100_000_000_00||!date)return null;
  const direction=raw.direction==="income"||raw.direction==="expense"?raw.direction:"";
  const title=clean(raw.title).slice(0,90);
  const body=clean(raw.text).slice(0,220);
  const description=[title,body].filter(Boolean).join(" · ").slice(0,240)||"Notificação bancária";
  const paymentText=(title+" "+body).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const methods=[
   /\bpix\b/.test(paymentText)?"Pix":null,
   /\bdebito\b/.test(paymentText)?"Débito":null,
   /\bcredito\b/.test(paymentText)&&/\bcompra\b|\bcartao\b/.test(paymentText)?"Crédito":null
  ].filter(Boolean);
  // Unclear method must be selected by the user, not silently assumed as Pix.
  const payment=methods.length===1?methods[0]:"";
  return Object.freeze({
   sourceType:"notification",sourceId:eventId,
   amountCents,date,direction,accountHint,paymentType:payment,
   category:"Outros",subcategory:"",description,counterparty:"",
   bank:accountHint,sourcePackage,postedAt
  });
 }
 function list(){
  const bridge=nativeBridge();
  if(!bridge)return{available:false,rows:[],invalid:0,error:null};
  try{
   const data=JSON.parse(String(bridge.getPendingNotifications()||"[]"));
   if(!Array.isArray(data))return{available:true,rows:[],invalid:0,error:"invalid_native_queue"};
   const ids=new Set(),rows=[];let invalid=0;
   for(const item of data.slice(0,500)){
    const x=normalize(item);
    if(!x){invalid++;continue}
    if(ids.has(x.sourceId))continue; // exact ID only: NOT amount/date/description
    ids.add(x.sourceId);rows.push(x);
   }
   return{available:true,rows,invalid,error:null};
  }catch{return{available:true,rows:[],invalid:0,error:"native_queue_unreadable"}}
 }
 function acknowledge(sourceId){
  const id=clean(sourceId);
  if(id.length<8||id.length>128)return false;
  const bridge=nativeBridge();
  if(!bridge)return false;
  try{return bridge.acknowledgeNotifications(JSON.stringify([id]))===true}catch{return false}
 }
 root.SnakeAssessorNativeNotifications=Object.freeze({
  list,acknowledge,normalize,available:()=>Boolean(nativeBridge())
 });
})(window);
