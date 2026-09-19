/* V10 production entrypoint — one ordered ES module graph. */
import './finance-store.js';
import './finance-engine.js';
import './cloud-sync.js';
import './ai-gateway.js';
import './mobile-theme.js';
import './mobile-dashboard.js';
import './render-controller.js';
import './month-sync.js';
import './runtime-ui.js';
import './experience.js';
import './finance-tests.js';
import './ai-tests.js';
import './diagnostics.js';
import './health.js';
import './test-21-30.js';
import './tests.js';
import './acceptance-40-50.js';
import './master-acceptance.js';

export const version = '10.0.0';
export const release = 'v10-consolidacao';
export function runAcceptance() { return window.V10MasterAcceptance?.run?.(); }
window.V10App = { version, release, runAcceptance };
window.dispatchEvent(new CustomEvent('v10-app-ready', { detail: { version, release } }));
