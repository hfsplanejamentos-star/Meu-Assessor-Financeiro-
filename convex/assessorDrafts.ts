import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
const fields = { ownerHash:v.string(), draftId:v.string(), sourceType:v.string(), sourceId:v.optional(v.string()), amountCents:v.number(), direction:v.union(v.literal("expense"),v.literal("income")), account:v.string(), transactionType:v.optional(v.string()), counterparty:v.optional(v.string()), category:v.string(), subcategory:v.optional(v.string()), description:v.string(), date:v.string() };
export const prepare=internalMutation({args:fields,handler:async(ctx,args)=>{
 if(!Number.isSafeInteger(args.amountCents)||args.amountCents<=0) throw new Error("invalid_amount");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(args.date) || Number.isNaN(Date.parse(args.date+"T12:00:00Z"))) throw new Error("invalid_date");
 if(!args.account.trim()||!args.category.trim()||!args.description.trim()) throw new Error("missing_fields");
 const existing=await ctx.db.query("assessorDrafts").withIndex("by_owner_draft",q=>q.eq("ownerHash",args.ownerHash).eq("draftId",args.draftId)).unique();
 if(existing) return {draftId:existing.draftId,status:existing.status,duplicate:true};
 if(args.sourceId){const source=await ctx.db.query("assessorDrafts").withIndex("by_owner_source",q=>q.eq("ownerHash",args.ownerHash).eq("sourceType",args.sourceType).eq("sourceId",args.sourceId!)).first();if(source)return {draftId:source.draftId,status:source.status,duplicate:true};}
 const now=Date.now();await ctx.db.insert("assessorDrafts",{...args,status:"pending",createdAt:now,updatedAt:now});
 return {draftId:args.draftId,status:"pending",duplicate:false};
}});
export const listPending=internalQuery({args:{ownerHash:v.string()},handler:async(ctx,{ownerHash})=>await ctx.db.query("assessorDrafts").withIndex("by_owner_status",q=>q.eq("ownerHash",ownerHash).eq("status","pending")).take(100)});
export const decide=internalMutation({args:{ownerHash:v.string(),draftId:v.string(),decision:v.union(v.literal("confirm"),v.literal("reject"))},handler:async(ctx,args)=>{
 const row=await ctx.db.query("assessorDrafts").withIndex("by_owner_draft",q=>q.eq("ownerHash",args.ownerHash).eq("draftId",args.draftId)).unique();
 if(!row)return {ok:false,error:"not_found"};
 if(row.status!=="pending")return {ok:true,status:row.status,alreadyDecided:true};
 const next=args.decision==="confirm"?"confirmed":"rejected";await ctx.db.patch(row._id,{status:next,updatedAt:Date.now()});
 return {ok:true,status:next,alreadyDecided:false,financeStateUpdated:false};
}});
