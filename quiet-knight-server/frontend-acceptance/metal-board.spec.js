import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:3000/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url),'isolated candidate only');
test('mustard and mist gray remain distinct on a square phone board',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('qk-play-preferences-v1',JSON.stringify({schema:1,coordinates:false})));
 await page.setViewportSize({width:390,height:844});
 await page.route('**/capabilities',route=>route.fulfill({json:{protocol:2,new_games:'untimed',guest_play:true,variants:['standard']}}));
 await page.goto(url);await page.getByRole('button',{name:/Play White/}).click();
 const board=page.locator('.board-stage .board');
 const dark=board.locator('[data-square=a1]'),light=board.locator('[data-square=b1]');
 await expect(dark).toHaveCSS('background-color','rgb(151, 128, 68)');
 await expect(light).toHaveCSS('background-color','rgb(227, 227, 217)');
 for(const square of [dark,light]){
   await expect(square).toHaveCSS('background-image',/^linear-gradient/);
   await expect(square).not.toHaveCSS('background-image',/repeating-linear-gradient/);
   expect(await square.evaluate(el=>getComputedStyle(el,'::before').boxShadow)).toMatch(/inset/);
 }
 await expect(board.locator('.square')).toHaveCount(64);
 const rect=await board.boundingBox();expect(Math.abs(rect.width-rect.height)).toBeLessThan(0.6);
 await expect(board.locator('.square-coordinate').first()).toBeHidden();
 const destination=board.locator('[data-square=e4]');await board.locator('[data-square=e2]').click();
 await expect(destination.locator('.target-dot')).toBeVisible();
 await mkdir('output/playwright',{recursive:true});
 await page.screenshot({path:'output/playwright/metal-board-390.png'});
});