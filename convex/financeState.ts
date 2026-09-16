import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { ownerKey: v.string() },
  handler: async (ctx, { ownerKey }) => {
    return await ctx.db.query("financeState").withIndex("by_owner", q => q.eq("ownerKey", ownerKey)).unique();
  },
});

export const save = mutation({
  args: {
    ownerKey: v.string(),
    payload: v.any(),
    baseVersion: v.optional(v.number()),
    deviceId: v.optional(v.string()),
  },
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

export const reset = mutation({
  args: { ownerKey: v.string(), emptyPayload: v.any(), deviceId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const current = await ctx.db.query("financeState").withIndex("by_owner", q => q.eq("ownerKey", args.ownerKey)).unique();
    const version = (current?.version ?? 0) + 1;
    const updatedAt = Date.now();
    if (current) await ctx.db.patch(current._id, { payload: args.emptyPayload, version, updatedAt, deviceId: args.deviceId });
    else await ctx.db.insert("financeState", { ownerKey: args.ownerKey, payload: args.emptyPayload, version, updatedAt, deviceId: args.deviceId });
    return { ok: true, version, updatedAt };
  },
});
