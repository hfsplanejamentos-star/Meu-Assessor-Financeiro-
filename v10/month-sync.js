/* V10 Item 19 — populated, synchronized month filters. */
(() => {
  'use strict';
  let lock = false;
  const valid = (value) => /^\d{4}-\d{2}$/.test(String(value || ''));
  function monthOptions(start = '2026-09', count = 24) {
    const [year, month] = start.split('-').map(Number); const rows = [];
    for (let index = 0; index < count; index += 1) { const date = new Date(year, month - 1 + index, 1); const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); rows.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) }); }
    return rows;
  }
  function filters() { return [...document.querySelectorAll('.month-filter, #globalMonthFilter, [data-month-scope]')].filter((element, index, all) => element.tagName === 'SELECT' && all.indexOf(element) === index); }
  function ensureOptions(select) {
    const selected = valid(select.value) ? select.value : (valid(window.activeMonth) ? window.activeMonth : '2026-09');
    if (select.options.length < 12) select.innerHTML = monthOptions().map((item) => `<option value="${item.value}">${item.label}</option>`).join('');
    if ([...select.options].some((option) => option.value === selected)) select.value = selected;
    select.disabled = false; select.style.pointerEvents = 'auto';
  }
  function apply(month, source) {
    if (lock || !valid(month)) return false; lock = true;
    try {
      window.activeMonth = month; localStorage.setItem('assessor_active_month', month);
      filters().forEach((select) => { ensureOptions(select); if (select !== source) select.value = month; });
      if (window.monthScopes) Object.keys(window.monthScopes).forEach((key) => { window.monthScopes[key] = month; });
      window.RenderControllerV10?.schedule(`month:${month}`); document.dispatchEvent(new CustomEvent('v10-month-changed', { detail: { month } })); return true;
    } finally { queueMicrotask(() => { lock = false; }); }
  }
  function bind() {
    filters().forEach((select) => { ensureOptions(select); if (select.dataset.v10MonthBound === '1') return; select.dataset.v10MonthBound = '1'; select.addEventListener('change', (event) => apply(event.currentTarget.value, event.currentTarget)); });
    const initial = valid(localStorage.getItem('assessor_active_month')) ? localStorage.getItem('assessor_active_month') : (valid(window.activeMonth) ? window.activeMonth : '2026-09'); apply(initial);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
  document.addEventListener('finance-store-changed', bind);
  window.MonthSyncV10 = { bind, apply, filters, monthOptions, ensureOptions };
})();
