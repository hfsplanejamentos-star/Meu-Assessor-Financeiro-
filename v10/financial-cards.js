/* V10 financial cards — C6 and Caju home/detail presentation. */
(() => {
  'use strict';
  const HIDDEN_KEY = 'assessor_v10_financial_cards_hidden';
  const brl = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const state = () => window.FinanceStoreV10?.get?.();
  const month = () => window.activeMonth || new Date().toISOString().slice(0, 7);
  const cajuRows = (store, key = month()) => (store.transactions || []).filter((item) => item.cardId === 'card_caju_alimentacao' && String(item.date || '').slice(0, 7) <= key);
  const cajuBalanceAt = (store, key = month()) => cajuRows(store, key).reduce((sum, item) => sum + Number(item.value || 0), 0);
  const cajuSpent = (store, key = month()) => cajuRows(store, key).filter((item) => String(item.date).slice(0, 7) === key && Number(item.value) < 0).reduce((sum, item) => sum + Math.abs(Number(item.value)), 0);
  function ensurePanel() {
    const overview = document.getElementById('view-overview'); const kpis = document.getElementById('kpis'); if (!overview || !kpis) return null;
    let panel = document.getElementById('v10FinancialCardsPanel');
    if (!panel) {
      panel = document.createElement('section'); panel.id = 'v10FinancialCardsPanel'; panel.className = 'card panel v10-financial-panel';
      panel.innerHTML = '<div class="panel-head"><div><h3>Contas e benefícios</h3><small>Resumo rápido C6 Bank e Caju</small></div><button type="button" id="v10ToggleFinancialCards">Ocultar cartões</button></div><div id="quickFinancialCards" class="v10-financial-grid"></div>';
      kpis.insertAdjacentElement('afterend', panel);
      panel.querySelector('#v10ToggleFinancialCards').addEventListener('click', () => { localStorage.setItem(HIDDEN_KEY, localStorage.getItem(HIDDEN_KEY) === '1' ? '0' : '1'); render(); });
    }
    return panel;
  }
  function renderDetails(store, key) {
    const kpis = document.getElementById('cajuDetailKpis'); const table = document.getElementById('cajuDetailTable'); if (!kpis || !table) return;
    const expenses = cajuRows(store, key).filter((item) => String(item.date).slice(0, 7) === key && Number(item.value) < 0).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const balance = cajuBalanceAt(store, key); const spent = cajuSpent(store, key);
    kpis.innerHTML = `<div class="card-kpi"><small>Saldo disponível</small><b class="up">${brl(balance)}</b></div><div class="card-kpi"><small>Gasto no mês</small><b class="down">${brl(spent)}</b></div><div class="card-kpi"><small>Crédito mensal</small><b>${brl(store.meta?.cajuAutomation?.value || 1500)}</b></div><div class="card-kpi"><small>Automação</small><b>Ativa · dia 01</b></div>`;
    table.innerHTML = expenses.length ? expenses.map((item) => `<tr><td>${String(item.date).split('-').reverse().join('/')}</td><td>${item.desc}</td><td>Alimentação</td><td class="down">-${brl(Math.abs(item.value))}</td><td>—</td></tr>`).join('') : '<tr><td colspan="5">Nenhuma movimentação Caju neste mês.</td></tr>';
  }
  function render() {
    const store = state(); const panel = ensurePanel(); if (!store || !panel) return;
    const key = month(); const hidden = localStorage.getItem(HIDDEN_KEY) === '1'; const box = panel.querySelector('#quickFinancialCards'); const toggle = panel.querySelector('#v10ToggleFinancialCards');
    panel.classList.toggle('cards-hidden', hidden); toggle.textContent = hidden ? 'Mostrar cartões' : 'Ocultar cartões';
    const c6 = (store.accounts || []).find((item) => item.id === 'acc_c6'); const card = (store.cards || []).find((item) => item.id === 'card_caju_alimentacao');
    const cajuBalance = cajuBalanceAt(store, key); const spent = cajuSpent(store, key); const base = Number(store.meta?.cajuOpeningCredit || card?.limit || 0); const percent = base ? Math.max(0, Math.min(100, cajuBalance / base * 100)) : 0;
    box.innerHTML = `<button type="button" class="v10-bank-card c6" data-v10-route="accounts"><span class="brand-mark">C6 BANK</span><small>Conta corrente</small><b>${brl(c6?.balance)}</b><em>Saldo disponível</em></button><button type="button" class="v10-bank-card caju" data-v10-route="cards"><span class="brand-mark">caju</span><small>Alimentação · benefício</small><b>${brl(cajuBalance)}</b><em>Gasto em ${key}: ${brl(spent)}</em><i><u style="width:${percent}%"></u></i></button>`;
    renderDetails(store, key);
  }
  function install() { render(); document.addEventListener('v10-month-changed', render); document.addEventListener('finance-store-changed', render); document.addEventListener('v10-render-complete', render); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
  window.FinancialCardsV10 = { render, cajuBalanceAt, cajuSpent };
})();
