import {test,expect} from '@playwright/test';
import {createClient} from 'redis';
import {mkdir} from 'node:fs/promises';
test.use({channel:'chrome'});

const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:5173/';
const live=p=>expect(p.getByRole('button',{name:'Connection: Live. Reconnect',exact:true})).toBeVisible();
const clock=(p,color)=>p.getByRole('timer',{name:new RegExp('^'+color+' clock')});
const close=actors=>Promise.race([Promise.all(actors.map(a=>a.context.close())),new Promise(r=>setTimeout(r,2000))]);
async function move(p,from,to){const a=p.locator(`[data-square='${from}']`),b=p.locator(`[data-square='${to}']`);await expect(a).toHaveAttribute('aria-disabled','false');await a.click();await expect(b).toHaveAttribute('aria-label',/legal destination/);await b.click();}
async function actor(browser,width=390){const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'allow'});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));return{context,page,errors};}

test('10+0 two browsers, reconnect, Zen, Nudge, timeout and swap',async({browser})=>{
 const a=await actor(browser),b=await actor(browser,360);let redis;
 try{
  await a.page.goto(url);await a.page.getByRole('button',{name:'Create live game',exact:true}).click();await live(a.page);
  await expect(clock(a.page,'White')).toHaveText('10:00');await expect(clock(a.page,'Black')).toHaveText('10:00');await expect(a.page.locator('.clock-active')).toHaveCount(0);
  const invite=a.page.url();await b.page.goto(invite);await live(b.page);await expect(b.page.getByRole('group',{name:'Chess board, Black at bottom',exact:true})).toBeVisible();
  await expect(clock(a.page,'White')).toHaveClass(/clock-active/);await expect(clock(a.page,'White')).not.toHaveText('10:00');
  await move(a.page,'e2','e4');await expect(b.page.locator('[data-square=e4]')).toHaveAttribute('data-piece','wp');await expect(clock(a.page,'Black')).toHaveClass(/clock-active/);
  await a.page.getByRole('button',{name:'Open table controls',exact:true}).click();await a.page.getByRole('button',{name:'Nudge',exact:true}).click();await expect(a.page.getByText('Delivered at table.',{exact:true})).toBeVisible();await expect(b.page.getByText('Your opponent nudged you.',{exact:true})).toBeVisible();
  await a.page.keyboard.press('Escape');await move(b.page,'e7','e5');await expect(a.page.locator('[data-square=e5]')).toHaveAttribute('data-piece','bp');
  await a.context.setOffline(true);await expect(a.page.getByRole('button',{name:'Connection: Offline. Reconnect',exact:true})).toBeVisible();const before=await clock(a.page,'White').textContent();await expect(clock(a.page,'White')).not.toHaveText(before);await a.context.setOffline(false);await live(a.page);await b.page.reload();await live(b.page);
  await a.page.getByRole('button',{name:'Open table controls',exact:true}).click();await a.page.getByText('Preferences & diagnostics',{exact:true}).click();const zen=a.page.getByRole('checkbox',{name:/Zen/});await zen.click();await expect(a.page.locator(".zen-table")).toBeVisible();await a.page.keyboard.press('Escape');
  await expect(clock(a.page,'White')).toBeVisible();await expect(clock(a.page,'Black')).toBeVisible();
  await mkdir('output/playwright',{recursive:true});
  for(const [page,name]of[[a.page,'white-zen-390'],[b.page,'black-360']]){const geometry=await page.locator('.board').evaluate(el=>({w:el.clientWidth,h:el.clientHeight,overflow:document.documentElement.scrollWidth>innerWidth}));expect(Math.abs(geometry.w-geometry.h)).toBeLessThanOrEqual(1);expect(geometry.overflow).toBe(false);await page.screenshot({path:`output/playwright/${name}.png`,fullPage:true});}
  await b.page.setViewportSize({width:1280,height:800});await expect(clock(b.page,'Black')).toBeVisible();expect(await b.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  // Local fixture only: demonstrate rendered authoritative timeout without a 10-minute test wait.
  if(url.startsWith('http://127.0.0.1:')){
   redis=createClient({url:'redis://127.0.0.1:16379'});await redis.connect();const code=new URL(invite).searchParams.get('room');const key='qk:room:'+code;const room=JSON.parse(await redis.get(key));room.white_time_ms=500;room.turn_started_at=Date.now();await redis.set(key,JSON.stringify(room),{EX:604800});await redis.zAdd('qk:clock-deadlines',{score:room.turn_started_at+500,value:code});
   await expect(a.page.getByRole('heading',{name:'Black wins on time',exact:true})).toBeVisible();await expect(b.page.getByRole('heading',{name:'Black wins on time',exact:true})).toBeVisible();await expect(clock(a.page,'White')).toHaveText('00:00');await expect(a.page.locator('.clock-active')).toHaveCount(0);
   await expect(a.page.getByText('You tried your best! And failed miserably...',{exact:true})).toBeVisible();await expect(b.page.getByText('You tried your best! And failed miserably...',{exact:true})).toHaveCount(0);
   await a.page.screenshot({path:'output/playwright/timeout-white.png',fullPage:true});await a.page.getByRole('button',{name:'Rematch',exact:true}).click();await a.page.getByRole('button',{name:'Swap colors',exact:true}).click();await expect(a.page.getByRole('group',{name:'Chess board, Black at bottom',exact:true})).toBeVisible();await expect(clock(a.page,'Black')).toHaveText('10:00');await move(b.page,'e2','e4');await expect(a.page.locator('[data-square=e4]')).toHaveAttribute('data-piece','wp');
  }
  expect(a.errors).toEqual([]);expect(b.errors).toEqual([]);
 }finally{await redis?.quit();await close([a,b]);}
});

test('computer remains untimed and offline shell survives relaunch',async({browser})=>{
 const a=await actor(browser);
 try{await a.page.goto(url);await expect(a.page.getByText('Computer files saved for offline play',{exact:false})).toBeVisible({timeout:45000});await a.page.getByRole('button',{name:'Play White',exact:true}).click();await expect(a.page.getByRole('timer')).toHaveCount(0);await move(a.page,'e2','e4');await expect(a.page.locator('[data-square=g1]')).toHaveAttribute('aria-disabled','false');await a.context.setOffline(true);await a.page.close();a.page=await a.context.newPage();await a.page.goto(url);await a.page.getByRole('button',{name:'Resume saved computer game',exact:true}).click();await expect(a.page.getByRole('timer')).toHaveCount(0);await move(a.page,'g1','f3');await expect(a.page.locator('[data-square=b1]')).toHaveAttribute('aria-disabled','false');expect(a.errors).toEqual([]);}finally{await close([a]);}
});
