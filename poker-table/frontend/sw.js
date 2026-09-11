const CACHE = 'poker-hatchable-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('poker-') && key !== CACHE).map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./')));
    return;
  }
  if (url.pathname === '/sw.js' || url.pathname.startsWith('/api/')) return;
  event.respondWith(
    fetch(request).then(async (response) => {
      if (response.ok) await (await caches.open(CACHE)).put(request, response.clone());
      return response;
    }).catch(() => caches.match(request)),
  );
});
