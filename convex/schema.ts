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

  whatsappMessages: defineTable({
    ownerHash: v.string(),
    waMessageId: v.string(),
    phone: v.string(),
    messageType: v.union(v.literal("text"), v.literal("audio"), v.literal("system")),
    rawText: v.optional(v.string()),
    transcript: v.optional(v.string()),
    mediaId: v.optional(v.string()),
    receivedAt: v.number(),
    status: v.union(v.literal("received"), v.literal("processing"), v.literal("pending_confirmation"), v.literal("confirmed"), v.literal("cancelled"), v.literal("failed")),
    draft: v.optional(v.any()),
    confirmedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_owner_and_message_id", ["ownerHash", "waMessageId"])
    .index("by_owner_and_phone_and_received_at", ["ownerHash", "phone", "receivedAt"])
    .index("by_owner_and_status", ["ownerHash", "status"]),
  whatsappPending: defineTable({
    ownerHash: v.string(),
    phone: v.string(),
    sourceMessageId: v.string(),
    draft: v.any(),
    createdAt: v.number(),
    expiresAt: v.number(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("cancelled"), v.literal("expired")),
  })
    .index("by_owner_and_phone", ["ownerHash", "phone"])
    .index("by_owner_and_source", ["ownerHash", "sourceMessageId"]),

  notificationRateLimits: defineTable({
    ownerHash: v.string(),
    windowStartedAt: v.number(),
    requestCount: v.number(),
  }).index("by_owner", ["ownerHash"]),
});
