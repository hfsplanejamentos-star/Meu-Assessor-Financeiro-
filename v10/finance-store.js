/* V10 FinanceStore — authoritative production state; never deletes confirmed real data. */
(() => {
  'use strict';
  const KEY = 'meu_assessor_financeiro_v10_real';
  const LEGACY_KEYS = ['assessor_v180_simulacao_ficticia', 'meu_assessor_financeiro'];
  const SCHEMA = 6;
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
    const statementVersion = 'c6-2026-09-full-v1';
    if (state.meta?.statementVersion !== statementVersion) {
      state.transactions = state.transactions.filter((item) => !(item.source === 'C6 Bank statement' && String(item.date || '').startsWith('2026-09')));
      state.meta = { ...state.meta, statementVersion };
    }
    [
      ['c6_pix_20260910', '2026-09-10', 'PIX recebido', 'Transferências', 304.57, false, true],
      ['c6_recarga', '2026-09-10', 'RECARGA CELULAR', 'Comunicação', -20, false, false],
      ['c6_estorno_recarga', '2026-09-10', 'EST RECARGA DE CEL', 'Estornos', 20, false, true],
      ['c6_super', '2026-09-11', 'Pix enviado para SUPER NORTE', 'Alimentação', -79.06, false, false],
      ['c6_fm', '2026-09-11', 'FM AGENCIAMENTO', 'Serviços', -14.85, false, false],
      ['c6_deb', '2026-09-11', 'Depósito Cego', 'Outros', -71.50, true, false],
      ['c6_drog', '2026-09-11', 'Débito de cartão — Drogaria', 'Saúde', -12.99, false, false],
      ['c6_lav1', '2026-09-12', 'LAVLAND.JP', 'Serviços', -19.89, false, false],
      ['c6_lav2', '2026-09-13', 'LAVLAND.JP', 'Serviços', -19.90, false, false],
      ['c6_nexa', '2026-09-13', 'NEXA INTERMEDIAÇÕES', 'Outros', -24.99, true, false],
      ['c6_jm1', '2026-09-13', 'J.M.COM', 'Outros', -2.50, true, false],
      ['c6_posto_15', '2026-09-15', 'Auto Posto', 'Transporte', -30, false, false],
      ['c6_jm2', '2026-09-15', 'J.M.COM', 'Outros', -4, true, false],
      ['c6_posto_16', '2026-09-16', 'Auto Posto', 'Transporte', -30, false, false],
      ['c6_pix_20260918', '2026-09-18', 'PIX recebido', 'Transferências', 2315.05, false, true],
      ['c6_justa_ferreira_adelino', '2026-09-18', 'Justa Ferreira Adelino', 'Moradia', -1250, false, false],
      ['c6_posto_18', '2026-09-18', 'Posto', 'Transporte', -100, false, false],
      ['c6_pb_guapimirim', '2026-09-18', 'PB Guapimirim', 'Outros', -21, true, false],
      ['c6_pista_4', '2026-09-18', 'Pista 4', 'Transporte', -10.80, false, false],
      ['c6_lanchonete', '2026-09-18', 'Lanchonete', 'Alimentação', -16.90, false, false],
      ['c6_pista_3', '2026-09-18', 'Pista 3', 'Transporte', -10.80, false, false],
    ].forEach(([id, date, desc, cat, value, pending, excluded]) => upsert(state.transactions, {
      id, date, desc, description: desc, cat, sub: '', value, status: 'posted',
      origin: 'C6 Bank statement', source: 'C6 Bank statement', account: 'acc_c6',
      accountId: 'acc_c6', statementPeriod: '2026-09-01/2026-09-18',
      classificationPending: pending, excludeFromExpense: excluded,
    }));
    upsert(state.transactions, { id: 'caju_2026_09_17_padaria_xanxere', date: '2026-09-17', desc: 'Padaria e Confeit Xanxere', description: 'Padaria e Confeit Xanxere', merchant: 'Padaria e Confeit Xanxere', cat: 'Alimentação', sub: 'Padaria', value: -14, status: 'posted', source: 'Caju', origin: 'Caju Crédito', cardId: 'card_caju_alimentacao', excludeFromPatrimony: true });
    const income = [['2026-10', 6500, 'Salário outubro'], ...['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06', '2027-07'].map((month) => [month, 10104.50, 'Salário líquido'])];
    for (const [month, value, desc] of income) upsert(state.transactions, { id: `receita_${String(month).replace('-', '_')}`, date: `${month}-05`, desc, cat: 'Receitas', value, status: 'planned', source: 'user-approved-plan', accountId: 'acc_c6' });
    upsert(state.transactions, { id: 'decimo_terceiro_2026', date: '2026-12-20', desc: '13º salário líquido estimado', cat: 'Receitas', value: 3893.44, status: 'planned', source: 'user-approved-plan', accountId: 'acc_c6' });
    // Schema 5 replaces the two former aggregate seed rows with the real
    // individual commitments supplied by the user. Only the known aggregate
    // seed IDs are removed; other real/user-created recurring rows are kept.
    state.recurring = state.recurring.filter((item) => !['compromissos_base_2026_2027', 'compromissos_adicionais_ate_maio', 'rec_pensao_1500', 'rec_prestacao_carro_1000', 'rec_aluguel_1250', 'rec_internet_80', 'rec_plano_tim_7990', 'rec_emprestimo_300'].includes(item.id));
    [
      { id: 'rec_pensao', desc: 'Pensão alimentícia', cat: 'Família', value: -1500, endDate: '2027-07-10' },
      { id: 'rec_carro', desc: 'Prestação do carro', cat: 'Transporte', value: -1000, endDate: '2027-07-10' },
      { id: 'rec_aluguel', desc: 'Aluguel', cat: 'Moradia', value: -1250, endDate: '2027-07-10' },
      { id: 'rec_internet', desc: 'Internet', cat: 'Moradia', value: -80, endDate: '2027-07-10' },
      { id: 'rec_tim', desc: 'Plano TIM', cat: 'Comunicação', value: -79.90, endDate: '2027-07-10' },
      { id: 'rec_emp_mae', desc: 'Empréstimo mãe', cat: 'Empréstimos/Compromissos', value: -300, endDate: '2027-05-10', installments: 8 },
    ].forEach((item) => upsert(state.recurring, { ...item, dueDay: 10, due: 10, startDate: '2026-10-10', frequency: 'monthly', active: true, source: 'user-approved' }));
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
