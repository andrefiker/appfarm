import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const PACKAGE = "com.appfarm.quietvideopoker";
const ACTIVITY = `${PACKAGE}/.MainActivity`;
const APK = process.argv[2] ?? "quiet-video-poker/android/app/build/outputs/apk/debug/app-debug.apk";
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
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "WebView JavaScript error");
    return result.result?.value;
  }
  async function screenshot() {
    await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    return Buffer.from(result.data, "base64");
  }
  return { socket, evaluate, screenshot };
}
async function pageReady(client) {
  for (let i = 0; i < 40; i++) {
    const ready = await client.evaluate(`!!document.querySelector('#action-button') && document.title === 'Quiet Video Poker'`);
    if (ready) return;
    await delay(250);
  }
  throw new Error("Quiet Video Poker did not render in the WebView.");
}

adb("install", "-r", APK);
adb("shell", "am", "start", "-n", ACTIVITY);
await delay(1200);
await forwardToWebView();
let client = await attach();
await pageReady(client);

const firstView = await client.evaluate(`({title:document.title, width:innerWidth, height:innerHeight, scrollWidth:document.documentElement.scrollWidth, cards:[...document.querySelectorAll('.playing-card')].map(x=>{let r=x.getBoundingClientRect();return {x:r.x,w:r.width,h:r.height}}), action:(()=>{let r=document.querySelector('#action-button').getBoundingClientRect();return {x:r.x,w:r.width,h:r.height,text:document.querySelector('#action-button').textContent}})(), bets:[...document.querySelectorAll('.bet-option')].map(x=>({value:Number(x.dataset.bet),width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height})), credits:document.querySelector('#credits').textContent, storage:JSON.parse(localStorage.getItem('quiet-video-poker-v1'))})`);
assert.equal(firstView.title, "Quiet Video Poker");
assert.equal(firstView.cards.length, 5);
assert.ok(firstView.height > firstView.width, "activity should start in portrait");
assert.ok(firstView.scrollWidth <= firstView.width + 1, "the hand and controls should fit without horizontal scroll");
assert.ok(firstView.cards.every(c => c.w >= 60 && c.h >= 90), "playing cards should remain readable and tappable");
assert.ok(firstView.action.w >= 90 && firstView.action.h >= 42, "primary action should have a phone-sized touch target");
assert.deepEqual(firstView.bets.map(x => x.value), [100, 200, 500, 1000, 5000]);
assert.ok(firstView.bets.every(x => x.width >= 45 && x.height >= 40), "all five bet choices should fit the phone");
assert.equal(firstView.credits, "1,000");
assert.equal(firstView.storage.credits, 1000);
assert.equal(firstView.storage.economyVersion, 3);
mkdirSync("quiet-video-poker/qa-artifacts", { recursive: true });
writeFileSync("quiet-video-poker/qa-artifacts/portrait-ready.png", await client.screenshot());

const selected = await client.evaluate(`(()=>{document.querySelector('[data-bet="500"]').click();return {bet:document.querySelector('#bet-value').textContent, selected:document.querySelector('[data-bet="500"]').getAttribute('aria-pressed'), storage:JSON.parse(localStorage.getItem('quiet-video-poker-v1'))}})()`);
assert.equal(selected.bet, "500");
assert.equal(selected.selected, "true");
assert.equal(selected.storage.bet, 500);
const afterDeal = await client.evaluate(`(()=>{document.querySelector('#action-button').click();return document.querySelector('#credits').textContent})()`);
assert.equal(afterDeal, "99,500", "deal should debit the selected 500-credit bet");
assert.equal(await client.evaluate(`document.querySelector('[data-bet="500"]').disabled`), true, "bet cannot change during a hand");
writeFileSync("quiet-video-poker/qa-artifacts/portrait-dealt.png", await client.screenshot());
const handResult = await client.evaluate(`(async()=>{
  document.querySelectorAll('.playing-card')[0].click();
  document.querySelectorAll('.playing-card')[2].click();
  const identity=i=>{let c=document.querySelectorAll('.playing-card')[i];return c.querySelector('.corner:not(.inverted) b').textContent+c.querySelector('.corner:not(.inverted) i').textContent};
  let heldBefore=[identity(0),identity(2)];
  let heldState=[0,2].map(i=>document.querySelectorAll('.playing-card')[i].getAttribute('aria-pressed'));
  document.querySelector('#action-button').click();
  await new Promise(r=>setTimeout(r,350));
  return {message:document.querySelector('#message').textContent, hands:document.querySelector('#hands-count').textContent, credits:document.querySelector('#credits').textContent, heldBefore, heldState, heldAfter:[identity(0),identity(2)], state:JSON.parse(localStorage.getItem('quiet-video-poker-v1'))};
})()`);
assert.equal(handResult.hands, "1", "one completed hand should be recorded");
assert.deepEqual(handResult.heldState, ["true", "true"], "the selected cards should be held before drawing");
assert.deepEqual(handResult.heldBefore, handResult.heldAfter, "held cards should remain unchanged during draw");
assert.equal(handResult.state.stats.creditsWagered, 500, "the hand should persist its wager");
assert.ok(handResult.message.includes("credits") || handResult.message.includes("No win"), "the game should show its hand result");
assert.notEqual(handResult.credits, "", "credit balance should render after draw");
console.log("Android QA: deal, hold, draw, result, and credits passed.");

