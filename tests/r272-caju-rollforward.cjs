const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

const db = {
  meta: { cajuStatementAvailable: 1419.88, cajuStatementCredit: 1006.89 },
  cards: [{ id: 'card_caju_alimentacao', balance: 1419.88 }],
  automationState: { cajuMonthlyTopups: { '2026-10': 1572.40, '2026-11': 1500 } },
  transactions: [
    { id: 'oct-canceled', date: '2026-10-01', value: -36.01, status: 'cancelled', cardId: 'card_caju_alimentacao', benefit: true },
    { id: 'oct-planned', date: '2026-10-02', value: -100, status: 'planned', cardId: 'card_caju_alimentacao', benefit: true },
    { id: 'nov-real', date: '2026-11-02', value: -100, status: 'realized', cardId: 'card_caju_alimentacao', benefit: true },
  ],
  recurring: [],
};
const listeners = {};
const document = {
  readyState: 'loading',
  addEventListener(name, fn) { listeners[name] = fn; },
  getElementById() { return null; },
  querySelector() { return null; },
  createElement() { return { setAttribute() {}, appendChild() {}, style: {}, textContent: '' }; },
  head: { appendChild() {} },
};
const window = { addEventListener() {} };
const localStorage = { getItem() { return null; }, setItem() {} };
const context = { db, document, window, localStorage, console, Date, Math, Number, String, Array, Set, Map, JSON, RegExp, Promise, setTimeout() {}, requestAnimationFrame() {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('r104-dashboard-repair.js', 'utf8'), context);

const october = context.window.FinanceCajuMonthly.snapshot('card_caju_alimentacao', '2026-10');
assert.equal(october.topup, 1572.40);
assert.equal(october.spent, 0, 'canceled and planned expenses do not reduce October');
assert.equal(october.credit, 2992.28, 'October starting balance plus recharge is R$ 2,992.28');
assert.equal(october.available, 2992.28, 'zero realized October spending leaves the full balance available');

const november = context.window.FinanceCajuMonthly.snapshot('card_caju_alimentacao', '2026-11');
assert.equal(november.credit, 4492.28, 'November starts from October closing balance and adds only November top-up');
assert.equal(november.spent, 100);
assert.equal(november.available, 4392.28);
console.log('R272 Caju monthly roll-forward regression passed');
