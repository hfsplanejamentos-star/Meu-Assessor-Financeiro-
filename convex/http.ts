import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Sync-Key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const syncKey = (req: Request) => req.headers.get("X-Sync-Key")?.trim() || "";

http.route({ path: "/finance/state", method: "OPTIONS", handler: httpAction(async () => new Response(null, { status: 204, headers: cors })) });
http.route({ path: "/finance/state", method: "GET", handler: httpAction(async (ctx, req) => {
  const key = syncKey(req); if (!key) return json({ ok:false, error:"missing_sync_key" }, 401);
  const row = await ctx.runQuery(internal.financeState.get, { ownerKey:key });
  return json({ ok:true, state:row ?? null });
}) });
http.route({ path: "/finance/state", method: "POST", handler: httpAction(async (ctx, req) => {
  const key = syncKey(req); if (!key) return json({ ok:false, error:"missing_sync_key" }, 401);
  const body = await req.json();
  const result = await ctx.runMutation(internal.financeState.save, { ownerKey:key, payload:body.payload, baseVersion:body.baseVersion, deviceId:body.deviceId });
  return json(result, result.ok ? 200 : 409);
}) });

http.route({ path: "/ai/finance", method: "OPTIONS", handler: httpAction(async () => new Response(null, { status: 204, headers: cors })) });
http.route({ path: "/ai/finance", method: "POST", handler: httpAction(async (_ctx, req) => {
  const body = await req.json();
  const text = String(body?.text || "").trim();
  if (!text) return json({ ok:false, error:"missing_text" }, 400);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json({ ok:false, error:"ai_not_configured" }, 503);
  const prompt = [
    "Você é o motor de interpretação do Meu Assessor Financeiro.",
    "Responda SOMENTE JSON válido.",
    "Nunca execute transações. Apenas interprete ou responda.",
    "Para lançamento: {intent:'transaction',draft:{date:'YYYY-MM-DD',value:number,cat:string,sub:string,desc:string,status:'draft'}}.",
    "Despesa deve ter value negativo; receita positivo.",
    "Para pergunta: {intent:'answer',answer:string}.",
    "Contexto financeiro:", JSON.stringify(body?.context || {}),
    "Usuário:", text
  ].join("\n");
  const r = await fetch("https://api.openai.com/v1/responses", {
    method:"POST",
    headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:"gpt-5-mini",input:prompt})
  });
  if (!r.ok) return json({ ok:false, error:"provider_error", status:r.status }, 502);
  const data:any = await r.json();
  const output = String(data?.output_text || data?.output?.flatMap((x:any)=>x.content||[]).map((x:any)=>x.text||"").join("") || "").trim();
  try { return json(JSON.parse(output)); } catch { return json({intent:"answer",answer:output}); }
}) });

export default http;
