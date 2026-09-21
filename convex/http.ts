import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { classifyByRules, redactForAi, type Classification, type Direction } from "./notificationClassifier";

const http = httpRouter();
const legacyCors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, X-Sync-Key", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const allowedPackages = new Set([
  "com.c6bank.app", "br.com.xp.carteira", "com.caju.employee", "br.com.itau",
  "com.nu.production", "br.com.intermedium", "com.santander.app", "com.bradesco",
  "br.com.bb.android", "br.com.gabba.Caixa", "com.mercadopago.wallet", "com.picpay",
  "br.com.uol.ps.myaccount", "br.com.neon", "com.android.vending",
  "com.google.android.apps.walletnfcrel"
]);
const allowedCategories = new Set(["Alimentação", "Cerveja", "Comunicação", "Educação", "Entretenimento", "Moradia", "Outros", "Receitas", "Saúde", "Serviços", "Transporte", "C4 Cactus"]);
const json = (body: unknown, status = 200, headers: Record<string, string> = legacyCors) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const syncKey = (req: Request) => req.headers.get("X-Sync-Key")?.trim() || "";
const secureCors = (req: Request) => {
  const configured = process.env.ALLOWED_WEB_ORIGIN || "https://hfsplanejamentos-star.github.io";
  const origin = req.headers.get("Origin");
  return { "Access-Control-Allow-Origin": origin === configured ? origin : configured, "Access-Control-Allow-Headers": "Content-Type, X-Sync-Key", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", Vary: "Origin" };
};

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function ownerHash(req: Request) {
  const key = syncKey(req);
  return key.length < 32 || key.length > 256 ? null : await sha256(`meu-assessor:v1:${key}`);
}

type IncomingEvent = { eventId: string; sourcePackage: string; title: string; text: string; amountCents?: number; direction: Direction; postedAt: number };
function parseEvents(body: unknown): { deviceId: string; appVersion?: string; events: IncomingEvent[] } | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const deviceId = typeof value.deviceId === "string" ? value.deviceId.trim().slice(0, 100) : "";
  const appVersion = typeof value.appVersion === "string" ? value.appVersion.trim().slice(0, 40) : undefined;
  if (!deviceId || !Array.isArray(value.events) || value.events.length < 1 || value.events.length > 50) return null;
  const events: IncomingEvent[] = [];
  for (const raw of value.events) {
    if (!raw || typeof raw !== "object") return null;
    const event = raw as Record<string, unknown>;
    const eventId = typeof event.id === "string" ? event.id.trim().slice(0, 128) : "";
    const sourcePackage = typeof event.sourcePackage === "string" ? event.sourcePackage.trim() : "";
    const title = typeof event.title === "string" ? event.title.trim().slice(0, 250) : "";
    const text = typeof event.text === "string" ? event.text.trim().slice(0, 1000) : "";
    const postedAt = typeof event.postedAt === "number" && Number.isFinite(event.postedAt) ? Math.trunc(event.postedAt) : 0;
    const direction = event.direction === "expense" || event.direction === "income" ? event.direction : "unknown";
    const amountCents = typeof event.amountCents === "number" && Number.isSafeInteger(event.amountCents) && event.amountCents >= 0 ? event.amountCents : undefined;
    if (!eventId || !allowedPackages.has(sourcePackage) || (!title && !text) || postedAt <= 0) return null;
    events.push({ eventId, sourcePackage, title, text, ...(amountCents === undefined ? {} : { amountCents }), direction, postedAt });
  }
  return { deviceId, ...(appVersion ? { appVersion } : {}), events };
}

async function classifyWithAi(events: IncomingEvent[]): Promise<Map<string, Classification>> {
  const result = new Map<string, Classification>();
  const unresolved = events.filter((event) => classifyByRules(event.title, event.text, event.direction).status === "needs_review");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || unresolved.length === 0) return result;
  const input = unresolved.slice(0, 25).map((event) => ({ id: event.eventId, direction: event.direction, amountCents: event.amountCents ?? null, title: redactForAi(event.title), text: redactForAi(event.text) }));
  const prompt = ["Classifique notificações financeiras brasileiras.", "Não execute transações. Responda somente JSON válido no formato {\"items\":[{\"id\":string,\"category\":string,\"subcategory\":string,\"confidence\":number}]}", `Categorias permitidas: ${Array.from(allowedCategories).join(", ")}.`, "Use confiança entre 0 e 1. Se houver dúvida, use Outros e confiança abaixo de 0.7.", JSON.stringify(input)].join("\n");
  try {
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.OPENAI_CLASSIFICATION_MODEL || "gpt-5-mini", input: prompt }) });
    if (!response.ok) return result;
    const data = await response.json() as any;
    const providerText = data?.output_text || data?.output?.flatMap((item: any) => item.content || []).map((item: any) => item.text || item.value || "").join("") || "";
    const output = String(providerText).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(output) as { items?: Array<Record<string, unknown>> };
    for (const item of parsed.items ?? []) {
      const id = typeof item.id === "string" ? item.id : "";
      const category = typeof item.category === "string" && allowedCategories.has(item.category) ? item.category : "Outros";
      const subcategory = typeof item.subcategory === "string" ? item.subcategory.trim().slice(0, 80) : "A revisar";
      const confidence = typeof item.confidence === "number" ? Math.min(1, Math.max(0, item.confidence)) : 0;
      if (id && unresolved.some((event) => event.eventId === id)) result.set(id, { status: confidence >= 0.7 ? "classified" : "needs_review", category, subcategory, confidence, classifier: "ai" });
    }
  } catch { return result; }
  return result;
}

