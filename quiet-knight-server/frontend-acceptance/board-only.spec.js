import {test,expect} from '@playwright/test';
import {Chess} from '../frontend/node_modules/chess.js/dist/esm/chess.js';
import {mkdir} from 'node:fs/promises';
const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:3197/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url),'isolated candidate only');
test.setTimeout(40000);
const b=(p,name)=>p.getByRole('button',{name,exact:true});
const sq=(p,s)=>p.locator(`.board-stage [data-square=${s}]`);
async function options(p){await b(p,'Options').click();await expect(p.locator('.table-sheet')).toBeVisible();}
async function close(p){await b(p,'Close options').click();await expect(p.locator('.table-sheet')).not.toBeVisible();}
async function studio(p,fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',prefs={}){
 await p.addInitScript(({fen,prefs})=>{localStorage.setItem('qk-study-v2:guest',JSON.stringify({schema:2,start:fen,moves:[],cursor:0,variant:'standard',mode:'analysis',human:'w',level:1}));localStorage.setItem('qk-play-preferences-v1',JSON.stringify({schema:1,...prefs}));window.displayModes=[];window.QuietKnightDisplay={postMessage:s=>window.displayModes.push(s)};},{fen,prefs});
 await p.goto(url);await b(p,'Study, puzzles & Chess960').click();await expect(sq(p,'e1')).toBeVisible();
}
async function live(p,role='white',opening=['e4','d5','exd5','Qxd5']){
 let version=1;const game=new Chess();opening.forEach(s=>game.move(s));const sockets=[],writes=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
 const state={status:'active',winner:null,proposal:null};
 const room=()=>({code:'FOCUS1',fen:game.fen(),turn:game.turn(),...state,version,game_number:1,created_at:1,white_joined:true,black_joined:true,moves:game.history(),last_move:game.history({verbose:true}).at(-1)});
 const publish=()=>{version++;sockets.forEach(s=>{s.send(JSON.stringify({type:'room.update',room:room()}));s.send(JSON.stringify({type:'seat.role',role,game_number:1,room_version:version}));});};
 await p.route('**/capabilities',r=>r.fulfill({json:{protocol:2,new_games:'untimed',guest_play:true,variants:['standard']}}));
 await p.route(/\/rooms(?:\/FOCUS1(?:\/[^/?]+)?)?$/,async r=>{if(r.request().method()==='POST')writes.push(r.request().url());if(r.request().url().endsWith('/move')){game.move(r.request().postDataJSON());version++;publish();}await r.fulfill({json:{room:room(),role,seat_token:'synthetic-focus-seat'}});});
 await p.routeWebSocket(/\/ws\?/,s=>{sockets.push(s);publish();s.onMessage(publish);});
 await p.goto(url);await b(p,'Create live game').click();await expect(b(p,'Options')).toBeVisible();
 return{game,writes,errors,state,publish};
}
async function geometry(p){
 const board=await p.locator('.board-stage > .board-frame').boundingBox(),button=await b(p,'Options').boundingBox();const v=p.viewportSize();
 expect(Math.abs(board.width-board.height)).toBeLessThan(1);expect(board.x).toBeGreaterThanOrEqual(0);expect(board.y).toBeGreaterThanOrEqual(0);expect(board.x+board.width).toBeLessThanOrEqual(v.width+.5);expect(board.y+board.height).toBeLessThanOrEqual(v.height+.5);
 expect(button.x+button.width<=board.x||button.x>=board.x+board.width||button.y+button.height<=board.y||button.y>=board.y+board.height).toBe(true);
 const cells=await p.locator('.board-stage .square').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return[r.width,r.height]}));expect(cells).toHaveLength(64);await expect(p.locator('.board-stage .board-side-strip')).toHaveCount(2);for(const[w,h]of cells){expect(Math.abs(w-h)).toBeLessThan(.6);expect(Math.abs(w-cells[0][0])).toBeLessThan(.6);}
 expect(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight)).toBe(false);
 const outside=await p.locator('.board-only button:visible').evaluateAll(es=>es.filter(e=>!e.closest('.board-stage')&&!e.closest('dialog')).map(e=>e.textContent.trim()));expect(outside).toHaveLength(1);expect(outside[0]).toContain('Options');
}
for(const viewport of [{width:390,height:844},{width:844,height:390},{width:320,height:640},{width:640,height:320},{width:600,height:600},{width:1366,height:768}])test(`board fills available short edge without distortion ${viewport.width}x${viewport.height}`,async({page:p})=>{
 await p.setViewportSize(viewport);await studio(p);await geometry(p);await expect(p.locator('.board-stage [data-piece-style=clear-staunton]')).toHaveCount(32);
 const shapes=await p.locator('.board-stage .clear-piece').evaluateAll(es=>es.map(e=>({kind:e.dataset.pieceModel.split('-')[1],color:e.dataset.pieceModel.split('-')[0],paths:[...e.querySelectorAll('g > path')].map(x=>x.getAttribute('d'))})));for(const kind of ['pawn','rook','knight','bishop','queen','king'])expect(shapes.find(s=>s.kind===kind&&s.color==='ivory').paths).toEqual(shapes.find(s=>s.kind===kind&&s.color==='graphite').paths);
 await options(p);await expect(b(p,'Flip board')).toBeVisible();await close(p);await geometry(p);await mkdir('output/playwright',{recursive:true});await p.screenshot({path:`output/playwright/board-only-${viewport.width}x${viewport.height}.png`});
});
for(const role of ['white','black'])test(`main ${role}: Options captures, history, live moves and flip`,async({page:p})=>{
 const f=await live(p,role);await geometry(p);await expect(p.locator('.board-stage [data-score=w]')).toHaveText('38');await expect(p.locator('.board-stage [data-score=b]')).toHaveText('38');await options(p);await expect(b(p,'Connection: Live. Reconnect')).toBeVisible();await expect(b(p,'Offer draw')).toBeVisible();await expect(p.locator('[data-lost-color=b] [data-captured=p]')).toHaveCount(1);await expect(p.locator('[data-lost-color=w] [data-captured=p]')).toHaveCount(1);
 await p.locator('.board-history summary').click();await b(p,'2. White: exd5').click();await expect(p.locator('.table-sheet')).not.toBeVisible();await expect(sq(p,'d5')).toHaveAttribute('data-piece','wp');await expect(p.locator('.board-stage .square[aria-disabled=true]')).toHaveCount(64);
 const before=f.writes.length;await sq(p,'g1').dispatchEvent('click');await sq(p,'f3').press('Enter');expect(f.writes.length).toBe(before);
 await options(p);await p.locator('.review-banner').getByRole('button',{name:'Return to game'}).click();await expect(sq(p,'d5')).toHaveAttribute('data-piece','bq');
 await options(p);await b(p,'Flip board').click();await close(p);await expect(p.locator('.board-stage .square').first()).toHaveAttribute('data-square',role==='white'?'h1':'a8');expect(f.errors).toEqual([]);
});
test('tap-to-move, castling, promotion, capture replay and fullscreen lifecycle',async({page:p})=>{
 await studio(p,'4k3/P7/8/8/8/8/7p/R3K3 w Q - 0 1');await sq(p,'e1').click();await sq(p,'a1').click();await expect(sq(p,'c1')).toHaveAttribute('data-piece','wk');await expect(sq(p,'d1')).toHaveAttribute('data-piece','wr');
 await sq(p,'h2').click();await sq(p,'h1').click();await expect(p.getByRole('region',{name:'Promotion',exact:true})).toBeVisible();await p.getByRole('region',{name:'Promotion',exact:true}).getByRole('button',{name:/queen/i}).click();await expect(sq(p,'h1')).toHaveAttribute('data-piece','bq');
 await sq(p,'d1').click();await sq(p,'h1').click();await expect(sq(p,'h1')).toHaveAttribute('data-piece','wr');await expect(b(p,'Replay last capture')).not.toBeVisible();await options(p);await b(p,'Replay last capture').click();await expect(p.getByRole('dialog',{name:'Capture replay',exact:true})).toBeVisible();await b(p,'Close replay').click();await b(p,'Back to table').click();expect(await p.evaluate(()=>window.displayModes.at(-1))).toBe('normal');
});
test('rotation retains selected piece and safe move confirmation; reduced motion works',async({page:p})=>{
 await studio(p,undefined,{confirm:true});await sq(p,'e2').click();await p.setViewportSize({width:844,height:390});await geometry(p);await sq(p,'e4').click();await expect(b(p,'Confirm move')).toBeVisible();await b(p,'Confirm move').click();await expect(sq(p,'e4')).toHaveAttribute('data-piece','wp');await p.emulateMedia({reducedMotion:'reduce'});await sq(p,'e7').click();await sq(p,'e5').click();await b(p,'Confirm move').click();await expect(sq(p,'e5')).toHaveAttribute('data-piece','bp');await geometry(p);
});
test('draw proposal and finished-game actions remain accessible inside Options',async({page:p})=>{
 const f=await live(p);f.state.proposal={kind:'draw',by:'b'};f.publish();await expect(p.locator('.board-options-button i')).toBeVisible();await options(p);await expect(b(p,'Accept draw')).toBeVisible();await expect(b(p,'Decline draw')).toBeVisible();await close(p);f.state.status='draw';f.state.proposal=null;f.publish();await options(p);await expect(b(p,'Rematch')).toBeVisible();await expect(b(p,'Victory photograph')).toBeVisible();await b(p,'Victory photograph').click();await expect(p.locator('.postcard-preview .clear-piece')).not.toHaveCount(0);const download=p.waitForEvent('download');await b(p,'Save photograph').click();expect((await download).suggestedFilename()).toBe('quiet-knight-game.png');
});
