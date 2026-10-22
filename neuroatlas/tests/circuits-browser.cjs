// Real rendered flows for the new disorder explorer. No patient data.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),shots=path.join(root,'qa/screenshots');
(async()=>{
 const server=require('node:http').createServer((req,res)=>{
  const n=new URL(req.url,'http://localhost').pathname;
  try{const f=path.join(root,'web',n==='/'?'index.html':n);res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(8776,'127.0.0.1',r));
 const b=await chromium.launch({headless:false,executablePath:process.env.CHROME_PATH,args:['--headless=old','--no-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote']});
 const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const p=await c.newPage(),errors=[],requests=[],checks=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
 let rendered=0;
 const getState=()=>p.evaluate(()=>({...Neuro.state.stack.at(-1)}));
 async function check(name,fn){try{await fn();checks.push({name,pass:true});console.log('PASS '+name);}catch(e){checks.push({name,pass:false,error:String(e)});throw e;}}
 async function library(){if(await p.locator('.overlay').count())await p.getByLabel('Fechar',{exact:true}).click();await p.locator('[data-action="tab"][data-id="library"]').click();}
 async function open(id){await library();await p.locator(`[data-action="circuit"][data-id="${id}"]`).click();}
 async function shot(name,selector){if(selector)await p.locator(selector).scrollIntoViewIfNeeded();await p.screenshot({path:path.join(shots,name)});}
 try{
 await p.goto('http://127.0.0.1:8776/');await library();
 await check('Twenty disorder maps are discoverable and search tolerates accents',async()=>{
  assert.equal(await p.locator('.map-link').count(),20);
  await shot('psychiatry-list-390-dark.png');
  await p.locator('#library-search').fill('compulsao alimentar');assert.ok(await p.locator('[data-action="circuit"][data-id="binge-topic"]').count());
  await p.locator('#library-search').fill('agorafobia');assert.equal(await p.locator('.map-link').count(),1);
  await p.locator('#library-search').fill('zzsemresultadozz');assert.match(await p.locator('.empty').innerText(),/Nenhum tema/);
  await p.locator('#library-search').fill('');
 });
 await check('Every disorder, aspect and anatomical view renders the intended highlights',async()=>{
  const profiles=await p.evaluate(()=>ATLAS_DATA.conditions.filter(x=>x.map).map(x=>({id:x.id,aspects:x.map.aspects.map(a=>a.id)})));
  for(const profile of profiles){
   await p.locator(`[data-action="circuit"][data-id="${profile.id}"]`).click();
   for(const aspect of ['all',...profile.aspects]){
    await p.locator(`[data-action="circuit-aspect"][data-id="${aspect}"]`).click();
    for(const view of ['lateral','medial','inferior','coronalA','coronalP']){
     await p.locator(`.circuit-views [data-action="circuit-view"][data-id="${view}"]`).click();
     const result=await p.evaluate(()=>{
      const s=Neuro.state.stack.at(-1),topic=ATLAS_DATA.conditions.find(x=>x.id===s.id),sel=NeuroCircuits.selection(topic,s.aspect);
      return {expected:sel.nodes.filter(id=>Object.prototype.hasOwnProperty.call(Anatomy.marks[s.view],id)).sort(),actual:[...document.querySelectorAll('#circuit-viewport path.circuit-on')].map(e=>e.dataset.region).sort(),edges:[...document.querySelectorAll('.circuit-link')].map(e=>e.getAttribute('d')),inactiveFocusable:document.querySelectorAll('#circuit-viewport .circuit-off[tabindex="0"]').length,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,svgWidth:document.querySelector('#circuit-viewport svg').getBoundingClientRect().width};
     });
     assert.deepEqual(result.actual,result.expected,profile.id+'/'+aspect+'/'+view);
     assert.ok(result.svgWidth>200);assert.equal(result.overflow,false);assert.equal(result.inactiveFocusable,0);assert.ok(result.edges.every(x=>!x.includes('NaN')));
     if(!result.expected.length)assert.match(await p.locator('.overlay-body').innerText(),/Este plano não mostra/);
     rendered++;
    }
   }
   await p.getByLabel('Fechar',{exact:true}).click();
  }
 });
 await check('A diagram node locates its own anatomical plane; nested navigation restores selection',async()=>{
  await open('ocd-topic');await p.locator('[data-action="circuit-aspect"][data-id="loops"]').click();
  await p.locator('.circuit-diagram [data-id="basal"]').click();assert.equal((await getState()).view,'coronalA');
  assert.match(await p.locator('.circuit-region h3').innerText(),/Núcleos da base/);
  await p.locator('.circuit-region [data-action="region-detail"]').click();await p.getByLabel('Voltar',{exact:true}).click();
  assert.equal((await getState()).node,'basal');assert.equal((await getState()).aspect,'loops');
  await p.getByText('Referências deste recorte',{exact:true}).click();await p.locator('.source-button[data-id="ocd-circuits"]:visible').first().click();assert.match(await p.locator('.source-url').last().innerText(),/PMC8091795/);
  await p.getByLabel('Voltar',{exact:true}).click();assert.equal((await getState()).aspect,'loops');
  await p.locator('.circuit-views [data-id="inferior"]').click();
  await shot('psychiatry-ocd-inferior-390-dark.png','.circuit-anatomy');
 });
 await check('Touch, pinch, drag and reset work in the highlighted anatomy',async()=>{
  await open('panic-topic');await p.locator('[data-action="circuit-aspect"][data-id="all"]').click();await p.locator('.circuit-views [data-id="coronalA"]').click();
  await p.locator('.circuit-anatomy').scrollIntoViewIfNeeded();
  const marker=p.locator('#circuit-viewport .brain-label[data-region="amygdala"] circle'),rect=await marker.boundingBox();
  await p.touchscreen.tap(rect.x+rect.width/2,rect.y+rect.height/2);assert.equal((await getState()).node,'amygdala');
  const cd=await c.newCDPSession(p),v=await p.locator('#circuit-viewport').boundingBox(),x=v.x+v.width/2,y=v.y+v.height/2;
  const pt=(id,x,y)=>({id,x,y,radiusX:4,radiusY:4,force:1});
  await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(1,x-25,y),pt(2,x+25,y)]});
  for(let d=30;d<=70;d+=10)await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt(1,x-d,y),pt(2,x+d,y)]});
  await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok((await getState()).zoom>2);
  const before=(await getState()).panX;await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(1,x,y)]});await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt(1,x+30,y+15)]});await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.notEqual((await getState()).panX,before);
  await p.getByLabel('Redefinir ampliação do mapa',{exact:true}).click();assert.equal((await getState()).zoom,1);await cd.detach();
 });
 await check('Patient reading is concise and preserves boundaries without technical evidence panels',async()=>{
  await p.getByRole('button',{name:'Mostrar ao paciente',exact:true}).click();
  assert.match(await p.locator('.circuit-boundary').innerText(),/Não mede o seu cérebro/);
  assert.equal(await p.locator('.circuit-evidence').count(),0);
  await p.locator('[data-action="circuit-aspect"]').nth(1).click();
  const expected=await p.evaluate(()=>{const s=Neuro.state.stack.at(-1);return ATLAS_DATA.conditions.find(c=>c.id===s.id).map.aspects.find(a=>a.id===s.aspect).patient;});
  assert.equal(await p.locator('.circuit-description p').innerText(),expected);
  await shot('psychiatry-patient-390-dark.png','.circuit-anatomy');
  await p.getByRole('button',{name:'Voltar à leitura clínica',exact:true}).click();
 });
 await check('Map bookmarks reuse stable topic IDs and no query or map state is persisted',async()=>{
  await open('ocd-topic');await p.locator('[data-action="bookmark"]').click();await p.reload();
  await p.locator('[data-action="tab"][data-id="saved"]').click();assert.ok(await p.locator('[data-action="condition-detail"][data-id="ocd-topic"]').count());
  await p.locator('[data-action="condition-detail"][data-id="ocd-topic"]').first().click();await p.locator('.map-entry [data-action="circuit"]').click();
  const storage=await p.evaluate(()=>JSON.parse(localStorage.getItem('neuroatlas-v1')));
  assert.deepEqual(Object.keys(storage).sort(),['mode','theme','hand','font','motion','bookmarks','recent'].sort());assert.ok(storage.bookmarks.includes('condition:ocd-topic'));
 });
 await check('All maps retain operation after networking is disabled',async()=>{
  await c.setOffline(true);await open('borderline-topic');await p.locator('[data-action="circuit-aspect"][data-id="emotion"]').click();
  await p.locator('.circuit-diagram [data-id="amygdala"]').click();assert.equal((await getState()).node,'amygdala');
  await p.getByText('Referências deste recorte',{exact:true}).click();await p.locator('.source-button[data-id="borderline-meta"]:visible').first().click();assert.match(await p.locator('.source-url').last().innerText(),/25935068/);await p.getByLabel('Voltar',{exact:true}).click();await c.setOffline(false);
 });
 await check('320–430 px, light/dark, large text, alternate handedness and 44 px controls fit',async()=>{
  for(const theme of ['dark','light']){
   await p.getByLabel('Fechar',{exact:true}).click();await p.getByLabel('Preferências',{exact:true}).click();
   await p.locator('[data-setting="theme"]').selectOption(theme);await p.locator('[data-setting="font"]').selectOption('large');await p.locator('[data-setting="hand"]').selectOption(theme==='light'?'right':'left');await p.getByLabel('Fechar',{exact:true}).click();
   for(const width of [320,360,390,430]){
    await p.setViewportSize({width,height:900});await open('ocd-topic');
    const over=await p.locator('.overlay').evaluate(el=>el.scrollWidth>el.clientWidth);assert.equal(over,false,theme+'/'+width);
    const small=await p.locator('.overlay button').evaluateAll(bs=>bs.filter(x=>x.getBoundingClientRect().height>0).filter(x=>x.getBoundingClientRect().height<44||x.getBoundingClientRect().width<44).map(x=>({text:x.textContent,width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height})));
    assert.deepEqual(small,[],theme+'/'+width);
    const clipped=await p.locator('.circuit-node').evaluateAll(bs=>bs.filter(x=>x.scrollHeight>x.clientHeight||x.scrollWidth>x.clientWidth).map(x=>x.textContent));assert.deepEqual(clipped,[],theme+'/'+width);
    await shot(`psychiatry-map-${width}-${theme}-large.png`,'.circuit-anatomy');
    await p.locator('.circuit-diagram').scrollIntoViewIfNeeded();await shot(`psychiatry-diagram-${width}-${theme}-large.png`);
   }
  }
 });
 await check('No JavaScript exceptions or external network requests',async()=>{assert.deepEqual(errors,[]);assert.ok(requests.every(u=>u.startsWith('http://127.0.0.1:8776/')));});
 }finally{
  fs.writeFileSync(path.join(root,'qa/circuit-browser-results.json'),JSON.stringify({version:'1.2.0',engine:await b.version(),renderedMapViews:rendered,checks,errors,requests:[...new Set(requests)],note:'Desktop browser touch emulation; not an Android device install or independent clinical validation.'},null,2));await b.close();server.close();
 }
})().catch(e=>{console.error(e);process.exit(1)});
