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
const options=async p=>{await btn(p,'Open table controls').click();};
async function preferences(p){await options(p);await p.getByText('Preferences & diagnostics',{exact:true}).click();}


async function fits(page){
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const selectors=['.game-header','.board-stage>.board-frame','.player-strip:first-child','.player-strip[data-player-color=w]','.game-status','.main-game-actions'];
 for(const selector of selectors){const el=page.locator(selector).first();if(await el.count()&&await el.isVisible()){const r=await el.boundingBox();expect(r.y).toBeGreaterThanOrEqual(-1);expect(r.y+r.height).toBeLessThanOrEqual(await page.evaluate(()=>innerHeight)+1);}}
 const boxes=await page.locator('.board-stage>.board-frame .square').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height]}));expect(boxes).toHaveLength(64);for(const[w,h]of boxes){expect(Math.abs(w-h)).toBeLessThan(.6);expect(w).toBeGreaterThan(18);}
}
for(const role of ['white','black'])test(`portrait table fits without scrolling for ${role}`,async({page})=>{
 const f=await table(page,{role});
 for(const [width,height]of [[320,568],[360,640],[393,780],[390,844],[430,932]]){await page.setViewportSize({width,height});await fits(page);}
 await page.setViewportSize({width:393,height:780});await mkdir('output/playwright',{recursive:true});await page.screenshot({path:`output/playwright/phone-fit-${role}.png`});
 await options(page);await expect(page.getByRole('complementary',{name:'First game tips'})).toBeVisible();await btn(page,'Close table controls').click();
 if(role==='white'){await sq(page,'g1').click();await sq(page,'f3').click();await expect(sq(page,'f3')).toHaveAttribute('data-piece','wn');expect(f.writes).toHaveLength(1);}expect(f.errors).toEqual([]);
});
test('large text, crowded capture trays and final actions fit on short phones',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('qk-play-preferences-v1',JSON.stringify({schema:1,textSize:'large'})));
 const f=await table(page,{moves:['e4','d5','exd5','c6','dxc6','Nxc6']});await page.setViewportSize({width:360,height:640});await expect(page.locator('.capture-count')).toHaveText('×2');await fits(page);
 await page.locator('.player-strip').evaluateAll(panels=>{for(const panel of panels){const tray=panel.querySelector('.loss-tray'),piece=tray?.querySelector('.captured-piece');if(piece)for(let i=0;i<4;i++)tray.append(piece.cloneNode(true));}});await fits(page);await page.locator('.loss-tray').evaluateAll(trays=>{for(const tray of trays)while(tray.children.length>1)tray.lastElementChild.remove();});
 f.update(['f3','e5','g4','Qh4#']);await expect(btn(page,'Rematch')).toBeVisible();await fits(page);await btn(page,'Rematch').click();await expect(page.locator('.board .chess-art')).toHaveCount(32);await fits(page);await options(page);await btn(page,'Lock board').click();await expect(btn(page,'Hold to unlock')).toBeVisible();await fits(page);expect(f.errors).toEqual([]);
});
test('capture replay lives in options and keeps the live table fitted',async({page})=>{
 const f=await table(page,{moves:['e4','d5']});await page.setViewportSize({width:393,height:780});f.update(['e4','d5','exd5']);await expect(sq(page,'d5')).toHaveAttribute('data-piece','wp');await expect(btn(page,'Replay last capture')).toHaveCount(0);await fits(page);
 await options(page);await btn(page,'Replay last capture').click();await expect(page.getByRole('dialog',{name:'Capture replay',exact:true})).toBeVisible();await btn(page,'Close replay').click();await expect(page.getByRole('dialog',{name:'Table controls',exact:true})).toBeVisible();await btn(page,'Close table controls').click();await fits(page);expect(f.writes).toHaveLength(0);expect(f.errors).toEqual([]);
});
