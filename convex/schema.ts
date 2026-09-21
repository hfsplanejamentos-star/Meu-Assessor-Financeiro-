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
