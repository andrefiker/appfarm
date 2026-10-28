import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const PACKAGE = "com.andrefiker.towerstack";
const ACTIVITY = `${PACKAGE}/.MainActivity`;
const APK = process.argv[2] ?? "tower-stack/android/app/build/outputs/apk/debug/app-debug.apk";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function adb(...args) {
  const r = spawnSync("adb", args, { encoding: "utf8", timeout: 20000 });
  if (r.status !== 0) throw new Error(`adb ${args.join(" ")} failed: ${r.error?.message || r.stderr || r.stdout}`);
  return r.stdout.trim();
}
async function forwardToWebView() {
  let pid = "";
  for (let i = 0; i < 40 && !pid; i++) {
    const result = spawnSync("adb", ["shell", "pidof", "-s", PACKAGE], { encoding: "utf8", timeout: 20000 });
    if (result.status === 0) pid = result.stdout.trim();
    if (!pid) await delay(250);
  }
  if (!pid) {
    const logs = spawnSync("adb", ["logcat", "-d", "-t", "300"], { encoding: "utf8" });
    throw new Error(`App process did not start. Recent Android logs:\n${logs.stdout?.slice(-7000) ?? logs.stderr}`);
  }
  try { adb("forward", "--remove", "tcp:9222"); } catch {}
  adb("forward", "tcp:9222", `localabstract:webview_devtools_remote_${pid}`);
}
async function attach() {
  let targets;
  for (let i = 0; i < 40; i++) {
    try { targets = await (await fetch("http://127.0.0.1:9222/json/list", { signal: AbortSignal.timeout(2000) })).json(); if (targets.some(x => x.type === "page" && x.webSocketDebuggerUrl)) break; } catch {}
    await delay(250);
  }
  const target = targets?.find(x => x.type === "page" && x.webSocketDebuggerUrl);
  assert.ok(target, "debug WebView page should be present");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.close(); reject(new Error("Timed out connecting to the WebView debugging socket")); }, 8000);
    socket.onopen = () => { clearTimeout(timer); resolve(); };
    socket.onerror = event => { clearTimeout(timer); reject(event); };
  });
  let nextId = 1;
  const pending = new Map();
  socket.onmessage = event => {
    const m = JSON.parse(event.data); const p = pending.get(m.id);
    if (p) { pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
  };
  function send(method, params = {}) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out waiting for WebView ${method}`)); }, 8000);
      pending.set(id, {
        resolve: value => { clearTimeout(timer); resolve(value); },
        reject: error => { clearTimeout(timer); reject(error); }
      });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result?.value;
  }
  async function screenshot() {
    await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    return Buffer.from(result.data, "base64");
  }
  return { socket, evaluate, screenshot, send };
}

mkdirSync("tower-stack/qa",{recursive:true});
adb("install","-r",APK);adb("shell","svc","wifi","disable");adb("shell","svc","data","disable");adb("shell","am","start","-n",ACTIVITY);await delay(1500);await forwardToWebView();let client=await attach();
for(let i=0;i<40;i++){if(await client.evaluate("typeof Tower==='object'&&!!document.querySelector('#play')"))break;await delay(250)}
assert.equal(await client.evaluate("document.title"),"Tower Stack");
let size=await client.evaluate("({w:innerWidth,h:innerHeight,dpr:devicePixelRatio,overflow:document.documentElement.scrollWidth>innerWidth})");assert(size.h>size.w);assert(!size.overflow);
async function tap(id){let p=await client.evaluate(`(()=>{let r=document.getElementById('${id}').getBoundingClientRect();return {x:(r.x+r.width/2)*devicePixelRatio,y:(r.y+r.height/2)*devicePixelRatio}})()`);let wm=adb("shell","wm","size").match(/(\d+)x(\d+)/);let physicalH=Number(wm[2]);let bottom=48*size.dpr;let top=physicalH-size.h*size.dpr-bottom;adb("shell","input","tap",String(Math.round(p.x)),String(Math.round(p.y+Math.max(0,top))))}
// CDP dispatches actual WebView touch events in CSS coordinates, avoiding status-bar calibration assumptions.
async function touch(id){for(let n=0;n<80;n++){if(await client.evaluate(`!!document.getElementById('${id}') && !document.getElementById('${id}').hidden`).catch(()=>false))break;if(n===79)throw Error('Control never became ready: '+id);await delay(100)}let p=await client.evaluate(`(()=>{let r=document.getElementById('${id}').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);let r=await client.evaluate(`(()=>{let e=document.elementFromPoint(${p.x},${p.y});return e.closest('button')?.id})()`);assert.equal(r,id);await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
await touch('play');
for(let i=0;i<3;i++){await touch('drop');for(let n=0;n<100;n++){if(await client.evaluate("g.phase==='ready'"))break;await delay(100)}assert.equal(await client.evaluate("g.placed"),i+1)}
let draw=await client.evaluate(`(()=>{try{render();return {ok:true,w,h,cam,scale,base,canvasW:canvas.width,canvasH:canvas.height,paintedPixels:(()=>{let d=ctx.getImageData(0,0,canvas.width,canvas.height).data,n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n})(),webview:navigator.userAgent}}catch(e){return {ok:false,error:e.stack}}})()`);writeFileSync('tower-stack/qa/android-render.json',JSON.stringify(draw,null,2));console.log('Renderer diagnostic:',draw);assert(draw.ok,'Android renderer must complete');assert(draw.paintedPixels>500,'Android canvas must paint visible pixels');let native=spawnSync('adb',['exec-out','screencap','-p']);assert.equal(native.status,0);writeFileSync('tower-stack/qa/android-native.png',native.stdout);writeFileSync('tower-stack/qa/android-stacking.png',await client.screenshot());assert(await client.evaluate('g.score>0'));
// Touch placement through Android's input system; use UI bounds from uiautomator for exact screen coordinates.
adb('shell','uiautomator','dump','/sdcard/tower-ui.xml');let ui=adb('shell','cat','/sdcard/tower-ui.xml');writeFileSync('tower-stack/qa/android-ui.xml',ui);
let match=ui.match(/(?:text|content-desc)="(?:Drop block|DROP[^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
if(match){adb('shell','input','tap',String(Math.round((+match[1]+ +match[3])/2)),String(Math.round((+match[2]+ +match[4])/2)))}else{let bounds=ui.match(/class="android.webkit.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);assert(bounds,'WebView bounds must be observable');let p=await client.evaluate("(()=>{let r=document.getElementById('drop').getBoundingClientRect();return {x:(r.x+r.width/2)*devicePixelRatio,y:(r.y+r.height/2)*devicePixelRatio}})()");adb('shell','input','tap',String(Math.round(+bounds[1]+p.x)),String(Math.round(+bounds[2]+p.y)))}
for(let n=0;n<120;n++){if(await client.evaluate('g.placed===4'))break;await delay(100)}assert.equal(await client.evaluate('g.placed'),4);
await touch('menu');let before=await client.evaluate('g.save()');let score=await client.evaluate('g.score');adb('shell','input','keyevent','3');await delay(400);adb('shell','am','force-stop',PACKAGE);client.socket.close();adb('shell','am','start','-n',ACTIVITY);await delay(1000);await forwardToWebView();client=await attach();await touch('continue');assert.equal(await client.evaluate('g.score'),score);assert.equal(await client.evaluate('g.placed'),4);
await client.evaluate("g.drop(375)");await delay(180);adb('shell','input','keyevent','3');await delay(350);let fallSave=await client.evaluate("JSON.parse(localStorage.getItem('ts.save'))");assert.equal(fallSave.log.length,5);adb('shell','am','force-stop',PACKAGE);client.socket.close();adb('shell','am','start','-n',ACTIVITY);await delay(1000);await forwardToWebView();client=await attach();await touch('continue');assert.equal(await client.evaluate('g.log.length'),5);for(let n=0;n<120;n++){if(await client.evaluate("g.phase==='over'"))break;await delay(100)}assert.equal(await client.evaluate('g.phase'),'over');writeFileSync('tower-stack/qa/android-result.png',await client.screenshot());await touch('play');assert.equal(await client.evaluate('g.placed'),0);assert(await client.evaluate("JSON.parse(localStorage.getItem('ts.stats')).blocks>=4"));
writeFileSync('tower-stack/qa/android-report.json',JSON.stringify({passed:true,package:PACKAGE,size,offline:true,placements:4,restart:true,processDeathRestore:true,backgroundDuringFall:true,score,saveTick:before.tick},null,2));client.socket.close();console.log('Android offline launch, stacking, real touch, score, process-death restore, collapse and restart passed');
