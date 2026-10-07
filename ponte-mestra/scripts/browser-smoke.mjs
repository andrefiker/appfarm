// Smoke test no Chromium: menu → nível 1 → constrói treliça Warren com o "dedo" (eventos de ponteiro)
// → TESTAR → espera aprovação. Falha se houver erro de console.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(here, '..', 'index.html');
const out = process.argv[2] || path.join(here, '..', 'shots');
const fs = await import('node:fs'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const ctx = await browser.newContext({ viewport: { width: 800, height: 380 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto(url);
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(out, '01-menu.png') });
await page.click('.lvl >> nth=0');
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(out, '02-build-empty.png') });
await page.click('#hintX');
const toS = async (x, y) => page.evaluate(([x, y]) => { const c = window.__PM.G.cam; return [(x - c.x) * c.s + innerWidth / 2, innerHeight / 2 - (y - c.y) * c.s]; }, [x, y]);
async function drag(x1, y1, x2, y2) {
  const [a, b] = await toS(x1, y1), [c, d] = await toS(x2, y2);
  await page.mouse.move(a, b); await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(a + (c - a) * i / 6, b + (d - b) * i / 6);
  await page.mouse.up(); await page.waitForTimeout(30);
}
await page.click('.mat[data-mat=pista]');
for (let x = 0; x < 10; x += 2) await drag(x, 0, x + 2, 0);
await page.click('.mat[data-mat=madeira]');
const top = [1, 3, 5, 7, 9];
for (const x of top) { await drag(x - 1, 0, x, 2); await drag(x, 2, x + 1, 0); }
for (let i = 0; i < top.length - 1; i++) await drag(top[i], 2, top[i + 1], 2);
await page.waitForTimeout(250);
const info = await page.evaluate(() => ({ members: window.__PM.G.br.members.length, budget: document.querySelector('#budget .txt').textContent, chips: document.getElementById('chips').textContent }));
console.log('construído:', info);
await page.screenshot({ path: path.join(out, '03-build-truss.png') });
await page.click('#btnTest');
await page.waitForTimeout(1600);
await page.screenshot({ path: path.join(out, '04-test-running.png') });
await page.waitForSelector('#modal:not(.hidden)', { timeout: 30000 });
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(out, '05-result.png') });
const res = await page.evaluate(() => ({ title: document.querySelector('#modal h2').textContent, stars: document.querySelector('#modal .stars').textContent, saved: JSON.parse(localStorage.getItem('ponteMestra.v1')).stars }));
console.log('resultado:', res);
// navegação extra: ajuda, sandbox, editor oculto
await page.click('#rEdit'); await page.click('#btnHelp'); await page.waitForTimeout(150);
await page.screenshot({ path: path.join(out, '06-help.png') });
await page.click('#hClose'); await page.click('#btnBack'); await page.waitForTimeout(150);
await page.click('#btnSandbox'); await page.waitForTimeout(200);
await page.screenshot({ path: path.join(out, '07-sandbox.png') });
await page.click('#btnBack');
const t = await page.$('#title'); const bb = await t.boundingBox();
await page.mouse.move(bb.x + 20, bb.y + 10); await page.mouse.down(); await page.waitForTimeout(1100); await page.mouse.up();
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(out, '08-editor.png') });
const ed = await page.evaluate(() => !document.getElementById('editorPanel').classList.contains('hidden'));
console.log('editor aberto:', ed);
// estado de nível com água/barco
await page.evaluate(() => { window.__PM.goMenu(); window.__PM.startLevel(15); });
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(out, '09-level15.png') });
await page.evaluate(() => { window.__PM.goMenu(); window.__PM.startLevel(22); });
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(out, '10-level22.png') });
console.log('erros de console:', errors.length ? errors : 'nenhum');
await browser.close();
if (errors.length || res.title !== 'Ponte aprovada!' || !ed) process.exit(1);
