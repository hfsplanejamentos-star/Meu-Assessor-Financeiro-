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
  notificationEvents: defineTable({
    ownerHash: v.string(),
    eventId: v.string(),
    fingerprint: v.string(),
    deviceId: v.string(),
    sourcePackage: v.string(),
    title: v.string(),
    text: v.string(),
    amountCents: v.optional(v.number()),
    direction: v.union(v.literal("expense"), v.literal("income"), v.literal("unknown")),
    postedAt: v.number(),
    receivedAt: v.number(),
    status: v.union(v.literal("classified"), v.literal("needs_review")),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    confidence: v.number(),
    classifier: v.union(v.literal("rules"), v.literal("ai"), v.literal("pending")),
  })
    .index("by_owner_and_event_id", ["ownerHash", "eventId"])
    .index("by_owner_and_fingerprint", ["ownerHash", "fingerprint"])
    .index("by_owner_and_received_at", ["ownerHash", "receivedAt"]),
  assessorDrafts: defineTable({
    ownerHash: v.string(), draftId: v.string(), sourceType: v.string(), sourceId: v.optional(v.string()),
    amountCents: v.number(), direction: v.union(v.literal("expense"), v.literal("income")),
    account: v.string(), transactionType: v.optional(v.string()), counterparty: v.optional(v.string()),
    category: v.string(), subcategory: v.optional(v.string()), description: v.string(), date: v.string(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("rejected")),
    createdAt: v.number(), updatedAt: v.number(),
  }).index("by_owner_draft", ["ownerHash", "draftId"])
    .index("by_owner_status", ["ownerHash", "status"])
    .index("by_owner_source", ["ownerHash", "sourceType", "sourceId"]),
  incomePayerRules: defineTable({
    ownerHash: v.string(),
    payerKey: v.string(),
    payerName: v.string(),
    payerDocument: v.optional(v.string()),
    category: v.string(),
    subcategory: v.string(),
    isSalary: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner_and_payer_key", ["ownerHash", "payerKey"])
    .index("by_owner", ["ownerHash"]),

  notificationDevices: defineTable({
    ownerHash: v.string(),
    deviceId: v.string(),
    appVersion: v.optional(v.string()),
    lastSeenAt: v.number(),
  }).index("by_owner_and_device_id", ["ownerHash", "deviceId"]),
  notificationRateLimits: defineTable({
    ownerHash: v.string(),
    windowStartedAt: v.number(),
    requestCount: v.number(),
  }).index("by_owner", ["ownerHash"]),
});
