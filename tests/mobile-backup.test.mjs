import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
const html=fs.readFileSync(process.env.MOBILE_HTML||'android-capture/app/src/main/assets/dashboard-mobile.html','utf8');
const functions=new Map(),initializers=new Map();
for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){
 const source=match[1],ast=parse(source,{ecmaVersion:'latest'});
 for(const node of ast.body){
  if(node.type==='FunctionDeclaration')functions.set(node.id.name,source.slice(node.start,node.end));
  if(node.type==='VariableDeclaration')for(const d of node.declarations)if(d.id.type==='Identifier'&&d.init)initializers.set(d.id.name,source.slice(d.init.start,d.init.end));
 }
}
const names=['OPENING_KEY','GOAL_STORE','CATSTORE','CAJU_CFG_KEY','ALERT_KEY','NOTICE_KEY','OVERVIEW_KEY','LEDGER_KEY','LAYOUT_V82','LAYOUT_KEY','ALERT_DEFS'];
const state=new Map(),dialogs=[],alerts=[];
let failureKey=null,reloadCount=0;
const sandbox={
 console,window:{SNAKE_DISTRIBUTABLE:true},
 localStorage:{
  get length(){return state.size},key:i=>[...state.keys()][i],getItem:k=>state.get(k)??null,
  setItem(k,v){if(k===failureKey){failureKey=null;throw Error('simulated storage failure')}state.set(k,String(v))},
  removeItem:k=>state.delete(k)
 },
 modal:(...args)=>dialogs.push(args),alert:x=>alerts.push(x),
 location:{reload:()=>reloadCount++},
 AC:{c6:{},caju:{},carbon:{},xp:{}},
 CAT:{mer:['Mercado']},CATDB:{out:{name:'Outros',subs:[]},mer:{name:'Mercado',subs:[]}},
 OPENING_CFG:{c6:100000,caju:150000,cajuFunds:150000},
 INVEST_GOALS:[{id:'g1',name:'Reserva',total:1000000,real:50000}],
 INV_CFG:{aporte:10000,meses:12,taxa:1,inflacao:false,goalId:'g1'},
 CAJU_CFG:{'2026-10':{opening:150000,reload:0}},
 ALERT_CFG:{},ST:{fat:true,rec:true,res:true,msg:true,hide:true,dias:3},
 OVERVIEW_VISIBLE:{saldo:true,contas:false},ORC:{mer:40000},
 L:[{id:101,d:'2026-10-06',t:'d',s:'r',a:'c6',v:3650,n:'Compra',c:'mer'}],
 PERSIST_BLOCKED:true,BACKUP_PENDING:null
};
vm.createContext(sandbox);
vm.runInContext(names.map(n=>'const '+n+'='+initializers.get(n)+';').join('\n')+
 ['validISO','validateLedger','validateOpenings','validatePreference','backupState','saveSafetyBackup','previewBackup','applyBackup']
 .map(n=>functions.get(n)).join('\n'),sandbox);
const run=s=>vm.runInContext(s,sandbox);
const plain=x=>JSON.parse(JSON.stringify(x));
state.set('assessor_runtime_version','atual-ui-2');
state.set('assessor_legacy_marker','texto legado');
state.set('assessor_alert_values_v82','true'); // Keep privacy migration marker.
state.set('tema','limao');
state.set('assessor_layout_v82',JSON.stringify({ger:[{id:'saldo',h:'300px'}]}));
state.set('lay',JSON.stringify({order:[0,1,2],sz:{},hid:[]}));
const backup=plain(run('backupState()'));
assert.equal(backup.storage.assessor_runtime_version,'atual-ui-2');
assert.equal(backup.storage.assessor_legacy_marker,'texto legado');
sandbox.input=backup;
assert.deepEqual(plain(run('previewBackup(input).ledger')),backup.ledger);
assert.equal(state.has('assessor_tx_v43'),false,'Preview must not write ledger');
const beforePreview=new Map(state);
for(const key of ['assessor_openings_v83','assessor_categories_v25','assessor_notice_settings_v81','assessor_invest_goals_v53']){
 sandbox.input={...backup,storage:{...backup.storage,[key]:'atual-ui-2'}};
 assert.throws(()=>run('previewBackup(input)'),/JSON malformado/);
 assert.equal(sandbox.BACKUP_PENDING,null,'Rejected preview must clear previous pending import');
 assert.deepEqual(state,beforePreview);
}
sandbox.input={...backup,ledger:[{...backup.ledger[0],v:3.65}]};
assert.throws(()=>run('previewBackup(input)'),/Lançamento inválido|precisão do motor/);
sandbox.input={...backup,storage:{...backup.storage,assessor_openings_v83:'{"c6":"100000","caju":0,"cajuFunds":0}'}};
assert.throws(()=>run('previewBackup(input)'),/Saldos iniciais inválidos/);
sandbox.input={...backup,storage:{...backup.storage}};
delete sandbox.input.storage.assessor_openings_v83;
assert.throws(()=>run('previewBackup(input)'),/faltam saldos/);
sandbox.input=backup;
run('previewBackup(input)');
const beforeFailure=new Map(state);
failureKey='assessor_tx';
run('applyBackup()');
assert.deepEqual(state,beforeFailure,'Failure after first ledger write must roll back all new keys');
assert.equal(sandbox.PERSIST_BLOCKED,true);
assert.equal(reloadCount,0);
assert(alerts.at(-1).includes('dados anteriores foram preservados'));
run('previewBackup(input);applyBackup()');
assert.equal(reloadCount,1);
assert.equal(sandbox.PERSIST_BLOCKED,false);
assert.deepEqual(JSON.parse(state.get('assessor_tx_v43')),backup.ledger);
assert.deepEqual(JSON.parse(state.get('assessor_tx')),backup.ledger);
for(const[k,v]of Object.entries(backup.storage))assert.equal(state.get(k),v,'Preference changed: '+k);
assert(state.has('assessor_pre_import_v82'));
assert.deepEqual(JSON.parse(state.get('assessor_openings_v83')),sandbox.OPENING_CFG);
assert.equal(JSON.parse(state.get('assessor_notice_settings_v81')).hide,true);
assert.deepEqual(JSON.parse(state.get('assessor_invest_goals_v53')),sandbox.INVEST_GOALS);
sandbox.input=JSON.parse(state.get('assessor_pre_import_v82'));
assert.doesNotThrow(()=>run('previewBackup(input)'),'Safety backup must remain importable');
console.log('Backup migration: raw legacy markers, financial validation, exact preservation, safety restore and atomic rollback passed.');
