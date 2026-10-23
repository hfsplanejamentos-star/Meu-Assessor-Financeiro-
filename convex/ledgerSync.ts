import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { ledgerOperation, ledgerEntry, validOperation, sameEntry } from './ledgerProtocol';
export const submit=internalMutation({
 args:{ownerHash:v.string(),operations:v.array(ledgerOperation)},
 returns:v.object({ok:v.boolean(),inserted:v.number(),existing:v.number()}),
 handler:async(ctx,args)=>{
  if(args.operations.length<1||args.operations.length>50||!args.operations.every(validOperation))throw Error('invalid_operations');
  let inserted=0,existing=0;
  for(const op of args.operations){
   const prior=await ctx.db.query('ledgerOperations').withIndex('by_owner_and_operation',q=>q.eq('ownerHash',args.ownerHash).eq('operationId',op.operationId)).unique();
   if(prior){if(!sameEntry(prior.entry,op.entry))throw Error('operation_conflict');existing++;continue;}
   await ctx.db.insert('ledgerOperations',{ownerHash:args.ownerHash,...op,approvedAt:Date.now()});inserted++;
  }
  return {ok:true,inserted,existing};
 }
});
export const changes=internalQuery({
 args:{ownerHash:v.string(),cursor:v.union(v.string(),v.null())},
 returns:v.object({operations:v.array(v.object({operationId:v.string(),entry:ledgerEntry})),cursor:v.string(),done:v.boolean()}),
 handler:async(ctx,args)=>{
  const result=await ctx.db.query('ledgerOperations').withIndex('by_owner',q=>q.eq('ownerHash',args.ownerHash)).order('asc').paginate({numItems:50,cursor:args.cursor,maximumRowsRead:100});
  return {operations:result.page.map(({operationId,entry})=>({operationId,entry})),cursor:result.continueCursor,done:result.isDone};
 }
});