await client.evaluate(`document.querySelector('#paytable-open').click()`);
await delay(100);
assert.ok((await client.evaluate(`document.querySelector('.pay-table thead').textContent`)).includes("BET 500"));
adb("shell", "input", "keyevent", "4");
let modalClosed = false;
for (let i = 0; i < 20 && !modalClosed; i++) {
  modalClosed = await client.evaluate(`document.getElementById('modal').hidden`);
  if (!modalClosed) await delay(100);
}
assert.equal(modalClosed, true, "Android Back should close an open modal");
console.log("Android QA: Back closed the modal.");
await client.evaluate(`document.querySelector('#settings-open').click()`);
assert.ok((await client.evaluate(`document.querySelector('.stats-grid').innerText`)).includes("Hands played"));

adb("shell", "input", "keyevent", "3");
await delay(300);
adb("shell", "am", "start", "-n", ACTIVITY);
await delay(600);
assert.equal(await client.evaluate(`document.querySelector('#hands-count').textContent`), "1", "background and resume should preserve the current UI state");
console.log("Android QA: background and resume passed.");

client.socket.close();
adb("shell", "am", "force-stop", PACKAGE);
await delay(300);
adb("shell", "am", "start", "-n", ACTIVITY);
await delay(700);
await forwardToWebView();
client = await attach();
await pageReady(client);
const reopened = await client.evaluate(`({hands:document.querySelector('#hands-count').textContent, credits:document.querySelector('#credits').textContent, storage:JSON.parse(localStorage.getItem('quiet-video-poker-v1'))})`);
assert.equal(reopened.hands, "1", "hand statistics should persist after closing and reopening");
assert.equal(reopened.storage.stats.handsPlayed, 1);
assert.equal(reopened.credits, handResult.credits, "credits should persist after closing and reopening");
console.log("Android QA: local credits and statistics survived reopen.");

adb("shell", "svc", "wifi", "disable");
adb("shell", "svc", "data", "disable");
client.socket.close();
adb("shell", "am", "force-stop", PACKAGE);
await delay(300);
adb("shell", "am", "start", "-n", ACTIVITY);
await delay(700);
await forwardToWebView();
client = await attach();
await pageReady(client);
assert.equal(await client.evaluate(`document.querySelector('#hands-count').textContent`), "1", "the app should restart offline with local game state intact");
const offline = await client.evaluate(`({action:document.querySelector('#action-button').textContent, origin:location.origin, moduleCount:document.querySelectorAll('script[type=module]').length})`);
assert.equal(offline.action, "DEAL");
assert.equal(offline.moduleCount, 0, "APK content should be bundled, with no module fetches");
console.log("Android QA: offline relaunch passed.");
console.log(JSON.stringify({install:"PASS", launch:"PASS", fullHand:"PASS", backgroundResume:"PASS", reopenPersistence:"PASS", offlineReopen:"PASS", backModal:"PASS", viewport:{width:firstView.width,height:firstView.height,card:firstView.cards[0],action:firstView.action}, initialCredits:firstView.credits, postHandCredits:handResult.credits, result:handResult.message, offlineOrigin:offline.origin}, null, 2));
client.socket.close();
