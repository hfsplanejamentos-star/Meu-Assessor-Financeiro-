import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const direction = v.union(v.literal("expense"), v.literal("income"), v.literal("unknown"));
const classifier = v.union(v.literal("rules"), v.literal("ai"), v.literal("pending"));
const classificationStatus = v.union(v.literal("classified"), v.literal("needs_review"));
const classifiedEvent = v.object({
  eventId: v.string(),
  fingerprint: v.string(),
  sourcePackage: v.string(),
  title: v.string(),
  text: v.string(),
  amountCents: v.optional(v.number()),
  direction,
  postedAt: v.number(),
  status: classificationStatus,
  category: v.optional(v.string()),
  subcategory: v.optional(v.string()),
  confidence: v.number(),
  classifier,
});

export const consumeRateLimit = internalMutation({
  args: { ownerHash: v.string(), now: v.number() },
  returns: v.object({ allowed: v.boolean(), retryAfterMs: v.number() }),
  handler: async (ctx, args) => {
    const windowMs = 60_000;
    const maxRequests = 30;
    const current = await ctx.db
      .query("notificationRateLimits")
      .withIndex("by_owner", (q) => q.eq("ownerHash", args.ownerHash))
      .unique();
    if (!current || args.now - current.windowStartedAt >= windowMs) {
      if (current) await ctx.db.patch(current._id, { windowStartedAt: args.now, requestCount: 1 });
      else await ctx.db.insert("notificationRateLimits", { ownerHash: args.ownerHash, windowStartedAt: args.now, requestCount: 1 });
      return { allowed: true, retryAfterMs: 0 };
    }
    if (current.requestCount >= maxRequests) {
      return { allowed: false, retryAfterMs: Math.max(1, windowMs - (args.now - current.windowStartedAt)) };
    }
    await ctx.db.patch(current._id, { requestCount: current.requestCount + 1 });
    return { allowed: true, retryAfterMs: 0 };
  },
});

export const ingest = internalMutation({
  args: {
    ownerHash: v.string(),
    deviceId: v.string(),
    appVersion: v.optional(v.string()),
    receivedAt: v.number(),
    events: v.array(classifiedEvent),
  },
  returns: v.object({ accepted: v.number(), duplicates: v.number(), acceptedEventIds: v.array(v.string()) }),
  handler: async (ctx, args) => {
    let accepted = 0;
    let duplicates = 0;
    const acceptedEventIds: string[] = [];
    for (const event of args.events) {
      const byId = await ctx.db
        .query("notificationEvents")
        .withIndex("by_owner_and_event_id", (q) => q.eq("ownerHash", args.ownerHash).eq("eventId", event.eventId))
        .unique();
      const byFingerprint = await ctx.db
        .query("notificationEvents")
        .withIndex("by_owner_and_fingerprint", (q) => q.eq("ownerHash", args.ownerHash).eq("fingerprint", event.fingerprint))
        .unique();
      if (byId || byFingerprint) {
        duplicates += 1;
        continue;
      }
      await ctx.db.insert("notificationEvents", {
        ownerHash: args.ownerHash,
        deviceId: args.deviceId,
        receivedAt: args.receivedAt,
        ...event,
      });
      accepted += 1;
      acceptedEventIds.push(event.eventId);
    }
    const device = await ctx.db
      .query("notificationDevices")
      .withIndex("by_owner_and_device_id", (q) => q.eq("ownerHash", args.ownerHash).eq("deviceId", args.deviceId))
      .unique();
    const devicePatch = { lastSeenAt: args.receivedAt, appVersion: args.appVersion };
    if (device) await ctx.db.patch(device._id, devicePatch);
    else await ctx.db.insert("notificationDevices", { ownerHash: args.ownerHash, deviceId: args.deviceId, ...devicePatch });
    return { accepted, duplicates, acceptedEventIds };
  },
});

export const listChanges = internalQuery({
  args: { ownerHash: v.string(), since: v.number(), limit: v.number() },
  returns: v.array(v.object({
    eventId: v.string(),
    sourcePackage: v.string(),
    title: v.string(),
    text: v.string(),
    amountCents: v.optional(v.number()),
    direction,
    postedAt: v.number(),
    receivedAt: v.number(),
    status: classificationStatus,
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    confidence: v.number(),
    classifier,
  })),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("notificationEvents")
      .withIndex("by_owner_and_received_at", (q) => q.eq("ownerHash", args.ownerHash).gt("receivedAt", args.since))
      .order("asc")
      .take(Math.min(Math.max(args.limit, 1), 100));
    return rows.map(({ eventId, sourcePackage, title, text, amountCents, direction: eventDirection, postedAt, receivedAt, status, category, subcategory, confidence, classifier: eventClassifier }) => ({
      eventId,
      sourcePackage,
      title,
      text,
      ...(amountCents === undefined ? {} : { amountCents }),
      direction: eventDirection,
      postedAt,
      receivedAt,
      status,
      ...(category === undefined ? {} : { category }),
      ...(subcategory === undefined ? {} : { subcategory }),
      confidence,
      classifier: eventClassifier,
    }));
  },
});
