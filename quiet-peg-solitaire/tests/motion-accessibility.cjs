const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  await page.goto('http://127.0.0.1:8765');
  await page.click('#play');
  const info = await page.evaluate(() => {
    const move = PegEngine.moves(board, state())[0];
    tap(move[0]); tap(move[2]);
    return { moves: game.index, remaining: PegEngine.count(state()), moving: document.querySelectorAll('.peg-moving').length, removed: document.querySelectorAll('.peg-removing').length,
      accessible: [...document.querySelectorAll('.peg-moving,.peg-removing')].every(n => n.getAttribute('aria-hidden') === 'true') };
  });
  assert.deepEqual(info, { moves: 1, remaining: 31, moving: 1, removed: 1, accessible: true });
  await page.waitForTimeout(350);
  assert.equal(await page.locator('.peg-moving,.peg-removing').count(), 0);
  await page.click('#menuBtn'); await page.click('#settingsBtn'); await page.check('#motion'); await page.click('#settings .back'); await page.click('#play');
  const reduced = await page.evaluate(() => { const m=PegEngine.moves(board,state())[0]; tap(m[0]); tap(m[2]); return {moves:game.index, visual:document.querySelectorAll('.peg-moving,.peg-removing').length}; });
  assert.deepEqual(reduced, {moves:1, visual:0});
  assert.equal(await page.locator('#board [aria-label]').count(),33);
  await page.emulateMedia({reducedMotion:'reduce'}); await page.click('#menuBtn'); await page.click('#settingsBtn'); await page.uncheck('#motion'); await page.click('#settings .back'); await page.click('#play');
  assert.equal(await page.evaluate(() => {const m=PegEngine.moves(board,state())[0];tap(m[0]);tap(m[2]);return document.querySelectorAll('.peg-moving,.peg-removing').length}),0);
  for(const size of [{width:320,height:640},{width:360,height:720},{width:390,height:844}]) {
    await page.setViewportSize(size);
    for(const hole of await page.locator('#board .hole').all()) { const h=await hole.boundingBox(); assert.ok(h.width >= 24 && h.height >= 24, `small hole: ${h.width}x${h.height}`); }
    const c=await page.locator('.controls').boundingBox(); assert.ok(c.y+c.height<=size.height, 'controls clipped');
  }
  await browser.close(); console.log('Movement/removal animation, cleanup, reduced motion and board labels passed');
})().catch(e => { console.error(e); process.exit(1); });
