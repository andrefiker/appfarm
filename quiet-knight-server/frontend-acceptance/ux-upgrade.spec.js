import {test, expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {Chess} from '../frontend/node_modules/chess.js/dist/esm/chess.js';
const url = process.env.QK_FRONTEND_URL || 'http://127.0.0.1:3000/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url), 'isolated candidate only');
const opening = ['e4', 'd5', 'exd5', 'Qxd5'];

async function table(page, {role = 'white', moves = opening} = {}) {
  let version = 1, number = 1, line = [...moves], release=null, hold=false;
  const sockets = [], writes = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const room = () => {
    const chess = new Chess(); line.forEach(san => chess.move(san));
    const last = chess.history({verbose:true}).at(-1);
    return {code:'REV001', fen:chess.fen(), turn:chess.turn(), status:chess.isCheckmate()?'checkmate':'active', winner:chess.isCheckmate()?(chess.turn()==='w'?'b':'w'):null,
      version, game_number:number, created_at:1, white_joined:true, black_joined:true,white_player:{handle:'Alice',quiet_points:0},black_player:{handle:'Bob',quiet_points:0},
      moves:[...line], last_move:last ? {from:last.from, to:last.to, san:last.san} : null};
  };
  await page.route('**/capabilities', route => route.fulfill({json:{protocol:2, new_games:'untimed', guest_play:true, variants:['standard']}}));
  await page.route(/\/rooms(?:\/REV001(?:\/[^/?]+)?)?$/, async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/move')) {
      const payload = route.request().postDataJSON(); writes.push(payload);if(hold)await new Promise(resolve=>{release=resolve;});
      const chess = new Chess(); line.forEach(san => chess.move(san));
      line.push(chess.move({from:payload.from, to:payload.to, promotion:payload.promotion}).san);
      version++;
      for (const socket of sockets) socket.send(JSON.stringify({type:'room.update', room:room()}));
    }
    if(path.endsWith('/rematch')){writes.push(route.request().postDataJSON());line=[];number++;version++;}
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
  return {writes, errors, hold(){hold=true;},release(){hold=false;release?.();}, update(next, gameNumber = number) {
    line = [...next]; number = gameNumber; version++;
    for (const socket of sockets) {
      socket.send(JSON.stringify({type:'room.update', room:room()}));
      socket.send(JSON.stringify({type:'seat.role', role, game_number:number}));
    }
  }};
}
const btn=(p,name)=>p.getByRole('button',{name,exact:true});
const sq=(p,s)=>p.locator(`.board-stage [data-square=${s}]`);
const options=async p=>{await btn(p,'Table controls').click();};
async function preferences(p){await options(p);await p.getByText('Preferences & diagnostics',{exact:true}).click();}

test('compact strips, original pieces and large text fit equal squares in both orientations',async({page})=>{
 const f=await table(page);await btn(page,'Dismiss tips').click();
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});await expect(page.locator('.player-strip')).toHaveCount(2);await expect(page.locator('.player-active')).toHaveAttribute('data-player-color','w');await expect(page.locator('.turn-label')).toHaveText('Your turn');await expect(page.locator('.board .faceted-piece')).toHaveCount(30);
 const boxes=await page.locator('.square').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return[r.width,r.height];}));for(const[w,h]of boxes)expect(Math.abs(w-h)).toBeLessThan(.6);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);}
 await page.setViewportSize({width:390,height:844});await mkdir('output/playwright',{recursive:true});await page.screenshot({path:'output/playwright/ux-table-390.png',fullPage:true});
 await preferences(page);await page.getByLabel('Text size',{exact:true}).selectOption('large');await page.getByText('Square coordinates',{exact:true}).locator('..').locator('input').check();await btn(page,'Close table controls').click();await page.setViewportSize({width:320,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await expect(page.locator('.square-coordinate').first()).toBeVisible();
 await mkdir('output/playwright',{recursive:true});await page.screenshot({path:'output/playwright/ux-large-320.png',fullPage:true});
 await options(page);await btn(page,'Flip board').click();await btn(page,'Close table controls').click();await expect(page.locator('.player-strip').first()).toHaveAttribute('data-player-color','w');expect(f.errors).toEqual([]);
});

