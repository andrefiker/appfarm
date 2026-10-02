import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = resolve('dist');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml' };
const server = createServer(async (req, res) => {
  const file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    .replace(/\/$/, '/index.html'));
  if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    res.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await chromium.launch({ headless:true });
const context = await browser.newContext({ viewport:{width:393,height:852},
  isMobile:true, hasTouch:true, deviceScaleFactor:1 });
await context.addInitScript(() => {
  const pending=sessionStorage.getItem('__qa_fixture');
  if(pending) {
    localStorage.setItem('quiet-current',pending);
    sessionStorage.removeItem('__qa_fixture');
  }
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const base = `http://127.0.0.1:${server.address().port}/`;
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('quiet-current')));
const wait = predicate => page.waitForFunction(predicate, null, { timeout:4000 });
async function fixture(changes) {
  await page.evaluate(async changes => {
    const {newGame} = await import('./src/engine.js');
    const g=newGame(34567);
    Object.assign(g,changes,{history:[],moves:0,status:'playing',recorded:false});
    sessionStorage.setItem('__qa_fixture',JSON.stringify(g));
  },changes);
  await page.reload();
}
const card=(suit,rank,faceUp=true)=>({suit,rank,faceUp});
try {
  await page.goto(base);
  assert.equal(await page.locator('#tableau .card').count(),28);
  assert.equal((await state()).stock.length,24);
  await page.locator('#stock-pile').tap();
  await wait(() => JSON.parse(localStorage.getItem('quiet-current')).stock.length===23);
  await page.reload();
  assert.equal((await state()).stock.length,23,'stock survives relaunch');
  assert.equal(await page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth+1),true);
  assert.equal(await page.evaluate(() => document.scrollingElement.scrollHeight <= innerHeight+1),true);

  await fixture({stock:[],waste:[card('hearts',1)],foundations:[[],[],[],[]],
    tableau:[[card('clubs',9,false),card('hearts',8),card('clubs',7),card('diamonds',6)],
      [card('spades',9)],[],[],[],[],[]]});
  assert.equal(await page.locator('#app').getAttribute('class').then(x=>x.includes('hand-left')),true);
  const exposed=await page.locator('.tableau-column[data-index="0"] .card[data-card-index="1"]').boundingBox();
  await page.touchscreen.tap(exposed.x+12,exposed.y+12);
  await wait(() => JSON.parse(localStorage.getItem('quiet-current')).tableau[1].length===4);
  assert.equal((await state()).tableau[0][0].faceUp,true,'sequence tap reveals the hidden card');
  await page.locator('#undo').tap();
  assert.equal((await state()).tableau[0].length,4);
  await page.reload();
  assert.equal((await state()).tableau[0].length,4,'undo survives relaunch');

  await page.locator('#waste-pile .card').tap();
  await page.locator('#waste-pile .card').tap();
  await wait(() => JSON.parse(localStorage.getItem('quiet-current')).foundations.some(p=>p.length===1));
  assert.equal((await state()).moves,1,'double tap performs one foundation move');

  await fixture({stock:[],waste:[card('hearts',8)],foundations:[[],[],[],[]],
    tableau:[[card('clubs',9)],[card('spades',9)],[],[],[],[],[]]});
  await page.locator('#waste-pile .card').tap();
  await wait(() => document.querySelectorAll('.tableau-column.legal-target').length===2);
  assert.equal((await state()).moves,0,'ambiguous tap does not choose a column');
  await page.locator('#hint').tap();
  assert.equal(await page.locator('#hint-layer').isVisible(),true);
  const source=await page.locator('#waste-pile .card').boundingBox();
  const dest=await page.locator('.tableau-column[data-index="1"]').boundingBox();
  await page.mouse.move(source.x+source.width/2,source.y+source.height/2);
  await page.mouse.down();
  await page.mouse.move(dest.x+dest.width/2,dest.y+dest.height/2,{steps:6});
  await page.mouse.up();
  await wait(() => JSON.parse(localStorage.getItem('quiet-current')).tableau[1].length===2);

  await fixture({stock:[],waste:[card('clubs',5)],foundations:[[],[],[],[]],
    tableau:[[],[],[],[],[],[],[]]});
  await page.locator('#stock-pile').tap();
  assert.equal((await state()).stock.length,1,'empty stock recycles waste');

  const suits=['hearts','diamonds','clubs','spades'];
  await fixture({stock:[],waste:[],
    foundations:suits.map(s=>Array.from({length:11},(_,i)=>card(s,i+1))),
    tableau:suits.map(s=>[card(s,13),card(s,12)]).concat([[],[],[]])});
  assert.equal(await page.locator('#auto-finish').isVisible(),true);
  await page.locator('#auto-finish').tap();
  await wait(() => JSON.parse(localStorage.getItem('quiet-current')).status==='won');
  assert.equal((await state()).foundations.every(p=>p.length===13),true);
  await page.locator('#win-new').tap();
  assert.equal((await state()).status,'playing');

  await page.locator('#menu-open').tap();
  await page.locator('#setting-hand').selectOption('right');
  await page.locator('#modal-close').tap();
  assert.equal((await page.locator('#app').getAttribute('class')).includes('hand-right'),true);
  const stock=await page.locator('#stock-pile').boundingBox();
  const foundation=await page.locator('.foundation-pile').first().boundingBox();
  assert.ok(stock.x>foundation.x,'right-handed stock is mirrored');
  await page.screenshot({path:'browser-smoke.png'});
  assert.deepEqual(errors,[],'no browser page errors');
  console.log('Browser smoke: stock, recycle, sequence tap, undo, relaunch, double tap, ambiguity, hint, drag, auto-finish, win, new game, handedness, viewport PASS');
} finally {
  await browser.close();
  server.close();
}
