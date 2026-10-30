import {test,expect} from '@playwright/test';
const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:3108/';
test('manifest offers installable icons and caches offline shell and engine',async({page,context})=>{
  await page.goto(url);
  await expect(page.getByText('Computer files saved for offline play',{exact:false})).toBeVisible({timeout:30000});
  const cdp=await context.newCDPSession(page);
  const {installabilityErrors}=await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors.filter(e=>e.errorId!=='in-incognito')).toEqual([]);
  const manifest=await page.evaluate(async()=>await (await fetch('./manifest.webmanifest')).json());
  expect(manifest.display).toBe('standalone');
  for(const size of ['192x192','512x512']){
    const icon=manifest.icons.find(i=>i.sizes===size);expect(icon).toBeTruthy();
    const state=await page.evaluate(async src=>{const u=new URL(src,location.href);const response=await caches.match(u.href);const im=new Image();im.src=u.href;await im.decode();return {cached:!!response,width:im.naturalWidth,height:im.naturalHeight}},icon.src);
    expect(state).toEqual({cached:true,width:parseInt(size),height:parseInt(size)});
  }
  await context.setOffline(true);await page.reload();await page.getByRole('button',{name:'Play White',exact:true}).click();
  await expect(page.locator('.board .square')).toHaveCount(64);
  await page.locator('[data-square=e2]').click();await page.locator('[data-square=e4]').click();
  await expect(page.locator('[data-square=e4] .chess-art')).toHaveCount(1);
});
