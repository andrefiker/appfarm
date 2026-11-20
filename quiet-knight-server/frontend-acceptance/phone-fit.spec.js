import {test, expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {Chess} from '../frontend/node_modules/chess.js/dist/esm/chess.js';
const url = process.env.QK_FRONTEND_URL || 'http://127.0.0.1:3000/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url), 'isolated candidate only');
const opening = ['e4', 'd5', 'exd5', 'Qxd5'];

async function table(page, {role = 'white', moves = opening, accounts = false, guestOpponent = false} = {}) {
  let version = 1, number = 1, line = [...moves], release=null, hold=false, settled, code="REV001", swapped=false;
  const sockets = [], writes = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const room = () => {
    const chess = new Chess(); line.forEach(san => chess.move(san));
    const last = chess.history({verbose:true}).at(-1);
    return {code, score_event:settled, fen:chess.fen(), turn:chess.turn(), status:chess.isCheckmate()?'checkmate':'active', winner:chess.isCheckmate()?(chess.turn()==='w'?'b':'w'):null,
      version, game_number:number, series_score:{white:2,black:1,draws:1}, created_at:1, white_joined:true, black_joined:true,white_player:{handle:swapped?'Bob':'Alice',quiet_points:0,...(accounts&&(!guestOpponent||role==='white')?{id:swapped?'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb':'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}:{})},black_player:{handle:swapped?'Alice':'Bob',quiet_points:0,...(accounts&&(!guestOpponent||role==='black')?{id:swapped?'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa':'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}:{})},
      moves:[...line], last_move:last ? {from:last.from, to:last.to, san:last.san} : null};
  };
  await page.route('**/capabilities', route => route.fulfill({json:{protocol:2, new_games:'untimed', guest_play:true, variants:['standard']}}));
  await page.route(/\/rooms(?:\/REV00[12](?:\/[^/?]+)?)?$/, async route => {
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
  return {writes, errors, hold(){hold=true;},release(){hold=false;release?.();}, nextRoom({swap=false}={}){code="REV002";line=[...opening];number=1;version++;settled=undefined;swapped=swap;if(swap)role=role==="white"?"black":"white";}, update(next, gameNumber = number, event) {
    line = [...next]; number = gameNumber; version++;settled=event;
    for (const socket of sockets) {
      socket.send(JSON.stringify({type:'room.update', room:room()}));
      socket.send(JSON.stringify({type:'seat.role', role, game_number:number}));
    }
  }};
}
const btn=(p,name)=>p.getByRole('button',{name,exact:true});
const sq=(p,s)=>p.locator(`.board-stage [data-square=${s}]`);
const options=async p=>{await btn(p,'Open table controls').click();};
async function preferences(p){await options(p);await p.getByText('Preferences & diagnostics',{exact:true}).click();}

test('saved computer games recover the board without stored SAN',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('qk-local-save-v1:guest',JSON.stringify({moves:[{from:'e2',to:'e4'},{from:'d7',to:'d5'},{from:'e4',to:'d5'},{from:'d8',to:'d5'}],color:'w',level:2})));
 await page.goto(url);await btn(page,'Resume saved computer game').click();
 await expect(sq(page,'d5')).toHaveAttribute('data-piece','bq');
 await fits(page);
});


async function fits(page){
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const selectors=['.game-header','.board-stage>.board-frame','.player-strip:first-child','.player-strip[data-player-color=w]','.game-status','.lifetime-score','.main-game-actions','.quick-game-actions'];
 for(const selector of selectors){const el=page.locator(selector).first();if(await el.count()&&await el.isVisible()){const r=await el.boundingBox();expect(r.y).toBeGreaterThanOrEqual(-1);expect(r.y+r.height).toBeLessThanOrEqual(await page.evaluate(()=>innerHeight)+1);}}
 const boxes=await page.locator('.board-stage>.board-frame .square').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height]}));expect(boxes).toHaveLength(64);for(const[w,h]of boxes){expect(Math.abs(w-h)).toBeLessThan(.6);expect(w).toBeGreaterThan(18);}
}
for(const role of ['white','black'])test(`portrait table fits without scrolling for ${role}`,async({page})=>{
 const f=await table(page,{role});await expect(page.getByLabel('Lifetime scoreboard')).toContainText('Sign in, then play in a new room.');
 for(const [width,height]of [[320,568],[360,640],[393,780],[390,844],[430,932]]){await page.setViewportSize({width,height});await fits(page);}
 await page.setViewportSize({width:393,height:780});await mkdir('output/playwright',{recursive:true});await page.screenshot({path:`output/playwright/phone-fit-${role}.png`});
 await options(page);await expect(page.getByRole('complementary',{name:'First game tips'})).toBeVisible();await btn(page,'Close table controls').click();
 if(role==='white'){await sq(page,'g1').click();await sq(page,'f3').click();await expect(sq(page,'f3')).toHaveAttribute('data-piece','wn');expect(f.writes).toHaveLength(1);}expect(f.errors).toEqual([]);
});
test('large text and final actions fit on short phones without capture trays',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('qk-play-preferences-v1',JSON.stringify({schema:1,textSize:'large',rematchColors:'same'})));
 const f=await table(page,{moves:['e4','d5','exd5','c6','dxc6','Nxc6']});
 await page.setViewportSize({width:360,height:640});
 await expect(page.locator('.board-stage .player-material-row,.board-stage .loss-tray,.board-stage .capture-count')).toHaveCount(0);
 await fits(page);
 f.update(['f3','e5','g4','Qh4#']);await expect(btn(page,'Rematch')).toBeVisible();await fits(page);await expect(btn(page,'Rematch')).toContainText('Swap sides');await btn(page,'Rematch').click();await expect(page.locator('.board .chess-art')).toHaveCount(32);expect(f.writes).toHaveLength(1);expect(f.writes[0]).toMatchObject({colors:'swap',game_number:1});expect(f.writes[0].action).toBeUndefined();expect(new URL(page.url()).searchParams.get('room')).toBe('REV001');await fits(page);await options(page);await btn(page,'Lock board').click();await expect(btn(page,'Hold to unlock')).toBeVisible();await fits(page);expect(f.errors).toEqual([]);
});
test('capture replay lives in options and keeps the live table fitted',async({page})=>{
 const f=await table(page,{moves:['e4','d5']});await page.setViewportSize({width:393,height:780});f.update(['e4','d5','exd5']);await expect(sq(page,'d5')).toHaveAttribute('data-piece','wp');await expect(btn(page,'Replay last capture')).toHaveCount(0);await fits(page);
 await options(page);await btn(page,'Replay last capture').click();await expect(page.getByRole('dialog',{name:'Capture replay',exact:true})).toBeVisible();await btn(page,'Close replay').click();await expect(page.getByRole('dialog',{name:'Table controls',exact:true})).toBeVisible();await btn(page,'Close table controls').click();await fits(page);expect(f.writes).toHaveLength(0);expect(f.errors).toEqual([]);
});

