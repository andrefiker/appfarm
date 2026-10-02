// Verifies the Web Audio engine starts after a user gesture and that every SFX + music mode runs without throwing.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const b = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + process.cwd() + '/index.html');
const before = await p.evaluate(() => PFAudio.state);
await p.mouse.click(5, 5);
await p.waitForTimeout(300);
const res = await p.evaluate(async () => {
  const names = ['move','rotate','buzz','lock','hard','hold','clear','tspin','levelUp','gem','prismReady','burst','pc','gameOver','win','count','go','uiHover','uiClick','buy','achievement','danger'];
  for (const n of names) PFAudio.play(n, 4, 3);
  PFAudio.setMusic('game', { level: 8, intensity: 4, fever: true });
  await new Promise((r) => setTimeout(r, 1500));
  const m1 = PFAudio.music.step;
  PFAudio.setMusic('menu');
  await new Promise((r) => setTimeout(r, 800));
  return { state: PFAudio.state, gameSteps: m1, menuSteps: PFAudio.music.step, sfx: names.length };
});
console.log(JSON.stringify({ before, after: res, errors: errs }));
await b.close();
