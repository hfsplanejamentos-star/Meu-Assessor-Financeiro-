import { v } from 'convex/values';
export const ledgerEntry = v.object({
  date:v.string(), description:v.string(), amountCents:v.number(),
  type:v.union(v.literal('d'),v.literal('r'),v.literal('t')),
  account:v.union(v.literal('c6'),v.literal('xp'),v.literal('caju'),v.literal('carbon')),
  to:v.optional(v.string()), category:v.optional(v.string()), categoryName:v.optional(v.string()),
  subcategory:v.optional(v.string()), context:v.optional(v.string()), originCaptureId:v.optional(v.string()),
});
export const ledgerOperation = v.object({operationId:v.string(),entry:ledgerEntry});
export function validOperation(op:any):boolean {
  if(!op||typeof op.operationId!=='string'||! /^(chatgpt|manual|whatsapp):[\x21-\x7E]{1,240}$/.test(op.operationId))return false;
  const e=op.entry;if(!e||!['d','r','t'].includes(e.type)||!['c6','xp','caju','carbon'].includes(e.account)||!Number.isSafeInteger(e.amountCents)||e.amountCents<=0||e.amountCents>100000000000||typeof e.description!=='string'||!e.description.trim()||e.description.length>250||!/^\d{4}-\d{2}-\d{2}$/.test(e.date))return false;
  const d=new Date(e.date+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==e.date)return false;
  if(e.type==='r'&&e.account==='carbon')return false;
  if(e.type==='t'&&(!['c6','xp','caju'].includes(e.to)||e.to===e.account||e.account==='carbon'))return false;
  if(e.type!=='t'&&e.to!==undefined)return false;
  if(e.type==='d'&&!(typeof e.category==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(e.category))&&!(typeof e.categoryName==='string'&&e.categoryName.trim()))return false;
  for(const k of ['category','categoryName','subcategory','context'])if(e[k]!==undefined&&(typeof e[k]!=='string'||e[k].length>100))return false;
  if(e.originCaptureId!==undefined&&(typeof e.originCaptureId!=='string'||! /^(manual|whatsapp):[\x21-\x7E]{1,240}$/.test(e.originCaptureId)))return false;
  return true;
}
export function sameEntry(a:any,b:any):boolean {
 return ['date','description','amountCents','type','account','to','category','categoryName','subcategory','context','originCaptureId'].every(k=>a[k]===b[k]);
}
