import {test,expect} from '@playwright/test';
const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:4182/';
test('landscape shows only the complete centered board; portrait restores controls and the same move',async({page})=>{
 await page.setViewportSize({width:393,height:873});
 await page.route('**/capabilities',r=>r.fulfill({json:{protocol:2,new_games:'untimed',guest_play:true,variants:['standard']}}));
 await page.goto(url);await page.getByRole('button',{name:/Play White/}).click();
 const board=page.locator('.board-stage .board');
 const controls=page.getByRole('button',{name:'Open table controls'});
 const e2=board.locator('[data-square=e2]'), e4=board.locator('[data-square=e4]');
 await expect(controls).toBeVisible();
 await e2.click();await expect(e4.locator('.target-dot')).toBeVisible();
 for(const [width,height] of [[873,393],[740,360],[568,320]]){
  await page.setViewportSize({width,height});
  const b=await board.boundingBox();if(!b)throw Error('Board missing');
  expect(b.width).toBeCloseTo(height,0);expect(b.height).toBeCloseTo(height,0);
  expect(b.x).toBeCloseTo((width-height)/2,0);expect(b.y).toBeCloseTo(0,0);
  await expect(board.locator('[data-square]')).toHaveCount(64);
  for (const selector of ['.game-header','.player-strip','.table-below']) await expect(page.locator(selector).first()).toBeHidden();
  const noScroll=await page.evaluate(()=>document.documentElement.scrollHeight===innerHeight&&document.documentElement.scrollWidth===innerWidth);
  expect(noScroll).toBe(true);
 }
 await page.setViewportSize({width:873,height:393});
 await expect(e4.locator('.target-dot')).toBeVisible();await e4.click();
 await expect(e4).toHaveAttribute('data-piece','wp');
 await page.screenshot({path:'output/playwright/Quiet-Knight-1.6.15-board-only.png',animations:'disabled'});
 await page.setViewportSize({width:393,height:873});
 await expect(controls).toBeVisible();await expect(e4).toHaveAttribute('data-piece','wp');
});
