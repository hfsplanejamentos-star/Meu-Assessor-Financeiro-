import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  financeState: defineTable({
    ownerKey: v.string(),
    payload: v.any(),
    version: v.number(),
    updatedAt: v.number(),
    deviceId: v.optional(v.string()),
  }).index("by_owner", ["ownerKey"]),
});
