/* V10 Cloud adapter — optimistic revisions, explicit conflicts, local real-data protection. */
(() => {
  'use strict';
  const API = 'https://effervescent-marlin-88.convex.site/finance/state';
  const KEY = 'assessor_cloud_sync_key'; const VERSION = 'assessor_v10_cloud_version'; const DEVICE = 'assessor_v10_device';
  const deviceId = localStorage.getItem(DEVICE) || `v10-${crypto.randomUUID()}`; localStorage.setItem(DEVICE, deviceId);
  let busy = false; let lastConflict = null;
  const syncKey = () => localStorage.getItem(KEY) || '';
  async function request(method, body) {
    const response = await fetch(API, { method, headers: { 'Content-Type': 'application/json', 'X-Sync-Key': syncKey() }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.error || 'cloud'); error.status = response.status; error.data = data; throw error; }
    return data;
  }
  function mergePreservingReal(local, remote) {
    const next = window.FinanceStoreV10.clean(remote || {}); const protectedLocal = window.FinanceStoreV10.ensureKnownReal(local || {});
    for (const collection of ['accounts', 'cards', 'transactions', 'recurring']) {
      const rows = [...(next[collection] || [])];
      for (const item of protectedLocal[collection] || []) if (/user-confirmed|user-approved|Caju/i.test([item.source, item.origin].join(' ')) && !rows.some((row) => row.id === item.id)) rows.push(item);
      next[collection] = rows;
    }
    return window.FinanceStoreV10.ensureKnownReal(next);
  }
  async function sync(strategy = 'auto') {
    if (busy || !syncKey()) return { ok: false, reason: 'not_ready' }; busy = true;
    try {
      const response = await request('GET'); const remote = response.state; const localVersion = Number(localStorage.getItem(VERSION) || 0); const local = window.FinanceStoreV10.get();
      if (remote && remote.version > localVersion) {
        if (strategy === 'push') { lastConflict = { local, remote, at: new Date().toISOString() }; return { ok: false, conflict: true, preserved: true, remoteVersion: remote.version }; }
        window.FinanceStoreV10.set(mergePreservingReal(local, remote.payload), 'cloud-pull'); localStorage.setItem(VERSION, String(remote.version));
        return { ok: true, direction: 'pull', version: remote.version };
      }
      const baseVersion = Number(remote?.version || 0); const out = await request('POST', { payload: local, baseVersion, deviceId }); localStorage.setItem(VERSION, String(out.version)); lastConflict = null;
      return { ok: true, direction: 'push', version: out.version };
    } catch (error) {
      if (error.status === 409) lastConflict = { local: window.FinanceStoreV10.get(), remoteVersion: error.data?.version, at: new Date().toISOString() };
      return { ok: false, conflict: error.status === 409, preserved: true, error: error.message };
    } finally { busy = false; }
  }
  function configure(value) { if (String(value || '').trim().length < 12) throw new Error('Chave deve ter pelo menos 12 caracteres'); localStorage.setItem(KEY, String(value).trim()); return sync(); }
  function disconnect() { localStorage.removeItem(KEY); localStorage.removeItem(VERSION); lastConflict = null; }
  window.CloudSyncV10 = { sync, configure, disconnect, configured: () => Boolean(syncKey()), mergePreservingReal, status: () => ({ busy, deviceId, version: Number(localStorage.getItem(VERSION) || 0), conflict: lastConflict }) };
})();
