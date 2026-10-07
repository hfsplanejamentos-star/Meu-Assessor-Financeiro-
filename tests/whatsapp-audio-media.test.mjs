import assert from 'node:assert/strict';
import {webcrypto,createHash} from 'node:crypto';
import {parseWhatsAppAudio,parseWhatsApp} from '../convex/whatsappPayload.ts';
import {transcribeWhatsAppAudio,safeMediaUrl,MAX_AUDIO_BYTES} from '../convex/whatsappAudioMedia.ts';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const message={id:'wamid.audio',from:'5511999999999',timestamp:'1791298800',type:'audio',audio:{id:'123456',mime_type:'audio/ogg; codecs=opus'}};
const payload={object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value:{metadata:{phone_number_id:'business-id'},messages:[message]}}]}]};
assert.equal(parseWhatsAppAudio(payload,message.from,'business-id').length,1);
assert.equal(parseWhatsApp(payload,message.from,'business-id').length,0);
assert.equal(parseWhatsAppAudio(payload,'other','business-id').length,0);
assert.equal(parseWhatsAppAudio(payload,message.from,'other').length,0);
message.audio.id='../../evil';assert.equal(parseWhatsAppAudio(payload,message.from,'business-id').length,0);message.audio.id='123456';
for(const url of ['http://lookaside.fbsbx.com/file','https://lookaside.fbsbx.com.evil.test/file','https://token@lookaside.fbsbx.com/file','https://localhost/file','https://lookaside.fbsbx.com:444/file'])assert.equal(safeMediaUrl(url),null);
const bytes=new TextEncoder().encode('synthetic audio fixture'),digest=createHash('sha256').update(bytes).digest('base64');
const input={mediaId:'123456',phoneNumberId:'business-id',graphVersion:'v25.0',accessToken:'mock-meta-token',openAiKey:'mock-openai-key',sha256:digest};
function provider({url='https://lookaside.fbsbx.com/whatsapp_business/attachments',size=bytes.length,transcript='Gastei 18 reais e 90 centavos de cerveja no C6.',status=200,sha=digest}={}){
 const calls=[];
 const fetcher=async(target,options)=>{
  calls.push({target,options});assert.equal(options.redirect??'error','error');
  if(target.startsWith('https://graph.facebook.com/')){assert(target.includes('phone_number_id=business-id'));assert.equal(options.headers.Authorization,'Bearer mock-meta-token');return Response.json({url,mime_type:'audio/ogg; codecs=opus',file_size:size,sha256:sha});}
  if(target.startsWith('https://lookaside.fbsbx.com/'))return new Response(bytes,{headers:{'content-length':String(bytes.length)}});
  assert.equal(target,'https://api.openai.com/v1/audio/transcriptions');assert.equal(options.headers.Authorization,'Bearer mock-openai-key');assert.equal(options.body.get('language'),'pt');assert.equal(options.body.get('file').name,'mensagem.ogg');assert.equal(options.body.get('response_format'),'json');return Response.json({text:transcript},{status});
 };return {calls,fetcher};
}
let mock=provider();assert.match(await transcribeWhatsAppAudio(input,mock.fetcher),/cerveja/);assert.equal(mock.calls.length,3);
mock=provider({url:'https://evil.test/steal'});await assert.rejects(transcribeWhatsAppAudio(input,mock.fetcher),e=>e.code==='invalid_media_url');assert.equal(mock.calls.length,1,'Meta token must never reach an arbitrary media URL');
mock=provider({size:MAX_AUDIO_BYTES+1});await assert.rejects(transcribeWhatsAppAudio(input,mock.fetcher),e=>e.code==='audio_too_large');assert.equal(mock.calls.length,1);
mock=provider();await assert.rejects(transcribeWhatsAppAudio({...input,sha256:'0'.repeat(64)},mock.fetcher),e=>e.code==='audio_checksum_mismatch');assert.equal(mock.calls.length,2,'Bad audio must not be sent to transcription');
mock=provider({transcript:''});await assert.rejects(transcribeWhatsAppAudio(input,mock.fetcher),e=>e.code==='empty_transcript');
mock=provider({status:503});await assert.rejects(transcribeWhatsAppAudio(input,mock.fetcher),e=>e.code==='transcription_unavailable'&&e.retryable);
mock=provider();await assert.rejects(transcribeWhatsAppAudio({...input,accessToken:''},mock.fetcher),e=>e.code==='audio_not_configured');assert.equal(mock.calls.length,0);
console.log('PASS WhatsApp audio owner isolation, bounded media download, URL/token isolation, checksum, multipart transcription and failures');
