const C='assessor-atual-20260920-r122-mobile-account-stack';
const A=['./index.html','./atual.html','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==C)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 const live=e.request.mode==='navigate'||u.pathname.endsWith('.js')||u.pathname.endsWith('.css')||u.pathname.endsWith('.html');
 if(live){e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok)caches.open(C).then(x=>x.put(e.request,r.clone()));return r}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(x=>x||caches.match('./index.html'))));return}
 e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(c=>c||fetch(e.request).then(r=>{if(r.ok)caches.open(C).then(x=>x.put(e.request,r.clone()));return r})));
});
