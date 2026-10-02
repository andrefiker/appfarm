// Prismfall automated playtest.
// Drives the real game in headless Chromium (Playwright) with real keyboard, mouse
// and a mocked gamepad. A heuristic bot plays full runs. Results go to
// docs/playtest-results.json and screenshots go to docs/screenshots/.
// Usage: node tools/playtest.mjs [--quick]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL = 'file://' + path.join(root, 'index.html');
const SHOTS = path.join(root, 'docs', 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });
const QUICK = process.argv.includes('--quick');
const results = { startedAt: new Date().toISOString(), browser: '', viewport: '1366x768', runs: [], checks: [], errors: [], fps: [], lag: null, screenshots: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function check(name, pass, detail) {
  results.checks.push({ name, pass: !!pass, detail: detail == null ? '' : String(detail) });
  console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail != null ? ' — ' + detail : ''));
}
async function shot(page, name, caption) {
  await sleep(450); // let UI pop-in animations settle
  const file = path.join(SHOTS, name + '.png');
  await page.screenshot({ path: file });
  results.screenshots.push({ file: 'docs/screenshots/' + name + '.png', caption });
}

// ---------------------------------------------------------------- bot
let SH = null;
const COLS = 10, ROWS = 22;
function cells(t, r, x, y) { return SH[t].states[r].map(([cx, cy]) => [x + cx, y + cy]); }
function fits(b, t, r, x, y) {
  for (const [cx, cy] of cells(t, r, x, y)) {
    if (cx < 0 || cx >= COLS || cy >= ROWS) return false;
    if (cy >= 0 && b[cy][cx]) return false;
  }
  return true;
}
function evaluate(b, t, r, x, startY) {
  if (!fits(b, t, r, x, startY)) return null;
  let y = startY;
  while (fits(b, t, r, x, y + 1)) y++;
  const nb = b.map((row) => row.slice());
  for (const [cx, cy] of cells(t, r, x, y)) if (cy >= 0) nb[cy][cx] = 1;
  let lines = 0;
  for (let yy = ROWS - 1; yy >= 0; yy--) {
    if (nb[yy].every((v) => v)) { nb.splice(yy, 1); nb.unshift(new Array(COLS).fill(0)); lines++; yy++; }
  }
  const heights = [];
  let holes = 0;
  for (let cx = 0; cx < COLS; cx++) {
    let h = 0, seen = false;
    for (let yy = 0; yy < ROWS; yy++) {
      if (nb[yy][cx]) { if (!seen) { h = ROWS - yy; seen = true; } }
      else if (seen) holes++;
    }
    heights.push(h);
  }
  const agg = heights.reduce((a, c) => a + c, 0);
  let bump = 0;
  for (let i = 0; i < COLS - 1; i++) bump += Math.abs(heights[i] - heights[i + 1]);
  const maxH = Math.max(...heights);
  return { y, lines, score: -0.510066 * agg + 0.760666 * lines - 0.35663 * holes - 0.184483 * bump - (maxH > 15 ? 2 * (maxH - 15) : 0) };
}
function bestMove(st, noise) {
  const c = st.cur;
  let best = null;
  for (let r = 0; r < 4; r++) for (let x = -3; x < COLS + 1; x++) {
    const e = evaluate(st.board, c.type, r, x, Math.max(0, c.y - 1));
    if (!e) continue;
    const s = e.score + (noise ? (Math.random() - 0.5) * noise : 0);
    if (!best || s > best.s) best = { r, x, s, lines: e.lines };
  }
  return best;
}
const state = (p) => p.evaluate(() => PF.debug.state());

