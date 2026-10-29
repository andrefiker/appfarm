import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:3000/';
test.setTimeout(60000);
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url),'isolated candidate only');

// Optional local visual harness when native PostgreSQL cannot run in a
// single-UID sandbox. CI runs these same interactions against the real server.
test.beforeEach(async({page})=>{
 if(process.env.QK_VISUAL_FIXTURE!=='1')return;
 const room={code:'REF001',fen:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',turn:'w',status:'waiting',winner:null,version:1,game_number:1,created_at:Date.now(),white_joined:true,black_joined:false,moves:[],last_move:null};
 await page.route('**/capabilities',r=>r.fulfill({json:{protocol:2,new_games:'untimed',guest_play:true,variants:['standard']}}));
 await page.route(/\/rooms(?:\/REF001(?:\/join)?)?$/,r=>r.fulfill({json:{room,role:'white',seat_token:'synthetic-reference-seat'}}));
 await page.routeWebSocket(/\/ws\?/,ws=>{ws.send(JSON.stringify({type:'room.update',room}));ws.onMessage(()=>ws.send(JSON.stringify({type:'seat.role',role:'white',game_number:1})));});
});

async function geometry(page){
 const g=await page.locator('.board .square').evaluateAll(s=>s.map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height};}));
 expect(g).toHaveLength(64);
 for(const r of g){expect(Math.abs(r.w-r.h)).toBeLessThan(.6);expect(Math.abs(r.w-g[0].w)).toBeLessThan(.6);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
}

test('pictured wood table, carved pieces and responsive untimed waiting room',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.getByRole('button',{name:'Create live game',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Waiting for a friend',exact:true})).toBeVisible();
 await expect(page.locator('body')).toHaveAttribute('data-piece-set','faceted');
 await expect(page.locator('body')).toHaveAttribute('data-atmosphere','walnut');
 await expect(page.locator('.board svg.chess-art')).toHaveCount(32);
 await expect(page.locator('.board .classic-piece,.board .animal-piece')).toHaveCount(0);
 await expect(page.getByRole('timer')).toHaveCount(0);
 await expect(page.locator('.rank-coordinate').first()).toBeHidden();
 await expect(page.getByText('Material',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Table controls',exact:true})).toBeVisible();
 await mkdir('output/playwright',{recursive:true});
 for(const width of [390,360,320,1280]){
  await page.setViewportSize({width,height:width===1280?900:866});await geometry(page);
  await expect(page.getByRole('button',{name:/^(Copy|Share) invite$/,exact:true}).first()).toBeInViewport();
  await page.screenshot({path:`output/playwright/reference-untimed-${width}.png`,fullPage:true});
 }
 await page.locator('[data-square=e2]').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('[data-square=f2]')).toBeFocused();
 expect(errors).toEqual([]);
});

test('single style overrides old choices on every launch and preserves saved play',async({page})=>{
 await page.addInitScript(()=>{
  if(localStorage.getItem('reference-test-seeded'))return;
  localStorage.setItem('qk-piece-set-v1','classic');
  localStorage.setItem('qk-atmosphere-v1','Royal Meadow');
  localStorage.setItem('qk-zen-table-v1','true');
  localStorage.setItem('reference-test-seeded','true');
 });
 await page.goto(url);
 await expect(page.locator('body')).toHaveAttribute('data-piece-set','faceted');
 await expect(page.locator('body')).toHaveAttribute('data-atmosphere','walnut');
 await page.getByRole('button',{name:'Play White',exact:true}).click();
 await page.locator('[data-square=e2]').click();await page.locator('[data-square=e4]').click();
 await expect(page.locator('[data-square=g1]')).toHaveAttribute('aria-disabled','false');
 const saves=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.startsWith('qk-local-save-v1:')&&!key.endsWith(':backup')&&!key.includes(':recovery'))));
 expect(Object.keys(saves).length).toBeGreaterThan(0);
 // Simulate upgrading an installation with a real saved computer position.
 await page.evaluate(()=>{
  localStorage.setItem('qk-piece-set-v1','classic');
  localStorage.setItem('qk-atmosphere-v1','Royal Meadow');
  localStorage.removeItem('qk-pictured-table-upgrade-v1');
 });
 await page.reload();
 await expect(page.locator('body')).toHaveAttribute('data-piece-set','faceted');
 await expect(page.locator('body')).toHaveAttribute('data-atmosphere','walnut');
 await expect(page.getByRole('button',{name:'Resume saved computer game',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.startsWith('qk-local-save-v1:')&&!key.endsWith(':backup')&&!key.includes(':recovery'))))).toEqual(saves);
 await page.getByRole('button',{name:'Open settings',exact:true}).click();
 for(const label of ['Chess piece set','Table atmosphere','Unquiet Mode'])await expect(page.getByLabel(label,{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Use pictured wood table',exact:true})).toHaveCount(0);
 await expect(page.getByLabel('Haptic feedback',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 // An already-upgraded installation cannot restore an obsolete appearance.
 await page.evaluate(()=>{localStorage.setItem('qk-piece-set-v1','animal-kingdom');localStorage.setItem('qk-atmosphere-v1','Forest');localStorage.setItem('qk-pictured-table-upgrade-v1','applied');});
 await page.reload();
 await expect(page.locator('body')).toHaveAttribute('data-piece-set','faceted');
 await expect(page.locator('body')).toHaveAttribute('data-atmosphere','walnut');
 await page.getByRole('button',{name:'Create live game',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Waiting for a friend',exact:true})).toBeVisible();
 await expect(page.locator('.board svg.chess-art')).toHaveCount(32);
 await expect(page.getByRole('timer')).toHaveCount(0);
 await geometry(page);
 await mkdir('output/playwright',{recursive:true});
 await page.screenshot({path:'output/playwright/reference-upgraded-installation-390.png',fullPage:true});
});

test('faceted model atlas is complete, shares unique clipping and survives offline reload',async({page,context})=>{
 await page.goto(url);
 await expect(page.getByText('Computer files saved for offline play',{exact:false})).toBeVisible({timeout:30000});
 await page.getByRole('button',{name:'Play White',exact:true}).click();
 const pieces=page.locator('.board .faceted-piece');await expect(pieces).toHaveCount(32);
 for(const army of ['ivory','graphite'])for(const kind of ['king','queen','rook','bishop','knight','pawn'])await expect(page.locator(`.board [data-piece-model="${army}-${kind}"]`)).toHaveCount(kind==='pawn'?8:kind==='king'||kind==='queen'?1:2);
 const ids=await pieces.locator('clipPath').evaluateAll(xs=>xs.map(x=>x.id));expect(new Set(ids).size).toBe(32);
 const images=await pieces.locator('image').evaluateAll(xs=>xs.map(x=>x.getAttribute('href')));expect(new Set(images).size).toBe(1);
 const src=images[0];expect(src).toMatch(/faceted-pieces-.*\.png$/);
 await expect.poll(()=>page.evaluate(async s=>Boolean(await caches.match(s)),src)).toBe(true);
 await context.setOffline(true);await page.reload();await page.getByRole('button',{name:'Play White',exact:true}).click();await expect(page.locator('.board .faceted-piece')).toHaveCount(32);
 const dimensions=await page.evaluate(async s=>{const im=new Image();im.src=s;await im.decode();return[im.naturalWidth,im.naturalHeight];},src);expect(dimensions).toEqual([1086,1448]);
 await mkdir('output/playwright',{recursive:true});await page.screenshot({path:'output/playwright/faceted-offline-390.png',fullPage:true});
});
