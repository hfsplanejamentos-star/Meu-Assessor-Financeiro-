/* V10 Experience — chart, agenda and reconciliation integration over the canonical Store/Engine. */
(() => {
  'use strict';
  const engine = () => window.FinanceEngineV10; const state = () => window.FinanceStoreV10?.get();
  const monthKey = (value) => String(value || '').slice(0, 7); const abs = (value) => Math.abs(Number(value) || 0);
  const currentMonth = () => window.activeMonth || new Date().toISOString().slice(0, 7);
  const brl = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  function bindCharts() {
    document.querySelectorAll('#categoryLegend .legend-line,[data-canonical-category]').forEach((element) => {
      element.tabIndex = 0; element.setAttribute('role', 'button');
      const open = () => { const name = element.dataset.canonicalCategory || element.querySelector('span')?.textContent?.trim(); if (name && typeof window.openCategoryDetail === 'function') window.openCategoryDetail(name); };
      element.onclick = open; element.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } };
    });
    ['categoryChart', 'projectionChart'].forEach((id) => { const canvas = document.getElementById(id); if (canvas) { canvas.tabIndex = 0; canvas.setAttribute('aria-label', id === 'categoryChart' ? 'Gráfico interativo de despesas por categoria' : 'Gráfico interativo de projeção financeira'); } });
  }
  function agendaEvents(month = currentMonth()) {
    const store = state(); if (!store || !engine()) return [];
    const events = [];
    (store.transactions || []).filter((item) => monthKey(item.date) === month).forEach((item) => events.push({ date: item.date, type: item.transfer ? 'investment' : 'transaction', title: item.desc || item.description || 'Lançamento', value: Number(item.value) || 0, status: item.status, id: item.id }));
    engine().recurringFor(store, month).forEach((item) => events.push({ date: `${month}-${String(item.dueDay || item.due || 10).padStart(2, '0')}`, type: 'recurring', title: item.desc || item.description || 'Compromisso', value: -abs(item.value), status: 'planned', id: item.id }));
    return events.sort((a, b) => a.date.localeCompare(b.date));
  }
  function renderAgenda(month = currentMonth()) {
    const target = document.getElementById('calendarEvents'); if (!target) return [];
    const events = agendaEvents(month); target.innerHTML = events.length ? events.map((item) => `<div class="item" data-v10-agenda-id="${item.id}"><div class="ico">${item.type === 'recurring' ? '↻' : item.type === 'investment' ? '↗' : '•'}</div><div><b>${item.title}</b><small>${item.date.split('-').reverse().join('/')} · ${item.status}</small></div><div class="amount ${item.value < 0 ? 'down' : 'up'}">${brl(item.value)}</div></div>`).join('') : '<div class="notice">Sem eventos financeiros neste mês.</div>';
    return events;
  }
  function reconcile(month = currentMonth()) {
    const store = state(); if (!store) return { month, cases: [], unclassified: 0 };
    const transactions = (store.transactions || []).filter((item) => monthKey(item.date) === month); const cases = []; const seen = new Map();
    transactions.filter((item) => item.classificationPending || item.status === 'provisional').forEach((item) => cases.push({ id: item.id, type: 'classification', status: 'pending', description: item.desc, value: item.value }));
    transactions.forEach((item) => { const signature = [item.date, item.value, item.desc, item.accountId || item.cardId || ''].join('|'); if (seen.has(signature)) cases.push({ id: item.id, type: 'possible-duplicate', status: 'review', matches: seen.get(signature), description: item.desc, value: item.value }); else seen.set(signature, item.id); });
    return { month, cases, unclassified: cases.filter((item) => item.type === 'classification').length };
  }
  function renderReconciliation(month = currentMonth()) {
    const result = reconcile(month); const target = document.getElementById('reconcileStats'); if (!target) return result;
    target.innerHTML = `<div class="row-list"><div class="item"><div class="ico">◎</div><div><b>${result.cases.length} caso(s) para revisar</b><small>${result.unclassified} classificação(ões) pendente(s) · nenhuma alteração automática</small></div></div></div>`; return result;
  }
  function cajuStatus() { const store = state(); if (!store) return null; const card = (store.cards || []).find((item) => item.id === 'card_caju_alimentacao'); const spent = (store.transactions || []).filter((item) => item.cardId === 'card_caju_alimentacao' && Number(item.value) < 0 && /posted|realized|confirm/i.test(String(item.status))).reduce((sum, item) => sum + abs(item.value), 0); return card ? { limit: Number(card.limit) || 0, balance: Number(card.balance) || 0, spent, excludeFromPatrimony: card.excludeFromPatrimony === true } : null; }
  function architecture() { return { store: Boolean(window.FinanceStoreV10), engine: Boolean(window.FinanceEngineV10), mobile: Boolean(window.MobileDashboardV10), desktopUsesSameState: window.db === window.FinanceStoreV10?.get() }; }
  function refresh() { bindCharts(); window.V10AgendaEvents = renderAgenda(currentMonth()); window.V10Reconciliation = renderReconciliation(currentMonth()); window.V10Caju = cajuStatus(); }
  function install() { refresh(); document.addEventListener('v10-render-complete', refresh); document.addEventListener('v10-month-changed', refresh); document.addEventListener('finance-store-changed', () => window.RenderControllerV10?.schedule('experience')); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
  window.ExperienceV10 = { bindCharts, agendaEvents, renderAgenda, reconcile, renderReconciliation, cajuStatus, architecture, refresh };
})();
