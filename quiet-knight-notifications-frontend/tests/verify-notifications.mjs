import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const [app, ui, hook, worker] = await Promise.all([
  readFile(new URL("../src/GameApp.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/chess-ui.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/push-notifications.ts", import.meta.url), "utf8"),
  readFile(new URL("../dist/sw.js", import.meta.url), "utf8"),
]);

assert.ok(hook.includes("Notification.requestPermission()"));
assert.equal((hook.match(/Notification\.requestPermission\(\)/g) || []).length, 1);
assert.ok(hook.indexOf("Notification.requestPermission()") > hook.indexOf("const enable"));
assert.ok(app.includes("Enable move notifications"));
assert.ok(app.includes("Quiet Knight can tell you when your opponent moves while the table is"));
assert.ok(app.includes("Your opponent nudged you."));
assert.ok(app.includes("Delivered at table."));
assert.ok(app.includes("Notification sent."));
assert.ok(app.includes("They haven't enabled notifications."));
assert.ok(!app.includes('data?.message || "Nudge sent."'));
assert.ok(app.includes("room.turn !== me"));
assert.ok(hook.includes("(!ios() || standalone())"));
assert.ok(hook.includes("Add Quiet Knight to your Home Screen to receive move notifications."));
assert.ok(ui.includes("{p.canNudge ?"));
assert.ok(worker.includes("assets/computer-worker-"));
assert.ok(!worker.includes("__QK_"));

const handlers = new Map();
const cacheStores = new Map();
const notifications = [];
const posted = [];
let clients = [];
let opened = null;
const caches = {
  async open(name) {
    if (!cacheStores.has(name)) cacheStores.set(name, new Map());
    const store = cacheStores.get(name);
    return {
      async match(key) {
        return store.get(String(key));
      },
      async put(key, value) {
        store.set(String(key), value);
      },
      async keys() {
        return [...store.keys()].map((url) => new Request(url));
      },
      async delete(key) {
        return store.delete(String(key.url || key));
      },
    };
  },
  async keys() {
    return [...cacheStores.keys()];
  },
  async delete(name) {
    return cacheStores.delete(name);
  },
};
const context = {
  AbortController,
  Response,
  Request,
  URL,
  caches,
  clearTimeout,
  fetch,
  setTimeout,
  self: {
    location: { origin: "https://quiet.example" },
    registration: {
      scope: "https://quiet.example/",
      async showNotification(title, options) {
        notifications.push({ title, options });
      },
    },
    clients: {
      async matchAll() {
        return clients;
      },
      async claim() {},
      async openWindow(url) {
        opened = url;
      },
    },
    addEventListener(type, handler) {
      handlers.set(type, handler);
    },
    async skipWaiting() {},
  },
};
vm.runInNewContext(worker, context);

async function dispatch(type, event) {
  let pending = Promise.resolve();
  handlers.get(type)({
    ...event,
    waitUntil(value) {
      pending = Promise.resolve(value);
    },
  });
  await pending;
}

clients = [
  {
    url: "https://quiet.example/?room=TABLE1",
    visibilityState: "visible",
    postMessage(message) {
      posted.push(message);
    },
  },
];
await dispatch("push", {
  data: {
    json: () => ({
      kind: "move",
      eventId: "move:TABLE1:1:3:1",
      roomCode: "TABLE1",
      body: "Paloma moved. Your turn.",
    }),
  },
});
assert.equal(posted.length, 1);
assert.equal(notifications.length, 0);

clients = [];
await dispatch("push", {
  data: {
    json: () => ({
      kind: "move",
      eventId: "move:TABLE1:1:4:2",
      roomCode: "TABLE1",
      body: "Paloma moved. Your turn.",
    }),
  },
});
assert.equal(notifications.length, 1);
assert.equal(notifications[0].title, "Quiet Knight");
assert.equal(notifications[0].options.body, "Paloma moved. Your turn.");

await dispatch("push", {
  data: {
    json: () => ({
      kind: "move",
      eventId: "move:TABLE1:1:4:2",
      roomCode: "TABLE1",
    }),
  },
});
assert.equal(notifications.length, 1);

await dispatch("notificationclick", {
  notification: {
    data: { roomCode: "TABLE1" },
    close() {},
  },
});
assert.equal(opened, "https://quiet.example/?room=TABLE1");
assert.ok(!/[?&](?:seat|token|key)=/i.test(opened));

let responded = false;
handlers.get("fetch")({
  request: new Request("https://quiet.example/api/push/public-key"),
  respondWith() {
    responded = true;
  },
});
assert.equal(responded, false);

console.log(
  JSON.stringify({
    event: "frontend.notification.acceptance",
    passed: true,
    checks: [
      "explicit permission action",
      "candidate controls",
      "nudge visibility source",
      "computer worker precached",
      "foreground OS suppression",
      "background notification",
      "push deduplication",
      "safe notification click",
      "API cache bypass",
    ],
  }),
);
