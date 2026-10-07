// Roda níveis com eventos no navegador usando as pontes de referência (tests/solutions.json)
// e mede o custo de simulação por quadro.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(here, '..', 'index.html');
const sols = JSON.parse(fs.readFileSync(path.join(here, '..', 'tests', 'solutions.json'), 'utf8'));
const out = process.argv[2] || path.join(here, '..', 'shots'); fs.mkdirSync(out, { recursive: true });
const ids = (process.argv[3] || '15,22,23,30,40').split(',').map(Number);
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 860, height: 400 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto(url);
let bad = 0;
for (const id of ids) {
  await page.evaluate(([id, br]) => { const P = window.__PM; P.Store.data.bridges[id] = br; P.goMenu(); P.startLevel(id); }, [id, sols[id].bridge]);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, `L${id}-build.png`) });
  // mede custo de um tick de simulação
  const ms = await page.evaluate(() => {
    const lv = window.__PM.G.lv, br = window.__PM.G.br;
    const S = createWorld(lv, br); let t0 = performance.now(), n = 0;
    while (S.t < 16 && S.state === 'run') { stepWorld(S, CFG.SUB); n++; }
    const pv0 = performance.now(); stressPreview(lv, br); const pv = performance.now() - pv0;
    return { tick: (performance.now() - t0 - 0) / n, preview: pv };
  });
  await page.click('#btnTest');
  await page.waitForTimeout(id === 15 || id === 40 ? 5200 : 2500);
  await page.screenshot({ path: path.join(out, `L${id}-test.png`) });
  await page.waitForSelector('#modal:not(.hidden)', { timeout: 60000 });
  const title = await page.evaluate(() => document.querySelector('#modal h2').textContent + ' ' + (document.querySelector('#modal .stars') || {}).textContent);
  console.log(`L${id}: ${title} | sim ${ms.tick.toFixed(2)} ms/quadro | preview ${ms.preview.toFixed(1)} ms`);
  if (!title.startsWith('Ponte aprovada')) bad++;
  await page.screenshot({ path: path.join(out, `L${id}-result.png`) });
  await page.click('#rEdit');
}
console.log('erros de console:', errors.length ? errors : 'nenhum');
await browser.close();
process.exit(errors.length || bad ? 1 : 0);
