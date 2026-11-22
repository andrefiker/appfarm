import {test, expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {Chess} from '../frontend/node_modules/chess.js/dist/esm/chess.js';
const url = process.env.QK_FRONTEND_URL || 'http://127.0.0.1:3000/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url), 'isolated candidate only');
const opening = ['e4', 'd5', 'exd5', 'Qxd5'];

async function table(page, {role = 'white', moves = opening, accounts = false, guestOpponent = false, amateur = false} = {}) {
  let version = 1, number = 1, line = [...moves], release=null, hold=false, settled, code="REV001", swapped=false;
  const sockets = [], writes = [], errors = [], amateurCalls=[];
  let amateurEnabled=false, series={white:2,black:1,draws:1};
  page.on('pageerror', error => errors.push(error.message));
  const room = () => {
    const chess = new Chess(); line.forEach(san => chess.move(san));
    const last = chess.history({verbose:true}).at(-1);
    return {code, ...(amateur?{amateur:{available:true,enabled:amateurEnabled}}:{}), score_event:settled, fen:chess.fen(), turn:chess.turn(), status:chess.isCheckmate()?'checkmate':'active', winner:chess.isCheckmate()?(chess.turn()==='w'?'b':'w'):null,
      version, game_number:number, series_score:series, created_at:1, white_joined:true, black_joined:true,white_player:{handle:swapped?'Bob':'Alice',quiet_points:0,...(accounts&&(!guestOpponent||role==='white')?{id:swapped?'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb':'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}:{})},black_player:{handle:swapped?'Alice':'Bob',quiet_points:0,...(accounts&&(!guestOpponent||role==='black')?{id:swapped?'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa':'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}:{})},
      moves:[...line], last_move:last ? {from:last.from, to:last.to, san:last.san} : null};
  };
  await page.route('**/capabilities', route => route.fulfill({json:{protocol:2, new_games:'untimed', guest_play:true, variants:['standard']}}));
  await page.route(/\/rooms(?:\/REV00[12](?:\/[^/?]+)?)?$/, async route => {
    const path = new URL(route.request().url()).pathname;
    if(path.endsWith('/amateur')){
      const data=route.request().postDataJSON();amateurCalls.push(data);
      amateurEnabled=data.enabled;version++;
      for(const socket of sockets)socket.send(JSON.stringify({type:'room.update',room:room()}));
      return route.fulfill({json:{room:room()}});
    }
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
  return {writes, errors, amateurCalls, opponentAmateur(enabled){amateurEnabled=enabled;this.update(line,number,settled);}, hold(){hold=true;},release(){hold=false;release?.();}, nextRoom({swap=false}={}){code="REV002";line=[...opening];number=1;version++;settled=undefined;swapped=swap;if(swap)role=role==="white"?"black":"white";}, update(next, gameNumber = number, event) {
    if(gameNumber!==number)amateurEnabled=false;
    line = [...next]; number = gameNumber; version++;settled=event;
    for (const socket of sockets) {
      socket.send(JSON.stringify({type:'room.update', room:room()}));
      socket.send(JSON.stringify({type:'seat.role', role, game_number:number}));
    }
  }, score(next){series=next;this.update(line,number,settled);}};
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
 const selectors=['.game-header','.board-stage>.board-frame','.player-strip:first-child','.player-strip[data-player-color=w]','.game-status','.table-score','.lifetime-score','.main-game-actions','.quick-game-actions'];
 for(const selector of selectors){const el=page.locator(selector).first();if(await el.count()&&await el.isVisible()){const r=await el.boundingBox();expect(r.y).toBeGreaterThanOrEqual(-1);expect(r.y+r.height).toBeLessThanOrEqual(await page.evaluate(()=>innerHeight)+1);}}
 const boxes=await page.locator('.board-stage>.board-frame .square').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height]}));expect(boxes).toHaveLength(64);for(const[w,h]of boxes){expect(Math.abs(w-h)).toBeLessThan(.6);expect(w).toBeGreaterThan(18);}
}
for(const role of ['white','black'])test(`portrait table fits without scrolling for ${role}`,async({page})=>{
 const f=await table(page,{role});await expect(page.getByLabel('Lifetime scoreboard')).toHaveCount(0);
 for(const [width,height]of [[320,568],[360,640],[393,780],[390,844],[430,932]]){await page.setViewportSize({width,height});await fits(page);}
 await page.setViewportSize({width:393,height:780});await mkdir('output/playwright',{recursive:true});await page.screenshot({path:`output/playwright/phone-fit-${role}.png`});
 await options(page);await expect(page.getByRole('complementary',{name:'First game tips'})).toBeVisible();await btn(page,'Close table controls').click();
 if(role==='white'){await sq(page,'g1').click();await sq(page,'f3').click();await expect(sq(page,'f3')).toHaveAttribute('data-piece','wn');expect(f.writes).toHaveLength(1);}expect(f.errors).toEqual([]);
});
test('large text and final actions fit on short phones with compact lost-piece trays',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('qk-play-preferences-v1',JSON.stringify({schema:1,textSize:'large',rematchColors:'same'})));
 const f=await table(page,{moves:['e4','d5','exd5','c6','dxc6','Nxc6']});
 await page.setViewportSize({width:360,height:640});
 await expect(page.getByRole('group',{name:'Black lost pieces'}).getByRole('img',{name:/Pawn: 2/i})).toBeVisible();
 await expect(page.getByRole('group',{name:'White lost pieces'}).getByRole('img',{name:/Pawn: 1/i})).toBeVisible();
 await fits(page);
 f.update(['f3','e5','g4','Qh4#']);await expect(btn(page,'Rematch')).toBeVisible();await fits(page);await expect(btn(page,'Rematch')).toContainText('Swap sides');await btn(page,'Rematch').click();await expect(page.locator('.board .chess-art')).toHaveCount(32);expect(f.writes).toHaveLength(1);expect(f.writes[0]).toMatchObject({colors:'swap',game_number:1});expect(f.writes[0].action).toBeUndefined();expect(new URL(page.url()).searchParams.get('room')).toBe('REV001');await fits(page);await options(page);await btn(page,'Lock board').click();await expect(btn(page,'Hold to unlock')).toBeVisible();await fits(page);expect(f.errors).toEqual([]);
});
test('capture replay lives in options and keeps the live table fitted',async({page})=>{
 const f=await table(page,{moves:['e4','d5']});await page.setViewportSize({width:393,height:780});f.update(['e4','d5','exd5']);await expect(sq(page,'d5')).toHaveAttribute('data-piece','wp');await expect(btn(page,'Replay last capture')).toHaveCount(0);await fits(page);
 await options(page);await btn(page,'Replay last capture').click();await expect(page.getByRole('dialog',{name:'Capture replay',exact:true})).toBeVisible();await btn(page,'Close replay').click();await expect(page.getByRole('dialog',{name:'Table controls',exact:true})).toBeVisible();await btn(page,'Close table controls').click();await fits(page);expect(f.writes).toHaveLength(0);expect(f.errors).toEqual([]);
});

