import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, ".."),
  out = path.join(root, "dist");
fs.mkdirSync(out, { recursive: true });
const modules = [
  "weapons",
  "terrain",
  "physics",
  "challenges",
  "ai",
  "game",
  "storage",
  "audio",
  "render",
  "main",
];
let code =
  '/* TRAJECTORY 1.0.0 • self-contained offline production bundle */\n(()=>{\n"use strict";\n';
for (const name of modules) {
  let s = fs.readFileSync(path.join(root, "web/src", name + ".js"), "utf8");
  s = s.replace(/^import[\s\S]*?;\s*$/gm, "").replace(/^export /gm, "");
  code += "\n// " + name + "\n" + s + "\n";
}
code += "})();\n";
fs.writeFileSync(path.join(out, "game.js"), code);
fs.copyFileSync(path.join(root, "web/style.css"), path.join(out, "style.css"));
let html = fs
  .readFileSync(path.join(root, "web/index.html"), "utf8")
  .replace(/type="module"\s+src="src\/main.js"/, 'defer src="game.js"');
fs.writeFileSync(path.join(out, "index.html"), html);
for (const [name, data] of [
  ["game.js", code],
  ["index.html", html],
])
  if (/https?:\/\/|localhost|127\.0\.0\.1/.test(data))
    throw Error("Remote reference in " + name);
console.log(
  "Offline production bundle:",
  fs.readdirSync(out).join(", "),
  "(" + Buffer.byteLength(code) + " bytes JS)",
);
