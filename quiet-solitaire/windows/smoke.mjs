import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { _electron as electron } from 'playwright';

const executablePath = process.env.QUIET_SOLITAIRE_EXE || resolve('windows/release/win-unpacked/Quiet Solitaire.exe');

async function launch() {
  const app = await electron.launch({ executablePath, args: ['--disable-gpu'] });
  const page = await app.firstWindow();
  await page.waitForSelector('#tableau .card');
  return { app, page };
}

let opened;
try {
  opened = await launch();
  assert.equal(await opened.page.title(), 'Quiet Solitaire');
  assert.equal(await opened.page.locator('#tableau .card').count(), 28);
  assert.equal(await opened.page.evaluate(() => document.querySelector('#app').classList.contains('hand-left')), true);
  const before = await opened.page.evaluate(() => JSON.parse(localStorage.getItem('quiet-current')).stock.length);
  assert.ok(before > 0);
  await opened.page.locator('#stock-pile').click();
  await opened.page.waitForFunction(expected => JSON.parse(localStorage.getItem('quiet-current')).stock.length === expected, before - 1);
  const deal = await opened.page.evaluate(() => JSON.parse(localStorage.getItem('quiet-current')).seed);
  await opened.page.screenshot({ path: 'windows/release/windows-smoke.png' });
  await opened.app.close();
  opened = await launch();
  const restored = await opened.page.evaluate(() => JSON.parse(localStorage.getItem('quiet-current')));
  assert.equal(restored.seed, deal);
  assert.equal(restored.stock.length, before - 1, 'game state survives app relaunch');
  assert.equal(await opened.page.evaluate(() => document.scrollingElement.scrollHeight <= innerHeight + 1), true);
  const blocked = await opened.page.evaluate(() => fetch('https://example.com/').then(() => false, () => true));
  assert.equal(blocked, true, 'remote requests are blocked');
  console.log('Windows packaged app: launch, board, stock, save/relaunch, layout and network block verified');
} finally {
  await opened?.app.close();
}
