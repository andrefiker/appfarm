const BUILD = "__QK_BUILD__";
const PRECACHE = __QK_PRECACHE__;
const OFFLINE_HTML = __QK_HTML__;
const CACHE = "qk-shell-" + BUILD;
const ROOT = self.registration.scope;
const SHELL = new URL("offline-shell.html", ROOT).href;
const absolute = (path) => new URL(path, ROOT).href;
const isAsset = (url) =>
  url.origin === self.location.origin &&
  url.pathname.startsWith(new URL("assets/", ROOT).pathname) &&
  /\.(js|css|svg|png|webp|woff2?)$/.test(url.pathname);
function valid(response, url) {
  if (!response.ok) return false;
  const type = response.headers.get("Content-Type") || "";
  if (url.endsWith(".js")) return /javascript|ecmascript/.test(type);
  if (url.endsWith(".css")) return type.includes("text/css");
  if (url.endsWith(".html")) return type.includes("text/html");
  return !type.includes("text/html");
}
async function network(input, ms = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        PRECACHE.map(async (path) => {
          const url = absolute(path);
          const response =
            path === "offline-shell.html"
              ? new Response(OFFLINE_HTML, {
                  headers: { "Content-Type": "text/html; charset=utf-8" },
                })
              : await network(url);
          if (!valid(response, url))
            throw new Error("Offline asset unavailable: " + path);
          await cache.put(url, response);
        }),
      );
      await cache.put(absolute("offline-ready"), new Response(BUILD));
      await self.skipWaiting();
    })(),
  ),
);
const MANIFEST = absolute("offline-manifest");
const ownAssets = PRECACHE.map(absolute).filter((path) =>
  isAsset(new URL(path)),
);
async function previousAssets(cache) {
  const manifest = await cache.match(MANIFEST);
  if (manifest)
    try {
      const data = await manifest.json();
      if (Array.isArray(data.current))
        return data.current
          .filter((path) => typeof path === "string" && isAsset(new URL(path)))
          .slice(0, 128);
    } catch {}
  const shell = await cache.match(SHELL, { ignoreVary: true });
  if (!shell) return [];
  const found = new Set(),
    queue = [{ url: SHELL, response: shell }];
  while (queue.length && found.size < 128) {
    const item = queue.shift();
    const text = await item.response.text();
    for (const match of text.matchAll(
      /['"(]([^'"\s()<>]+?\.(?:js|css|svg|png|webp|woff2?)(?:\?[^'"()\s<>]*)?)['")]/g,
    )) {
      let url;
      try {
        url = new URL(match[1], item.url);
      } catch {
        continue;
      }
      if (!isAsset(url) || found.has(url.href)) continue;
      const response = await cache.match(url.href, { ignoreVary: true });
      if (!response || !valid(response, url.href)) continue;
      found.add(url.href);
      if (/\.(js|css)$/.test(url.pathname))
        queue.push({ url: url.href, response });
    }
  }
  return [...found];
}
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      const current = await caches.open(CACHE);
      const oldNames = (await caches.keys()).filter(
        (key) =>
          key !== CACHE && (/^qk-shell-/.test(key) || /^qk-offline-/.test(key)),
      );
      let retained = [];
      const previousName = oldNames[oldNames.length - 1];
      if (previousName) {
        const old = await caches.open(previousName);
        retained = await previousAssets(old);
        for (const url of retained) {
          if (await current.match(url, { ignoreVary: true })) continue;
          const response = await old.match(url, { ignoreVary: true });
          if (response && valid(response, url))
            await current.put(url, response);
        }
      }
      await current.put(
        MANIFEST,
        new Response(
          JSON.stringify({
            build: BUILD,
            current: ownAssets,
            previous: retained,
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
      );
      for (const key of oldNames) await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data?.type !== "QK_OFFLINE_STATUS") return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const marker = Boolean(await cache.match(absolute("offline-ready")));
      const found = await Promise.all(
        PRECACHE.map((path) =>
          cache.match(absolute(path), { ignoreVary: true }),
        ),
      );
      const missing = PRECACHE.filter((path, index) => !found[index]);
      const ready = marker && missing.length === 0;
      event.ports[0]?.postMessage({
        type: "QK_OFFLINE_STATUS",
        ready,
        build: BUILD,
        marker,
        missing,
        expected: PRECACHE.length,
      });
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    /\/api\/|__appdeploy|\/rooms(?:\/|$)/.test(url.pathname)
  )
    return;
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const response = await network(request, 6000);
          if (!response.ok) throw new Error("Navigation unavailable");
          const html = await response.clone().text();
          if (!response.headers.get("Content-Type")?.includes("text/html"))
            throw new Error("Invalid app shell");
          const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
            .map((match) => new URL(match[1], request.url))
            .filter(isAsset);
          if (!assets.some((asset) => asset.pathname.endsWith(".js")))
            throw new Error("Incomplete app shell");
          await Promise.all(
            assets.map(async (asset) => {
              if (await cache.match(asset.href, { ignoreVary: true })) return;
              const assetResponse = await network(asset.href, 6000);
              if (!valid(assetResponse, asset.href))
                throw new Error("Missing app asset");
              await cache.put(asset.href, assetResponse);
            }),
          );
          return response;
        } catch {
          return (
            (await cache.match(SHELL)) ||
            new Response(
              "Connect once to prepare Quiet Knight for offline play.",
              { status: 503, headers: { "Content-Type": "text/plain" } },
            )
          );
        }
      })(),
    );
    return;
  }
  if (isAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request, { ignoreVary: true });
        if (cached && valid(cached, url.href)) return cached;
        const response = await network(request);
        if (valid(response, url.href))
          await cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});

