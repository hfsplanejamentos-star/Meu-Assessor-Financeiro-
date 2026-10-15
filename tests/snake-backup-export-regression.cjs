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
 assessor_opening_v82:JSON.stringify({c6:39870,caju:123578,cajuFunds:123578}),
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
 OPENING_KEY:'assessor_opening_v82',
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
assert.equal(preservedFull[0].storage.assessor_opening_v82,entries.assessor_opening_v82);
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
assert.ok(payload.storage.assessor_opening_v82,'opening balances must be included');
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
const vault=fs.readFileSync('android-capture/app/src/main/java/br/com/meuassessor/capture/FinancialRecoveryVault.java','utf8');
assert.match(vault,/first verified nonempty snapshot/);
assert.match(vault,/if \(target\.isFile\(\)\)/);
assert.match(vault,/MessageDigest\.isEqual/);
assert.match(vault,/stream\.getFD\(\)\.sync\(\)/);
assert.match(vault,/ledger\.length\(\) < 1/);
const nativeBridge=fs.readFileSync('android-capture/app/src/main/java/br/com/meuassessor/capture/WebAppBridge.java','utf8');
assert.match(nativeBridge,/preserveFinancialSnapshot/);
assert.match(nativeBridge,/exportPreservedFinancialSnapshot/);
const gradle=fs.readFileSync('android-capture/app/build.gradle.kts','utf8');
assert.match(gradle,/applicationIdSuffix\s*=\s*"\.qa"/,'QA APK must not overwrite production package');
const main=fs.readFileSync('android-capture/app/src/main/java/br/com/meuassessor/capture/MainActivity.java','utf8');
assert.ok(main.includes('MessageDigest.getInstance("SHA-256")'),'Android must verify exported bytes');
assert.ok(main.includes('getContentResolver().openInputStream(target)'),'Android must reopen destination');
assert.ok(main.includes('pendingBackupFile()'),'Android must stage backup before file picker');
console.log('PASS Snake Finance: JSON nonempty, isolated QA, explicit zero-ledger warning, data unchanged and SHA-256 native readback');
