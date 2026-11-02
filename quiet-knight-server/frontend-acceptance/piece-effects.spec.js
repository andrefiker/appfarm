import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {Chess} from 'chess.js';
const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:3000/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url),'isolated candidate only');
const button=(p,name)=>p.getByRole('button',{name,exact:true});
const square=(p,s)=>p.locator(`[data-square=${s}]`);
async function tap(p,from,to){await square(p,from).click();await square(p,to).click();}
async function study(page,fen,prefs={},variant='standard'){
  await page.addInitScript(({fen,prefs,variant})=>{
    if(localStorage.getItem('effects-test-seeded'))return;
    localStorage.setItem('effects-test-seeded','1');
    localStorage.setItem('qk-play-preferences-v1',JSON.stringify({schema:1,...prefs}));
    localStorage.setItem('qk-study-v2:guest',JSON.stringify({schema:2,start:fen,moves:[],cursor:0,variant,mode:'analysis',human:'w',level:1}));
  },{fen,prefs,variant});
  await page.goto(url);await button(page,'Study, puzzles & Chess960').click();
  await expect(page.locator('.square')).toHaveCount(64);
}
async function checkGeometry(page){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  const boxes=await page.locator('.square').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return[r.width,r.height];}));
  expect(boxes).toHaveLength(64);for(const[w,h]of boxes){expect(Math.abs(w-h)).toBeLessThan(.6);expect(Math.abs(w-boxes[0][0])).toBeLessThan(.6);}
}
const captures=[
  ['pawn','p','4k3/8/8/3r4/4P3/8/8/4K3 w - - 0 1','e4','d5'],
  ['rook','r','4k3/8/8/8/3p4/8/8/3RK3 w - - 0 1','d1','d4'],
  ['knight','n','4k3/8/8/3p4/8/2N5/8/4K3 w - - 0 1','c3','d5'],
  ['bishop','b','4k3/8/8/8/3p4/8/1B6/4K3 w - - 0 1','b2','d4'],
  ['queen','q','4k3/8/8/8/3p4/8/8/3QK3 w - - 0 1','d1','d4'],
  ['king','k','4k3/8/8/8/3p4/4K3/8/8 w - - 0 1','e3','d4'],
];
for(const[name,kind,fen,from,to]of captures)test(`${name} capture animates briefly without changing final pieces or square geometry`,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:kind==='p'?320:390,height:1000});
  await study(page,fen);if(['b','n','k'].includes(kind))await button(page,'Flip board').click();
  await tap(page,from,to);
  await expect(square(page,to)).toHaveAttribute('data-piece','w'+kind);
  await expect(page.locator(`[data-effect=attack-${kind}]`)).toBeVisible();
  await expect(page.locator('.capture-shard')).toHaveCount(3);
  if(kind==='n')await expect(page.locator('.travel-leap')).toHaveCount(1);
  const animations=await page.locator('.board').evaluate(el=>el.getAnimations({subtree:true}).map(a=>({name:a.animationName,duration:a.effect.getTiming().duration})));
  expect(animations.find(a=>a.name==='captured-crumble')?.duration).toBe(1000);
  expect(animations.find(a=>a.name==='strike-fade')?.duration).toBe(1000);
  expect(animations.every(a=>Number(a.duration)<=1000)).toBe(true);
  await checkGeometry(page);
  await expect(page.locator('.capture-ghost')).toHaveCount(0,{timeout:1800});
  await expect(page.locator('.playful-travel')).toHaveCount(0);
  await expect(square(page,from)).toHaveAttribute('data-piece','');
  await expect(square(page,to)).toHaveAttribute('data-piece','w'+kind);
  expect(errors).toEqual([]);
});

test('quiet knight leaps, paired castling and promotion support special moves',async({browser})=>{
  const cases=[
    {fen:'4k3/8/8/8/8/2N5/4P3/4K3 w - - 0 1',from:'c3',to:'b5',selector:'.travel-leap',count:1},
    {fen:'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',from:'e1',to:'h1',selector:'.travel-castle',count:2},
    {fen:'4k3/8/8/8/8/8/8/1K3R2 w F - 0 1',from:'b1',to:'f1',selector:'.travel-castle',count:1,variant:'chess960'},
    {fen:'4k3/P7/8/8/8/8/8/4K3 w - - 0 1',from:'a7',to:'a8',selector:'.promotion-effect',count:1,promote:true},
    {fen:'4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1',from:'e5',to:'d6',selector:'[data-square=d5] .capture-ghost',count:1},
  ];
  for(const c of cases){
    const context=await browser.newContext(),p=await context.newPage();
    try{await study(p,c.fen,{},c.variant);await tap(p,c.from,c.to);
      if(c.promote)await button(p,'Promote to knight').click();
      await expect(p.locator(c.selector)).toHaveCount(c.count);
      if(c.promote)await expect(square(p,'a8')).toHaveAttribute('data-piece','wn');
      if(c.selector==='.travel-castle'){
        await expect(square(p,'g1')).toHaveAttribute('data-piece','wk');
        await expect(square(p,'f1')).toHaveAttribute('data-piece','wr');
      }
      await expect(p.locator(c.selector)).toHaveCount(0,{timeout:1800});
    }finally{await context.close();}
  }
});

