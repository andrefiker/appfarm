import {test, expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {Chess} from '../frontend/node_modules/chess.js/dist/esm/chess.js';
const url = process.env.QK_FRONTEND_URL || 'http://127.0.0.1:3000/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url), 'isolated candidate only');
const opening = ['e4', 'd5', 'exd5', 'Qxd5'];

async function table(page, {role = 'white', moves = opening} = {}) {
  let version = 1, number = 1, line = [...moves];
  const sockets = [], writes = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const room = () => {
    const chess = new Chess(); line.forEach(san => chess.move(san));
    const last = chess.history({verbose:true}).at(-1);
    return {code:'REV001', fen:chess.fen(), turn:chess.turn(), status:'active', winner:null,
      version, game_number:number, created_at:1, white_joined:true, black_joined:true,
      moves:[...line], last_move:last ? {from:last.from, to:last.to, san:last.san} : null};
  };
  await page.route('**/capabilities', route => route.fulfill({json:{protocol:2, new_games:'untimed', guest_play:true, variants:['standard']}}));
  await page.route(/\/rooms(?:\/REV001(?:\/[^/?]+)?)?$/, async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/move')) {
      const payload = route.request().postDataJSON(); writes.push(payload);
      const chess = new Chess(); line.forEach(san => chess.move(san));
      line.push(chess.move({from:payload.from, to:payload.to, promotion:payload.promotion}).san);
      version++;
      for (const socket of sockets) socket.send(JSON.stringify({type:'room.update', room:room()}));
    }
    await route.fulfill({json:{room:room(), role, seat_token:'synthetic-review-seat'}});
  });
  await page.routeWebSocket(/\/ws\?/, socket => {
    sockets.push(socket);
    const send = () => {
      socket.send(JSON.stringify({type:'room.update', room:room()}));
      socket.send(JSON.stringify({type:'seat.role', role, game_number:number}));
    };
    send(); socket.onMessage(send);
  });
  await page.goto(url);
  await page.getByRole('button',{name:'Create live game', exact:true}).click();
  await expect(page.getByRole('button',{name:'Connection: Live. Reconnect',exact:true})).toBeVisible();
  return {writes, errors, update(next, gameNumber = number) {
    line = [...next]; number = gameNumber; version++;
    for (const socket of sockets) {
      socket.send(JSON.stringify({type:'room.update', room:room()}));
      socket.send(JSON.stringify({type:'seat.role', role, game_number:number}));
    }
  }};
}
const openHistory = page => page.locator('.board-history summary').click();
const returnToGame = page => page.locator('.review-banner').getByRole('button',{name:'Return to game',exact:true}).click();
const square = (page, name) => page.locator(`[data-square=${name}]`);

