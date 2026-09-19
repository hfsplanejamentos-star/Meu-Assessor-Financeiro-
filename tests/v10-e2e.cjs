const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const url = process.env.V10_URL || 'http://127.0.0.1:4173/index.html';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];
  const evidence = { url, desktop: {}, mobile: {}, gate: null };
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  desktop.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  desktop.on('pageerror', (error) => consoleErrors.push(error.message));
  await desktop.goto(url, { waitUntil: 'networkidle' }); await desktop.waitForTimeout(1200);
  evidence.gate = await desktop.evaluate(() => window.V10MasterAcceptance.run());
  assert.equal(evidence.gate.passed, 50); assert.equal(evidence.gate.ok, true);
  evidence.desktop = await desktop.evaluate(() => ({ sidebar: getComputedStyle(document.getElementById('sidebar')).position, bottomNav: getComputedStyle(document.getElementById('v10BottomNav')).display, cards: document.querySelectorAll('#kpis [data-v10-route]').length, financialCards: document.querySelectorAll('#quickFinancialCards .v10-bank-card').length, caju: { balance: FinancialCardsV10.cajuBalanceAt(FinanceStoreV10.get(), '2026-09'), spent: FinancialCardsV10.cajuSpent(FinanceStoreV10.get(), '2026-09'), expenses: FinanceStoreV10.get().transactions.filter((item) => item.cardId === 'card_caju_alimentacao' && item.value < 0).length }, monthFilters: window.MonthSyncV10.filters().length, agenda: window.ExperienceV10.agendaEvents('2026-10').length, reconciliation: Array.isArray(window.ExperienceV10.reconcile('2026-09').cases), data: { c6: FinanceStoreV10.get().accounts.find((item) => item.id === 'acc_c6')?.balance, severance: FinanceStoreV10.get().transactions.find((item) => item.id === 'real_rescisao_20260918')?.value } }));
  assert.equal(evidence.desktop.bottomNav, 'none'); assert.ok(evidence.desktop.cards >= 4); assert.equal(evidence.desktop.financialCards, 2); assert.equal(evidence.desktop.caju.balance, 803.95); assert.equal(evidence.desktop.caju.spent, 202.94); assert.equal(evidence.desktop.caju.expenses, 6); assert.ok(evidence.desktop.monthFilters >= 2); assert.ok(evidence.desktop.agenda > 0); assert.equal(evidence.desktop.data.c6, 1103.67); assert.equal(evidence.desktop.data.severance, 1069.36);
  await desktop.locator('#v10ToggleFinancialCards').click(); assert.equal(await desktop.locator('#v10FinancialCardsPanel').evaluate((el) => el.classList.contains('cards-hidden')), true); await desktop.locator('#v10ToggleFinancialCards').click();
  await desktop.selectOption('#globalMonthFilter', '2026-11'); await desktop.waitForTimeout(100);
  assert.equal(await desktop.evaluate(() => window.activeMonth), '2026-11');
  await desktop.locator('#kpis [data-v10-route="transactions"]').first().click(); assert.equal(await desktop.locator('#view-transactions').evaluate((el) => el.classList.contains('active')), true);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  mobile.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); }); mobile.on('pageerror', (error) => consoleErrors.push(error.message));
  await mobile.goto(url, { waitUntil: 'networkidle' }); await mobile.waitForTimeout(800);
  for (const theme of ['current', 'dark', 'light']) { await mobile.locator(`[data-v10-theme="${theme}"]`).click(); assert.equal(await mobile.getAttribute('html', 'data-mobile-theme'), theme); }
  evidence.mobile = await mobile.evaluate(() => ({ columns: getComputedStyle(document.getElementById('kpis')).gridTemplateColumns.split(' ').length, financialColumns: getComputedStyle(document.getElementById('quickFinancialCards')).gridTemplateColumns.split(' ').length, bottomNav: getComputedStyle(document.getElementById('v10BottomNav')).display, themes: document.querySelectorAll('[data-v10-theme]').length, navItems: document.querySelectorAll('#v10BottomNav button').length, overflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth }));
  assert.equal(evidence.mobile.columns, 2); assert.equal(evidence.mobile.financialColumns, 1); assert.equal(evidence.mobile.bottomNav, 'grid'); assert.equal(evidence.mobile.themes, 3); assert.equal(evidence.mobile.navItems, 5); assert.equal(evidence.mobile.overflow, true);
  await mobile.locator('#v10BottomNav [data-mobile-route="transactions"]').click(); assert.equal(await mobile.locator('#view-transactions').evaluate((el) => el.classList.contains('active')), true);
  assert.deepEqual(consoleErrors, []); evidence.consoleErrors = consoleErrors; evidence.ok = true;
  console.log(JSON.stringify(evidence, null, 2)); await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
