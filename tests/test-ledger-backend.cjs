const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ts=require('typescript');
const convexValues=require('convex/values');
function load(file,dependencies){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:n=>dependencies[n]||(()=>{throw Error(n)})(),Date,console});return module.exports;}
const protocol=load('convex/ledgerProtocol.ts',{'convex/values':convexValues});
const sync=load('convex/ledgerSync.ts',{'convex/values':convexValues,'./ledgerProtocol':protocol,'./_generated/server':{internalMutation:x=>x,internalQuery:x=>x}});
const rows=[];
const ctx={db:{query:()=>({withIndex:(name,fn)=>{const conditions={};fn({eq(k,v){conditions[k]=v;return this;}});return {unique:async()=>rows.find(x=>Object.keys(conditions).every(k=>x[k]===conditions[k]))||null};}}),insert:async(t,row)=>{rows.push({...row});return 'id'+rows.length;}}};
const entry={date:'2026-10-01',description:'Teste sintético',amountCents:1234,type:'d',account:'carbon',category:'ali',categoryName:'Alimentação'};
(async()=>{
 const op={operationId:'chatgpt:test-1',entry};assert(protocol.validOperation(op));
 for(const change of [{amountCents:1.5},{amountCents:-1},{date:'2026-02-30'},{type:'r'},{account:'unknown'}])assert(!protocol.validOperation({...op,entry:{...entry,...change}}));
 assert.equal((await sync.submit.handler(ctx,{ownerHash:'ownerA',operations:[op]})).inserted,1);
 assert.equal((await sync.submit.handler(ctx,{ownerHash:'ownerA',operations:[op]})).existing,1);
 await assert.rejects(sync.submit.handler(ctx,{ownerHash:'ownerA',operations:[{...op,entry:{...entry,amountCents:999}}]}),/operation_conflict/);
 assert.equal(rows[0].entry.amountCents,1234);
 assert.equal((await sync.submit.handler(ctx,{ownerHash:'ownerB',operations:[op]})).inserted,1);assert.equal(rows.length,2);
 await assert.rejects(sync.submit.handler(ctx,{ownerHash:'ownerA',operations:Array(51).fill(op)}),/invalid_operations/);
 console.log('PASS: cent/date/account validation, immutable operation IDs, replay deduplication, owner isolation and bounded batches.');
})().catch(e=>{console.error(e);process.exit(1)});