// Plays one piece via the keyboard. Returns false when no piece is under control.
async function keyboardPiece(p, noise, keys) {
  keys = keys || { cw: 'ArrowUp', ccw: 'z', r180: 'q', left: 'ArrowLeft', right: 'ArrowRight', drop: 'Space' };
  let st = await state(p);
  if (!st || st.state !== 'play' || !st.cur) return false;
  const pieceNo = st.pieces;
  const mv = bestMove(st, noise);
  if (!mv) { await p.keyboard.press(keys.drop); return true; }
  const rk = [null, keys.cw, keys.r180, keys.ccw][mv.r];
  if (rk) await p.keyboard.press(rk);
  for (let i = 0; i < 12; i++) {
    st = await state(p);
    if (!st || !st.cur || st.pieces !== pieceNo) return true;
    const dx = mv.x - st.cur.x;
    if (dx === 0) break;
    await p.keyboard.press(dx < 0 ? keys.left : keys.right);
  }
  st = await state(p);
  if (st && st.cur && st.pieces === pieceNo) await p.keyboard.press(keys.drop);
  return true;
}

async function waitForPlay(p, timeout = 4000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const st = await state(p);
    if (st && st.state === 'play' && st.cur) return true;
    await sleep(50);
  }
  return false;
}

async function samplePerf(p, label) {
  const f = await p.evaluate(() => PF.debug.fps());
  if (f) results.fps.push(Object.assign({ label }, f));
}

// Plays a run until it ends (or maxPieces / maxMs). Returns a summary.
async function playRun(p, opts) {
  const t0 = Date.now();
  let pieces = 0, bursts = 0, holds = 0, lastPieces = -1, stall = 0;
  const timeline = {};
  while (true) {
    const st = await state(p);
    if (!st) break;
    if (st.state === 'over') break;
    if (opts.maxPieces && pieces >= opts.maxPieces) break;
    if (opts.maxMs && Date.now() - t0 > opts.maxMs) break;
    if (st.prism >= 100 && opts.burst !== false) { await p.keyboard.press(opts.keys ? opts.keys.burst : 'v'); bursts++; if (!timeline.firstBurst) timeline.firstBurst = st.time; }
    if (st.lines > 0 && timeline.firstClear == null) timeline.firstClear = st.time;
    if (st.gems > 0 && timeline.firstGem == null) timeline.firstGem = st.time;
    if (opts.holdEvery && st.cur && pieces % opts.holdEvery === 3 && !st.holdUsed) { await p.keyboard.press(opts.keys ? opts.keys.hold : 'c'); holds++; }
    if (st.state === 'play' && st.cur) {
      if (opts.mode === 'mouse') await mousePiece(p, opts.noise);
      else if (opts.mode === 'pad') await padPiece(p, opts.noise);
      else await keyboardPiece(p, opts.noise, opts.keys);
      pieces++;
      if (opts.pace) await sleep(opts.pace); // human-like pacing between pieces
      if (opts.screenshotAt && opts.screenshotAt[pieces]) await shot(p, opts.screenshotAt[pieces][0], opts.screenshotAt[pieces][1]);
      if (pieces % 40 === 0) await samplePerf(p, opts.label + ' @' + pieces + ' pieces');
    } else await sleep(25);
    // softlock detector: the piece counter must keep moving while playing
    if (st.pieces === lastPieces && st.state === 'play' && !st.clearing) stall++; else stall = 0;
    lastPieces = st.pieces;
    if (stall > 200) { results.errors.push(opts.label + ': no progress for 200 polls (possible softlock)'); break; }
  }
  // wait for the results screen
  const t1 = Date.now();
  while (Date.now() - t1 < 4000) { if ((await p.evaluate(() => PF.screen)) === 'results') break; await sleep(100); }
  const end = await state(p);
  const screen = await p.evaluate(() => PF.screen);
  const res = await p.evaluate(() => PF.G && PF.G.result);
  await samplePerf(p, opts.label + ' end');
  return { label: opts.label, endedOn: screen, result: res, finalState: end && { lines: end.lines, level: end.level, score: end.score, time: +end.time.toFixed(1), pieces: end.pieces, gems: end.gems }, botPieces: pieces, bursts, holds, wallMs: Date.now() - t0, timeline };
}

