import { Game, scorePractice, starsFor } from "./game.js";
import { DT } from "./physics.js";
import { aimAI } from "./ai.js";
import { Renderer } from "./render.js";
import { Sound } from "./audio.js";
import { WEAPONS, clamp } from "./weapons.js";
import { CHALLENGES } from "./challenges.js";
import {
  loadProgress,
  saveProgress,
  recordResult,
  achievements,
} from "./storage.js";
const $ = (id) => document.getElementById(id);
let local = null;
try {
  local = window.localStorage;
} catch {}
const progress = loadProgress(local),
  audio = new Sound(progress.settings),
  renderer = new Renderer($("battle"));
let game = new Game({ seed: 26 }),
  playing = false,
  paused = false,
  resultShown = false,
  angle = 48,
  power = 65,
  weapon = "standard",
  aiAngle = 48,
  aiDelay = 0,
  accumulator = 0,
  lastFrame = 0,
  menuFrame = 0,
  practiceRound = 0,
  practiceTotal = 0,
  tutorialStep = -1,
  lastTrail = [],
  shotTrail = [],
  toastUntil = 0,
  modalOpener = null,
  hudPhase = "",
  pausedFrame = 0;
const store = () => saveProgress(local, progress);
const toast = (text) => {
  $("toast").textContent = text;
  $("toast").hidden = false;
  toastUntil = performance.now() + 3000;
};
const titleCase = (s) => s[0].toUpperCase() + s.slice(1);
function applySettings() {
  $("app").classList.toggle("right-hand", !progress.settings.left);
  audio.settings = progress.settings;
}
function openSheet(html) {
  modalOpener = document.activeElement;
  $("sheet").innerHTML = html;
  const heading = $("sheet").querySelector("h2");
  if (heading) heading.id = "sheet-title";
  $("modal").hidden = false;
  $("sheet").focus();
  audio.setFlight(false);
}
function closeSheet() {
  $("modal").hidden = true;
  modalOpener?.focus?.();
}
const closeButton =
  '<button class="close-sheet" data-action="close" aria-label="Close">×</button>';
