import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const target = resolve(root, "android/app/src/main/assets/quiet-video-poker.html");
let html = await readFile(resolve(dist, "index.html"), "utf8");
const css = await readFile(resolve(dist, "src/style.css"), "utf8");
let engine = await readFile(resolve(dist, "src/engine.js"), "utf8");
let main = await readFile(resolve(dist, "src/main.js"), "utf8");

engine = engine.replace(/^export\s+/gm, "");
main = main.replace(/^import\s+\{[^}]+\}\s+from\s+["']\.\/engine\.js["'];\s*/m, "");
main = main.replace(/^if \(["']serviceWorker["'] in navigator\).*\n?/m, "");
html = html.replace(/\s*<link rel="manifest"[^>]*>/, "")
  .replace(/\s*<link rel="icon"[^>]*>/, "")
  .replace(/\s*<link rel="stylesheet" href="\/src\/style\.css"\s*\/>/, `<style>\n${css}\n</style>`)
  .replace(/\s*<script type="module" src="\/src\/main\.js"><\/script>/, `<script>\n${engine}\n${main}\n</script>`);

if (/<(?:script type="module"|link rel="manifest"|link rel="stylesheet"|link rel="icon")/.test(html)) {
  throw new Error("Android bundle still contains an external asset or module reference.");
}
await mkdir(resolve(root, "android/app/src/main/assets"), { recursive: true });
await writeFile(target, html, "utf8");
console.log(`Created offline single-file Android content: ${target}`);
