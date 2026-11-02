import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {Chess} from 'chess.js';
test.setTimeout(45000);
const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:3000/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url),'isolated candidate only');
const button=(page,name)=>page.getByRole('button',{name,exact:true});
const sq=(page,s)=>page.locator(`[data-square=${s}]`).first();
async function tap(page,from,to){await sq(page,from).click();await sq(page,to).click();}
async function study(page,fen,prefs={}){
 await page.addInitScript(({fen,prefs})=>{
  if(localStorage.getItem('fun-seeded'))return;localStorage.setItem('fun-seeded','1');
  localStorage.setItem('qk-play-preferences-v1',JSON.stringify({schema:1,...prefs}));
  localStorage.setItem('qk-sound',prefs.__muted?'false':'true');
  localStorage.setItem('qk-study-v2:guest',JSON.stringify({schema:2,start:fen,moves:[],cursor:0,variant:'standard',mode:'analysis',human:'w',level:1}));
 },{fen,prefs});
 await page.goto(url);await button(page,'Study, puzzles & Chess960').click();
}
async function live(browser){
 await mkdir('output/playwright/fun-video',{recursive:true});
 const context=await browser.newContext({viewport:{width:390,height:1080},serviceWorkers:'block',recordVideo:{dir:'output/playwright/fun-video',size:{width:390,height:1080}}});
 const page=await context.newPage(),game=new Chess();game.move('e4');game.move('d5');
 const state={version:1,game_number:1,status:'active',winner:null},sockets=[],writes=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const view=()=>({code:'FUN001',created_at:1,...state,fen:game.fen(),turn:game.turn(),white_joined:true,black_joined:true,moves:game.history(),last_move:game.history({verbose:true}).at(-1)});
 const publish=()=>sockets.forEach(s=>{s.send(JSON.stringify({type:'room.update',room:view()}));s.send(JSON.stringify({type:'seat.role',role:'white',game_number:state.game_number,room_version:state.version}));});
 await page.route('**/capabilities',r=>r.fulfill({json:{protocol:2,new_games:'untimed',guest_play:true,variants:['standard']}}));
 await page.route(/\/rooms(?:\/FUN001(?:\/[^/?]+)?)?$/,async r=>{
  if(new URL(r.request().url()).pathname.endsWith('/move')){writes.push(r.request().postDataJSON());game.move(writes.at(-1));state.version++;publish();}
  await r.fulfill({json:{room:view(),role:'white',seat_token:'synthetic-fun-seat'}});
 });
 await page.routeWebSocket(/\/ws\?/,socket=>{sockets.push(socket);publish();socket.onMessage(publish);socket.onClose(()=>{const i=sockets.indexOf(socket);if(i>=0)sockets.splice(i,1);});});
 await page.goto(url);await button(page,'Create live game').click();await expect(button(page,'Connection: Live. Reconnect')).toBeVisible();
 return{page,context,game,state,writes,errors,publish,async close(){await context.close();}};
}