test('lifetime scoreboard follows signed-in players between rooms and updates only once settled',async({page})=>{
 const me='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', rival='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', path='/players/'+me+'/head-to-head/'+rival;
 await page.addInitScript(()=>localStorage.setItem('qk-player-token-v1','x'.repeat(43)));
 const requests=[];let wins=7;
 await page.route(/\/players\/.*\/head-to-head\//,route=>{
   requests.push({path:new URL(route.request().url()).pathname,auth:route.request().headers().authorization});
   return route.fulfill({json:{wins,losses:5,draws:3}});
 });
 const f=await table(page,{accounts:true,role:'black'});
 const score=page.getByLabel('Lifetime scoreboard');
 await expect(score).toContainText('You 7');
 await expect(score).toContainText('Alice 5');
 await expect(score).toContainText('Draws 3');
 expect(requests).toEqual([{path,auth:'Bearer '+'x'.repeat(43)}]);
 f.update(['f3','e5','g4','Qh4#']);
 await expect(score).toContainText('Saving result');
 expect(requests).toHaveLength(1);
 wins=8;
 f.update(['f3','e5','g4','Qh4#'],1,{id:'confirmed-game-event',scored:false,reason:'Casual rematch',white_points:0,black_points:0,result:'0-1'});
 await expect(score).toContainText('You 8');
 expect(requests).toHaveLength(2);
 f.nextRoom({swap:true});
 await btn(page,'Leave game').click();
 await btn(page,'Leave table').click();
 await btn(page,'Create live game').click();
 await expect(score).toContainText('You 8');
 await expect.poll(()=>requests.length).toBe(3);
 expect(requests[2]).toEqual({path,auth:"Bearer "+"x".repeat(43)});
 await page.setViewportSize({width:393,height:780});await fits(page);await mkdir('output/playwright',{recursive:true});await page.screenshot({path:'output/playwright/lifetime-scoreboard.png'});expect(f.errors).toEqual([]);
});


