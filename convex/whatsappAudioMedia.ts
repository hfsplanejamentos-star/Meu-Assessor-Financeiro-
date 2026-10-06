/** Bounded provider IO. Binary audio is held only while transcribing; URLs/tokens are not stored. */
export const MAX_AUDIO_BYTES=10*1024*1024;
export class AudioFailure extends Error {
  code:string;retryable:boolean;
  constructor(code:string,retryable=false){super(code);this.code=code;this.retryable=retryable;}
}
const formats:Record<string,string>={'audio/ogg':'ogg','audio/mpeg':'mp3','audio/mp4':'m4a','audio/wav':'wav','audio/x-wav':'wav','audio/webm':'webm','audio/flac':'flac'};
export function audioFormat(mime:string){return formats[mime.split(';')[0].trim().toLowerCase()]||null;}
export function safeMediaUrl(value:unknown):string|null{
  if(typeof value!=='string')return null;
  try{const u=new URL(value);return u.protocol==='https:' && ['lookaside.fbsbx.com','mmg.whatsapp.net'].includes(u.hostname) && !u.username && !u.password && (!u.port||u.port==='443') && !u.hash?u.href:null;}catch{return null;}
}
async function checkResponse(response:Response,code:string){if(!response.ok)throw new AudioFailure(code,response.status===429||response.status>=500);}
async function boundedBytes(response:Response):Promise<Uint8Array>{
  if(Number(response.headers.get('content-length')||0)>MAX_AUDIO_BYTES)throw new AudioFailure('audio_too_large');
  const reader=response.body?.getReader();if(!reader)throw new AudioFailure('empty_audio');
  const parts:Uint8Array[]= [];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_AUDIO_BYTES){await reader.cancel();throw new AudioFailure('audio_too_large');}parts.push(value);}}finally{reader.releaseLock();}
  if(!size)throw new AudioFailure('empty_audio');const output=new Uint8Array(size);let offset=0;for(const p of parts){output.set(p,offset);offset+=p.length;}return output;
}
function checksum(value:string):string|null{
  if(/^[a-f0-9]{64}$/i.test(value))return value.toLowerCase();
  try{const bytes=atob(value);if(bytes.length!==32)return null;return [...bytes].map(x=>x.charCodeAt(0).toString(16).padStart(2,'0')).join('');}catch{return null;}
}
export async function transcribeWhatsAppAudio(input:{mediaId:string;sha256?:string;phoneNumberId:string;graphVersion:string;accessToken:string;openAiKey:string;model?:string},fetcher:typeof fetch=fetch):Promise<string>{
  if(!input.accessToken || !input.openAiKey || !/^v\d{1,2}\.\d+$/.test(input.graphVersion) || !/^\d{1,128}$/.test(input.mediaId))throw new AudioFailure('audio_not_configured');
  try{
    const headers={Authorization:`Bearer ${input.accessToken}`};
    const metaResponse=await fetcher(`https://graph.facebook.com/${input.graphVersion}/${input.mediaId}?phone_number_id=${encodeURIComponent(input.phoneNumberId)}`,{headers,redirect:'error',signal:AbortSignal.timeout(15000)});
    await checkResponse(metaResponse,'media_unavailable');const meta=await metaResponse.json() as any;
    const url=safeMediaUrl(meta?.url),format=typeof meta?.mime_type==='string'?audioFormat(meta.mime_type):null;
    if(!url)throw new AudioFailure('invalid_media_url');if(!format)throw new AudioFailure('unsupported_audio');
    if(typeof meta.file_size!=='number'||!Number.isSafeInteger(meta.file_size)||meta.file_size<=0)throw new AudioFailure('invalid_audio_metadata');
    if(meta.file_size>MAX_AUDIO_BYTES)throw new AudioFailure('audio_too_large');
    const audioResponse=await fetcher(url,{headers,redirect:'error',signal:AbortSignal.timeout(30000)});await checkResponse(audioResponse,'media_unavailable');
    const bytes=await boundedBytes(audioResponse);if(bytes.byteLength!==meta.file_size)throw new AudioFailure('audio_size_mismatch');
    const expected=input.sha256||meta.sha256;
    if(expected){const normalized=checksum(expected);if(!normalized)throw new AudioFailure('invalid_audio_checksum');const actual=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.buffer as ArrayBuffer))].map(x=>x.toString(16).padStart(2,'0')).join('');if(actual!==normalized)throw new AudioFailure('audio_checksum_mismatch');}
    const form=new FormData();form.append('file',new Blob([bytes as BlobPart],{type:meta.mime_type}),`mensagem.${format}`);form.append('model',input.model||'gpt-4o-mini-transcribe');form.append('language','pt');form.append('response_format','json');
    const response=await fetcher('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${input.openAiKey}`},body:form,signal:AbortSignal.timeout(60000)});
    await checkResponse(response,'transcription_unavailable');const result=await response.json() as any;
    if(typeof result?.text!=='string'||!result.text.trim())throw new AudioFailure('empty_transcript');if(result.text.length>4000)throw new AudioFailure('transcript_too_long');return result.text.trim();
  }catch(error){if(error instanceof AudioFailure)throw error;throw new AudioFailure('audio_connection_failed',true);}
}
