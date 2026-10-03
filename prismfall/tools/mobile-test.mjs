// Mobile playtest: emulated phone (touch + coarse pointer) driving Prismfall with real
// touch events dispatched through the Chrome DevTools protocol.
// Usage: node tools/mobile-test.mjs   -> docs/mobile-results.json + docs/screenshots/m*.png
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(root, 'docs', 'screenshots');
const URL = 'file://' + path.join(root, 'index.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { checks: [], runs: [], errors: [], screenshots: [] };
const check = (name, pass, detail) => { out.checks.push({ name, pass: !!pass, detail: String(detail ?? '') }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail != null ? ' — ' + detail : '')); };
async function shot(p, name, caption) { await sleep(400); await p.screenshot({ path: path.join(SHOTS, name + '.png') }); out.screenshots.push({ file: 'docs/screenshots/' + name + '.png', caption }); }

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36' });
const p = await ctx.newPage();
p.on('pageerror', (e) => out.errors.push(e.message));
const cdp = await ctx.newCDPSession(p);
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
async function tap(x, y) { await touch('touchStart', x, y); await sleep(30); await touch('touchEnd'); await sleep(40); }
async function drag(x0, y0, x1, y1, steps, msPer) { await touch('touchStart', x0, y0); for (let i = 1; i <= steps; i++) { await touch('touchMove', x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); if (msPer) await sleep(msPer); } await touch('touchEnd'); await sleep(40); }
const st = () => p.evaluate(() => PF.debug.state());
const lay = () => p.evaluate(() => PF.debug.layout());

await p.goto(URL);
await p.waitForTimeout(600);
await shot(p, 'm01-title-phone', 'Phone (412x915): title screen');
await p.tap('[data-act="play:marathon"]');
await p.waitForTimeout(2000);
let L = await lay();
check('Portrait phone uses the compact layout', L.compact && L.cs >= 24, 'cell=' + L.cs + 'px compact=' + L.compact);
check('Layout fits the phone screen', L.statBox.y >= 0 && L.touchBar.y + L.touchBar.h <= 915 && L.bx >= 0 && L.bx + L.bw <= 412, JSON.stringify({ top: L.statBox.y, bottom: Math.round(L.touchBar.y + L.touchBar.h), bx: L.bx, right: L.bx + L.bw }));
check('Left-handed default puts the side panel and buttons on the left', L.lefty && L.lx < L.bx, 'side x=' + L.lx + ' board x=' + L.bx);
check('Touch buttons are visible during play', await p.evaluate(() => getComputedStyle(document.getElementById('touchbar')).display === 'flex'), '');
await shot(p, 'm02-game-start-phone', 'Phone: first seconds, touch hints, HOLD / BURST / pause buttons (left-handed layout)');

// gestures
let s0 = await st();
const midY = L.by + L.bh * 0.45;
await drag(L.bx + L.bw / 2, midY, L.bx + L.bw / 2 + L.cs * 2.9, midY, 6, 12);
let s1 = await st();
check('Drag right by ~3 cells moves the piece 3 columns', s1.cur && s1.cur.x - s0.cur.x === 3, s0.cur.x + ' -> ' + (s1.cur && s1.cur.x));
await tap(L.bx + L.bw * 0.75, midY);
let s2 = await st();
check('Tap on the right half rotates clockwise', s2.cur && s2.cur.rot === (s1.cur.rot + 1) % 4 || s2.cur.type === 'O', 'rot ' + s1.cur.rot + ' -> ' + s2.cur.rot + ' (' + s2.cur.type + ')');
await tap(L.bx + L.bw * 0.25, midY);
let s3 = await st();
check('Tap on the left half rotates counter-clockwise', s3.cur && s3.cur.rot === s1.cur.rot || s3.cur.type === 'O', 'rot ' + s2.cur.rot + ' -> ' + s3.cur.rot);
const pcs = s3.pieces;
await drag(L.bx + L.bw / 2, L.by + L.cs * 4, L.bx + L.bw / 2, L.by + L.cs * 9, 4, 0);
await sleep(120);
let s4 = await st();
check('Flick down hard-drops the piece', s4.pieces === pcs + 1, 'pieces ' + pcs + ' -> ' + s4.pieces);
await drag(L.bx + L.bw / 2, L.by + L.cs * 12, L.bx + L.bw / 2, L.by + L.cs * 7, 4, 0);
let s5 = await st();
check('Flick up holds the piece', s5.hold === s4.cur.type, 'hold=' + s5.hold + ' was cur=' + s4.cur.type);