const PUSH_EVENTS = "qk-push-events-v1";
async function firstPush(eventId) {
  const cache = await caches.open(PUSH_EVENTS);
  const key = absolute("push-event/" + encodeURIComponent(eventId));
  if (await cache.match(key)) return false;
  await cache.put(key, new Response(String(Date.now())));
  const keys = await cache.keys();
  for (const old of keys.slice(0, -64)) await cache.delete(old);
  return true;
}
self.addEventListener("push", (event) =>
  event.waitUntil(
    (async () => {
      let data;
      try {
        data = event.data?.json();
      } catch {
        return;
      }
      const roomCode =
        typeof data?.roomCode === "string" &&
        /^[A-Z0-9]{6}$/.test(data.roomCode)
          ? data.roomCode
          : null;
      const eventId =
        typeof data?.eventId === "string" && data.eventId.length <= 160
          ? data.eventId
          : null;
      const kind =
        data?.kind === "move" || data?.kind === "nudge" ? data.kind : null;
      if (!roomCode || !eventId || !kind || !(await firstPush(eventId))) return;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const relevant = windows.filter((client) => {
        try {
          return new URL(client.url).searchParams.get("room") === roomCode;
        } catch {
          return false;
        }
      });
      const visible = relevant.find(
        (client) => client.visibilityState === "visible",
      );
      if (visible) {
        visible.postMessage({
          type: "qk.push.foreground",
          kind,
          roomCode,
          eventId,
        });
        return;
      }
      const body =
        typeof data.body === "string" && data.body.length <= 120
          ? data.body
          : kind === "move"
            ? "Your opponent moved. Your turn."
            : "Your opponent is waiting for your move.";
      await self.registration.showNotification("Quiet Knight", {
        body,
        tag: eventId,
        renotify: false,
        data: { roomCode, eventId, kind },
        icon: absolute("icon.svg"),
        badge: absolute("icon.svg"),
      });
    })(),
  ),
);
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const roomCode = event.notification.data?.roomCode;
      if (typeof roomCode !== "string" || !/^[A-Z0-9]{6}$/.test(roomCode))
        return;
      const target = new URL("./", ROOT);
      target.searchParams.set("room", roomCode);
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find((client) => {
        try {
          return new URL(client.url).searchParams.get("room") === roomCode;
        } catch {
          return false;
        }
      });
      if (existing) {
        await existing.focus();
        existing.postMessage({ type: "qk.notification.opened", roomCode });
        return;
      }
      await self.clients.openWindow(target.href);
    })(),
  );
});
