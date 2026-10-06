const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const internal={whatsappAudio:{transcribe:'audio-job',recover:'audio-recover'}},rows=[],scheduled=[];
const context={db:{query:()=>({withIndex(name,fn){const filters=[],q={eq(k,v){filters.push([k,v]);return q;}};fn(q);return {unique:async()=>rows.find(r=>filters.every(([k,v])=>r[k]===v))||null};}}),get:async id=>rows.find(r=>r._id===id)||null,insert:async(table,data)=>{const id=String(rows.length+1);rows.push({...data,_id:id});return id;},patch:async(id,patch)=>{const row=rows.find(r=>r._id===id);for(const [k,v] of Object.entries(patch)){if(v===undefined)delete row[k];else row[k]=v;}}},scheduler:{runAfter:async(delay,fn,args)=>scheduled.push({delay,fn,args})}};
const source=ts.transpileModule(fs.readFileSync('convex/whatsappAudio.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const sandbox={exports:{},process:{env:{}},require:name=>name==='./_generated/server'?{internalAction:x=>x,internalMutation:x=>x}:name==='./_generated/api'?{internal}:name==='./whatsappAudioMedia'?{}:require(name)};vm.runInNewContext(source,sandbox);const ops=sandbox.exports;
(async()=>{
 const audio={messageId:'wamid.audio',from:'owner',mediaId:'123456',mimeType:'audio/ogg',postedAt:1791298800000};
 await ops.ingest.handler(context,{ownerHash:'A',messages:[audio],receivedAt:1});assert.equal(rows[0].status,'processing');assert.equal(scheduled.length,1);
 assert.equal((await ops.ingest.handler(context,{ownerHash:'A',messages:[audio],receivedAt:2})).duplicates,1);assert.equal(scheduled.length,1,'Webhook replay must not reschedule paid transcription');
 const first=await ops.claim.handler(context,{inboxId:'1',now:1000});assert.equal(first.attempt,1);assert.equal(await ops.claim.handler(context,{inboxId:'1',now:1001}),null,'Lease stops concurrent jobs');
 await ops.finish.handler(context,{inboxId:'1',attempt:1,error:'transcription_unavailable',retryable:true});assert.equal(rows[0].status,'processing');assert.equal(scheduled.at(-1).delay,15000);
 const second=await ops.claim.handler(context,{inboxId:'1',now:2000});assert.equal(second.attempt,2);
 await ops.finish.handler(context,{inboxId:'1',attempt:1,text:'late old result',retryable:false});assert.equal(rows[0].text,'','Late results cannot overwrite current attempt');
 await ops.finish.handler(context,{inboxId:'1',attempt:2,text:'Gastei 18,90 no C6.',retryable:false});assert.equal(rows[0].status,'pending');assert.equal(rows[0].text,'Gastei 18,90 no C6.');
 await ops.ingest.handler(context,{ownerHash:'A',messages:[{...audio,messageId:'discarded'}],receivedAt:3});await ops.claim.handler(context,{inboxId:'2',now:1000});rows[1].status='discarded';await ops.finish.handler(context,{inboxId:'2',attempt:1,text:'must not return',retryable:false});assert.equal(rows[1].status,'discarded');assert.equal(rows[1].text,'');
 await ops.ingest.handler(context,{ownerHash:'A',messages:[{...audio,messageId:'retry-limit'}],receivedAt:4});
 for(let attempt=1;attempt<=3;attempt++){await ops.claim.handler(context,{inboxId:'3',now:attempt*1000});await ops.finish.handler(context,{inboxId:'3',attempt,error:'audio_connection_failed',retryable:true});}
 assert.equal(rows[2].status,'failed');assert.equal(await ops.claim.handler(context,{inboxId:'3',now:999999}),null,'Only three automatic attempts');
 await ops.ingest.handler(context,{ownerHash:'A',messages:[{...audio,messageId:'crash-recovery'}],receivedAt:5});await ops.claim.handler(context,{inboxId:'4',now:1});await ops.recover.handler(context,{inboxId:'4',attempt:1});assert.equal(rows[3].leaseUntil,0);assert.equal(scheduled.at(-1).fn,'audio-job');
 console.log('PASS audio scheduling dedup, leases, bounded retry, stale-result protection, discard and crash recovery');
})().catch(error=>{console.error(error);process.exitCode=1;});
