/* V10 internal health diagnostics. */
(() => {
  'use strict';
  function audit() {
    const state = window.FinanceStoreV10?.get?.(); const issues = []; const require = (ok, message) => { if (!ok) issues.push(message); };
    require(Boolean(state), 'Store indisponível'); require(state?.meta?.environment === 'production' && state?.meta?.dataMode === 'real', 'Modo real inválido');
    ['FinanceEngineV10', 'RenderControllerV10', 'RuntimeUIV10', 'MobileThemeV10', 'MobileDashboardV10', 'ExperienceV10', 'FinanceAIV10', 'CloudSyncV10'].forEach((name) => require(Boolean(window[name]), `${name} indisponível`));
    if (state) {
      require(state.meta?.realDataProtected === true, 'Proteção de dados reais inativa');
      require(state.transactions.some((item) => item.id === 'real_rescisao_20260918' && Math.abs(Number(item.value) - 1069.36) < 0.02), 'Rescisão real ausente/alterada');
      require(Math.abs(Number(state.accounts.find((item) => item.id === 'acc_c6')?.balance) - 1103.67) < 0.02, 'Saldo C6 real ausente/alterado');
      const investments = state.transactions.filter((item) => item.transfer && item.destAccountId === 'acc_invest_plan'); const months = new Set(investments.map((item) => String(item.date).slice(0, 7)));
      require(investments.length === 9 && months.size === 9, 'Aportes duplicados/incompletos'); require(state.cards.find((item) => item.id === 'card_caju_alimentacao')?.excludeFromPatrimony === true, 'Caju incluído no patrimônio');
    }
    const tests = window.FinanceTestsV10?.run?.(); require(tests?.ok === true, 'Regressão financeira falhou');
    const output = { ok: issues.length === 0, issues, tests, at: new Date().toISOString() }; window.__V10_HEALTH__ = output; return output;
  }
  window.HealthV10 = { audit };
})();
