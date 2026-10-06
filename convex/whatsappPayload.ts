/** Meta Cloud API text inbox. No ledger mutations or outbound messages. */
export type InboxMessage = { messageId: string; from: string; text: string; postedAt: number };
export async function validSignature(raw: string, signature: string, secret: string): Promise<boolean> {
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['verify']);
  const bytes = Uint8Array.from(signature.slice(7).match(/../g)!, x=>parseInt(x,16));
  return crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(raw));
}
export function parseWhatsApp(payload: unknown, allowedPhone: string, phoneNumberId: string): InboxMessage[] {
  if (!allowedPhone || !phoneNumberId || !payload || typeof payload !== 'object') return [];
  const value = payload as any;
  if (value.object !== 'whatsapp_business_account') return [];
  const result: InboxMessage[] = [];
  for (const entry of Array.isArray(value.entry) ? value.entry.slice(0,10) : []) {
    if (!entry || typeof entry !== 'object') continue;
    for (const change of Array.isArray(entry.changes) ? entry.changes.slice(0,10) : []) {
      if (!change || typeof change !== 'object') continue;
      if (change.field !== 'messages' || change.value?.metadata?.phone_number_id !== phoneNumberId) continue;
      for (const m of Array.isArray(change.value?.messages) ? change.value.messages.slice(0,50) : []) {
        if (!m || typeof m !== "object") continue;
        const postedAt = Number(m.timestamp) * 1000;
        if (m.from !== allowedPhone || m.type !== 'text' || typeof m.id !== 'string' || !m.id || m.id.length>256 || typeof m.text?.body !== 'string' || !m.text.body.trim() || m.text.body.length>4000 || !Number.isSafeInteger(postedAt) || postedAt<=0) continue;
        result.push({messageId:m.id,from:m.from,text:m.text.body.trim(),postedAt});
        if(result.length===50)return result;
      }
    }
  }
  return result;
}
