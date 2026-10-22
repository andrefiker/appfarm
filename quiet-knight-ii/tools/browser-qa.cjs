const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'):'playwright');
const root=path.resolve(__dirname,'../web'),out=path.resolve(__dirname,'../evidence/browser-tests.json');
const report={browser:'',checks:[],engineSearches:[],errors:[],externalRequests:[]};
const check=(name,value)=>{assert(value,name);report.checks.push({name,pass:true});fs.writeFileSync(out,JSON.stringify(report,null,2));};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.QK_CHROME,headless:true,args:['--no-sandbox','--no-zygote','--single-process','--disable-dev-shm-usage']});
 report.browser=browser.version();
 const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='https://appassets.androidplatform.net'){report.externalRequests.push(u.origin);return route.abort();}const p=path.join(root,decodeURIComponent(u.pathname));if(!p.startsWith(root+path.sep)||!fs.existsSync(p))return route.fulfill({status:404,body:''});const ext=path.extname(p),type={'.js':'text/javascript','.wasm':'application/wasm','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.txt':'text/plain'}[ext]||'application/octet-stream';return route.fulfill({status:200,contentType:type,body:fs.readFileSync(p)});});
 await context.setOffline(true);
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('https://appassets.androidplatform.net/index.html?qa');await page.waitForFunction(()=>window.qkBooted);
 check('bundled board starts with 32 rendered SVG pieces',await page.locator('.sq .art').count()===32);
 const positions=[
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
  '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2',
  '7k/P7/8/8/8/8/8/7K w - - 0 1',
  '4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1',
  '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'];
 for(let level=0;level<5;level++)for(let i=0;i<positions.length;i++){
  const value=await page.evaluate(async({fen,level})=>{const g=new qk.Game(fen),e=new qk.Engine(),start=performance.now();const answer=await e.search(g,level);const m=g.move(answer.move);return{move:m.san,elapsed:performance.now()-start,mate:g.chess.isCheckmate(),engine:answer.engine};},{fen:positions[i],level});
  report.engineSearches.push({level:level+1,position:i,...value});check(`offline engine level ${level+1} fixture ${i} returns a legal move`,!!value.move);
  if(level===4&&i===5)check('Master finds mate in one',value.mate);
 }
 await page.evaluate(()=>{qk.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','local');qk.setPrefs({haptics:false});});
 await page.locator('[data-square=e2]').tap();await page.locator('[data-square=e4]').tap();
 check('tap move e2-e4',await page.evaluate(()=>qk.getGame().moves.at(-1)?.to==='e4'));
 const a=await page.locator('[data-square=e7]').boundingBox(),b=await page.locator('[data-square=e5]').boundingBox();
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:6});await page.mouse.up();
 check('drag move e7-e5',await page.evaluate(()=>qk.getGame().moves.at(-1)?.to==='e5'));
 const saved=await page.evaluate(()=>qk.getGame().chess.fen());await page.reload();await page.waitForFunction(()=>window.qkBooted);
 check('saved position survives reload',await page.evaluate(()=>qk.getGame().chess.fen())===saved);
 await page.evaluate(()=>{window.onNativePause();window.onNativeResume();});
 check('simulated native pause/resume preserves game',await page.evaluate(()=>qk.getGame().chess.fen())===saved);
 await page.locator('#vision').tap();if(await page.locator('#sheet').evaluate(e=>e.open))await page.locator('#closeSheet').tap();
 check('tactical vision enabled',await page.evaluate(()=>qk.getPrefs().vision));
 await page.evaluate(()=>qk.setPrefs({defenders:true,white:true,black:true,opacity:32,reduced:true}));
 check('reduced motion applied',await page.locator('body').evaluate(e=>e.classList.contains('reduce-motion')));
 for(const width of [320,360,393,430]){await page.setViewportSize({width,height:900});check(`board fits ${width}px`,await page.locator('.board-frame').evaluate(e=>e.getBoundingClientRect().right<=innerWidth&&e.getBoundingClientRect().left>=0));await page.screenshot({path:path.join(__dirname,`../evidence/recovery-phone-${width}.png`),fullPage:true});}
 await page.evaluate(()=>qk.load('7k/P7/8/8/8/8/8/7K w - - 0 1'));
 await page.locator('[data-square=a7]').tap();await page.locator('[data-square=a8]').tap();
 check('promotion dialog remains visible',await page.locator('#sheet').evaluate(e=>e.open));
 const buttons=await page.locator('#sheetBody button').count();check('promotion offers four choices',buttons===4);
 await page.locator('#sheetBody button').last().tap();check('underpromotion commits',await page.evaluate(()=>!!qk.getGame().moves.at(-1)?.promotion));
 check('no JavaScript errors',report.errors.length===0);check('no external requests',report.externalRequests.length===0);
 report.completed=true;fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,searches:report.engineSearches.length,browser:report.browser,errors:report.errors.length}));await browser.close();
})().catch(e=>{report.failure=e.stack;fs.writeFileSync(out,JSON.stringify(report,null,2));console.error(e);process.exit(1);});
