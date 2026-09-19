/* V10 FinanceStore — authoritative production state; never deletes confirmed real data. */
(() => {
  'use strict';
  const KEY = 'meu_assessor_financeiro_v10_real';
  const LEGACY_KEYS = ['assessor_v180_simulacao_ficticia', 'meu_assessor_financeiro'];
  const SCHEMA = 5;
  const COLLECTIONS = ['accounts', 'cards', 'transactions', 'recurring', 'investments', 'invoices', 'budgets', 'goals'];
  const clone = (value) => JSON.parse(JSON.stringify(value ?? {}));
  const KNOWN_REAL = Object.freeze({ c6OpeningBalance: 34.31, severance: 1069.36, c6Balance: 1103.67, cajuBalance: 881.95, cajuLimit: 1500 });

  function dedupeById(rows) {
    const seen = new Map();
    for (const row of rows || []) {
      if (!row || typeof row !== 'object') continue;
      const id = String(row.id || `${row.date || ''}|${row.value || ''}|${row.desc || row.description || ''}`);
      seen.set(id, { ...(seen.get(id) || {}), ...row, id: row.id || id });
    }
    return [...seen.values()];
  }

  function clean(input) {
    const state = input && typeof input === 'object' ? clone(input) : {};
    COLLECTIONS.forEach((name) => { state[name] = Array.isArray(state[name]) ? state[name] : []; });
    const isDemo = (item) => /(demo|fict[ií]ci|simula[cç][aã]o)/i.test([item.source, item.origin].join(' '));
    state.accounts = dedupeById(state.accounts).filter((item) => !isDemo(item));
    state.cards = dedupeById(state.cards).filter((item) => !isDemo(item));
    state.transactions = dedupeById(state.transactions).filter((item) => !isDemo(item));
    state.recurring = dedupeById(state.recurring).filter((item) => !isDemo(item));
    state.meta = { ...(state.meta || {}), schemaVersion: SCHEMA, environment: 'production', dataMode: 'real', sourceOfTruth: 'FinanceStoreV10' };
    return state;
  }

  function valid(state) {
    return Boolean(state && state.meta?.schemaVersion === SCHEMA && state.meta?.environment === 'production' && state.meta?.dataMode === 'real' && COLLECTIONS.every((name) => Array.isArray(state[name])));
  }

  function migrateSchema(input) {
    const state = clean(input);
    state.meta = { ...state.meta, migratedAt: state.meta?.migratedAt || new Date().toISOString() };
    return state;
  }

  function readStored() {
    for (const key of [KEY, ...LEGACY_KEYS]) {
      try { const value = JSON.parse(localStorage.getItem(key) || 'null'); if (value) return value; } catch (_) {}
    }
    return {};
  }

  function ensureKnownReal(input) {
    const state = clean(input);
    const upsert = (collection, value) => {
      const index = collection.findIndex((item) => item.id === value.id);
      if (index < 0) collection.push(value); else collection[index] = { ...value, ...collection[index] };
    };
    upsert(state.accounts, { id: 'acc_c6', name: 'C6 Bank', type: 'Conta corrente', balance: KNOWN_REAL.c6Balance, openingBalance: KNOWN_REAL.c6OpeningBalance, balanceDate: '2026-09-18', source: 'user-confirmed' });
    upsert(state.cards, { id: 'card_caju_alimentacao', name: 'Caju Alimentação', type: 'Benefício', limit: KNOWN_REAL.cajuLimit, balance: KNOWN_REAL.cajuBalance, availableLimit: KNOWN_REAL.cajuBalance, excludeFromPatrimony: true, source: 'user-confirmed' });
    upsert(state.transactions, { id: 'real_rescisao_20260918', date: '2026-09-18', desc: 'Rescisão Contratual', cat: 'Receitas', sub: 'Rescisão', value: KNOWN_REAL.severance, status: 'posted', source: 'user-confirmed', accountId: 'acc_c6' });
    upsert(state.transactions, { id: 'caju_20260918_bakery_3090', date: '2026-09-18', time: '10:26', desc: 'Bakery and Confectionery Real', cat: 'Alimentação', sub: 'Padaria', value: -30.90, status: 'posted', source: 'Caju', origin: 'Caju Crédito', cardId: 'card_caju_alimentacao', excludeFromPatrimony: true });
    upsert(state.transactions, { id: 'caju_20260918_4905', date: '2026-09-18', time: '12:42', desc: 'Compra Caju', cat: 'Alimentação', value: -49.05, status: 'posted', source: 'Caju', origin: 'Caju Crédito', cardId: 'card_caju_alimentacao', excludeFromPatrimony: true });
    const income = [['2026-10', 6500, 'Salário outubro'], ...['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06', '2027-07'].map((month) => [month, 10104.50, 'Salário líquido'])];
    for (const [month, value, desc] of income) upsert(state.transactions, { id: `receita_${String(month).replace('-', '_')}`, date: `${month}-05`, desc, cat: 'Receitas', value, status: 'planned', source: 'user-approved-plan', accountId: 'acc_c6' });
    upsert(state.transactions, { id: 'decimo_terceiro_2026', date: '2026-12-20', desc: '13º salário líquido estimado', cat: 'Receitas', value: 3893.44, status: 'planned', source: 'user-approved-plan', accountId: 'acc_c6' });
    // Schema 5 replaces the two former aggregate seed rows with the real
    // individual commitments supplied by the user. Only the known aggregate
    // seed IDs are removed; other real/user-created recurring rows are kept.
    state.recurring = state.recurring.filter((item) => !['compromissos_base_2026_2027', 'compromissos_adicionais_ate_maio'].includes(item.id));
    [
      { id: 'rec_pensao_1500', desc: 'Pensão', cat: 'Família', value: -1500, endDate: '2027-07-31' },
      { id: 'rec_prestacao_carro_1000', desc: 'Prestação do carro', cat: 'Transporte', value: -1000, endDate: '2027-07-31' },
      { id: 'rec_aluguel_1250', desc: 'Aluguel', cat: 'Moradia', value: -1250, endDate: '2027-07-31' },
      { id: 'rec_internet_80', desc: 'Internet', cat: 'Moradia', value: -80, endDate: '2027-07-31' },
      { id: 'rec_plano_tim_7990', desc: 'Plano TIM', cat: 'Comunicação', value: -79.90, endDate: '2027-07-31' },
      { id: 'rec_emprestimo_300', desc: 'Empréstimo', cat: 'Dívidas', value: -300, endDate: '2027-05-31' },
    ].forEach((item) => upsert(state.recurring, { ...item, dueDay: 10, startDate: '2026-10-01', active: true, source: 'user-approved-plan' }));
    state.meta = { ...state.meta, c6KnownBalance: KNOWN_REAL.c6Balance, c6KnownBalanceAt: '2026-09-18', cajuKnownBalance: KNOWN_REAL.cajuBalance, cajuKnownBalanceAt: '2026-09-18T12:42:00-03:00', realDataProtected: true };
    return state;
  }

  let state = ensureKnownReal(migrateSchema(readStored()));
  const listeners = new Set();
  function persist(reason = 'save') {
    state = ensureKnownReal(clean(state)); localStorage.setItem(KEY, JSON.stringify(state)); window.db = state;
    listeners.forEach((listener) => listener(state, reason));
    document.dispatchEvent(new CustomEvent('finance-store-changed', { detail: { reason } })); return state;
  }
  function get() { return state; }
  function set(next, reason = 'set') { state = ensureKnownReal(next); return persist(reason); }
  function update(mutator, reason = 'update') { const draft = clone(state); mutator(draft); return set(draft, reason); }
  function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  function upsertTx(transaction) { return update((draft) => { const index = draft.transactions.findIndex((item) => item.id === transaction.id); if (index < 0) draft.transactions.push(transaction); else draft.transactions[index] = { ...draft.transactions[index], ...transaction }; }, 'transaction'); }
  function exportSnapshot() { return clone(state); }
  persist('v10-startup');
  window.FinanceStoreV10 = { KEY, SCHEMA, KNOWN_REAL, get, set, update, subscribe, upsertTx, persist, valid, clean, migrateSchema, ensureKnownReal, exportSnapshot };
})();