http.route({ path: "/finance/state", method: "OPTIONS", handler: httpAction(async () => new Response(null, { status: 204, headers: legacyCors })) });
http.route({ path: "/finance/state", method: "GET", handler: httpAction(async (ctx, req) => {
  const key = syncKey(req); if (!key) return json({ ok: false, error: "missing_sync_key" }, 401);
  const row = await ctx.runQuery(internal.financeState.get, { ownerKey: key });
  return json({ ok: true, state: row ?? null });
}) });
http.route({ path: "/finance/state", method: "POST", handler: httpAction(async (ctx, req) => {
  const key = syncKey(req); if (!key) return json({ ok: false, error: "missing_sync_key" }, 401);
  const body = await req.json();
  const result = await ctx.runMutation(internal.financeState.save, { ownerKey: key, payload: body.payload, baseVersion: body.baseVersion, deviceId: body.deviceId });
  return json(result, result.ok ? 200 : 409);
}) });

http.route({ path: "/notifications/ingest", method: "OPTIONS", handler: httpAction(async (_ctx, req) => new Response(null, { status: 204, headers: secureCors(req) })) });
http.route({ path: "/notifications/ingest", method: "POST", handler: httpAction(async (ctx, req) => {
  const headers = secureCors(req);
  const hash = await ownerHash(req);
  if (!hash) return json({ ok: false, error: "invalid_sync_key" }, 401, headers);
  if (Number(req.headers.get("Content-Length") || 0) > 128_000) return json({ ok: false, error: "payload_too_large" }, 413, headers);
  const now = Date.now();
  const rate = await ctx.runMutation(internal.notificationEvents.consumeRateLimit, { ownerHash: hash, now });
  if (!rate.allowed) return json({ ok: false, error: "rate_limited", retryAfterMs: rate.retryAfterMs }, 429, headers);
  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400, headers); }
  const payload = parseEvents(raw);
  if (!payload) return json({ ok: false, error: "invalid_payload" }, 400, headers);
  const ai = await classifyWithAi(payload.events);
  const events = await Promise.all(payload.events.map(async (event) => {
    const rule = classifyByRules(event.title, event.text, event.direction);
    const classification = rule.status === "classified" ? rule : ai.get(event.eventId) ?? rule;
    const fingerprint = await sha256([hash, event.sourcePackage, event.title.toLowerCase(), event.text.toLowerCase(), event.amountCents ?? "", Math.floor(event.postedAt / 60_000)].join("|"));
    return { ...event, fingerprint, ...classification };
  }));
  const result = await ctx.runMutation(internal.notificationEvents.ingest, { ownerHash: hash, deviceId: payload.deviceId, appVersion: payload.appVersion, receivedAt: now, events });
  return json({ ok: true, ...result, serverTime: now }, 200, headers);
}) });

http.route({ path: "/notifications/changes", method: "OPTIONS", handler: httpAction(async (_ctx, req) => new Response(null, { status: 204, headers: secureCors(req) })) });
http.route({ path: "/notifications/changes", method: "GET", handler: httpAction(async (ctx, req) => {
  const headers = secureCors(req);
  const hash = await ownerHash(req);
  if (!hash) return json({ ok: false, error: "invalid_sync_key" }, 401, headers);
  const url = new URL(req.url);
  const since = Math.max(0, Number(url.searchParams.get("since") || 0) || 0);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50) || 50));
  const events = await ctx.runQuery(internal.notificationEvents.listChanges, { ownerHash: hash, since, limit });
  return json({ ok: true, events, serverTime: Date.now() }, 200, headers);
}) });

http.route({ path: "/ai/finance", method: "OPTIONS", handler: httpAction(async (_ctx, req) => new Response(null, { status: 204, headers: secureCors(req) })) });
http.route({ path: "/ai/finance", method: "POST", handler: httpAction(async (ctx, req) => {
  const headers = secureCors(req);
  const hash = await ownerHash(req);
  if (!hash) return json({ ok: false, error: "invalid_sync_key" }, 401, headers);
  const now = Date.now();
  const rate = await ctx.runMutation(internal.notificationEvents.consumeRateLimit, { ownerHash: hash, now });
  if (!rate.allowed) return json({ ok: false, error: "rate_limited", retryAfterMs: rate.retryAfterMs }, 429, headers);
  const body = await req.json();
  const text = String(body?.text || "").trim();
  if (!text) return json({ ok: false, error: "missing_text" }, 400, headers);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json({ ok: false, error: "ai_not_configured" }, 503, headers);
  const prompt = ["Você é o motor de interpretação do Meu Assessor Financeiro.", "Responda SOMENTE JSON válido.", "Nunca execute transações. Apenas interprete ou responda.", "Para lançamento: {intent:'transaction',draft:{date:'YYYY-MM-DD',value:number,cat:string,sub:string,desc:string,status:'draft'}}.", "Despesa deve ter value negativo; receita positivo.", "Para pergunta: {intent:'answer',answer:string}.", "Contexto financeiro:", JSON.stringify(body?.context || {}), "Usuário:", text].join("\n");
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-5-mini", input: prompt }) });
  if (!response.ok) return json({ ok: false, error: "provider_error", status: response.status }, 502, headers);
  const data: any = await response.json();
  const output = String(data?.output_text || data?.output?.flatMap((item: any) => item.content || []).map((item: any) => item.text || "").join("") || "").trim();
  try { return json(JSON.parse(output), 200, headers); } catch { return json({ intent: "answer", answer: output }, 200, headers); }
}) });

export default http;
