import { cp, mkdir, rm, copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "dist");
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await copyFile(resolve(root, "index.html"), resolve(out, "index.html"));
await cp(resolve(root, "src"), resolve(out, "src"), { recursive: true });
await cp(resolve(root, "public"), out, { recursive: true });
console.log(`Built Quiet Video Poker in ${out}`);
