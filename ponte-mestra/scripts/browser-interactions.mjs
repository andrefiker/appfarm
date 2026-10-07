// Testa interações de toque com PointerEvents sintéticos (pointerType "touch").
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 820, height: 390 }, hasTouch: true, isMobile: true })).newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto('file://' + path.join(here, '..', 'index.html'));
await page.evaluate(() => { localStorage.clear(); window.__PM.startLevel(1); document.getElementById('hint').classList.add('hidden'); });
await page.waitForTimeout(100);
// helpers no contexto da página
await page.evaluate(() => {
  const cv = document.getElementById('cv');
  window.__T = {
    s(x, y) { const c = window.__PM.G.cam; return [(x - c.x) * c.s + innerWidth / 2, innerHeight / 2 - (y - c.y) * c.s]; },
    ev(type, id, x, y) { cv.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: id === 1 })); },
    async drag(a, b, id = 1) { const [x0, y0] = this.s(...a), [x1, y1] = this.s(...b); this.ev('pointerdown', id, x0, y0); for (let i = 1; i <= 5; i++) this.ev('pointermove', id, x0 + (x1 - x0) * i / 5, y0 + (y1 - y0) * i / 5); this.ev('pointerup', id, x1, y1); },
    tapW(p) { const [x, y] = this.s(...p); this.ev('pointerdown', 1, x, y); this.ev('pointerup', 1, x, y); },
    B() { return window.__PM.G.br; }
  };
});
const r = {};
await page.evaluate(() => { for (let x = 0; x < 10; x += 2) __T.drag([x, 0], [x + 2, 0]); });
r.deck = await page.evaluate(() => __T.B().members.length);
// toque-toque: toca junta (4,0), toca destino (5,2)
await page.click('.mat[data-mat=madeira]');
await page.evaluate(() => { __T.tapW([4, 0]); __T.tapW([5, 2]); });
r.tapTap = await page.evaluate(() => __T.B().members.length);
// pressionar e segurar a junta (4,0) => solda
await page.evaluate(() => { const [x, y] = __T.s(4, 0); __T.ev('pointerdown', 1, x, y); });
await page.waitForTimeout(650);
await page.evaluate(() => { const [x, y] = __T.s(4, 0); __T.ev('pointerup', 1, x, y); });
r.weld = await page.evaluate(() => { const j = __T.B().joints.find(j => j.x === 4 && j.y === 0); return !!__T.B().weld[j.id]; });
// espelho: constrói (1,0)->(1,2)?? usa (2,0)->(3,2) com espelho => cria também (8,0)->(7,2)
await page.click('#tMirror');
await page.evaluate(() => __T.drag([2, 0], [3, 2]));
r.mirror = await page.evaluate(() => { const B = __T.B(); return !!B.joints.find(j => j.x === 7 && j.y === 2); });
await page.click('#tMirror');
// selecionar: arrasta junta (5,2) para (5,3)
await page.click('#tSel');
await page.evaluate(() => __T.drag([5, 2], [5, 3]));
r.move = await page.evaluate(() => !!__T.B().joints.find(j => j.x === 5 && j.y === 3));
// seleção em caixa ao redor de (5,3) e (3,2), copiar e colar
await page.evaluate(() => __T.drag([2.4, 3.6], [5.6, 1.4]));
r.boxSel = await page.evaluate(() => window.__PM.G.sel.size);
await page.click('#sCopy'); const before = await page.evaluate(() => __T.B().members.length);
await page.click('#sPaste');
r.paste = (await page.evaluate(() => __T.B().members.length)) - before;
// desfazer / refazer
await page.click('#tUndo'); r.undo = await page.evaluate(() => __T.B().members.length) === before;
await page.click('#tRedo'); r.redo = await page.evaluate(() => __T.B().members.length) > before;
// apagar arrastando sobre um membro de pista
await page.click('#tErase');
const m0 = await page.evaluate(() => __T.B().members.length);
await page.evaluate(() => __T.drag([0.6, 0.2], [1.4, -0.2]));
r.erase = m0 - await page.evaluate(() => __T.B().members.length);
const m1 = await page.evaluate(() => __T.B().members.length);
await page.evaluate(() => __T.tapW([4, 0]));
r.tapEraseJoint = m1 - await page.evaluate(() => __T.B().members.length);
// pinça para zoom
const s0 = await page.evaluate(() => window.__PM.G.cam.s);
await page.evaluate(() => { const cx = innerWidth / 2, cy = innerHeight / 2; __T.ev('pointerdown', 1, cx - 40, cy); __T.ev('pointerdown', 2, cx + 40, cy); for (let i = 1; i <= 5; i++) { __T.ev('pointermove', 1, cx - 40 - i * 15, cy); __T.ev('pointermove', 2, cx + 40 + i * 15, cy); } __T.ev('pointerup', 1, cx - 115, cy); __T.ev('pointerup', 2, cx + 115, cy); });
r.pinch = (await page.evaluate(() => window.__PM.G.cam.s)) / s0;
// a ponte é salva no localStorage
r.saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ponteMestra.v1')).bridges[1].members.length === window.__PM.G.br.members.length);
// limpar (com confirmação)
await page.click('#tClear'); await page.click('#cYes');
r.clear = await page.evaluate(() => __T.B().members.length === 0);
console.log(r);
console.log('erros de console:', errors.length ? errors : 'nenhum');
await browser.close();
const ok = r.deck === 5 && r.tapTap === 6 && r.weld && r.mirror && r.move && r.boxSel >= 2 && r.paste > 0 && r.undo && r.redo && r.erase >= 1 && r.tapEraseJoint >= 2 && r.pinch > 1.5 && r.saved && r.clear && !errors.length;
process.exit(ok ? 0 : 1);
