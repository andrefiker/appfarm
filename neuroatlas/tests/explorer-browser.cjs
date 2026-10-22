/* UI-driven regression tests for v1.2. Browser emulation is not an Android installation. */
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),shots=path.join(root,'qa/screenshots/v1.2');fs.mkdirSync(shots,{recursive:true});
(async()=>{
 const server=require('node:http').createServer((req,res)=>{try{const n=new URL(req.url,'http://localhost').pathname,f=path.join(root,'web',n==='/'?'index.html':n);res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(8777,'127.0.0.1',r));
 const b=await chromium.launch({headless:false,executablePath:process.env.CHROME_PATH,args:['--headless=old','--no-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote']});
 const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),p=await c.newPage();p.setDefaultTimeout(10000);
 const errors=[],requests=[],checks=[];let comparisons=0,presentationFrames=0,storyFrames=0,responsiveScreens=0;
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
 const action=(a,id)=>p.locator(`[data-action="${a}"]${id===undefined?'':`[data-id="${id}"]`}`);
 const state=()=>p.evaluate(()=>Neuro.state.stack.at(-1));
 async function close(){if(await p.locator('.overlay').count())await p.getByLabel('Fechar',{exact:true}).click();}
 async function library(){await close();await action('tab','library').click();await action('library-mode','conditions').click();}
 async function functions(){await close();await action('tab','library').click();await action('library-mode','functions').click();}
 async function circuit(id){await library();await action('circuit',id).click();}
 async function func(id){await functions();await action('function',id).click();}
 async function stories(){await close();await action('tab','tools').click();await action('stories').click();}
 async function shot(name,selector){if(selector)await p.locator(selector).scrollIntoViewIfNeeded();await p.screenshot({path:path.join(shots,name+'.png')});}
 async function check(name,fn){try{await fn();checks.push({name,pass:true});console.log('PASS '+name);}catch(e){checks.push({name,pass:false,error:String(e)});await shot('failure');throw e;}}
 async function fits(label){const over=await p.evaluate(()=>({page:document.documentElement.scrollWidth>document.documentElement.clientWidth,modal:!!document.querySelector('.overlay')&&document.querySelector('.overlay').scrollWidth>document.querySelector('.overlay').clientWidth}));assert.deepEqual(over,{page:false,modal:false},label);const scope=await p.locator('.overlay').count()?'.overlay':'main';const small=await p.locator(scope+' button,'+scope+' summary,'+scope+' select').evaluateAll(bs=>bs.filter(x=>x.getBoundingClientRect().height>0&&!x.disabled).filter(x=>x.getBoundingClientRect().height<43.9||x.getBoundingClientRect().width<43.9).map(x=>({text:x.textContent,width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height})));assert.deepEqual(small,[],label);const clip=await p.locator('.circuit-node').evaluateAll(bs=>bs.filter(x=>x.scrollHeight>x.clientHeight+1||x.scrollWidth>x.clientWidth+1).map(x=>x.textContent));assert.deepEqual(clip,[],label);}
 try{
 await p.goto('http://127.0.0.1:8777/');
 await check('Refined anatomy exposes internal planes and toggles named landmarks',async()=>{
  await action('atlas-landmarks').click();assert.equal(await p.locator('.anatomy-landmarks path').count(),2);assert.match(await p.locator('.landmark-key').innerText(),/Sulco central/);await shot('anatomy-lateral-390-dark','#viewport');
  await action('atlas-layer').click();assert.equal(await p.evaluate(()=>Neuro.state.view),'coronalA');assert.ok(await p.locator('.white-matter').count());assert.ok(await p.locator('.tissue-muted').count());await shot('anatomy-internal-390-dark','#viewport');
 });
 await check('Function browsing and global accent-insensitive search lead to eight functional catalogs',async()=>{
  await functions();assert.equal(await action('function').count(),8);await shot('functions-390-dark');
  await p.getByLabel('Buscar no atlas',{exact:true}).click();await p.locator('#global-search').fill('repeticao flexibilidade');await p.locator('#search-results [data-action="function"]').click();assert.match(await p.locator('.overlay h1').innerText(),/Repetição/);await close();
 });
 await check('All functions compare different conditions with correct highlights in five planes',async()=>{
  for(const id of await p.evaluate(()=>ATLAS_DATA.functions.map(f=>f.id))){
   await func(id);await action('compare',id).click();
   const s=await state();assert.notEqual(s.first.split('|')[0],s.second.split('|')[0]);
   for(const view of ['lateral','medial','inferior','coronalA','coronalP']){
    await action('learning-view',view).click();const r=await p.evaluate(()=>{const s=Neuro.state.stack.at(-1),nodes=[...new Set([s.first,s.second].flatMap(k=>{const [c,a]=k.split('|');return ATLAS_DATA.conditions.find(x=>x.id===c).map.aspects.find(x=>x.id===a).nodes;}))];return {expected:nodes.filter(id=>Anatomy.marks[s.view][id]).sort(),actual:[...document.querySelectorAll('.learning-figure .circuit-on')].map(x=>x.dataset.region).sort()};});assert.deepEqual(r.actual,r.expected);comparisons++;await fits(id+'/'+view);
   }
   const options=await p.locator('[data-compare="second"] option').evaluateAll(es=>es.map(e=>e.value));await p.locator('[data-compare="second"]').selectOption(options.at(-1));assert.equal((await state()).second,options.at(-1));
   await p.locator('.compare-contexts [data-action="open-recut"]').first().click();assert.equal((await state()).type,'circuit');await p.getByLabel('Voltar',{exact:true}).click();assert.equal((await state()).type,'compare');
  }
  await func('attention');await action('compare','attention').click();await shot('compare-attention-390-dark','.learning-figure');
 });
 await check('Region and connection evidence open their actual sources and preserve map state',async()=>{
  await circuit('ocd-topic');await action('circuit-aspect','loops').click();await p.locator('.circuit-diagram [data-id="basal"]').click();assert.match(await p.locator('.highlight-evidence').innerText(),/Seleção didática/);await p.locator('.highlight-evidence summary').click();await p.locator('.highlight-evidence [data-action="source"][data-id="anatomy"]').first().click();assert.match(await p.locator('.source-url').last().innerText(),/uth.tmc.edu/);await p.getByLabel('Voltar',{exact:true}).click();assert.equal((await state()).node,'basal');
  await p.locator('.edge-list summary').click();await action('circuit-edge','0').click();assert.match(await p.locator('.edge-evidence').innerText(),/não valida esta linha/);assert.equal(await p.locator('.focused-link').count(),1);await shot('edge-evidence-390-dark','.edge-evidence');
  await p.locator('.edge-evidence summary').click();await p.locator('.edge-evidence [data-action="source"]').first().click();assert.match(await p.locator('.source-url').last().innerText(),/PMC8091795/);await p.getByLabel('Voltar',{exact:true}).click();assert.equal((await state()).edge,0);
 });
 await check('Recut stepping, anatomical emphasis and sticky context stay synchronized',async()=>{
  await action('circuit-step','next').click();assert.equal((await state()).aspect,'control');assert.match(await p.locator('.overlay-header>span').innerText(),/Metas e flexibilidade/);await action('circuit-step','prev').click();assert.equal((await state()).aspect,'loops');
  await p.locator('.overlay').evaluate(el=>el.scrollTop=10000);assert.ok((await p.locator('.overlay-header').boundingBox()).y<=1);assert.match(await p.locator('.overlay-header').innerText(),/TOC/);
  await action('circuit-landmarks').click();assert.ok(await p.locator('#circuit-viewport .anatomy-landmarks').count());await action('circuit-layer').click();assert.equal((await state()).tissue,'internal');await shot('unified-390-dark','.unified-map');
 });
 await check('All twenty presentations have short and extended slides without changing saved reading mode',async()=>{
  const mode=await p.evaluate(()=>Neuro.prefs().mode);
  for(const id of await p.evaluate(()=>ATLAS_DATA.conditions.filter(c=>c.map).map(c=>c.id))){await circuit(id);await action('circuit-aspect','all').click();await action('present',id).click();assert.equal(await p.locator('.presentation .learning-figure').count(),1);assert.match(await p.locator('.presentation-limit').innerText(),/Não mede/);presentationFrames++;
   await action('present-duration','long').click();const total=await p.evaluate(()=>NeuroExplorer.slides(ATLAS_DATA,Neuro.state.stack.at(-1)).length);for(let i=0;i<total;i++){assert.ok((await p.locator('.presentation-text').innerText()).length>20);assert.equal((await state()).step,i);presentationFrames++;if(i<total-1)await action('present-step','next').click();}assert.equal(await action('present-step','next').isDisabled(),true);await action('present-step','prev').click();assert.equal((await state()).step,total-2);
  }
  assert.equal(await p.evaluate(()=>Neuro.prefs().mode),mode);await func('attention');await action('present-function','attention').click();await shot('presentation-390-dark');
 });
 await check('Six fictional stories advance through all thirty steps with accessible regions and no user inputs',async()=>{
  for(const id of await p.evaluate(()=>ATLAS_DATA.stories.map(t=>t.id))){await stories();await action('story',id).click();assert.equal(await p.locator('.overlay input,.overlay textarea').count(),0);for(let i=0;i<5;i++){assert.equal((await state()).step,i);assert.equal(await p.locator('.story-steps [aria-current="step"]').innerText(),`${i+1}\n${['Situação','Corpo','Atenção','Ação','Consequência'][i]}`);assert.match(await p.locator('.presentation-limit').innerText(),/não sequência neural/);storyFrames++;if(i<4)await action('story-step','next').click();}await action('story-index','1').click();assert.equal((await state()).step,1);await p.locator('.figure-names [data-action="region-detail"]').first().click();await p.getByLabel('Voltar',{exact:true}).click();assert.equal((await state()).step,1);}
  await stories();await action('story','threat').click();await action('story-index','2').click();await shot('story-threat-390-dark','.story-copy');
 });
 await check('320–430 px and dark/light themes fit all new flows at normal and 200 percent text',async()=>{
  for(const theme of ['dark','light']){await close();await p.getByLabel('Preferências',{exact:true}).click();await p.locator('[data-setting="theme"]').selectOption(theme);await p.getByLabel('Fechar',{exact:true}).click();
   for(const width of [320,360,390,430])for(const scale of [1,2]){
    await p.setViewportSize({width,height:900});await p.evaluate(f=>document.body.style.setProperty('--f',f),String(scale));
    await functions();await fits(`${theme}/${width}/${scale}/functions`);responsiveScreens++;
    await action('function','attention').click();await fits('function');responsiveScreens++;
    await action('compare','attention').click();await fits('comparison');responsiveScreens++;
    await circuit('panic-topic');await action('circuit-aspect','all').click();await fits('circuit');responsiveScreens++;
    await action('present','panic-topic').click();await fits('presentation');responsiveScreens++;
    if(scale===1||width===320)await shot(`presentation-${width}-${theme}-${scale}x`);
    await stories();await action('story','memory').click();await fits('story');responsiveScreens++;
   }
  }
 });
 await check('New routes work offline and only settings, bookmarks and recent IDs survive reload',async()=>{
  await p.evaluate(()=>document.body.style.removeProperty('--f'));await c.setOffline(true);await func('reward');await action('compare','reward').click();await p.locator('.compare-contexts [data-action="open-recut"]').first().click();await action('present').click();await action('present-duration','long').click();await action('present-step','next').click();await stories();await action('story','reward').click();await action('story-step','next').click();await c.setOffline(false);
  const stored=await p.evaluate(()=>JSON.parse(localStorage.getItem('neuroatlas-v1')));assert.deepEqual(Object.keys(stored).sort(),['mode','theme','hand','font','motion','bookmarks','recent'].sort());assert.ok(!JSON.stringify(stored).includes('receita'));await p.reload();assert.equal(await p.locator('.overlay').count(),0);
 });
 await check('No JavaScript exceptions, remote requests, or hidden patient record forms',async()=>{assert.deepEqual(errors,[]);assert.ok(requests.every(u=>u.startsWith('http://127.0.0.1:8777/')));});
 }finally{fs.writeFileSync(path.join(root,'qa/explorer-browser-results.json'),JSON.stringify({version:'1.2.0',engine:await b.version(),comparisons,presentationFrames,storyFrames,responsiveScreens,checks,errors,requests:[...new Set(requests)],note:'Desktop Chromium with simulated touch. 200% is CSS text scaling, not Android nonlinear system font scaling. No emulator or physical-phone installation.'},null,2));await b.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
