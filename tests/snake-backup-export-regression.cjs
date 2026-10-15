'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html=fs.readFileSync('snake-finance-mobile.html','utf8');
const bundled=fs.readFileSync('android-capture/app/src/main/assets/snake-finance-mobile.html','utf8');
assert.equal(html,bundled,'QA APK and tested dashboard must use the same HTML');
const start=html.indexOf('function backupState(){');
const end=html.indexOf('function exportPreservedLedger()',start);
assert.ok(start>0 && end>start,'backup functions must be present');

const source=html.slice(start,end);
const captures=[];
const preservedFull=[];
const alerts=[];
const confirmations=[];
let acceptEmpty=false;
const entries={
 assessor_openings_v83:JSON.stringify({c6:39870,caju:123578,cajuFunds:123578}),
 assessor_ledger_v82:'[{"id":11}]',
 assessor_tema_v82:'ouro',
 assessor_pre_import_v82:'DO_NOT_EXPORT',
 tema:'gold'
};
const names=Object.keys(entries);
const storage={
 get length(){return names.length;},
 key(i){return names[i] ?? null;},
 getItem(k){return Object.hasOwn(entries,k)?entries[k]:null;},
 setItem(k,v){entries[k]=String(v);if(!names.includes(k))names.push(k);}
};
const ledger=[
 {id:11,d:'2026-10-14',v:5000,t:'d',s:'r',a:'c6',c:'fuel',n:'Combustível trabalho'},
 {id:12,d:'2026-10-14',v:5000,t:'d',s:'r',a:'carbon',c:'fuel',n:'Combustível particular'}
];
const original=JSON.stringify(ledger);
const app={
 L:ledger,
 localStorage:storage,
 window:{AndroidBridge:{exportBackup(json,name){captures.push({json,name});},
  preserveFinancialSnapshot(json){preservedFull.push(JSON.parse(json));return true;},
  preservedFinancialSnapshotStatus(){return JSON.stringify({available:true,valid:true,entries:2,bytes:500});}}},
 confirm(msg){confirmations.push(msg);return acceptEmpty;},
 alert(msg){alerts.push(msg);},
 localToday:()=> '2026-10-14',
 completeBackupCategories:(cats)=>({categories:cats}),
 OPENING_KEY:'assessor_openings_v83',
 OPENING_CFG:{c6:39870,caju:123578,cajuFunds:123578},
 OPENING_INVALID:false,
 validateLedger:(rows)=>rows,
 GOAL_STORE:'assessor_goals_v82',
 INVEST_GOALS:[],
 INV_CFG:{aporte:3000},
 CATSTORE:'assessor_categories_v82',
 CATDB:{fuel:{name:'Combustível',subs:[]}},
 CAJU_CFG_KEY:'assessor_caju_v82',
 CAJU_CFG:{},
 ALERT_KEY:'assessor_alerts_v82',
 ALERT_CFG:{},
 NOTICE_KEY:'assessor_notices_v82',
 ST:{hide:false},
 OVERVIEW_KEY:'assessor_overview_v82',
 OVERVIEW_VISIBLE:{},
 ORC:{},
 Blob,
 Date,
 JSON,
 Object,
 Array,
 console
};
vm.createContext(app);
vm.runInContext(source,app,{filename:'snake-finance-backup.js'});
assert.equal(app.preserveOriginalFullSnapshot(original),true,'nonempty verified original must be staged');
assert.equal(preservedFull.length,1);
assert.equal(preservedFull[0].ledger.length,2);
assert.equal(preservedFull[0].storage.assessor_openings_v83,entries.assessor_openings_v83);
assert.equal(JSON.stringify(app.L),original,'staging must never rewrite source ledger');
app.exportBackup();
assert.equal(captures.length,1,'nonempty ledger must export directly to Android bridge');
assert.match(captures[0].name,/Snake_Finance_Backup_2026-10-14\.json/);
const payload=JSON.parse(captures[0].json);
assert.equal(payload.schema,'snake-finance-backup');
assert.equal(payload.version,2);
assert.equal(payload.ledger.length,2,'distinct equal-value purchases must both be retained');
assert.equal(payload.ledger[0].id,11);
assert.equal(payload.ledger[1].id,12);
assert.ok(Buffer.byteLength(captures[0].json,'utf8')>20,'JSON must not be 0 KB');
assert.equal(payload.storage.assessor_pre_import_v82,undefined,'temporary backups must not be recursively exported');
assert.equal(payload.storage.tema,'gold');
assert.ok(payload.storage.assessor_openings_v83,'opening balances must be included');
assert.equal(JSON.stringify(app.L),original,'export must never mutate ledger');
assert.equal(confirmations.length,0,'valid ledger must not trigger empty warning');
assert.equal(alerts.length,0,'valid export should not report an error');

