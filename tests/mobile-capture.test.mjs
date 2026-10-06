import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import {chromium} from 'playwright';
const html=fs.readFileSync('android-capture/app/src/main/assets/dashboard-mobile.html','utf8');
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.UI_BROWSER_CHANNEL?{channel:process.env.UI_BROWSER_CHANNEL}:{})});
const page=await browser.newPage({viewport:{width:393,height:852},timezoneId:'America/Sao_Paulo',locale:'pt-BR'}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 localStorage.setItem('assessor_openings_v83',JSON.stringify({c6:100000,caju:150000,cajuFunds:150000}));
 localStorage.setItem('assessor_tx_v43','[]');
 window.testQueue=[{id:'bank-first',sourcePackage:'com.c6bank.app',title:'Compra aprovada',text:'Compra de R$ 25,90 no C6',amountCents:2590,direction:'expense',postedAt:1791298800000}];
 window.testAlerts=[];window.alert=x=>testAlerts.push(x);window.confirm=()=>window.testConfirm!==false;
 window.testConfig={configured:false,url:''};window.testWa=[];window.testResolveCalls=[];
 window.AndroidBridge={
  getPendingNotifications:()=>JSON.stringify(testQueue),
  acknowledgeNotifications:json=>{if(window.testAckFail)return false;const ids=JSON.parse(json);if(window.testArrival){testQueue.push(window.testArrival);window.testArrival=null;}testQueue=testQueue.filter(e=>!ids.includes(e.id));return true;},
  getIntegrationConfig:()=>JSON.stringify(testConfig),
  saveIntegrationConfig:(url,key)=>{testConfig={url,configured:true};return true;},clearIntegrationConfig:()=>{testConfig={url:'',configured:false};return true;},
  integrationRequest:(id,path,method,raw)=>{setTimeout(()=>{
   let body={ok:true,whatsapp:true,ai:true,audio:true},status=200;
   if(path==='/whatsapp/messages')body={ok:true,messages:testWa};
   if(path==='/whatsapp/resolve'){const payload=JSON.parse(raw);testResolveCalls.push(payload);if(window.testWaAckFail){status=502;body={error:'connection_failed'};}else testWa=testWa.filter(m=>!payload.messageIds.includes(m.messageId));}
   if(path==='/whatsapp/retry'){const payload=JSON.parse(raw);testWa=testWa.map(m=>m.messageId===payload.messageId?{...m,status:'processing'}:m);}
   if(path==='/ai/finance')body=window.testAiResponse||{intent:'answer',answer:'Resposta de teste.'};
   window.dispatchEvent(new CustomEvent('snake-integration-result',{detail:{id,status,body:JSON.stringify(body)}}));
  },5);}
 };
});
const count=()=>page.evaluate(()=>({ledger:L.length,queue:testQueue.length,storage:JSON.parse(localStorage.getItem('assessor_tx_v43')).length}));
const open=async()=>{await page.evaluate(()=>reviewNativeNotifications());await page.getByRole('button',{name:'Revisar e registrar',exact:true}).first().click();};
try{
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
 await page.evaluate(()=>{closeDay();ST.hide=false;ST.msg=false;});
 await open();assert.equal(await page.locator('#capture-save').isVisible(),true,'Bank save is available with message registration disabled');assert.equal(await page.locator('#capture-amount').inputValue(),'25,90');assert.equal(await page.locator('#capture-account').inputValue(),'c6');
 await page.getByRole('button',{name:'Cancelar e manter pendente'}).click();assert.deepEqual(await count(),{ledger:0,queue:1,storage:0});
 await open();
 await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='assessor_tx_v43')throw Error('quota');return originalSetItem.call(this,k,v);};});
 await page.getByRole('button',{name:'Salvar lançamento',exact:true}).click();assert.deepEqual(await count(),{ledger:0,queue:1,storage:0});
 await page.evaluate(()=>{Storage.prototype.setItem=originalSetItem;});
 await page.getByRole('button',{name:'Salvar lançamento',exact:true}).click();await page.waitForFunction(()=>testQueue.length===0);
 assert.deepEqual(await count(),{ledger:1,queue:0,storage:1});assert.equal(await page.evaluate(()=>L[0].captureId),'bank:bank-first');assert.equal(await page.locator('#md').isVisible(),false,'Save returns to panel');
 // An acknowledgement failure after a durable write must not create another entry on retry.
 await page.evaluate(()=>{testQueue=[{id:'bank-retry',sourcePackage:'com.c6bank.app',title:'Compra',text:'C6 R$ 30,00',amountCents:3000,direction:'expense',postedAt:1791298800000}];testAckFail=true;});
 await open();await page.getByRole('button',{name:'Salvar lançamento',exact:true}).click();await page.waitForFunction(()=>L.length===2);assert.deepEqual(await count(),{ledger:2,queue:1,storage:2});
 await page.evaluate(()=>{testAckFail=false;reviewNativeNotifications();});await page.getByRole('button',{name:'Concluir revisão',exact:true}).click();await page.waitForFunction(()=>testQueue.length===0);assert.equal((await count()).ledger,2);
 // Snapshot acknowledgement keeps an event arriving during clear; ledger is untouched.
 await page.evaluate(()=>{testQueue=[{id:'clear-old',sourcePackage:'com.c6bank.app',title:'Old',text:'R$ 10,00',amountCents:1000,postedAt:1791298800000}];reviewNativeNotifications();testArrival={id:'clear-new',sourcePackage:'com.c6bank.app',title:'New',text:'R$ 20,00',amountCents:2000,postedAt:1791298800000};});
 await page.getByRole('button',{name:'Limpar pendentes',exact:true}).click();await page.waitForFunction(()=>testQueue.length===1&&testQueue[0].id==='clear-new');assert.equal((await count()).ledger,2);
 await page.evaluate(()=>{ST.hide=true;reviewNativeNotifications();});assert(!(await page.locator('#md').innerText()).includes('20,00'));assert((await page.locator('#md').innerText()).includes('••••'));await page.evaluate(()=>{ST.hide=false;closeDay();});
 // Unrecognized bank + ambiguous type must require explicit account and direction.
 await page.evaluate(()=>{testQueue=[{id:'unknown',sourcePackage:'br.com.xp.carteira',title:'Movimentação',text:'R$ 10,00',amountCents:1000,direction:'unknown',postedAt:1791298800000}];});await open();assert.equal(await page.locator('#capture-account').inputValue(),'');assert.equal(await page.locator('#capture-type').inputValue(),'');await page.getByRole('button',{name:'Salvar lançamento',exact:true}).click();assert.equal((await count()).ledger,2);await page.evaluate(()=>closeDay());
 // Connect a mocked service, then review and save a WhatsApp text with source provenance.
 await page.evaluate(()=>{ST.msg=true;});
 await page.evaluate(()=>captureSettings());await page.locator('#capture-url').fill('https://test-service.convex.site');await page.locator('#capture-key').fill('test-owner-key-with-at-least-32-characters');await page.getByRole('button',{name:'Conectar e verificar'}).click();await page.waitForFunction(()=>document.getElementById('capture-status').textContent.includes('Serviço conectado'));
 await page.evaluate(()=>{closeDay();testWa=[{messageId:'wamid.test',text:'Gastei R$ 12,34 no Caju',from:'5511999999999',postedAt:1791298800000}];AS='wa';goTab('as');});await page.getByRole('button',{name:'Atualizar',exact:true}).click();await page.waitForFunction(()=>document.getElementById('v').textContent.includes('12,34'));
 await page.getByRole('button',{name:'Revisar e registrar',exact:true}).click();assert.equal(await page.locator('#capture-amount').inputValue(),'12,34');assert.equal(await page.locator('#capture-account').inputValue(),'caju');
 await page.getByRole('button',{name:'Salvar lançamento',exact:true}).click();await page.waitForFunction(()=>testWa.length===0);assert.equal(await page.evaluate(()=>L.at(-1).captureId),'whatsapp:wamid.test');assert.equal(await page.evaluate(()=>testResolveCalls.at(-1).status),'recorded');
 // Malformed AI output cannot alter ledger or acknowledge anything.
 await page.evaluate(()=>{AS='chat';goTab('as');testAiResponse={intent:'transaction',draft:{value:NaN,date:'bad',desc:'Invalid'}};});await page.locator('#capture-question').fill('gastei hoje');await page.getByRole('button',{name:'Enviar para IA'}).click();await page.waitForTimeout(30);assert.equal((await count()).ledger,3);
 await page.evaluate(()=>{testAiResponse={intent:'transaction',draft:{value:-19.90,date:'2026-10-06',desc:'Almoço',cat:'Alimentação',sub:'desconhecida'}};});await page.locator('#capture-question').fill('gastei R$ 19,90 com almoço');await page.getByRole('button',{name:'Enviar para IA'}).click();await page.waitForSelector('#capture-account');assert.equal((await count()).ledger,3,'AI only opens a draft');await page.locator('#capture-account').selectOption('c6');await page.getByRole('button',{name:'Salvar lançamento',exact:true}).click();await page.waitForFunction(()=>L.length===4);assert.equal(await page.evaluate(()=>testResolveCalls.length),1,'A manual AI draft must not acknowledge a WhatsApp message');
 // Audio processing/failed states never open a payable draft; retry preserves the message ID.
 await page.evaluate(()=>{testWa=[{messageId:'wamid.voice',kind:'audio',status:'processing',text:'',from:'5511999999999',postedAt:1791298800000}];AS='wa';goTab('as');});await page.getByRole('button',{name:'Atualizar',exact:true}).click();await page.waitForSelector('button:has-text("Transcrevendo…")');assert.equal(await page.getByRole('button',{name:'Transcrevendo…',exact:true}).isDisabled(),true);await page.evaluate(()=>captureOpen(0));assert.equal((await count()).ledger,4);
 await page.evaluate(()=>{testWa[0].status='failed';testWa[0].transcriptionError='audio_not_configured';});await page.getByRole('button',{name:'Atualizar',exact:true}).click();await page.getByRole('button',{name:'Tentar transcrição novamente'}).click();await page.waitForFunction(()=>testWa[0].status==='processing');
 await page.evaluate(()=>{testWa[0]={...testWa[0],status:'pending',text:'Gastei dezoito reais e noventa centavos com cerveja no C6.'};testAiResponse={intent:'transaction',draft:{value:-18.90,date:'2026-10-06',desc:'Cerveja',cat:'Cerveja',sub:'',account:'c6',status:'draft'}};setT('ciano');});await page.getByRole('button',{name:'Atualizar',exact:true}).click();await page.waitForFunction(()=>document.getElementById('v').textContent.includes('Transcrito'));
 await page.evaluate(()=>{ST.hide=true;draw();});assert(!(await page.locator('#v').innerText()).includes('dezoito reais'));await page.evaluate(()=>{ST.hide=false;draw();});assert.equal(await page.locator('#native-review').isVisible(),false,'Bank shortcut must not cover the WhatsApp actions');
 fs.mkdirSync('validation/mobile-ui',{recursive:true});await page.screenshot({path:'validation/mobile-ui/WhatsApp_Audio_Recebido.png'});
 await page.getByRole('button',{name:'Revisar e registrar',exact:true}).click();await page.waitForSelector('#capture-name');assert.equal(await page.locator('#capture-amount').inputValue(),'18,90');assert.equal(await page.locator('#capture-account').inputValue(),'c6');assert.equal(await page.locator('#capture-category').inputValue(),'cer');assert((await page.locator('#md').innerText()).includes('dezoito reais'));assert.equal((await count()).ledger,4,'Transcription/AI must not write the ledger');
 await page.getByRole('button',{name:'Cancelar e manter pendente'}).click();assert.equal(await page.evaluate(()=>testWa.length),1);assert.equal((await count()).ledger,4);
 await page.getByRole('button',{name:'Revisar e registrar',exact:true}).click();await page.waitForSelector('#capture-name');await page.screenshot({path:'validation/mobile-ui/WhatsApp_Audio_Rascunho.png'});await page.getByRole('button',{name:'Salvar lançamento',exact:true}).click();await page.waitForFunction(()=>L.length===5&&testWa.length===0);assert.equal(await page.evaluate(()=>L.at(-1).captureId),'whatsapp:wamid.voice');assert.equal(await page.evaluate(()=>auditEngine().ok),true);assert.equal(await page.locator('#md').isVisible(),false);
 // Advisor clear only hides current signatures; financial records remain intact.
 await page.evaluate(()=>{L.push({...L[0],id:nextId(),captureId:undefined});persistLedger();AS='av';goTab('as');});const before=await page.evaluate(()=>JSON.stringify(L));assert(await page.locator('.advisorNotice').count());await page.getByRole('button',{name:'Limpar avisos de hoje'}).click();assert.equal(await page.locator('.advisorNotice').count(),0);assert.equal(await page.evaluate(()=>JSON.stringify(L)),before);await page.getByRole('button',{name:'Mostrar avisos limpos'}).click();assert(await page.locator('.advisorNotice').count());
 // Actual rendered previews contain synthetic fixtures only.
 fs.mkdirSync('validation/mobile-ui',{recursive:true});
 await page.evaluate(()=>{testQueue=[{id:'preview',sourcePackage:'com.c6bank.app',title:'Compra aprovada · C6',text:'Compra de R$ 25,90 · exemplo de teste',amountCents:2590,direction:'expense',postedAt:1791298800000}];reviewNativeNotifications();});await page.screenshot({path:'validation/mobile-ui/Captura_Notificacoes.png'});await page.getByRole('button',{name:'Revisar e registrar',exact:true}).click();await page.screenshot({path:'validation/mobile-ui/Captura_Rascunho.png'});
 assert.equal(errors.length,0,errors.join('\n'));
 fs.writeFileSync('validation/mobile-ui/capture-verification.json',JSON.stringify({passed:true,cases:['prepopulate','cancel','quota failure','durable write','ack retry','snapshot clear','privacy','unknown bank','whatsapp save','AI invalid output','AI draft review','advisor clear restore','audio processing block','audio retry','audio AI prefill','audio cancel','audio save'],errors},null,2));
 console.log('PASS capture review, save, cancellation, quota failure, idempotent retry, concurrent clear, privacy, WhatsApp and AI draft safeguards');
}finally{await browser.close();await new Promise(r=>server.close(r));}