// mouse: rotate with right clicks, aim by hovering a column, drop with a left click
async function mousePiece(p, noise) {
  let st = await state(p);
  const mv = bestMove(st, noise);
  const L = await p.evaluate(() => PF.debug.layout());
  const centerY = L.by + L.bh * 0.4;
  if (!mv) { await p.mouse.click(L.bx + L.bw / 2, centerY); return; }
  for (let i = 0; i < mv.r; i++) await p.mouse.click(L.bx + L.bw / 2, centerY, { button: 'right' });
  st = await state(p);
  if (!st.cur) return;
  const xs = SH[st.cur.type].states[st.cur.rot].map((c) => c[0]);
  const mid = Math.floor((Math.min(...xs) + Math.max(...xs)) / 2);
  const col = mv.x + mid;
  const px = L.bx + (col + 0.5) * L.cs;
  await p.mouse.move(px - 3, centerY);
  await p.mouse.move(px, centerY);
  await sleep(40);
  await p.mouse.click(px, centerY);
}

// gamepad: drives the mocked navigator.getGamepads()
async function padPress(p, btn) {
  await p.evaluate((b) => { window.__pad.buttons[b].pressed = true; }, btn);
  await sleep(45);
  await p.evaluate((b) => { window.__pad.buttons[b].pressed = false; }, btn);
  await sleep(45);
}
async function padPiece(p, noise) {
  let st = await state(p);
  const pieceNo = st.pieces;
  const mv = bestMove(st, noise);
  if (!mv) return padPress(p, 12);
  const rb = [null, 0, null, 1][mv.r];
  if (mv.r === 2) { await padPress(p, 0); await padPress(p, 0); } else if (rb != null) await padPress(p, rb);
  for (let i = 0; i < 12; i++) {
    st = await state(p);
    if (!st.cur || st.pieces !== pieceNo) return;
    const dx = mv.x - st.cur.x;
    if (!dx) break;
    await padPress(p, dx < 0 ? 14 : 15);
  }
  await padPress(p, 12);
}

async function toTitle(p) {
  for (let i = 0; i < 14; i++) {
    const s = await p.evaluate(() => PF.screen);
    if (s === 'title') return;
    if (s === 'game' && (await p.evaluate(() => PF.G && PF.G.state === 'over'))) { await sleep(400); continue; } // game-over animation
    if (s === 'pause') await p.click('[data-act="quit"]');
    else await p.keyboard.press('Escape');
    await sleep(150);
  }
}

