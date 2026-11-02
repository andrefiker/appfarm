import {test,expect} from '@playwright/test';
import {Chess} from 'chess.js';
import {mkdir} from 'node:fs/promises';
test.setTimeout(30000);
const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:3000/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url),'isolated candidate only');
const button=(p,name)=>p.getByRole('button',{name,exact:true});
const sq=(p,s)=>p.locator(`[data-square=${s}]`).first();
async function tap(p,a,b){await sq(p,a).click();await sq(p,b).click();}
async function seed(p,fen,prefs={}){
 await p.addInitScript(({fen,prefs})=>{if(localStorage.getItem('extra-seed'))return;localStorage.setItem('extra-seed','1');localStorage.setItem('qk-play-preferences-v1',JSON.stringify({schema:1,...prefs}));localStorage.setItem('qk-sound','true');localStorage.setItem('qk-study-v2:guest',JSON.stringify({schema:2,start:fen,moves:[],cursor:0,variant:'standard',mode:'analysis',human:'w',level:1}));},{fen,prefs});
 await p.goto(url);await button(p,'Study, puzzles & Chess960').click();
}
async function settings(p){await button(p,'Open settings').click();await p.getByText('Fun extras',{exact:true}).click();await p.getByText('More character',{exact:true}).click();}
async function live(browser,line=[]){
 const c=await browser.newContext({viewport:{width:390,height:1080},serviceWorkers:'block'}),p=await c.newPage(),game=new Chess();for(const san of line)game.move(san);
 const state={version:1,game_number:1,status:'active',winner:null},sockets=[],writes=[];
 const view=()=>({code:'MORE12',created_at:1,...state,fen:game.fen(),turn:game.turn(),white_joined:true,black_joined:true,moves:game.history(),last_move:game.history({verbose:true}).at(-1)});
 const publish=()=>sockets.forEach(s=>{s.send(JSON.stringify({type:'room.update',room:view()}));s.send(JSON.stringify({type:'seat.role',role:'white',game_number:state.game_number,room_version:state.version}));});
 await p.route('**/capabilities',r=>r.fulfill({json:{protocol:2,new_games:'untimed',guest_play:true,variants:['standard']}}));
 await p.route(/\/rooms(?:\/MORE12(?:\/[^/?]+)?)?$/,async r=>{if(r.request().method()==='POST')writes.push(r.request().url());await r.fulfill({json:{room:view(),role:'white',seat_token:'synthetic-extra-seat'}});});
 await p.routeWebSocket(/\/ws\?/,s=>{sockets.push(s);publish();s.onMessage(publish);});
 await p.goto(url);await button(p,'Create live game').click();await expect(button(p,'Connection: Live. Reconnect')).toBeVisible();
 return{p,c,game,state,writes,publish};
}

test('all twelve options persist and invalid stored enum values fall back safely',async({page:p})=>{
 await p.addInitScript(()=>{if(!localStorage.getItem('options-seed')){localStorage.setItem('options-seed','1');localStorage.setItem('qk-play-preferences-v1',JSON.stringify({schema:1,weather:'tornado',soundTheme:'noise'}));}});
 await p.goto(url);await settings(p);await expect(p.getByLabel('Board weather',{exact:true})).toHaveValue('off');await expect(p.getByLabel('Move sound theme',{exact:true})).toHaveValue('classic');
 const labels=['Last-pawn headband','King escape dodge','Long-move trails','Knight hoofprints','Pawn graduation details','Royal indignation','Victory photograph','Whole-game movie','Captured-piece audience','Playful home knight'];
 for(const label of labels)await p.getByLabel(label,{exact:true}).uncheck();
 await p.getByLabel('Board weather',{exact:true}).selectOption('fireflies');await p.getByLabel('Move sound theme',{exact:true}).selectOption('marble');await p.reload();await settings(p);
 for(const label of labels)await expect(p.getByLabel(label,{exact:true})).not.toBeChecked();
 await expect(p.getByLabel('Board weather',{exact:true})).toHaveValue('fireflies');await expect(p.getByLabel('Move sound theme',{exact:true})).toHaveValue('marble');
});