function showMenu() {
  playing = false;
  paused = false;
  closeSheet();
  audio.setFlight(false);
  $("app").classList.add("menu-mode");
  for (const id of [
    "hud",
    "deck",
    "field-top",
    "tip",
    "flight-label",
    "guide-toggle",
  ])
    $(id).hidden = true;
  $("menu").hidden = false;
  $("challenge-progress").textContent =
    `${progress.challenges.filter(Boolean).length} / 15 completed`;
  game = new Game({ seed: 26 });
  renderer.fx = [];
  renderer.camera = { x: 500, y: 0, z: 1 };
}
function start(mode = "duel", index = 0, tutorial = false) {
  closeSheet();
  audio.unlock();
  playing = true;
  paused = false;
  resultShown = false;
  lastTrail = [];
  shotTrail = [];
  accumulator = 0;
  aiDelay = 0;
  renderer.fx = [];
  renderer.aimCache = "";
  renderer.camera = { x: 500, y: 0, z: 1 };
  if (mode === "practice" && index === 0) {
    practiceRound = 0;
    practiceTotal = 0;
  }
  game = new Game({
    mode,
    seed: tutorial ? 735 : (Date.now() & 0x7fffffff) + index,
    difficulty: progress.settings.difficulty,
    challenge: index,
    practiceIndex: index,
  });
  if (tutorial) {
    game.wind = 0;
    game.units[1].x = 620;
    game.units[1].baseX = 620;
    game.units[1].y = game.terrain[310] - 9;
  }
  tutorialStep = tutorial ? 0 : -1;
  angle = 48;
  power = 65;
  weapon =
    mode === "challenge" ? CHALLENGES[index].weapon || "standard" : "standard";
  $("app").classList.remove("menu-mode");
  $("menu").hidden = true;
  for (const id of ["hud", "deck", "field-top"]) $(id).hidden = false;
  $("mode-label").textContent =
    mode === "duel"
      ? "QUICK DUEL · " + progress.settings.difficulty.toUpperCase()
      : mode === "practice"
        ? "PRACTICE · " + (index + 1) + "/5"
        : "CHALLENGE " +
          (index + 1) +
          " · " +
          CHALLENGES[index].name.toUpperCase();
  $("guide-toggle").hidden = mode !== "practice";
  if (mode === "challenge") toast(CHALLENGES[index].hint);
  syncControls();
  syncHUD();
}
function syncControls() {
  $("angle").value = angle;
  $("power").value = power;
  $("angle-out").textContent = Math.round(angle) + "°";
  $("power-out").textContent = Math.round(power);
  for (const k of ["angle", "power"]) {
    const e = $(k);
    e.style.setProperty(
      "--fill",
      ((Number(e.value) - Number(e.min)) / (Number(e.max) - Number(e.min))) *
        100 +
        "%",
    );
  }
  const can = playing && !paused && game.phase === "aim" && game.turn === 0;
  $("fire").disabled = !can;
  for (const b of document.querySelectorAll("[data-step],#angle,#power"))
    b.disabled = !can;
  for (const b of document.querySelectorAll("[data-weapon]")) {
    b.classList.toggle("selected", b.dataset.weapon === weapon);
    b.disabled =
      !can ||
      !!(
        game.mode === "challenge" &&
        CHALLENGES[game.challenge].weapon &&
        b.dataset.weapon !== weapon
      );
  }
  $("weapon-info").textContent = WEAPONS[weapon].short;
  $("shot-count").textContent =
    `SHOT ${game.shots + 1} · ${can ? "YOUR TURN" : game.phase === "ai" ? "RIVAL THINKING" : "WATCH THE ARC"}`;
  $("guide-toggle").textContent =
    "GUIDE " + (progress.settings.guide ? "ON" : "OFF");
  $("ammo").textContent =
    game.mode === "challenge" ? game.ammo + " SHOTS LEFT" : "";
  const tips = [
    "Slide ANGLE or use + / − to shape the arc.",
    "Now adjust POWER. A little goes a long way.",
    "Tap FIRE. Watch where your shell lands.",
    "Use the fading trail to correct your next shot. Wind pushes every shell.",
  ];
  $("tip").hidden = tutorialStep < 0;
  $("tip").textContent = tips[Math.min(tutorialStep, 3)] || "";
}
function syncHUD() {
  $("you-hp").textContent = Math.ceil(game.units[0].hp);
  $("rival-label").firstChild.textContent =
    game.mode === "duel" ? "RIVAL " : "TARGET ";
  $("rival-hp").textContent =
    game.mode === "duel"
      ? Math.ceil(game.units[1].hp)
      : game.units[1].hp > 0
        ? "•"
        : "✓";
  $("you-bar").style.width = game.units[0].hp + "%";
  $("rival-bar").style.width =
    (100 * game.units[1].hp) / game.units[1].maxHp + "%";
  $("wind-value").textContent =
    (game.wind < 0 ? "← " : game.wind > 0 ? "→ " : "· ") + Math.abs(game.wind);
  $("round-label").textContent =
    game.phase === "ai"
      ? "RIVAL THINKING"
      : game.phase === "flight"
        ? game.turn === 0
          ? "YOUR SHELL"
          : "RIVAL SHELL"
        : game.phase === "result"
          ? "FIELD CLEAR"
          : game.turn === 0
            ? "YOUR SHOT"
            : "RIVAL SHOT";
  $("flight-label").hidden = game.phase !== "flight";
  syncControls();
}
function adjust(k, value) {
  if (!playing || paused || game.phase !== "aim" || game.turn !== 0) return;
  if (k === "angle") angle = clamp(Math.round(value), 5, 85);
  else power = clamp(Math.round(value), 0, 100);
  if (tutorialStep === 0 && k === "angle") tutorialStep = 1;
  else if (tutorialStep === 1 && k === "power") tutorialStep = 2;
  syncControls();
}
function fire() {
  if (paused || !playing || game.turn !== 0) return;
  audio.unlock();
  if (game.fire(angle, power, weapon)) {
    shotTrail = [];
    if (tutorialStep >= 0) tutorialStep = 3;
    audio.haptic();
    syncHUD();
  }
}
function duelDialog() {
  openSheet(
    `${closeButton}<div class="eyeline">QUICK DUEL</div><h2>Choose your rival.</h2><p>Same terrain. Same physics. How close should the first shot come?</p><div class="segmented">${["easy", "normal", "hard"].map((d) => `<button data-difficulty="${d}" class="${d === progress.settings.difficulty ? "selected" : ""}">${titleCase(d)}</button>`).join("")}</div><button class="primary" data-action="begin-duel">ENTER THE FIELD</button>`,
  );
}
function challengeDialog() {
  openSheet(
    `${closeButton}<h2>Read the field.</h2><p>Fifteen ballistic puzzles. Every field is open; earn up to three stars by using fewer shots.</p><div class="challenge-list">${CHALLENGES.map((c) => `<button data-challenge="${c.id}"><span class="num">${String(c.id + 1).padStart(2, "0")}</span><span>${c.name}<small>${c.ammo} shots${c.weapon ? " · " + titleCase(c.weapon) : ""}</small></span><span class="stars">${"★".repeat(progress.challenges[c.id]) || "—"}</span></button>`).join("")}</div>`,
  );
}
function settingsDialog() {
  openSheet(
    `${closeButton}<h2>Make it yours.</h2><p>Everything stays on this device.</p>${[
      ["sound", "Sound", "Locally synthesized effects"],
      ["haptics", "Haptics", "Subtle fire and impact feedback"],
      ["left", "Left-handed", "FIRE on the left"],
      ["guide", "Practice guide", "Show the full practice trajectory"],
      ["motion", "Camera & particles", "Tracking, recoil and impact motion"],
    ]
      .map(
        ([key, name, desc]) =>
          `<div class="setting"><span>${name}<small>${desc}</small></span><button class="switch" role="switch" data-setting="${key}" aria-label="${name}" aria-checked="${progress.settings[key]}"></button></div>`,
      )
      .join(
        "",
      )}<p class="sheet-hint">No accounts. No ads. No network connection.</p>`,
  );
}
function recordsDialog() {
  const a = achievements(progress);
  openSheet(
    `${closeButton}<h2>Your field notes.</h2><div class="records-grid">${[[progress.wins, "WINS"], [progress.losses, "LOSSES"], progress.shots ? [Math.round((100 * progress.hits) / progress.shots) + "%", "ACCURACY"] : ["—", "ACCURACY"], [progress.shots, "SHOTS"], [progress.direct, "DIRECT HITS"], [progress.bestPractice, "BEST PRACTICE"]].map(([n, s]) => `<div><strong>${n}</strong><span>${s}</span></div>`).join("")}</div><p>${progress.challenges.filter(Boolean).length} of 15 challenges completed</p>${a.map((s) => `<div class="achievement">✦ ${s}</div>`).join("") || "<p>Your first victory is waiting.</p>"}`,
  );
}
function pauseGame() {
  if (!playing || paused || resultShown) return;
  paused = true;
  audio.suspend();
  openSheet(
    `<div class="eyeline">TAKE A BREATH</div><h2>Field paused.</h2><p>Your shot will wait.</p><button class="primary" data-action="resume">RESUME</button><button class="wide" data-action="restart">RESTART FIELD</button><button class="wide" data-action="menu">MAIN MENU</button>`,
  );
  syncControls();
}
function result() {
  if (resultShown) return;
  resultShown = true;
  audio.setFlight(false);
  recordResult(progress, game);
  const win = game.winner === 0;
  if (tutorialStep >= 0) {
    progress.tutorial = true;
    tutorialStep = -1;
  }
  if (game.mode === "practice") {
    practiceTotal += scorePractice(game.shots, win ? 1 : 0);
    if (practiceRound === 4)
      progress.bestPractice = Math.max(progress.bestPractice, practiceTotal);
  }
  store();
  audio.play(win ? "victory" : "defeat");
  const heading =
    game.winner === "draw"
      ? "A mutual lesson."
      : game.mode === "duel"
        ? win
          ? "A beautiful shot."
          : "One more adjustment."
        : win
          ? "Range found."
          : "A useful miss.";
  const desc =
    game.mode === "duel"
      ? win
        ? "The field is yours. Ready for a new landscape?"
        : "The rival found the range. A fresh field is one tap away."
      : game.mode === "practice"
        ? `Target ${practiceRound + 1} of 5 · Round score ${practiceTotal.toLocaleString()}`
        : CHALLENGES[game.challenge].hint;
  openSheet(
    `<div class="eyeline">${game.mode === "duel" ? (win ? "VICTORY" : game.winner === "draw" ? "DRAW" : "DEFEAT") : game.mode === "practice" ? "TARGET PRACTICE" : "CHALLENGE " + (game.challenge + 1)}</div><h2>${heading}</h2><p>${desc}</p>${game.mode === "challenge" && win ? `<div class="result-stars">${"★".repeat(starsFor(game.shots))}${"☆".repeat(3 - starsFor(game.shots))}</div>` : ""}<div class="result-stats"><div><strong>${game.shots}</strong><span>SHOTS</span></div><div><strong>${Math.round((100 * game.hits) / Math.max(1, game.shots))}%</strong><span>ACCURACY</span></div><div><strong>${game.direct}</strong><span>DIRECT HITS</span></div></div><button class="primary" data-action="${game.mode === "practice" && practiceRound < 4 ? "next-target" : game.mode === "challenge" && win && game.challenge < 14 ? "next-challenge" : "restart"}">${game.mode === "practice" && practiceRound < 4 ? "NEXT TARGET" : game.mode === "challenge" && win && game.challenge < 14 ? "NEXT CHALLENGE" : "PLAY AGAIN"}</button><button class="wide" data-action="menu">MAIN MENU</button>`,
  );
  syncHUD();
}
$("play").onclick = duelDialog;
$("practice").onclick = () => start("practice");
$("challenges").onclick = challengeDialog;
$("settings").onclick = settingsDialog;
$("records").onclick = recordsDialog;
$("tutorial").onclick = () => start("practice", 0, true);
$("pause").onclick = pauseGame;
$("fire").onclick = fire;
for (const k of ["angle", "power"])
  $(k).addEventListener("input", (e) => adjust(k, Number(e.target.value)));
