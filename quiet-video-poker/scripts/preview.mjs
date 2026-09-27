import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, join, extname } from "node:path";

const root = resolve(import.meta.dirname, "../dist");
const port = Number(process.env.PORT ?? 4173);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let file = resolve(join(root, pathname === "/" ? "index.html" : pathname.slice(1)));
    if (!file.startsWith(root)) { res.writeHead(403).end("Forbidden"); return; }
    try { if ((await stat(file)).isDirectory()) file = join(file, "index.html"); }
    catch { if (!extname(file)) file = join(root, "index.html"); }
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream", "cache-control": /index\.html|sw\.js$/.test(file) ? "no-cache" : "public, max-age=31536000, immutable" });
    res.end(await readFile(file));
  } catch { res.writeHead(404).end("Not found"); }
});
server.listen(port, "0.0.0.0", () => console.log(`Quiet Video Poker preview: http://localhost:${port}`));
