const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const read = file => fs.readFileSync(file, 'utf8');
const near = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) < 0.011, `${label}: ${actual} != ${expected}`);

const index = read('index.html');
const sw = read('sw.js');
assert.match(index, /atual-ui-20260922-r146/);
assert.match(index, /id="r124-mobile-financial-card-stack"/);
assert.match(index, /\['goal','Meta'\]/);
assert.match(index, /goal:\{html:kpiCard\('META'/);
assert.match(index, /window\.FinanceCloud\?\.detectLocalChange/);
assert.match(index, /window\.FinanceCloud\?\.push\?\.\(\)/);
assert.match(index, /const isInvoicePayment=t=>/);
assert.match(index, /const isTransfer=t=>/);
assert.match(index, /if\(t\.transfer \|\| t\.transferId\) return 'transfer'/);
assert.match(index, /excludeFromExpense:!!t\.excludeFromExpense/);
assert.match(index, /kind:'transfer',transfer:true,excludeFromExpense:true/);
assert.match(index, /!isTransfer\(t\)&&!isInvoicePayment\(t\)&&!t\.excludeFromExpense/);
assert.match(index, /!t\.invoicePayment&&!t\.cardPayment&&t\.kind!=='invoice_payment'&&t\.status!=='planned'/);
assert.match(index, /#view-overview #kpis\.grid-kpi>\.brand-fin-card\{[\s\S]*grid-column:1\/-1!important;[\s\S]*width:100%!important/);
['c6account', 'caju', 'creditcard', 'itauaccount', 'xpaccount'].forEach(id =>
  assert.match(index, new RegExp(`data-kpi-id="${id}"`), `card financeiro ${id} precisa estar contemplado`)
);
assert.match(index, /function carbonInvestmentLimitAt\(key\)/);
assert.match(index, /t\.transfer&&realized\(t\.status\)&&month&&month<=key/);
assert.match(index, /Limite acumulado \$\{brl\(limit\)\} · investimentos realizados/);
assert.match(index, /const summaryCells=\[\.\.\.box\.children\]\.filter\(el=>!el\.classList\.contains\('brand-fin-card'\)\)/);
assert.match(index, /if\(summaryCells\.length%2===1\)summaryCells\.at\(-1\)\?\.classList\.add\('summary-wide'\)/);
const canonical = read('r91-finance-engine.js');
assert.match(canonical, /!t\.invoicePayment&&t\.kind!=='invoice_payment'/);
assert.match(canonical, /const summaryCells=\[\.\.\.box\.children\]\.filter\(el=>!el\.classList\.contains\('brand-fin-card'\)\)/);
assert.doesNotMatch(canonical, /const cells=\[\.\.\.box\.children\].*cells\.length%2/);
assert.match(sw, /r134-stable-values-airsoft/);
assert.match(index, /r70-real-reset\.js\?v=25/);
assert.match(index, /r92-stable-startup\.js\?v=1/);
assert.match(index, /r80-investment-status-fix\.js\?v=9/);
assert.doesNotMatch(index, /if\(key===baseMonth\)return 803\.95/);
assert.match(index, /const balanceById=new Map\(\);let running=0/);
assert.doesNotMatch(index, /t\.id==='caju_2026_09_17_marilza_2999'\?brl\(961\.90\)/);

const storage = {};
const context = {
  console,
  db: { categories: [] },
  localStorage: {
    getItem: key => storage[key] ?? null,
    setItem: (key, value) => { storage[key] = String(value); },
  },
  setTimeout: () => 0,
  clearTimeout: () => {},
  document: { readyState: 'complete', addEventListener: () => {}, dispatchEvent: () => {} },
  window: { addEventListener: () => {}, FinanceCloud: { configured: () => false } },
  CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init?.detail; },
};
vm.createContext(context);
vm.runInContext(read('r70-real-reset.js'), context);
context.db = context.window.FinanceRealBase.build();
context.db.transactions.push({ id: 'manual_regression_guard', date: '2026-09-20', value: 0, account: 'acc_c6', status: 'realized', origin: 'Manual' });

(async () => {
  await context.window.FinanceRealBase.enforce('automated-audit');
  const { db } = context;
  const september = db.transactions.filter(t =>
    String(t.date || '').slice(0, 7) === '2026-09' &&
    t.status !== 'planned' && !t.transfer && !t.excludeFromExpense
  );
  const income = september.filter(t => Number(t.value) > 0).reduce((s, t) => s + Number(t.value), 0);
  const expense = Math.abs(september.filter(t => Number(t.value) < 0).reduce((s, t) => s + Number(t.value), 0));
  const account = db.accounts.find(a => a.id === 'acc_c6');
  const ids = db.transactions.map(t => String(t.id));

  near(income, 2639.62, 'entradas de setembro');
  near(expense, 2174.72, 'saídas de setembro');
  near(account.balance, 486.31, 'saldo atual C6');
  near(account.openingBalance + income - expense, account.balance, 'reconciliação do saldo C6');
  near(db.meta.statementOutVisible, 2174.72, 'saídas visíveis');
  assert.strictEqual(new Set(ids).size, ids.length, 'IDs de transações duplicados');
  assert.strictEqual(db.meta.c6Sep2026Validated, 'v10');
  assert.ok(db.transactions.some(t => t.id === 'manual_regression_guard'), 'migração não pode apagar lançamentos manuais');

  const todayIds = [
    'c6_2026_09_20_pista5_1080', 'c6_2026_09_20_jbm_1649',
    'c6_2026_09_20_gas_company_5000', 'c6_2026_09_20_pista4_1080',
    'c6_2026_09_20_pista3_1080', 'c6_2026_09_20_posto_trevo_5000',
    'c6_2026_09_20_marlon_borracheiro_4000', 'c6_2026_09_20_pix_andress_8000',
    'c6_2026_09_20_pix_sympla_6630',
  ];
  const todayTotal = Math.abs(db.transactions.filter(t => todayIds.includes(t.id)).reduce((s, t) => s + Number(t.value), 0));
  near(todayTotal, 335.19, 'nove lançamentos de 20/09');
  assert.strictEqual(db.transactions.filter(t => ['c6_2026_09_20_pista5_1080','c6_2026_09_20_jbm_1649'].includes(t.id)).length, 2, 'extrato não pode duplicar Pista 5 ou JBM');
  const latao = db.transactions.find(t => t.id === 'c6_2026_09_20_pix_andress_8000');
  const airsoft = db.transactions.find(t => t.id === 'c6_2026_09_20_pix_sympla_6630');
  assert.deepStrictEqual([latao.cat, latao.sub, latao.classificationPending], ['Cerveja', 'Depósito do Latão', false]);
  assert.deepStrictEqual([airsoft.cat, airsoft.sub, airsoft.classificationPending], ['Airsoft', 'Airsoft', false]);

  const ruleStart = index.indexOf('function isC6CarbonCard');
  const ruleEnd = index.indexOf('function financeBrandCard', ruleStart);
  assert.ok(ruleStart > 0 && ruleEnd > ruleStart, 'regra do limite C6 Carbon precisa estar disponível');
  vm.runInContext(index.slice(ruleStart, ruleEnd), context);
  db.transactions.push(
    { id: 'audit_inv_oct', date: '2026-10-10', value: -1000, transfer: true, dest: 'acc_invest_plan', status: 'realized' },
    { id: 'audit_inv_nov_planned', date: '2026-11-10', value: -3000, transfer: true, dest: 'acc_invest_plan', status: 'planned' },
    { id: 'audit_inv_dec', date: '2026-12-10', value: -500, transfer: true, dest: 'acc_invest_plan', status: 'posted' },
  );
  near(context.carbonInvestmentLimitAt('2026-10'), 1000, 'limite C6 Carbon em outubro');
  near(context.carbonInvestmentLimitAt('2026-11'), 1000, 'aporte previsto não vira limite');
  near(context.carbonInvestmentLimitAt('2026-12'), 1500, 'limite C6 Carbon acumulado em dezembro');
  db.transactions = db.transactions.filter(t => !String(t.id).startsWith('audit_inv_'));

  account.balance = 400;
  const caju = db.cards.find(c => c.id === 'card_caju_alimentacao');
  caju.balance = 500;
  caju.availableLimit = 500;
  await context.window.FinanceRealBase.enforce('manual-balance-regression');
  near(account.balance, 400, 'saldo manual posterior do C6 deve ser preservado');
  near(caju.balance, 500, 'saldo manual posterior do Caju deve ser preservado');
  near(caju.availableLimit, 500, 'disponível manual posterior do Caju deve ser preservado');
  account.balance = 486.31;
  caju.balance = 525.17;
  caju.availableLimit = 525.17;

  console.log('AUDITORIA ATUAL: APROVADA');
  console.log(JSON.stringify({ income, expense, balance: account.balance, openingBalance: account.openingBalance, todayTotal }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
