import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { planCarbonConfigRepair } from "./assessorCarbonRepair";

export const get = internalQuery({
  args: { ownerKey: v.string() },
  returns: v.union(v.null(), v.object({
    _id: v.id("financeState"),
    _creationTime: v.number(),
    ownerKey: v.string(),
    payload: v.any(),
    version: v.number(),
    updatedAt: v.number(),
    deviceId: v.optional(v.string()),
  })),
  handler: async (ctx, { ownerKey }) => {
    return await ctx.db.query("financeState").withIndex("by_owner", q => q.eq("ownerKey", ownerKey)).unique();
  },
});

export const save = internalMutation({
  args: {
    ownerKey: v.string(),
    payload: v.any(),
    baseVersion: v.optional(v.number()),
    deviceId: v.optional(v.string()),
  },
  returns: v.union(
    v.object({ ok: v.literal(false), conflict: v.literal(true), version: v.number(), updatedAt: v.number() }),
    v.object({ ok: v.literal(true), conflict: v.literal(false), version: v.number(), updatedAt: v.number() }),
  ),
  handler: async (ctx, args) => {
    const current = await ctx.db.query("financeState").withIndex("by_owner", q => q.eq("ownerKey", args.ownerKey)).unique();
    if (current && args.baseVersion !== undefined && current.version !== args.baseVersion) {
      return { ok: false as const, conflict: true as const, version: current.version, updatedAt: current.updatedAt };
    }
    const version = (current?.version ?? 0) + 1;
    const updatedAt = Date.now();
    if (current) {
      await ctx.db.patch(current._id, { payload: args.payload, version, updatedAt, deviceId: args.deviceId });
    } else {
      await ctx.db.insert("financeState", { ownerKey: args.ownerKey, payload: args.payload, version, updatedAt, deviceId: args.deviceId });
    }
    return { ok: true as const, conflict: false as const, version, updatedAt };
  },
});

export const reset = internalMutation({
  args: { ownerKey: v.string(), emptyPayload: v.any(), deviceId: v.optional(v.string()) },
  returns: v.object({ ok: v.boolean(), version: v.number(), updatedAt: v.number() }),
  handler: async (ctx, args) => {
    const current = await ctx.db.query("financeState").withIndex("by_owner", q => q.eq("ownerKey", args.ownerKey)).unique();
    const version = (current?.version ?? 0) + 1;
    const updatedAt = Date.now();
    if (current) await ctx.db.patch(current._id, { payload: args.emptyPayload, version, updatedAt, deviceId: args.deviceId });
    else await ctx.db.insert("financeState", { ownerKey: args.ownerKey, payload: args.emptyPayload, version, updatedAt, deviceId: args.deviceId });
    return { ok: true, version, updatedAt };
  },
});


/**
 * Explicit, version-checked repair of Carbon card SETTINGS ONLY.
 * Do not allow it when transactions or saved invoices refer to that card.
 */
export const repairCarbonConfig = internalMutation({
 args:{ownerKey:v.string(),cardId:v.string(),baseVersion:v.number()},
 handler:async(ctx,args)=>{
  if(!Number.isSafeInteger(args.baseVersion)||args.baseVersion<0)
   return{ok:false,error:"invalid_base_version",financeStateUpdated:false};
  const state=await ctx.db.query("financeState").withIndex("by_owner",q=>q.eq("ownerKey",args.ownerKey)).unique();
  if(!state)return{ok:false,error:"finance_state_missing",financeStateUpdated:false};
  if(state.version!==args.baseVersion)
   return{ok:false,error:"version_conflict",version:state.version,financeStateUpdated:false};
  const updatedAt=Date.now();
  const plan=planCarbonConfigRepair(state.payload,args.cardId,new Date(updatedAt).toISOString());
  if(!plan.ok)return{ok:false,error:plan.error,report:plan.report,
   version:state.version,financeStateUpdated:false};
  if(!plan.updated)return{ok:true,alreadyAligned:true,version:state.version,financeStateUpdated:false};
  const version=state.version+1;
  await ctx.db.patch(state._id,{
   payload:plan.payload,version,updatedAt,deviceId:"assessor-ia-carbon-config"
  });
  return{ok:true,alreadyAligned:false,version,financeStateUpdated:true,
   cardId:args.cardId,closing:5,due:7};
 }
});
