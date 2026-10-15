import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

const kind = v.union(v.literal("text"), v.literal("audio"));

/** Webhook ingress. Unique provider message IDs, never automatic financial entries. */
export const receive = internalMutation({
  args: {
    ownerHash: v.string(), sender: v.string(), messageId: v.string(),
    text: v.string(), kind, postedAt: v.number(),
    mediaId: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const already = await ctx.db.query("whatsappMessages")
      .withIndex("by_owner_and_message_id", q =>
        q.eq("ownerHash", args.ownerHash).eq("messageId", args.messageId)).unique();
    if (already) return false;
    const audio = args.kind === "audio";
    await ctx.db.insert("whatsappMessages", {
      ownerHash: args.ownerHash,
      sender: args.sender,
      messageId: args.messageId,
      text: args.text.slice(0, 3500),
      kind: args.kind,
      postedAt: args.postedAt,
      receivedAt: Date.now(),
      status: audio ? "processing" : "pending",
      ...(audio && args.mediaId ? { audioMediaId: args.mediaId } : {}),
    });
    if (audio && args.mediaId) {
      await ctx.scheduler.runAfter(0, internal.whatsapp.transcribeAudio, {
        ownerHash: args.ownerHash, messageId: args.messageId,
      });
    }
    return true;
  },
});

export const pending = internalQuery({
  args: { ownerHash: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("whatsappMessages")
      .withIndex("by_owner_and_received_at", q => q.eq("ownerHash", args.ownerHash))
      .order("desc").take(100);
    return rows.filter(row => row.status !== "resolved").map(row => ({
      messageId: row.messageId, postedAt: row.postedAt,
      text: row.text, kind: row.kind, status: row.status,
      ...(row.transcriptionError ? { transcriptionError: row.transcriptionError } : {}),
    }));
  },
});

export const resolve = internalMutation({
  args: {
    ownerHash: v.string(), messageIds: v.array(v.string()),
    resolution: v.union(v.literal("recorded"), v.literal("discarded")),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let count = 0;
    for (const messageId of [...new Set(args.messageIds)].slice(0, 50)) {
      const message = await ctx.db.query("whatsappMessages")
        .withIndex("by_owner_and_message_id", q =>
          q.eq("ownerHash", args.ownerHash).eq("messageId", messageId)).unique();
      if (!message || message.status === "resolved") continue;
      await ctx.db.patch(message._id, { status: "resolved", resolution: args.resolution });
      count++;
    }
    return count;
  },
});

export const lookupAudio = internalQuery({
  args: { ownerHash: v.string(), messageId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("whatsappMessages")
      .withIndex("by_owner_and_message_id", q =>
        q.eq("ownerHash", args.ownerHash).eq("messageId", args.messageId)).unique();
    if (!row || row.kind !== "audio" || row.status !== "processing"
        || !row.audioMediaId) return null;
    return { mediaId: row.audioMediaId };
  },
});

export const updateAudio = internalMutation({
  args: {
    ownerHash: v.string(), messageId: v.string(),
    status: v.union(v.literal("pending"), v.literal("failed")),
    text: v.optional(v.string()), error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("whatsappMessages")
      .withIndex("by_owner_and_message_id", q =>
        q.eq("ownerHash", args.ownerHash).eq("messageId", args.messageId)).unique();
    // A review may have resolved the message while audio was being transcribed.
    if (!row || row.status !== "processing") return;
    await ctx.db.patch(row._id, {
      status: args.status,
      text: (args.text || row.text).slice(0, 3500),
      transcriptionError: args.error,
    });
  },
});

export const retryAudio = internalMutation({
  args: { ownerHash: v.string(), messageId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const row = await ctx.db.query("whatsappMessages")
      .withIndex("by_owner_and_message_id", q =>
        q.eq("ownerHash", args.ownerHash).eq("messageId", args.messageId)).unique();
    if (!row || row.kind !== "audio" || row.status !== "failed" || !row.audioMediaId) return false;
    await ctx.db.patch(row._id, { status: "processing", transcriptionError: undefined });
    await ctx.scheduler.runAfter(0, internal.whatsapp.transcribeAudio, args);
    return true;
  },
});

/** Fetches WhatsApp media and transcribes; saves only a draft, never a financial ledger entry. */
export const transcribeAudio = internalAction({
  args: { ownerHash: v.string(), messageId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.runQuery(internal.whatsapp.lookupAudio, args);
    if (!row) return;
    const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const aiKey = process.env.OPENAI_API_KEY;
    if (!whatsappToken || !aiKey) {
      await ctx.runMutation(internal.whatsapp.updateAudio, {
        ...args, status: "failed", error: "audio_not_configured",
      });
      return;
    }
    let failure = "media_unavailable";
    try {
      const id = encodeURIComponent(row.mediaId);
      const meta = await fetch("https://graph.facebook.com/v22.0/" + id, {
        headers: { Authorization: "Bearer " + whatsappToken },
      });
      if (!meta.ok) throw Error("meta_media");
      const location = (await meta.json()) as { url?: string; mime_type?: string };
      const url = new URL(String(location.url || ""));
      if (url.protocol !== "https:" || !(
        url.hostname === "lookaside.fbsbx.com" || url.hostname.endsWith(".fbsbx.com")
        || url.hostname === "graph.facebook.com"
      )) throw Error("invalid_media_host");
      const source = await fetch(url.toString(), {
        headers: { Authorization: "Bearer " + whatsappToken },
      });
      if (!source.ok) throw Error("download");
      const length = Number(source.headers.get("content-length") || 0);
      if (length > 10_000_000) { failure = "audio_too_large"; throw Error("oversized"); }
      const bytes = await source.arrayBuffer();
      if (!bytes.byteLength || bytes.byteLength > 10_000_000) {
        failure = bytes.byteLength > 10_000_000 ? "audio_too_large" : "media_unavailable";
        throw Error("invalid_size");
      }
      const form = new FormData();
      form.append("model", process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe");
      form.append("file", new Blob([bytes], {
        type: (location.mime_type || "audio/ogg").split(";")[0],
      }), "snake-audio.ogg");
      const audio = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST", headers: { Authorization: "Bearer " + aiKey }, body: form,
      });
      if (!audio.ok) { failure = "transcription_unavailable"; throw Error("transcription_failed"); }
      const transcript = (await audio.json()) as { text?: string };
      const text = String(transcript.text || "").trim().slice(0, 3500);
      if (!text) { failure = "empty_transcript"; throw Error("empty_transcript"); }
      await ctx.runMutation(internal.whatsapp.updateAudio, {
        ...args, status: "pending", text,
      });
    } catch {
      await ctx.runMutation(internal.whatsapp.updateAudio, {
        ...args, status: "failed", error: failure,
      });
    }
  },
});