test('comic impact, tray landing and replay stay decorative; incoming moves close replay',async({browser})=>{
 const f=await live(browser),p=f.page;
 try{
  await tap(p,'e4','d5');await expect(p.locator('[data-effect=comic]')).toHaveText('BONK!');
  await expect(p.locator('[data-effect=tray-landing]')).toHaveCount(1);
  await p.waitForTimeout(550);await p.screenshot({path:'output/playwright/fun-capture.png',animations:'allow',fullPage:true});
  await expect(p.locator('[data-effect=tray-landing]')).toHaveCount(0);
  const fen=f.game.fen();await button(p,'Replay last capture').click();
  await expect(p.getByRole('dialog',{name:'Capture replay'})).toBeVisible();
  await expect(p.locator('.capture-replay-dialog [data-effect=comic]')).toHaveText('BONK!');
  await button(p,'Replay again').click();expect(f.game.fen()).toBe(fen);expect(f.writes).toHaveLength(1);
  await p.setViewportSize({width:320,height:950});await p.screenshot({path:'output/playwright/fun-replay-320.png',fullPage:true});
  expect(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  f.game.move('Qxd5');f.state.version++;f.publish();
  await expect(p.getByRole('dialog',{name:'Capture replay'})).not.toBeVisible();
  await expect(sq(p,'d5')).toHaveAttribute('data-piece','bq');
  await expect(p.locator('[data-effect=revenge]')).toHaveCount(1);
  await expect(p.locator('[data-effect=revenge]')).toHaveCount(0);
  expect(f.writes).toHaveLength(1);expect(f.errors).toEqual([]);
 }finally{await f.close();}
});

test('en passant uses the victim square and a sidestep; underpromotion gets its actual piece and crown',async({browser})=>{
 for(const promotion of [false,true]){
  const context=await browser.newContext({viewport:{width:320,height:950}}),p=await context.newPage();
  try{
   await study(p,promotion?'4k3/P7/8/8/8/8/8/4K3 w - - 0 1':'4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
   await button(p,'Flip board').click();
   await tap(p,promotion?'a7':'e5',promotion?'a8':'d6');
   if(promotion){await button(p,'Promote to knight').click();await expect(sq(p,'a8')).toHaveAttribute('data-piece','wn');await expect(p.locator('[data-effect=crown]')).toHaveCount(1);}
   else{await expect(sq(p,'d5').locator('.capture-sneak')).toHaveCount(1);await expect(p.locator('.travel-sneak,[data-effect=sneak]')).toHaveCount(2);}
   await p.waitForTimeout(500);await p.screenshot({path:`output/playwright/fun-${promotion?'promotion':'en-passant'}.png`,fullPage:true,animations:'allow'});
   await expect(p.locator('[data-effect=crown],[data-effect=sneak]')).toHaveCount(0);
  }finally{await context.close();}
 }
});

test('the checkmating piece celebrates once; review and reload do not repeat it',async({page})=>{
 await study(page,'7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');await tap(page,'f7','g7');
 await expect(sq(page,'g7').locator('[data-effect=pose-q]')).toHaveCount(1);
 await expect(page.locator('[data-effect=pose-q]')).toHaveCount(0);
 await button(page,'Previous position').click();await button(page,'Live local position').click();
 await expect(page.locator('[data-effect=pose-q]')).toHaveCount(0);
 await page.reload();await button(page,'Study, puzzles & Chess960').click();await expect(page.locator('[data-effect=pose-q]')).toHaveCount(0);
});

test('draw bows and a server-confirmed rematch animate once, never on reload',async({browser})=>{
 const f=await live(browser),p=f.page;
 try{
  f.state.status='draw';f.state.version++;f.publish();
  await expect(p.locator('[data-effect=handshake]')).toHaveCount(2);
  await expect(p.locator('[data-effect=handshake]')).toHaveCount(0);
  f.game.reset();f.state.status='active';f.state.game_number++;f.state.version++;f.publish();
  await expect(p.locator('[data-effect=entrance]')).toHaveCount(32);
  await p.waitForTimeout(400);await p.screenshot({path:'output/playwright/fun-rematch.png',fullPage:true,animations:'allow'});
  // A move is accepted while the entrance is still playing.
  await tap(p,'e2','e4');await expect(sq(p,'e4')).toHaveAttribute('data-piece','wp');
  await expect(p.locator('[data-effect=entrance]')).toHaveCount(0);
  await p.reload();await expect(p.locator('.square')).toHaveCount(64);
  await expect(p.locator('[data-effect=entrance],[data-effect=handshake]')).toHaveCount(0);expect(f.errors).toEqual([]);
 }finally{await f.close();}
});

test('individual fun preferences persist, leaving the underlying chess and master effects available',async({page})=>{
 await page.goto(url);await button(page,'Open settings').click();await page.getByText('Fun extras',{exact:true}).click();
 for(const label of ['Comic capture labels','Capture replay button','Captured-piece landing','En passant sneak','Promotion crown','Recapture spark','Checkmate piece poses','Draw handshake','Rematch entrance'])await page.getByLabel(label,{exact:true}).uncheck();
 await page.getByLabel('Personality sounds',{exact:true}).check();await page.getByText('Choose piece sounds',{exact:true}).click();
 await page.getByLabel('Knight hoofbeats',{exact:true}).uncheck();await page.reload();await button(page,'Open settings').click();await page.getByText('Fun extras',{exact:true}).click();
 await expect(page.getByLabel('Comic capture labels',{exact:true})).not.toBeChecked();await expect(page.getByLabel('Personality sounds',{exact:true})).toBeChecked();
 await page.getByText('Choose piece sounds',{exact:true}).click();await expect(page.getByLabel('Knight hoofbeats',{exact:true})).not.toBeChecked();await expect(page.getByLabel('Move animations',{exact:true})).toBeChecked();
});

for(const suppress of ['none','muted-piece','muted-master','quiet','reduced','master-off'])test(`personality audio and visual toggles: ${suppress}`,async({page})=>{
 await page.addInitScript(()=>{
  window.funAudioNotes=[];const original=AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator=function(){const node=original.call(this),start=node.start.bind(node);node.start=(...args)=>{window.funAudioNotes.push(node.type);return start(...args);};return node;};
 });
 if(suppress==='reduced')await page.emulateMedia({reducedMotion:'reduce'});
 await study(page,'4k3/8/8/3r4/4P3/8/8/4K3 w - - 0 1',{__muted:suppress==='muted-master',quiet:suppress==='quiet',playful:suppress!=='master-off',fun:{sounds:true,soundP:suppress!=='muted-piece',comic:false}});
 await tap(page,'e4','d5');await expect(sq(page,'d5')).toHaveAttribute('data-piece','wp');
 await expect(page.locator('[data-effect=comic]')).toHaveCount(0);
 if(suppress==='none')await expect.poll(()=>page.evaluate(()=>window.funAudioNotes.length)).toBeGreaterThan(0);
 else{await page.waitForTimeout(400);expect(await page.evaluate(()=>window.funAudioNotes.length)).toBe(0);}
});
