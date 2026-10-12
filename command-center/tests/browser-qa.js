const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
const path=require('node:path');const {pathToFileURL}=require('node:url');const root=path.resolve(__dirname,'..');
const appUrl=pathToFileURL(path.join(root,'web/index.html')).href;
const seed=JSON.parse(fs.readFileSync(path.join(root,'web',fs.existsSync(path.join(root,'web/snapshot.json'))?'snapshot.json':'demo.json'),'utf8'));
(async()=>{
 const results=[];const errors=[];
 for(const width of [390,320,800]){
  const browser=await chromium.launch({executablePath:process.env.CC_CHROME,args:['--no-sandbox','--single-process','--no-zygote','--disable-gpu']});
  const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1});const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(appUrl);await page.waitForSelector('#projects .card');
  assert.equal(await page.locator('#projects .card').count(),15);
  assert.equal(await page.locator('#focus .card').count(),2);
  assert(await page.locator('#snapshot-label').innerText().then(x=>x.startsWith('Saved snapshot')));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`command-center/evidence/projects-${width}.png`,fullPage:false});
  await page.locator('[data-filter="BLOCKED"]').click();assert.equal(await page.locator('#projects .card').count(),2);
  await page.locator('[data-filter="NEEDS REVIEW"]').click();assert.equal(await page.locator('#projects .card').count(),8);
  await page.locator('[data-filter="ALL"]').click();await page.locator('#search').fill(seed.projects[0].title);assert((await page.locator('#projects .card').count())>=1);
  await page.locator('#search').fill('not-a-project');assert.equal(await page.locator('.empty').count(),1);await page.locator('#search').fill('');
  const detailId=seed.projects.some(p=>p.id==='atendimentos')?'atendimentos':seed.projects[0].id;
  await page.locator(`#projects [data-project="${detailId}"]`).click();assert.equal(await page.locator('dialog[open]').count(),1);assert((await page.locator('#detail-content').innerText()).includes('NEXT ACTION'));
  await page.screenshot({path:`command-center/evidence/detail-${width}.png`});await page.locator('.close').click();
  await page.locator('[data-view="sources"]').click();assert.equal(await page.locator('#sources .source').count(),seed.sources.length);await page.screenshot({path:`command-center/evidence/sources-${width}.png`});
  // Unsafe input cannot overwrite the valid UI.
  await page.locator('#importfile').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{}')});assert((await page.locator('#import-error').innerText()).includes('supported'));assert.equal(await page.locator('#sources .source').count(),seed.sources.length);
  await page.locator('[data-view="completed"]').click();assert.equal(await page.locator('#completed .source').count(),8);
  await page.locator('[data-view="projects"]').click();await page.locator('[data-filter="BLOCKED"]').click();await page.reload();assert.equal(await page.locator('#projects .card').count(),2);
  await page.locator('[data-filter="ALL"]').click();
  // Bundled assets survive loss of the network; no provider requests.
  await context.setOffline(true);await page.goto(appUrl);
  await page.waitForSelector('#projects .card');assert.equal(await page.locator('#projects .card').count(),15);
  results.push({width,projects:15,filters:true,details:true,sources:seed.sources.length,completed:8,invalidImportRejected:true,filterPersistence:true,offline:true,overflow:false});await context.close();await browser.close();
 }
 assert.equal(errors.length,0);fs.writeFileSync('command-center/evidence/browser-qa.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));
})().catch(e=>{console.error(e);process.exit(1)});
