import {test,expect} from '@playwright/test';
const url=process.env.QK_FRONTEND_URL || 'http://127.0.0.1:4179/';
test('Staunton has six distinct models per side and preserves board play',async({page})=>{
 await page.route('**/capabilities',r=>r.fulfill({json:{protocol:2,new_games:'untimed',guest_play:true,variants:['standard']}}));
 await page.goto(url);
 await page.getByRole('button',{name:/Play White/}).click();
 const square=s=>page.locator('.board-stage .board [data-square='+s+']').first();
 const board=page.locator('.board-stage .board').first();
 for(const side of ['boxwood','ebony']) {
  for(const [name,count] of Object.entries({pawn:8,knight:2,bishop:2,rook:2,queen:1,king:1})){
   await expect(board.locator('[data-piece-model="staunton-'+side+'-'+name+'"]')).toHaveCount(count,{timeout:3000});
  }
 }
 await expect(square('e2').locator('[data-turned-wood]')).toBeVisible();
 await square('e2').click();
 await expect(square('e4').locator('.target-dot')).toBeVisible();
 await page.screenshot({path:'output/playwright/staunton-01.png'});
});
