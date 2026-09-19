const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const storage = new Map();
const context = {
  console,
  structuredClone,
  performance: { now: () => Date.now() },
  requestAnimationFrame: (fn) => { fn(); return 1; },
  queueMicrotask,
  CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
  document: { dispatchEvent() {}, addEventListener() {}, scripts: [], querySelectorAll: () => [], querySelector: () => null, getElementById: () => null },
  navigator: { serviceWorker: {} },
  localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) },
};
context.window = context;
vm.createContext(context);
for (const file of ['v10/finance-store.js', 'v10/finance-engine.js', 'v10/finance-tests.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });

const store = context.FinanceStoreV10; const engine = context.FinanceEngineV10; const state = store.get();
assert.equal(store.valid(state), true);
assert.equal(state.meta.realDataProtected, true);
assert.equal(state.accounts.find((item) => item.id === 'acc_c6').balance, 1103.67);
assert.equal(state.transactions.find((item) => item.id === 'real_rescisao_20260918').value, 1069.36);
assert.equal(state.cards.find((item) => item.id === 'card_caju_alimentacao').excludeFromPatrimony, true);
assert.equal(engine.summary(state, '2026-10').plannedIncome, 6500);
assert.equal(engine.summary(state, '2026-11').plannedIncome, 10104.5);
assert.equal(engine.summary(state, '2026-12').plannedIncome, 13997.94);
assert.equal(engine.summary(state, '2027-05').plannedExpense, 4209.9);
assert.equal(engine.summary(state, '2027-06').plannedExpense, 3909.9);
assert.deepEqual(Array.from(engine.expenseItems(state, '2026-10', 'planned'), (item) => [item.name, item.value]), [
  ['Pensão alimentícia', 1500], ['Aluguel', 1250], ['Prestação do carro', 1000], ['Empréstimo mãe', 300], ['Internet', 80], ['Plano TIM', 79.9],
]);
assert.equal(engine.expenseItems(state, '2027-06', 'planned').length, 5);
assert.equal(engine.expenseItems(state, '2026-10', 'planned').reduce((sum, item) => sum + item.value, 0), 4209.9);
assert.equal(state.transactions.filter((item) => item.source === 'C6 Bank statement' && item.value < 0).length, 18);
assert.equal(state.transactions.filter((item) => item.source === 'C6 Bank statement' && item.value < 0).reduce((sum, item) => sum + Math.abs(item.value), 0), 1739.18);
assert.equal(state.transactions.find((item) => item.id === 'c6_justa_ferreira_adelino').cat, 'Moradia');
assert.equal(state.transactions.find((item) => item.id === 'caju_2026_09_17_padaria_14').value, -14);
assert.equal(state.transactions.filter((item) => item.cardId === 'card_caju_alimentacao' && item.value < 0).length, 6);
assert.equal(state.cards.find((item) => item.id === 'card_caju_alimentacao').balance, 803.95);
assert.ok(Math.abs(state.transactions.filter((item) => item.cardId === 'card_caju_alimentacao' && item.value < 0).reduce((sum, item) => sum + Math.abs(item.value), 0) - 202.94) < 0.001);
const NativeDate = Date;
context.Date = class FixedDate extends NativeDate { constructor(...args) { super(...(args.length ? args : ['2026-12-15T12:00:00Z'])); } static now() { return new NativeDate('2026-12-15T12:00:00Z').getTime(); } };
const futureState = store.ensureKnownReal({ ...state, transactions: state.transactions.filter((item) => !String(item.id).startsWith('auto_caju_')) });
assert.equal(futureState.transactions.filter((item) => String(item.id).startsWith('auto_caju_')).length, 3);
assert.equal(futureState.transactions.find((item) => item.id === 'auto_caju_2026_10').value, 1500);
assert.equal(futureState.cards.find((item) => item.id === 'card_caju_alimentacao').balance, 5303.95);
context.Date = NativeDate;
assert.equal(engine.summary(state, '2026-11').investment, 3000);
assert.equal(engine.projection(state, '2026-10', 12).every((row) => Math.abs(row.patrimony - (row.liquid + row.invest)) < 0.02), true);
assert.equal(context.FinanceTestsV10.run().ok, true);
console.log(JSON.stringify({ ok: true, assertions: 26, finance: context.FinanceTestsV10.run() }, null, 2));
