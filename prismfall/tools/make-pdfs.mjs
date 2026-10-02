// Renders docs/src/*.html to PDFs in docs/ with headless Chromium.
// Usage: node tools/make-pdfs.mjs [name ...]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['design-brief', 'playtest-report'];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const n of names) {
  const src = path.join(root, 'docs', 'src', n + '.html');
  if (!fs.existsSync(src)) { console.log('skip', n); continue; }
  await page.goto('file://' + src);
  await page.waitForTimeout(300);
  const out = path.join(root, 'docs', 'Prismfall-' + n.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('-') + '.pdf');
  await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
  console.log(out, fs.statSync(out).size);
}
await browser.close();
