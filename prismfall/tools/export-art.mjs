// Renders the procedural art (assets/art.js) to PNG files in assets/sprites/.
// Usage: node tools/export-art.mjs
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets', 'sprites');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');
await page.addScriptTag({ path: path.join(root, 'assets', 'art.js') });
const files = await page.evaluate(() => {
  const res = {};
  for (const t of PFArt.THEMES) res['sheet-' + t.id + '.png'] = PFArt.buildSheet(t.id, 64).toDataURL('image/png');
  for (const px of [16, 32, 48, 64, 128, 256]) res['icon-' + px + '.png'] = PFArt.buildIcon(px).toDataURL('image/png');
  for (const [d, px] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) res['../../android/res/mipmap-' + d + '/ic_launcher.png'] = PFArt.buildIcon(px).toDataURL('image/png');
  const g = document.createElement('canvas'); g.width = g.height = 64; PFArt.drawGem(g.getContext('2d'), 64); res['gem.png'] = g.toDataURL();
  return res;
});
const manifest = [];
for (const [name, url] of Object.entries(files)) {
  const buf = Buffer.from(url.split(',')[1], 'base64');
  fs.mkdirSync(path.dirname(path.join(out, name)), { recursive: true });
  fs.writeFileSync(path.join(out, name), buf);
  manifest.push({ file: path.relative(root, path.join(out, name)), bytes: buf.length });
}
fs.writeFileSync(path.join(out, 'files.json'), JSON.stringify(manifest, null, 2));
console.log(manifest.map((m) => m.file + ' ' + m.bytes).join('\n'));
await browser.close();
