import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:3000/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url),'isolated candidate only');
async function move(page,from,to){await expect(page.locator(`[data-square=${from}]`)).toHaveAttribute('aria-disabled','false');await page.locator(`[data-square=${from}]`).click();await page.locator(`[data-square=${to}]`).click();}
const live=page=>expect(page.getByRole('button',{name:'Connection: Live. Reconnect',exact:true})).toBeVisible();

test('friend receives an automatic rematch prompt after mate; same/swap, decline, cancel and reload remain usable',async({browser})=>{
 const a=await browser.newContext({viewport:{width:320,height:844}}),b=await browser.newContext({viewport:{width:390,height:844}});
 const p=await a.newPage(),q=await b.newPage(),errors=[];
 for(const page of [p,q])page.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto(url);await p.getByRole('button',{name:'Create live game',exact:true}).click();await live(p);
  const invite=p.url(),code=new URL(invite).searchParams.get('room');await q.goto(invite);await live(q);
  const read=async()=>{const r=await a.request.get(new URL('/rooms/'+code,url).href);return(await r.json()).room;};
  await move(p,'f2','f3');await move(q,'e7','e5');await move(p,'g2','g4');await move(q,'d8','h4');
  await expect(p.getByRole('heading',{name:'Black wins',exact:true})).toBeVisible();
  await p.getByRole('button',{name:'Rematch',exact:true}).click();await p.getByRole('button',{name:'Swap colors',exact:true}).click();
  await expect.poll(async()=>(await read()).rematch_proposal?.colors).toBe('swap');
  expect((await read()).game_number).toBe(1);expect((await read()).status).toBe('checkmate');
  await mkdir('output/playwright',{recursive:true});await q.screenshot({path:'output/playwright/rematch-received-390.png',fullPage:true});
  // Crucially, do not click/scroll to an off-screen banner: the recipient
  // must receive a visible, actionable prompt without searching the page.
  await expect(q.getByRole('dialog',{name:'Rematch offered',exact:true})).toBeVisible();
  await expect(q.getByRole('button',{name:'Accept rematch',exact:true})).toBeInViewport({ratio:1});
  await expect(p.getByRole('dialog',{name:'Rematch requested',exact:true})).toBeVisible();
  await expect(p.getByRole('button',{name:'Cancel rematch request',exact:true})).toBeInViewport({ratio:1});
  await q.getByRole('button',{name:'Accept rematch',exact:true}).click();
  await expect.poll(async()=>(await read()).game_number).toBe(2);
  await expect(p.getByRole('dialog')).toHaveCount(0);await expect(q.getByRole('dialog')).toHaveCount(0);
  await expect(p.getByRole('group',{name:'Chess board, Black at bottom',exact:true})).toBeVisible();
  await move(q,'e2','e4');await expect(p.locator('[data-square=e4]')).toHaveAttribute('data-piece','wp');await move(p,'e7','e5');
  await q.getByRole('button',{name:'Resign',exact:true}).click();await q.getByRole('button',{name:'Confirm resign',exact:true}).click();
  // Same-color offer survives a receiver reload and can be declined.
  await p.getByRole('button',{name:'Rematch',exact:true}).click();await p.getByRole('button',{name:'Same colors',exact:true}).click();
  await expect(q.getByRole('dialog',{name:'Rematch offered',exact:true})).toBeVisible();await q.reload();await live(q);
  await expect(q.getByRole('dialog',{name:'Rematch offered',exact:true})).toBeVisible();await q.getByRole('button',{name:'Decline rematch',exact:true}).click();
  await expect.poll(async()=>(await read()).rematch_proposal).toBe(null);expect((await read()).game_number).toBe(2);
  await expect(p.getByRole('dialog')).toHaveCount(0);
  await p.getByRole('button',{name:'Rematch',exact:true}).click();await p.getByRole('button',{name:'Same colors',exact:true}).click();
  await expect(q.getByRole('dialog',{name:'Rematch offered',exact:true})).toBeVisible();await p.getByRole('button',{name:'Cancel rematch request',exact:true}).click();
  await expect(q.getByRole('dialog')).toHaveCount(0);expect((await read()).game_number).toBe(2);
  // A further offer starts a third usable game without changing colors.
  await p.getByRole('button',{name:'Rematch',exact:true}).click();await p.getByRole('button',{name:'Same colors',exact:true}).click();await q.getByRole('button',{name:'Accept rematch',exact:true}).click();
  await expect.poll(async()=>(await read()).game_number).toBe(3);await move(q,'d2','d4');await move(p,'d7','d5');
  expect((await read()).time_control).toBeUndefined();expect(errors).toEqual([]);
 }finally{await a.close();await b.close();}
});