document.querySelectorAll("[data-step]").forEach(
  (b) =>
    (b.onclick = () => {
      const [k, d] = b.dataset.step.split(":");
      adjust(k, (k === "angle" ? angle : power) + Number(d));
      audio.play("ui");
    }),
);
document.querySelectorAll("[data-weapon]").forEach(
  (b) =>
    (b.onclick = () => {
      weapon = b.dataset.weapon;
      audio.play("ui");
      syncControls();
    }),
);
$("guide-toggle").onclick = () => {
  progress.settings.guide = !progress.settings.guide;
  store();
  syncControls();
};
$("sheet").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  audio.unlock();
  audio.play("ui");
  const act = b.dataset.action;
  if (b.dataset.difficulty) {
    progress.settings.difficulty = b.dataset.difficulty;
    store();
    duelDialog();
  }
  if (b.dataset.challenge !== undefined)
    start("challenge", Number(b.dataset.challenge));
  if (b.dataset.setting) {
    let key = b.dataset.setting;
    progress.settings[key] = !progress.settings[key];
    b.setAttribute("aria-checked", progress.settings[key]);
    applySettings();
    store();
    if (key === "haptics") audio.haptic();
  }
  if (act === "close") closeSheet();
  if (act === "begin-duel") start("duel");
  if (act === "menu") showMenu();
  if (act === "restart")
    start(game.mode, game.mode === "challenge" ? game.challenge : 0);
  if (act === "resume") {
    closeSheet();
    paused = false;
    audio.unlock();
    lastFrame = performance.now();
    accumulator = 0;
    syncHUD();
  }
  if (act === "next-target") {
    practiceRound++;
    start("practice", practiceRound);
  }
  if (act === "next-challenge") start("challenge", game.challenge + 1);
});
let dragging = false;
$("battle").addEventListener("pointerdown", (e) => {
  if (!playing || paused || game.phase !== "aim" || game.turn !== 0) return;
  dragging = true;
  $("battle").setPointerCapture(e.pointerId);
  aimDrag(e);
});
function aimDrag(e) {
  const p = renderer.worldPoint(e.clientX, e.clientY),
    u = game.units[0],
    dx = p.x - u.x,
    dy = u.y - p.y;
  if (dx > 5 && dy > 0) adjust("angle", (Math.atan2(dy, dx) * 180) / Math.PI);
}
$("battle").addEventListener("pointermove", (e) => {
  if (dragging) aimDrag(e);
});
$("battle").addEventListener("pointerup", () => (dragging = false));
$("battle").addEventListener("pointercancel", () => (dragging = false));
document.addEventListener("keydown", (e) => {
  if (!$("modal").hidden) {
    if (e.key === "Escape" && paused) {
      $("sheet").querySelector('[data-action="resume"]')?.click();
    }
    if (e.key === "Tab") {
      const items = [
        ...$("sheet").querySelectorAll("button:not(:disabled),input"),
      ];
      if (!items.length) return;
      const a = items[0],
        z = items.at(-1);
      if (
        e.shiftKey &&
        (document.activeElement === a || document.activeElement === $("sheet"))
      ) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    }
    return;
  }
  if (!playing) return;
  if (e.key === "Escape") {
    pauseGame();
    return;
  }
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === "ArrowLeft") adjust("angle", angle - 1);
  if (e.key === "ArrowRight") adjust("angle", angle + 1);
  if (e.key === "ArrowUp") adjust("power", power + 1);
  if (e.key === "ArrowDown") adjust("power", power - 1);
});
function background() {
  if (playing && !resultShown) pauseGame();
  audio.suspend();
  accumulator = 0;
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) background();
  else {
    lastFrame = performance.now();
    accumulator = 0;
  }
});
window.addEventListener("pagehide", background);
window.addEventListener("trajectoryPause", background);
window.addEventListener("blur", () => {
  if (playing && $("modal").hidden) background();
});
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) return;
  const dt = Math.min(0.05, Math.max(0, (now - (lastFrame || now)) / 1000));
  lastFrame = now;
  if (!playing) {
    menuFrame += dt;
    if (menuFrame < 1 / 30) return;
    menuFrame = 0;
    renderer.draw(
      game,
      {
        angle: 42,
        power: 65,
        weapon: "standard",
        motion: false,
        guide: false,
        menu: true,
      },
      dt,
    );
    return;
  }
  if (!paused && !resultShown) {
    if (game.phase === "ai") {
      aiDelay += dt;
      if (aiDelay > 0.65) {
        const a = aimAI(game, game.difficulty, game.aiShots, game.seed);
        aiDelay = 0;
        aiAngle = a.angle;
        game.beginAI();
        game.fire(a.angle, a.power, a.weapon);
        syncHUD();
      }
    }
    accumulator += dt;
    while (accumulator >= DT) {
      game.step();
      accumulator -= DT;
      for (const p of game.projectiles)
        if (p.owner === 0) {
          if (shotTrail.length < 1200)
            shotTrail.push({ x: p.x, y: p.y, path: p.path || 0 });
        }
    }
    const events = game.drainEvents();
    if (events.length) {
      renderer.events(events, progress.settings.motion);
      for (const e of events) {
        audio.play(e.type);
        if (e.type === "blast") {
          audio.haptic("blast");
          if (game.turn === 0) lastTrail = [...shotTrail];
        }
        if (e.type === "miss" && game.turn === 0) {
          lastTrail = [...shotTrail];
          toast("Beyond the field. Try less power or a higher arc.");
        }
        if (e.type === "damage") syncHUD();
      }
      syncHUD();
    }
    if (hudPhase !== game.phase) {
      hudPhase = game.phase;
      syncHUD();
    }
    if (game.phase === "result") result();
    audio.setFlight(game.phase === "flight");
  }
  if (paused || resultShown) {
    pausedFrame += dt;
    if (pausedFrame < 0.1) return;
    pausedFrame = 0;
  }
  renderer.draw(
    game,
    {
      angle,
      power,
      weapon,
      aiAngle,
      motion: progress.settings.motion,
      guide: progress.settings.guide,
      lastTrail,
    },
    paused || resultShown ? 0 : dt,
  );
  if (toastUntil && now > toastUntil) {
    $("toast").hidden = true;
    toastUntil = 0;
  }
}
applySettings();
showMenu();
requestAnimationFrame(frame);