test('same-table scoreboard uses server totals, including guests and rematches, while landscape stays board-only',async({page})=>{
 await page.setViewportSize({width:393,height:873});
 const f=await table(page,{moves:[]});
 const score=page.getByRole('status',{name:'Table scoreboard'});
 await expect(score).toContainText('White 2');
 await expect(score).toContainText('Draws 1');
 await expect(score).toContainText('Black 1');
 await expect(page.getByLabel('Lifetime scoreboard')).toHaveCount(0);
 f.update(['f3','e5','g4','Qh4#']);
 f.score({white:2,black:2,draws:1});
 await expect(score).toContainText('Black 2');
 await btn(page,'Rematch').click();
 await expect(score).toContainText('Black 2');
 await expect(score).toContainText('White 2');
 f.score({white:2,black:3,draws:1});
 await expect(score).toContainText('Black 3');
 f.update(['e4','d5','exd5','Qxd5'],2);
 const loss=page.getByRole('group',{name:'Black lost pieces'});
 await expect(loss.getByRole('img',{name:/Pawn: 1/i})).toBeVisible();
 await page.setViewportSize({width:320,height:568});await fits(page);
 await page.setViewportSize({width:873,height:393});await expect(score).toBeHidden();await expect(loss).toBeHidden();
 await expect(page.locator('.board-stage .square')).toHaveCount(64);
 await page.setViewportSize({width:393,height:873});await expect(score).toContainText('Black 3');
 await expect(loss).toBeVisible();
 await expect(page.locator('.board-stage .square[data-square=d5]')).toHaveAttribute('data-piece','bq');
 await expect(page.locator('.board-stage .board .chess-art')).toHaveCount(30);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await mkdir('output/playwright',{recursive:true});
 await page.screenshot({path:'output/playwright/table-score-portrait.png'});
 expect(f.errors).toEqual([]);
});




