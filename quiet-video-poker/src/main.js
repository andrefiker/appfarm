import { CATEGORY, PAYTABLE, createDeck, shuffleDeck, deal, drawReplacement, evaluateHand, payoutFor, recommendHolds } from "./engine.js";

const STORAGE_KEY = "quiet-video-poker-v1";
const SUIT_NAMES = { "♠": "spades", "♥": "hearts", "♦": "diamonds", "♣": "clubs" };
const freshStats = () => ({ handsPlayed: 0, handsWon: 0, creditsWagered: 0, creditsWon: 0, largestWin: 0, categories: Object.fromEntries(PAYTABLE.map(([name]) => [name, 0])) });
const defaults = () => ({ credits: 1000, bet: 1, settings: { sound: true, volume: 45, haptics: true }, stats: freshStats() });
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return defaults();
    return { ...defaults(), ...saved, settings: { ...defaults().settings, ...saved.settings }, stats: { ...freshStats(), ...saved.stats, categories: { ...freshStats().categories, ...saved.stats?.categories } } };
  } catch { return defaults(); }
}
let state = loadState();
let phase = "ready";
let hand = [];
let held = [false, false, false, false, false];
let deck = [];
let hintIndexes = [];
let lastResult = null;
let animationMode = "none";
let lastDrawnIndexes = [];
let soundContext;
let toastTimer;

const $ = id => document.getElementById(id);
const ui = { credits: $("credits"), bet: $("bet-value"), hands: $("hands-count"), net: $("net-value"), cards: $("cards"), holds: $("hold-row"), message: $("message"), action: $("action-button"), hint: $("hint-button"), modal: $("modal"), modalTitle: $("modal-title"), modalContent: $("modal-content"), toast: $("toast") };
const fmt = n => new Intl.NumberFormat("en-US").format(n);
const cardKey = c => `${c.rank}${c.suit}`;
const rankText = n => ({ 11: "J", 12: "Q", 13: "K", 14: "A" })[n] ?? String(n);
const cardName = c => `${rankText(c.rank)} of ${SUIT_NAMES[c.suit]}`;
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function buzz(ms = 12) { if (state.settings.haptics && "vibrate" in navigator) navigator.vibrate(ms); }
function tone(freq = 540, duration = .055, type = "sine", volume = .12) {
  if (!state.settings.sound) return;
  try {
    soundContext ??= new (window.AudioContext || window.webkitAudioContext)();
    if (soundContext.state === "suspended") soundContext.resume();
    const osc = soundContext.createOscillator(), gain = soundContext.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(Math.max(.001, volume * state.settings.volume / 100), soundContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, soundContext.currentTime + duration);
    osc.connect(gain); gain.connect(soundContext.destination); osc.start(); osc.stop(soundContext.currentTime + duration);
  } catch { /* audio is an optional enhancement */ }
}
function playDeal() { [420, 520, 600, 690, 780].forEach((f, i) => setTimeout(() => tone(f, .04, "triangle", .11), i * 30)); }
function toast(text) { ui.toast.textContent = text; ui.toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 1700); }
function setMessage(text, kind = "") { ui.message.textContent = text; ui.message.className = `message ${kind}`; }

