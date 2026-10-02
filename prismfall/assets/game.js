/* Prismfall — an original falling-block puzzle game.
 * Core: 10x20 well, 7-bag, SRS rotation + wall kicks, hold, 5-piece preview, ghost,
 * lock delay with move reset, T-spins, combos, back-to-back.
 * Twists: gem minos (meta currency), Prism meter -> Burst + Fever, Workshop perks,
 * themes unlocked by player level, achievements, seeded Daily Bloom.
 */
(() => {
  'use strict';
  const A = window.PFArt, AU = window.PFAudio;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const pnow = () => performance.now();

  // ------------------------------------------------------------------ constants
  const COLS = 10, ROWS = 22, HIDDEN = 2, VIS = ROWS - HIDDEN;
  const TYPES = A.TYPES;
  const SPAWN = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
  };
  // Rotation states built by rotating each mino's coordinates, so cell index i
  // always refers to the same physical mino (needed to track gems through rotation).
  const SHAPES = {};
  for (const t of TYPES) {
    const m = SPAWN[t], n = m.length, base = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) base.push([x, y]);
    const st = [base];
    for (let i = 1; i < 4; i++) st.push(st[i - 1].map(([x, y]) => [n - 1 - y, x]));
    SHAPES[t] = { n, states: st };
  }
  // SRS kick data (y up) -> converted to screen space (y down) when used.
  const K_JLSTZ = {
    '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  };
  const K_I = {
    '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]], '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  };
  const K_180 = [[0, 0], [0, -1], [1, 0], [-1, 0], [1, -1], [-1, -1], [0, 1]]; // already screen space
  const LOCK_RESETS = 15;

  const MODES = {
    marathon: { name: 'Marathon', desc: 'Climb to level 15. Speed rises every 10 lines. Survive 150 lines to win.', goal: 150 },
    sprint: { name: 'Sprint 40', desc: 'Clear 40 lines as fast as you can. Speed stays gentle.', goal: 40 },
    daily: { name: 'Daily Bloom', desc: '3-minute score attack. Same piece order for everyone today.', time: 180 },
    zen: { name: 'Zen Garden', desc: 'No game over, slow speed. Stack, relax, collect gems.' },
  };

  const PERKS = [
    { id: 'lens', name: 'Prism Lens', max: 3, cost: [20, 45, 90], desc: (l) => 'Prism meter charges ' + (20 * Math.max(1, l)) + '% faster' },
    { id: 'magnet', name: 'Gem Magnet', max: 3, cost: [25, 55, 110], desc: (l) => 'Gem chance ' + (10 + 3 * Math.max(1, l)) + '% (base 10%)' },
    { id: 'wide', name: 'Wide Beam', max: 2, cost: [40, 100], desc: (l) => 'Prism Burst clears ' + (4 + Math.max(1, l)) + ' rows (base 4)' },
    { id: 'fever', name: 'Fever Fuel', max: 2, cost: [30, 80], desc: (l) => 'Fever lasts ' + (8 + 3 * Math.max(1, l)) + 's (base 8s)' },
    { id: 'steady', name: 'Steady Hands', max: 2, cost: [30, 70], desc: (l) => 'Lock delay ' + (500 + 100 * Math.max(1, l)) + 'ms (base 500ms)' },
    { id: 'wind', name: 'Second Wind', max: 1, cost: [150], desc: () => 'Once per run, a top-out clears 8 rows instead of ending the game' },
  ];

  const LEVEL_XP = [0, 30, 80, 150, 250, 400, 600, 850, 1150, 1500, 1900, 2400, 3000];
  const ACH = [
    { id: 'quad', name: 'Quadrant', desc: 'Clear 4 lines at once', r: 15 },
    { id: 'tspin', name: 'Twist of Fate', desc: 'Clear lines with a T-spin', r: 15 },
    { id: 'tst', name: 'Triple Axel', desc: 'T-spin triple', r: 40 },
    { id: 'b2b', name: 'Back to Back', desc: 'Two quads or T-spins in a row', r: 15 },
    { id: 'combo5', name: 'Chain Bloom', desc: 'Reach a 5x combo', r: 20 },
    { id: 'combo10', name: 'Overgrowth', desc: 'Reach a 10x combo', r: 50 },
    { id: 'pc', name: 'Clean Slate', desc: 'Perfect clear: empty the whole board', r: 60 },
    { id: 'burst', name: 'Refraction', desc: 'Fire your first Prism Burst', r: 10 },
    { id: 'lvl10', name: 'Altitude', desc: 'Reach level 10 in Marathon', r: 30 },
    { id: 'mwin', name: 'Prism Master', desc: 'Win Marathon (150 lines)', r: 100 },
    { id: 'sprint', name: 'Forty Winks', desc: 'Finish a Sprint 40', r: 15 },
    { id: 'sprint150', name: 'Quicksilver', desc: 'Sprint 40 in under 2:30', r: 40 },
    { id: 'daily30', name: 'Sunrise Shift', desc: 'Score 30,000 in Daily Bloom', r: 30 },
    { id: 'gems100', name: 'Magpie', desc: 'Collect 100 gems in total', r: 30 },
    { id: 'zen100', name: 'Still Water', desc: 'Clear 100 lines in one Zen session', r: 20 },
  ];

  // ------------------------------------------------------------------ rng
  function mulberry32(a) {
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // ------------------------------------------------------------------ save
  const SAVE_KEY = 'prismfall.save.v1';
  const defaultSave = () => ({
    v: 1, shards: 0, xp: 0, theme: 'paper', seenTutorial: false,
    perks: { lens: 0, magnet: 0, wide: 0, fever: 0, steady: 0, wind: 0 },
    best: { marathon: 0, marathonLines: 0, sprint: 0, daily: { date: '', score: 0 }, dailyAll: 0, zen: 0 },
    ach: {},
    totals: { runs: 0, lines: 0, gems: 0, quads: 0, tspins: 0, pieces: 0, time: 0, shardsEarned: 0 },
    settings: { music: 0.5, sfx: 0.7, das: 140, arr: 30, sdf: 20, ghost: true, shake: true, mouse: true, startLevel: 1 },
  });
  function merge(base, over) {
    if (!over || typeof over !== 'object') return base;
    for (const k of Object.keys(base)) {
      if (!(k in over)) continue;
      if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = merge(base[k], over[k]);
      else if (typeof over[k] === typeof base[k]) base[k] = over[k];
    }
    if (over.ach && typeof over.ach === 'object') base.ach = over.ach;
    return base;
  }
  let storageOk = true;
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return merge(defaultSave(), JSON.parse(raw));
    } catch (e) { storageOk = false; }
    return defaultSave();
  }
  let save = loadSave();
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); storageOk = true; } catch (e) { storageOk = false; }
  }
  function playerLevel(xp) {
    let l = 1;
    for (let i = 0; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) l = i + 1;
    if (xp >= LEVEL_XP[LEVEL_XP.length - 1]) l = LEVEL_XP.length + Math.floor((xp - LEVEL_XP[LEVEL_XP.length - 1]) / 700);
    return l;
  }
  function levelProgress(xp) {
    const l = playerLevel(xp);
    const lo = l <= LEVEL_XP.length ? LEVEL_XP[l - 1] : LEVEL_XP[LEVEL_XP.length - 1] + (l - LEVEL_XP.length) * 700;
    const hi = l < LEVEL_XP.length ? LEVEL_XP[l] : lo + 700;
    return { level: l, cur: xp - lo, need: hi - lo, frac: (xp - lo) / (hi - lo) };
  }

  // ------------------------------------------------------------------ canvas / layout
  const cv = $('#game');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1, L = null, tiles = null, bgCache = null, chromeCache = null;
  function layout() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    const cs = Math.max(12, Math.floor(Math.min((H - 28) / (VIS + 2.6), (W - 28) / (COLS + 13.4))));
    const bw = COLS * cs, bh = VIS * cs;
    const bx = Math.round((W - bw) / 2);
    const by = Math.round((H - bh) / 2 + cs * 0.9);
    L = {
      cs, bw, bh, bx, by,
      lx: bx - cs * 6.1, lw: cs * 5.3,
      rx: bx + bw + cs * 0.95, rw: cs * 5.3,
      mx: bx + bw + cs * 0.36, mw: Math.max(5, cs * 0.3),
    };
    L.holdBox = { x: L.lx, y: by, w: L.lw, h: cs * 3.6 };
    L.statBox = { x: L.lx, y: by + cs * 4.2, w: L.lw, h: bh - cs * 4.2 };
    L.nextBox = { x: L.rx, y: by, w: L.rw, h: cs * 12.4 };
    L.infoBox = { x: L.rx, y: by + cs * 13, w: L.rw, h: bh - cs * 13 };
    L.gemTarget = { x: L.lx + L.lw * 0.5, y: by + bh - cs * 1.5 };
    rebuildArt();
  }
  function theme() { return A.themeById(save.theme); }
  function rebuildArt() {
    if (!L) return;
    tiles = A.buildTileSet(save.theme, L.cs * DPR);
    const th = theme();
    // background cache
    bgCache = document.createElement('canvas');
    bgCache.width = cv.width; bgCache.height = cv.height;
    const b = bgCache.getContext('2d');
    const g = b.createLinearGradient(0, 0, 0, bgCache.height);
    g.addColorStop(0, th.bgTop);
    g.addColorStop(1, th.bgBot);
    b.fillStyle = g;
    b.fillRect(0, 0, bgCache.width, bgCache.height);
    // soft dot pattern
    b.fillStyle = 'rgba(80,90,140,0.045)';
    const step = 26 * DPR;
    for (let y = step / 2; y < bgCache.height; y += step) for (let x = ((y / step) % 2) * step / 2; x < bgCache.width; x += step) { b.beginPath(); b.arc(x, y, 1.6 * DPR, 0, 7); b.fill(); }
    // chrome cache (panels + board well)
    chromeCache = document.createElement('canvas');
    chromeCache.width = cv.width; chromeCache.height = cv.height;
    const c = chromeCache.getContext('2d');
    c.scale(DPR, DPR);
    const panel = (bx, r, fill) => {
      c.save();
      c.shadowColor = 'rgba(60,70,120,0.14)';
      c.shadowBlur = 18;
      c.shadowOffsetY = 6;
      A.roundRect(c, bx.x, bx.y, bx.w, bx.h, r);
      c.fillStyle = fill || 'rgba(255,255,255,0.92)';
      c.fill();
      c.restore();
      A.roundRect(c, bx.x + 0.5, bx.y + 0.5, bx.w - 1, bx.h - 1, r);
      c.strokeStyle = 'rgba(120,120,160,0.18)';
      c.lineWidth = 1;
      c.stroke();
    };
    const cs = L.cs;
    panel({ x: L.bx - 6, y: L.by - 6, w: L.bw + 12, h: L.bh + 12 }, 14, th.board);
    panel(L.holdBox, 14);
    panel(L.statBox, 14);
    panel(L.nextBox, 14);
    panel(L.infoBox, 14);
    // grid
    c.strokeStyle = th.grid;
    c.lineWidth = 1;
    c.beginPath();
    for (let x = 1; x < COLS; x++) { c.moveTo(L.bx + x * cs + 0.5, L.by); c.lineTo(L.bx + x * cs + 0.5, L.by + L.bh); }
    for (let y = 1; y < VIS; y++) { c.moveTo(L.bx, L.by + y * cs + 0.5); c.lineTo(L.bx + L.bw, L.by + y * cs + 0.5); }
    c.stroke();
    // meter track
    A.roundRect(c, L.mx, L.by, L.mw, L.bh, L.mw / 2);
    c.fillStyle = 'rgba(120,120,170,0.12)';
    c.fill();
    // labels
    c.fillStyle = A.rgba(th.ink, 0.55);
    c.font = '700 ' + Math.round(cs * 0.42) + 'px ' + FONT;
    c.textBaseline = 'top';
    c.fillText('HOLD', L.holdBox.x + cs * 0.4, L.holdBox.y + cs * 0.3);
    c.fillText('NEXT', L.nextBox.x + cs * 0.4, L.nextBox.y + cs * 0.3);
    document.documentElement.style.setProperty('--accent', th.accent);
    document.documentElement.style.setProperty('--accent-soft', A.rgba(th.accent, 0.12));
    document.documentElement.style.setProperty('--ink', th.ink);
    document.documentElement.style.setProperty('--bg1', th.bgTop);
    document.documentElement.style.setProperty('--bg2', th.bgBot);
  }
  const FONT = '"Segoe UI", Nunito, system-ui, -apple-system, Arial, sans-serif';

  // ------------------------------------------------------------------ game state
  let G = null; // current run
  let screen = 'title';
  const fx = { parts: [], texts: [], shake: 0, flash: 0, trails: [], lockCells: [], banner: null };
  const deco = []; // floating background shapes
  const attract = []; // falling pieces behind menus

  function newGame(mode) {
    const p = save.perks;
    const seed = mode === 'daily' ? hashStr('prismfall-' + todayStr()) : (Math.random() * 4294967296) >>> 0;
    G = {
      mode, seed,
      bagRng: mulberry32(seed), gemRng: mulberry32(seed ^ 0x9e3779b9),
      bag: [], queue: [],
      board: Array.from({ length: ROWS }, () => new Uint8Array(COLS)),
      cur: null, hold: null, holdUsed: false,
      score: 0, lines: 0, startLevel: mode === 'marathon' ? clamp(save.settings.startLevel, 1, 15) : 1, level: 1,
      combo: -1, b2b: false, time: 0, pieces: 0,
      gravAcc: 0, lockTimer: 0, lockResets: 0, lowestY: 0, lastAction: '', lastKick: 0,
      clearing: null, prism: 0, prismNotified: false, fever: 0, gems: 0, windUsed: false,
      state: 'countdown', countdown: 1.5, lastCount: 3, overT: 0, won: false, overLabel: '', result: null,
      gemChance: (save.totals.runs === 0 ? 0.25 : 0.1) + 0.03 * p.magnet,
      lockDelay: 0.5 + 0.1 * p.steady,
      burstRows: 4 + p.wide,
      feverDur: 8 + 3 * p.fever,
      prismMult: 1 + 0.2 * p.lens,
      st: { quads: 0, tspins: 0, maxCombo: 0, pcs: 0, bursts: 0, b2bs: 0 },
      newAch: [], hint: { t: 0, held: false, cleared: false, burst: false, moved: false, dropped: false },
      tutorial: !save.seenTutorial, dangerT: 0,
    };
    G.level = G.startLevel;
    refillQueue();
    fx.parts.length = 0; fx.texts.length = 0; fx.trails.length = 0; fx.lockCells.length = 0; fx.flash = 0; fx.shake = 0;
    input.reset();
    showScreen('game');
    AU.setMusic('game', { level: G.level, intensity: 1, fever: false });
    AU.duck(false);
  }
  function nextFromBag() {
    if (!G.bag.length) {
      const b = TYPES.slice();
      for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(G.bagRng() * (i + 1)); const t = b[i]; b[i] = b[j]; b[j] = t; }
      G.bag = b;
    }
    return G.bag.shift();
  }
  function refillQueue() {
    while (G.queue.length < 6) {
      const type = nextFromBag();
      const gem = G.gemRng() < G.gemChance ? Math.floor(G.gemRng() * 4) : -1;
      G.queue.push({ type, gem });
    }
  }
  function cellsOf(t, rot, x, y) { return SHAPES[t].states[rot].map(([cx, cy]) => [x + cx, y + cy]); }
  function collides(t, rot, x, y) {
    const st = SHAPES[t].states[rot];
    for (let i = 0; i < st.length; i++) {
      const bx = x + st[i][0], by = y + st[i][1];
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && G.board[by][bx]) return true;
    }
    return false;
  }
  function grounded() { const c = G.cur; return c && collides(c.type, c.rot, c.x, c.y + 1); }
  function ghostY() { const c = G.cur; let y = c.y; while (!collides(c.type, c.rot, c.x, y + 1)) y++; return y; }
  function gravSec() {
    const lv = G.mode === 'sprint' || G.mode === 'zen' ? 1 : Math.min(G.level, 20);
    return Math.pow(0.8 - (lv - 1) * 0.007, lv - 1);
  }

  function spawn(p, fromHold, rescued) {
    const t = p.type;
    const x = t === 'O' ? 4 : 3;
    G.cur = { type: t, rot: 0, x, y: 0, gem: p.gem };
    if (collides(t, 0, x, 0)) {
      G.cur = null;
      if (!rescued && rescue()) return spawn(p, fromHold, true);
      return finish(false, 'TOP OUT');
    }
    if (!collides(t, 0, x, 1)) G.cur.y = 1;
    G.lowestY = G.cur.y; G.lockTimer = 0; G.lockResets = 0; G.gravAcc = 0; G.lastAction = ''; G.lastKick = 0;
    if (!fromHold) G.holdUsed = false;
    input.onSpawn();
  }
  function spawnNext() {
    const p = G.queue.shift();
    refillQueue();
    spawn(p, false, false);
  }
  // Called on top-out: Zen always rescues, Second Wind rescues once.
  function rescue() {
    if (G.mode === 'zen') { clearBottom(10); addText('FRESH SOIL', { color: '#2e9e6a' }); return true; }
    if (save.perks.wind && !G.windUsed) {
      G.windUsed = true;
      clearBottom(8);
      addText('SECOND WIND!', { color: '#2e9e6a', size: 1.2 });
      AU.play('burst');
      return true;
    }
    return false;
  }
  function clearBottom(n) {
    let removed = 0;
    for (let k = 0; k < n; k++) {
      const row = G.board[ROWS - 1];
      for (let x = 0; x < COLS; x++) if (row[x]) { removed++; if (row[x] & 16) collectGem(x, ROWS - 1); spawnBits(x, ROWS - 1 - k * 0, row[x] & 15, 2); }
      G.board.pop();
      G.board.unshift(new Uint8Array(COLS));
    }
    // a piece tucked under an overhang could now overlap: push it up
    if (G.cur) { let guard = 0; while (collides(G.cur.type, G.cur.rot, G.cur.x, G.cur.y) && guard++ < ROWS) G.cur.y--; }
    fx.shake = Math.max(fx.shake, 12);
    fx.flash = 0.6;
    return removed;
  }

  function tryMove(dx, dy) {
    const c = G.cur;
    if (!c || collides(c.type, c.rot, c.x + dx, c.y + dy)) return false;
    c.x += dx; c.y += dy;
    if (c.y > G.lowestY) { G.lowestY = c.y; G.lockResets = 0; }
    G.lastAction = 'move';
    if (dx) onManip();
    return true;
  }
  function onManip() {
    if (grounded() && G.lockResets < LOCK_RESETS) { G.lockTimer = 0; G.lockResets++; }
  }
  function tryRotate(dir) {
    const c = G.cur;
    if (!c) return false;
    const from = c.rot, to = (from + (dir === 2 ? 2 : dir) + 4) % 4;
    if (c.type === 'O') { c.rot = to; onManip(); return true; }
    const kicks = dir === 2 ? K_180 : (c.type === 'I' ? K_I : K_JLSTZ)[from + '>' + to].map(([kx, ky]) => [kx, -ky]);
    for (let i = 0; i < kicks.length; i++) {
      const nx = c.x + kicks[i][0], ny = c.y + kicks[i][1];
      if (!collides(c.type, to, nx, ny)) {
        c.x = nx; c.y = ny; c.rot = to;
        if (c.y > G.lowestY) { G.lowestY = c.y; G.lockResets = 0; }
        G.lastAction = 'rotate'; G.lastKick = i;
        onManip();
        return true;
      }
    }
    return false;
  }
  function hardDrop() {
    const c = G.cur;
    if (!c) return;
    const gy = ghostY(), d = gy - c.y;
    if (d > 0) {
      G.lastAction = 'move';
      fx.trails.push({ cells: cellsOf(c.type, c.rot, c.x, c.y), d, t: 0, color: theme().colors[c.type] });
    }
    c.y = gy;
    G.score += 2 * d;
    if (save.settings.shake) fx.shake = Math.max(fx.shake, 3 + Math.min(4, d * 0.3));
    AU.play('hard');
    G.hint.dropped = true;
    lock();
  }
  function doHold() {
    if (!G.cur || G.holdUsed) { AU.play('buzz'); return; }
    const cur = { type: G.cur.type, gem: G.cur.gem };
    const h = G.hold;
    G.hold = cur;
    if (h) spawn(h, true, false);
    else { const p = G.queue.shift(); refillQueue(); spawn(p, true, false); }
    G.holdUsed = true;
    G.hint.held = true;
    AU.play('hold');
  }

  function lock() {
    const c = G.cur;
    const ti = TYPES.indexOf(c.type) + 1;
    let allHidden = true;
    const locked = [];
    SHAPES[c.type].states[c.rot].forEach(([cx, cy], i) => {
      const x = c.x + cx, y = c.y + cy;
      if (y >= 0) G.board[y][x] = ti | (i === c.gem ? 16 : 0);
      if (y >= HIDDEN) allHidden = false;
      locked.push([x, y]);
    });
    // T-spin (3-corner rule; mini unless both front corners or the last SRS kick was used)
    let tspin = null;
    if (c.type === 'T' && G.lastAction === 'rotate') {
      const occ = (x, y) => x < 0 || x >= COLS || y >= ROWS || (y >= 0 && G.board[y][x] !== 0);
      const corners = [[0, 0], [2, 0], [2, 2], [0, 2]].map(([dx, dy]) => occ(c.x + dx, c.y + dy));
      if (corners.filter(Boolean).length >= 3) {
        const front = [[0, 1], [1, 2], [2, 3], [3, 0]][c.rot];
        const fc = front.filter((i) => corners[i]).length;
        tspin = fc === 2 || G.lastKick === 4 ? 'full' : 'mini';
      }
    }
    G.cur = null;
    G.pieces++;
    fx.lockCells.push({ cells: locked, t: 0 });
    AU.play('lock');
    const full = [];
    for (let y = 0; y < ROWS; y++) if (G.board[y].every((v) => v)) full.push(y);
    scoreClear(full, tspin);
    if (full.length) {
      G.clearing = { rows: full, t: 0, dur: 0.3 };
      for (const y of full) for (let x = 0; x < COLS; x++) {
        const v = G.board[y][x];
        if (v & 16) collectGem(x, y);
        spawnBits(x, y, v & 15, 3);
      }
    } else {
      if (allHidden && !rescue()) return finish(false, 'LOCK OUT');
      spawnNext();
    }
  }

  const CLEAR_NAMES = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD'];
  function scoreClear(full, tspin) {
    const n = full.length;
    let base = 0, label = '', difficult = false;
    if (tspin === 'full') { base = [400, 800, 1200, 1600][n]; label = 'T-SPIN' + (n ? ' ' + CLEAR_NAMES[n] : ''); difficult = n > 0; }
    else if (tspin === 'mini') { base = [100, 200, 400, 400][n]; label = 'T-SPIN MINI' + (n ? ' ' + CLEAR_NAMES[n] : ''); difficult = n > 0; }
    else { base = [0, 100, 300, 500, 800][n]; label = CLEAR_NAMES[n]; difficult = n === 4; }
    const lv = G.level;
    let pts = base * lv;
    let b2bNow = false;
    if (n > 0) {
      G.combo++;
      if (difficult && G.b2b) { pts *= 1.5; b2bNow = true; G.st.b2bs++; unlock('b2b'); }
      G.b2b = difficult;
      if (G.combo > 0) pts += 50 * G.combo * lv;
      G.st.maxCombo = Math.max(G.st.maxCombo, G.combo);
    } else {
      G.combo = -1;
    }
    // perfect clear?
    let pc = false;
    if (n > 0) {
      pc = true;
      for (let y = 0; y < ROWS && pc; y++) {
        if (full.includes(y)) continue;
        for (let x = 0; x < COLS; x++) if (G.board[y][x]) { pc = false; break; }
      }
      if (pc) { pts += 3000 * lv; G.st.pcs++; unlock('pc'); }
    }
    if (G.fever > 0) pts *= 2;
    G.score += Math.round(pts);

    // prism charge
    if (n > 0 || tspin) {
      let ch = [0, 8, 18, 30, 50][n] + (tspin && n ? 15 : tspin ? 4 : 0) + Math.max(0, G.combo) * 2 + (pc ? 100 : 0);
      if (G.fever > 0) ch *= 0.5;
      G.prism = Math.min(100, G.prism + ch * G.prismMult);
      if (G.prism >= 100 && !G.prismNotified) {
        G.prismNotified = true;
        addText('PRISM READY', { color: '#7a6cf0', y: 13, size: 0.8 });
        AU.play('prismReady');
      }
    }

    // stats, feedback
    if (n === 4) { G.st.quads++; unlock('quad'); }
    if (tspin && n > 0) { G.st.tspins++; unlock('tspin'); if (n === 3 && tspin === 'full') unlock('tst'); }
    if (G.combo >= 5) unlock('combo5');
    if (G.combo >= 10) unlock('combo10');
    if (label && (n > 0 || tspin)) {
      const color = n === 4 ? '#e0569a' : tspin ? '#8a63e8' : theme().ink;
      addText(label, { color, size: n >= 4 || tspin ? 1.25 : n >= 2 ? 1 : 0.8 });
    }
    if (b2bNow) addText('BACK-TO-BACK', { color: '#f08a00', y: 8.6, size: 0.65 });
    if (G.combo > 0) addText(G.combo + 'x COMBO', { color: '#2f9a96', y: 12.2, size: 0.75 });
    if (pc) { addText('PERFECT CLEAR', { color: '#f6a700', y: 6, size: 1.2 }); AU.play('pc'); }
    if (n > 0) {
      AU.play('clear', n, Math.max(0, G.combo));
      if (tspin) AU.play('tspin');
      if (save.settings.shake) fx.shake = Math.max(fx.shake, n >= 4 ? 10 : n * 2);
      fx.flash = Math.max(fx.flash, n >= 4 ? 0.5 : 0.18);
      const before = G.level;
      G.lines += n;
      if (G.mode === 'marathon' || G.mode === 'daily') G.level = G.startLevel + Math.floor(G.lines / 10);
      else if (G.mode === 'zen') G.level = 1 + Math.floor(G.lines / 10);
      if (G.level > before) {
        addText('LEVEL ' + G.level, { color: theme().accent, y: 4, size: 1 });
        AU.play('levelUp');
        if (G.mode === 'marathon' && G.level >= 10) unlock('lvl10');
      }
      G.hint.cleared = true;
    } else if (tspin) {
      AU.play('tspin');
    }
    updateMusic();
  }
  function updateMusic() {
    if (!G) return;
    const tier = G.mode === 'sprint' ? 2 : G.level >= 8 ? 3 : G.level >= 3 ? 2 : 1;
    const inten = G.fever > 0 ? 4 : Math.min(4, tier + (G.combo >= 2 ? 1 : 0));
    AU.setMusic('game', { level: G.mode === 'sprint' ? 6 : G.level, intensity: inten, fever: G.fever > 0 });
  }

  function burst() {
    if (!G || G.state !== 'play' || G.clearing) return;
    if (G.prism < 100) { AU.play('buzz'); addText('PRISM ' + Math.floor(G.prism) + '%', { color: '#9aa', y: 13, size: 0.6 }); return; }
    const cells = clearBottom(G.burstRows);
    G.prism = 0;
    G.prismNotified = false;
    G.fever = G.feverDur;
    G.st.bursts++;
    G.score += cells * 25 * G.level;
    G.hint.burst = true;
    unlock('burst');
    addText('PRISM BURST', { color: '#7a6cf0', size: 1.3, y: 7 });
    addText('FEVER x2', { color: '#e0569a', size: 0.85, y: 9.4 });
    if (save.settings.shake) fx.shake = 16;
    fx.flash = 1;
    AU.play('burst');
    // rainbow sparks across the beam
    for (let i = 0; i < 70; i++) {
      fx.parts.push({ x: Math.random() * COLS, y: VIS + HIDDEN - Math.random() * G.burstRows, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 16, life: 0, max: 0.7 + Math.random() * 0.6, hue: Math.random() * 360, size: 0.18 + Math.random() * 0.2, g: 18 });
    }
    updateMusic();
  }

  function collectGem(x, y) {
    G.gems++;
    const i = G.gems;
    fx.parts.push({ gem: true, x: x + 0.5, y: y + 0.5, vx: (Math.random() - 0.5) * 6, vy: -4 - Math.random() * 4, life: 0, max: 0.9, delay: 0, idx: i });
  }
  function spawnBits(x, y, typeIdx, n) {
    const col = theme().colors[TYPES[typeIdx - 1]] || '#ccc';
    for (let i = 0; i < n; i++) {
      fx.parts.push({ x: x + Math.random(), y: y + Math.random(), vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 2, life: 0, max: 0.5 + Math.random() * 0.5, color: col, size: 0.16 + Math.random() * 0.18, g: 26 });
    }
  }
  function addText(text, o) {
    o = o || {};
    const size = o.size || 1;
    let y = o.y != null ? o.y : 10.5;
    // keep simultaneous callouts from overlapping: step down into a free lane
    // (texts rise 0.8 cells over their life, so compare against where each one is now)
    const cur = (t) => t.y - (t.t / t.max) * 0.8;
    for (let guard = 0; guard < 8; guard++) {
      const hit = fx.texts.find((t) => t.t < t.max * 0.8 && Math.abs(cur(t) - y) < 0.8 * (t.size + size));
      if (!hit) break;
      y = cur(hit) + 0.85 * (hit.size + size);
    }
    if (y > 18) y = 18;
    fx.texts.push({ text, color: o.color || '#2b3350', y, size, t: 0, max: o.max || 1.3 });
    if (fx.texts.length > 6) fx.texts.shift();
  }

  function finish(won, label) {
    if (!G || G.state === 'over') return;
    G.state = 'over';
    G.won = won;
    G.overLabel = label;
    G.overT = 0;
    G.cur = null;
    G.clearing = null;
    AU.play(won ? 'win' : 'gameOver');
    AU.setMusic('off');
    G.result = computeResults();
  }

  function computeResults() {
    const r = { mode: G.mode, score: G.score, lines: G.lines, level: G.level, time: G.time, gems: G.gems, won: G.won, label: G.overLabel, newBest: false, pieces: G.pieces };
    let bonus = Math.floor(G.score / 2500);
    if (G.mode === 'sprint' && G.won) bonus += 5;
    if (G.mode === 'marathon' && G.won) bonus += 25;
    r.shards = G.gems + bonus;
    r.bonus = bonus;
    const b = save.best;
    if (G.mode === 'marathon') { if (G.score > b.marathon) { b.marathon = G.score; b.marathonLines = G.lines; r.newBest = G.score > 0; } r.best = b.marathon; if (G.won) unlock('mwin'); }
    if (G.mode === 'sprint') {
      if (G.won) { if (!b.sprint || G.time < b.sprint) { b.sprint = G.time; r.newBest = true; } unlock('sprint'); if (G.time < 150) unlock('sprint150'); }
      r.best = b.sprint;
    }
    if (G.mode === 'daily') {
      const td = todayStr();
      if (b.daily.date !== td) b.daily = { date: td, score: 0 };
      if (G.score > b.daily.score) { b.daily.score = G.score; r.newBest = G.score > 0; }
      b.dailyAll = Math.max(b.dailyAll, G.score);
      r.best = b.daily.score;
      if (G.score >= 30000) unlock('daily30');
    }
    if (G.mode === 'zen') { if (G.lines > b.zen) { b.zen = G.lines; r.newBest = G.lines > 0; } r.best = b.zen; if (G.lines >= 100) unlock('zen100'); }
    const lvBefore = playerLevel(save.xp);
    r.xpBefore = save.xp;
    save.xp += G.lines;
    r.xpAfter = save.xp;
    r.levelUp = playerLevel(save.xp) > lvBefore;
    r.unlockedThemes = A.THEMES.filter((t) => t.unlock > lvBefore && t.unlock <= playerLevel(save.xp)).map((t) => t.name);
    save.shards += r.shards;
    const T = save.totals;
    T.runs++; T.lines += G.lines; T.gems += G.gems; T.quads += G.st.quads; T.tspins += G.st.tspins; T.pieces += G.pieces; T.time += G.time; T.shardsEarned += r.shards;
    if (T.gems >= 100) unlock('gems100');
    save.seenTutorial = true;
    r.ach = G.newAch.slice();
    persist();
    return r;
  }

  function unlock(id) {
    if (save.ach[id]) return;
    const a = ACH.find((x) => x.id === id);
    if (!a) return;
    save.ach[id] = Date.now();
    save.shards += a.r;
    if (G) G.newAch.push(a);
    toast('Achievement: ' + a.name, a.desc + ' · +' + a.r + ' shards');
    AU.play('achievement');
    persist();
  }

  // ------------------------------------------------------------------ input
  const KEYMAP = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'soft', Space: 'hard', ArrowUp: 'cw',
    KeyX: 'cw', KeyZ: 'ccw', KeyQ: 'r180', KeyC: 'hold', ShiftLeft: 'hold', ShiftRight: 'hold', KeyV: 'burst',
    // left-handed cluster (all active at once; no overlaps with the standard set)
    KeyA: 'left', KeyD: 'right', KeyS: 'soft', KeyW: 'hard', KeyK: 'cw', KeyJ: 'ccw', KeyL: 'r180', KeyI: 'hold', KeyO: 'burst',
    Numpad4: 'left', Numpad6: 'right', Numpad2: 'soft', Numpad8: 'hard', Numpad5: 'cw', Numpad0: 'hold',
    Escape: 'pause', KeyP: 'pause', F1: 'pause',
  };
  const input = {
    held: { left: false, right: false, soft: false },
    sources: { left: new Set(), right: new Set(), soft: new Set() },
    dir: 0, das: 0, arr: 0,
    mouse: { active: false, col: null, lastMove: 0 },
    lagStart: 0, lagSamples: [],
    reset() {
      for (const k of ['left', 'right', 'soft']) { this.held[k] = false; this.sources[k].clear(); }
      this.dir = 0; this.das = 0; this.arr = 0;
    },
    onSpawn() {
      // DAS stays charged between pieces; an already charged direction shifts immediately
      if (this.dir && this.das >= save.settings.das) this.autoShift(save.settings.arr === 0);
    },
    autoShift(all) {
      if (!G || !G.cur) return;
      if (all) { while (tryMove(this.dir, 0)); } else tryMove(this.dir, 0);
    },
    press(action, src) {
      if (!G) return;
      if (action === 'pause') { togglePause(); return; }
      if (G.state === 'over') return;
      if (action === 'left' || action === 'right' || action === 'soft') {
        const was = this.held[action];
        this.sources[action].add(src);
        this.held[action] = true;
        if (action !== 'soft' && !was) {
          this.dir = action === 'left' ? -1 : 1;
          this.das = 0; this.arr = 0;
          this.mouse.active = false;
          if (G.state === 'play' && G.cur) { if (tryMove(this.dir, 0)) AU.play('move'); G.hint.moved = true; }
        }
        return;
      }
      if (G.state !== 'play' || !G.cur) {
        // buffer Burst/Hold pressed during the line-clear animation instead of dropping them
        if (G.state === 'play' && G.clearing && (action === 'burst' || action === 'hold')) G.buffered = action;
        return;
      }
      switch (action) {
        case 'hard': hardDrop(); break;
        case 'cw': if (tryRotate(1)) AU.play('rotate'); else AU.play('buzz'); break;
        case 'ccw': if (tryRotate(-1)) AU.play('rotate'); else AU.play('buzz'); break;
        case 'r180': if (tryRotate(2)) AU.play('rotate'); else AU.play('buzz'); break;
        case 'hold': doHold(); break;
        case 'burst': burst(); break;
      }
    },
    release(action, src) {
      if (!(action in this.held)) return;
      this.sources[action].delete(src);
      if (this.sources[action].size) return;
      this.held[action] = false;
      if (action === 'soft') return;
      const other = action === 'left' ? 'right' : 'left';
      if (this.held[other]) { this.dir = other === 'left' ? -1 : 1; this.das = 0; this.arr = 0; }
      else this.dir = 0;
    },
    update(dt) {
      if (!this.dir || !G) return;
      this.das += dt * 1000;
      if (G.state !== 'play' || !G.cur) return;
      const D = save.settings.das, R = save.settings.arr;
      if (this.das >= D) {
        if (R === 0) this.autoShift(true);
        else {
          this.arr += dt * 1000;
          let guard = 0;
          while (this.arr >= R && guard++ < 20) { this.arr -= R; tryMove(this.dir, 0); }
        }
      }
    },
  };

  window.addEventListener('keydown', (e) => {
    AU.ensure();
    const action = KEYMAP[e.code];
    if (screen === 'game' && G) {
      if (action) {
        e.preventDefault();
        if (e.repeat) return;
        input.lagStart = e.timeStamp || pnow();
        input.press(action, 'k:' + e.code);
      } else if (e.code === 'Enter' && G.state === 'over' && G.overT > 0.8) { e.preventDefault(); }
      return;
    }
    menuKey(e);
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) input.release(action, 'k:' + e.code);
  });
  function releaseAll() { input.reset(); }
  window.addEventListener('blur', () => { releaseAll(); autoPause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { releaseAll(); autoPause(); } });

  // mouse: hover aims, left click drops, right click / wheel rotate, middle holds, side button bursts
  function boardColAt(px) { return Math.floor((px - L.bx) / L.cs); }
  cv.addEventListener('pointermove', (e) => {
    if (!save.settings.mouse || screen !== 'game' || !G || G.state !== 'play') return;
    const col = boardColAt(e.clientX);
    if (e.clientX < L.bx - L.cs * 1.5 || e.clientX > L.bx + L.bw + L.cs * 1.5) return;
    input.mouse.active = true;
    input.mouse.col = clamp(col, 0, COLS - 1);
    input.mouse.lastMove = pnow();
  });
  cv.addEventListener('pointerdown', (e) => {
    AU.ensure();
    if (screen !== 'game' || !G || G.state !== 'play' || !save.settings.mouse) return;
    input.lagStart = e.timeStamp || pnow();
    if (e.button === 0) { mouseAim(); input.press('hard', 'm'); }
    else if (e.button === 2) input.press('cw', 'm');
    else if (e.button === 1) { e.preventDefault(); input.press('hold', 'm'); }
    else if (e.button === 3 || e.button === 4) { e.preventDefault(); input.press('burst', 'm'); }
  });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  let wheelT = 0;
  cv.addEventListener('wheel', (e) => {
    if (screen !== 'game' || !G || G.state !== 'play' || !save.settings.mouse) return;
    e.preventDefault();
    const t = pnow();
    if (t - wheelT < 90) return;
    wheelT = t;
    input.press(e.deltaY < 0 ? 'cw' : 'ccw', 'w');
  }, { passive: false });
  function mouseAim() {
    const m = input.mouse;
    if (!m.active || m.col == null || !G.cur) return;
    const c = G.cur;
    const xs = SHAPES[c.type].states[c.rot].map((p) => p[0]);
    const mid = Math.floor((Math.min(...xs) + Math.max(...xs)) / 2);
    const target = m.col - mid;
    let guard = 0;
    while (c.x !== target && guard++ < 12) { if (!tryMove(Math.sign(target - c.x), 0)) break; }
  }

  // gamepad (polled)
  const pad = { prev: {}, menuRepeat: 0 };
  const PAD_MAP = { 14: 'left', 15: 'right', 13: 'soft', 12: 'hard', 0: 'cw', 1: 'ccw', 2: 'hold', 4: 'hold', 3: 'burst', 5: 'burst', 9: 'pause', 8: 'pause' };
  function pollPad(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const p of pads) if (p && p.connected) { gp = p; break; }
    if (!gp) return;
    const state = {};
    for (const k in PAD_MAP) state['b' + k] = !!(gp.buttons[k] && gp.buttons[k].pressed);
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    state.sl = ax < -0.5; state.sr = ax > 0.5; state.sd = ay > 0.6;
    if (screen === 'game' && G) {
      for (const k in PAD_MAP) {
        const id = 'b' + k, a = PAD_MAP[k];
        if (state[id] && !pad.prev[id]) { AU.ensure(); input.press(a, 'p' + k); }
        if (!state[id] && pad.prev[id]) input.release(a, 'p' + k);
      }
      [['sl', 'left'], ['sr', 'right'], ['sd', 'soft']].forEach(([id, a]) => {
        if (state[id] && !pad.prev[id]) input.press(a, 'ps' + id);
        if (!state[id] && pad.prev[id]) input.release(a, 'ps' + id);
      });
    } else {
      // menu navigation
      const up = state.b12 || ay < -0.5, down = state.b13 || ay > 0.5, left = state.b14 || state.sl, right = state.b15 || state.sr;
      const any = up || down || left || right;
      pad.menuRepeat -= dt;
      if (any && (pad.menuRepeat <= 0 || !pad.prev.any)) { moveFocus(up || left ? -1 : 1); pad.menuRepeat = pad.prev.any ? 0.12 : 0.35; }
      state.any = any;
      if (state.b0 && !pad.prev.b0) { const f = document.activeElement; if (f && f.click && f !== document.body) f.click(); }
      if (state.b1 && !pad.prev.b1) goBack();
      if (state.b9 && !pad.prev.b9 && screen === 'pause') resume();
    }
    pad.prev = state;
  }

  // ------------------------------------------------------------------ pause
  function togglePause() {
    if (!G || G.state === 'over') return;
    if (screen === 'game') pause(); else if (screen === 'pause') resume();
  }
  function pause() {
    if (!G || G.state === 'over' || screen !== 'game') return;
    G.prevState = G.state;
    G.state = 'paused';
    releaseAll();
    AU.duck(true);
    showScreen('pause');
  }
  function autoPause() { if (screen === 'game' && G && G.state !== 'over') pause(); }
  function resume() {
    if (!G) return;
    G.state = G.prevState || 'play';
    AU.duck(false);
    releaseAll();
    showScreen('game');
  }

  // ------------------------------------------------------------------ update
  function update(dt) {
    updateFx(dt);
    updateDeco(dt);
    if (!G || screen !== 'game') { if (!G || screen === 'title' || screen === 'modes' || screen === 'workshop' || screen === 'collection' || screen === 'help') updateAttract(dt); return; }
    if (G.state === 'paused') return;
    if (G.state === 'over') {
      G.overT += dt;
      if (G.overT > 1.4 && screen === 'game') showScreen('results');
      return;
    }
    input.update(dt);
    if (G.state === 'countdown') {
      G.countdown -= dt;
      const n = Math.ceil(G.countdown / 0.5);
      if (n < G.lastCount && n > 0) { G.lastCount = n; AU.play('count'); }
      if (G.countdown <= 0) { G.state = 'play'; AU.play('go'); addText('GO!', { color: theme().accent, size: 1.4, max: 0.7 }); spawnNext(); }
      return;
    }
    G.time += dt;
    G.hint.t += dt;
    if (G.fever > 0) { G.fever -= dt; if (G.fever <= 0) { G.fever = 0; updateMusic(); } }
    if (G.mode === 'daily' && G.time >= MODES.daily.time) { G.time = MODES.daily.time; return finish(true, "TIME'S UP"); }
    if (G.clearing) {
      G.clearing.t += dt;
      if (G.clearing.t >= G.clearing.dur) {
        const rows = G.clearing.rows;
        G.clearing = null;
        for (const y of rows) { G.board.splice(y, 1); G.board.unshift(new Uint8Array(COLS)); }
        if (G.mode === 'sprint' && G.lines >= MODES.sprint.goal) return finish(true, 'FINISH!');
        if (G.mode === 'marathon' && G.lines >= MODES.marathon.goal) return finish(true, 'PRISM MASTER');
        const buf = G.buffered;
        G.buffered = null;
        if (buf === 'burst') burst();
        spawnNext();
        if (buf === 'hold' && G.cur) doHold();
      }
      return;
    }
    if (!G.cur) return;
    if (input.mouse.active && save.settings.mouse) mouseAim();
    const soft = input.held.soft;
    const g = gravSec();
    if (soft && save.settings.sdf >= 41) { while (tryMove(0, 1)) G.score += 1; }
    else {
      const interval = soft ? Math.min(g, 1) / save.settings.sdf : g;
      G.gravAcc += dt;
      let guard = 0;
      while (G.gravAcc >= interval && guard++ < 40) {
        G.gravAcc -= interval;
        if (tryMove(0, 1)) { if (soft) G.score += 1; }
        else { G.gravAcc = 0; break; }
      }
    }
    if (!G.cur) return;
    if (grounded()) {
      G.lockTimer += dt;
      if (G.lockTimer >= G.lockDelay) lock();
    } else G.lockTimer = 0;
    // danger pulse
    let top = ROWS;
    for (let y = 0; y < ROWS; y++) if (G.board[y].some((v) => v)) { top = y; break; }
    G.danger = top < HIDDEN + 5;
    if (G.danger) { G.dangerT += dt; if (G.dangerT > 0.9) { G.dangerT = 0; AU.play('danger'); } }
    // invariant check used by the playtest harness
    if (G.cur && collides(G.cur.type, G.cur.rot, G.cur.x, G.cur.y)) { DEBUG.violations++; }
  }

  function updateFx(dt) {
    fx.shake = Math.max(0, fx.shake - dt * 40);
    fx.flash = Math.max(0, fx.flash - dt * 2.5);
    for (const p of fx.parts) {
      p.life += dt;
      if (p.gem) {
        // fly up, then home into the gem counter
        if (p.life < 0.35) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 10 * dt; }
        else {
          const tx = (L.gemTarget.x - L.bx) / L.cs, ty = (L.gemTarget.y - L.by) / L.cs + HIDDEN;
          const k = Math.min(1, dt * 9);
          p.x += (tx - p.x) * k; p.y += (ty - p.y) * k;
          if (!p.done && Math.abs(tx - p.x) < 0.3 && Math.abs(ty - p.y) < 0.3) { p.done = true; p.life = p.max; AU.play('gem', p.idx); if (G) G.gemPulse = 0.4; }
        }
        if (p.life > 2) p.life = p.max = 0;
      } else {
        p.vy += (p.g || 0) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
    }
    fx.parts = fx.parts.filter((p) => p.gem ? !p.done && p.life <= 2 : p.life < p.max);
    for (const t of fx.texts) t.t += dt;
    fx.texts = fx.texts.filter((t) => t.t < t.max);
    for (const t of fx.trails) t.t += dt;
    fx.trails = fx.trails.filter((t) => t.t < 0.25);
    for (const t of fx.lockCells) t.t += dt;
    fx.lockCells = fx.lockCells.filter((t) => t.t < 0.2);
    if (G && G.gemPulse) G.gemPulse = Math.max(0, G.gemPulse - dt);
  }

  function initDeco() {
    deco.length = 0;
    for (let i = 0; i < 16; i++) deco.push({ x: Math.random(), y: Math.random(), s: 20 + Math.random() * 70, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, vy: 0.004 + Math.random() * 0.01, k: i % 7, tri: i % 3 === 0 });
    attract.length = 0;
    for (let i = 0; i < 9; i++) attract.push(newAttract(true));
  }
  function newAttract(anyY) {
    return { t: TYPES[Math.floor(Math.random() * 7)], x: Math.random(), y: anyY ? Math.random() * 1.2 - 0.2 : -0.15, rot: Math.floor(Math.random() * 4), s: 0.5 + Math.random() * 0.9, v: 0.02 + Math.random() * 0.03, rt: 1 + Math.random() * 3 };
  }
  function updateDeco(dt) {
    for (const d of deco) { d.y -= d.vy * dt * (G && G.fever > 0 ? 4 : 1); d.r += d.vr * dt; if (d.y < -0.15) { d.y = 1.15; d.x = Math.random(); } }
  }
  function updateAttract(dt) {
    for (let i = 0; i < attract.length; i++) {
      const a = attract[i];
      a.y += a.v * dt;
      a.rt -= dt;
      if (a.rt <= 0) { a.rot = (a.rot + 1) % 4; a.rt = 1.5 + Math.random() * 3; }
      if (a.y > 1.2) attract[i] = newAttract(false);
    }
  }

  // ------------------------------------------------------------------ render
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (bgCache) ctx.drawImage(bgCache, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const th = theme();
    const fever = G && G.fever > 0 && screen === 'game';
    // floating shapes
    for (const d of deco) {
      ctx.save();
      ctx.translate(d.x * W, d.y * H);
      ctx.rotate(d.r);
      ctx.globalAlpha = fever ? 0.22 : 0.1;
      ctx.fillStyle = fever ? 'hsl(' + ((pnow() / 8 + d.k * 50) % 360) + ',80%,70%)' : th.colors[TYPES[d.k]];
      if (d.tri) { ctx.beginPath(); ctx.moveTo(0, -d.s / 2); ctx.lineTo(d.s / 2, d.s / 2); ctx.lineTo(-d.s / 2, d.s / 2); ctx.closePath(); ctx.fill(); }
      else { A.roundRect(ctx, -d.s / 2, -d.s / 2, d.s, d.s, d.s * 0.2); ctx.fill(); }
      ctx.restore();
    }
    if (fever) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      const off = (pnow() / 6) % (W + H);
      const g = ctx.createLinearGradient(off - H, 0, off, H);
      ['#ff9aa8', '#ffe07a', '#8fe6a8', '#7fd6f0', '#c9a4ff', '#ff9aa8'].forEach((c, i) => g.addColorStop(i / 5, c));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (G && (screen === 'game' || screen === 'results' || G.state === 'paused')) drawGame();
    else drawAttract();
  }

  function drawAttract() {
    const s0 = Math.max(18, Math.min(W, H) / 22);
    for (const a of attract) {
      const s = s0 * a.s;
      ctx.globalAlpha = 0.5;
      for (const [cx, cy] of SHAPES[a.t].states[a.rot]) ctx.drawImage(tiles[a.t], a.x * W + cx * s, a.y * H + cy * s, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function cellXY(x, y) { return [L.bx + x * L.cs, L.by + (y - HIDDEN) * L.cs]; }

  function drawGame() {
    const cs = L.cs, th = theme();
    const sk = save.settings.shake ? fx.shake : 0;
    const sx = (Math.random() - 0.5) * sk, sy = (Math.random() - 0.5) * sk;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.drawImage(chromeCache, 0, 0, W, H);
    // danger tint
    if (G.danger && G.state === 'play') {
      ctx.save();
      const a = 0.08 + 0.06 * Math.sin(pnow() / 160);
      const g = ctx.createLinearGradient(0, L.by, 0, L.by + cs * 6);
      g.addColorStop(0, 'rgba(241,117,117,' + a * 2 + ')');
      g.addColorStop(1, 'rgba(241,117,117,0)');
      ctx.fillStyle = g;
      ctx.fillRect(L.bx, L.by, L.bw, cs * 6);
      ctx.restore();
    }
    // board
    const over = G.state === 'over';
    const greyRows = over ? Math.floor(Math.min(1, G.overT / 1.0) * ROWS) : 0;
    const clearing = G.clearing;
    const tw = pnow() / 1000;
    for (let y = HIDDEN; y < ROWS; y++) {
      const isClr = clearing && clearing.rows.includes(y);
      for (let x = 0; x < COLS; x++) {
        const v = G.board[y][x];
        if (!v) continue;
        const [px, py] = cellXY(x, y);
        const tile = over && y >= ROWS - greyRows ? tiles.grey : tiles[TYPES[(v & 15) - 1]];
        if (isClr) {
          const p = clearing.t / clearing.dur;
          const sc = 1 - p * p;
          const d = cs * (1 - sc) / 2;
          ctx.drawImage(tile, px + d, py + d, cs * sc, cs * sc);
          ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * (1 - p)) + ')';
          ctx.fillRect(px, py, cs, cs);
        } else {
          ctx.drawImage(tile, px, py, cs, cs);
          if (v & 16) {
            ctx.drawImage(tiles.gem, px, py, cs, cs);
            const tw2 = Math.sin(tw * 3 + x * 1.7 + y * 2.3);
            if (tw2 > 0.92) drawSparkle(px + cs * 0.7, py + cs * 0.28, cs * 0.18 * (tw2 - 0.9) * 12);
          }
        }
      }
    }
    // hard drop trails
    for (const t of fx.trails) {
      const a = 0.35 * (1 - t.t / 0.25);
      ctx.fillStyle = A.rgba(t.color, a);
      const cols = {};
      for (const [x, y] of t.cells) cols[x] = Math.min(cols[x] == null ? 99 : cols[x], y);
      for (const x in cols) {
        const [px, py] = cellXY(+x, Math.max(HIDDEN, cols[x]));
        ctx.fillRect(px + cs * 0.2, py, cs * 0.6, t.d * cs);
      }
    }
    // ghost + active piece
    const c = G.cur;
    if (c && G.state !== 'over') {
      if (save.settings.ghost) {
        const gy = ghostY();
        if (gy !== c.y) for (const [x, y] of cellsOf(c.type, c.rot, c.x, gy)) if (y >= HIDDEN) { const [px, py] = cellXY(x, y); ctx.drawImage(tiles.ghost[c.type], px, py, cs, cs); }
      }
      const lockP = grounded() ? G.lockTimer / G.lockDelay : 0;
      SHAPES[c.type].states[c.rot].forEach(([cx, cy], i) => {
        const x = c.x + cx, y = c.y + cy;
        const [px, py] = cellXY(x, y);
        ctx.globalAlpha = y < HIDDEN ? 0.55 : 1;
        ctx.drawImage(tiles[c.type], px, py, cs, cs);
        if (i === c.gem) ctx.drawImage(tiles.gem, px, py, cs, cs);
        if (lockP > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (lockP * 0.35) + ')'; ctx.fillRect(px + 2, py + 2, cs - 4, cs - 4); }
      });
      ctx.globalAlpha = 1;
    }
    for (const lc of fx.lockCells) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * (1 - lc.t / 0.2)) + ')';
      for (const [x, y] of lc.cells) if (y >= HIDDEN) { const [px, py] = cellXY(x, y); A.roundRect(ctx, px + 2, py + 2, cs - 4, cs - 4, cs * 0.18); ctx.fill(); }
    }
    if (fx.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + fx.flash * 0.5 + ')'; ctx.fillRect(L.bx, L.by, L.bw, L.bh); }
    // prism meter
    drawMeter();
    // hold + next
    drawPreviewBox();
    drawStats();
    // particles
    for (const p of fx.parts) {
      const px = L.bx + p.x * cs, py = L.by + (p.y - HIDDEN) * cs;
      if (p.gem) { ctx.drawImage(tiles.gem, px - cs * 0.45, py - cs * 0.45, cs * 0.9, cs * 0.9); continue; }
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.hue != null ? 'hsl(' + p.hue + ',85%,65%)' : p.color;
      const s = p.size * cs;
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    // floating texts
    for (const t of fx.texts) {
      const p = t.t / t.max;
      const pop = p < 0.12 ? 0.6 + (p / 0.12) * 0.5 : p < 0.2 ? 1.1 - (p - 0.12) / 0.08 * 0.1 : 1;
      const a = p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1;
      const size = Math.round(cs * 0.95 * t.size * pop);
      const y = L.by + t.y * cs - p * cs * 0.8;
      ctx.globalAlpha = a;
      ctx.font = '900 ' + size + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(3, size * 0.18);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineJoin = 'round';
      ctx.strokeText(t.text, L.bx + L.bw / 2, y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, L.bx + L.bw / 2, y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    // countdown
    if (G.state === 'countdown') {
      const n = Math.max(1, Math.ceil(G.countdown / 0.5));
      bigCenter(n === 3 ? 'READY' : n === 2 ? 'SET' : '…', th.accent);
    }
    if (over) bigCenter(G.overLabel, G.won ? '#2e9e6a' : '#d9534f', Math.min(1, G.overT * 3));
    ctx.restore();
    if (G.tutorial && G.state === 'play') drawHints();
  }

  function bigCenter(text, color, alpha) {
    const cs = L.cs;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.font = '900 ' + Math.round(cs * 1.3) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = cs * 0.25;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#fff';
    ctx.strokeText(text, L.bx + L.bw / 2, L.by + L.bh * 0.42);
    ctx.fillStyle = color;
    ctx.fillText(text, L.bx + L.bw / 2, L.by + L.bh * 0.42);
    ctx.restore();
  }
  function drawSparkle(x, y, r) {
    if (r <= 0) return;
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.25, y - r * 0.25); ctx.lineTo(x + r, y); ctx.lineTo(x + r * 0.25, y + r * 0.25);
    ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.25, y + r * 0.25); ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.25, y - r * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawMeter() {
    const h = L.bh * (G.prism / 100);
    const x = L.mx, w = L.mw, yb = L.by + L.bh;
    if (h > 0) {
      const g = ctx.createLinearGradient(0, yb, 0, L.by);
      ['#7fd6f0', '#93a8ff', '#c9a4ff', '#ff9aa8', '#ffbf85', '#ffe07a'].forEach((c, i) => g.addColorStop(i / 5, c));
      ctx.save();
      if (G.prism >= 100) { ctx.shadowColor = 'hsl(' + ((pnow() / 5) % 360) + ',90%,65%)'; ctx.shadowBlur = 12 + 6 * Math.sin(pnow() / 120); }
      A.roundRect(ctx, x, yb - h, w, h, w / 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
    }
    if (G.prism >= 100) {
      const cs = L.cs;
      ctx.font = '800 ' + Math.round(cs * 0.4) + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#7a6cf0';
      ctx.fillText('V', x + w / 2, L.by - cs * 0.3);
      ctx.textAlign = 'left';
    }
  }

  function drawMini(type, gem, cx, cy, s, alpha) {
    const st = SHAPES[type].states[0];
    const xs = st.map((p) => p[0]), ys = st.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs) + 1, h = Math.max(...ys) - Math.min(...ys) + 1;
    const ox = cx - (w * s) / 2 - Math.min(...xs) * s, oy = cy - (h * s) / 2 - Math.min(...ys) * s;
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    st.forEach(([x, y], i) => {
      ctx.drawImage(tiles[type], ox + x * s, oy + y * s, s, s);
      if (i === gem) ctx.drawImage(tiles.gem, ox + x * s, oy + y * s, s, s);
    });
    ctx.globalAlpha = 1;
  }

  function drawPreviewBox() {
    const cs = L.cs;
    if (G.hold) drawMini(G.hold.type, G.hold.gem, L.holdBox.x + L.holdBox.w / 2, L.holdBox.y + cs * 2.15, cs * 0.8, G.holdUsed ? 0.35 : 1);
    for (let i = 0; i < 5; i++) {
      const q = G.queue[i];
      if (!q) continue;
      const s = i === 0 ? cs * 0.85 : cs * 0.62;
      const cy = i === 0 ? L.nextBox.y + cs * 2.3 : L.nextBox.y + cs * 4.4 + (i - 1) * cs * 2.05;
      drawMini(q.type, q.gem, L.nextBox.x + L.nextBox.w / 2, cy, s);
    }
  }

  function fmtTime(t) {
    const m = Math.floor(t / 60), s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
  }
  function fmtNum(n) { return Math.round(n).toLocaleString('en-US'); }

  function drawStats() {
    const cs = L.cs, th = theme();
    const b = L.statBox;
    let y = b.y + cs * 0.45;
    const x = b.x + cs * 0.4;
    const label = (t) => { ctx.font = '700 ' + Math.round(cs * 0.36) + 'px ' + FONT; ctx.fillStyle = A.rgba(th.ink, 0.5); ctx.textBaseline = 'top'; ctx.fillText(t, x, y); y += cs * 0.48; };
    const value = (t, big) => { ctx.font = '800 ' + Math.round(cs * (big ? 0.8 : 0.62)) + 'px ' + FONT; ctx.fillStyle = th.ink; ctx.fillText(t, x, y); y += cs * (big ? 1.1 : 0.95); };
    label('SCORE'); value(fmtNum(G.score), true);
    if (G.mode === 'sprint') { label('LINES LEFT'); value(String(Math.max(0, MODES.sprint.goal - G.lines)), true); }
    else { label('LEVEL'); value(String(G.level)); }
    label('LINES'); value(String(G.lines));
    if (G.mode === 'daily') { label('TIME LEFT'); value(fmtTime(Math.max(0, MODES.daily.time - G.time))); }
    else { label('TIME'); value(fmtTime(G.time)); }
    const bestTxt = G.mode === 'sprint' ? (save.best.sprint ? fmtTime(save.best.sprint) : '—') : G.mode === 'zen' ? save.best.zen + ' lines' : fmtNum(G.mode === 'daily' ? (save.best.daily.date === todayStr() ? save.best.daily.score : 0) : save.best.marathon);
    if (y < L.gemTarget.y - cs * 2.2) { label('BEST'); ctx.font = '700 ' + Math.round(cs * 0.5) + 'px ' + FONT; ctx.fillStyle = A.rgba(th.ink, 0.7); ctx.fillText(bestTxt, x, y); y += cs * 0.9; }
    // gems
    const gy = L.gemTarget.y;
    const pulse = G.gemPulse ? 1 + G.gemPulse : 1;
    const gs = cs * 0.9 * pulse;
    ctx.drawImage(tiles.gem, L.gemTarget.x - cs * 1.6 - gs / 2, gy - gs / 2, gs, gs);
    ctx.font = '800 ' + Math.round(cs * 0.62) + 'px ' + FONT;
    ctx.fillStyle = th.ink;
    ctx.textBaseline = 'middle';
    ctx.fillText(String(G.gems), L.gemTarget.x - cs * 0.9, gy);
    ctx.textBaseline = 'top';
    // info box: mode, fever, combo
    const ib = L.infoBox;
    let iy = ib.y + cs * 0.4;
    ctx.font = '800 ' + Math.round(cs * 0.42) + 'px ' + FONT;
    ctx.fillStyle = A.rgba(th.ink, 0.6);
    ctx.fillText(MODES[G.mode].name.toUpperCase(), ib.x + cs * 0.4, iy);
    iy += cs * 0.75;
    ctx.font = '700 ' + Math.round(cs * 0.36) + 'px ' + FONT;
    if (G.fever > 0) {
      ctx.fillStyle = '#e0569a';
      ctx.fillText('FEVER x2  ' + G.fever.toFixed(1) + 's', ib.x + cs * 0.4, iy);
      iy += cs * 0.5;
      const w = (ib.w - cs * 0.8) * (G.fever / G.feverDur);
      A.roundRect(ctx, ib.x + cs * 0.4, iy, Math.max(4, w), cs * 0.22, cs * 0.11);
      ctx.fillStyle = 'hsl(' + ((pnow() / 6) % 360) + ',80%,68%)';
      ctx.fill();
      iy += cs * 0.5;
    } else {
      ctx.fillStyle = A.rgba(th.ink, 0.5);
      ctx.fillText('PRISM ' + Math.floor(G.prism) + '%', ib.x + cs * 0.4, iy);
      iy += cs * 0.55;
    }
    if (G.combo > 0) { ctx.fillStyle = '#2f9a96'; ctx.fillText('COMBO ' + G.combo, ib.x + cs * 0.4, iy); iy += cs * 0.5; }
    if (G.b2b) { ctx.fillStyle = '#f08a00'; ctx.fillText('B2B READY', ib.x + cs * 0.4, iy); }
    // key legend at the bottom of the info panel
    if (ib.h > cs * 4.2) {
      ctx.font = '600 ' + Math.round(cs * 0.33) + 'px ' + FONT;
      ctx.fillStyle = A.rgba(th.ink, 0.42);
      const lines = ['V / O   Prism Burst', 'C / I   Hold', 'Esc     Pause'];
      lines.forEach((t, i) => ctx.fillText(t, ib.x + cs * 0.4, ib.y + ib.h - cs * (0.5 + (lines.length - i) * 0.5)));
    }
  }

  function drawHints() {
    const h = G.hint, cs = L.cs;
    let msg = null;
    if (!h.moved && h.t < 14) msg = '← → move   ↑ rotate   Space drop\nor mouse: hover to aim, click to drop';
    else if (!h.dropped && h.t < 18) msg = 'Space: hard drop\n↓: soft drop';
    else if (!h.held && G.pieces >= 4 && h.t < 40) msg = 'C or Shift: hold a piece\nfor later';
    else if (G.prism >= 100 && !h.burst) msg = 'Prism is full! Press V for\nPRISM BURST + Fever x2';
    else if (G.gems > 0 && h.t < 70 && !h.gemInfo) { msg = 'Gems you clear become\nshards for the Workshop'; if (h.t > 60) h.gemInfo = true; }
    if (!msg) return;
    // a pill that wraps to the width of the well so it never covers the side panels
    const lines = msg.split('\n');
    ctx.save();
    let fs = clamp(cs * 0.48, 11, 17);
    ctx.font = '700 ' + Math.round(fs) + 'px ' + FONT;
    const widest = Math.max(...lines.map((t) => ctx.measureText(t).width));
    const maxW = L.bw - 10;
    if (widest + 24 > maxW) { fs = Math.max(9, fs * (maxW - 24) / widest); ctx.font = '700 ' + Math.round(fs) + 'px ' + FONT; }
    const w = Math.min(maxW, Math.max(...lines.map((t) => ctx.measureText(t).width)) + 24);
    const lh = fs * 1.35, ph = lines.length * lh + 12;
    const x = L.bx + L.bw / 2 - w / 2;
    const y = H - (L.by + L.bh) >= ph + 12 ? L.by + L.bh + 8 : L.by + cs * 3.2;
    ctx.shadowColor = 'rgba(60,70,120,0.18)';
    ctx.shadowBlur = 12;
    A.roundRect(ctx, x, y, w, ph, Math.min(16, ph / 2));
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = theme().accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = theme().ink;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    lines.forEach((t, i) => ctx.fillText(t, L.bx + L.bw / 2, y + 6 + lh * (i + 0.5)));
    ctx.restore();
  }

  // ------------------------------------------------------------------ UI (DOM)
  const ui = $('#ui');
  let settingsFrom = 'title';
  const GEM_SVG = '<svg class="gemicon" viewBox="0 0 20 20"><defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#bdf1ff"/><stop offset="1" stop-color="#5aa8ff"/></linearGradient></defs><path d="M10 2 17 8 10 18 3 8Z" fill="url(#gg)" stroke="#4a8fe0" stroke-width="1.2" stroke-linejoin="round"/></svg>';

  function toast(title, body) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<b></b><span></span>';
    t.querySelector('b').textContent = title;
    t.querySelector('span').textContent = body;
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, 3200);
  }

  function showScreen(id) {
    screen = id;
    ui.innerHTML = '';
    const builder = SCREENS[id];
    if (builder) {
      const el = document.createElement('section');
      el.className = 'screen';
      el.dataset.screen = id;
      builder(el);
      ui.appendChild(el);
      const f = el.querySelector('[autofocus]') || el.querySelector('.btn.primary') || el.querySelector('button, .card, input');
      if (f) f.focus({ preventScroll: true });
    }
    if (id === 'title' || id === 'modes' || id === 'workshop' || id === 'collection' || id === 'results' || (id === 'help' && !(G && G.state === 'paused'))) AU.setMusic('menu');
    ui._armedAt = pnow() + (id === 'results' ? 700 : 120);
    if (id === 'game' && document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function playerBar() {
    const lp = levelProgress(save.xp);
    return '<div class="player"><span class="pill">Lv ' + lp.level + '</span><span class="xpbar" title="' + lp.cur + '/' + lp.need + ' lines"><i style="width:' + Math.round(lp.frac * 100) + '%"></i></span><span class="pill">' + GEM_SVG + ' ' + save.shards + ' shards</span></div>';
  }
  function nextUnlockText() {
    const lv = playerLevel(save.xp);
    const t = A.THEMES.find((x) => x.unlock > lv);
    if (!t) return 'All themes unlocked.';
    const need = LEVEL_XP[t.unlock - 1] - save.xp;
    return 'Next unlock: <b>' + t.name + '</b> theme in ' + need + ' more lines';
  }

  const SCREENS = {
    title(el) {
      el.classList.add('narrow');
      const td = save.best.daily.date === todayStr() ? save.best.daily.score : 0;
      el.innerHTML = '<h1 class="logo">PRISMFALL</h1><p class="tag">Stack · Shatter · Shine</p>' + playerBar() +
        '<div class="menu">' +
        '<button class="btn primary big" data-act="play:marathon" autofocus>Play Marathon</button>' +
        '<div class="row"><button class="btn" data-act="play:daily">Daily Bloom</button><button class="btn" data-act="modes">All Modes</button></div>' +
        '<div class="row"><button class="btn" data-act="workshop">Workshop</button><button class="btn" data-act="collection">Collection</button></div>' +
        '<div class="row"><button class="btn" data-act="settings">Settings</button><button class="btn" data-act="help">How to Play</button></div>' +
        '</div><div class="foot">Today\'s Daily best: <b>' + fmtNum(td) + '</b> · Marathon best: <b>' + fmtNum(save.best.marathon) + '</b><br>' + nextUnlockText() +
        (storageOk ? '' : '<br><span style="color:#d9534f">Local storage is blocked: progress will not be saved.</span>') + '</div>';
    },
    modes(el) {
      const b = save.best;
      const sl = save.settings.startLevel;
      const td = b.daily.date === todayStr() ? b.daily.score : 0;
      const card = (id, best) => '<div class="card" tabindex="0" role="button" data-act="play:' + id + '"><b>' + MODES[id].name + '</b><small>' + MODES[id].desc + '</small><div class="best">' + best + '</div>' +
        (id === 'marathon' ? '<div class="seg" data-stop>' + [1, 5, 10].map((v) => '<button data-act="sl:' + v + '" class="' + (sl === v ? 'on' : '') + '">Start Lv ' + v + '</button>').join('') + '</div>' : '') + '</div>';
      el.innerHTML = '<h2>Choose a mode</h2><p class="sub">Perks from the Workshop apply in every mode.</p><div class="cards">' +
        card('marathon', 'Best ' + fmtNum(b.marathon)) +
        card('sprint', b.sprint ? 'Best ' + fmtTime(b.sprint) : 'No time yet') +
        card('daily', 'Today ' + fmtNum(td) + ' · All-time ' + fmtNum(b.dailyAll)) +
        card('zen', 'Most lines ' + b.zen) +
        '</div><div class="row" style="margin-top:16px"><button class="btn" data-act="back">Back</button></div>';
    },
    pause(el) {
      el.classList.add('narrow', 'dim-backdrop');
      el.innerHTML = '<h2 class="center">Paused</h2><p class="sub center">' + MODES[G.mode].name + ' · ' + fmtNum(G.score) + ' pts</p><div class="menu">' +
        '<button class="btn primary big" data-act="resume" autofocus>Resume</button>' +
        '<button class="btn" data-act="restart">Restart</button>' +
        '<button class="btn" data-act="settings">Settings</button>' +
        '<button class="btn" data-act="help">Controls</button>' +
        '<button class="btn danger" data-act="quit">Quit to menu</button></div><p class="foot">Esc / P to resume</p>';
    },
    results(el) {
      el.classList.add('narrow', 'dim-backdrop');
      const r = G.result;
      const lp = levelProgress(r.xpAfter);
      const head = r.won ? (r.mode === 'sprint' ? 'Sprint complete' : r.mode === 'daily' ? "Time's up!" : 'Victory!') : r.mode === 'zen' ? 'Session over' : 'Game over';
      const main = r.mode === 'sprint' && r.won ? fmtTime(r.time) : fmtNum(r.score);
      let bestTxt = '';
      if (r.mode === 'sprint') bestTxt = r.best ? 'Best ' + fmtTime(r.best) : 'Finish 40 lines to set a time';
      else if (r.mode === 'zen') bestTxt = 'Most lines ' + r.best;
      else bestTxt = (r.mode === 'daily' ? "Today's best " : 'Best ') + fmtNum(r.best);
      el.innerHTML = '<h2 class="center">' + head + '</h2>' +
        '<div class="big-score">' + main + '</div><p class="center" style="margin:4px 0 0">' + (r.newBest ? '<span class="badge">NEW BEST</span> ' : '') + '<span class="sub">' + bestTxt + '</span></p>' +
        '<div class="stats"><div class="stat"><small>Lines</small><b>' + r.lines + '</b></div><div class="stat"><small>Level</small><b>' + r.level + '</b></div><div class="stat"><small>Time</small><b>' + fmtTime(r.time) + '</b></div><div class="stat"><small>Pieces</small><b>' + r.pieces + '</b></div></div>' +
        '<div class="earn"><span class="pill">' + GEM_SVG + ' ' + r.gems + ' gems</span><span class="pill">+' + r.bonus + ' score bonus</span><span class="pill">= +' + r.shards + ' shards</span></div>' +
        '<div class="player"><span class="pill">Lv ' + lp.level + (r.levelUp ? ' ▲' : '') + '</span><span class="xpbar"><i style="width:' + Math.round(lp.frac * 100) + '%"></i></span><small class="sub" style="margin:0">+' + r.lines + ' XP</small></div>' +
        (r.unlockedThemes.length ? '<p class="center"><span class="badge">Theme unlocked: ' + r.unlockedThemes.join(', ') + '</span></p>' : '') +
        (r.ach.length ? '<p class="center sub">Achievements: ' + r.ach.map((a) => '<b>' + a.name + '</b>').join(', ') + '</p>' : '') +
        '<div class="menu" style="margin-top:12px"><button class="btn primary big" data-act="retry" autofocus>Play again</button><div class="row"><button class="btn" data-act="workshop">Workshop (' + save.shards + ')</button><button class="btn" data-act="menu">Menu</button></div></div>' +
        '<p class="foot">Enter = play again · Esc = menu</p>';
    },
    workshop(el) {
      let html = '<h2>Workshop</h2><p class="sub">Spend gem shards on permanent perks. You have <b>' + GEM_SVG + ' ' + save.shards + '</b> shards.</p>';
      for (const p of PERKS) {
        const lv = save.perks[p.id];
        const maxed = lv >= p.max;
        const cost = maxed ? 0 : p.cost[lv];
        html += '<div class="perk"><div><b>' + p.name + '</b><div class="sub" style="margin:2px 0 0">' + p.desc(maxed ? lv : lv + 1) + '</div><div class="pips">' + Array.from({ length: p.max }, (_, i) => '<i class="' + (i < lv ? 'on' : '') + '"></i>').join('') + '</div></div>' +
          '<button class="btn small ' + (maxed ? '' : 'primary') + '" data-act="buy:' + p.id + '" ' + (maxed || save.shards < cost ? 'disabled' : '') + '>' + (maxed ? 'Maxed' : 'Upgrade · ' + cost) + '</button></div>';
      }
      html += '<div class="row" style="margin-top:16px"><button class="btn" data-act="back">Back</button></div>';
      el.innerHTML = html;
    },
    collection(el) {
      const tab = SCREENS._tab || 'themes';
      const lv = playerLevel(save.xp);
      let html = '<h2>Collection</h2>' + playerBar() + '<div class="tabs"><button class="btn small ' + (tab === 'themes' ? 'on' : '') + '" data-act="tab:themes">Themes</button><button class="btn small ' + (tab === 'ach' ? 'on' : '') + '" data-act="tab:ach">Achievements (' + Object.keys(save.ach).length + '/' + ACH.length + ')</button><button class="btn small ' + (tab === 'stats' ? 'on' : '') + '" data-act="tab:stats">Stats</button></div>';
      if (tab === 'themes') {
        html += '<div class="cards">';
        for (const t of A.THEMES) {
          const locked = t.unlock > lv;
          html += '<div class="card ' + (locked ? 'locked' : '') + (save.theme === t.id ? ' selected' : '') + '" tabindex="0" role="button" ' + (locked ? '' : 'data-act="theme:' + t.id + '"') + '><b>' + t.name + '</b><div class="swatch">' + swatches(t.id) + '</div><small>' + (locked ? 'Unlocks at Lv ' + t.unlock : save.theme === t.id ? 'Equipped' : 'Click to equip') + '</small></div>';
        }
        html += '</div>';
      } else if (tab === 'ach') {
        html += '<div class="ach-list">' + ACH.map((a) => '<div class="ach ' + (save.ach[a.id] ? 'done' : '') + '"><div><b>' + (save.ach[a.id] ? '✓ ' : '') + a.name + '</b><small>' + a.desc + '</small></div><span class="pill">+' + a.r + '</span></div>').join('') + '</div>';
      } else {
        const T = save.totals;
        html += '<div class="stats">' + [['Runs', T.runs], ['Lines', T.lines], ['Pieces', T.pieces], ['Quads', T.quads], ['T-spins', T.tspins], ['Gems', T.gems], ['Shards earned', T.shardsEarned], ['Play time', Math.round(T.time / 60) + ' min']].map(([k, v]) => '<div class="stat"><small>' + k + '</small><b>' + v + '</b></div>').join('') + '</div>';
      }
      html += '<div class="row" style="margin-top:16px"><button class="btn" data-act="back">Back</button></div>';
      el.innerHTML = html;
    },
    settings(el) {
      const s = save.settings;
      const rng = (id, label, help, min, max, step, val, fmt) => '<div class="setting"><label for="s-' + id + '">' + label + '<small>' + help + '</small></label><input type="range" id="s-' + id + '" data-set="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"><output id="o-' + id + '">' + fmt(val) + '</output></div>';
      const chk = (id, label, help) => '<div class="setting"><label for="s-' + id + '">' + label + '<small>' + help + '</small></label><span></span><input type="checkbox" id="s-' + id + '" data-set="' + id + '" ' + (s[id] ? 'checked' : '') + '></div>';
      el.innerHTML = '<h2>Settings</h2><p class="sub">Changes apply instantly and are saved.</p>' +
        rng('music', 'Music volume', 'Synthesized soundtrack', 0, 1, 0.05, s.music, (v) => Math.round(v * 100) + '%') +
        rng('sfx', 'Effects volume', 'Clicks, clears, bursts', 0, 1, 0.05, s.sfx, (v) => Math.round(v * 100) + '%') +
        rng('das', 'DAS', 'Delay before a held key auto-repeats', 50, 300, 5, s.das, (v) => v + 'ms') +
        rng('arr', 'ARR', 'Auto-repeat speed (0 = instant)', 0, 100, 5, s.arr, (v) => v + 'ms') +
        rng('sdf', 'Soft drop speed', 'Multiplier while holding down', 5, 41, 1, s.sdf, (v) => (+v >= 41 ? '∞' : v + 'x')) +
        chk('ghost', 'Ghost piece', 'Shows where the piece will land') +
        chk('shake', 'Screen shake', 'Impact feedback on drops and clears') +
        chk('mouse', 'Mouse controls', 'Aim with the pointer, click to drop') +
        '<div class="row" style="margin-top:16px"><button class="btn primary" data-act="back" autofocus>Done</button><button class="btn danger" data-act="reset">Reset all progress</button></div>';
    },
    help(el) {
      el.innerHTML = '<h2>How to play</h2><p class="sub">Fill a horizontal row to clear it. Pieces fall faster as you level up. Stack past the top and the run ends.</p>' +
        '<table class="keys"><tr><th>Action</th><th>Keyboard</th><th>Left-handed</th><th>Mouse / Pad</th></tr>' +
        '<tr><td>Move</td><td><kbd>←</kbd> <kbd>→</kbd></td><td><kbd>A</kbd> <kbd>D</kbd></td><td>Hover column · D-pad / stick</td></tr>' +
        '<tr><td>Soft drop</td><td><kbd>↓</kbd></td><td><kbd>S</kbd></td><td>D-pad down</td></tr>' +
        '<tr><td>Hard drop</td><td><kbd>Space</kbd></td><td><kbd>W</kbd></td><td>Left click · D-pad up</td></tr>' +
        '<tr><td>Rotate ↻</td><td><kbd>↑</kbd> <kbd>X</kbd></td><td><kbd>K</kbd></td><td>Right click / wheel · A</td></tr>' +
        '<tr><td>Rotate ↺</td><td><kbd>Z</kbd></td><td><kbd>J</kbd></td><td>Wheel down · B</td></tr>' +
        '<tr><td>Rotate 180°</td><td><kbd>Q</kbd></td><td><kbd>L</kbd></td><td>—</td></tr>' +
        '<tr><td>Hold</td><td><kbd>C</kbd> <kbd>Shift</kbd></td><td><kbd>I</kbd></td><td>Middle click · X / LB</td></tr>' +
        '<tr><td>Prism Burst</td><td><kbd>V</kbd></td><td><kbd>O</kbd></td><td>Side button · Y / RB</td></tr>' +
        '<tr><td>Pause</td><td><kbd>Esc</kbd> <kbd>P</kbd></td><td><kbd>P</kbd></td><td>Start</td></tr></table>' +
        '<h3>What makes Prismfall different</h3><p><b>Gems.</b> Some pieces carry a sparkling gem. Clear its row and it flies into your pocket. Gems become <b>shards</b> for the Workshop.</p>' +
        '<p><b>Prism meter.</b> Every clear charges the rainbow bar beside the well. Quads, T-spins and combos charge it fastest. When it glows, press <kbd>V</kbd> for a <b>Prism Burst</b>. It blasts away the bottom 4 rows and starts <b>Fever</b>, which doubles your score for 8 seconds.</p>' +
        '<p><b>Big moves.</b> A quad clears 4 lines at once. A T-spin twists a T into a tight slot. Repeat quads or T-spins for a back-to-back bonus. Clear on consecutive pieces to build a combo, and listen to the music grow with it.</p>' +
        '<p><b>Progress.</b> Every cleared line is XP. Level up to unlock new colour themes, and chase 15 achievements.</p>' +
        '<div class="row" style="margin-top:16px"><button class="btn primary" data-act="back" autofocus>Got it</button></div>';
    },
  };
  function swatches(themeId) {
    const set = A.buildTileSet(themeId, 26);
    return TYPES.map((t) => '<img alt="" src="' + set[t].toDataURL() + '">').join('');
  }

  let backTarget = { modes: 'title', workshop: 'title', collection: 'title', help: 'title', settings: 'title' };
  function goBack() {
    if (screen === 'pause') return resume();
    if (screen === 'results') return showScreen('title');
    if (screen === 'settings' || screen === 'help') {
      const from = screen === 'settings' ? settingsFrom : backTarget.help;
      if (from === 'pause') return showScreen('pause');
      return showScreen('title');
    }
    if (screen === 'workshop' && backTarget.workshop === 'results') return showScreen('title');
    if (screen !== 'title' && screen !== 'game') showScreen('title');
  }

  ui.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (pnow() < (ui._armedAt || 0)) return; // ignore clicks carried over from frantic gameplay input
    AU.ensure();
    const [act, arg] = el.dataset.act.split(':');
    if (el.closest('[data-stop]') && act !== 'sl') return;
    if (act === 'sl') e.stopPropagation();
    AU.play('uiClick');
    switch (act) {
      case 'play': newGame(arg); break;
      case 'retry': newGame(G.mode); break;
      case 'modes': showScreen('modes'); break;
      case 'workshop': backTarget.workshop = screen; showScreen('workshop'); break;
      case 'collection': showScreen('collection'); break;
      case 'settings': settingsFrom = screen; showScreen('settings'); break;
      case 'help': backTarget.help = screen; showScreen('help'); break;
      case 'back': goBack(); break;
      case 'menu': showScreen('title'); break;
      case 'resume': resume(); break;
      case 'restart': newGame(G.mode); break;
      case 'quit': G = null; showScreen('title'); break;
      case 'sl': save.settings.startLevel = +arg; persist(); showScreen('modes'); break;
      case 'tab': SCREENS._tab = arg; showScreen('collection'); break;
      case 'theme': save.theme = arg; persist(); rebuildArt(); showScreen('collection'); break;
      case 'buy': {
        const p = PERKS.find((x) => x.id === arg);
        const lv = save.perks[arg];
        if (p && lv < p.max && save.shards >= p.cost[lv]) { save.shards -= p.cost[lv]; save.perks[arg]++; persist(); AU.play('buy'); toast(p.name + ' upgraded', p.desc(save.perks[arg])); }
        showScreen('workshop');
        break;
      }
      case 'reset':
        if (el.dataset.confirm) { const s = save.settings; save = defaultSave(); save.settings = s; persist(); rebuildArt(); toast('Progress reset', 'Shards, perks, bests and achievements cleared.'); showScreen('title'); }
        else { el.dataset.confirm = '1'; el.textContent = 'Click again to confirm'; }
        break;
    }
  });
  ui.addEventListener('keydown', (e) => {
    const c = e.target.closest('.card[data-act]');
    if (c && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); c.click(); }
  });
  ui.addEventListener('input', (e) => {
    const k = e.target.dataset.set;
    if (!k) return;
    const s = save.settings;
    if (e.target.type === 'checkbox') s[k] = e.target.checked;
    else s[k] = +e.target.value;
    const out = $('#o-' + k);
    if (out) out.textContent = k === 'music' || k === 'sfx' ? Math.round(s[k] * 100) + '%' : k === 'sdf' ? (s[k] >= 41 ? '∞' : s[k] + 'x') : s[k] + 'ms';
    AU.setVolumes(s.music, s.sfx);
    persist();
  });
  ui.addEventListener('mouseover', (e) => {
    const b = e.target.closest('.btn, .card[data-act]');
    if (b && b !== ui._lastHover) { ui._lastHover = b; AU.play('uiHover'); }
  });

  function focusables() {
    const s = ui.querySelector('.screen');
    return s ? $$('button:not([disabled]), .card[data-act], input', s) : [];
  }
  function moveFocus(d) {
    const f = focusables();
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    const n = f[(i + d + f.length) % f.length];
    n.focus();
    n.scrollIntoView({ block: 'nearest' });
    AU.play('uiHover');
  }
  function menuKey(e) {
    if (e.code === 'Escape' || (e.code === 'KeyP' && screen === 'pause')) { e.preventDefault(); goBack(); return; }
    if (screen === 'results' && (e.code === 'Enter' || e.code === 'Space') && pnow() >= (ui._armedAt || 0) && !(document.activeElement && document.activeElement.closest('.screen'))) { e.preventDefault(); newGame(G.mode); return; }
    const isRange = document.activeElement && document.activeElement.type === 'range';
    if (e.code === 'ArrowDown' || (e.code === 'ArrowRight' && !isRange)) { e.preventDefault(); moveFocus(1); }
    if (e.code === 'ArrowUp' || (e.code === 'ArrowLeft' && !isRange)) { e.preventDefault(); moveFocus(-1); }
  }

  // ------------------------------------------------------------------ main loop
  const DEBUG = { violations: 0, frames: [], last: 0 };
  let last = pnow();
  function frame(t) {
    const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
    last = t;
    DEBUG.frames.push(dt);
    if (DEBUG.frames.length > 240) DEBUG.frames.shift();
    try {
      pollPad(dt);
      update(dt);
      render();
    } catch (err) {
      DEBUG.lastError = String(err && err.stack || err);
      console.error(err);
    }
    if (input.lagStart) { input.lagSamples.push(pnow() - input.lagStart); if (input.lagSamples.length > 500) input.lagSamples.shift(); input.lagStart = 0; }
    requestAnimationFrame(frame);
  }

  // launcher heartbeat (only when served by Prismfall.exe)
  if (location.protocol.startsWith('http') && /launcher=1/.test(location.search)) {
    const beat = () => fetch('/__ping', { cache: 'no-store' }).catch(() => {});
    beat();
    setInterval(beat, 15000);
  }

  // test / debug hooks (read-only views + a few helpers used by the playtest harness)
  window.PF = {
    get screen() { return screen; },
    get G() { return G; },
    get save() { return save; },
    debug: {
      state() {
        if (!G) return null;
        return {
          mode: G.mode, state: G.state, score: G.score, lines: G.lines, level: G.level, time: G.time, gems: G.gems, prism: G.prism, fever: G.fever,
          board: G.board.map((r) => Array.from(r, (v) => (v ? 1 : 0))), cur: G.cur ? Object.assign({}, G.cur) : null,
          queue: G.queue.map((q) => q.type), hold: G.hold ? G.hold.type : null, holdUsed: G.holdUsed, clearing: !!G.clearing, pieces: G.pieces, combo: G.combo,
        };
      },
      shapes: SHAPES,
      layout: () => Object.assign({}, L),
      collides: (t, r, x, y) => collides(t, r, x, y),
      fps() {
        const f = DEBUG.frames.filter((d) => d > 0);
        if (!f.length) return null;
        const avg = f.reduce((a, b) => a + b, 0) / f.length;
        const worst = Math.max(...f);
        return { avgFps: 1 / avg, worstFrameMs: worst * 1000, samples: f.length };
      },
      lag() { const s = input.lagSamples.slice().sort((a, b) => a - b); return s.length ? { n: s.length, median: s[Math.floor(s.length / 2)], p95: s[Math.floor(s.length * 0.95)], max: s[s.length - 1] } : null; },
      get violations() { return DEBUG.violations; },
      get lastError() { return DEBUG.lastError || null; },
      fillPrism() { if (G) G.prism = 100; },
      setBoardRows(rows) { if (!G) return; for (let i = 0; i < rows.length; i++) { const y = ROWS - rows.length + i; G.board[y] = Uint8Array.from(rows[i].split('').map((ch) => (ch === '#' ? 3 : ch === '*' ? 19 : 0))); } },
      setSave(obj) { save = merge(defaultSave(), obj); persist(); rebuildArt(); },
    },
  };

  // ------------------------------------------------------------------ boot
  window.addEventListener('resize', () => layout());
  layout();
  initDeco();
  AU.setVolumes(save.settings.music, save.settings.sfx);
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => AU.ensure(), { once: true, passive: true }));
  try {
    const ic = A.buildIcon(64);
    const link = document.querySelector('link[rel=icon]');
    link.href = ic.toDataURL();
  } catch (e) { /* keep file icon */ }
  showScreen('title');
  requestAnimationFrame(frame);
})();
