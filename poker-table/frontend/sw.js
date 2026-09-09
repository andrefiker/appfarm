// AppDeploy emits frontend/public/sw.js at /sw.js. This mirror keeps local
// static consumers on the same cache policy.
const CACHE = 'poker-static-v3';
self.addEventListener('install', (event) => { event.waitUntil(caches.open(CACHE).then((cache) => cache.add('./'))); self.skipWaiting(); });
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => { const request = event.request; const url = new URL(request.url); if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return; event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request).then(async (response) => { if (response.ok) (await caches.open(CACHE)).put(request, response.clone()); return response; }))); });
