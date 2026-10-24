import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:3000/';
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
 await expect(page.locator('body')).toHaveAttribute('data-piece-set','kawaii-faces');
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

test('pictured preset applies to existing preferences without losing saved play',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('qk-piece-set-v1','classic');localStorage.setItem('qk-atmosphere-v1','Royal Meadow');});
 await page.goto(url);await page.getByRole('button',{name:'Open settings',exact:true}).click();
 await expect(page.getByLabel('Chess piece set',{exact:true})).toHaveValue('classic');
 await page.getByRole('button',{name:'Use pictured wood table',exact:true}).click();
 await expect(page.getByLabel('Chess piece set',{exact:true})).toHaveValue('kawaii-faces');
 await expect(page.getByLabel('Table atmosphere',{exact:true})).toHaveValue('Walnut');
 await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 await page.getByRole('button',{name:'Play White',exact:true}).click();
 await page.locator('[data-square=e2]').click();await page.locator('[data-square=e4]').click();
 await expect(page.locator('[data-square=g1]')).toHaveAttribute('aria-disabled','false');
 await page.getByRole('button',{name:'Open table controls',exact:true}).click();
 await page.getByRole('button',{name:'Use pictured wood table',exact:true}).click();
 await expect(page.locator('[data-square=e4]')).toHaveAttribute('data-piece','wp');
 await expect(page.getByRole('timer')).toHaveCount(0);
});
