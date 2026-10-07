import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Rascunhos isolados: nunca alteram financeState sem confirmação e conciliação.
export const prepare = internalMutation({
  args: { ownerHash: v.string(), draftId: v.string(), amountCents: v.number(), account: v.string(), category: v.string(), description: v.string(), date: v.string() },
  handler: async (_ctx, args) => {
    if (!Number.isSafeInteger(args.amountCents) || args.amountCents <= 0) throw new Error("invalid_amount");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) throw new Error("invalid_date");
    return { status: "pending" as const, ...args };
  }
});
