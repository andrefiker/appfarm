import {test,expect} from '@playwright/test';
const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:4180/';
const dimensions=async page=>{
 const board=await page.locator('.board-stage .board').boundingBox();
 const header=await page.locator('.game-header').boundingBox();
 const footer=await page.locator('.table-below').boundingBox();
 const viewport=page.viewportSize();
 return {board,header,footer,viewport};
};
test('same playable board rotates sideways and back with controls available',async({page})=>{
 await page.setViewportSize({width:393,height:873});
 await page.route('**/capabilities',r=>r.fulfill({json:{protocol:2,new_games:'untimed',guest_play:true,variants:['standard']}}));
 await page.goto(url);await page.getByRole('button',{name:/Play White/}).click();
 const board=page.locator('.board-stage .board');
 const initial=await dimensions(page);
 await board.locator('[data-square=e2]').click();
 await expect(board.locator('[data-square=e4] .target-dot')).toBeVisible();
 await page.setViewportSize({width:873,height:393});
 for(const [width,height] of [[873,393],[740,360],[568,320]]){
  await page.setViewportSize({width,height});
  const {board:b,header:h,footer:f}=await dimensions(page); if(width===873)expect(b.width).toBeGreaterThan(initial.board.width); if(width===873)expect(b.width).toBeGreaterThan(initial.board.width);
  expect(Math.abs(b.width-b.height)).toBeLessThan(1);
  expect(b.width).toBeGreaterThanOrEqual(height-17);
  expect(h.x).toBeGreaterThan(b.x+b.width);
  expect(f.x).toBeGreaterThan(b.x+b.width);
  expect(b.y+b.height).toBeLessThanOrEqual(height);
  await expect(page.getByRole('button',{name:'Open table controls'})).toBeInViewport();
  await expect(page.getByRole('button',{name:'Beginner Coach',exact:true})).toBeInViewport();
 }
 await page.setViewportSize({width:873,height:393});
 await expect(board.locator('[data-square=e2]')).toHaveAttribute('data-piece','wp');
 await expect(board.locator('[data-square=e4] .target-dot')).toBeVisible();
 await page.screenshot({path:'output/playwright/Quiet-Knight-landscape-preview.png'});
 await page.getByRole('button',{name:'Open table controls'}).click();
 await expect(page.getByRole('dialog',{name:'Table controls'})).toBeVisible();
 await page.getByRole('button',{name:'Close table controls'}).click();
 await board.locator('[data-square=e4]').click();
 await expect(board.locator('[data-square=e4]')).toHaveAttribute('data-piece','wp');
 await page.setViewportSize({width:393,height:873});
 await expect(board.locator('[data-square=e4]')).toHaveAttribute('data-piece','wp');
 const restored=await dimensions(page);
 expect(restored.header.y).toBeLessThan(restored.board.y);
 expect(restored.board.width).toBeCloseTo(initial.board.width,0);
 console.log(`Portrait ${initial.board.width}px, landscape ${873}x${393}`);
});
