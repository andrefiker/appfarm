import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const PACKAGE = "com.appfarm.quietvideopoker";
const ACTIVITY = `${PACKAGE}/.MainActivity`;
const APK = process.argv[2] ?? "quiet-video-poker/android/app/build/outputs/apk/debug/app-debug.apk";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function adb(...args) {
  const r = spawnSync("adb", args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`adb ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}
async function forwardToWebView() {
  let pid = "";
  for (let i = 0; i < 40 && !pid; i++) {
    const result = spawnSync("adb", ["shell", "pidof", "-s", PACKAGE], { encoding: "utf8" });
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
    try { targets = await (await fetch("http://127.0.0.1:9222/json/list")).json(); if (targets.some(x => x.type === "page" && x.webSocketDebuggerUrl)) break; } catch {}
    await delay(250);
  }
  const target = targets?.find(x => x.type === "page" && x.webSocketDebuggerUrl);
  assert.ok(target, "debug WebView page should be present");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 1;
  const pending = new Map();
  socket.onmessage = event => {
    const m = JSON.parse(event.data); const p = pending.get(m.id);
    if (p) { pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
  };
  function send(method, params = {}) {
    const id = nextId++;
    return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  }
  async function evaluate(expression) {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "WebView JavaScript error");
    return result.result?.value;
  }
  return { socket, evaluate };
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

const firstView = await client.evaluate(`({title:document.title, width:innerWidth, height:innerHeight, cards:[...document.querySelectorAll('.playing-card')].map(x=>{let r=x.getBoundingClientRect();return {w:r.width,h:r.height}}), action:(()=>{let r=document.querySelector('#action-button').getBoundingClientRect();return {w:r.width,h:r.height,text:document.querySelector('#action-button').textContent}})(), credits:document.querySelector('#credits').textContent})`);
assert.equal(firstView.title, "Quiet Video Poker");
assert.equal(firstView.cards.length, 5);
assert.ok(firstView.width > firstView.height, "activity should start in landscape");
assert.ok(firstView.cards.every(c => c.w >= 60 && c.h >= 90), "playing cards should remain readable and tappable");
assert.ok(firstView.action.w >= 90 && firstView.action.h >= 42, "primary action should have a phone-sized touch target");

const afterDeal = await client.evaluate(`(()=>{document.querySelector('#action-button').click();return document.querySelector('#credits').textContent})()`);
assert.notEqual(afterDeal, firstView.credits, "deal should immediately debit the selected fictional bet");
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
assert.equal(handResult.state.stats.creditsWagered, 1, "the hand should persist its wager");
assert.ok(handResult.message.includes("credits") || handResult.message.includes("No win"), "the game should show its hand result");
assert.notEqual(handResult.credits, "", "credit balance should render after draw");

await client.evaluate(`document.querySelector('#paytable-open').click()`);
await delay(100);
adb("shell", "input", "keyevent", "4");
let modalClosed = false;
for (let i = 0; i < 20 && !modalClosed; i++) {
  modalClosed = await client.evaluate(`document.getElementById('modal').hidden`);
  if (!modalClosed) await delay(100);
}
assert.equal(modalClosed, true, "Android Back should close an open modal");
await client.evaluate(`document.querySelector('#settings-open').click()`);
assert.ok((await client.evaluate(`document.querySelector('.stats-grid').innerText`)).includes("Hands played"));

adb("shell", "input", "keyevent", "3");
await delay(300);
adb("shell", "am", "start", "-n", ACTIVITY);
await delay(600);
assert.equal(await client.evaluate(`document.querySelector('#hands-count').textContent`), "1", "background and resume should preserve the current UI state");

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
console.log(JSON.stringify({install:"PASS", launch:"PASS", fullHand:"PASS", backgroundResume:"PASS", reopenPersistence:"PASS", offlineReopen:"PASS", backModal:"PASS", viewport:{width:firstView.width,height:firstView.height,card:firstView.cards[0],action:firstView.action}, initialCredits:firstView.credits, postHandCredits:handResult.credits, result:handResult.message, offlineOrigin:offline.origin}, null, 2));
