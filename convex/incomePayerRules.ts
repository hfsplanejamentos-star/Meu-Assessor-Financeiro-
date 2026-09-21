import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export const remember = internalMutation({
  args: {
    ownerHash: v.string(),
    payerName: v.string(),
    payerDocument: v.optional(v.string()),
    category: v.string(),
    subcategory: v.string(),
    isSalary: v.boolean(),
    now: v.number(),
  },
  returns: v.object({ payerKey: v.string() }),
  handler: async (ctx, args) => {
    const document = (args.payerDocument ?? "").replace(/\D/g, "");
    const payerKey = document ? `doc:${document}` : `name:${normalize(args.payerName)}`;
    const existing = await ctx.db
      .query("incomePayerRules")
      .withIndex("by_owner_and_payer_key", q => q.eq("ownerHash", args.ownerHash).eq("payerKey", payerKey))
      .unique();
    const values = {
      payerName: args.payerName.trim(),
      ...(document ? { payerDocument: document } : {}),
      category: args.category,
      subcategory: args.subcategory,
      isSalary: args.isSalary,
      updatedAt: args.now,
    };
    if (existing) await ctx.db.patch(existing._id, values);
    else await ctx.db.insert("incomePayerRules", {
      ownerHash: args.ownerHash,
      payerKey,
      createdAt: args.now,
      ...values,
    });
    return { payerKey };
  },
});

export const find = internalQuery({
  args: {
    ownerHash: v.string(),
    payerName: v.string(),
    payerDocument: v.optional(v.string()),
  },
  returns: v.union(
    v.null(),
    v.object({
      payerKey: v.string(),
      payerName: v.string(),
      category: v.string(),
      subcategory: v.string(),
      isSalary: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const document = (args.payerDocument ?? "").replace(/\D/g, "");
    const payerKey = document ? `doc:${document}` : `name:${normalize(args.payerName)}`;
    const row = await ctx.db
      .query("incomePayerRules")
      .withIndex("by_owner_and_payer_key", q => q.eq("ownerHash", args.ownerHash).eq("payerKey", payerKey))
      .unique();
    if (!row) return null;
    return {
      payerKey: row.payerKey,
      payerName: row.payerName,
      category: row.category,
      subcategory: row.subcategory,
      isSalary: row.isSalary,
    };
  },
});
