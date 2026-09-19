const CACHE = 'assessor-v10-production-10.0.0';
const ASSETS = [
  './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './v10/app.mjs', './v10/finance-store.js', './v10/finance-engine.js', './v10/cloud-sync.js',
  './v10/ai-gateway.js', './v10/mobile-themes.css', './v10/mobile-theme.js',
  './v10/mobile-dashboard.css', './v10/mobile-dashboard.js', './v10/render-controller.js',
  './v10/month-sync.js', './v10/runtime-ui.js', './v10/experience.js', './v10/finance-tests.js',
  './v10/ai-tests.js', './v10/diagnostics.js', './v10/health.js', './v10/test-21-30.js',
  './v10/tests.js', './v10/acceptance-40-50.js', './v10/master-acceptance.js',
];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', (event) => event.waitUntil((async () => { for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key); await self.clients.claim(); })()));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') { event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match('./index.html'))); return; }
  event.respondWith(caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || fetch(event.request).then((response) => { if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())); return response; })));
});
