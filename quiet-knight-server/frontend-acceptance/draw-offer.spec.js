import {test, expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {Chess} from 'chess.js';
import {consentTransition} from '../consent.js';

const url = process.env.QK_FRONTEND_URL || 'http://127.0.0.1:3000/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url), 'isolated candidate only');
const button = (page, name) => page.getByRole('button', {name, exact:true});

// Synthetic HTTP/WebSocket transport with the production consent state machine.
// Separate browser contexts cannot accept their own offer or share seat storage.
async function table(browser) {
  const chess = new Chess(); chess.move('e4'); chess.move('e5');
  const state = {code:'DRW001', status:'active', version:1, game_number:1,
    white_token:'test-white', black_token:'test-black', created_at:Date.now(),
    fen:chess.fen(), turn:chess.turn(), moves:chess.history({verbose:true}),
    points_policy:{eligible:false}, proposal:null, winner:null};
  const sockets = [], contexts = [], writes = [], errors = [];
  const view = () => ({...state, white_token:undefined, black_token:undefined,
    white_joined:true, black_joined:true, moves:state.moves.map(m=>m.san)});
  function publish() { for (const socket of sockets) socket.send(JSON.stringify({type:'room.update',room:view()})); }
  async function player(role) {
    const context = await browser.newContext({viewport:{width:390,height:1100},serviceWorkers:'block'});
    contexts.push(context); const page = await context.newPage();
    page.on('pageerror', e=>errors.push(e.message));
    const color = role==='white'?'w':role==='black'?'b':null;
    const token = color ? `test-${role}` : null;
    await page.route('**/capabilities', r=>r.fulfill({json:{protocol:2,new_games:'untimed',guest_play:true,variants:['standard'],draw_offers:true}}));
    await page.route(/\/rooms(?:\/DRW001(?:\/[^/?]+)?)?$/, async route=>{
      if (new URL(route.request().url()).pathname.endsWith('/consent')) {
        const input=route.request().postDataJSON(); writes.push({role,...input});
        try {
          expect(input.seat_token).toBe(token);
          consentTransition(state,color,input); state.version++; publish();
        } catch (error) { await route.fulfill({status:error.status||409,json:{error:error.message}}); return; }
      }
      await route.fulfill({json:{room:view(),role,seat_token:token}});
    });
    await page.routeWebSocket(/\/ws\?/, socket=>{
      sockets.push(socket);
      const send=()=>{socket.send(JSON.stringify({type:'room.update',room:view()}));socket.send(JSON.stringify({type:'seat.role',role,game_number:state.game_number}));};
      send(); socket.onMessage(send);
      socket.onClose(()=>{const i=sockets.indexOf(socket);if(i>=0)sockets.splice(i,1);});
    });
    await page.goto(url); await button(page,'Create live game').click();
    await expect(button(page,'Connection: Live. Reconnect')).toBeVisible();
    if(role!=='spectator')await button(page,'Table controls').click();
    return page;
  }
  return {state,writes,errors,player,update(patch){Object.assign(state,patch);state.version++;publish();},async close(){await Promise.all(contexts.map(c=>c.close()));}};
}

test('two players can cancel, decline and accept a visible draw offer; spectators cannot answer', async ({browser})=>{
  const f=await table(browser);
  try {
    const white=await f.player('white'),black=await f.player('black'),spectator=await f.player('spectator');
    await expect(button(spectator,'Offer draw')).toHaveCount(0);
    await button(white,'Offer draw').click();
    await expect(button(white,'Cancel offer')).toBeVisible();
    await expect(button(white,'Accept draw')).toHaveCount(0);
    await expect(black.getByText('Your opponent offered a draw',{exact:true})).toBeVisible();
    await expect(button(spectator,'Accept draw')).toHaveCount(0);
    // Reloading an opponent retains the pending server proposal.
    await black.reload();await button(black,'Table controls').click();
    await expect(button(black,'Accept draw')).toBeVisible();
    await button(white,'Cancel offer').click();
    await expect(button(black,'Offer draw')).toBeVisible();
    await button(black,'Offer draw').click();
    await button(white,'Decline draw').click();
    await expect(button(black,'Offer draw')).toBeVisible();
    expect(f.state.status).toBe('active');
    await button(white,'Offer draw').click();
    await mkdir('output/playwright',{recursive:true});
    for (const width of [320,390,1280]) {
      await black.setViewportSize({width,height:1100});
      expect(await black.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
      const boxes=await black.locator('.square').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height];}));
      expect(boxes).toHaveLength(64);
      for(const [w,h] of boxes){expect(Math.abs(w-h)).toBeLessThan(.6);expect(Math.abs(w-boxes[0][0])).toBeLessThan(.6);}
      for(const label of ['Accept draw','Decline draw']) expect((await button(black,label).boundingBox()).height).toBeGreaterThanOrEqual(44);
      await black.screenshot({path:`output/playwright/draw-offer-${width}.png`,fullPage:true});
    }
    await button(black,'Accept draw').click();
    await button(white,'Close table controls').click();await button(black,'Close table controls').click();
    for(const p of [white,black,spectator]) {
      await expect(p.getByRole('heading',{name:'Drawn game',exact:true})).toBeVisible();
      await expect(button(p,'Offer draw')).toHaveCount(0);
      await expect(p.locator('.square[aria-disabled=true]')).toHaveCount(64);
    }
    expect(f.state.draw_agreement).toMatchObject({by:'w',accepted_by:'b',game_number:1});
    expect(f.writes.map(x=>x.action)).toEqual(['request','cancel','request','decline','request','accept']);
    expect(f.errors).toEqual([]);
  } finally { await f.close(); }
});

