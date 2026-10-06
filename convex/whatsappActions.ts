import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

function outputText(data: any) {
  return String(data?.output_text || data?.output?.flatMap((x:any)=>x.content||[]).map((x:any)=>x.text||x.value||"").join("") || "").trim();
}
function cleanJson(value: string) {
  return value.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "");
}
async function sendWhatsApp(to: string, body: string) {
  const token=process.env.WHATSAPP_ACCESS_TOKEN, phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID;
  if(!token || !phoneId) throw new Error("whatsapp_not_configured");
  const version=process.env.META_GRAPH_VERSION || "v24.0";
  const r=await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`,{
    method:"POST", headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
    body:JSON.stringify({messaging_product:"whatsapp",to,type:"text",text:{body}})
  });
  if(!r.ok) throw new Error(`whatsapp_send_${r.status}`);
}
async function transcribe(mediaId: string) {
  const waToken=process.env.WHATSAPP_ACCESS_TOKEN, apiKey=process.env.OPENAI_API_KEY;
  if(!waToken || !apiKey) throw new Error("audio_not_configured");
  const version=process.env.META_GRAPH_VERSION || "v24.0";
  const meta=await fetch(`https://graph.facebook.com/${version}/${mediaId}`,{headers:{Authorization:`Bearer ${waToken}`}});
  if(!meta.ok) throw new Error("media_metadata_failed");
  const info:any=await meta.json();
  const file=await fetch(String(info.url),{headers:{Authorization:`Bearer ${waToken}`}});
  if(!file.ok) throw new Error("media_download_failed");
  const blob=await file.blob();
  const form=new FormData();
  form.append("file",blob,"whatsapp-audio.ogg");
  form.append("model",process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe");
  form.append("language","pt");
  const r=await fetch("https://api.openai.com/v1/audio/transcriptions",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`},body:form});
  if(!r.ok) throw new Error(`transcription_${r.status}`);
  const data:any=await r.json();
  return String(data.text||"").trim();
}
async function interpret(ctx:any, ownerHash:string, text:string, now:number) {
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey) throw new Error("ai_not_configured");
  const firstPrompt=[
    "Extraia um único lançamento financeiro brasileiro. Responda SOMENTE JSON válido.",
    "Formato: {date:'YYYY-MM-DD',value:number,cat:string,sub:string,desc:string,account:string,paymentMethod:string,recipient:string,transactionId:string}.",
    "Despesa negativa, receita positiva. Campos desconhecidos devem ser string vazia.",
    "Não invente destinatário, forma de pagamento, conta ou ID.",
    "Texto:",text
  ].join("\n");
  const first=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_FINANCE_MODEL||"gpt-5-mini",input:firstPrompt})});
  if(!first.ok) throw new Error(`ai_${first.status}`);
  const draft=JSON.parse(cleanJson(outputText(await first.json())));
  const cents=Math.round(Math.abs(Number(draft.value||0))*100);
  if(!cents) throw new Error("missing_amount");
  const candidates=await ctx.runQuery(internal.notificationEvents.findPotentialDuplicates,{ownerHash,amountCents:cents,from:now-30*60_000,to:now+5*60_000});
  if(candidates.length){
    const comparePrompt=[
      "Decida se o rascunho do WhatsApp e ALGUM alerta bancário representam exatamente a mesma transação.",
      "Valor igual sozinho NUNCA basta. Considere conta/banco, forma de pagamento e destinatário/estabelecimento.",
      "Pix e débito com mesmo valor são transações diferentes. Destinatários diferentes são transações diferentes.",
      "Se ambos tiverem IDs bancários diferentes, são diferentes. Se informação essencial estiver ausente, não marque como duplicado.",
      "Responda SOMENTE JSON: {duplicateBankEventId:string,confidence:number,reason:string}. Use duplicateBankEventId vazio quando não houver correspondência segura.",
      "Rascunho:",JSON.stringify(draft),"Alertas:",JSON.stringify(candidates)
    ].join("\n");
    const cr=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_FINANCE_MODEL||"gpt-5-mini",input:comparePrompt})});
    if(cr.ok){
      try{
        const match=JSON.parse(cleanJson(outputText(await cr.json())));
        if(Number(match.confidence)>=0.9 && candidates.some((x:any)=>x.eventId===match.duplicateBankEventId)){
          draft.duplicateBankEventId=match.duplicateBankEventId;
          draft.duplicateReason=String(match.reason||"");
        }
      }catch{}
    }
  }
  draft.status="draft";
  draft.source="whatsapp";
  return draft;
}
function summary(d:any){
  const value=Math.abs(Number(d.value||0)).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  return [
    "Snake Finance — confirmar lançamento",
    `Valor: ${value}`, `Descrição: ${d.desc||"A revisar"}`, `Categoria: ${d.cat||"Outros"}`,
    `Conta: ${d.account||"A revisar"}`, `Pagamento: ${d.paymentMethod||"A revisar"}`,
    `Destinatário: ${d.recipient||"A revisar"}`,
    d.duplicateBankEventId ? "Alerta bancário correspondente encontrado — não será duplicado." : "",
    "", "Responda SIM para confirmar ou NÃO para cancelar."
  ].filter(Boolean).join("\n");
}

export const process = internalAction({
  args:{ownerHash:v.string(),phone:v.string(),waMessageId:v.string(),messageType:v.union(v.literal("text"),v.literal("audio")),rawText:v.optional(v.string()),mediaId:v.optional(v.string()),receivedAt:v.number()},
  handler:async(ctx,args)=>{
    try{
      await ctx.runMutation(internal.whatsapp.setProcessed,{ownerHash:args.ownerHash,waMessageId:args.waMessageId,nextStatus:"processing"});
      const text=args.messageType==="audio" ? await transcribe(args.mediaId||"") : String(args.rawText||"").trim();
      if(!text) throw new Error("empty_message");
      const draft=await interpret(ctx,args.ownerHash,text,args.receivedAt);
      await ctx.runMutation(internal.whatsapp.setProcessed,{ownerHash:args.ownerHash,waMessageId:args.waMessageId,transcript:args.messageType==="audio"?text:undefined,draft,nextStatus:"pending_confirmation"});
      await ctx.runMutation(internal.whatsapp.replacePending,{ownerHash:args.ownerHash,phone:args.phone,sourceMessageId:args.waMessageId,draft,now:Date.now(),expiresAt:Date.now()+30*60_000});
      await sendWhatsApp(args.phone,summary(draft));
    }catch(e){
      await ctx.runMutation(internal.whatsapp.setProcessed,{ownerHash:args.ownerHash,waMessageId:args.waMessageId,nextStatus:"failed",error:String(e).slice(0,200)});
      try{await sendWhatsApp(args.phone,"Não consegui interpretar esse lançamento. Envie novamente por texto ou áudio com valor, despesa e forma de pagamento.");}catch{}
    }
  }
});

export const sendText = internalAction({
  args:{phone:v.string(),body:v.string()},
  handler:async(_ctx,args)=>{await sendWhatsApp(args.phone,args.body); return {ok:true};}
});
