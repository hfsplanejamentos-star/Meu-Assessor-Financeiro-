/** Input validation and extraction normalization for receipts/statements.
 * Pure functions: analysis NEVER writes to the finance ledger.
 */
export type AttachmentInput = { name:string; mimeType:string; base64:string };
export type AttachmentRow = {
  date:string; direction:"expense"|"income"; amountCents:number;
  description:string; category:string; subcategory:string;
  counterparty:string; paymentType:string; accountHint:string;
};
export const MAX_ATTACHMENT_BYTES = 4_000_000;
const supported = new Set(["application/pdf","image/jpeg","image/png","image/webp","text/plain","text/csv","application/x-ofx"]);
const image = new Set(["image/jpeg","image/png","image/webp"]);
const b64pattern = /^[A-Za-z0-9+/]+={0,2}$/;
const clean = (x:unknown,cap:number) => typeof x === "string" ? x.trim().slice(0,cap) : "";
const validDate = (value:string) => {
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
 if(!match)return false;
 const dt=new Date(Date.UTC(+match[1],+match[2]-1,+match[3]));
 return Number.isFinite(dt.getTime())&&dt.toISOString().slice(0,10)===value;
};
export function validateAttachment(value:unknown):
  {ok:true; file:AttachmentInput; bytes:number; format:"image"|"pdf"|"text"} |
  {ok:false; error:string} {
 if(!value||typeof value!=="object")return{ok:false,error:"invalid_attachment"};
 const body=value as Record<string,unknown>;
 const mimeType=clean(body.mimeType,64).toLowerCase();
 const name=clean(body.name,100).replace(/[\u0000-\u001f]/g,"");
 const base64=typeof body.base64==="string"?body.base64:"";
 if(!name||!supported.has(mimeType))return{ok:false,error:"unsupported_attachment_type"};
 if(base64.length<8||base64.length>Math.ceil(MAX_ATTACHMENT_BYTES/3)*4+8||
   base64.length%4!==0||!b64pattern.test(base64))return{ok:false,error:"invalid_attachment_data"};
 const pad=base64.endsWith("==")?2:base64.endsWith("=")?1:0;
 const bytes=base64.length/4*3-pad;
 if(bytes<8||bytes>MAX_ATTACHMENT_BYTES)return{ok:false,error:"attachment_size_limit"};
 if(mimeType==="application/pdf"&&!base64.startsWith("JVBERi0"))return{ok:false,error:"invalid_pdf_signature"};
 if(mimeType==="image/png"&&!base64.startsWith("iVBORw0KGgo"))return{ok:false,error:"invalid_image_signature"};
 if(mimeType==="image/jpeg"&&!base64.startsWith("/9j/"))return{ok:false,error:"invalid_image_signature"};
 if(mimeType==="image/webp"&&!base64.startsWith("UklGR"))return{ok:false,error:"invalid_image_signature"};
 return{ok:true,file:{name,mimeType,base64},bytes,format:image.has(mimeType)?"image":mimeType==="application/pdf"?"pdf":"text"};
}
export function parseAttachmentOutput(raw:unknown) {
 if(typeof raw!=="string"||raw.length>40000)return{ok:false as const,error:"invalid_model_response"};
 let obj:Record<string,unknown>;
 try {
  const cleaned=raw.trim().replace(/^\x60{3}(?:json)?\s*/i,"").replace(/\s*\x60{3}$/,"");
  obj=JSON.parse(cleaned);
 } catch {return{ok:false as const,error:"invalid_model_json"}}
 if(!obj||typeof obj!=="object"||!Array.isArray(obj.items))
  return{ok:false as const,error:"invalid_model_structure"};
 const items:AttachmentRow[]=[];
 const warnings:string[]=[];
 const candidates=obj.items.slice(0,50);
 for(let i=0;i<candidates.length;i++){
  const item=candidates[i];
  if(!item||typeof item!=="object"){warnings.push("invalid_row_"+i);continue}
  const x=item as Record<string,unknown>;
  const amount=Number(x.amount);
  const cents=Math.round(amount*100);
  const date=clean(x.date,10);
  const direction=x.direction;
  const description=clean(x.description,240);
  if(!Number.isFinite(amount)||amount<=0||!Number.isSafeInteger(cents)||cents<=0||
    !validDate(date)||(direction!=="expense"&&direction!=="income")||!description){
    warnings.push("incomplete_row_"+i);continue;
  }
  items.push({
   date,direction,amountCents:cents,description,
   category:clean(x.category,80)||"Outros",
   subcategory:clean(x.subcategory,80),
   counterparty:clean(x.counterparty,120),
   paymentType:clean(x.paymentType,40),
   accountHint:clean(x.accountHint,80)
  });
 }
 return {ok:true as const,items,warnings,hasMore:obj.items.length>50};
}
