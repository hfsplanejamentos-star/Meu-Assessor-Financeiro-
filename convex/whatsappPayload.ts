/** Signed Meta inbox input. Only the configured sender/business number is accepted. */
export type InboxMessage = { messageId:string; from:string; text:string; postedAt:number };
export type AudioMessage = { messageId:string; from:string; mediaId:string; mimeType:string; sha256?:string; postedAt:number };
export async function validSignature(raw:string,signature:string,secret:string):Promise<boolean>{
  if(!secret || !/^sha256=[a-f0-9]{64}$/.test(signature))return false;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const bytes=Uint8Array.from(signature.slice(7).match(/../g)!,x=>parseInt(x,16));
  return crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(raw));
}
function acceptedMessages(payload:unknown,allowedPhone:string,phoneNumberId:string):Array<InboxMessage|AudioMessage>{
  if(!allowedPhone || !phoneNumberId || !payload || typeof payload!=='object')return [];
  const value=payload as any;if(value.object!=='whatsapp_business_account')return [];
  const result:Array<InboxMessage|AudioMessage>=[];
  for(const entry of Array.isArray(value.entry)?value.entry.slice(0,10):[]){
    if(!entry || typeof entry!=='object')continue;
    for(const change of Array.isArray(entry.changes)?entry.changes.slice(0,10):[]){
      if(!change || typeof change!=='object' || change.field!=='messages' || change.value?.metadata?.phone_number_id!==phoneNumberId)continue;
      for(const m of Array.isArray(change.value?.messages)?change.value.messages.slice(0,50):[]){
        if(!m || typeof m!=='object')continue;const postedAt=Number(m.timestamp)*1000;
        if(m.from!==allowedPhone || typeof m.id!=='string' || !m.id || m.id.length>256 || !Number.isSafeInteger(postedAt) || postedAt<=0)continue;
        if(m.type==='text' && typeof m.text?.body==='string' && m.text.body.trim() && m.text.body.length<=4000)
          result.push({messageId:m.id,from:m.from,text:m.text.body.trim(),postedAt});
        else if(m.type==='audio' && typeof m.audio?.id==='string' && /^\d{1,128}$/.test(m.audio.id) && typeof m.audio.mime_type==='string' && m.audio.mime_type.length<=100)
          result.push({messageId:m.id,from:m.from,mediaId:m.audio.id,mimeType:m.audio.mime_type,postedAt,...(typeof m.audio.sha256==='string'&&m.audio.sha256.length<=100?{sha256:m.audio.sha256}:{})});
        if(result.length===50)return result;
      }
    }
  }
  return result;
}
export function parseWhatsApp(payload:unknown,allowedPhone:string,phoneNumberId:string):InboxMessage[]{return acceptedMessages(payload,allowedPhone,phoneNumberId).filter((m):m is InboxMessage=>'text' in m);}
export function parseWhatsAppAudio(payload:unknown,allowedPhone:string,phoneNumberId:string):AudioMessage[]{return acceptedMessages(payload,allowedPhone,phoneNumberId).filter((m):m is AudioMessage=>'mediaId' in m);}
