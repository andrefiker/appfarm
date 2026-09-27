import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";

test("PWA caches the full game shell for offline play", async () => {
  const sw = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  const required = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg", "/src/main.js", "/src/engine.js", "/src/style.css"];
  for (const path of required) assert.ok(sw.includes(`"${path}"`), `service worker must pre-cache ${path}`);
  for (const path of required.slice(1)) {
    const sourcePath = ["/manifest.webmanifest", "/icon.svg"].includes(path) ? `../public${path}` : `..${path}`;
    await access(new URL(sourcePath, import.meta.url));
  }
  assert.match(sw, /self\.addEventListener\("fetch"/);
  const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.display, "standalone");
});
