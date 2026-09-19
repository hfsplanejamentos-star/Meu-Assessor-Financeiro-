/* V10 AI gateway — interpretation is server/local; execution is explicit and confirmed. */
(() => {
  'use strict';
  const DEFAULT_ENDPOINT = 'https://effervescent-marlin-88.convex.site/ai/finance';
  const ENDPOINT_KEY = 'assessor_ai_endpoint_v10';
  const endpoint = () => localStorage.getItem(ENDPOINT_KEY) || DEFAULT_ENDPOINT;
  const money = (text) => { const match = String(text).match(/(?:R\$\s*)?([\d.]+(?:,\d{1,2})?)/i); return match ? Number(match[1].replace(/\./g, '').replace(',', '.')) : null; };
  const localContext = () => {
    const state = window.FinanceStoreV10?.get?.(); const month = window.activeMonth || new Date().toISOString().slice(0, 7);
    return { month, summary: window.FinanceEngineV10?.summary?.(state, month), categories: window.FinanceEngineV10?.categoryTotals?.(state, month), dataMode: state?.meta?.dataMode };
  };
  function localInterpret(text) {
    const value = money(text); const income = /recebi|receita|sal[aá]rio|rescis[aã]o|entrou/i.test(text); const expense = /gastei|paguei|comprei|compra|despesa/i.test(text);
    if (value && (income || expense)) return { intent: 'transaction', draft: { date: new Date().toISOString().slice(0, 10), value: income ? Math.abs(value) : -Math.abs(value), cat: income ? 'Receitas' : 'Outros', desc: String(text), status: 'draft' }, mode: 'local' };
    return { intent: 'question', answer: 'Posso analisar seus dados locais ou preparar um lançamento para sua confirmação.', text: String(text), mode: 'local' };
  }
  async function interpret(text) {
    const cleanText = String(text || '').trim(); if (!cleanText) return { intent: 'question', answer: 'Digite uma pergunta ou lançamento.', mode: 'local' };
    try {
      const response = await fetch(endpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: cleanText, context: localContext() }) });
      if (response.ok) return { ...(await response.json()), mode: 'llm' };
    } catch (_) {}
    return localInterpret(cleanText);
  }
  function validateDraft(draft) { return Boolean(draft && /^\d{4}-\d{2}-\d{2}$/.test(draft.date) && Number.isFinite(Number(draft.value)) && Number(draft.value) !== 0 && String(draft.desc || '').trim()); }
  function validateAction(action) { return action?.type === 'create_transaction' ? validateDraft(action.draft || action) : action?.type === 'answer'; }
  function requiresConfirmation(action) { return ['create_transaction', 'update_transaction', 'delete_transaction', 'cloud_push'].includes(String(action?.type || '')); }
  function execute(draft, confirmed = false) {
    if (!confirmed) return { ok: false, requiresConfirmation: true, draft };
    if (!validateDraft(draft)) return { ok: false, error: 'invalid_draft' };
    const transaction = { ...draft, id: draft.id || `ai_${Date.now()}`, status: 'posted', source: 'ai-confirmed' };
    window.FinanceStoreV10.upsertTx(transaction); return { ok: true, transaction };
  }
  function configure(url) { if (!/^https:\/\//.test(String(url || ''))) throw new Error('HTTPS required'); localStorage.setItem(ENDPOINT_KEY, String(url)); return endpoint(); }
  const hasPublicSecret = () => [...document.scripts].some((script) => /sk-[A-Za-z0-9_-]{16,}/.test(script.textContent || ''));
  window.FinanceAIV10 = { interpret, execute, validateDraft, validateAction, requiresConfirmation, localContext, localInterpret, configure, hasPublicSecret, get endpoint() { return endpoint(); }, publicApiKey: false, backend: true };
})();
