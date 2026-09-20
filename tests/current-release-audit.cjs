const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const read = file => fs.readFileSync(file, 'utf8');
const near = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) < 0.011, `${label}: ${actual} != ${expected}`);

const index = read('index.html');
const atual = read('atual.html');
const sw = read('sw.js');
assert.strictEqual(index, atual, 'index.html e atual.html precisam ser idênticos');
assert.match(index, /ATUAL-MOBILE-R12\.4-2026\.09\.20/);
assert.match(index, /id="r124-mobile-financial-card-stack"/);
assert.match(index, /#view-overview #kpis\.grid-kpi>\.brand-fin-card\{[\s\S]*grid-column:1\/-1!important;[\s\S]*width:100%!important/);
['c6account', 'caju', 'creditcard', 'itauaccount', 'xpaccount'].forEach(id =>
  assert.match(index, new RegExp(`data-kpi-id="${id}"`), `card financeiro ${id} precisa estar contemplado`)
);
assert.match(sw, /r124-financial-card-stack/);

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
  near(expense, 2028.42, 'saídas de setembro');
  near(account.balance, 632.61, 'saldo atual C6');
  near(account.openingBalance + income - expense, account.balance, 'reconciliação do saldo C6');
  near(db.meta.statementOutVisible, 2028.42, 'saídas visíveis');
  assert.strictEqual(new Set(ids).size, ids.length, 'IDs de transações duplicados');
  assert.strictEqual(db.meta.c6Sep2026Validated, 'v7');
  assert.ok(db.transactions.some(t => t.id === 'manual_regression_guard'), 'migração não pode apagar lançamentos manuais');

  const todayIds = [
    'c6_2026_09_20_pista5_1080', 'c6_2026_09_20_jbm_1649',
    'c6_2026_09_20_gas_company_5000', 'c6_2026_09_20_pista4_1080',
    'c6_2026_09_20_pista3_1080', 'c6_2026_09_20_posto_trevo_5000',
    'c6_2026_09_20_marlon_borracheiro_4000',
  ];
  const todayTotal = Math.abs(db.transactions.filter(t => todayIds.includes(t.id)).reduce((s, t) => s + Number(t.value), 0));
  near(todayTotal, 188.89, 'sete lançamentos de 20/09');

  console.log('AUDITORIA ATUAL: APROVADA');
  console.log(JSON.stringify({ income, expense, balance: account.balance, openingBalance: account.openingBalance, todayTotal }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