// touch bot: rotate by taps, move by drags, drop by flick
const SH = await p.evaluate(() => PF.debug.shapes);
function fits(b, t, r, x, y) { for (const [cx, cy] of SH[t].states[r]) { const X = x + cx, Y = y + cy; if (X < 0 || X >= 10 || Y >= 22) return false; if (Y >= 0 && b[Y][X]) return false; } return true; }
function best(sx) {
  let bm = null;
  for (let r = 0; r < 4; r++) for (let x = -3; x < 11; x++) {
    if (!fits(sx.board, sx.cur.type, r, x, Math.max(0, sx.cur.y - 1))) continue;
    let y = Math.max(0, sx.cur.y - 1); while (fits(sx.board, sx.cur.type, r, x, y + 1)) y++;
    const b = sx.board.map((row) => row.slice()); for (const [cx, cy] of SH[sx.cur.type].states[r]) if (y + cy >= 0) b[y + cy][x + cx] = 1;
    let lines = 0; for (let yy = 21; yy >= 0; yy--) if (b[yy].every((v) => v)) { b.splice(yy, 1); b.unshift(new Array(10).fill(0)); lines++; yy++; }
    let holes = 0, agg = 0, bump = 0; const hs = [];
    for (let c = 0; c < 10; c++) { let h = 0, seen = false; for (let yy = 0; yy < 22; yy++) { if (b[yy][c]) { if (!seen) { h = 22 - yy; seen = true; } } else if (seen) holes++; } hs.push(h); agg += h; }
    for (let c = 0; c < 9; c++) bump += Math.abs(hs[c] - hs[c + 1]);
    const sc = -0.51 * agg + 0.76 * lines - 0.36 * holes - 0.18 * bump;
    if (!bm || sc > bm.sc) bm = { r, x, sc };
  }
  return bm;
}
await p.evaluate(() => { PF.G.board.forEach((r) => r.fill(0)); });
const t0 = Date.now();
let played = 0;
for (let i = 0; i < 70; i++) {
  let sx = await st();
  if (!sx || sx.state === 'over') break;
  if (!sx.cur) { await sleep(60); continue; }
  const mv = best(sx);
  if (!mv) break;
  const taps = [0, 1, 2, 1][mv.r];
  for (let k = 0; k < taps; k++) await tap(L.bx + L.bw * (mv.r === 3 ? 0.25 : 0.75), midY);
  sx = await st();
  if (!sx.cur) continue;
  const dx = mv.x - sx.cur.x;
  if (dx) await drag(L.bx + L.bw / 2, midY, L.bx + L.bw / 2 + dx * L.cs * 0.9 + Math.sign(dx) * L.cs * 0.3, midY, Math.abs(dx) * 2, 8);
  await drag(L.bx + L.bw / 2, L.by + L.cs * 4, L.bx + L.bw / 2, L.by + L.cs * 9, 4, 0);
  played++;
  if (i === 35) await shot(p, 'm03-touch-play-phone', 'Phone: mid-run played entirely with touch gestures');
  if ((await st()).prism >= 100) { const tb = await p.$('[data-touch="burst"]'); await tb.tap(); }
}
const sEnd = await st();
out.runs.push({ label: 'Phone run — Marathon, touch gestures only (70 pieces)', pieces: sEnd.pieces, lines: sEnd.lines, score: sEnd.score, gems: sEnd.gems, state: sEnd.state, wallMs: Date.now() - t0 });
check('Touch-only run: pieces placed and lines cleared with gestures', sEnd.lines >= 10, played + ' pieces played, ' + sEnd.lines + ' lines, state=' + sEnd.state);

