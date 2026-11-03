import {test,expect} from '@playwright/test';
const url=process.env.QK_FRONTEND_URL||'http://127.0.0.1:3000/';
test.skip(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url),'isolated candidate only');
test('post-game weak-spot practice forks a position and retains the archived original',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('qk-study-v2:guest',JSON.stringify({schema:2,start:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',moves:['f2f3','e7e5','g2g4','d8h4'],cursor:4,variant:'standard',mode:'analysis',archiveMode:'computer',archiveId:'practice-test-original',human:'w',level:5}));});
 const btn=n=>page.getByRole('button',{name:n,exact:true});
 await page.goto(url);await btn('Study, puzzles & Chess960').click();await btn('analysis').click();await btn('Analyse game').click();await expect(page.getByText(/Game analysis complete/)).toBeVisible({timeout:30000});const practice=page.getByRole('button',{name:/Practise position before move/}).first();await expect(practice).toBeVisible();await practice.click();await expect(page.getByText(/Separate practice position/)).toBeVisible();const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('qk-study-v2:guest')));expect(save.moves).toEqual([]);expect(save.start).not.toContain('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP');
 const archived=await page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('quiet-knight-move-archive-v1');r.onsuccess=()=>{const q=r.result.transaction('games').objectStore('games').getAll();q.onsuccess=()=>{resolve(q.result.find(g=>g.id==='studio:practice-test-original'));r.result.close();};};}));expect(archived.sans).toEqual(['f3','e5','g4','Qh4#']);
});