test('check startle and victory bow/topple play once, never on review or reload',async({page})=>{
  await study(page,'7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
  await tap(page,'f7','g7');
  await expect(page.locator('[data-effect=bow]')).toHaveCount(1);
  await expect(page.locator('[data-effect=topple]')).toHaveCount(1);
  await expect(page.locator('[data-effect=bow]')).toHaveCount(0,{timeout:1800});
  await button(page,'Previous position').click();await button(page,'Live local position').click();
  await expect(page.locator('[data-effect=bow]')).toHaveCount(0);
  await page.reload();await button(page,'Study, puzzles & Chess960').click();
  await expect(page.locator('[data-effect=bow]')).toHaveCount(0);
});

test('check without mate startles the king; animation never blocks the next move',async({page})=>{
  await study(page,'4k3/8/8/8/8/8/8/R3K3 w - - 0 1');
  await tap(page,'a1','a8');
  await expect(square(page,'e8').locator('[data-effect=startle]')).toHaveCount(1);
  // Move while effects are still running. No overlay may intercept input.
  await tap(page,'e8','e7');
  await expect(square(page,'e7')).toHaveAttribute('data-piece','bk');
  await expect(square(page,'e8').locator('[data-effect=startle]')).toHaveCount(0);
});

for(const mode of ['reduced','disabled','quiet','no-motion'])test(`${mode} suppresses decorative effects and leaves the correct promoted piece visible`,async({page})=>{
  if(mode==='reduced')await page.emulateMedia({reducedMotion:'reduce'});
  const prefs=mode==='disabled'?{playful:false}:mode==='quiet'?{quiet:true}:mode==='no-motion'?{animate:false}:{};
  await study(page,'4k3/P7/8/8/8/8/8/4K3 w - - 0 1',prefs);
  await tap(page,'a7','a8');await button(page,'Promote to rook').click();
  await expect(square(page,'a8')).toHaveAttribute('data-piece','wr');
  await expect(page.locator('.capture-ghost,.promotion-effect,.playful-travel,[data-effect=bow]')).toHaveCount(0);
  await expect(square(page,'a8').locator('.piece-performance')).toHaveCSS('opacity','1');
});

test('playful preference persists and old move animations remain independently optional',async({page})=>{
  await page.goto(url);await button(page,'Open settings').click();
  await page.getByLabel('Playful piece effects',{exact:true}).uncheck();
  await page.reload();await button(page,'Open settings').click();
  await expect(page.getByLabel('Playful piece effects',{exact:true})).not.toBeChecked();
  await expect(page.getByLabel('Move animations',{exact:true})).toBeChecked();
});

test('live-board capture and fast reply retain independent effects without stale pieces',async({browser})=>{
  await mkdir('output/playwright',{recursive:true});
  const context=await browser.newContext({viewport:{width:390,height:1000},recordVideo:{dir:'output/playwright/effects-video',size:{width:390,height:1000}},serviceWorkers:'block'});
  const p=await context.newPage(),game=new Chess();game.move('e4');game.move('d5');
  let version=1;const sockets=[];
  const room=()=>({code:'FXS001',created_at:1,winner:null,version,game_number:1,status:'active',fen:game.fen(),turn:game.turn(),white_joined:true,black_joined:true,moves:game.history(),last_move:game.history({verbose:true}).at(-1)});
  const publish=()=>sockets.forEach(s=>s.send(JSON.stringify({type:'room.update',room:room()})));
  try{
    await p.route('**/capabilities',r=>r.fulfill({json:{protocol:2,new_games:'untimed',guest_play:true,variants:['standard']}}));
    await p.route(/\/rooms(?:\/FXS001(?:\/[^/?]+)?)?$/,async r=>{
      if(new URL(r.request().url()).pathname.endsWith('/move')){const input=r.request().postDataJSON();game.move({from:input.from,to:input.to,promotion:input.promotion});version++;publish();}
      await r.fulfill({json:{room:room(),role:'white',seat_token:'synthetic-effects-seat'}});
    });
    await p.routeWebSocket(/\/ws\?/,s=>{sockets.push(s);publish();s.onMessage(publish);});
    await p.goto(url);await button(p,'Create live game').click();
    await expect(button(p,'Connection: Live. Reconnect')).toBeVisible();
    await expect(p.locator('.capture-ghost')).toHaveCount(0);
    await tap(p,'e4','d5');await expect(p.locator('.capture-ghost')).toHaveCount(1);
    // Capture remains visible while a quick, unrelated reply appears immediately.
    game.move('Nf6');version++;publish();
    await expect(square(p,'f6')).toHaveAttribute('data-piece','bn');
    await expect(p.locator('.capture-ghost')).toHaveCount(1);
    await expect(p.locator('.capture-ghost')).toHaveCount(0,{timeout:1800});
    await tap(p,'b1','c3');await expect(p.locator('.travel-leap')).toHaveCount(1);
    await expect(p.locator('.travel-leap')).toHaveCount(0,{timeout:1800});
    game.move('Qxd5');version++;publish();
    await expect(p.locator('.strike-q')).toHaveCount(1);
    // Sample the actual rendered impact, without freezing browser animation clocks.
    await p.waitForTimeout(450);
    expect(await p.locator('.strike-q').evaluate(el=>Number(getComputedStyle(el).opacity))).toBeGreaterThan(.8);
    await p.screenshot({path:'output/playwright/playful-capture-review.png',fullPage:true,animations:'allow'});
    await expect(p.locator('.strike-q')).toHaveCount(0,{timeout:1800});
    await expect(square(p,'d5')).toHaveAttribute('data-piece','bq');
    await p.locator('.board-history summary').click();await button(p,'Previous').click();
    await expect(p.locator('.capture-ghost,.playful-travel')).toHaveCount(0);
    game.move('Nxd5');version++;publish();
    await expect(p.locator('.review-banner')).toContainText('of 7');
    await p.locator('.review-banner').getByRole('button',{name:'Return to game',exact:true}).click();
    await expect(p.locator('.capture-ghost')).toHaveCount(0);
    await expect(square(p,'d5')).toHaveAttribute('data-piece','wn');
    await checkGeometry(p);
  }finally{await context.close();}
});
