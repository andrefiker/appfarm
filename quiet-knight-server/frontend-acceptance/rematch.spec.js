import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:3000/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url),'isolated candidate only');
async function move(page,from,to){await expect(page.locator(`[data-square=${from}]`)).toHaveAttribute('aria-disabled','false');await page.locator(`[data-square=${from}]`).click();await page.locator(`[data-square=${to}]`).click();}
const live=page=>expect(page.getByRole('button',{name:'Connection: Live. Reconnect',exact:true})).toBeVisible();

test('one tap starts a friend rematch without opponent action, including pending offers and disconnected opponents',async({browser})=>{
 const a=await browser.newContext({viewport:{width:320,height:844}}),b=await browser.newContext({viewport:{width:390,height:844}}),s=await browser.newContext();
 const p=await a.newPage(),q=await b.newPage(),spectator=await s.newPage(),errors=[],requests=[];
 for(const page of [p,q,spectator])page.on('pageerror',e=>errors.push(e.message));
 for(const [who,page] of [['a',p],['b',q]])page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname.endsWith('/rematch'))requests.push({who,data:r.postDataJSON()});});
 try{
  await p.goto(url);await p.getByRole('button',{name:'Create live game',exact:true}).click();await live(p);
  const invite=p.url(),code=new URL(invite).searchParams.get('room'),endpoint=new URL('/rooms/'+code,url).href;await q.goto(invite);await live(q);await spectator.goto(invite);await live(spectator);
  const read=async()=>{const r=await a.request.get(endpoint);return(await r.json()).room;};
  await move(p,'f2','f3');await move(q,'e7','e5');await move(p,'g2','g4');await move(q,'d8','h4');
  await expect(p.getByRole('heading',{name:'Black wins',exact:true})).toBeVisible();
  // One tap, no color chooser and no interaction at all on the other phone.
  await p.getByRole('button',{name:'Rematch',exact:true}).click();
  await expect.poll(async()=>(await read()).game_number).toBe(2);
  const first=await read();expect(first.status).toBe('active');expect(first.moves).toEqual([]);expect(first.rematch_proposal).toBe(null);expect(first.time_control).toBeUndefined();
  expect(requests).toHaveLength(1);expect(requests[0].who).toBe('a');expect(requests[0].data.action).toBeUndefined();expect(requests[0].data.colors).toBe('swap');
  await expect(p.getByRole('dialog')).toHaveCount(0);await expect(q.getByRole('dialog')).toHaveCount(0);
  await expect(p.getByRole('group',{name:'Chess board, Black at bottom',exact:true})).toBeVisible();await expect(q.getByRole('group',{name:'Chess board, White at bottom',exact:true})).toBeVisible();
  await mkdir('output/playwright',{recursive:true});await p.screenshot({path:'output/playwright/rematch-instant-320.png',fullPage:true});await q.screenshot({path:'output/playwright/rematch-opponent-390.png',fullPage:true});
  // A stale duplicate cannot restart the new game, and a spectator cannot do so.
  const stale=await a.request.post(endpoint+'/rematch',{data:requests[0].data});expect(stale.status()).toBe(409);expect((await read()).game_number).toBe(2);
  const denied=await s.request.post(endpoint+'/rematch',{data:{seat_token:'invalid',game_number:2,colors:'swap'}});expect(denied.status()).toBe(403);
  await expect(spectator.getByRole('button',{name:'Rematch',exact:true})).toHaveCount(0);
  await move(q,'e2','e4');await expect(p.locator('[data-square=e4]')).toHaveAttribute('data-piece','wp');await move(p,'e7','e5');
  await q.getByRole('button',{name:'Resign',exact:true}).click();await q.getByRole('button',{name:'Confirm resign',exact:true}).click();
  // Old clients may already have left an unanswered proposal at this table.
  // The immediate route must clear it rather than requiring an answer.
  const pending=await a.request.post(endpoint+'/rematch',{data:{...requests[0].data,game_number:2,action:'request',colors:'same'}});expect(pending.status()).toBe(200);expect((await read()).rematch_proposal).toBeTruthy();
  await p.getByRole('button',{name:'Rematch',exact:true}).click();await expect.poll(async()=>(await read()).game_number).toBe(3);expect((await read()).rematch_proposal).toBe(null);
  await move(p,'d2','d4');await move(q,'d7','d5');
  await p.getByRole('button',{name:'Resign',exact:true}).click();await p.getByRole('button',{name:'Confirm resign',exact:true}).click();
  // The other player can also initiate. Offline receiver returns to game four.
  await p.goto('about:blank');await q.getByRole('button',{name:'Rematch',exact:true}).click();await expect.poll(async()=>(await read()).game_number).toBe(4);
  await p.goto(invite);await live(p);await expect(p.getByRole('group',{name:'Chess board, Black at bottom',exact:true})).toBeVisible();await expect(p.getByRole('dialog')).toHaveCount(0);
  await move(q,'c2','c4');await expect(p.locator('[data-square=c4]')).toHaveAttribute('data-piece','wp');await move(p,'c7','c5');
  await q.reload();await live(q);await expect(q.locator('[data-square=c5]')).toHaveAttribute('data-piece','bp');expect((await read()).game_number).toBe(4);
  expect(requests.map(r=>r.who)).toEqual(['a','a','b']);expect(requests.every(r=>r.data.action===undefined)).toBe(true);expect(errors).toEqual([]);
 }finally{await a.close();await b.close();await s.close();}
});
