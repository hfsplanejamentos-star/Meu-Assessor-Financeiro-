import { internalMutation, internalQuery } from './_generated/server';
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
  returns:v.array(message),
  handler:async(ctx,args)=>{
    const rows=await ctx.db.query('whatsappInbox').withIndex('by_owner_status_received',q=>q.eq('ownerHash',args.ownerHash).eq('status','pending')).order('asc').take(50);
    return rows.map(({messageId,from,text,postedAt})=>({messageId,from,text,postedAt}));
  }
});
