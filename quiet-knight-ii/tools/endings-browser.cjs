const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'):'playwright');
const version=require('../package.json').version;
const root=path.resolve(__dirname,'../web'),out=path.resolve(__dirname,`../evidence/endings-browser-${version}.json`);
const report={checks:[],errors:[],requests:[]};
const check=(name,pass)=>{assert(pass,name);report.checks.push({name,pass});fs.writeFileSync(out,JSON.stringify(report,null,2));};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.QK_CHROME,headless:true,args:['--no-sandbox','--no-zygote','--single-process','--disable-dev-shm-usage']});report.browser=browser.version();
 const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='https://appassets.androidplatform.net'){report.requests.push(u.origin);return route.abort();}const p=path.join(root,decodeURIComponent(u.pathname));if(!p.startsWith(root+path.sep)||!fs.existsSync(p))return route.fulfill({status:404,body:''});const type={'.js':'text/javascript','.wasm':'application/wasm','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.txt':'text/plain'}[path.extname(p)]||'application/octet-stream';return route.fulfill({status:200,contentType:type,body:fs.readFileSync(p)});});
 await context.setOffline(true);const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('https://appassets.androidplatform.net/index.html?qa');await page.waitForFunction(()=>window.qkBooted);
 await page.evaluate(()=>{qk.load('k7/8/8/p1p1p1p1/P1P1P1P1/1K6/1P6/8 w - - 0 1','local');qk.setPrefs({haptics:false,reduced:true});});
 check('temporary king blocker is playable',await page.evaluate(()=>!qk.getGame().status().over));
 for(const [from,to] of [['b3','a3'],['a8','b8'],['b2','b4'],['a5','b4']]){await page.locator(`[data-square=${from}]`).tap();await page.locator(`[data-square=${to}]`).tap();}
 check('four real tap moves break the barrier',await page.evaluate(()=>qk.getGame().moves.length===4&&qk.getGame().chess.get('b4')?.color==='b'));
 check('capture correctly exposes check',await page.evaluate(()=>qk.getGame().chess.inCheck()));
 const fen=await page.evaluate(()=>qk.getGame().chess.fen());await page.reload();await page.waitForFunction(()=>window.qkBooted);
 check('repaired position survives reload',await page.evaluate(()=>qk.getGame().chess.fen())===fen);
 await page.evaluate(()=>qk.load('k7/8/8/p1p1p1p1/P1P1P1P1/1K6/8/8 w - - 0 1','local'));
 check('genuine fixed fortress shows draw',/Dead position.*Draw/.test(await page.locator('#status').innerText()));
 await page.evaluate(()=>qk.load('k7/8/2p1p3/p1PpP1p1/P2P2P1/8/1K6/8 w - d6 0 20','local'));
 check('en-passant right prevents a premature draw',await page.evaluate(()=>!qk.getGame().status().over));
 await page.locator('[data-square=e5]').tap();await page.locator('[data-square=d6]').tap();
 check('en-passant capture breaks barrier through touch controls',await page.evaluate(()=>qk.getGame().moves.at(-1)?.to==='d6'&&!qk.getGame().chess.get('d5')));
 await page.evaluate(()=>qk.load('7k/8/8/8/8/8/8/KQ6 w - - 0 1','local'));
 await page.locator('#table').tap();await page.locator('#resign').tap();await page.locator('#confirmResign').tap();
 check('resignation against bare king renders a draw',/only a king.*Draw/.test(await page.locator('#status').innerText()));
 check('completed game stores draw score',await page.evaluate(()=>qk.getState().records.at(-1)?.state.score==='1/2-1/2'));
 await page.reload();await page.waitForFunction(()=>window.qkBooted);
 check('resignation result survives reload',await page.evaluate(()=>qk.getGame().status().score==='1/2-1/2'));
 await page.screenshot({path:path.join(__dirname,`../evidence/resignation-draw-${version}.png`),fullPage:true});
 check('undo stays disabled when there is no move history',await page.locator('#undo').isDisabled());
 for(const theme of ['wood','graphite','felt']){await page.evaluate(theme=>qk.setPrefs({theme}),theme);check('theme still renders '+theme,await page.locator('.sq .art').count()===3);}
 await page.setViewportSize({width:320,height:800});check('320px board fits',await page.locator('.board-frame').evaluate(e=>e.getBoundingClientRect().left>=0&&e.getBoundingClientRect().right<=innerWidth));
 const reply=await page.evaluate(async()=>{const g=new qk.Game(),e=new qk.Engine(),answer=await e.search(g,0);return g.move(answer.move).san;});check('bundled offline engine smoke test',!!reply);report.engineMove=reply;
 check('no JavaScript errors',report.errors.length===0);check('no external requests',report.requests.length===0);
 report.completed=true;fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,browser:report.browser,engineMove:reply}));await browser.close();
})().catch(e=>{report.failure=e.stack;fs.writeFileSync(out,JSON.stringify(report,null,2));console.error(e);process.exit(1);});
