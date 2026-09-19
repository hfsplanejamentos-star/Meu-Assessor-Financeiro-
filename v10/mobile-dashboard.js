/* V10 Mobile Dashboard — navigation only; RuntimeUI remains the sole renderer. */
(() => {
  'use strict';
  function route(name) {
    if (name === 'reports') { window.RuntimeUIV10?.go?.('overview'); requestAnimationFrame(() => document.getElementById('projectionChart')?.scrollIntoView({ behavior: 'smooth', block: 'center' })); return true; }
    return window.RuntimeUIV10?.go?.(name) ?? false;
  }
  function activate(name) { document.querySelectorAll('#v10BottomNav button').forEach((button) => button.classList.toggle('active', button.dataset.mobileRoute === name)); }
  function mountNav() {
    if (document.getElementById('v10BottomNav')) return;
    const nav = document.createElement('nav'); nav.id = 'v10BottomNav'; nav.className = 'v10-bottom-nav'; nav.setAttribute('aria-label', 'Navegação principal móvel');
    [['overview', 'Visão Geral', '⌂'], ['transactions', 'Transações', '⇄'], ['add', 'Adicionar', '+'], ['reports', 'Relatórios', '▥'], ['more', 'Mais', '☰']].forEach(([name, label, icon]) => {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.mobileRoute = name; button.setAttribute('aria-label', label); button.innerHTML = `<b>${icon}</b><span>${label}</span>`;
      button.onclick = () => { if (name === 'add') document.querySelector('.fab-main')?.click(); else if (name === 'more') document.getElementById('menuBtn')?.click(); else route(name); activate(name); };
      nav.appendChild(button);
    });
    document.body.appendChild(nav); activate('overview');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountNav); else mountNav();
  window.MobileDashboardV10 = { mountNav, route, activate };
})();