app.L=[];
assert.equal(app.preserveOriginalFullSnapshot('[]'),false,'empty original must never be stamped as valid');
assert.equal(preservedFull.length,1);
app.exportBackup();
assert.equal(captures.length,1,'empty ledger must not be exported without explicit warning');
assert.equal(confirmations.length,1);
assert.match(confirmations[0],/ZERO lançamentos/);
acceptEmpty=true;
app.exportBackup();
assert.equal(captures.length,2,'explicit diagnostic export of empty ledger remains possible');
assert.equal(JSON.parse(captures[1].json).ledger.length,0);
assert.equal(alerts.length,0);
// An explicitly exported empty diagnostic file must NEVER be restorable as a real ledger.
const previewStart=html.indexOf('function previewBackup(');
const previewEnd=html.indexOf('function reloadDashboardView(){',previewStart);
assert.ok(previewStart>0&&previewEnd>previewStart,'import preview source must exist');
const importErrors=[];
const importSandbox={
  JSON,Array,Object,
  window:{SNAKE_DISTRIBUTABLE:true},
  validateLedger:(data)=>{if(!Array.isArray(data))throw Error('invalid list');return data;},
  OPENING_KEY:'assessor_openings_v83',
  CATSTORE:'assessor_categories_v82',CATDB:{},
  completeBackupCategories:(cats,data)=>({categories:cats,missing:[],recovered:[]}),
  validatePreference:()=>{},escapeHTML:String,
  modal:()=>{},alert:(msg)=>importErrors.push(msg),
  localStorage:{get length(){throw Error('An empty import must not reach storage');}}
};
vm.createContext(importSandbox);
vm.runInContext(html.slice(previewStart,previewEnd),importSandbox);
assert.throws(()=>importSandbox.previewBackup([]),/Backup sem lançamentos/,'empty legacy ledger cannot import');
assert.throws(()=>importSandbox.previewBackup({
  schema:'snake-finance-backup',version:2,ledger:[],storage:{assessor_openings_v83:entries.assessor_openings_v83}
}),/Backup sem lançamentos/,'zero-entry full backup cannot replace saved data');
const applyStart=html.indexOf('function applyBackup(){');
const applyEnd=html.indexOf('// Independent consistency checks',applyStart);
assert.ok(applyStart>0&&applyEnd>applyStart,'import confirmation source must exist');
vm.runInContext(html.slice(applyStart,applyEnd),importSandbox);
importSandbox.BACKUP_PENDING={ledger:[],storage:{}};
importSandbox.applyBackup();
assert.ok(importErrors.some(x=>x.includes('não contém lançamentos')),'confirmation must also reject empty ledger');
assert.equal(importSandbox.BACKUP_PENDING,null,'empty import must be discarded');
const vault=fs.readFileSync('android-capture/app/src/main/java/br/com/meuassessor/capture/FinancialRecoveryVault.java','utf8');
assert.match(vault,/first verified nonempty snapshot/i);
assert.match(vault,/if \(target\.isFile\(\)\)/);
assert.match(vault,/MessageDigest\.isEqual/);
assert.match(vault,/stream\.getFD\(\)\.sync\(\)/);
assert.match(vault,/ledger\.length\(\) < 1/);
const realOpeningKey=html.match(/const OPENING_KEY='([^']+)'/)?.[1];
assert.equal(realOpeningKey,'assessor_openings_v83','backup fixture must match actual financial balance storage key');
assert.equal(app.OPENING_KEY,realOpeningKey,'backup tests must exercise the production opening key');
assert.ok(html.includes('isNonemptyLedger(raw)&&(window.AndroidBridge||window.AndroidApp)&&!preserveOriginalFullSnapshot(raw)'),
  'Android must block data writes when the original full snapshot cannot be verified');
assert.ok(html.includes("if(!PERSIST_BLOCKED)migrateWorkCategory()"),
  'boot must not migrate categories before a verified original snapshot');
assert.ok(html.includes("function draw(){if(!PERSIST_BLOCKED)ensureRecurrences(YM)"),
  'repaint must not create recurring ledger entries in recovery-only mode');
assert.ok(vault.includes('settings.has("assessor_openings_v83")'),
  'native vault must prefer active account balances over a stale legacy copy');
assert.ok(vault.includes('settings.optString("assessor_openings_v83", "")'),
  'native vault must validate the same balance key exported by the UI');
assert.ok(vault.includes('settings.optString("assessor_opening_v82", "")'),
  'legacy v82 snapshots remain recoverable when current key is absent');
const nativeBridge=fs.readFileSync('android-capture/app/src/main/java/br/com/meuassessor/capture/WebAppBridge.java','utf8');
assert.match(nativeBridge,/preserveFinancialSnapshot/);
assert.match(nativeBridge,/exportPreservedFinancialSnapshot/);
const gradle=fs.readFileSync('android-capture/app/build.gradle.kts','utf8');
assert.match(gradle,/applicationIdSuffix\s*=\s*"\.qa(?:\.[a-z0-9]+)*"/,'QA APK must not overwrite production package');
const main=fs.readFileSync('android-capture/app/src/main/java/br/com/meuassessor/capture/MainActivity.java','utf8');
assert.ok(main.includes('MessageDigest.getInstance("SHA-256")'),'Android must verify exported bytes');
assert.ok(main.includes('getContentResolver().openInputStream(target)'),'Android must reopen destination');
assert.ok(main.includes('pendingBackupFile()'),'Android must stage backup before file picker');
console.log('PASS Snake Finance: JSON nonempty, isolated QA, explicit zero-ledger warning, data unchanged and SHA-256 native readback');