test('drag previews legal destination, cancellation does not move, confirmation waits',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('qk-play-preferences-v1',JSON.stringify({schema:1,confirm:true})));
 const f=await table(page);const from=await sq(page,'g1').boundingBox(),to=await sq(page,'f3').boundingBox();
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:5});await expect(sq(page,'f3')).toHaveClass(/square-drop-valid/);await page.keyboard.press('Escape');await page.mouse.up();expect(f.writes).toHaveLength(0);await expect(page.locator('.square-drop-valid')).toHaveCount(0);
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:5});await page.mouse.up();await expect(btn(page,'Confirm move')).toBeVisible();expect(f.writes).toHaveLength(0);await btn(page,'Cancel move').click();
 await sq(page,'g1').click();await sq(page,'f3').click();await btn(page,'Confirm move').click();await expect(sq(page,'f3')).toHaveAttribute('data-piece','wn');expect(f.writes).toHaveLength(1);expect(f.errors).toEqual([]);
});

test('board lock blocks taps until deliberate hold; tips stay dismissed',async({page})=>{
 const f=await table(page);await btn(page,'Next tip').click();await expect(page.getByRole('complementary',{name:'First game tips'})).toContainText('Move history');await btn(page,'Dismiss tips').click();await options(page);await btn(page,'Lock board').click();await expect(page.locator('.square[aria-disabled=true]')).toHaveCount(64);await sq(page,'g1').dispatchEvent('click');await sq(page,'f3').dispatchEvent('click');expect(f.writes).toHaveLength(0);
 await btn(page,'Hold to unlock').click();await expect(btn(page,'Hold to unlock')).toBeVisible();await btn(page,'Hold to unlock').focus();await page.keyboard.down('Space');await expect(btn(page,'Hold to unlock')).toHaveCount(0);await page.keyboard.up('Space');await expect(sq(page,'g1')).toHaveAttribute('aria-disabled','false');
 await page.reload();await expect(page.getByRole('complementary',{name:'First game tips'})).toHaveCount(0);expect(f.errors).toEqual([]);
});

test('timeline never submits moves and returns to latest canonical position',async({page})=>{
 const f=await table(page);await options(page);await page.locator('.board-history summary').click();await page.getByLabel('Review timeline').fill('2');await expect(sq(page,'d5')).toHaveAttribute('data-piece','bp');await expect(page.locator('.review-banner')).toContainText('Position 2 of 4');f.update([...opening,'Nc3']);await expect(page.locator('.review-banner')).toContainText('Position 2 of 5');await page.locator('.review-banner').getByRole('button',{name:'Return to game'}).click();await expect(sq(page,'c3')).toHaveAttribute('data-piece','wn');expect(f.writes).toHaveLength(0);
});

test('pending move retains old position; reconnect restores explicit playable state',async({page,context})=>{
 const f=await table(page);f.hold();await sq(page,'g1').click();await sq(page,'f3').click();await expect(page.locator('.connection-notice')).toContainText('waiting for server confirmation');await expect(sq(page,'g1')).toHaveAttribute('data-piece','wn');f.release();await expect(sq(page,'f3')).toHaveAttribute('data-piece','wn');await expect(page.locator('.connection-notice')).toHaveCount(0);
 await context.setOffline(true);await expect(page.locator('.connection-notice')).toContainText('last confirmed position');await expect(page.locator('.square[aria-disabled=true]')).toHaveCount(64);await context.setOffline(false);await expect(btn(page,'Connection: Live. Reconnect')).toBeVisible();expect(f.errors).toEqual([]);
});

test('battery and rematch preferences persist; finished game offers all next actions',async({page})=>{
 const f=await table(page,{moves:['f3','e5','g4','Qh4#']});await expect(page.getByRole('group',{name:'Chess board, White at bottom'})).toBeVisible();await expect(page.getByRole('button',{name:'Review game',exact:true})).toBeVisible();await expect(btn(page,'New opponent')).toBeVisible();await expect(page.locator('.end-reason')).toContainText('Checkmate');
 await preferences(page);await page.getByText('Battery saver',{exact:true}).locator('..').locator('input').check();await page.getByLabel('Rematch colors',{exact:true}).selectOption('same');await btn(page,'Close table controls').click();await btn(page,'Rematch').click();await expect.poll(()=>f.writes.at(-1)?.colors).toBe('same');await expect(page.locator('.board .chess-art')).toHaveCount(32);await page.reload();await expect(page.locator('body')).toHaveAttribute('data-battery','true');const prefs=await page.evaluate(()=>JSON.parse(localStorage.getItem('qk-play-preferences-v1')));expect(prefs.rematchColors).toBe('same');expect(prefs.think).toBe(250);expect(f.errors).toEqual([]);
});

