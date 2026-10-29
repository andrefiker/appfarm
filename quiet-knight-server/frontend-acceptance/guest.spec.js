import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:3000/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url),'synthetic loopback candidate only');
const live=p=>expect(p.getByRole('button',{name:'Connection: Live. Reconnect',exact:true})).toBeVisible();
async function move(p,from,to){const a=p.locator(`[data-square='${from}']`),b=p.locator(`[data-square='${to}']`);await expect(a).toHaveAttribute('aria-disabled','false');await a.click();await expect(b).toHaveAttribute('aria-label',/legal destination/);await b.click();}
async function actor(browser,width=390){const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'allow'}),page=await context.newPage(),errors=[],accountRequests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/players'))accountRequests.push(r.method());});return{context,page,errors,accountRequests};}
async function noGate(p){await expect(p.getByRole('button',{name:'Play White',exact:true})).toBeVisible();await expect(p.getByRole('button',{name:'Create Account',exact:true})).toHaveCount(0);await expect(p.getByRole('button',{name:'Log In',exact:true})).toHaveCount(0);}

test('fresh guests play multiplayer, resume, resign and swap; spectators cannot move',async({browser})=>{
 const a=await actor(browser),b=await actor(browser,320),s=await actor(browser,360);
 try{
  await a.context.addInitScript(()=>{if(location.protocol!=='http:')return;if(localStorage.getItem('single-style-seeded'))return;localStorage.setItem('qk-piece-set-v1','classic');localStorage.setItem('qk-atmosphere-v1','Midnight');localStorage.setItem('qk-pictured-table-upgrade-v1','applied');localStorage.setItem('single-style-seeded','1');});
  await b.context.addInitScript(()=>{if(location.protocol!=='http:')return;if(localStorage.getItem('single-style-seeded'))return;localStorage.setItem('qk-piece-set-v1','animal-kingdom');localStorage.setItem('qk-atmosphere-v1','Royal Meadow');localStorage.setItem('qk-pictured-table-upgrade-v1','applied');localStorage.setItem('single-style-seeded','1');});
  await a.page.goto(url);await noGate(a.page);expect(a.accountRequests).toEqual([]);
  await mkdir('output/playwright',{recursive:true});await expect(a.page.locator('.home-play')).toHaveCSS('opacity','1');await a.page.screenshot({path:'output/playwright/guest-home-390.png',fullPage:true});
  await a.page.getByRole('button',{name:'Create live game',exact:true}).click();await live(a.page);
  const invite=a.page.url();await b.page.goto(invite);await live(b.page);await s.page.goto(invite);await live(s.page);
  await expect(b.page.getByRole('group',{name:'Chess board, Black at bottom',exact:true})).toBeVisible();
  for(const p of [a.page,b.page]){
   await expect(p.locator('body')).toHaveAttribute('data-atmosphere','walnut');
   await expect(p.locator('body')).toHaveAttribute('data-piece-set','faceted');
   await expect(p.locator('.board svg.chess-art')).toHaveCount(32);
   await expect(p.locator('.board .classic-piece,.board .animal-piece')).toHaveCount(0);
  }
  // Scope changes generated SVG ids; actual carved geometry must match both views.
  expect(await a.page.locator('[data-square=f8] svg path').evaluateAll(xs=>xs.map(x=>x.getAttribute('d')))).toEqual(await b.page.locator('[data-square=f8] svg path').evaluateAll(xs=>xs.map(x=>x.getAttribute('d'))));
  await b.page.screenshot({path:'output/playwright/same-carved-black-320.png',fullPage:true});
  await a.page.screenshot({path:'output/playwright/same-carved-white-390.png',fullPage:true});

  await expect(s.page.locator('[data-square=e2]')).toHaveAttribute('aria-disabled','true');
  const rejected=await s.context.request.post(new URL('/rooms/'+new URL(invite).searchParams.get('room')+'/move',url).href,{data:{from:'e2',to:'e4',seat_token:'invalid'}});expect(rejected.status()).toBe(403);
  await move(a.page,'e2','e4');await expect(b.page.locator('[data-square=e4]')).toHaveAttribute('data-piece','wp');
  await a.page.goto('about:blank');await move(b.page,'e7','e5');await a.page.goto(invite);await live(a.page);await expect(a.page.locator('[data-square=e5]')).toHaveAttribute('data-piece','bp');
  await expect(a.page.getByRole('timer')).toHaveCount(0);
  await b.page.getByRole('button',{name:'Resign',exact:true}).click();await b.page.getByRole('button',{name:'Confirm resign',exact:true}).click();
  await a.page.getByRole('button',{name:'Rematch',exact:true}).click();
  await expect(a.page.getByRole('group',{name:'Chess board, Black at bottom',exact:true})).toBeVisible();await move(b.page,'e2','e4');await expect(a.page.locator('[data-square=e4]')).toHaveAttribute('data-piece','wp');
  for(const p of [a.page,b.page,s.page])expect(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await b.page.screenshot({path:'output/playwright/guest-board-320.png',fullPage:true});
  for(const v of [a,b,s]){expect(v.accountRequests).toEqual([]);expect(v.errors).toEqual([]);}
 }finally{await Promise.all([a.context.close(),b.context.close(),s.context.close()]);}
});

test('guest computer save resumes offline without any account service',async({browser})=>{
 const a=await actor(browser);
 try{
  await a.page.goto(url);await noGate(a.page);
  await expect(a.page.getByText('Computer files saved for offline play',{exact:false})).toBeVisible({timeout:30000});
  await a.page.getByRole('button',{name:'Play White',exact:true}).click();await move(a.page,'e2','e4');await expect(a.page.locator('[data-square=g1]')).toHaveAttribute('aria-disabled','false');
  await a.context.setOffline(true);await a.page.reload();await a.page.getByRole('button',{name:'Resume saved computer game',exact:true}).click();await move(a.page,'g1','f3');await expect(a.page.locator('[data-square=b1]')).toHaveAttribute('aria-disabled','false');
  await expect(a.page.getByRole('timer')).toHaveCount(0);expect(a.accountRequests).toEqual([]);expect(a.errors).toEqual([]);
 }finally{await a.context.close();}
});

test('optional account creation, record panel and logout do not gate guest play',async({browser})=>{
 const a=await actor(browser,360),handle='GuestAcct'+crypto.randomUUID().replaceAll('-','').slice(0,8);
 try{
  await a.page.goto(url);await noGate(a.page);
  await a.page.getByRole('button',{name:'Account (optional)',exact:true}).click();await a.page.getByRole('button',{name:'Create Account',exact:true}).click();
  await a.page.getByRole('textbox',{name:'Knight ID',exact:true}).fill(handle);await a.page.getByLabel('Password',{exact:true}).fill('synthetic-account-pass');await a.page.getByRole('button',{name:'Create Account',exact:true}).click();
  await expect(a.page.getByRole('heading',{name:'Save your recovery code',exact:true})).toBeVisible();await a.page.getByRole('button',{name:'Continue to game',exact:true}).click();
  await a.page.getByRole('button',{name:new RegExp(handle+' ·')}).click();await expect(a.page.getByRole('heading',{name:'Human game history',exact:true})).toBeVisible();await expect(a.page.getByRole('heading',{name:'Computer game history',exact:true})).toBeVisible();
  await a.page.getByRole('button',{name:'Log Out',exact:true}).click();await a.page.getByRole('button',{name:'Close dialog',exact:true}).click();await noGate(a.page);
  await a.page.getByRole('button',{name:'Play White',exact:true}).click();await move(a.page,'e2','e4');expect(a.errors).toEqual([]);
 }finally{await a.context.close();}
});
