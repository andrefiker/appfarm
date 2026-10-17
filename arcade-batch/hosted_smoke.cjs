'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const ROOT=path.resolve(__dirname,'..');
const games=[
 {slug:'gravity-golf',url:'https://gravity-golf-7qfzof.craftian.app',start:'#dialogAction',launch:'#launch',pause:'#pause',overlay:'#overlay'},
 {slug:'ricochet',url:'https://ricochet-w95k4k.craftian.app',start:'intro',launch:'#shoot',pause:'#pause',overlay:'#overlay'},
 {slug:'lunar-lander',url:'https://lunar-lander-bb2qx0.craftian.app',start:'[data-action="start"]',pause:'#pause',overlay:'#overlay'},
 {slug:'magnet-lab',url:'https://magnet-lab-2v4qbb.craftian.app',start:'#enter',launch:'#launch',pause:'#pause'},
];
(async()=>{
 let proxy;
 if(process.env.HTTPS_PROXY){const p=new URL(process.env.HTTPS_PROXY);proxy={server:p.origin,username:p.username||undefined,password:p.password||undefined};}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||path.join(ROOT,'browser-runtime/chromium'),headless:true,proxy,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let failures=0;
 try{for(const game of games){
  const context=await browser.newContext({viewport:{width:393,height:852},hasTouch:true,ignoreHTTPSErrors:!!proxy});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const record={url:game.url,testedAt:new Date().toISOString(),qaHookUsed:false,proxyCertificateNote:proxy?'UI check ignores local proxy CA; curl separately verifies TLS normally.':null};
  try{
   const response=await page.goto(game.url,{waitUntil:'domcontentloaded',timeout:30000});
   record.httpStatus=response.status();if(response.status()!==200)throw Error('HTTP '+response.status());
   await page.locator('canvas').waitFor({state:'visible',timeout:15000});
   if(game.start==='intro')await page.getByRole('button',{name:'FIND YOUR ANGLE →'}).click();else if(await page.locator(game.start).isVisible())await page.locator(game.start).click();
   if(game.slug==='magnet-lab')await page.getByRole('button',{name:'Magnet A: Attract',exact:true}).click();
   if(game.launch)await page.locator(game.launch).click();
   if(game.slug==='lunar-lander'){const b=await page.locator('#thrust').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(100);await page.mouse.up();}
   await page.waitForTimeout(100);
   await page.locator(game.pause).click();
   record.pauseWorked=game.overlay?await page.locator(game.overlay).isVisible():(await page.locator('#message').innerText()).includes('paused');
   record.noHorizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
   record.errors=errors;
   record.passed=record.pauseWorked&&record.noHorizontalOverflow&&errors.length===0;
   if(!record.passed)failures++;
  }catch(e){record.passed=false;record.failure=e.message;record.errors=errors;failures++;}
  fs.writeFileSync(path.join(ROOT,game.slug,'HOSTED_QA.json'),JSON.stringify(record,null,2)+'\n');
  console.log(JSON.stringify({slug:game.slug,...record}));
  await context.close();
 }}finally{await browser.close();}
 if(failures)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