const PAD_INIT = () => {
  window.__pad = { id: 'Mock Xbox Controller', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  navigator.getGamepads = () => [window.__pad];
};

// ---------------------------------------------------------------- main
const browser = await chromium.launch();
results.browser = 'Chromium ' + browser.version() + ' (headless, Playwright)';
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => results.errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') results.errors.push('console: ' + m.text()); });
await page.goto(URL);
await page.waitForTimeout(600);
SH = await page.evaluate(() => PF.debug.shapes);
check('Game boots from file:// with no errors', (await page.evaluate(() => PF.screen)) === 'title' && results.errors.length === 0, 'screen=' + (await page.evaluate(() => PF.screen)));
await shot(page, '01-title', 'Title screen, fresh save (light theme)');

// ---- Run 1: Marathon, fresh profile, strong bot, first-60-seconds observation
await page.keyboard.press('Enter'); // Play Marathon is autofocused
check('Enter on title starts Marathon (keyboard-only start)', await waitForPlay(page), '');
const t60 = Date.now();
await sleep(700);
await shot(page, '02-first-seconds', 'First seconds of a first run: tutorial hint bar under the well');
const run1 = await playRun(page, { label: 'Run 1 — Marathon (fresh save, strong bot, human pace ~2 pieces/s)', noise: 0, pace: 380, holdEvery: 9, maxPieces: QUICK ? 60 : 2000, screenshotAt: { 25: ['03-marathon-early', 'Marathon about 25 pieces in: gems in the stack, ghost piece, Prism meter filling'], 120: ['04-marathon-mid', 'Marathon mid-run'] } });
run1.firstMinuteWallMs = Date.now() - t60;
results.runs.push(run1);
if (run1.endedOn === 'results') await shot(page, '05-results-marathon', 'Results screen after Run 1 (shards, XP bar, achievements)');

// ---- Run 2: Sprint 40 (from results: Esc -> menu -> All Modes)
await toTitle(page);
await page.click('[data-act="modes"]');
await sleep(300);
await shot(page, '06-modes', 'Mode select');
await page.click('[data-act="play:sprint"]');
await waitForPlay(page);
const run2 = await playRun(page, { label: 'Run 2 — Sprint 40 (strong bot, keyboard)', noise: 0, maxPieces: 200 });
results.runs.push(run2);
check('Sprint ends at 40 lines with a FINISH result', run2.result && run2.result.won && run2.result.lines >= 40, run2.result && run2.result.lines + ' lines, ' + run2.result.time.toFixed(1) + 's');
await shot(page, '07-results-sprint', 'Sprint 40 results');

// ---- Run 3: Daily Bloom with the LEFT-HANDED key cluster and Prism Bursts
await toTitle(page);
await page.click('[data-act="play:daily"]');
const qA = (await (async () => { await waitForPlay(page); return (await state(page)).queue; })());
const lefty = { cw: 'k', ccw: 'j', r180: 'l', left: 'a', right: 'd', drop: 'w', hold: 'i', burst: 'o' };
let feverShot = false;
const run3 = await (async () => {
  const r = { label: 'Run 3 — Daily Bloom (left-handed keys A/D/W/J/K/L/I/O, human pace)', noise: 0, pace: 520, keys: lefty, holdEvery: 11, maxMs: QUICK ? 30000 : 240000 };
  // a lightweight wrapper so we can screenshot the first Fever
  const origShot = r.screenshotAt = {};
  const watcher = setInterval(async () => {
    if (feverShot) return;
    try { const s = await state(page); if (s && s.fever > 6) { feverShot = true; await shot(page, '08-prism-burst-fever', 'Prism Burst just fired: rainbow Fever x2 overlay'); } } catch (e) { /* ignore */ }
  }, 120);
  const out = await playRun(page, r);
  clearInterval(watcher);
  return out;
})();
results.runs.push(run3);
check('Daily Bloom ends at the 3:00 time limit', run3.result && Math.abs(run3.result.time - 180) < 0.5, run3.result && run3.result.time.toFixed(2) + 's');
check('Left-handed key cluster can play a full run', run3.finalState && run3.finalState.pieces > 50, run3.finalState && run3.finalState.pieces + ' pieces');
check('Prism Burst fired at least once in Daily run', run3.bursts > 0, run3.bursts + ' bursts');

// Daily seed determinism: start a second daily and compare the queue
await toTitle(page);
await page.click('[data-act="play:daily"]');
await waitForPlay(page);
const qB = (await state(page)).queue;
check('Daily Bloom piece order is identical across runs on the same day', JSON.stringify(qA) === JSON.stringify(qB), qA.join('') + ' vs ' + qB.join(''));

// ---- Pause / blur / resume (softlock guard)
await page.keyboard.press('Escape');
await sleep(150);
check('Esc pauses the game', (await page.evaluate(() => PF.screen)) === 'pause', '');
await shot(page, '09-pause', 'Pause menu');
await page.keyboard.press('Escape');
await sleep(150);
check('Esc resumes the game', (await page.evaluate(() => PF.screen)) === 'game', '');
await page.keyboard.down('ArrowLeft');
await page.evaluate(() => window.dispatchEvent(new Event('blur')));
await sleep(150);
check('Window blur auto-pauses and releases held keys (no stuck auto-shift)', (await page.evaluate(() => PF.screen)) === 'pause', '');
await page.keyboard.up('ArrowLeft');
await page.click('[data-act="quit"]');
await sleep(200);

// ---- Run 4: Marathon, novice (noisy) bot, retry via Enter from results
await page.click('[data-act="play:marathon"]');
await waitForPlay(page);
const run4 = await playRun(page, { label: 'Run 4 — Marathon (novice bot: heavy random noise)', noise: 9, maxPieces: 400 });
results.runs.push(run4);
check('Novice run reaches a TOP OUT game over and the results screen', run4.endedOn === 'results' && run4.result && !run4.result.won, run4.result && run4.result.label);
await sleep(800);
await page.keyboard.press('Enter');
check('Enter on results restarts instantly (retry loop)', await waitForPlay(page), '');

// ---- Run 5: same retry, deliberately topping out by spamming hard drop (fast fail path)
const t5 = Date.now();
for (let i = 0; i < 80; i++) { const s = await state(page); if (!s || s.state === 'over') break; await page.keyboard.press('Space'); await sleep(30); }
await sleep(1800);
const r5 = await page.evaluate(() => PF.G && PF.G.result);
results.runs.push({ label: 'Run 5 — Marathon retry, hard-drop spam until top-out', endedOn: await page.evaluate(() => PF.screen), result: r5, wallMs: Date.now() - t5 });
check('Hard-drop spam ends in game over without errors, results reachable', (await page.evaluate(() => PF.screen)) === 'results' && r5 && r5.label, r5 && r5.label);
check('Space mashed during game over did not skip the results screen', (await page.evaluate(() => PF.screen)) === 'results', '');

// ---- Run 6: Zen with MOUSE ONLY (includes forced top-outs -> Zen rescue)
await toTitle(page);
await page.click('[data-act="modes"]');
await sleep(200);
await page.click('[data-act="play:zen"]');
await waitForPlay(page);
const run6 = await playRun(page, { label: 'Run 6 — Zen Garden, mouse only (hover aim, right-click rotate, click drop)', mode: 'mouse', noise: 2, maxPieces: QUICK ? 30 : 120, screenshotAt: { 30: ['10-zen-mouse', 'Zen Garden played with the mouse only'] } });
// force a top-out in Zen: spam drop in one column
for (let i = 0; i < 40; i++) { await page.keyboard.press('Space'); await sleep(25); }
await sleep(400);
const zst = await state(page);
check('Zen never ends: top-out triggers "Fresh Soil" rescue instead of game over', zst.state !== 'over', 'state=' + zst.state);
await toTitle(page);
results.runs.push(run6);

// ---- Run 7: Marathon with a mocked gamepad
const padPage = await ctx.newPage();
padPage.on('pageerror', (e) => results.errors.push('pageerror(pad): ' + e.message));
await padPage.addInitScript(PAD_INIT);
await padPage.goto(URL);
await padPage.waitForTimeout(500);
await padPress(padPage, 0); // A on the autofocused "Play Marathon"
const padStarted = await waitForPlay(padPage);
check('Gamepad A button starts a game from the title menu', padStarted, '');
const run7 = await playRun(padPage, { label: 'Run 7 — Marathon, gamepad only (mocked standard-mapping pad)', mode: 'pad', noise: 0, maxPieces: QUICK ? 15 : 40 });
await padPress(padPage, 9);
check('Gamepad Start pauses', (await padPage.evaluate(() => PF.screen)) === 'pause', '');
await padPress(padPage, 9);
check('Gamepad Start resumes', (await padPage.evaluate(() => PF.screen)) === 'game', '');
results.runs.push(run7);
await shot(padPage, '11-gamepad', 'Marathon driven by the (mocked) gamepad');
await padPage.close();

// ---------------------------------------------------------------- rule checks
await page.bringToFront();
await page.click('[data-act="play:marathon"]');
await waitForPlay(page);
// T-spin double via real input
const tsd = await page.evaluate(() => {
  const G = PF.G;
  G.board.forEach((r) => r.fill(0));
  PF.debug.setBoardRows(['...#......', '###...####', '####.#####']);
  G.cur = { type: 'T', rot: 1, x: 3, y: 19, gem: -1 };
  G.lastAction = ''; G.combo = -1; G.b2b = false;
  return G.score;
});
await page.keyboard.press('ArrowUp');
await page.keyboard.press('Space');
await sleep(500);
const tsdAfter = await page.evaluate(() => ({ score: PF.G.score, bottom: Array.from(PF.G.board[21]).map((v) => (v ? '#' : '.')).join(''), lines: PF.G.lines }));
check('T-spin double detected and scored 1200 at level 1', tsdAfter.score - tsd === 1200 && tsdAfter.bottom === '...#......', 'delta=' + (tsdAfter.score - tsd) + ' bottom=' + tsdAfter.bottom);
await shot(page, '12-tspin', 'T-SPIN DOUBLE callout after a scripted T-spin');

// Perfect clear with the O piece
await waitForPlay(page);
const pc0 = await page.evaluate(() => {
  const G = PF.G;
  G.board.forEach((r) => r.fill(0));
  PF.debug.setBoardRows(['####..####', '####..####']);
  G.cur = { type: 'O', rot: 0, x: 4, y: 1, gem: -1 };
  G.combo = -1; G.b2b = false;
  return G.score;
});
await page.keyboard.press('Space');
await sleep(500);
const pc1 = await page.evaluate(() => ({ score: PF.G.score, empty: PF.G.board.every((r) => r.every((v) => !v)) }));
check('Perfect clear awards +3000 and empties the board', pc1.empty && pc1.score - pc0 >= 3300, 'delta=' + (pc1.score - pc0));

// Prism Burst clears bottom rows and collects gems
await waitForPlay(page);
const pb = await page.evaluate(() => {
  const G = PF.G;
  G.board.forEach((r) => r.fill(0));
  PF.debug.setBoardRows(['#.#######.', '##*#####.#', '#######.##', '.#########', '###.######', '#####*###.']);
  PF.debug.fillPrism();
  return { gems: G.gems };
});
await page.keyboard.press('v');
await sleep(100);
const pbAfter = await page.evaluate(() => ({ gems: PF.G.gems, fever: PF.G.fever, filledRows: PF.G.board.filter((r) => r.some((v) => v)).length, prism: PF.G.prism }));
check('Prism Burst removes 4 bottom rows, collects gems, starts Fever, empties meter', pbAfter.filledRows === 2 && pbAfter.gems - pb.gems === 1 && pbAfter.fever > 7 && pbAfter.prism === 0, JSON.stringify(pbAfter));

// Burst pressed during the line-clear animation is buffered, not dropped
await waitForPlay(page);
await page.evaluate(() => { const G = PF.G; G.board.forEach((r) => r.fill(0)); PF.debug.setBoardRows(['#..######.', '#########.', '##.#######', '#.########', '###.######']); G.cur = { type: 'I', rot: 1, x: 7, y: 10, gem: -1 }; PF.debug.fillPrism(); });
await page.keyboard.press('Space');
await sleep(80);
const midClear = await page.evaluate(() => !!PF.G.clearing);
await page.keyboard.press('v');
await sleep(450);
const bb = await page.evaluate(() => ({ fever: PF.G.fever, prism: PF.G.prism }));
check('Prism Burst pressed during a line-clear animation is buffered and fires right after', midClear && bb.fever > 0 && bb.prism === 0, 'pressedMidClear=' + midClear + ' ' + JSON.stringify(bb));

// Hold can only be used once per piece
await waitForPlay(page);
const h0 = await state(page);
await page.keyboard.press('c');
await page.keyboard.press('c');
const h1 = await state(page);
check('Hold swaps once, second press is refused until the next piece', h1.hold === h0.cur.type && h1.holdUsed && h1.cur.type === h0.queue[0], 'held=' + h1.hold + ' cur=' + h1.cur.type);

// Infinite-spin guard: a grounded piece must lock after 15 move resets
await page.evaluate(() => { const G = PF.G; G.board.forEach((r) => r.fill(0)); });
await page.keyboard.press('ArrowDown');
await page.evaluate(() => { const G = PF.G; while (!PF.debug.collides(G.cur.type, G.cur.rot, G.cur.x, G.cur.y + 1)) G.cur.y++; });
const pcs0 = (await state(page)).pieces;
for (let i = 0; i < 60; i++) { await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight'); await sleep(40); }
const pcs1 = (await state(page)).pieces;
check('Lock delay is capped (no infinite stalling by wiggling)', pcs1 > pcs0, 'pieces ' + pcs0 + ' -> ' + pcs1);

// Second Wind perk rescues one top-out
await toTitle(page);
await page.evaluate(() => { PF.save.perks.wind = 1; });
await page.click('[data-act="play:marathon"]');
await waitForPlay(page);
await page.evaluate(() => { const G = PF.G; for (let y = 3; y < 22; y++) G.board[y] = Uint8Array.from({ length: 10 }, (_, x) => (x === y % 10 ? 0 : 2)); });
let sw = null;
for (let i = 0; i < 12; i++) {
  await page.keyboard.press('Space');
  await sleep(60);
  sw = await page.evaluate(() => ({ used: PF.G.windUsed, state: PF.G.state, topRowsEmpty: PF.G.board.slice(0, 8).every((r) => r.every((v) => !v)) }));
  if (sw.used || sw.state === 'over') break;
}
check('Second Wind perk survives the first top-out', sw.used && sw.state !== 'over', JSON.stringify(sw));
await page.evaluate(() => { PF.save.perks.wind = 0; });
await toTitle(page);

// ---------------------------------------------------------------- fuzz
await page.click('[data-act="play:marathon"]');
await waitForPlay(page);
const fuzzKeys = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space', 'z', 'x', 'q', 'c', 'v', 'a', 'd', 's', 'w', 'j', 'k', 'l', 'i', 'o', 'Shift', 'Escape', 'Enter', 'p'];
let fuzzEvents = 0;
const N = QUICK ? 600 : 3000;
for (let i = 0; i < N; i++) {
  const k = fuzzKeys[Math.floor(Math.random() * fuzzKeys.length)];
  if (Math.random() < 0.2) { await page.keyboard.down(k); await sleep(Math.random() * 220); await page.keyboard.up(k); }
  else await page.keyboard.press(k);
  fuzzEvents++;
  if (i % 50 === 0) {
    const scr = await page.evaluate(() => PF.screen);
    // keep the fuzzer inside gameplay most of the time
    if (scr !== 'game') { await page.keyboard.press('Escape'); await sleep(60); if ((await page.evaluate(() => PF.screen)) === 'title') { await page.keyboard.press('Enter'); await sleep(50); } }
  }
}
const viol = await page.evaluate(() => PF.debug.violations);
const lastErr = await page.evaluate(() => PF.debug.lastError);
check('Fuzz: ' + fuzzEvents + ' random key events, active piece never overlapped the stack or walls', viol === 0, 'violations=' + viol);
check('Fuzz: no runtime exceptions in the game loop', !lastErr, lastErr || '');
// softlock escape hatch: from wherever the fuzzer left us, Esc / Quit must reach the title and a new game
const leftOn = await page.evaluate(() => PF.screen);
await toTitle(page);
const reachedTitle = (await page.evaluate(() => PF.screen)) === 'title';
await page.click('[data-act="play:marathon"]');
check('After fuzzing (left on "' + leftOn + '"), Esc/Quit returns to the title and a new game starts (no softlock)', reachedTitle && await waitForPlay(page), '');
const lag = await page.evaluate(() => PF.debug.lag());
results.lag = lag;
await samplePerf(page, 'after fuzz');
await toTitle(page);

// ---------------------------------------------------------------- meta screens
await page.click('[data-act="workshop"]');
await sleep(250);
const shards = await page.evaluate(() => PF.save.shards);
await shot(page, '13-workshop', 'Workshop with shards earned from the test runs');
const buyBtn = await page.$('[data-act^="buy:"]:not([disabled])');
if (buyBtn) {
  await buyBtn.click();
  await sleep(200);
  const after = await page.evaluate(() => ({ shards: PF.save.shards, perks: PF.save.perks }));
  check('Buying a perk spends shards and raises the perk level', after.shards < shards, shards + ' -> ' + after.shards + ' ' + JSON.stringify(after.perks));
} else check('Buying a perk spends shards and raises the perk level', false, 'no affordable perk (shards=' + shards + ')');
await page.keyboard.press('Escape');
await sleep(150);
await page.click('[data-act="collection"]');
await sleep(250);
await shot(page, '14-collection-themes', 'Collection: themes unlocked by player level');
await page.click('[data-act="tab:ach"]');
await sleep(150);
await shot(page, '15-collection-achievements', 'Collection: achievements');
const unlocked = await page.$$('.card[data-act^="theme:"]');
if (unlocked.length > 1) {
  await page.click('[data-act="tab:themes"]');
  await page.click('[data-act="theme:' + (await page.evaluate(() => PF.save.xp >= 30 ? 'candy' : 'paper')) + '"]');
}
await page.keyboard.press('Escape');
await page.click('[data-act="settings"]');
await sleep(200);
await shot(page, '16-settings', 'Settings (DAS/ARR, soft drop, volume, toggles)');
await page.keyboard.press('Escape');
await page.click('[data-act="help"]');
await sleep(200);
await shot(page, '17-help', 'How to Play, including the left-handed key cluster');
await page.keyboard.press('Escape');

// persistence across reload
const before = await page.evaluate(() => ({ runs: PF.save.totals.runs, shards: PF.save.shards, best: PF.save.best.marathon }));
await page.reload();
await page.waitForTimeout(500);
const afterReload = await page.evaluate(() => ({ runs: PF.save.totals.runs, shards: PF.save.shards, best: PF.save.best.marathon }));
check('Progress (runs, shards, bests) persists in localStorage across reload', JSON.stringify(before) === JSON.stringify(afterReload) && before.runs >= 5, JSON.stringify(afterReload));
await shot(page, '18-title-returning', 'Title screen for a returning player (level, shards, bests)');

// theme switch screenshot in-game
await page.evaluate(() => { PF.debug.setSave(Object.assign({}, PF.save, { xp: 900, theme: 'prism' })); });
await page.click('[data-act="play:marathon"]');
await waitForPlay(page);
for (let i = 0; i < 14; i++) await keyboardPiece(page, 0);
await shot(page, '19-theme-prism', 'Prism theme (unlocks at player level 9)');
await toTitle(page);
await page.evaluate(() => { PF.debug.setSave(Object.assign({}, PF.save, { theme: 'paper' })); });

// ---------------------------------------------------------------- resolutions
for (const [w, h] of [[1024, 600], [1920, 1080], [800, 600]]) {
  await page.setViewportSize({ width: w, height: h });
  await sleep(200);
  await page.click('[data-act="play:marathon"]');
  await waitForPlay(page);
  for (let i = 0; i < 6; i++) await keyboardPiece(page, 0);
  const L = await page.evaluate(() => PF.debug.layout());
  const fitsScreen = L.lx >= 0 && L.rx + L.rw <= w && L.by - L.cs * 2 >= -2 && L.by + L.bh <= h;
  check('Layout fits ' + w + 'x' + h + ' (cell ' + L.cs + 'px)', fitsScreen, JSON.stringify({ lx: Math.round(L.lx), right: Math.round(L.rx + L.rw), top: Math.round(L.by), bottom: Math.round(L.by + L.bh) }));
  await shot(page, '20-res-' + w + 'x' + h, 'Gameplay at ' + w + 'x' + h);
  await toTitle(page);
}

results.finishedAt = new Date().toISOString();
results.summary = { checks: results.checks.length, passed: results.checks.filter((c) => c.pass).length, errors: results.errors.length };
fs.writeFileSync(path.join(root, 'docs', 'playtest-results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.summary), 'lag', JSON.stringify(results.lag));
console.log('fps', JSON.stringify(results.fps.map((f) => [f.label, f.avgFps.toFixed(1), f.worstFrameMs.toFixed(0)])));
console.log('runs', JSON.stringify(results.runs.map((r) => [r.label, r.endedOn, r.result && r.result.label, r.finalState, r.timeline]), null, 0));
console.log('errors', results.errors);
await browser.close();