function render() {
  ui.credits.textContent = fmt(state.credits);
  ui.bet.textContent = state.bet;
  ui.hands.textContent = fmt(state.stats.handsPlayed);
  const net = state.stats.creditsWon - state.stats.creditsWagered;
  ui.net.textContent = `${net > 0 ? "+" : ""}${fmt(net)}`;
  ui.net.classList.toggle("negative", net < 0);
  ui.cards.replaceChildren(); ui.holds.replaceChildren();
  for (let i = 0; i < 5; i++) {
    const card = hand[i];
    const button = document.createElement("button");
    button.type = "button"; button.className = "playing-card";
    button.setAttribute("aria-label", card ? `${cardName(card)}${held[i] ? ", held" : ""}` : "Empty card slot");
    button.setAttribute("aria-pressed", String(Boolean(held[i])));
    button.disabled = phase !== "draw";
    if (card) {
      button.classList.toggle("red", card.suit === "♥" || card.suit === "♦");
      button.classList.toggle("held", held[i]);
      button.classList.toggle("hinted", hintIndexes.includes(i));
      button.classList.toggle("winner", Boolean(lastResult?.winning && phase === "result"));
      if (animationMode === "deal") button.classList.add("dealing");
      else if (animationMode === "replace" && lastDrawnIndexes.includes(i)) button.classList.add("replacing");
      else if (animationMode === "discard" && !held[i]) button.classList.add("discarding");
      button.style.setProperty("--deal-delay", `${i * 37}ms`);
      button.innerHTML = `<span class="corner"><b>${rankText(card.rank)}</b><i>${card.suit}</i></span><span class="center-suit" aria-hidden="true">${card.suit}</span><span class="corner inverted" aria-hidden="true"><b>${rankText(card.rank)}</b><i>${card.suit}</i></span>`;
      button.addEventListener("click", () => toggleHold(i));
    } else {
      button.classList.add("empty-card");
      button.innerHTML = '<span class="card-placeholder">—</span>';
    }
    ui.cards.append(button);
    const hold = document.createElement("div"); hold.className = `hold-indicator${held[i] ? " active" : ""}${hintIndexes.includes(i) ? " suggested" : ""}`;
    hold.textContent = held[i] ? "HELD" : hintIndexes.includes(i) ? "HINT" : "";
    ui.holds.append(hold);
  }
  ui.action.textContent = phase === "draw" || phase === "drawing" ? "DRAW" : "DEAL";
  ui.action.disabled = phase === "drawing" || (phase !== "draw" && state.credits < state.bet);
  ui.action.classList.toggle("draw-mode", phase === "draw");
  ui.hint.disabled = phase !== "draw";
  $("bet-minus").disabled = phase === "draw" || state.bet <= 1;
  $("bet-plus").disabled = phase === "draw" || state.bet >= 5;
  $("max-bet").disabled = phase === "draw" || state.bet === 5;
  animationMode = "none";
}

