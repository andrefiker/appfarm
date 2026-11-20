import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:3000/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url),'isolated candidate only');
const btn=(p,name)=>p.getByRole('button',{name,exact:true});
const sq=(p,s)=>p.locator('.board-stage .board [data-square='+s+']').first();
async function capabilities(page){
 await page.route('**/capabilities',r=>r.fulfill({json:{protocol:2,new_games:'untimed',guest_play:true,variants:['standard']}}));
}
test('Staunton is default, silhouettes are opt-in and saved with original board controls',async({page})=>{
 await capabilities(page);await page.goto(url);await page.getByRole('button',{name:/Play White/}).click();
 await expect(sq(page,'e2').locator('.sculptor-piece > svg')).toBeVisible();
 await expect(sq(page,'e2').locator('.qk-piece-silhouette')).toBeHidden();
 await btn(page,'Open table controls').click();
 await page.getByText('Preferences & diagnostics',{exact:true}).click();
 await page.getByLabel('Piece style').selectOption('contrast');
 await btn(page,'Close table controls').click();
 const piece=sq(page,'e2').locator('.qk-piece-silhouette');
 await expect(piece).toBeVisible();await expect(sq(page,'e7').locator('.qk-piece-silhouette')).toBeVisible();
 await expect(sq(page,'e2').locator('.sculptor-piece > svg')).toBeHidden();
 await expect(piece).toHaveAttribute('stroke','#111b28');
 await expect(sq(page,'e7').locator('.qk-piece-silhouette')).toHaveAttribute('stroke','#fffdf3');
 await sq(page,'e2').click();await expect(sq(page,'e4').locator('.target-dot')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('qk-play-preferences-v1')).pieceStyle)).toBe('contrast');
 await page.reload();
 if(!(await sq(page,'e2').isVisible()))await page.getByRole('button',{name:/Play White/}).click();
 await expect(sq(page,'e2').locator('.qk-piece-silhouette')).toBeVisible();
 await mkdir('output/playwright',{recursive:true});await page.screenshot({path:'output/playwright/high-contrast-pieces-390.png'});
});
test('sound alert categories can be saved independently and the master mute retains them',async({page})=>{
 await capabilities(page); await page.goto(url);
 await btn(page,'Open settings').click();
 await expect(page.getByRole('checkbox',{name:'Game sounds',exact:true})).not.toBeChecked();
 await expect(btn(page,'Test sound')).toBeDisabled();
 const ordinary=page.getByLabel('Ordinary moves',{exact:true}),capture=page.getByLabel('Captures',{exact:true}),check=page.getByLabel('Check',{exact:true});
 await ordinary.uncheck();await check.uncheck();
 await expect(capture).toBeChecked();
 await page.getByRole('checkbox',{name:'Game sounds',exact:true}).check();
 await page.getByRole('checkbox',{name:'Game sounds',exact:true}).uncheck();
 await expect.poll(()=>page.evaluate(()=>({enabled:localStorage.getItem('qk-sound'),cues:JSON.parse(localStorage.getItem('qk-play-preferences-v1')).soundCues}))).toEqual({enabled:'false',cues:{move:false,capture:true,check:false}});
 await page.reload();await btn(page,'Open settings').click();
 await expect(ordinary).not.toBeChecked();await expect(capture).toBeChecked();await expect(check).not.toBeChecked();
});
for(const [name,cues,expected] of [
 ['check takes precedence',{},[1568]],
 ['capture fallback', {check:false},[360]],
 ['all relevant cues off', {check:false,capture:false},[]],
]){
 test('checking capture sounds: '+name,async({page})=>{
  await capabilities(page);await page.addInitScript(({cues})=>{
   localStorage.setItem('qk-sound','true');
   localStorage.setItem('qk-play-preferences-v1',JSON.stringify({schema:1,soundCues:cues}));
   localStorage.setItem('qk-study-v2:guest',JSON.stringify({schema:2,start:'4k3/4n3/8/8/8/8/4R3/4K3 w - - 0 1',moves:[],cursor:0,variant:'standard',mode:'analysis',human:'w',level:1}));
   window.cuesHeard=[];
   const add=AudioContext.prototype.createOscillator;
   AudioContext.prototype.createOscillator=function(){const oscillator=add.call(this),frequency=oscillator.frequency,original=frequency.setValueAtTime.bind(frequency);
    frequency.setValueAtTime=(v,t)=>{window.cuesHeard.push(v);return original(v,t);};
    return oscillator;};
  },{cues});await page.goto(url);await btn(page,'Study, puzzles & Chess960').click();
  const square=(s)=>page.locator('[data-square='+s+']').first();
  await square('e2').click();await square('e7').click();
  await expect(square('e7')).toHaveAttribute('data-piece','wr');
  if(expected.length)await expect.poll(()=>page.evaluate(()=>window.cuesHeard)).toEqual(expected);
  await page.waitForTimeout(220);
  expect(await page.evaluate(()=>window.cuesHeard)).toEqual(expected);
 });
}