test('draw availability follows waiting, paused, pending takeback and finished state', async ({browser})=>{
  const f=await table(browser);
  try {
    const white=await f.player('white');
    f.update({status:'waiting'});await expect(button(white,'Offer draw')).toHaveCount(0);
    f.update({status:'active',clock_paused:true});await expect(button(white,'Offer draw')).toBeDisabled();
    f.update({clock_paused:false,proposal:{id:'takeback',kind:'takeback',by:'b',game_number:1}});
    await expect(button(white,'Offer draw')).toBeDisabled();
    await expect(white.getByText('Resolve the takeback request first.',{exact:true})).toBeVisible();
    f.update({proposal:null}); await button(white,'Offer draw').click();
    await white.context().setOffline(true);
    await expect(button(white,'Cancel offer')).toBeDisabled();
    await expect(white.getByText('Reconnect to offer or answer a draw.',{exact:true})).toBeVisible();
    await white.context().setOffline(false);
    await expect(button(white,'Cancel offer')).toBeEnabled();
    // A normal server move clears the offer; it cannot be accepted afterward.
    f.update({proposal:null}); await expect(button(white,'Cancel offer')).toHaveCount(0);
    await expect(button(white,'Offer draw')).toBeEnabled();
    f.update({status:'resigned',winner:'b'});await expect(button(white,'Offer draw')).toHaveCount(0);
    expect(f.errors).toEqual([]);
  } finally {await f.close();}
});

test('a stale offer cannot silently finish a game', async ({browser})=>{
  const f=await table(browser);
  try {
    const white=await f.player('white'),black=await f.player('black');
    await button(white,'Offer draw').click();
    await expect(button(black,'Accept draw')).toBeVisible();
    // Server advances before this client receives its update.
    f.state.version++; f.state.proposal=null;
    await button(black,'Accept draw').click();
    await expect(black.getByText('The proposal changed or is unavailable. Reconnect and try again.',{exact:true})).toBeVisible();
    expect(f.state.status).toBe('active');
    await expect(black.getByRole('heading',{name:'Drawn game',exact:true})).toHaveCount(0);
    f.update({}); await expect(button(black,'Offer draw')).toBeEnabled();
    expect(f.errors).toEqual([]);
  } finally {await f.close();}
});

test('computer games do not offer a bilateral draw', async ({page})=>{
  await page.goto(url);await button(page,'Play White').click();
  await expect(page.locator('.square')).toHaveCount(64);
  await expect(button(page,'Offer draw')).toHaveCount(0);
});
