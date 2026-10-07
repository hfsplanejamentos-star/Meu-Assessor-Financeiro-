// Produces a distributable shell. Financial state must arrive via private backup.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {parse} from 'acorn';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv[2])throw Error('Usage: node scripts/package-mobile.mjs /path/to/validated.html');
let html=await readFile(resolve(process.argv[2]),'utf8');
const changed=new Set();
html=html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/g,(tag,code)=>{
 const edits=[],ast=parse(code,{ecmaVersion:'latest'});
 for(const node of ast.body){
  if(node.type==='VariableDeclaration')for(const d of node.declarations){
   const values={L0:'[]',OPENING_DEFAULTS:'{c6:0,caju:0,cajuFunds:0}',ORC:'{}'};
   if(d.id.name in values){edits.push([d.init.start,d.init.end,values[d.id.name]]);changed.add(d.id.name);}
   if(d.id.name==='INV_CFG'){edits.push([d.init.start,d.init.end,"{aporte:0,meses:12,taxa:0,inflacao:false,goalId:''}"]);changed.add('INV_CFG');}
  }
  if(node.type==='FunctionDeclaration'&&node.id.name==='defaultInvestmentGoals'){
   edits.push([node.start,node.end,'function defaultInvestmentGoals(){return []}']);changed.add('goals');
  }
  if(node.type==='FunctionDeclaration'&&node.id.name==='migrateLegacyPayment')edits.push([node.start,node.end,'function migrateLegacyPayment(){}']);
  if(node.type==='FunctionDeclaration'&&node.id.name==='wInit')edits.push([node.start,node.end,"function wInit(){W=[{f:'in',t:'Importe seu backup para revisar seus lançamentos.'}]}" ]);
  if(node.type==='TryStatement'&&code.slice(node.start,node.end).includes("const MIG='assessor_v23_migrated'"))edits.push([node.start,node.end,"try{localStorage.setItem('assessor_v23_migrated','1')}catch(e){}"]);
 }
 for(const[a,b,text]of edits.sort((a,b)=>b[0]-a[0]))code=code.slice(0,a)+text+code.slice(b);
 parse(code,{ecmaVersion:'latest'});
 return tag.replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/,'$1'+code.replace(/\$/g,'$$$$')+'$2');
});
for(const required of ['L0','OPENING_DEFAULTS','ORC','INV_CFG','goals'])if(!changed.has(required))throw Error('Missing required sanitization: '+required);
html=html.replace('O saldo inicial conciliado de R$ 1.271,79 já inclui a recarga existente. Preencha os dois campos abaixo se tiver a composição correta.','Informe o saldo anterior e a recarga do mês, ou importe seu backup completo.');
html=html.replace('<head>','<head><script>window.SNAKE_DISTRIBUTABLE=true;</script>');
const adapter=await readFile(resolve(root,'migration/mobile/native-adapter.js'),'utf8');
html=html.replace('</body>',`<script id="migration-native-v82">${adapter}</script></body>`);
const dir=resolve(root,'android-capture/app/src/main/assets');await mkdir(dir,{recursive:true});
await writeFile(resolve(dir,'dashboard-mobile.html'),html);
console.log('Distributable dashboard generated: no seeded ledger, opening balances, budgets or goals.');
