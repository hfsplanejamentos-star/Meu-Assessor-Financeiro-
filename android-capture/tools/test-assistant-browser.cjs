const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const watchdog=setTimeout(()=>{console.error('Assistant browser test timed out');process.exit(1)},90000);watchdog.unref();
(async()=>{
 const base=fs.readFileSync('android-capture/app/src/main/assets/snake-finance-mobile.html','utf8');
 const layer=fs.readFileSync('android-capture/app/src/main/assets/snake-graphs-3d.js','utf8');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const ctx=await browser.newContext({viewport:{width:393,height:852}});
 await ctx.addInitScript(()=>{
  const now=new Date(),day=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  const ledger=[{id:1,d:day,n:'Receita de exemplo',t:'r',s:'r',a:'c6',v:100000,c:'out'}];
  localStorage.setItem('assessor_tx_v43',JSON.stringify(ledger));localStorage.setItem('assessor_tx',JSON.stringify(ledger));
  localStorage.setItem('assessor_openings_v83',JSON.stringify({c6:0,caju:100000,cajuFunds:0}));
  const map={url:'',configured:false};window.assistantTestRequests=[];
  window.AndroidBridge={
   getPendingNotifications:()=> '[]',showFinancialAlert:()=>false,
   getIntegrationConfig:()=>JSON.stringify(map),
   saveIntegrationConfig:(url,key)=>{map.url=url;map.configured=key.length>=32;return map.configured;},
   clearIntegrationConfig:()=>{map.url='';map.configured=false;return true;},
   startVoiceInput:()=>window.dispatchEvent(new CustomEvent('android-voice-result',{detail:'Gastei R$ 25,90 com almoço no Caju hoje'})),
   integrationRequest:(id,path,method,body)=>{
    window.assistantTestRequests.push({path,method,body});
    const date=new Date(),today=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
    const result=path==='/integrations/status'?{ok:true,ai:true,whatsapp:false,audio:false}:{intent:'transaction',draft:{date:today,value:-25.90,cat:'ali',sub:'Refeição',desc:'Almoço de teste',account:'caju',status:'draft'}};
    setTimeout(()=>window.dispatchEvent(new CustomEvent('snake-integration-result',{detail:{id,status:200,body:JSON.stringify(result)}})),0);
   }
  };
 });
 await ctx.route('**/*',route=>route.fulfill({contentType:'text/html',body:base.replace('</body>','<script>'+layer+'</script></body>')}));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto('https://snake-test.local/assistant');console.log('IA test: page ready');
 await page.evaluate(async()=>{
  captureSettings();document.getElementById('capture-key').value='test-only-not-a-production-key-123456789';
  await captureConnect();console.log('IA test: connected');
  if(!document.getElementById('capture-status').textContent.includes('IA: configurada'))throw Error('IA handshake');
  closeDay();const count=L.length,requests=window.assistantTestRequests.length;
  captureVoice();console.log('IA test: voice delivered');
  if(!document.getElementById('capture-question').value.includes('25,90'))throw Error('Voice text not delivered');
  if(window.assistantTestRequests.length!==requests||L.length!==count)throw Error('Voice must not send or save automatically');
  await captureAsk();console.log('IA test: draft ready');
  if(MD!=='capture-draft'||L.length!==count)throw Error('IA must open a review draft');
  await captureSave();console.log('IA test: saved after confirmation');
  if(L.length!==count+1||L[L.length-1].v!==2590||L[L.length-1].a!=='caju')throw Error('Confirmed voice draft not saved');
  if(JSON.stringify(backupState()).includes('test-only-not-a-production-key'))throw Error('Credential leaked into backup');
 });
 assert.deepEqual(errors,[]);
 await browser.close();clearTimeout(watchdog);console.log('PASS: native bridge handshake, voice, IA draft, explicit save and secret exclusion from backups.');
})().catch(e=>{console.error(e);process.exit(1)});
