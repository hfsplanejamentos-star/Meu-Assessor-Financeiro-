import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

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
  const row = await ctx.runQuery(api.financeState.get, { ownerKey:key });
  return json({ ok:true, state:row ?? null });
}) });
http.route({ path: "/finance/state", method: "POST", handler: httpAction(async (ctx, req) => {
  const key = syncKey(req); if (!key) return json({ ok:false, error:"missing_sync_key" }, 401);
  const body = await req.json();
  const result = await ctx.runMutation(api.financeState.save, { ownerKey:key, payload:body.payload, baseVersion:body.baseVersion, deviceId:body.deviceId });
  return json(result, result.ok ? 200 : 409);
}) });

export default http;