test('last-pawn headband, graduation and edge-only weather keep geometry and disappear on background',async({page:p})=>{
 await seed(p,'4k3/8/4P3/8/8/8/8/R3K3 w - - 0 1',{weather:'fireflies'});
 await expect(sq(p,'e6').locator('[data-effect=survivor]')).toHaveCount(1);await expect(sq(p,'e6').locator('[data-effect=graduation]')).toHaveAttribute('data-stage','3');
 await expect(p.locator('[data-weather=fireflies]')).toHaveCount(1);await mkdir('output/playwright',{recursive:true});await p.screenshot({path:'output/playwright/extra-pawn-weather.png',fullPage:true});
 const geometry=await p.locator('.board .square').evaluateAll(es=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
 expect(Math.max(...geometry.map(r=>Math.abs(r.w-r.h)))).toBeLessThan(1);expect(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await p.evaluate(()=>window.dispatchEvent(new Event('qk-background')));await expect(p.locator('[data-weather]')).toHaveCount(0);await expect(p.locator('[data-effect=survivor]')).toHaveCount(0);
 await p.evaluate(()=>window.dispatchEvent(new Event('qk-resume')));await expect(p.locator('[data-weather=fireflies]')).toHaveCount(1);
 await p.emulateMedia({reducedMotion:'reduce'});await expect(p.locator('[data-weather]')).toHaveCount(0);await expect(p.locator('[data-effect=graduation]')).toHaveCount(0);
});

for(const weather of ['rain','dust'])test(`weather ${weather} and Quiet Mode`,async({page:p})=>{
 await seed(p,'4k3/8/4P3/8/8/8/8/4K3 w - - 0 1',{weather});await expect(p.locator(`[data-weather=${weather}]`)).toHaveCount(1);await p.evaluate(()=>{const prefs=JSON.parse(localStorage.getItem('qk-play-preferences-v1'));localStorage.setItem('qk-play-preferences-v1',JSON.stringify({...prefs,quiet:true}));});await p.reload();await button(p,'Study, puzzles & Chess960').click();await expect(p.locator('[data-weather]')).toHaveCount(0);
});

test('long rook and bishop trails, knight L footprints, and both orientations',async({browser})=>{
 for(const[fen,from,to,effect]of[['4k3/8/8/8/8/8/8/R3K3 w - - 0 1','a1','a8','long-trail'],['4k3/p7/8/8/8/8/8/2B1K3 w - - 0 1','c1','g5','long-trail'],['4k3/p7/8/8/8/8/8/4K1N1 w - - 0 1','g1','f3','hoofprints']]){
  const c=await browser.newContext(),p=await c.newPage();try{await seed(p,fen);await button(p,'Flip board').click();await tap(p,from,to);await expect(p.locator(`[data-effect=${effect}]`)).toHaveCount(1);if(effect==='hoofprints')await expect(p.locator('.hoof-route')).toHaveAttribute('d','M1.5 0.5L1.5 2.5L2.5 2.5');await expect(p.locator(`[data-effect=${effect}]`)).toHaveCount(0);}finally{await c.close();}
 }
});

test('checked king ducks on escape; newly checked king adjusts its crown',async({browser})=>{
 for(const[fen,from,to,effect]of[['4r1k1/8/8/8/8/8/8/4K3 w - - 0 1','e1','d1','dodge'],['4k3/8/8/8/8/8/8/R3K3 w - - 0 1','a1','a8','indignant']]){
  const c=await browser.newContext(),p=await c.newPage();try{await seed(p,fen);await tap(p,from,to);await expect(p.locator(`[data-effect=${effect}]`)).toHaveCount(1);await expect(p.locator(`[data-effect=${effect}]`)).toHaveCount(0);}finally{await c.close();}
 }
});

test('captured audience welcomes a second loss without replaying on reload',async({browser})=>{
 const f=await live(browser,['e4','d5','exd5','Qxd5','Nc3','Qe5+','Be2','e6','Nf3']);try{
 f.game.move('Qxc3');f.state.version++;f.publish();await expect(f.p.locator('[data-lost-color=w] [data-effect=audience]')).toHaveCount(2);await expect(f.p.locator('[data-effect=audience]')).toHaveCount(0);
 await f.p.getByText('Move history',{exact:true}).click();await button(f.p,'First').click();await button(f.p.getByRole('navigation',{name:'Review moves'}),'Return to game').click();await expect(f.p.locator('[data-effect=audience]')).toHaveCount(0);await f.p.reload();await expect(f.p.locator('[data-effect=audience]')).toHaveCount(0);
 }finally{await f.c.close();}
});

test('whole-game movie pauses, scrubs, lingers on captures and closes on incoming moves without writes',async({browser})=>{
 const f=await live(browser,['e4','d5','exd5','Qxd5','Nc3']);try{
 const writes=f.writes.length;await button(f.p,'Watch game movie').click();const d=f.p.getByRole('dialog',{name:'Game movie'});await expect(d).toBeVisible();
 await d.getByLabel('Movie speed',{exact:true}).selectOption('2');await button(d,'Play movie').click();await expect(d.locator('[data-movie-ply]')).toHaveAttribute('data-movie-ply','1');await button(d,'Pause movie').click();const at=await d.locator('[data-movie-ply]').getAttribute('data-movie-ply');await f.p.waitForTimeout(650);await expect(d.locator('[data-movie-ply]')).toHaveAttribute('data-movie-ply',at);
 await d.getByLabel('Movie position',{exact:true}).fill('3');await button(d,'Play movie').click();await f.p.waitForTimeout(600);await expect(d.locator('[data-movie-ply]')).toHaveAttribute('data-movie-ply','3');await expect(d.locator('[data-movie-ply]')).toHaveAttribute('data-movie-ply','4');await f.p.evaluate(()=>window.dispatchEvent(new Event('qk-background')));await expect(button(d,'Play movie')).toBeDisabled();await f.p.evaluate(()=>window.dispatchEvent(new Event('qk-resume')));await button(d,'End').click();await expect(d.locator('[data-movie-ply]')).toHaveAttribute('data-movie-ply','5');await expect(d.locator('[data-square=c3]')).toHaveAttribute('data-piece','wn');
 await f.p.setViewportSize({width:320,height:850});await mkdir('output/playwright',{recursive:true});await f.p.screenshot({path:'output/playwright/extra-movie-320.png',fullPage:true});expect(await f.p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 expect(f.game.history()).toEqual(['e4','d5','exd5','Qxd5','Nc3']);expect(f.writes).toHaveLength(writes);
 f.game.move('Qa5');f.state.version++;f.publish();await expect(d).not.toBeVisible();expect(f.writes).toHaveLength(writes);
 }finally{await f.c.close();}
});

test('local movie preserves study history, supports custom start and manual reduced-motion frames',async({page:p})=>{
 await seed(p,'4r1k1/8/8/8/8/8/8/4K3 w - - 0 1');await tap(p,'e1','d1');const before=await p.evaluate(()=>localStorage.getItem('qk-study-v2:guest'));
 await p.emulateMedia({reducedMotion:'reduce'});await button(p,'Watch game movie').click();const d=p.getByRole('dialog',{name:'Game movie'});await expect(button(d,'Play movie')).toBeDisabled();await button(d,'Next frame').click();await expect(d.locator('[data-square=d1]')).toHaveAttribute('data-piece','wk');await button(d,'Close movie').click();expect(await p.evaluate(()=>localStorage.getItem('qk-study-v2:guest'))).toBe(before);
});

test('victory photograph renders the finished board and sends PNG through the Android save bridge',async({browser})=>{
 const f=await live(browser,['f3','e5','g4']);try{
 await f.p.evaluate(()=>{window.__QK_ANDROID={imageExport:true};window.photoWrites=[];window.QuietKnightExport={postMessage:raw=>{window.photoWrites.push(JSON.parse(raw));setTimeout(()=>window.dispatchEvent(new CustomEvent('qk-export-result',{detail:{kind:'image',ok:true}})),50);}};});
 f.game.move('Qh4#');f.state.version++;f.state.status='checkmate';f.state.winner='b';f.publish();await button(f.p,'Victory photograph').click();await expect(f.p.getByRole('img',{name:'Quiet Knight game postcard'})).toBeVisible();await button(f.p,'Save photograph').click();await expect(f.p.getByText('Photograph saved.',{exact:true})).toBeVisible();
 const data=await f.p.evaluate(()=>window.photoWrites[0]);expect(data.mime).toBe('image/png');expect(data.name).toMatch(/^Quiet-Knight-photo-\d+\.png$/);const bytes=Buffer.from(data.base64,'base64');expect([...bytes.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);expect(bytes.readUInt32BE(16)).toBe(760);expect(bytes.readUInt32BE(20)).toBe(1000);expect(bytes.length).toBeGreaterThan(100000);
 await mkdir('output/playwright',{recursive:true});await f.p.screenshot({path:'output/playwright/extra-photograph.png',fullPage:true});
 }finally{await f.c.close();}
});

test('home knight cycles neigh, bow and refusal, respects mute and never navigates',async({page:p})=>{
 await p.addInitScript(()=>{localStorage.setItem('qk-sound','false');window.mascotNotes=0;const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){window.mascotNotes++;return original.call(this);};});await p.goto(url);
 for(const gesture of ['neigh','bow','refuse']){await button(p,'Play with the knight').click();await expect(p.locator(`.mascot-${gesture}`)).toHaveCount(1);await expect(p.locator(`.mascot-${gesture}`)).toHaveCount(0);expect(p.url()).toBe(url);}
 expect(await p.evaluate(()=>window.mascotNotes)).toBe(0);await settings(p);await p.getByLabel('Playful home knight',{exact:true}).uncheck();await button(p,'Close dialog').click();await expect(button(p,'Play with the knight')).toHaveCount(0);
});

for(const theme of ['wood','marble','orchestra','cartoon'])test(`sound theme ${theme} schedules distinct short tones`,async({page:p})=>{
 await p.addInitScript(()=>{window.extraTones=[];const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){const n=original.call(this),set=n.frequency.setValueAtTime.bind(n.frequency);n.frequency.setValueAtTime=(v,t)=>{window.extraTones.push(v);return set(v,t);};return n;};});
 await seed(p,'4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',{soundTheme:theme});await tap(p,'e2','e4');await expect.poll(()=>p.evaluate(()=>window.extraTones.length)).toBeGreaterThan(0);
 const pitches=await p.evaluate(()=>window.extraTones);expect(pitches).toContain({wood:320,marble:1800,orchestra:523.25,cartoon:240}[theme]);
});

for(const quiet of [false,true])test(`themed move sound respects ${quiet?'Quiet Mode':'master mute'}`,async({page:p})=>{
 await p.addInitScript(()=>{window.notes=0;const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){window.notes++;return original.call(this);};});
 await seed(p,'4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',{soundTheme:'cartoon',quiet});
 if(!quiet){await p.evaluate(()=>localStorage.setItem('qk-sound','false'));await p.reload();await button(p,'Study, puzzles & Chess960').click();}
 await tap(p,'e2','e4');await expect(sq(p,'e4')).toHaveAttribute('data-piece','wp');await p.waitForTimeout(400);expect(await p.evaluate(()=>window.notes)).toBe(0);
});
