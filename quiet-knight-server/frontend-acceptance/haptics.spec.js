import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:3000/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url),'isolated candidate only');
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  window.__haptics=[];window.QuietKnightHaptics={postMessage:kind=>window.__haptics.push(kind)};
  if(!localStorage.getItem('haptic-test-seeded')){
   localStorage.setItem('qk-haptics','false');localStorage.setItem('haptic-test-seeded','yes');
  }
 });
});
async function tap(page,from,to){await page.locator(`[data-square=${from}]`).click();await page.locator(`[data-square=${to}]`).click();}
async function events(page){return page.evaluate(()=>window.__haptics);}

test('native haptics setting, test button, computer moves and persistent opt-out',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.getByRole('button',{name:'Open settings',exact:true}).click();
 await expect(page.getByLabel('Haptic feedback',{exact:true})).toBeChecked();
 await page.getByRole('button',{name:'Test haptics',exact:true}).click();expect(await events(page)).toEqual(['move']);
 await mkdir('output/playwright',{recursive:true});await page.screenshot({path:'output/playwright/haptics-settings-390.png',fullPage:true});
 await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 await page.getByRole('button',{name:'Play White',exact:true}).click();await tap(page,'e2','e4');
 await expect(page.locator('[data-square=g1]')).toHaveAttribute('aria-disabled','false');
 expect(await events(page)).toEqual(['move','select','move','move']);
 await page.getByRole('button',{name:'Leave game',exact:true}).click();await page.getByRole('button',{name:'Leave table',exact:true}).click();
 await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Haptic feedback',{exact:true}).uncheck();
 await expect(page.getByRole('button',{name:'Test haptics',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 await page.reload();await page.getByRole('button',{name:'Open settings',exact:true}).click();await expect(page.getByLabel('Haptic feedback',{exact:true})).not.toBeChecked();
 await page.getByRole('button',{name:'Close dialog',exact:true}).click();await page.getByRole('button',{name:'Resume saved computer game',exact:true}).click();
 await tap(page,'g1','f3');await expect(page.locator('[data-square=b1]')).toHaveAttribute('aria-disabled','false');
 expect(await events(page)).toEqual([]);expect(errors).toEqual([]);
});

test('local accepted captures and check have distinct haptics; review, restore and background stay quiet',async({page})=>{
 await page.goto(url);await page.getByRole('button',{name:'Pass and play · offline',exact:true}).click();
 await tap(page,'e2','e4');await tap(page,'d7','d5');await tap(page,'e4','d5');
 expect(await events(page)).toEqual(['select','move','select','move','select','capture']);
 await page.getByRole('button',{name:'Previous position',exact:true}).click();
 expect((await events(page)).length).toBe(6);
 await page.getByRole('button',{name:'Live local position',exact:true}).click();
 expect((await events(page)).length).toBe(6);
 await page.evaluate(()=>window.dispatchEvent(new Event('qk-background')));
 await page.locator('[data-square=g8]').click();expect((await events(page)).length).toBe(6);
 await page.evaluate(()=>window.dispatchEvent(new Event('qk-resume')));
 await page.getByRole('button',{name:'files',exact:true}).click();
 await page.getByLabel('FEN input',{exact:true}).fill('4k3/8/8/8/8/8/8/K6R w - - 0 1');await page.getByRole('button',{name:'Import FEN',exact:true}).click();
 await tap(page,'h1','e1');expect((await events(page)).slice(-2)).toEqual(['select','check']);
 await page.reload();await page.getByRole('button',{name:'Study, puzzles & Chess960',exact:true}).click();
 await expect(page.locator('[data-square=e1]')).toHaveAttribute('data-piece','wr');expect(await events(page)).toEqual([]);
});
