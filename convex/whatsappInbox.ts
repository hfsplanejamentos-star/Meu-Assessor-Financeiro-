import { internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
const message = v.object({messageId:v.string(),from:v.string(),text:v.string(),postedAt:v.number()});
export const ingest = internalMutation({
  args:{ownerHash:v.string(),messages:v.array(message),receivedAt:v.number()},
  returns:v.object({inserted:v.number(),duplicates:v.number()}),
  handler:async(ctx,args)=>{
    if(args.messages.length>50)throw new Error('Too many messages');
    let inserted=0,duplicates=0;
    for(const m of args.messages){
      const existing=await ctx.db.query('whatsappInbox').withIndex('by_owner_message',q=>q.eq('ownerHash',args.ownerHash).eq('messageId',m.messageId)).unique();
      if(existing){duplicates++;continue;}
      await ctx.db.insert('whatsappInbox',{...m,ownerHash:args.ownerHash,receivedAt:args.receivedAt,status:'pending'});inserted++;
    }
    return {inserted,duplicates};
  }
});
export const pending = internalQuery({
  args:{ownerHash:v.string()},
  returns:v.array(v.object({messageId:v.string(),from:v.string(),text:v.string(),postedAt:v.number(),kind:v.optional(v.literal('audio')),status:v.union(v.literal('pending'),v.literal('processing'),v.literal('failed')),transcriptionError:v.optional(v.string())})),
  handler:async(ctx,args)=>{
    const batches=await Promise.all((['pending','processing','failed'] as const).map(status=>ctx.db.query('whatsappInbox').withIndex('by_owner_status_received',q=>q.eq('ownerHash',args.ownerHash).eq('status',status)).order('asc').take(50)));
    return batches.flat().sort((a,b)=>a.receivedAt-b.receivedAt).slice(0,50).map(({messageId,from,text,postedAt,kind,status,transcriptionError})=>({messageId,from,text,postedAt,status:status as 'pending'|'processing'|'failed',...(kind?{kind}:{}),...(transcriptionError?{transcriptionError}:{})}));
  }
});

/** Keep resolved IDs so a retried webhook cannot recreate a reviewed message. */
export const resolve = internalMutation({
  args:{ownerHash:v.string(),messageIds:v.array(v.string()),status:v.union(v.literal('recorded'),v.literal('discarded')),resolvedAt:v.number()},
  returns:v.object({resolved:v.number(),alreadyResolved:v.number()}),
  handler:async(ctx,args)=>{
    if(!args.messageIds.length || args.messageIds.length>50 || args.messageIds.some(id=>!id || id.length>256))throw new Error('Invalid message IDs');
    let resolved=0,alreadyResolved=0;
    for(const id of new Set(args.messageIds)){
      const row=await ctx.db.query('whatsappInbox').withIndex('by_owner_message',q=>q.eq('ownerHash',args.ownerHash).eq('messageId',id)).unique();
      if(!row)throw new Error('Message not found');
      if(['recorded','discarded'].includes(row.status)){alreadyResolved++;continue;}
      if(args.status==='recorded'&&row.status!=='pending')throw new Error('Message not ready');
      await ctx.db.patch(row._id,{status:args.status,resolvedAt:args.resolvedAt});resolved++;
    }
    return {resolved,alreadyResolved};
  }
});

export const retryAudio = internalMutation({
  args:{ownerHash:v.string(),messageId:v.string()},returns:v.boolean(),
  handler:async(ctx,args)=>{
    const row=await ctx.db.query('whatsappInbox').withIndex('by_owner_message',q=>q.eq('ownerHash',args.ownerHash).eq('messageId',args.messageId)).unique();
    if(!row||row.kind!=='audio'||row.status!=='failed')return false;
    await ctx.db.patch(row._id,{status:'processing',attempts:0,leaseUntil:0,transcriptionError:undefined});
    await ctx.scheduler.runAfter(0,internal.whatsappAudio.transcribe,{inboxId:row._id});return true;
  }
});
