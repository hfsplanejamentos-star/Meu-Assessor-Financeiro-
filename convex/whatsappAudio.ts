import { internalAction,internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { AudioFailure,transcribeWhatsAppAudio } from './whatsappAudioMedia';
const audio=v.object({messageId:v.string(),from:v.string(),mediaId:v.string(),mimeType:v.string(),sha256:v.optional(v.string()),postedAt:v.number()});
export const ingest = internalMutation({
  args:{ownerHash:v.string(),messages:v.array(audio),receivedAt:v.number()},returns:v.object({inserted:v.number(),duplicates:v.number()}),
  handler:async(ctx,args)=>{
    if(args.messages.length>50)throw new Error('Too many messages');let inserted=0,duplicates=0;
    for(const m of args.messages){
      if(await ctx.db.query('whatsappInbox').withIndex('by_owner_message',q=>q.eq('ownerHash',args.ownerHash).eq('messageId',m.messageId)).unique()){duplicates++;continue;}
      const inboxId=await ctx.db.insert('whatsappInbox',{...m,ownerHash:args.ownerHash,receivedAt:args.receivedAt,text:'',kind:'audio',status:'processing',attempts:0});
      await ctx.scheduler.runAfter(0,internal.whatsappAudio.transcribe,{inboxId});inserted++;
    }
    return {inserted,duplicates};
  }
});
export const claim = internalMutation({
  args:{inboxId:v.id('whatsappInbox'),now:v.number()},returns:v.union(v.null(),v.object({mediaId:v.string(),sha256:v.optional(v.string()),attempt:v.number()})),
  handler:async(ctx,args)=>{
    const row=await ctx.db.get(args.inboxId);
    if(!row||row.kind!=='audio'||row.status!=='processing'||!row.mediaId||(row.leaseUntil||0)>args.now||(row.attempts||0)>=3)return null;
    const attempt=(row.attempts||0)+1;await ctx.db.patch(row._id,{attempts:attempt,leaseUntil:args.now+180000});
    // Lease recovery survives an interrupted external action.
    await ctx.scheduler.runAfter(181000,internal.whatsappAudio.recover,{inboxId:row._id,attempt});
    return {mediaId:row.mediaId,attempt,...(row.sha256?{sha256:row.sha256}:{})};
  }
});
export const recover = internalMutation({
  args:{inboxId:v.id('whatsappInbox'),attempt:v.number()},returns:v.null(),
  handler:async(ctx,args)=>{
    const row=await ctx.db.get(args.inboxId);if(!row||row.status!=='processing'||row.attempts!==args.attempt||(row.leaseUntil||0)>Date.now())return null;
    await ctx.db.patch(row._id,{leaseUntil:0,...(args.attempt>=3?{status:'failed',transcriptionError:'audio_connection_failed'}:{})});
    if(args.attempt<3)await ctx.scheduler.runAfter(0,internal.whatsappAudio.transcribe,{inboxId:row._id});return null;
  }
});
export const finish = internalMutation({
  args:{inboxId:v.id('whatsappInbox'),attempt:v.number(),text:v.optional(v.string()),error:v.optional(v.string()),retryable:v.boolean()},returns:v.null(),
  handler:async(ctx,args)=>{
    const row=await ctx.db.get(args.inboxId);if(!row||row.status!=='processing'||row.attempts!==args.attempt)return null;
    if(args.text && args.text.trim() && args.text.length<=4000){await ctx.db.patch(row._id,{text:args.text.trim(),status:'pending',leaseUntil:0,transcriptionError:undefined});return null;}
    const retry=args.retryable&&args.attempt<3;
    await ctx.db.patch(row._id,{status:retry?'processing':'failed',leaseUntil:0,transcriptionError:args.error||'empty_transcript'});
    if(retry)await ctx.scheduler.runAfter(15000*Math.pow(2,args.attempt-1),internal.whatsappAudio.transcribe,{inboxId:row._id});return null;
  }
});
export const transcribe = internalAction({
  args:{inboxId:v.id('whatsappInbox')},returns:v.null(),
  handler:async(ctx,args)=>{
    const job=await ctx.runMutation(internal.whatsappAudio.claim,{inboxId:args.inboxId,now:Date.now()});if(!job)return null;
    try{
      const text=await transcribeWhatsAppAudio({mediaId:job.mediaId,...(job.sha256?{sha256:job.sha256}:{}),phoneNumberId:process.env.WHATSAPP_PHONE_NUMBER_ID||'',graphVersion:process.env.WHATSAPP_GRAPH_VERSION||'',accessToken:process.env.WHATSAPP_ACCESS_TOKEN||'',openAiKey:process.env.OPENAI_API_KEY||'',model:process.env.OPENAI_TRANSCRIPTION_MODEL});
      await ctx.runMutation(internal.whatsappAudio.finish,{inboxId:args.inboxId,attempt:job.attempt,text,retryable:false});
    }catch(error){const failure=error instanceof AudioFailure?error:new AudioFailure('audio_connection_failed',true);await ctx.runMutation(internal.whatsappAudio.finish,{inboxId:args.inboxId,attempt:job.attempt,error:failure.code,retryable:failure.retryable});}return null;
  }
});
