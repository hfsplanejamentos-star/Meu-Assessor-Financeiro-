const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require(process.env.SNAKE_PLAYWRIGHT_MODULE||'playwright');
const html=fs.readFileSync(process.argv[2]||'android-capture/app/src/main/assets/snake-finance-mobile.html','utf8');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const p=await browser.newPage({viewport:{width:393,height:852}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.type()==='confirm'?d.accept():d.dismiss());
await p.addInitScript(()=>{
 localStorage.setItem('assessor_openings_v83',JSON.stringify({c6:0,caju:0,cajuFunds:0}));
 window.testSync={ops:[],offline:false,quota:false,cursorQuota:false,delay:1,calls:0,submits:0,configSaved:0};
 const old=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if((window.testSync.quota&&k==='assessor_tx_v43')||(window.testSync.cursorQuota&&k==='assessor_ledger_sync_v1'))throw new DOMException('quota','QuotaExceededError');return old.call(this,k,v);};
 if(!localStorage.getItem('assessor_tx_v43'))localStorage.setItem('assessor_tx_v43',JSON.stringify([{id:101,d:'2026-10-01',n:'Original sintético',t:'r',a:'c6',s:'r',v:100000}]));
 window.AndroidBridge={getPendingNotifications:()=> '[]',getIntegrationConfig:()=>JSON.stringify({url:'https://test.convex.site',configured:true}),clearIntegrationConfig:()=>true,saveIntegrationConfig:()=>{testSync.configSaved++;return true;},
 integrationRequest:(id,path,method,body)=>{window.testSync.calls++;setTimeout(()=>{
 let result={ok:true},status=200;
 if(window.testSync.offline){status=502;result={ok:false,error:'connection_failed'};}
 else if(path==='/integrations/status')result={ok:true,ledgerSync:true,ledgerOwner:'a'.repeat(64),ai:false,whatsapp:false};
 else if(path==='/ledger/submit'){window.testSync.submits++;for(const op of JSON.parse(body).operations)if(!window.testSync.ops.some(x=>x.operationId===op.operationId))window.testSync.ops.push(op);result={ok:true};}
 else if(path==='/ledger/changes'){const {cursor}=JSON.parse(body),index=Number(cursor||0);result={ok:true,owner:'a'.repeat(64),operations:window.testSync.ops.slice(index),cursor:String(window.testSync.ops.length),done:true};}
 window.dispatchEvent(new CustomEvent('snake-integration-result',{detail:{id,status,body:JSON.stringify(result)}}));
 },window.testSync.delay);}};
});
await p.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:html}):r.abort());await p.goto('https://sync-test.local/');await p.waitForTimeout(400);await p.evaluate(()=>closeModal());
// Execute the exact JavaScript emitted after Android's JSON picker/chunk transport.
const native=fs.readFileSync(process.argv[3]||'android-capture/app/src/main/java/br/com/meuassessor/capture/MainActivity.java','utf8');
const block=native.slice(native.indexOf('String script = "(function(){try{if(typeof previewBackup'));
const script=block.slice(0,block.indexOf(';\n        webView.evaluateJavascript')).match(/"(?:[^"\\]|\\.)*"/g).map(x=>JSON.parse(x)).join('');
await p.evaluate(()=>{window.backupCalls=0;window.originalPreview=previewBackup;window.previewBackup=()=>{backupCalls++;};window.__snakeImportParts=[btoa(JSON.stringify({schema:'snake-finance-connection-v1',url:'https://test.convex.site',key:'Aa1_-z'.repeat(8)}))];});
assert.equal(await p.evaluate(script),true);
await p.waitForFunction(()=>testSync.configSaved===1);
assert.equal(await p.evaluate(()=>backupCalls),0,'Connection must bypass financial backup parser');
await p.evaluate(()=>{window.__snakeImportParts=[btoa(JSON.stringify({transactions:[]}))];});
assert.equal(await p.evaluate(script),true);
assert.equal(await p.evaluate(()=>backupCalls),1,'Backup must retain its original preview route');
await p.evaluate(()=>{window.previewBackup=window.originalPreview;});
assert.equal(await p.evaluate(()=>testSync.configSaved),1,'Connection file must accept printable ASCII credentials');
await p.waitForTimeout(40);await p.evaluate(()=>closeModal());
await p.evaluate(async()=>{captureSettings();await captureImportConnection(new File([JSON.stringify({schema:'snake-finance-connection-v1',url:'https://test.convex.site',key:'a'.repeat(32)+String.fromCharCode(10)})],'invalid.json',{type:'application/json'}));});
assert.equal(await p.evaluate(()=>testSync.configSaved),1,'Connection file must reject header-injection credentials');await p.evaluate(()=>closeModal());
const baseline=await p.evaluate(()=>L.length);
const op=(id,amount=1250)=>({operationId:'chatgpt:'+id,entry:{date:'2026-10-02',description:'Despesa '+id,amountCents:amount,type:'d',account:'carbon',category:'ali',categoryName:'Alimentação',subcategory:'Janta',context:'Pessoal'}});
await p.evaluate(ops=>{testSync.ops=ops;},[op('a'),op('b',750)]);await p.evaluate(()=>captureSyncLedger(true,true));
assert.deepEqual(await p.evaluate(()=>({count:L.length,total:L.filter(x=>x.a==='carbon').reduce((s,x)=>s+x.v,0),original:L.find(x=>x.id===101).v})),{count:baseline+2,total:2000,original:100000});
await p.evaluate(()=>{localStorage.removeItem('assessor_ledger_sync_v1');});await p.evaluate(()=>captureSyncLedger(true,true));assert.equal(await p.evaluate(()=>L.length),baseline+2);
// Failed durable write: no acknowledgement/cursor, no mutation retained.
await p.evaluate(op=>{testSync.ops.push(op);testSync.quota=true;},op('quota'));const cursor=await p.evaluate(()=>localStorage.getItem('assessor_ledger_sync_v1'));
await p.evaluate(()=>captureSyncLedger(true,true));assert.equal(await p.evaluate(()=>L.length),baseline+2);assert.equal(await p.evaluate(()=>localStorage.getItem('assessor_ledger_sync_v1')),cursor);
await p.evaluate(()=>{testSync.quota=false;});await p.evaluate(()=>captureSyncLedger(true,true));assert.equal(await p.evaluate(()=>L.length),baseline+3);
// Cursor failure after durable ledger save: replay must not duplicate.
await p.evaluate(op=>{testSync.ops.push(op);testSync.cursorQuota=true;},op('cursor'));await p.evaluate(()=>captureSyncLedger(true,true));assert.equal(await p.evaluate(()=>L.length),baseline+4);
await p.evaluate(()=>{testSync.cursorQuota=false;});await p.evaluate(()=>captureSyncLedger(true,true));assert.equal(await p.evaluate(()=>L.length),baseline+4);
// Invalid category stops whole page and keeps cursor unchanged.
const bad=op('bad');bad.entry.category='missing';bad.entry.categoryName='Missing category';await p.evaluate(op=>{testSync.ops.push(op);},bad);const safe=await p.evaluate(()=>JSON.stringify(L));await p.evaluate(()=>captureSyncLedger(true,true));assert.equal(await p.evaluate(()=>JSON.stringify(L)),safe);await p.evaluate(()=>testSync.ops.pop());
// Offline state and concurrent gestures leave the ledger intact.
await p.evaluate(()=>{testSync.offline=true;});await p.evaluate(()=>Promise.all([captureSyncLedger(true,true),captureSyncLedger(true,true)]));assert.equal(await p.evaluate(()=>JSON.stringify(L)),safe);await p.evaluate(()=>{testSync.offline=false;});
// Reviewed AI capture goes to outbox once, then is not reinserted on pull.
await p.evaluate(()=>{L.push({id:nextId(),d:'2026-10-03',n:'AI sintética confirmada',v:1900,t:'d',a:'c6',s:'r',c:'ali',sub:'Refeição',captureId:'manual:ai_test'});persistLedger();});await p.evaluate(()=>captureSyncLedger(true,true));assert.equal(await p.evaluate(()=>L.length),baseline+5);assert.equal(await p.evaluate(()=>testSync.submits),1);await p.evaluate(()=>captureSyncLedger(true,true));assert.equal(await p.evaluate(()=>testSync.submits),1);
// Credential change while request is in flight cannot apply old account's results.
await p.evaluate(op=>{testSync.ops.push(op);testSync.delay=100;},op('old-account'));await p.evaluate(()=>{captureSyncLedger(true,true);captureDisconnect();});await p.waitForTimeout(250);assert.equal(await p.evaluate(()=>L.length),baseline+5);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS: pull/save, idempotent replay, quota rollback, cursor failure recovery, category validation, offline/concurrent refresh, AI outbox and account-change isolation.');
})().catch(e=>{console.error(e);process.exit(1)});