test('guest opponent has no sign-in prompt and the top link copies the correct room',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__copiedGameLink=text;}}}));
 const f=await table(page,{accounts:true,guestOpponent:true,role:'white'});
 await expect(page.getByLabel('Lifetime scoreboard')).toHaveCount(0);
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
test('piece-value details stay in Options and not in the board header',async({page})=>{
 const f=await table(page);
 await expect(page.locator('.match-material')).toHaveCount(0);
 f.update(['e4','d5','exd5','c6','dxc6']);
 await expect(sq(page,'c6')).toHaveAttribute('data-piece','wp');
 await expect(page.locator('.match-material')).toHaveCount(0);
 await expect(page.getByRole('group',{name:'Black lost pieces'})).toBeVisible();
 await options(page);
 await expect(page.getByLabel('Material points',{exact:true})).toBeVisible();
});

test('portrait gets more playable board width and aligned tile-contained Staunton pieces',async({page})=>{
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
 const bases=[];
 for(const tile of ['a2','g1','c1','a1','d1','e1']){
   const inner=sq(page,tile).locator('[data-turned-wood]');
   await expect(inner).toBeVisible();
   bases.push(await inner.locator('g > path').nth(1).evaluate(el=> Math.round(el.getBoundingClientRect().bottom*10)/10));
 }
 expect(Math.abs(bases[1]-bases[0]-widened.width/8)).toBeLessThan(0.6);
 expect(Math.max(...bases.slice(1))-Math.min(...bases.slice(1))).toBeLessThan(0.6);
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

for(const role of ['white','black'])test(`Amateur Mode only marks ${role}'s threatened pieces and clears when disabled`,async({page})=>{
 const f=await table(page,{role,moves:['e4','d5'],amateur:true});await page.setViewportSize({width:393,height:873});
 await expect(btn(page,'Beginner Coach')).toHaveCount(0);
 const toggle=btn(page,'Amateur Mode');await expect(toggle).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('[data-threatened]')).toHaveCount(0);
 const own=sq(page,role==='white'?'e4':'d5'), other=sq(page,role==='white'?'d5':'e4');
 const normalFilter=await own.locator('.chess-art').evaluate(el=>getComputedStyle(el).filter);
 await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','true');
 await expect(toggle).toHaveAccessibleDescription('Each player sees only their own threatened pieces. No Quiet Points if used.');
 await expect(page.locator('[data-threatened=true]')).toHaveCount(1);
 await expect(own).toHaveAccessibleName(/pawn, under attack/);
 await expect(other).not.toHaveAccessibleName(/under attack/);
 const dot=own.locator('.amateur-threat-dot');
 await expect(dot).toHaveCSS('width','7px');
 await expect(own.locator('.chess-art')).toHaveCSS('filter',normalFilter);
 await expect(page.getByRole('button',{name:'Connection: Live. Reconnect',exact:true})).toHaveText('');
 expect(await page.locator('.game-title').evaluate(el=>getComputedStyle(el,'::after').content)).toBe('none');
 await fits(page);
 await page.setViewportSize({width:320,height:568});
 await fits(page);
 const status=await page.locator('.game-status h2').boundingBox();expect(status.width).toBeGreaterThan(65);expect(status.height).toBeLessThan(55);
 await page.setViewportSize({width:393,height:873});
 expect(f.amateurCalls).toEqual([{game_number:1,expected_version:1,seat_token:'synthetic-review-seat',enabled:true}]);
 if(role==='white'){
   await mkdir('output/playwright',{recursive:true});
   await page.screenshot({path:'output/playwright/Quiet-Knight-Amateur-Portrait.png',animations:'disabled'});
   await page.setViewportSize({width:873,height:393});
   await expect(toggle).toBeHidden();
   await expect(page.locator('.board-stage .board [data-square]')).toHaveCount(64);
   await expect(page.locator('[data-threatened=true]')).toHaveCount(1);
   await page.screenshot({path:'output/playwright/Quiet-Knight-Amateur-Landscape.png',animations:'disabled'});
   await page.setViewportSize({width:393,height:873});
 }
 f.update(['e4','d5','exd5']);await expect(page.locator('[data-threatened=true]')).toHaveCount(role==='white'?1:0);
 if(role==='white')await expect(sq(page,'d5')).toHaveAccessibleName(/White pawn, under attack/);
 await toggle.click();await expect(page.locator('[data-threatened]')).toHaveCount(0);
 expect(f.writes).toHaveLength(0);expect(f.errors).toEqual([]);
});
test('opponent activation is reflected in a seated client and resets on rematch',async({page})=>{
 const f=await table(page,{moves:['e4','d5'],amateur:true});
 f.opponentAmateur(true);
 await expect(btn(page,'Amateur Mode')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-threatened=true]')).toHaveCount(1);
 f.update(['e4','d5'],2);
 await expect(btn(page,'Amateur Mode')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('[data-threatened]')).toHaveCount(0);
 expect(f.amateurCalls).toHaveLength(0);
});
test('spectator cannot use Amateur Mode or see its red markings',async({page})=>{
 const f=await table(page,{role:'spectator',moves:['e4','d5'],amateur:true});
 f.opponentAmateur(true);
 await expect(btn(page,'Amateur Mode')).toHaveCount(0);
 await expect(page.locator('[data-threatened]')).toHaveCount(0);
 expect(f.amateurCalls).toHaveLength(0);
});
test('offline Amateur Mode toggles independently of the removed Coach and asks no server',async({page})=>{
 await page.route('**/capabilities',r=>r.fulfill({json:{protocol:2,new_games:'untimed',guest_play:true,variants:['standard']}}));
 await page.addInitScript(()=>localStorage.setItem('qk-local-save-v1:guest',JSON.stringify({moves:[{from:'e2',to:'e4'},{from:'d7',to:'d5'}],color:'w',level:2})));
 const requests=[];page.on('request',r=>{if(/\/(amateur|teaching)$/.test(r.url()))requests.push(r.url());});
 await page.goto(url);await btn(page,'Resume saved computer game').click();
 await expect(btn(page,'Beginner Coach')).toHaveCount(0);
 const toggle=btn(page,'Amateur Mode');await toggle.click();await expect(page.locator('[data-threatened=true]')).toHaveCount(1);
 await toggle.click();await expect(page.locator('[data-threatened]')).toHaveCount(0);expect(requests).toEqual([]);
});

test('clean table keeps scores, trays and invite but omits account and material chrome',async({page})=>{
 await page.setViewportSize({width:393,height:873});
 const f=await table(page);
 await expect(page.locator('.match-material')).toHaveCount(0);
 await expect(page.getByLabel('Lifetime scoreboard')).toHaveCount(0);
 await expect(page.getByRole('status',{name:'Table scoreboard'})).toContainText('White 2');
 await expect(page.getByRole('group',{name:'Black lost pieces'})).toBeVisible();
 await expect(btn(page,'Copy game link')).toBeVisible();
 await options(page);
 await page.getByText('Preferences & diagnostics',{exact:true}).click();
 await expect(page.getByRole('button',{name:/Knight ID|Sign in|Log in|Create Account/i})).toHaveCount(0);
 await btn(page,'Close table controls').click();
 await fits(page);
 await mkdir('output/playwright',{recursive:true});await page.screenshot({path:'output/playwright/clean-table-portrait.png'});
 await page.setViewportSize({width:873,height:393});
 await expect(sq(page,'h1')).toBeInViewport({ratio:.99});
 await expect(page.locator('.board-stage .square')).toHaveCount(64);
 await page.setViewportSize({width:393,height:873});
 await expect(sq(page,'d5')).toHaveAttribute('data-piece','bq');
 expect(f.errors).toEqual([]);
 await page.goto(url);
 await expect(btn(page,'Create live game')).toBeVisible();
 await expect(page.getByRole('button',{name:/Account \(optional\)|Sign in|Log in|Create Account/i})).toHaveCount(0);
});
