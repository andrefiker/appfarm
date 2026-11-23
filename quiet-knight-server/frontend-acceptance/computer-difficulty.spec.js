import {test,expect} from '@playwright/test';
import {Chess} from '../frontend/node_modules/chess.js/dist/esm/chess.js';

const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:3000/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url),'isolated candidate only');
test('fine difficulty steps lead to a legal offline beginner reply',async({page})=>{
 const origin=new URL(url).origin;
 await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await page.addInitScript(()=>{ Math.random=()=>0.01; });
 await page.goto(url);
 const level=page.getByRole('slider',{name:'Computer level'});
 await page.getByRole('button',{name:'Casual',exact:true}).click();
 await expect(level).toHaveAttribute('aria-valuetext','Level 3 of 10');
 await level.press('ArrowLeft');await expect(level).toHaveAttribute('aria-valuetext','Level 2.75 of 10');
 await level.press('Home');await expect(level).toHaveAttribute('aria-valuetext','Level 0.25 of 10');
 await page.getByRole('button',{name:'Play White',exact:true}).click();
 const square=(s)=>page.locator('.board-stage .board [data-square="'+s+'"]');
 await square('e2').click();await square('e4').click();
 await expect.poll(async()=>{
  const positions=await page.locator('.board-stage .board [data-square]').evaluateAll(els=>Object.fromEntries(els.filter(e=>e.dataset.piece).map(e=>[e.dataset.square,e.dataset.piece])));
  const chess=new Chess();chess.move('e4');return chess.moves({verbose:true}).some(m=>{const judge=new Chess(chess.fen());judge.move(m);return judge.board().flat().filter(Boolean).every(p=>positions[p.square]===p.color+p.type)&&Object.keys(positions).length===32;});
 }).toBe(true);
 await expect(square('e4')).toHaveAttribute('data-piece','wp');
});