// buttons
await p.evaluate(() => PF.debug.fillPrism());
await sleep(80);
await shot(p, 'm04-burst-ready-phone', 'Phone: BURST button glowing when the Prism meter is full');
await (await p.$('[data-touch="burst"]')).tap();
await sleep(150);
check('BURST button fires a Prism Burst', (await st()).fever > 5, 'fever=' + (await st()).fever.toFixed(1));
await sleep(500);
const hb = await st();
await (await p.$('[data-touch="hold"]')).tap();
await sleep(100);
const ha = await st();
check('HOLD button holds the current piece', ha.hold === hb.cur.type || hb.holdUsed, 'hold=' + ha.hold);
await (await p.$('[data-touch="pause"]')).tap();
await sleep(200);
check('Pause button opens the pause menu', (await p.evaluate(() => PF.screen)) === 'pause', '');
await sleep(300);
await p.tap('[data-act="resume"]');
await sleep(200);
check('Android back during play pauses (shell hook)', (await p.evaluate(() => PF.androidBack())) === 'handled' && (await p.evaluate(() => PF.screen)) === 'pause', '');
await p.evaluate(() => PF.androidBack());
await sleep(150);
check('Android back on the pause menu resumes', (await p.evaluate(() => PF.screen)) === 'game', '');
await p.evaluate(() => PF.androidPause());
check('App sent to background auto-pauses (shell hook)', (await p.evaluate(() => PF.screen)) === 'pause', '');
await sleep(300);
await p.tap('[data-act="quit"]');
await sleep(300);
check('Android back on the title asks the shell to exit', (await p.evaluate(() => PF.androidBack())) === 'exit', '');
check('No collision violations during touch play', (await p.evaluate(() => PF.debug.violations)) === 0, '');

// menus on the phone
await p.tap('[data-act="settings"]');
await sleep(300);
await shot(p, 'm05-settings-phone', 'Phone: settings with left-handed layout and vibration toggles');
await p.click('#s-lefty');
await sleep(150);
await p.tap('[data-act="back"]');
await sleep(200);
await p.tap('[data-act="play:marathon"]');
await sleep(2200);
L = await lay();
check('Right-handed setting mirrors the layout (panel and buttons on the right)', !L.lefty && L.lx > L.bx, 'side x=' + L.lx);
await shot(p, 'm06-righthanded-phone', 'Phone: right-handed layout');
await p.evaluate(() => PF.androidBack());
await sleep(300);
await p.tap('[data-act="quit"]');
await sleep(300);
await p.evaluate(() => { PF.save.settings.lefty = true; });

// landscape phone
await p.setViewportSize({ width: 915, height: 412 });
await sleep(200);
await p.tap('[data-act="play:sprint"]').catch(async () => { await p.tap('[data-act="modes"]'); await p.tap('[data-act="play:sprint"]'); });
await sleep(2200);
L = await lay();
check('Landscape phone layout fits', !L.compact && L.by + L.bh <= 412 && Math.min(L.lx, L.rx) >= 0 && Math.max(L.lx, L.rx) + L.rw <= 915, 'cell=' + L.cs);
for (let i = 0; i < 8; i++) await drag(L.bx + L.bw / 2, L.by + L.cs * 4, L.bx + L.bw / 2, L.by + L.cs * 9, 4, 0);
await shot(p, 'm07-landscape-phone', 'Phone landscape (915x412)');
out.lastError = await p.evaluate(() => PF.debug.lastError);
check('No page errors on mobile', out.errors.length === 0 && !out.lastError, out.errors.join('; ') || out.lastError || '');
fs.writeFileSync(path.join(root, 'docs', 'mobile-results.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.runs));
await browser.close();