for (const role of ['white', 'black']) test(`lost pieces follow ${role} orientation; review stays read-only during live updates`, async ({page}) => {
  const fixture = await table(page,{role});
  const colors = role === 'white' ? ['b','w'] : ['w','b'];
  await expect(page.locator('.board-stage .player-strip .loss-row')).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    const tray = page.locator('.board-stage .player-strip .loss-row').nth(i);
    await expect(tray).toHaveAttribute('data-lost-color',colors[i]);
    await expect(tray.locator('[data-captured=p]')).toHaveCount(1);
  }
  await openHistory(page);
  await page.getByRole('button',{name:'2. White: exd5',exact:true}).click();
  await expect(square(page,'d5')).toHaveAttribute('data-piece','wp');
  await expect(page.locator('[data-lost-color=w] [data-captured]')).toHaveCount(0);
  await expect(page.locator('[data-lost-color=b] [data-captured=p]')).toHaveCount(1);
  await expect(page.locator('.square[aria-disabled=true]')).toHaveCount(64);
  // Exercise both click and keyboard activation even though aria-disabled is true.
  await square(page,'g1').dispatchEvent('click');
  await square(page,'f3').press('Enter');
  expect(fixture.writes).toEqual([]);
  fixture.update([...opening, 'Nc3']);
  await expect(page.locator('.review-banner')).toContainText('Position 3 of 5');
  await expect(square(page,'d5')).toHaveAttribute('data-piece','wp');
  await page.getByRole('button',{name:'First',exact:true}).click();
  await expect(page.locator('.board .chess-art')).toHaveCount(32);
  await expect(page.getByRole('button',{name:'Previous',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(square(page,'e4')).toHaveAttribute('data-piece','wp');
  await returnToGame(page);
  await expect(square(page,'c3')).toHaveAttribute('data-piece','wn');
  await expect(square(page,'d5')).toHaveAttribute('data-piece','bq');
  await expect(page.locator('.review-banner')).toHaveCount(0);
  if (role === 'black') {
    await square(page,'d5').click(); await square(page,'a5').click();
    await expect.poll(() => fixture.writes.length).toBe(1);
    await expect(square(page,'a5')).toHaveAttribute('data-piece','bq');
  }
  await page.getByRole('button',{name:'Table controls',exact:true}).click();
  await page.getByRole('button',{name:'Flip board',exact:true}).click();
  await page.getByRole('button',{name:'Close table controls',exact:true}).click();
  await expect(page.locator('.board-stage .player-strip .loss-row').first()).toHaveAttribute('data-lost-color',colors[1]);
  expect(fixture.errors).toEqual([]);
});

test('review resets on takeback, replacement line and rematch; closing history returns to current game', async ({page}) => {
  const fixture = await table(page);
  await openHistory(page); await page.getByRole('button',{name:'Previous',exact:true}).click();
  fixture.update(['e4','d5','exd5']);
  await expect(page.locator('.review-banner')).toHaveCount(0);
  await page.getByRole('button',{name:'First',exact:true}).click();
  fixture.update(['d4','d5','c4']);
  await expect(page.locator('.review-banner')).toHaveCount(0);
  await expect(square(page,'c4')).toHaveAttribute('data-piece','wp');
  await page.getByRole('button',{name:'First',exact:true}).click();
  await openHistory(page);
  await expect(page.locator('.review-banner')).toHaveCount(0);
  await openHistory(page); await page.getByRole('button',{name:'First',exact:true}).click();
  fixture.update([],2);
  await expect(page.locator('.review-banner')).toHaveCount(0);
  await expect(page.locator('.board .chess-art')).toHaveCount(32);
  await expect(page.locator('[data-lost-color] [data-captured]')).toHaveCount(0);
  await openHistory(page);
  await expect(page.getByText('Your moves will appear here.',{exact:true})).toBeVisible();
  expect(fixture.writes).toEqual([]);
  expect(fixture.errors).toEqual([]);
});

test('review and both capture trays fit mobile and desktop with equal squares', async ({page}) => {
  const fixture = await table(page);
  await openHistory(page); await page.getByRole('button',{name:'Previous',exact:true}).click();
  await mkdir('output/playwright',{recursive:true});
  for (const width of [320,360,390,1280]) {
    await page.setViewportSize({width,height:width === 1280 ? 1000 : 866});
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    const boxes = await page.locator('.square').evaluateAll(elements => elements.map(e => { const r=e.getBoundingClientRect(); return [r.width,r.height]; }));
    expect(boxes).toHaveLength(64);
    for (const [w,h] of boxes) {expect(Math.abs(w-h)).toBeLessThan(.6); expect(Math.abs(w-boxes[0][0])).toBeLessThan(.6);}
    const controls = await page.locator('.review-navigation button').evaluateAll(elements => elements.map(e => e.getBoundingClientRect().height));
    expect(controls.every(height => height >= 44)).toBe(true);
    await expect(page.locator('body')).toHaveAttribute('data-atmosphere','emerald-enamel');
    await page.screenshot({path:`output/playwright/move-review-${width}.png`,fullPage:true});
  }
  expect(fixture.errors).toEqual([]);
});

test('spectator can inspect history but cannot move after returning', async ({page}) => {
  const fixture = await table(page,{role:'spectator'});
  await openHistory(page); await page.getByRole('button',{name:'First',exact:true}).click();
  await returnToGame(page);
  await expect(square(page,'g1')).toHaveAttribute('aria-disabled','true');
  await square(page,'g1').dispatchEvent('click'); await square(page,'f3').press('Enter');
  expect(fixture.writes).toEqual([]); expect(fixture.errors).toEqual([]);
});

test('keyboard review cancels a pending move confirmation', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('qk-play-preferences-v1', JSON.stringify({schema:1, confirm:true})));
  const fixture = await table(page);
  await square(page,'g1').click(); await square(page,'f3').click();
  await expect(page.getByRole('button',{name:'Confirm move',exact:true})).toBeVisible();
  // The confirmation overlay owns pointer input; keyboard navigation must also
  // safely discard this live proposal before showing a historical board.
  await page.locator('.board-history summary').press('Enter');
  await page.getByRole('button',{name:'First',exact:true}).press('Enter');
  await expect(page.getByRole('button',{name:'Confirm move',exact:true})).toHaveCount(0);
  await returnToGame(page);
  await expect(page.locator('.square-selected')).toHaveCount(0);
  expect(fixture.writes).toEqual([]); expect(fixture.errors).toEqual([]);
});

test('offline computer review preserves the current saved position across reload', async ({page,context}) => {
  const chess = new Chess(); opening.forEach(san => chess.move(san));
  const moves = chess.history({verbose:true}).map(({from,to,promotion,san}) => ({from,to,promotion,san}));
  await page.addInitScript(moves => {
    if (localStorage.getItem('review-save-seeded')) return;
    localStorage.setItem('review-save-seeded','yes');
    localStorage.setItem('qk-local-save-v1:guest',JSON.stringify({schema:2, color:'w',level:1,moves}));
  }, moves);
  await page.route('**/capabilities', route => route.fulfill({json:{protocol:2,new_games:'untimed',guest_play:true,variants:['standard']}}));
  await page.goto(url);
  await expect(page.getByText('Computer files saved for offline play',{exact:false})).toBeVisible({timeout:30000});
  await page.getByRole('button',{name:'Resume saved computer game',exact:true}).click();
  const saved = await page.evaluate(() => localStorage.getItem('qk-local-save-v1:guest'));
  await openHistory(page); await page.getByRole('button',{name:'First',exact:true}).click();
  await expect(square(page,'e2')).toHaveAttribute('data-piece','wp');
  expect(await page.evaluate(() => localStorage.getItem('qk-local-save-v1:guest'))).toBe(saved);
  await context.setOffline(true); await page.reload();
  await page.getByRole('button',{name:'Resume saved computer game',exact:true}).click();
  await expect(square(page,'d5')).toHaveAttribute('data-piece','bq');
  await expect(page.locator('[data-lost-color=w] [data-captured=p]')).toHaveCount(1);
  await expect(page.locator('.review-banner')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('qk-local-save-v1:guest'))).toBe(saved);
});
