import {test,expect} from '@playwright/test';
import {createClient} from 'redis';
import {mkdir} from 'node:fs/promises';
import {resetTimedClock} from '../tests/clock-fixture.js';

const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:3000/';
// This suite changes synthetic Redis fixtures. It must never target production.
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url),'isolated loopback candidate only');
const clock=(p,color)=>p.getByRole('timer',{name:new RegExp('^'+color+' clock')});
const live=p=>expect(p.getByRole('button',{name:'Connection: Live. Reconnect',exact:true})).toBeVisible();
async function move(p,from,to){const a=p.locator(`[data-square='${from}']`),b=p.locator(`[data-square='${to}']`);await expect(a).toHaveAttribute('aria-disabled','false');await a.click();await expect(b).toHaveAttribute('aria-label',/legal destination/);await b.click();}
async function actor(browser,width){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'allow'});
  const name='Clock'+crypto.randomUUID().replaceAll('-','').slice(0,12);
  const response=await context.request.post(new URL('/players/register',url).href,{data:{handle:name,password:'synthetic-clock-test'},headers:{Origin:new URL(url).origin}});
  expect(response.status()).toBe(201);
  // Secure production cookies are relaxed only inside this loopback test client.
  const value=/qk_session=([^;]+)/.exec(response.headers()['set-cookie'])[1];
  await context.addCookies([{name:'qk_session',value,url:new URL(url).origin,httpOnly:true,secure:false,sameSite:'Lax'}]);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));return{context,page,errors};
}
async function geometry(page){const g=await page.locator('.board').evaluate(el=>({w:el.clientWidth,h:el.clientHeight,overflow:document.documentElement.scrollWidth>innerWidth}));expect(Math.abs(g.w-g.h)).toBeLessThanOrEqual(1);expect(g.overflow).toBe(false);}

test('untimed new game, two clients, background/reconnect, rematch and preserved legacy clock',async({browser})=>{
  const a=await actor(browser,390),b=await actor(browser,360);
  const redis=createClient({url:process.env.REDIS_URL||'redis://127.0.0.1:6379'});await redis.connect();
  try{
    await a.page.goto(url);await expect(a.page.getByText('No time limit. Share a room and make your move.',{exact:true})).toBeVisible();
    await a.page.getByRole('button',{name:'Create live game',exact:true}).click();await live(a.page);
    await expect(a.page.getByRole('timer')).toHaveCount(0);
    const invite=a.page.url(),code=new URL(invite).searchParams.get('room'),key='qk:room:'+code;
    await b.page.goto(invite);await live(b.page);await expect(b.page.getByRole('group',{name:'Chess board, Black at bottom',exact:true})).toBeVisible();
    await move(a.page,'e2','e4');await expect(b.page.locator('[data-square=e4]')).toHaveAttribute('data-piece','wp');
    // Detach A completely while B moves; reopening must restore the same seat.
    // Freezing a headless page can hang Chromium teardown on this CI image.
    await a.page.goto('about:blank');await move(b.page,'e7','e5');
    await a.page.goto(invite);await live(a.page);await expect(a.page.locator('[data-square=e5]')).toHaveAttribute('data-piece','bp');
    await a.context.setOffline(true);await a.context.setOffline(false);await live(a.page);
    await expect(a.page.getByRole('timer')).toHaveCount(0);await expect(b.page.getByRole('timer')).toHaveCount(0);
    await expect(a.page.getByRole('button',{name:'Request pause',exact:true})).toHaveCount(0);
    await geometry(a.page);await geometry(b.page);await mkdir('output/playwright',{recursive:true});
    await a.page.screenshot({path:'output/playwright/untimed-white-390.png',fullPage:true});
    await b.page.screenshot({path:'output/playwright/untimed-black-360.png',fullPage:true});
    await b.page.setViewportSize({width:1280,height:800});await geometry(b.page);

    // Persisted pre-change 10+0 data remains visible and authoritative.
    const legacy=JSON.parse(await redis.get(key));resetTimedClock(legacy,Date.now());await redis.set(key,JSON.stringify(legacy),{EX:604800});await redis.zAdd('qk:clock-deadlines',{score:legacy.turn_started_at+legacy.white_time_ms,value:code});
    await a.page.reload();await b.page.reload();await live(a.page);await live(b.page);
    await expect(clock(a.page,'White')).toHaveClass(/clock-active/);await expect(clock(a.page,'Black')).toHaveText('10:00');
    const before=await clock(a.page,'White').textContent();await expect(clock(a.page,'White')).not.toHaveText(before);
    // A near deadline avoids a ten-minute test wait and never touches live data.
    const near=JSON.parse(await redis.get(key));near.white_time_ms=500;near.turn_started_at=Date.now();await redis.set(key,JSON.stringify(near),{EX:604800});await redis.zAdd('qk:clock-deadlines',{score:near.turn_started_at+500,value:code});
    await expect(a.page.getByRole('heading',{name:'Black wins on time',exact:true})).toBeVisible();await expect(b.page.getByRole('heading',{name:'Black wins on time',exact:true})).toBeVisible();
    await expect(clock(a.page,'White')).toHaveText('00:00');await expect(a.page.locator('.clock-active')).toHaveCount(0);
    await a.page.getByRole('button',{name:'Rematch',exact:true}).click();await a.page.getByRole('button',{name:'Swap colors',exact:true}).click();
    await expect(a.page.getByRole('group',{name:'Chess board, Black at bottom',exact:true})).toBeVisible();
    await expect(a.page.getByRole('timer')).toHaveCount(0);await expect(b.page.getByRole('timer')).toHaveCount(0);
    await move(b.page,'e2','e4');await expect(a.page.locator('[data-square=e4]')).toHaveAttribute('data-piece','wp');
    expect(a.errors).toEqual([]);expect(b.errors).toEqual([]);
  }finally{await redis.quit();await a.context.close();await b.context.close();}
});

test('computer remains untimed and saved game resumes',async({browser})=>{
  const a=await actor(browser,390);
  try{
    await a.page.goto(url);await a.page.getByRole('button',{name:'Play White',exact:true}).click();await expect(a.page.getByRole('timer')).toHaveCount(0);
    await move(a.page,'e2','e4');await expect(a.page.locator('[data-square=g1]')).toHaveAttribute('aria-disabled','false');
    await a.page.reload();await a.page.getByRole('button',{name:'Resume saved computer game',exact:true}).click();
    await expect(a.page.getByRole('timer')).toHaveCount(0);await move(a.page,'g1','f3');await expect(a.page.locator('[data-square=b1]')).toHaveAttribute('aria-disabled','false');expect(a.errors).toEqual([]);
  }finally{await a.context.close();}
});
