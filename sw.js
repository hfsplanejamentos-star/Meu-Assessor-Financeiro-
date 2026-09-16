const C='assessor-r67-v2';
const A=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./r67-finance-patch.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 if(e.request.mode==='navigate'||u.pathname.endsWith('/index.html')||u.pathname.endsWith('/Meu-Assessor-Financeiro-/')){
  e.respondWith(fetch(e.request).then(async r=>{
   const html=await r.text();
   const patched=html.includes('r67-finance-patch.js')?html:html.replace('</body>','<script src="./r67-finance-patch.js?v=2"></script></body>');
   return new Response(patched,{status:r.status,statusText:r.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
  }).catch(async()=>{
   const r=await caches.match('./index.html');if(!r)return Response.error();
   const html=await r.text();
   return new Response(html.replace('</body>','<script src="./r67-finance-patch.js?v=2"></script></body>'),{headers:{'Content-Type':'text/html; charset=utf-8'}});
  }));return;
 }
 e.respondWith(fetch(e.request).then(r=>{const x=r.clone();caches.open(C).then(c=>c.put(e.request,x));return r}).catch(()=>caches.match(e.request)));
});