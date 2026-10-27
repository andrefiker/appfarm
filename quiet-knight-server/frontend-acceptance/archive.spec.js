import {test,expect} from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';
const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:3000/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url),'isolated candidate only');
async function move(p,from,to){await expect(p.locator(`[data-square=${from}]`)).toHaveAttribute('aria-disabled','false');await p.locator(`[data-square=${from}]`).click();await p.locator(`[data-square=${to}]`).click();}
async function exported(page,kind){const next=page.waitForEvent('download');await page.getByRole('button',{name:`Export all games · ${kind.toUpperCase()}`,exact:true}).click();const f=await next;return readFile(await f.path(),'utf8');}
test('seven offline games, legacy recovery, undo branches, reload, JSON/PGN exports and native save payload',async({page,context})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(localStorage.getItem('archive-test-seeded'))return;localStorage.setItem('archive-test-seeded','yes');localStorage.setItem('qk-recent-games-v1:guest',JSON.stringify([{id:'legacy-kept',mode:'computer',white:'You',black:'Computer',sans:[],fen:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',result:'0-1',date:'2026-10-01T12:00:00Z'}]));localStorage.setItem('qk-seat-private','DO-NOT-EXPORT-SEAT');});
 await page.goto(url);await expect(page.getByText('Computer files saved for offline play',{exact:false})).toBeVisible({timeout:30000});await page.getByRole('button',{name:'Pass and play · offline',exact:true}).click();
 for(let i=0;i<7;i++){await move(page,'e2','e4');await move(page,'e7','e5');if(i===0){await page.getByRole('button',{name:'Undo local move',exact:true}).click();await move(page,'c7','c5');}if(i<6)await page.getByRole('button',{name:'New pass-and-play',exact:true}).click();}
 await page.getByRole('button',{name:'Back to table',exact:true}).click();await page.getByRole('button',{name:'Move archive & export',exact:true}).click();
 await expect(page.getByText('8 archived games on this device for Guest.',{exact:false})).toBeVisible();
 const text=await exported(page,'json'),data=JSON.parse(text);expect(data.game_count).toBe(8);expect(data.games.filter(g=>g.mode==='pass')).toHaveLength(7);expect(data.games.some(g=>g.events.some(e=>e.removed.includes('e5')))).toBe(true);expect(text).not.toContain('DO-NOT-EXPORT-SEAT');expect(data.games[0].id).toBe('legacy-kept');
 const pgn=await exported(page,'pgn');expect((pgn.match(/\[Event /g)||[]).length).toBe(8);expect(pgn).toContain('1. e4 c5 *');
 await mkdir('output/playwright',{recursive:true});await page.screenshot({path:'output/playwright/move-archive-390.png',fullPage:true});
 await page.getByRole('button',{name:'Close dialog',exact:true}).click();await context.setOffline(true);await page.reload();await page.getByRole('button',{name:'Move archive & export',exact:true}).click();expect(JSON.parse(await exported(page,'json')).game_count).toBe(8);await context.setOffline(false);
 // Verify the native save contract without claiming a physical SAF picker test.
 await page.evaluate(()=>{window.QuietKnightExport={postMessage:text=>{window.archiveSavePayload=JSON.parse(text);}};});await page.getByRole('button',{name:'Export all games · JSON',exact:true}).click();await expect(page.getByRole('button',{name:'Export all games · JSON',exact:true})).toBeDisabled();
 const saved=await page.evaluate(()=>window.archiveSavePayload);expect(saved.mime).toBe('application/json');expect(JSON.parse(saved.text).game_count).toBe(8);expect(saved.name).toMatch(/Quiet-Knight-games-.*\.json/);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('qk-export-result',{detail:{cancelled:true}})));await expect(page.getByText('Export cancelled.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Export all games · JSON',exact:true})).toBeEnabled();expect(errors).toEqual([]);
});
test('archive failure is visible and never deletes the normal computer save',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'indexedDB',{value:{open(){throw new DOMException('Synthetic full storage','QuotaExceededError');}}}));await page.goto(url);await page.getByRole('button',{name:'Play White',exact:true}).click();await move(page,'e2','e4');await expect(page.getByRole('alert').filter({hasText:'Move archive could not be saved'}).first()).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('qk-local-save-v1:guest')).moves[0].from)).toBe('e2');
});
