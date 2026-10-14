import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const status = v.union(
  v.literal("received"), v.literal("processing"), v.literal("pending_confirmation"),
  v.literal("confirmed"), v.literal("cancelled"), v.literal("failed")
);

export const receive = internalMutation({
  args: {
    ownerHash: v.string(), waMessageId: v.string(), phone: v.string(),
    messageType: v.union(v.literal("text"), v.literal("audio"), v.literal("system")),
    rawText: v.optional(v.string()), mediaId: v.optional(v.string()), receivedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("whatsappMessages")
      .withIndex("by_owner_and_message_id", q => q.eq("ownerHash", args.ownerHash).eq("waMessageId", args.waMessageId)).unique();
    if (existing) return { created: false, id: existing._id, status: existing.status };
    const id = await ctx.db.insert("whatsappMessages", { ...args, status: "received" as const });
    return { created: true, id, status: "received" as const };
  },
});

export const setProcessed = internalMutation({
  args: { ownerHash: v.string(), waMessageId: v.string(), transcript: v.optional(v.string()), draft: v.optional(v.any()), nextStatus: status, error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("whatsappMessages")
      .withIndex("by_owner_and_message_id", q => q.eq("ownerHash", args.ownerHash).eq("waMessageId", args.waMessageId)).unique();
    if (!row) return { ok: false };
    await ctx.db.patch(row._id, { transcript: args.transcript, draft: args.draft, status: args.nextStatus, error: args.error });
    return { ok: true };
  },
});

export const replacePending = internalMutation({
  args: { ownerHash: v.string(), phone: v.string(), sourceMessageId: v.string(), draft: v.any(), now: v.number(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("whatsappPending").withIndex("by_owner_and_phone", q => q.eq("ownerHash", args.ownerHash).eq("phone", args.phone)).collect();
    for (const row of rows) if (row.status === "pending") await ctx.db.patch(row._id, { status: "cancelled" as const });
    const id = await ctx.db.insert("whatsappPending", { ownerHash: args.ownerHash, phone: args.phone, sourceMessageId: args.sourceMessageId, draft: args.draft, createdAt: args.now, expiresAt: args.expiresAt, status: "pending" as const });
    return { ok: true, id };
  },
});

export const resolvePending = internalMutation({
  args: { ownerHash: v.string(), phone: v.string(), decision: v.union(v.literal("confirm"), v.literal("cancel")), now: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("whatsappPending").withIndex("by_owner_and_phone", q => q.eq("ownerHash", args.ownerHash).eq("phone", args.phone)).collect();
    const pending = rows.filter(r => r.status === "pending").sort((a,b) => b.createdAt-a.createdAt)[0];
    if (!pending) return { ok: false, error: "no_pending" as const };
    if (pending.expiresAt < args.now) {
      await ctx.db.patch(pending._id, { status: "expired" as const });
      return { ok: false, error: "expired" as const };
    }
    const next = args.decision === "confirm" ? "confirmed" as const : "cancelled" as const;
    await ctx.db.patch(pending._id, { status: next });
    const source = await ctx.db.query("whatsappMessages").withIndex("by_owner_and_message_id", q => q.eq("ownerHash", args.ownerHash).eq("waMessageId", pending.sourceMessageId)).unique();
    if (source) await ctx.db.patch(source._id, { status: args.decision === "confirm" ? "confirmed" as const : "cancelled" as const, ...(args.decision === "confirm" ? { confirmedAt: args.now } : {}) });
    return { ok: true, decision: args.decision, draft: pending.draft, sourceMessageId: pending.sourceMessageId };
  },
});

export const listChanges = internalQuery({
  args: { ownerHash: v.string(), since: v.number(), limit: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("whatsappMessages").withIndex("by_owner_and_phone_and_received_at").collect();
    return rows.filter(r => r.ownerHash === args.ownerHash && r.receivedAt > args.since).sort((a,b)=>a.receivedAt-b.receivedAt).slice(0,args.limit);
  },
});
