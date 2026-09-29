process.on('unhandledRejection',e=>{console.error(e);try{mkdirSync('impact-lab-core/qa-artifacts',{recursive:true});writeFileSync('impact-lab-core/qa-artifacts/failure.png',spawnSync('adb',['exec-out','screencap','-p']).stdout);writeFileSync('impact-lab-core/qa-artifacts/logcat.txt',spawnSync('adb',['logcat','-d','-t','1000'],{encoding:'utf8'}).stdout);}catch{}process.exit(1)});
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const PACKAGE = "com.andrefiker.impactlabcore";
const ACTIVITY = `${PACKAGE}/.MainActivity`;
const APK = process.argv[2] ?? "impact-lab-core/android/app/build/outputs/apk/debug/app-debug.apk";
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
    const timer = setTimeout(() => { socket.close(); reject(new Error("Timed out connecting to the WebView debugging socket")); }, 30000);
    socket.onopen = () => { clearTimeout(timer); resolve(); };
    socket.onerror = event => { clearTimeout(timer); reject(event); };
  });
  let nextId = 1;
  const pending = new Map();
  socket.onmessage = event => {
    const m = JSON.parse(event.data); if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')console.log('WEBVIEW ERROR',JSON.stringify(m.params.args)); if(m.method==='Runtime.exceptionThrown')console.log('WEBVIEW EXCEPTION',JSON.stringify(m.params)); const p = pending.get(m.id);
    if (p) { pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
  };
  function send(method, params = {}) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out waiting for WebView ${method}`)); }, 30000);
      pending.set(id, {
        resolve: value => { clearTimeout(timer); resolve(value); },
        reject: error => { clearTimeout(timer); reject(error); }
      });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    console.log("EVALUATE",expression.slice(0,140));const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "WebView JavaScript error");
    return result.result?.value;
  }
  async function screenshot() {
    await delay(1500);const r=spawnSync('adb',['exec-out','screencap','-p'],{timeout:20000});if(r.status!==0)throw Error('Native screenshot failed');return r.stdout;
  }
  await send('Runtime.enable');
  return { socket, evaluate, screenshot, send };
}
async function ready(c){for(let i=0;i<80;i++){if(await c.evaluate('!!window.__core?.ready'))return;await delay(250);}throw Error('Bundled anatomy did not load');}
const out='impact-lab-core/qa-artifacts';mkdirSync(out,{recursive:true});
adb('install','-r',APK);adb('shell','svc','wifi','disable');adb('shell','svc','data','disable');adb('shell','am','start','-n',ACTIVITY);await delay(1500);await forwardToWebView();let c=await attach();await ready(c);
console.log('RENDER DIAGNOSTIC',await c.evaluate(`(()=>{const e=document.querySelector('canvas'),g=e.getContext('webgl2'),p=new Uint8Array(4);g.readPixels(e.width/2,e.height*.6,1,1,g.RGBA,g.UNSIGNED_BYTE,p);return {title:document.title,hidden:document.hidden,stats:window.__core.renderer().render,canvas:[e.width,e.height],pixel:[...p],webgl:g.getParameter(g.VERSION),userAgent:navigator.userAgent}})()`));assert.equal(await c.evaluate('document.title'),'Impact Lab: Core');assert.ok(await c.evaluate('window.__core.structures().length>140'));writeFileSync(out+'/android-skin.png',await c.screenshot());
const r=await c.evaluate(`(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return {x:r.left+r.width*.38,y:r.top+r.height*.33}})()`);
await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x,y:r.y}]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await c.evaluate('document.querySelector("#apply").disabled'),false);
await c.evaluate(`window.__core.setIntensity(2);document.querySelector('#apply').click()`);assert.equal(await c.evaluate('window.__core.events().length'),1);writeFileSync(out+'/android-impact.png',await c.screenshot());
await c.evaluate(`window.__core.setTool('projectile');document.querySelector('#apply').click();window.__core.setView('cutaway')`);assert.equal(await c.evaluate('window.__core.events().length'),2);writeFileSync(out+'/android-cutaway.png',await c.screenshot());
adb('shell','input','keyevent','3');await delay(350);adb('shell','am','start','-n',ACTIVITY);await delay(800);assert.equal(await c.evaluate('window.__core.events().length'),2);await c.evaluate(`document.querySelector('#undo').click()`);assert.equal(await c.evaluate('window.__core.events().length'),1);await c.evaluate(`window.__core.reset();window.__core.setView('skin')`);assert.equal(await c.evaluate('window.__core.events().length'),0);
await c.evaluate(`document.querySelector('#about').click()`);adb('shell','input','keyevent','4');await delay(400);assert.equal(await c.evaluate('document.querySelector("dialog").open'),false);
c.socket.close();adb('shell','am','force-stop',PACKAGE);adb('shell','am','start','-n',ACTIVITY);await delay(1000);await forwardToWebView();c=await attach();await ready(c);assert.equal(await c.evaluate('window.__core.events().length'),0);assert.equal(await c.evaluate(`document.querySelector('[data-tool="projectile"]').getAttribute('aria-pressed')`),'true');
writeFileSync(out+'/android-offline-reopen.png',await c.screenshot());const result={install:'PASS',offlineStartup:'PASS',tapAndApply:'PASS',blunt:'PASS',projectile:'PASS',cutaway:'PASS',undoReset:'PASS',backgroundResume:'PASS',offlineRelaunch:'PASS',settings:'PASS',backDialog:'PASS',physicalDevice:'NOT TESTED'};writeFileSync(out+'/android-report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));c.socket.close();
