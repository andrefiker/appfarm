const CACHE = "quiet-mines-v2";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/mine.svg",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE);
      const html = await (await fetch("./index.html")).text();
      const assets = [
        ...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g),
      ].map((match) => match[1]);
      await cache.addAll(assets);
      self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches
                .open(CACHE)
                .then((cache) => cache.put(event.request, copy));
            }
            return response;
          })
          .catch(() => caches.match("./index.html")),
    ),
  );
});
