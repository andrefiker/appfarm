const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),shots=path.join(root,'qa/screenshots');
(async()=>{
 const server=require('node:http').createServer((req,res)=>{const n=new URL(req.url,'http://localhost').pathname;const file=path.join(root,'web',n==='/'?'index.html':n);try{const data=fs.readFileSync(file);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data)}catch{res.writeHead(404);res.end()}});
 await new Promise(r=>server.listen(8775,'127.0.0.1',r));
 const b=await chromium.launch({headless:false,executablePath:process.env.CHROME_PATH,args:['--headless=old','--no-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote']});
 const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const p=await c.newPage();await p.goto('http://127.0.0.1:8775/');
 const report={engine:await b.version(),markers:[],checks:[],performance:{}};
 async function check(name,fn){try{await fn();report.checks.push({name,pass:true})}catch(e){report.checks.push({name,pass:false,error:String(e)});}}
 await check('Every numbered anatomical marker is inside its own structure',async()=>{
  report.markers=await p.evaluate(()=>{const box=document.createElement('div');document.body.append(box);const out=[];for(const [view,v] of Object.entries(Anatomy.views)){box.innerHTML=Anatomy.svg(view);for(const [id,[x,y]] of Object.entries(Anatomy.marks[view])){const s=box.querySelector(`path[data-region="${id}"]`);out.push({view,id,x,y,inside:(()=>{const pt=box.querySelector('svg').createSVGPoint();pt.x=x;pt.y=y;return s.isPointInFill(pt)})()});}}box.remove();return out;});
  assert.deepEqual(report.markers.filter(x=>!x.inside),[]);
 });
 for(const v of ['lateral','medial','inferior','coronal','coronalP']){await p.locator(`[data-action="view"][data-id="${v}"]`).click();await p.screenshot({path:path.join(shots,`anatomy-${v}-390.png`)});await p.locator('.atlas-panel').screenshot({path:path.join(shots,`drawing-${v}.png`)});}
 await p.locator('[data-action="view"][data-id="lateral"]').click();
 await check('Real touch taps select a structure and pinch/drag changes transform',async()=>{
  const label=p.locator('#viewport .brain-label[data-region="temporal"] circle');const rect=await label.boundingBox();await p.touchscreen.tap(rect.x+rect.width/2,rect.y+rect.height/2);assert.equal(await p.evaluate(()=>Neuro.state.selected),'temporal');
  const cd=await c.newCDPSession(p);const vp=await p.locator('#viewport').boundingBox();const x=vp.x+vp.width/2,y=vp.y+vp.height/2;
  const point=(id,x,y)=>({id,x,y,radiusX:4,radiusY:4,force:1});
  await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(1,x-25,y),point(2,x+25,y)]});
  for(let d=30;d<=70;d+=10)await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(1,x-d,y),point(2,x+d,y)]});
  await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(await p.evaluate(()=>Neuro.state.zoom>2));
  const before=await p.evaluate(()=>Neuro.state.panX);await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(1,x,y)]});await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(1,x+40,y+15)]});await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.notEqual(await p.evaluate(()=>Neuro.state.panX),before);
  await p.locator('[data-action="zoom"][data-id="reset"]').click();assert.equal(await p.evaluate(()=>Neuro.state.zoom),1);await cd.detach();
 });
 await check('All runtime content works with browser networking disabled after initial load',async()=>{
  await c.setOffline(true);await p.locator('[data-action="tab"][data-id="library"]').click();await p.locator('[data-action="library-filter"][data-id="all"]').click();await p.locator('[data-action="condition-detail"][data-id="stroke-topic"]').click();assert.match(await p.locator('.overlay').innerText(),/SAMU 192/);await p.locator('[data-action="source"][data-id="stroke"]').click();assert.match(await p.locator('.source-url').innerText(),/gov.br/);
  assert.equal(await p.evaluate(()=>Neuro.back()),true);assert.match(await p.locator('.overlay h1').innerText(),/AVC/);assert.equal(await p.evaluate(()=>Neuro.back()),true);assert.equal(await p.evaluate(()=>Neuro.back()),true);assert.equal(await p.evaluate(()=>Neuro.back()),false);
  await p.getByLabel('Buscar no atlas',{exact:true}).click();await p.locator('#global-search').fill('ínsula');await p.locator('#search-results [data-action="region-detail"][data-id="insula"]').click();await p.locator('[data-action="bookmark"]').click();await p.getByLabel('Fechar',{exact:true}).click();await c.setOffline(false);await p.reload();assert.ok((await p.evaluate(()=>Neuro.prefs().bookmarks)).includes('region:insula'));
 });
 await check('Main text and secondary text meet 4.5:1 contrast in both themes',async()=>{
  report.contrast=await p.evaluate(()=>{const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);const lum=a=>a.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);const out=[];const probe=document.createElement('span');document.body.append(probe);for(const theme of ['dark','light']){document.body.classList.toggle('light',theme==='light');const css=getComputedStyle(document.body);for(const text of ['--text','--muted','--accent'])for(const bg of ['--bg','--surface','--surface2']){probe.style.color=`var(${text})`;const fg=rgb(getComputedStyle(probe).color);probe.style.color=`var(${bg})`;const back=rgb(getComputedStyle(probe).color);out.push({theme,text,bg,ratio:ratio(fg,back)});}}probe.remove();document.body.classList.remove('light');return out;});assert.ok(report.contrast.every(v=>v.ratio>=4.5),JSON.stringify(report.contrast.filter(v=>v.ratio<4.5)));
 });
 await check('Primary controls have 44 px targets and modal keyboard focus is bounded',async()=>{
  const small=await p.locator('button').evaluateAll(bs=>bs.filter(x=>x.getBoundingClientRect().height>0).filter(x=>x.getBoundingClientRect().height<44||x.getBoundingClientRect().width<44).map(x=>({text:x.textContent,width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height})));assert.deepEqual(small,[]);
  await p.getByLabel('Preferências',{exact:true}).click();await p.keyboard.press('Shift+Tab');assert.ok(await p.evaluate(()=>!!document.activeElement.closest('.overlay')));await p.keyboard.press('Escape');assert.equal(await p.locator('.overlay').count(),0);
 });
 report.performance=await p.evaluate(()=>{const t=performance.now();for(let i=0;i<1000;i++)NeuroModel.search(ATLAS_DATA,'memória');const nav=performance.getEntriesByType('navigation')[0];return {search1000Ms:performance.now()-t,domContentLoadedMs:nav.domContentLoadedEventEnd,webDataBytes:JSON.stringify(ATLAS_DATA).length,note:'Desktop headless browser timing; not Android startup or frame-rate evidence.'}});
 fs.writeFileSync(path.join(root,'qa/anatomy-touch-results.json'),JSON.stringify(report,null,2));await b.close();server.close();console.log(JSON.stringify(report,null,2));if(report.checks.some(c=>!c.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
