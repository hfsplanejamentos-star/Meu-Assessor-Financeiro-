const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||'android-capture/app/src/main/assets/snake-finance-mobile.html','utf8');
const start=html.indexOf('function vCal(){'),source=html.slice(start,html.indexOf('\nconst vAg=',start));
const L=[{id:3009,d:'2026-11-30',t:'r',s:'p',v:226667},{id:3018,d:'2026-12-20',t:'r',s:'p',v:157843},{id:4,d:'2026-11-05',t:'d',s:'p',v:500},{id:5,d:'2026-11-05',t:'r',s:'r',v:1000}];
const ctx={L,YM:'2026-11',SEL:'2026-11-01',APP_TODAY:'2026-10-23',monthName:x=>x,carbonInvoiceGross:()=>1000};vm.createContext(ctx);vm.runInContext(source,ctx);
const original=JSON.stringify(L);let rendered=vm.runInContext('vCal()',ctx);
function day(markup,date){const i=markup.indexOf(`onclick="openDay('${date}')"`);assert(i>=0);return markup.slice(i,markup.indexOf('</div></div>',i));}
assert(day(rendered,'2026-11-30').includes('var(--pos)'));assert(day(rendered,'2026-11-05').includes('var(--a)'));assert(day(rendered,'2026-11-05').includes('var(--pos)'));assert(day(rendered,'2026-11-12').includes('var(--warn)'));assert(!day(rendered,'2026-11-29').includes('<i '));
ctx.YM='2026-12';rendered=vm.runInContext('vCal()',ctx);assert(day(rendered,'2026-12-20').includes('var(--pos)'));assert.equal(JSON.stringify(L),original);
console.log('PASS: November/December salary receipt markers, mixed expenses and income, invoice markers and immutable ledger.');