test('practice hints reveal in stages and promotion preview never commits early',async({page})=>{
 await page.goto(url);await btn(page,'Study, puzzles & Chess960').click();await btn(page,'training').click();await page.getByRole('button',{name:/Underpromotion fork · difficulty/}).click();await btn(page,'Hint').click();await expect(page.locator('.practice-ladder')).not.toContainText('g8=N');await btn(page,'Show a plan').click();await expect(page.locator('.practice-ladder')).toContainText('Promote to a knight');await btn(page,'Reveal move').click();await expect(page.locator('.practice-ladder')).toContainText('g8=N+');
 await page.locator('[data-square=g7]').click();await page.locator('[data-square=g8]').click();await btn(page,'Promote to knight').click();await expect(page.locator('[data-square=g7]')).toHaveAttribute('data-piece','wp');await expect(page.getByRole('region',{name:'Promotion preview'})).toContainText('Jumps in an L');await btn(page,'Confirm promotion').click();await expect(page.locator('[data-square=g8]')).toHaveAttribute('data-piece','wn');await expect(page.getByText(/^Solved\./)).toBeVisible();await expect(page.locator('.practice-ladder')).toHaveCount(0);
});

test('saved game search finds opponent and result without changing archive',async({page})=>{
 const f=await table(page);await expect.poll(()=>page.evaluate(async()=>new Promise(resolve=>{const r=indexedDB.open('quiet-knight-move-archive-v1');r.onsuccess=()=>{const t=r.result.transaction('games'),q=t.objectStore('games').count();q.onsuccess=()=>{resolve(q.result);r.result.close();};};}))).toBeGreaterThan(0);
 await options(page);await btn(page,'Move archive & export').click();await page.getByLabel('Search saved games').fill('bob');await expect(page.locator('.archive-results li')).toHaveCount(1);await page.getByLabel('Filter game result').selectOption('1-0');await expect(page.locator('.archive-results li')).toHaveCount(0);await page.getByLabel('Filter game result').selectOption('*');await expect(page.locator('.archive-results li')).toHaveCount(1);await page.getByLabel('Search saved games').fill('no-such-player');await expect(page.locator('.archive-results li')).toHaveCount(0);expect(f.writes).toHaveLength(0);
});

 test('resign opens a separate confirmation and cancel keeps the game',async({page})=>{const f=await table(page);await options(page);await btn(page,'Resign').click();await expect(page.getByRole('dialog',{name:'Table controls',exact:true})).not.toBeVisible();await expect(page.getByRole('heading',{name:/Resign/})).toBeVisible();await btn(page,'Keep playing').click();await expect(sq(page,'g1')).toHaveAttribute('data-piece','wn');expect(f.writes).toHaveLength(0);});

test('larger symmetric captured trays and secondary panels live in options',async({page})=>{
 const f=await table(page);await expect(page.locator('.status-your-turn h2')).toHaveCSS('font-size','24px');await expect(page.locator('.status-your-turn h2')).toHaveCSS('font-weight','800');
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:900});
  await expect(page.locator('.table-below .board-history,.table-below .live-captures')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Watch game movie',exact:true})).toBeHidden();
  const sizes=await page.locator('.player-material-row .captured-piece').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height]}));
  expect(sizes.length).toBeGreaterThanOrEqual(2);for(const [w,h] of sizes){expect(w).toBe(32);expect(h).toBe(38);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 }
 await page.setViewportSize({width:390,height:844});await mkdir('output/playwright',{recursive:true});await page.screenshot({path:'output/playwright/larger-trays-390.png',fullPage:true});
 await sq(page,'g1').click();await expect(page.locator('.target-dot').first()).toHaveCSS('background-color','rgb(255, 48, 56)');await sq(page,'g1').click();
 await options(page);await expect(page.locator('.table-sheet .board-history')).toBeVisible();await expect(page.locator('.table-sheet .material-panel')).toBeVisible();
 await btn(page,'Watch game movie').click();await expect(page.getByRole('dialog',{name:'Game movie',exact:true})).toBeVisible();await btn(page,'Close movie').click();if(!await page.locator('.table-sheet').isVisible())await options(page);
 await page.locator('.board-history summary').click();await page.getByLabel('Review timeline').fill('2');
 await expect(page.getByRole('dialog',{name:'Table controls',exact:true})).toBeHidden();await expect(page.locator('.review-banner')).toContainText('Position 2 of 4');
 await page.locator('.review-banner').getByRole('button',{name:'Previous',exact:true}).click();await expect(page.locator('.review-banner')).toContainText('Position 1 of 4');
 await page.locator('.review-banner').getByRole('button',{name:'Return to game',exact:true}).click();await expect(sq(page,'d5')).toHaveAttribute('data-piece','bq');expect(f.writes).toHaveLength(0);expect(f.errors).toEqual([]);
});
