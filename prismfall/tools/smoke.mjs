import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const url = 'file://' + process.cwd() + '/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(url);
await p.waitForTimeout(800);
await p.screenshot({ path: '/tmp/claude-0/s-title.png' });
await p.click('[data-act="play:marathon"]');
await p.waitForTimeout(2200);
for (let i = 0; i < 8; i++) { await p.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowUp'); await p.keyboard.press('Space'); await p.waitForTimeout(150); }
await p.screenshot({ path: '/tmp/claude-0/s-game.png' });
console.log(JSON.stringify(await p.evaluate(() => ({ s: PF.screen, st: PF.debug.state() && { score: PF.debug.state().score, pieces: PF.debug.state().pieces }, fps: PF.debug.fps(), err: PF.debug.lastError }))));
console.log('errors', errs);
await b.close();