test('guest opponent has a visible scoreboard explanation and the top link copies the correct room',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__copiedGameLink=text;}}}));
 const f=await table(page,{accounts:true,guestOpponent:true,role:'white'});
 const score=page.getByLabel('Lifetime scoreboard');
 await expect(score.getByText('Lifetime score',{exact:true})).toBeVisible();
 await expect(score).toContainText('Opponent must sign in');
 await expect(score).not.toContainText('Draws 0');
 await page.setViewportSize({width:320,height:568});
 const copy=btn(page,'Copy game link');
 await expect(copy).toBeVisible(); await expect(copy).toHaveCSS('width','44px');
 const box=await copy.boundingBox();
 expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x+box.width).toBeLessThanOrEqual(320);
 await copy.click();
 await expect.poll(()=>page.evaluate(()=>window.__copiedGameLink)).toBe(new URL('?room=REV001',url).href);
 await expect(page.getByText('Invite copied. Send it to your friend.')).toBeVisible();
 await fits(page);expect(f.errors).toEqual([]);
});

test('discrete legal move dots return for older preferences and can still be disabled later',async({page})=>{
 await page.addInitScript(()=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('qk-play-preferences-v1',JSON.stringify({schema:1,hints:false}));sessionStorage.setItem('seeded','1');}});
 const f=await table(page);await sq(page,'d2').click();await expect(sq(page,'d3').locator('.target-dot')).toBeVisible();await expect(sq(page,'d4').locator('.target-dot')).toBeVisible();await expect(sq(page,'d3').locator('.target-dot')).toHaveCSS('background-color','rgb(255, 48, 56)');
 await options(page);await page.getByText('Preferences & diagnostics',{exact:true}).click();await page.getByLabel('Legal destination previews',{exact:true}).uncheck();await btn(page,'Close table controls').click();await expect(page.locator('.target-dot')).toHaveCount(0);await page.reload();await options(page);await page.getByText('Preferences & diagnostics',{exact:true}).click();await expect(page.getByLabel('Legal destination previews',{exact:true})).not.toBeChecked();expect(f.errors).toEqual([]);
});
test('captures do not show material points, trays or piece counters on the game screen',async({page})=>{
 const f=await table(page);await page.setViewportSize({width:393,height:780});
 const clutter=page.locator('.board-stage .player-material,.board-stage .player-material-row,.board-stage .loss-tray,.board-stage .piece-capture-mark');
 await expect(clutter).toHaveCount(0);
 f.update(['e4','d5','exd5','c6','dxc6']);
 await expect(sq(page,'c6')).toHaveAttribute('data-piece','wp');
 await expect(clutter).toHaveCount(0);await fits(page);
 await options(page);
 await expect(page.getByLabel('Material points',{exact:true})).toBeVisible();
});

