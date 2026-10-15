'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');

const source=fs.readFileSync('convex/notificationEvents.ts','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const validator=new Proxy(function(){return validator},{get(){return validator;}});
const registry={};
const context={exports:registry,require(name){
  if(name==='convex/values')return {v:validator};
  if(name==='./_generated/server')return {internalMutation:v=>v,internalQuery:v=>v};
  throw Error('Unmocked module: '+name);
},console};
vm.runInNewContext(compiled,context,{filename:'notificationEvents.js'});
assert.equal(typeof registry.ingest.handler,'function');
const tables={notificationEvents:[],notificationDevices:[]};
const ctx={db:{
  query(table){return {
    withIndex(index,fn){
      const queryValues={};
      const query={eq(k,v){queryValues[k]=v;return query;}};
      fn(query);
      const found=()=>tables[table].filter(item=>Object.keys(queryValues).every(k=>item[k]===queryValues[k]));
      return {
        async unique(){const items=found();assert.ok(items.length<=1,'Nonunique lookup '+index);return items[0]||null;},
        async first(){return found()[0]||null;},
      };
    }
  };},
  async insert(table,row){const item={...row,_id:table+'-'+(tables[table].length+1)};tables[table].push(item);return item._id;},
  async patch(id,changes){for(const rows of Object.values(tables)){const item=rows.find(x=>x._id===id);if(item){Object.assign(item,changes);return;}}throw Error('Missing row for patch');}
}};
const base={fingerprint:'same-bank-message-same-minute',sourcePackage:'com.c6bank.app',title:'Compra aprovada',text:'R$ 50 no Posto',amountCents:5000,direction:'expense',postedAt:1792000000000,status:'classified',category:'Transporte',subcategory:'Combustível',confidence:0.9,classifier:'rules'};
const wallet={...base,fingerprint:'different-wallet-source',sourcePackage:'com.google.android.apps.walletnfcrel',title:'Google Wallet'};
(async()=>{
  const result=await registry.ingest.handler(ctx,{ownerHash:'test-owner',deviceId:'phone',receivedAt:1792000000100,events:[
    {...base,eventId:'bank-first'},
    {...base,eventId:'bank-second',postedAt:1792000000500},
    {...wallet,eventId:'wallet-same-amount'},
  ]});
  assert.equal(result.accepted,3,'two legitimate R$50 purchases plus Wallet must not be discarded');
  assert.equal(result.duplicates,0);
  assert.equal(tables.notificationEvents.length,3);
  assert.equal(tables.notificationEvents[1].possibleDuplicateOf,'bank-first','similar bank notification should be flagged for review');
  assert.equal(tables.notificationEvents[2].possibleDuplicateOf,undefined,'different provider is preserved');
  const retry=await registry.ingest.handler(ctx,{ownerHash:'test-owner',deviceId:'phone',receivedAt:1792000000200,events:[
    {...base,eventId:'bank-first'},
  ]});
  assert.equal(retry.accepted,0,'same stable provider event ID is idempotent');
  assert.equal(retry.duplicates,1);
  assert.equal(tables.notificationEvents.length,3,'dedup must never mutate prior events');
  assert.equal(tables.notificationDevices.length,1);
  console.log('PASS: exact-event idempotency, same-value independent purchases, flagged similarity, Wallet preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
