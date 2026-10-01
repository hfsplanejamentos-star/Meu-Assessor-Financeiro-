const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

const db = {
  accounts: [{ id: 'acc_c6', type: 'checking', balance: 140.4 }],
  transactions: [
    { id: 'salary_oct', date: '2026-10-30', desc: 'Salário previsto', value: 6500, cat: 'Receitas', status: 'planned' },
    { id: 'rent_oct', date: '2026-10-02', desc: 'Aluguel', value: -2500, cat: 'Moradia', status: 'planned', recurringId: 'rent' },
    { id: 'caju_topup', date: '2026-10-01', desc: 'Crédito Caju', value: 1572.4, status: 'planned', benefit: true, excludeFromExpense: true },
    { id: 'invest_oct', date: '2026-10-10', desc: 'Aporte', value: -3000, status: 'planned', transfer: true, kind: 'transfer', excludeFromExpense: true, dest: 'acc_invest_plan', destAccountId: 'acc_invest_plan' },
  ],
  recurring: [
    { id: 'rent', desc: 'Aluguel', value: -2500, due: 2, active: true, startDate: '2026-10-01' },
    { id: 'internet', desc: 'Internet', value: -80, due: 10, active: true, startDate: '2026-10-01' },
    { id: 'salary', desc: 'Salário', value: 6500, due: 30, active: true, startDate: '2026-10-01' },
  ],
  investments: [],
  meta: {},
};

const storage = {};
const context = {
  db, console, Date, Math, Number, String, Array, Set, Map, JSON, Object, RegExp, Promise,
  save() {},
  localStorage: { getItem: key => storage[key] || null, setItem: (key, value) => { storage[key] = String(value); } },
  setTimeout() { return 0; },
  requestAnimationFrame() {},
  document: { readyState: 'complete', addEventListener() {}, querySelectorAll() { return []; }, getElementById() { return null; } },
  window: { matchMedia() { return { matches: false }; } },
};

vm.createContext(context);
vm.runInContext(fs.readFileSync('r91-finance-engine.js', 'utf8'), context);

const summary = context.window.FinanceCanonical.summary('2026-10');
assert.equal(summary.plannedIncome, 6500, 'planned salary counted once as income');
assert.equal(summary.plannedExpense, 2580, 'only negative recurrences count as expense; linked rent is not doubled');
assert.equal(summary.investment, 3000, 'planned investment stays separate from expenses');
assert.equal(db.recurring.find(row => row.id === 'salary').value, 6500, 'positive salary recurrence keeps its sign');

const projection = context.window.FinanceCanonical.projection('2026-10', 1)[0];
assert.equal(projection.income, 6500);
assert.equal(projection.expense, 2580);
assert.equal(projection.investmentMove, 3000);

console.log('R271 finance engine regression passed');