test('portrait gets more playable board width and taller tile-contained sculptures',async({page})=>{
 await table(page);
 await page.setViewportSize({width:390,height:844});await fits(page);
 const board=page.locator('.board-stage > .board-frame .board');
 const widened=await board.boundingBox();
 expect(widened.width).toBeGreaterThanOrEqual(382);
 expect(Math.abs(widened.width-widened.height)).toBeLessThan(0.6);
 const original=await page.addStyleTag({content:'.mobile-table.game-shell{padding-inline:4px!important}.mobile-table .board-stage>.board-frame{padding:3px!important}'});
 await expect.poll(async()=> (await board.boundingBox()).width).toBeLessThanOrEqual(374);
 const baseline=await board.boundingBox();
 expect(widened.width-baseline.width).toBeGreaterThanOrEqual(8);
 await original.evaluate(el=>el.remove());await expect.poll(async()=> (await board.boundingBox()).width).toBe(widened.width);
 for(const [tile,height] of [['a2',71],['g1',93],['c1',94],['a1',83],['d1',95],['e1',97]]){
   const inner=sq(page,tile).locator('.sculptor-piece > svg');
   await expect(inner).toHaveAttribute('height',String(height));
   expect(height+Number(await inner.getAttribute('y'))).toBe(98);
 }
 for(const [width,height] of [[320,568],[360,640],[393,780]]){await page.setViewportSize({width,height});await fits(page);}
});
for(const optedIn of [false,true])test('confirmed online turn vibration opt-in = '+optedIn,async({page})=>{
 await page.addInitScript(optedIn=>{
  localStorage.setItem('qk-play-preferences-v1',JSON.stringify(optedIn?{schema:1,turnVibration:true}:{schema:1}));
  window.__turnPulses=[];
  window.QuietKnightHaptics={postMessage:kind=>window.__turnPulses.push(kind)};
 },optedIn);
 const f=await table(page,{moves:['e4']});
 const pulses=()=>page.evaluate(()=>window.__turnPulses.filter(kind=>kind==='turn'));
 f.update(['e4','e5']);
 await expect(sq(page,'e5')).toHaveAttribute('data-piece','bp');
 await expect.poll(pulses).toEqual(optedIn?['turn']:[]);
 f.update(['e4','e5']);
 await expect.poll(pulses).toEqual(optedIn?['turn']:[]);
 await page.evaluate(()=>window.dispatchEvent(new Event('qk-background')));
 f.update(['e4','e5','Nf3']);
 await expect(sq(page,'f3')).toHaveAttribute('data-piece','wn');
 f.update(['e4','e5','Nf3','Nc6']);
 await expect(sq(page,'c6')).toHaveAttribute('data-piece','bn');
 await expect.poll(pulses).toEqual(optedIn?['turn']:[]);
 expect(f.errors).toEqual([]);
});
test('tap lifetime scoreboard for private pair history and persistent pin',async({page})=>{
 const alice='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', bob='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', carol='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 await page.addInitScript(()=>localStorage.setItem('qk-player-token-v1','x'.repeat(43)));
 await page.route(/\/players\/.*\/head-to-head\//,route=>route.fulfill({json:{wins:7,losses:5,draws:3}}));
 await page.route('**/players/me',route=>route.fulfill({json:{player:{registered:true,id:bob,handle:'Bob'},games:[
   {id:'latest',white_player_id:alice,black_player_id:bob,result:'0-1',ended_at:'2026-11-20T01:00:00Z',moves:[{san:'e4'},{san:'e5'},{san:'d4'}]},
   {id:'draw',white_player_id:bob,black_player_id:alice,result:'1/2-1/2',ended_at:'2026-11-18T01:00:00Z'},
   {id:'unrelated',white_player_id:bob,black_player_id:carol,result:'0-1',ended_at:'2026-11-19T01:00:00Z'}
 ]}}));
 const f=await table(page,{accounts:true,role:'black'});
 const score=page.getByRole('button',{name:/Lifetime scoreboard:/});
 await score.click();
 const dialog=page.getByRole('dialog',{name:'You vs Alice',exact:true});
 const list=dialog.getByRole('list',{name:'Recent games together'});
 await expect(list.getByRole('listitem')).toHaveCount(2);
 await expect(list.getByRole('listitem').first()).toContainText('Win');
 await expect(list.getByRole('listitem').first()).toContainText('2 moves');
 await expect(list.getByRole('listitem').last()).toContainText('Draw');
 await expect(list).not.toContainText('Loss');
 await dialog.getByRole('button',{name:'Pin Alice',exact:true}).click();
 await expect(dialog.getByRole('button',{name:'Unpin opponent',exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await expect(score).toBeFocused();
 await page.goto(url);
 const homePin=page.getByRole('region',{name:'Pinned opponent'});
 await expect(homePin).toBeVisible();
 await homePin.getByRole('button',{name:/Lifetime scoreboard:/}).click();
 await dialog.getByRole('button',{name:'Unpin opponent',exact:true}).click();
 await expect(homePin).toHaveCount(0);
 await page.reload();
 await expect(homePin).toHaveCount(0);
 expect(f.errors).toEqual([]);
});