function toggleHold(index) {
  if (phase !== "draw") return;
  held[index] = !held[index]; hintIndexes = [];
  tone(held[index] ? 740 : 480, .045, "sine", .13); buzz(held[index] ? 16 : 8); render();
}
function startHand() {
  if (phase === "drawing") return;
  if (phase === "draw") { finishHand(); return; }
  if (state.credits < state.bet) { setMessage("Not enough credits for that bet.", "warning"); return; }
  state.credits -= state.bet; state.stats.creditsWagered += state.bet;
  deck = shuffleDeck(createDeck());
  ({ hand, remaining: deck } = deal(deck));
  held = [false, false, false, false, false]; hintIndexes = []; lastResult = null; phase = "draw"; animationMode = "deal"; lastDrawnIndexes = [];
  setMessage("Tap cards to HOLD, then draw."); persist(); render();
  playDeal(); buzz(10);
}
function finishHand() {
  if (phase !== "draw") return;
  lastDrawnIndexes = held.map((isHeld, index) => isHeld ? -1 : index).filter(index => index >= 0);
  phase = "drawing"; hintIndexes = []; animationMode = "discard";
  tone(380, .07, "triangle", .12); buzz(15); render();
  setTimeout(resolveDraw, 105);
}
function resolveDraw() {
  const result = drawReplacement(hand, held, deck);
  hand = result.hand; deck = result.remaining;
  const evaluated = evaluateHand(hand), win = payoutFor(evaluated.category, state.bet);
  lastResult = evaluated; phase = "result"; hintIndexes = []; animationMode = "replace";
  state.stats.handsPlayed++;
  state.stats.categories[evaluated.category] = (state.stats.categories[evaluated.category] ?? 0) + 1;
  if (win > 0) {
    state.credits += win; state.stats.handsWon++; state.stats.creditsWon += win;
    state.stats.largestWin = Math.max(state.stats.largestWin, win);
    setMessage(`${evaluated.category}  ·  +${fmt(win)} credits`, win >= 50 ? "big-win" : "win");
    tone(win >= 50 ? 960 : 760, .22, "triangle", .18); setTimeout(() => tone(win >= 50 ? 1220 : 930, .24, "sine", .11), 100); buzz(win >= 50 ? [25, 40, 25] : 24);
  } else { setMessage("No win  ·  Ready for the next hand."); tone(330, .08, "sine", .06); }
  persist(); render();
}
function showHint() {
  if (phase !== "draw") return;
  hintIndexes = recommendHolds(hand);
  setMessage(hintIndexes.length ? `Suggested hold${hintIndexes.length === 1 ? "" : "s"}: ${hintIndexes.map(i => rankText(hand[i].rank) + hand[i].suit).join(" · ")}` : "No clear hold. Choose your cards.", "hint-message");
  render();
}
function buildPayTable() {
  const current = lastResult?.category;
  const rows = PAYTABLE.map(([name, base]) => {
    const five = name === CATEGORY.ROYAL_FLUSH ? 4000 : base * 5;
    return `<tr class="${current === name ? "current-win" : ""}"><th>${name}</th><td>${base}</td><td>${fmt(five)}</td></tr>`;
  }).join("");
  ui.modalTitle.textContent = "PAY TABLE";
  ui.modalContent.innerHTML = `<p class="modal-note">Jacks or Better · payouts in fictional credits</p><div class="table-scroll"><table class="pay-table"><thead><tr><th>HAND</th><th>1 CREDIT</th><th>5 CREDITS</th></tr></thead><tbody>${rows}</tbody></table></div><p class="modal-footnote">A royal flush pays 4,000 credits at a 5-credit bet.</p>`;
  openModal();
}
function buildSettings() {
  const s = state.settings;
  ui.modalTitle.textContent = "SETTINGS";
  ui.modalContent.innerHTML = `<div class="settings-list">
    <label class="setting-row"><span>Sound</span><input id="sound-toggle" type="checkbox" ${s.sound ? "checked" : ""}></label>
    <label class="setting-row volume-row"><span>Volume <b id="volume-label">${s.volume}%</b></span><input id="volume-slider" type="range" min="0" max="100" step="5" value="${s.volume}"></label>
    <label class="setting-row"><span>Haptics</span><input id="haptics-toggle" type="checkbox" ${s.haptics ? "checked" : ""}></label>
  </div><div class="stats-block"><h3>SESSION STATISTICS</h3><div class="stats-grid">
  <span>Hands played <b>${fmt(safeStat("handsPlayed"))}</b></span><span>Hands won <b>${fmt(safeStat("handsWon"))}</b></span>
  <span>Win frequency <b>${state.stats.handsPlayed ? `${(state.stats.handsWon / state.stats.handsPlayed * 100).toFixed(1)}%` : "—"}</b></span>
  <span>Credits wagered <b>${fmt(safeStat("creditsWagered"))}</b></span><span>Credits won <b>${fmt(safeStat("creditsWon"))}</b></span>
  <span>Net credits <b>${fmt(safeStat("creditsWon") - safeStat("creditsWagered"))}</b></span><span>Largest win <b>${fmt(safeStat("largestWin"))}</b></span>
  </div><details><summary>Hand breakdown</summary><div class="category-stats">${PAYTABLE.map(([name]) => `<span>${name}<b>${fmt(state.stats.categories[name] ?? 0)}</b></span>`).join("")}</div></details></div>
  <button class="reset-button" id="reset-bankroll">RESET BANKROLL &amp; STATS</button><p class="modal-footnote">Credits are fictional. Game data stays on this device.</p>`;
  openModal();
  $("sound-toggle").addEventListener("change", e => { state.settings.sound = e.target.checked; persist(); });
  $("haptics-toggle").addEventListener("change", e => { state.settings.haptics = e.target.checked; persist(); });
  $("volume-slider").addEventListener("input", e => { state.settings.volume = Number(e.target.value); $("volume-label").textContent = `${state.settings.volume}%`; persist(); });
  $("reset-bankroll").addEventListener("click", () => {
    if (!window.confirm("Reset credits to 1,000 and clear all statistics on this device?")) return;
    state = defaults(); phase = "ready"; hand = []; held = [false, false, false, false, false]; lastResult = null; persist(); closeModal(); setMessage("Bankroll reset. Good luck."); render();
  });
}
const safeStat = k => Number(state.stats[k]) || 0;
function openModal() { ui.modal.hidden = false; $("modal-close").focus(); }
function closeModal() { ui.modal.hidden = true; }

$("bet-minus").addEventListener("click", () => { state.bet = Math.max(1, state.bet - 1); persist(); tone(420, .04); render(); });
$("bet-plus").addEventListener("click", () => { state.bet = Math.min(5, state.bet + 1); persist(); tone(520, .04); render(); });
$("max-bet").addEventListener("click", () => { state.bet = 5; persist(); tone(650, .06); buzz(); render(); });
ui.action.addEventListener("click", startHand);
ui.hint.addEventListener("click", showHint);
$("paytable-open").addEventListener("click", buildPayTable);
$("settings-open").addEventListener("click", buildSettings);
$("modal-close").addEventListener("click", closeModal);
ui.modal.addEventListener("click", e => { if (e.target === ui.modal) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
render();
setMessage(state.credits < state.bet ? "Bankroll empty. Reset in Settings." : "Choose your bet, then deal.");
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
