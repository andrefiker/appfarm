'use strict';
(function () {
/* =====================================================================
   STORAGE
   ===================================================================== */
const STORE_KEY = 'ponteMestra.v1';
const Store = {
  data: { stars: {}, best: {}, bridges: {}, settings: { sound: true, haptics: true, lefty: false, stress: true }, custom: null, hintSeen: {} },
  load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        this.data = Object.assign(this.data, d);
        this.data.settings = Object.assign({ sound: true, haptics: true, lefty: false, stress: true }, d.settings || {});
      }
    } catch (e) { /* armazenamento indisponível: segue em memória */ }
  },
  save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(this.data)); } catch (e) { /* cota/privado */ } },
  reset() { this.data = { stars: {}, best: {}, bridges: {}, settings: this.data.settings, custom: null, hintSeen: {} }; this.save(); }
};
Store.load();
const S_ = () => Store.data.settings;

/* =====================================================================
   AUDIO (WebAudio sintetizado)
   ===================================================================== */
const Audio = {
  ctx: null, noise: null, master: null, lastCreak: 0,
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ctx.destination);
      const n = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, n, n);
      const d = this.noise.getChannelData(0); let s = 1;
      for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
    } catch (e) { this.ctx = null; }
  },
  ok() { return this.ctx && S_().sound; },
  env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); },
  tone(freq, dur, type, vol, slide) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    this.env(g, t, 0.005, vol || 0.2, dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  burst(dur, f0, f1, vol, q, type) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise; f.type = type || 'bandpass'; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    this.env(g, t, 0.003, vol || 0.3, dur);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  },
  snap() { this.burst(0.05, 3800, 2000, 0.25, 2); this.tone(1250, 0.06, 'triangle', 0.12, 900); },
  click() { this.tone(900, 0.04, 'square', 0.05); },
  erase() { this.burst(0.08, 1200, 400, 0.18, 1); },
  weld() { this.tone(600, 0.08, 'square', 0.08, 1200); this.burst(0.12, 6000, 3000, 0.08, 3); },
  bad() { this.tone(220, 0.12, 'sawtooth', 0.06, 180); },
  brk(mat) {
    const heavy = mat === 'concreto' || mat === 'aco' || mat === 'composito';
    this.burst(heavy ? 0.35 : 0.25, heavy ? 2500 : 1800, 120, 0.55, 0.8, 'lowpass');
    this.tone(heavy ? 70 : 110, 0.3, 'sine', 0.35, 35);
    if (mat === 'madeira') this.burst(0.18, 3000, 900, 0.3, 4);
    if (mat === 'cabo') this.tone(1800, 0.25, 'triangle', 0.12, 300);
  },
  creak(intensity) {
    if (!this.ok()) return;
    const now = this.ctx.currentTime;
    if (now - this.lastCreak < 0.35 - intensity * 0.15) return;
    this.lastCreak = now;
    const c = this.ctx, t = now, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = 70 + Math.random() * 60;
    lfo.frequency.value = 18 + Math.random() * 20; lg.gain.value = 25; lfo.connect(lg); lg.connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = 700 + Math.random() * 500; f.Q.value = 6;
    this.env(g, t, 0.04, 0.05 + intensity * 0.12, 0.35);
    o.connect(f); f.connect(g); g.connect(this.master); o.start(t); lfo.start(t); o.stop(t + 0.45); lfo.stop(t + 0.45);
  },
  splash() { this.burst(0.6, 2500, 200, 0.4, 0.6, 'lowpass'); this.burst(0.3, 5000, 1500, 0.15, 1); },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.16), i * 110)); },
  lose() { [392, 330, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.28, 'triangle', 0.14), i * 160)); }
};
function vibe(p) { if (!S_().haptics) return; try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignora */ } }

/* =====================================================================
   UI: estado global
   ===================================================================== */
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
let VW = 0, VH = 0, DPR = 1;
const G = {
  screen: 'menu', world: 1, lv: null, br: null, mode: 'build', tool: 'pista', mirror: false,
  undo: [], redo: [], sel: new Set(), clip: null, preview: null, previewTimer: 0,
  cam: { x: 0, y: 0, s: 30 }, S: null, paused: false, slow: false, stressCam: false, stressView: true,
  resultShown: false, particles: [], shake: 0, pending: null, editor: false, dirty: true, testLog: null,
  ghost: null, box: null, moving: null, hover: null
};
G.stressView = S_().stress !== false;

function fmtMoney(n) {
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-R$ ' : 'R$ ') + s;
}
function fmtNum(n, d) { return n.toFixed(d === undefined ? 1 : d).replace('.', ','); }
let toastT = 0;
function toast(msg, ms) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms || 1600);
}

/* =====================================================================
   RENDER
   ===================================================================== */
const COL = { paper: '#f3efe4', grid: '#cfe0ee', grid2: '#a9c6df', ink: '#1f3a5f', anchor: '#e2552d', water: 'rgba(110,170,220,.28)', waterLine: '#3d7fb8', tension: [214, 59, 42], comp: [44, 111, 209] };
let hatch = null;
function makeHatch() {
  const c = document.createElement('canvas'); const n = Math.round(12 * DPR);
  c.width = c.height = n; const g = c.getContext('2d');
  g.fillStyle = '#e6dfcb'; g.fillRect(0, 0, n, n);
  g.strokeStyle = 'rgba(31,58,95,.38)'; g.lineWidth = Math.max(1, DPR);
  g.beginPath(); g.moveTo(-1, n + 1); g.lineTo(n + 1, -1); g.moveTo(-1, 1); g.lineTo(1, -1); g.moveTo(n - 1, n + 1); g.lineTo(n + 1, n - 1); g.stroke();
  hatch = ctx.createPattern(c, 'repeat');
}
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = window.innerWidth; VH = window.innerHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
  makeHatch();
  if (G.screen === 'game' && G.lv && !G.userCam) fitView();
  G.dirty = true;
}
const wx2sx = x => (x - G.cam.x) * G.cam.s + VW / 2;
const wy2sy = y => VH / 2 - (y - G.cam.y) * G.cam.s;
const sx2wx = x => (x - VW / 2) / G.cam.s + G.cam.x;
const sy2wy = y => G.cam.y - (y - VH / 2) / G.cam.s;
function viewBand() {
  const top = $('topbar').offsetHeight || 54, bot = $('bottombar').offsetHeight || 70;
  return { top, bot: VH - bot };
}
function levelBox(lv) {
  let y0 = Math.min(lv.floor, lv.water ? lv.water.y : 0) - 0.5, y1 = Math.max(lv.hl, lv.hr) + 4;
  for (const a of lv.anchors) y1 = Math.max(y1, a[1] + 2.5);
  if (lv.ev && lv.ev.boat && lv.water) y1 = Math.max(y1, lv.water.y + lv.ev.boat.h + 1);
  let back = 0; for (const v of lv.veh) back = Math.max(back, VEH[v.t].L / 2);
  const dirs = new Set(lv.veh.map(v => (v.d === -1 ? -1 : 1)));
  const x0 = dirs.has(1) ? -(CFG.START_OFF + back + 0.5) : -(CFG.FLAG_OFF + 2);
  const x1 = dirs.has(-1) ? lv.W + CFG.START_OFF + back + 0.5 : lv.W + CFG.FLAG_OFF + 2;
  return { x0, x1, y0, y1 };
}
function fitView() {
  const lv = G.lv; if (!lv) return;
  const b = levelBox(lv), band = viewBand();
  const avH = band.bot - band.top - 16, avW = VW - 20;
  const s = Math.min(avW / (b.x1 - b.x0), avH / (b.y1 - b.y0));
  G.cam.s = Math.max(4, Math.min(140, s));
  G.cam.x = (b.x0 + b.x1) / 2;
  const mid = (band.top + band.bot) / 2;
  G.cam.y = (b.y0 + b.y1) / 2 - (VH / 2 - mid) / G.cam.s;
  G.userCam = false; G.dirty = true;
}
function lerpColor(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const rgb = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const MATRGB = {}; for (const k in MATS) MATRGB[k] = hexRgb(MATS[k].color);
function stressColor(mat, r) {
  const a = Math.min(1, Math.abs(r));
  if (a < 0.02) return MATS[mat].color;
  const base = [200, 205, 212];
  return rgb(lerpColor(base, r >= 0 ? COL.tension : COL.comp, Math.min(1, 0.25 + a * 0.85)));
}
function heatColor(p) {
  // azul-acinzentado → âmbar → vermelho
  const a = Math.max(0, Math.min(1, p));
  const c = a < 0.6 ? lerpColor([155, 180, 207], [232, 163, 58], a / 0.6) : lerpColor([232, 163, 58], [214, 59, 42], (a - 0.6) / 0.4);
  return rgb(c);
}

function drawBackground() {
  ctx.fillStyle = COL.paper; ctx.fillRect(0, 0, VW, VH);
  const s = G.cam.s;
  const x0 = Math.floor(sx2wx(0)), x1 = Math.ceil(sx2wx(VW)), y0 = Math.floor(sy2wy(VH)), y1 = Math.ceil(sy2wy(0));
  if (s >= 9) {
    ctx.strokeStyle = COL.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = x0; x <= x1; x++) { if (x % 5 === 0) continue; const X = Math.round(wx2sx(x)) + 0.5; ctx.moveTo(X, 0); ctx.lineTo(X, VH); }
    for (let y = y0; y <= y1; y++) { if (y % 5 === 0) continue; const Y = Math.round(wy2sy(y)) + 0.5; ctx.moveTo(0, Y); ctx.lineTo(VW, Y); }
    ctx.stroke();
  }
  ctx.strokeStyle = COL.grid2; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = Math.floor(x0 / 5) * 5; x <= x1; x += 5) { const X = Math.round(wx2sx(x)) + 0.5; ctx.moveTo(X, 0); ctx.lineTo(X, VH); }
  for (let y = Math.floor(y0 / 5) * 5; y <= y1; y += 5) { const Y = Math.round(wy2sy(y)) + 0.5; ctx.moveTo(0, Y); ctx.lineTo(VW, Y); }
  ctx.stroke();
}
function terrainPath(lv, ox, oy) {
  const p = new Path2D();
  const F = lv.floor - 80;
  const pts = [[-300, lv.hl], [0, lv.hl], [0, lv.floor], [lv.W, lv.floor], [lv.W, lv.hr], [lv.W + 300, lv.hr], [lv.W + 300, F], [-300, F]];
  pts.forEach(([x, y], i) => { const X = wx2sx(x + ox), Y = wy2sy(y + oy); if (i) p.lineTo(X, Y); else p.moveTo(X, Y); });
  p.closePath();
  for (const r of lv.rocks || []) {
    const X0 = wx2sx(r.x - r.w / 2 + ox), X1 = wx2sx(r.x + r.w / 2 + ox), Yt = wy2sy(r.top + oy), Yb = wy2sy(lv.floor + oy) + 1;
    p.moveTo(X0, Yb); p.lineTo(X0 + (X1 - X0) * 0.08, Yt); p.lineTo(X1 - (X1 - X0) * 0.08, Yt); p.lineTo(X1, Yb); p.closePath();
  }
  return p;
}
function drawTerrain(lv, t) {
  const ox = G.S ? G.S.qx : 0, oy = G.S ? G.S.qy : 0;
  const path = terrainPath(lv, ox, oy);
  ctx.save(); ctx.fillStyle = hatch; ctx.fill(path); ctx.restore();
  ctx.lineWidth = 2; ctx.strokeStyle = COL.ink; ctx.stroke(path);
  // estrada nas margens
  const road = (xa, xb, y) => {
    const Y = wy2sy(y + oy);
    ctx.lineWidth = Math.max(3, 0.3 * G.cam.s); ctx.strokeStyle = '#39434e';
    ctx.beginPath(); ctx.moveTo(wx2sx(xa + ox), Y); ctx.lineTo(wx2sx(xb + ox), Y); ctx.stroke();
    ctx.setLineDash([Math.max(4, 0.6 * G.cam.s), Math.max(4, 0.6 * G.cam.s)]); ctx.lineWidth = 1.2; ctx.strokeStyle = '#f3efe4';
    ctx.beginPath(); ctx.moveTo(wx2sx(xa + ox), Y - 0.5); ctx.lineTo(wx2sx(xb + ox), Y - 0.5); ctx.stroke(); ctx.setLineDash([]);
  };
  road(-300, 0, lv.hl); road(lv.W, lv.W + 300, lv.hr);
  // torres (âncoras acima da margem)
  for (const a of lv.anchors) {
    const [x, y] = a;
    const gy = x <= 0 ? lv.hl : x >= lv.W ? lv.hr : null;
    if (gy !== null && y > gy + 0.5) {
      const w = Math.max(6, 0.7 * G.cam.s), X = wx2sx(x + ox);
      const Y0 = wy2sy(gy + oy), Y1 = wy2sy(y + oy);
      ctx.fillStyle = hatch; ctx.fillRect(X - w / 2, Y1, w, Y0 - Y1);
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 1.5; ctx.strokeRect(X - w / 2, Y1, w, Y0 - Y1);
    }
  }
}
function drawWater(lv, t, y) {
  if (y === null || y === undefined) return;
  const ox = G.S ? G.S.qx : 0;
  const Y = wy2sy(y), Yb = wy2sy(lv.floor);
  const X0 = wx2sx(0 + ox), X1 = wx2sx(lv.W + ox);
  ctx.fillStyle = COL.water; ctx.fillRect(X0, Y, X1 - X0, Yb - Y);
  ctx.strokeStyle = COL.waterLine; ctx.lineWidth = 2; ctx.setLineDash([10, 7]); ctx.lineDashOffset = -t * 18;
  ctx.beginPath();
  for (let x = X0; x <= X1; x += 8) { const yy = Y + Math.sin(x * 0.05 + t * 2) * 1.5; if (x === X0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
  ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
}
function drawAnchor(x, y) {
  const X = wx2sx(x), Y = wy2sy(y), r = Math.max(6, Math.min(12, 0.28 * G.cam.s));
  ctx.fillStyle = COL.anchor; ctx.strokeStyle = '#8f2a10'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - r * 1.1, Y + r * 1.5); ctx.lineTo(X + r * 1.1, Y + r * 1.5); ctx.closePath(); ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X, Y, r * 0.35, 0, Math.PI * 2); ctx.fill();
}
function drawMember(ax, ay, bx, by, mat, opt) {
  const M = MATS[mat], s = G.cam.s;
  const X0 = wx2sx(ax), Y0 = wy2sy(ay), X1 = wx2sx(bx), Y1 = wy2sy(by);
  let w = Math.max(M.cable ? 2 : 3, M.width * s);
  if (M.deck) w = Math.max(5, M.width * s);
  let col = opt && opt.color ? opt.color : M.color;
  ctx.lineCap = 'round';
  if (opt && opt.glow) { ctx.strokeStyle = 'rgba(214,59,42,.25)'; ctx.lineWidth = w + 8; ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke(); }
  if (opt && opt.sel) { ctx.strokeStyle = 'rgba(226,85,45,.45)'; ctx.lineWidth = w + 7; ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke(); }
  if (opt && opt.dash) ctx.setLineDash(opt.dash);
  if (M.cable) {
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(X0, Y0);
    if (opt && opt.slack > 0.02) { const sag = Math.min(opt.slack, 3) * s * 0.5; ctx.quadraticCurveTo((X0 + X1) / 2, (Y0 + Y1) / 2 + sag, X1, Y1); }
    else ctx.lineTo(X1, Y1);
    ctx.stroke(); ctx.setLineDash([]); return;
  }
  if (M.piston) {
    const k = opt && opt.ext ? 0.5 / opt.ext : 0.55;
    const XM = X0 + (X1 - X0) * k, YM = Y0 + (Y1 - Y0) * k;
    ctx.strokeStyle = COL.ink; ctx.lineWidth = w + 3; ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(XM, YM); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(XM, YM); ctx.stroke();
    ctx.strokeStyle = '#7d8793'; ctx.lineWidth = Math.max(2, w * 0.45); ctx.beginPath(); ctx.moveTo(XM, YM); ctx.lineTo(X1, Y1); ctx.stroke();
    ctx.setLineDash([]); return;
  }
  ctx.strokeStyle = M.deck ? '#1d242c' : COL.ink; ctx.lineWidth = w + 2.2;
  ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke();
  if (M.deck && w > 6) {
    ctx.setLineDash([w * 0.9, w * 0.9]); ctx.strokeStyle = 'rgba(243,239,228,.75)'; ctx.lineWidth = Math.max(1, w * 0.12);
    ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke();
  } else if (mat === 'madeira' && w > 4) {
    ctx.strokeStyle = 'rgba(255,230,180,.45)'; ctx.lineWidth = Math.max(1, w * 0.18);
    ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke();
  } else if (mat === 'concreto' && w > 6) {
    ctx.setLineDash([2, w * 0.5]); ctx.strokeStyle = 'rgba(60,60,55,.5)'; ctx.lineWidth = w * 0.6;
    ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke();
  } else if (mat === 'composito' && w > 4) {
    ctx.setLineDash([w * 0.6, w * 0.4]); ctx.strokeStyle = 'rgba(180,230,215,.6)'; ctx.lineWidth = Math.max(1, w * 0.2);
    ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke();
  }
  ctx.setLineDash([]);
}
function drawStub(ax, ay, bx, by, mat) {
  // pedaço quebrado: linha com ponta serrilhada
  drawMember(ax, ay, bx, by, mat, { color: MATS[mat].color });
  const X = wx2sx(bx), Y = wy2sy(by), ang = Math.atan2(Y - wy2sy(ay), X - wx2sx(ax)), r = Math.max(3, MATS[mat].width * G.cam.s * 0.7);
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = -2; i <= 2; i++) { const a = ang + Math.PI / 2; const px = X + Math.cos(a) * i * r * 0.5, py = Y + Math.sin(a) * i * r * 0.5; const k = (i % 2 ? 1 : -1) * r * 0.5; ctx.lineTo(px + Math.cos(ang) * k, py + Math.sin(ang) * k); }
  ctx.stroke();
}
function drawJoint(x, y, weld, opt) {
  const X = wx2sx(x), Y = wy2sy(y), r = Math.max(4, Math.min(9, 0.16 * G.cam.s));
  if (opt && opt.sel) { ctx.strokeStyle = COL.anchor; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, Y, r + 5, 0, Math.PI * 2); ctx.stroke(); }
  if (opt && opt.ring !== undefined) { ctx.strokeStyle = heatColor(opt.ring); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, Y, r + 3, 0, Math.PI * 2); ctx.stroke(); }
  ctx.lineWidth = 2; ctx.strokeStyle = COL.ink;
  if (weld) { ctx.fillStyle = COL.ink; ctx.fillRect(X - r, Y - r, 2 * r, 2 * r); ctx.strokeRect(X - r, Y - r, 2 * r, 2 * r); ctx.fillStyle = '#f3efe4'; ctx.fillRect(X - r * 0.35, Y - r * 0.35, r * 0.7, r * 0.7); }
  else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
}
function drawFlag(x, y) {
  const X = wx2sx(x), Y = wy2sy(y), h = Math.max(30, 2.6 * G.cam.s), fw = h * 0.55, fh = h * 0.36;
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y - h); ctx.stroke();
  const n = 4, cw = fw / n, ch = fh / 3;
  for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = (i + j) % 2 ? '#fff' : COL.anchor; ctx.fillRect(X + i * cw, Y - h + j * ch, cw, ch); }
  ctx.strokeRect(X, Y - h, fw, fh);
}
function drawStopSign(x, y) {
  const X = wx2sx(x), Y = wy2sy(y), h = Math.max(24, 2.2 * G.cam.s), r = Math.max(8, 0.45 * G.cam.s);
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y - h); ctx.stroke();
  ctx.fillStyle = COL.anchor; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; ctx.lineTo(X + Math.cos(a) * r, Y - h + Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.max(7, r * 0.55)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('PARE', X, Y - h + 0.5);
}
function vehicleShape(type, T) {
  // retorna lista de [tipo, pontos/params] em coords locais (m), y para cima, origem no centro inferior do chassi
  const L = T.L, H = T.H - T.r;
  switch (type) {
    case 'carro': return [['poly', [[-L / 2, 0], [L / 2, 0], [L / 2, 0.55], [L * 0.28, 0.62], [L * 0.12, H], [-L * 0.28, H], [-L * 0.44, 0.62], [-L / 2, 0.58]]],
      ['win', [[-L * 0.25, 0.68], [-0.05, 0.68], [-0.05, H - 0.1], [-L * 0.23, H - 0.1]]], ['win', [[0.05, 0.68], [L * 0.24, 0.68], [L * 0.1, H - 0.1], [0.05, H - 0.1]]]];
    case 'van': return [['poly', [[-L / 2, 0], [L / 2, 0], [L / 2, H * 0.5], [L * 0.32, H], [-L / 2, H]]],
      ['win', [[L * 0.12, H * 0.55], [L * 0.33, H * 0.55], [L * 0.27, H * 0.9], [L * 0.12, H * 0.9]]], ['win', [[-L * 0.4, H * 0.55], [-L * 0.1, H * 0.55], [-L * 0.1, H * 0.9], [-L * 0.4, H * 0.9]]]];
    case 'onibus': {
      const o = [['poly', [[-L / 2, 0], [L / 2, 0], [L / 2, H], [-L / 2, H]]]];
      for (let i = 0; i < 6; i++) { const x = -L / 2 + 0.5 + i * (L - 1.4) / 6; o.push(['win', [[x, H * 0.5], [x + 0.95, H * 0.5], [x + 0.95, H * 0.88], [x, H * 0.88]]]); }
      o.push(['win', [[L / 2 - 0.6, H * 0.4], [L / 2 - 0.1, H * 0.4], [L / 2 - 0.1, H * 0.9], [L / 2 - 0.6, H * 0.9]]]);
      return o;
    }
    case 'caminhao': return [['poly', [[-L / 2, 0.1], [L * 0.2, 0.1], [L * 0.2, H], [-L / 2, H]]], ['box', [[L * 0.24, 0], [L / 2, 0], [L / 2, H * 0.62], [L * 0.42, H * 0.82], [L * 0.24, H * 0.82]]],
      ['win', [[L * 0.36, H * 0.5], [L * 0.47, H * 0.5], [L * 0.41, H * 0.75], [L * 0.36, H * 0.75]]]];
    case 'moto': return [['poly', [[-0.75, 0.15], [0.7, 0.15], [0.55, 0.55], [-0.4, 0.55]]], ['rider', [[0, 0.55]]]];
  }
  return [];
}
function drawVehicle(V) {
  const s = G.cam.s, cs = V.chassis, T = V.T;
  const ox = (cs[0].x + cs[1].x) / 2, oy = (cs[0].y + cs[1].y) / 2;
  ctx.save();
  ctx.translate(wx2sx(ox), wy2sy(oy)); ctx.rotate(-V.ang); ctx.scale(V.d * s, -s);
  const lw = 1.6 / s;
  for (const [k, pts] of vehicleShape(V.spec.t, T)) {
    if (k === 'rider') {
      const [x, y] = pts[0];
      ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.moveTo(x - 0.15, y); ctx.lineTo(x + 0.25, y + 0.55); ctx.lineTo(x + 0.05, y + 0.6); ctx.lineTo(x - 0.3, y); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 0.18, y + 0.78, 0.17, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = COL.ink; ctx.stroke();
      continue;
    }
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
    ctx.fillStyle = k === 'win' ? '#d9ecf8' : k === 'box' ? '#c6d2a4' : T.col;
    ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = COL.ink; ctx.stroke();
  }
  if (V.spec.t === 'caminhao') { ctx.fillStyle = 'rgba(31,58,95,.75)'; ctx.font = `800 ${0.6}px sans-serif`; ctx.save(); ctx.scale(1, -1); ctx.textAlign = 'center'; ctx.fillText('CARGA', -T.L * 0.15 * 1, -(T.H - T.r) * 0.45); ctx.restore(); }
  ctx.restore();
  for (const w of V.wheels) {
    const X = wx2sx(w.x), Y = wy2sy(w.y), r = T.r * s;
    ctx.fillStyle = '#2b2f36'; ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9ced6'; ctx.beginPath(); ctx.arc(X, Y, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.beginPath();
    for (let i = 0; i < 3; i++) { const a = -V.spin * V.d + i * Math.PI * 2 / 3; ctx.moveTo(X, Y); ctx.lineTo(X + Math.cos(a) * r * 0.5, Y + Math.sin(a) * r * 0.5); }
    ctx.stroke();
  }
}
function drawGhostVehicle(lv) {
  // veículo parado no início (modo construção)
  const sp = lv.veh[0]; if (!sp) return;
  const T = VEH[sp.t], d = sp.d === -1 ? -1 : 1;
  const x = d > 0 ? -CFG.START_OFF : lv.W + CFG.START_OFF, gy = (d > 0 ? lv.hl : lv.hr) + T.r;
  const fake = { T, d, spec: sp, ang: 0, spin: 0, chassis: [{ x: x - d * T.L / 2, y: gy + 0.05 }, { x: x + d * T.L / 2, y: gy + 0.05 }], wheels: T.ax.map(a => ({ x: x + a * d, y: gy })) };
  ctx.globalAlpha = 0.85; drawVehicle(fake); ctx.globalAlpha = 1;
}
function drawBoat(lv, t, wy) {
  const b = lv.ev.boat; if (!b || wy === null) return;
  const cx = (b.x0 + b.x1) / 2, w = (b.x1 - b.x0) * 0.85;
  let a = 1, k = 0;
  if (G.mode === 'test') {
    if (t < b.tIn - 1.5 || t > b.tOut + 1.5) return;
    k = (t - (b.tIn - 1.5)) / (b.tOut - b.tIn + 3);
    a = Math.min(1, (t - (b.tIn - 1.5)) / 1.5, (b.tOut + 1.5 - t) / 1.5);
  } else a = 0.25;
  const bob = Math.sin(t * 2.2) * 0.08;
  const sc = G.mode === 'test' ? 0.7 + 0.3 * Math.sin(Math.PI * Math.min(1, Math.max(0, k))) : 1;
  ctx.save(); ctx.globalAlpha = Math.max(0, a);
  const X = wx2sx(cx), Y = wy2sy(wy + bob), s = G.cam.s * sc;
  ctx.translate(X, Y); ctx.scale(s, s);
  ctx.lineWidth = 1.8 / s; ctx.strokeStyle = COL.ink;
  ctx.fillStyle = '#fffdf7';
  ctx.beginPath(); ctx.moveTo(-w / 2, -0.9); ctx.lineTo(w / 2, -0.9); ctx.lineTo(w / 2 - 0.8, 0.5); ctx.lineTo(-w / 2 + 0.6, 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = COL.anchor; ctx.fillRect(-w / 2 + 0.3, -0.9, w - 0.6, 0.35);
  ctx.fillStyle = '#d9ecf8'; ctx.fillRect(-w * 0.18, -1.9, w * 0.36, 1.0); ctx.strokeRect(-w * 0.18, -1.9, w * 0.36, 1.0);
  ctx.beginPath(); ctx.moveTo(0, -1.9); ctx.lineTo(0, -b.h); ctx.stroke();
  ctx.fillStyle = COL.anchor; ctx.beginPath(); ctx.moveTo(0, -b.h); ctx.lineTo(1.2, -b.h + 0.4); ctx.lineTo(0, -b.h + 0.8); ctx.fill();
  ctx.restore();
}
function drawBoatZone(lv, wy) {
  const b = lv.ev.boat; if (!b || wy === null) return;
  const X0 = wx2sx(b.x0), X1 = wx2sx(b.x1), Y0 = wy2sy(wy), Y1 = wy2sy(wy + b.h);
  const S = G.S, active = S && boatState(lv, S.t) && boatState(lv, S.t).active;
  ctx.save();
  ctx.fillStyle = active ? 'rgba(226,85,45,.10)' : 'rgba(226,85,45,.05)'; ctx.fillRect(X0, Y1, X1 - X0, Y0 - Y1);
  ctx.setLineDash([8, 6]); ctx.strokeStyle = COL.anchor; ctx.lineWidth = 2; ctx.strokeRect(X0, Y1, X1 - X0, Y0 - Y1); ctx.setLineDash([]);
  ctx.fillStyle = COL.anchor; ctx.font = '700 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`canal do barco · ${fmtNum(b.tIn)}–${fmtNum(b.tOut)} s`, (X0 + X1) / 2, Y0 - 8);
  ctx.restore();
}
function drawWindArrows(lv, t, wind) {
  if (!wind) return;
  ctx.save(); ctx.strokeStyle = 'rgba(31,58,95,.35)'; ctx.lineWidth = 2;
  const n = 7;
  for (let i = 0; i < n; i++) {
    const y = 60 + ((i * 53) % (VH - 160)), len = 30 + wind * 60, x = ((t * (120 + wind * 200) + i * 230) % (VW + 200)) - 100;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.moveTo(x + len - 7, y - 5); ctx.lineTo(x + len, y); ctx.lineTo(x + len - 7, y + 5); ctx.stroke();
  }
  ctx.restore();
}
function drawParticles(dt) {
  const ps = G.particles;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    p.t += dt; if (p.t > p.life) { ps.splice(i, 1); continue; }
    p.vy -= (p.g === undefined ? 9.8 : p.g) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    const a = 1 - p.t / p.life;
    ctx.globalAlpha = a; ctx.fillStyle = p.c;
    const X = wx2sx(p.x), Y = wy2sy(p.y), r = p.r * G.cam.s * (p.grow ? 1 + p.t * 2 : 1);
    if (p.shape === 'sq') { ctx.save(); ctx.translate(X, Y); ctx.rotate(p.t * p.spin); ctx.fillRect(-r, -r * 0.35, 2 * r, r * 0.7); ctx.restore(); }
    else { ctx.beginPath(); ctx.arc(X, Y, Math.max(1, r), 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
function spawnParticles(kind, x, y, mat) {
  const rnd = Math.random;
  if (kind === 'break') {
    const c = mat === 'madeira' ? '#b07a3a' : mat === 'concreto' ? '#8f8b80' : mat === 'pista' ? '#39434e' : MATS[mat] ? MATS[mat].color : '#888';
    for (let i = 0; i < 14; i++) G.particles.push({ x, y, vx: (rnd() - 0.5) * 8, vy: rnd() * 6, r: 0.06 + rnd() * 0.09, c, life: 0.9 + rnd() * 0.6, t: 0, shape: 'sq', spin: (rnd() - 0.5) * 20 });
    for (let i = 0; i < 10; i++) G.particles.push({ x, y, vx: (rnd() - 0.5) * 3, vy: rnd() * 1.5, r: 0.12 + rnd() * 0.18, c: 'rgba(170,150,120,.55)', life: 1 + rnd(), t: 0, g: -0.5, grow: true });
  } else if (kind === 'splash') {
    for (let i = 0; i < 26; i++) G.particles.push({ x: x + (rnd() - 0.5), y, vx: (rnd() - 0.5) * 5, vy: 3 + rnd() * 7, r: 0.07 + rnd() * 0.1, c: 'rgba(61,127,184,.8)', life: 1.2, t: 0 });
  } else if (kind === 'dust') {
    for (let i = 0; i < 6; i++) G.particles.push({ x, y, vx: (rnd() - 0.5) * 2, vy: rnd(), r: 0.1 + rnd() * 0.12, c: 'rgba(170,150,120,.5)', life: 0.8, t: 0, g: -0.3, grow: true });
  } else if (kind === 'spark') {
    for (let i = 0; i < 8; i++) G.particles.push({ x, y, vx: (rnd() - 0.5) * 6, vy: rnd() * 5, r: 0.04, c: '#e8a33a', life: 0.4, t: 0 });
  }
}

function render(dt) {
  const lv = G.lv;
  const t = performance.now() / 1000;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  let shx = 0, shy = 0;
  if (G.shake > 0) { shx = (Math.random() - 0.5) * G.shake; shy = (Math.random() - 0.5) * G.shake; G.shake = Math.max(0, G.shake - dt * 40); }
  ctx.translate(shx, shy);
  drawBackground();
  if (!lv) return;
  const S = G.mode === 'test' ? G.S : null;
  const simT = S ? S.t : 0;
  const wy = S ? S.waterY : (lv.water ? lv.water.y : null);
  // linha de cheia (prevista)
  if (!S && lv.water && lv.water.rise) {
    const Y = wy2sy(lv.water.rise[2]);
    ctx.save(); ctx.setLineDash([3, 5]); ctx.strokeStyle = COL.waterLine; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(wx2sx(0), Y); ctx.lineTo(wx2sx(lv.W), Y); ctx.stroke();
    ctx.fillStyle = COL.waterLine; ctx.font = '700 11px sans-serif'; ctx.fillText('nível da cheia', wx2sx(0) + 6, Y - 5); ctx.restore();
  }
  drawTerrain(lv, t);
  if (lv.ev.boat) { drawBoatZone(lv, wy); drawBoat(lv, S ? simT : t, wy); }
  // bandeiras e placas
  const dirs = new Set(lv.veh.map(v => (v.d === -1 ? -1 : 1)));
  const oyq = S ? S.qy : 0, oxq = S ? S.qx : 0;
  if (dirs.has(1)) drawFlag(lv.W + CFG.FLAG_OFF + oxq, lv.hr + oyq);
  if (dirs.has(-1)) drawFlag(-CFG.FLAG_OFF + oxq, lv.hl + oyq);
  for (const v of lv.veh) if (v.stop) drawStopSign(v.stop[0], Math.max(lv.hl, lv.hr) + 0.2);
  if (S) drawSim(S); else drawBuild();
  drawWater(lv, t, wy);
  if (S) { for (const V of S.vehicles) if (V.active) drawVehicle(V); drawWindArrows(lv, t, S.wind); }
  else drawGhostVehicle(lv);
  drawParticles(dt);
}
function drawBuild() {
  const lv = G.lv, br = G.br, nm = nodeMap(lv, br);
  const pv = G.stressView ? G.preview : null;
  const mv = G.moving;
  const pos = id => { const n = nm.get(id); if (mv && mv.off && G.sel.has(id)) return { x: n.x + mv.off.x, y: n.y + mv.off.y }; return n; };
  // membros (pista por último)
  const order = br.members.slice().sort((a, b) => (MATS[a.m].deck ? 1 : 0) - (MATS[b.m].deck ? 1 : 0));
  for (const m of order) {
    const a = pos(m.a), b = pos(m.b);
    const opt = {};
    if (pv && pv.mem[m.id] !== undefined) {
      const r = pv.mem[m.id];
      if (pv.unstable.has(m.id)) { opt.color = '#8e44ad'; opt.dash = [6, 4]; }
      else { opt.color = stressColor(m.m, r); if (Math.abs(r) >= 1) opt.glow = true; }
    }
    if (G.sel.has(m.a) && G.sel.has(m.b)) opt.sel = true;
    if (G.hover && G.hover.member === m.id) opt.sel = true;
    drawMember(a.x, a.y, b.x, b.y, m.m, opt);
    if (MATS[m.m].piston) {
      const X = wx2sx((a.x + b.x) / 2), Y = wy2sy((a.y + b.y) / 2);
      ctx.fillStyle = COL.ink; ctx.font = '800 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(m.inv ? '⇣' : '⇡', X + 10, Y - 10);
    }
  }
  for (const a of levelAnchors(lv)) drawAnchor(a.x, a.y);
  for (const j of br.joints) { const p = pos(j.id); drawJoint(p.x, p.y, !!br.weld[j.id], { sel: G.sel.has(j.id), ring: pv && pv.weld[j.id] !== undefined ? pv.weld[j.id] : undefined }); }
  for (const a of levelAnchors(lv)) if (br.weld[a.id]) drawJoint(a.x, a.y, true, {});
  // início pendente (toque-toque)
  if (G.pending) { const p = nm.get(G.pending); if (p) { ctx.strokeStyle = COL.anchor; ctx.lineWidth = 3; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(wx2sx(p.x), wy2sy(p.y), 16, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); } }
  // fantasma de construção
  const gh = G.ghost;
  if (gh) {
    const M = MATS[gh.mat];
    ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(31,58,95,.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(wx2sx(gh.a.x), wy2sy(gh.a.y), M.maxL * G.cam.s, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    const ok = gh.ok;
    drawMember(gh.a.x, gh.a.y, gh.b.x, gh.b.y, gh.mat, { color: ok ? M.color : '#d63b2a', dash: ok ? null : [6, 4] });
    if (gh.mirror) drawMember(gh.mirror.a.x, gh.mirror.a.y, gh.mirror.b.x, gh.mirror.b.y, gh.mat, { color: 'rgba(31,58,95,.35)', dash: [5, 5] });
    drawJoint(gh.b.x, gh.b.y, false, {});
    const X = wx2sx((gh.a.x + gh.b.x) / 2), Y = wy2sy((gh.a.y + gh.b.y) / 2) - 18;
    const L = Math.hypot(gh.b.x - gh.a.x, gh.b.y - gh.a.y);
    const label = ok ? `${fmtNum(L)} m · ${fmtMoney(L * M.cost)}` : (gh.why || 'inválido');
    ctx.font = '800 13px sans-serif'; const tw = ctx.measureText(label).width;
    ctx.fillStyle = ok ? 'rgba(31,58,95,.92)' : 'rgba(214,59,42,.95)'; roundRect(X - tw / 2 - 8, Y - 12, tw + 16, 24, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, X, Y);
  }
  if (G.box) {
    const b = G.box; ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = COL.anchor; ctx.lineWidth = 1.5; ctx.fillStyle = 'rgba(226,85,45,.08)';
    ctx.fillRect(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1), Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0));
    ctx.strokeRect(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1), Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0)); ctx.restore();
  }
  if (G.editor) {
    const bb = buildBounds(lv);
    ctx.save(); ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(31,58,95,.5)'; ctx.strokeRect(wx2sx(bb.x0), wy2sy(bb.y1), (bb.x1 - bb.x0) * G.cam.s, (bb.y1 - bb.y0) * G.cam.s); ctx.restore();
  }
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawSim(S) {
  const sv = G.stressView;
  const ms = S.mems.slice().sort((a, b) => (a.deck ? 1 : 0) - (b.deck ? 1 : 0));
  for (const c of ms) {
    if (c.broken) continue;
    if (c.stub) { drawStub(c.pa.x, c.pa.y, c.pb.x, c.pb.y, c.mat); continue; }
    const opt = {};
    if (sv) { opt.color = stressColor(c.mat, c.filt * c.sgn); if (c.filt > 0.85) opt.glow = true; }
    if (c.cable) opt.slack = c.rest - c.len;
    if (c.piston) opt.ext = c.rest / c.rest0;
    if (G.stressCam && S.hot === c) opt.sel = true;
    drawMember(c.pa.x, c.pa.y, c.pb.x, c.pb.y, c.mat, opt);
  }
  for (const p of S.parts) { if (p.anchor) drawAnchor(p.x, p.y); }
  const welded = new Set(); for (const g of S.angs) if (!g.broken) welded.add(g.pj);
  for (const p of S.parts) if (!p.fixed && !p.debris && !p.veh) drawJoint(p.x, p.y, welded.has(p), {});
}

/* =====================================================================
   UI: telas, barras, botões
   ===================================================================== */
const MAT_UNLOCK_HINT = { aco: 7, cabo: 11, aluminio: 13, pistao: 15, concreto: 21, composito: 31 };
function buildMatButtons() {
  const box = $('mats'); box.innerHTML = '';
  for (const k of MAT_ORDER) {
    if (!G.lv.mat.includes(k)) continue;
    const M = MATS[k];
    const b = document.createElement('button');
    b.className = 'mat'; b.dataset.mat = k;
    b.innerHTML = `<span class="sw" style="background:${M.color}"></span>${M.name}<span class="cost">R$${M.cost}/m</span>`;
    b.addEventListener('click', () => { setTool(k); Audio.click(); });
    box.appendChild(b);
  }
  // material novo neste nível: destaca e rola até ele
  for (const k in MAT_UNLOCK_HINT) {
    if (MAT_UNLOCK_HINT[k] === G.lv.id) {
      const b = box.querySelector(`[data-mat="${k}"]`);
      if (b) { setTimeout(() => { try { b.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { /* ok */ } }, 50); setTimeout(() => toast('Novo material: ' + MATS[k].name + '!', 2200), 400); }
    }
  }
}
function setTool(t) {
  G.tool = t; G.pending = null;
  if (t !== 'select') { G.sel.clear(); }
  for (const b of document.querySelectorAll('.mat')) b.classList.toggle('on', b.dataset.mat === t);
  $('tSel').classList.toggle('on', t === 'select');
  $('tErase').classList.toggle('on', t === 'erase');
  updateSelBar(); G.dirty = true;
}
function updateBudget() {
  const lv = G.lv, cost = bridgeCost(lv, G.br);
  const el = $('budget');
  if (lv.sandbox) { el.querySelector('.fill').style.width = '0%'; el.querySelector('.txt').textContent = fmtMoney(cost) + ' · ilimitado'; el.classList.remove('over', 'near'); return; }
  const f = cost / lv.budget;
  el.querySelector('.fill').style.width = Math.min(100, f * 100) + '%';
  el.querySelector('.txt').textContent = `${fmtMoney(cost)} / ${fmtMoney(lv.budget)}`;
  el.classList.toggle('over', f > 1); el.classList.toggle('near', f > 0.9 && f <= 1);
}
function updateUndoButtons() { $('tUndo').disabled = !G.undo.length; $('tRedo').disabled = !G.redo.length; }
function updateChips() {
  const lv = G.lv, box = $('chips'); const chips = [];
  if (G.mode === 'build') {
    if (G.stressView && G.preview && G.br.members.length) {
      const p = G.preview;
      if (!p.ok) chips.push(['red', 'Estrutura instável (mecanismo)']);
      else chips.push([p.max >= 1 ? 'red' : p.max >= 0.8 ? 'amber' : 'ok', `Pico estimado ${Math.round(p.max * 100)}%`]);
    }
    if (G.mirror) chips.push(['', 'Espelho ligado']);
    if (lv.water && lv.water.rise) chips.push(['', `Represa: a água sobe até ${fmtNum(lv.water.rise[2])} m`]);
    if (lv.ev.wind) chips.push(['', 'Vento em rajadas']);
    if (lv.ev.quake) chips.push(['amber', `Terremoto em ${fmtNum(lv.ev.quake.t0)} s`]);
    if (lv.ev.boat) chips.push(['', `Barco: ${fmtNum(lv.ev.boat.tIn)}–${fmtNum(lv.ev.boat.tOut)} s`]);
    if (lv.ev.pist) { const p = lv.ev.pist; chips.push(['', `Pistões ×${fmtNum(p[1][1], 2)}: abrem ${fmtNum(p[0][0])}–${fmtNum(p[1][0])} s, fecham ${fmtNum(p[2][0])}–${fmtNum(p[3][0])} s`]); }
  } else if (G.S) {
    const S = G.S;
    chips.push([S.maxNow >= 0.8 ? 'red' : S.maxNow >= 0.6 ? 'amber' : 'ok', `Tensão ${Math.round(S.maxNow * 100)}% · pico ${Math.round(S.maxEver * 100)}%`]);
    if (G.slow) chips.push(['amber', 'Câmera lenta 0,25x']);
    if (G.paused) chips.push(['', 'Pausado']);
    if (G.stressCam) chips.push(['', 'Câmera de tensão']);
  }
  const html = chips.map(([c, t]) => `<span class="chip ${c}">${t}</span>`).join('');
  if (box.innerHTML !== html) box.innerHTML = html;
}
function updateSelBar() {
  const show = G.mode === 'build' && G.tool === 'select' && (G.sel.size > 0 || G.clip);
  $('selbar').classList.toggle('hidden', !show);
  $('selCount').textContent = G.sel.size + ' sel.';
  $('sCopy').disabled = $('sMirror').disabled = $('sDel').disabled = !G.sel.size;
  $('sPaste').disabled = !G.clip;
}
function showScreen(name) {
  G.screen = name;
  $('menu').classList.toggle('hidden', name !== 'menu');
  for (const id of ['topbar', 'bottombar', 'chips']) $(id).classList.toggle('hidden', name !== 'game');
  document.body.classList.toggle('playing', name === 'game');
  if (name !== 'game') { $('selbar').classList.add('hidden'); $('hint').classList.add('hidden'); $('editorPanel').classList.add('hidden'); }
  G.dirty = true;
}

/* ---------- menu ---------- */
function isUnlocked(id) { return id <= 1 || (Store.data.stars[id - 1] || 0) > 0 || (Store.data.stars[id] || 0) > 0; }
function renderMenu() {
  const tabs = $('worldTabs'); tabs.innerHTML = '';
  let total = 0; for (const k in Store.data.stars) total += Store.data.stars[k] || 0;
  $('totalStars').textContent = `★ ${total} / ${LEVELS.length * 3}`;
  for (const w of WORLDS) {
    const first = LEVELS.find(l => l.w === w.id);
    const locked = first && !isUnlocked(first.id);
    const st = LEVELS.filter(l => l.w === w.id).reduce((s, l) => s + (Store.data.stars[l.id] || 0), 0);
    const b = document.createElement('button');
    b.className = 'wtab' + (G.world === w.id ? ' on' : '') + (locked ? ' locked' : '');
    b.innerHTML = `<b>${w.id}. ${w.name}</b><span>${w.sub} · ★${st}/30</span>`;
    b.addEventListener('click', () => { G.world = w.id; Audio.click(); renderMenu(); });
    tabs.appendChild(b);
  }
  const grid = $('levelGrid'); grid.innerHTML = '';
  for (const lv of LEVELS.filter(l => l.w === G.world)) {
    const un = isUnlocked(lv.id), st = Store.data.stars[lv.id] || 0, best = Store.data.best[lv.id];
    const b = document.createElement('button');
    b.className = 'lvl' + (un ? '' : ' locked');
    b.innerHTML = `<span class="n">NÍVEL ${lv.id}</span><span class="nm">${lv.name}</span><span class="st">${'★'.repeat(st)}<i>${'★'.repeat(3 - st)}</i></span>${best ? `<span class="bc">${fmtMoney(best)}</span>` : `<span class="bc">${un ? vehicleLabel(lv) : '🔒'}</span>`}`;
    b.addEventListener('click', () => { if (!un) { toast('Complete o nível anterior para liberar.'); Audio.bad(); return; } Audio.click(); startLevel(lv.id); });
    grid.appendChild(b);
  }
}

/* ---------- jogo ---------- */
function startLevel(id, custom) {
  const lv = custom ? normLevel(custom) : levelById(id);
  if (!lv) return;
  G.lv = lv; G.editor = false;
  const saved = Store.data.bridges[lv.id];
  G.br = saved ? cloneBridge(saved) : newBridge();
  sanitizeBridge();
  G.undo = []; G.redo = []; G.sel.clear(); G.clip = null; G.mode = 'build'; G.S = null; G.pending = null; G.ghost = null;
  G.tool = 'pista'; G.mirror = false; G.particles = [];
  $('tMirror').classList.remove('on');
  $('lvTitle').innerHTML = lv.sandbox ? `Sandbox <small>· ${vehicleLabel(lv)}</small>` : `${lv.id === 999 ? 'Editor' : lv.id} · ${lv.name} <small>· ${vehicleLabel(lv)}</small>`;
  buildMatButtons(); setTool('pista'); enterBuildUI();
  showScreen('game'); resize(); fitView();
  onBridgeChanged(true);
  if (lv.hint) { $('hintTxt').textContent = lv.hint; $('hint').classList.remove('hidden'); }
}
function sanitizeBridge() {
  // remove membros que referenciam nós inexistentes (ex.: nível editado)
  const nm = nodeMap(G.lv, G.br);
  G.br.members = G.br.members.filter(m => nm.has(m.a) && nm.has(m.b) && MATS[m.m] && G.lv.mat.includes(m.m));
  pruneJoints(G.br);
  G.br.weld = G.br.weld || {};
}
function snapshot() { return JSON.stringify(G.br); }
function commit() { G.undo.push(snapshot()); G.redo = []; updateUndoButtons(); }
function onBridgeChanged(skipSave) {
  updateBudget(); updateUndoButtons(); G.dirty = true;
  if (!skipSave && G.lv && G.lv.id !== 999) { Store.data.bridges[G.lv.id] = G.br; Store.save(); }
  schedulePreview();
}
function schedulePreview() {
  clearTimeout(G.previewTimer);
  G.previewTimer = setTimeout(() => {
    try { G.preview = stressPreview(G.lv, G.br); } catch (e) { G.preview = null; }
    updateChips(); G.dirty = true;
  }, 70);
}
function doUndo() { if (!G.undo.length) return; G.redo.push(snapshot()); G.br = JSON.parse(G.undo.pop()); G.sel.clear(); Audio.click(); onBridgeChanged(); }
function doRedo() { if (!G.redo.length) return; G.undo.push(snapshot()); G.br = JSON.parse(G.redo.pop()); G.sel.clear(); Audio.click(); onBridgeChanged(); }
function doClear() {
  if (!G.br.members.length) return;
  confirmBox('Limpar a ponte?', 'Todas as peças serão removidas (dá para desfazer).', () => { commit(); G.br = newBridge(); G.sel.clear(); onBridgeChanged(); Audio.erase(); vibe(20); });
}
function enterBuildUI() {
  G.mode = 'build';
  $('tools').classList.remove('hidden'); $('testTools').classList.add('hidden');
  $('btnTest').classList.remove('hidden'); $('btnEdit').classList.add('hidden');
  $('tUndo').classList.remove('hidden'); $('tRedo').classList.remove('hidden');
  $('bottombar').classList.toggle('lefty', !!S_().lefty);
  $('tStress').classList.toggle('on', G.stressView);
  updateSelBar(); updateChips();
}
function enterTestUI() {
  $('tools').classList.add('hidden'); $('testTools').classList.remove('hidden');
  $('btnTest').classList.add('hidden'); $('btnEdit').classList.remove('hidden');
  $('tUndo').classList.add('hidden'); $('tRedo').classList.add('hidden');
  $('selbar').classList.add('hidden'); $('hint').classList.add('hidden');
  $('tStress2').classList.toggle('on', G.stressView);
  updateTestButtons();
}
function updateTestButtons() {
  $('tPlay').innerHTML = G.paused ? '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg>Play' : '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>Pausa';
  $('tSlow').classList.toggle('on', G.slow);
  $('tCam').classList.toggle('on', G.stressCam);
  $('tStress2').classList.toggle('on', G.stressView);
}
function startTest() {
  if (!G.br.members.length) { toast('Construa algo primeiro!'); Audio.bad(); return; }
  if (!deckContinuous(G.lv, G.br)) toast('Atenção: a pista não liga as duas margens.', 2200);
  G.S = createWorld(G.lv, G.br);
  G.mode = 'test'; G.paused = false; G.slow = false; G.resultShown = false; G.acc = 0; G.particles = [];
  G.ghost = null; G.box = null; G.moving = null; G.pending = null;
  enterTestUI(); updateChips();
  Audio.click(); vibe(15);
}
function stopTest() {
  G.S = null; G.mode = 'build'; closeModal(); enterBuildUI(); G.dirty = true;
}
function restartTest() { closeModal(); startTest(); }
function processSimEvents() {
  const S = G.S;
  for (const e of S.events) {
    if (e.type === 'break') { spawnParticles('break', e.x, e.y, e.mat); Audio.brk(e.mat); G.shake = Math.min(18, G.shake + (e.mat === 'concreto' || e.mat === 'aco' ? 12 : 8)); vibe([30, 20, 40]); }
    else if (e.type === 'weld') { spawnParticles('spark', e.x, e.y); Audio.weld(); vibe(15); }
    else if (e.type === 'splash') { spawnParticles('splash', e.x, e.y); Audio.splash(); vibe(60); }
    else if (e.type === 'arrive') { Audio.tone(880, 0.12, 'triangle', 0.12); }
  }
  S.events.length = 0;
}
function finishTest() {
  const S = G.S, lv = G.lv;
  G.resultShown = true;
  const passed = S.state === 'win';
  const cost = bridgeCost(lv, G.br);
  const stars = starsFor(lv, passed, cost, S.maxEver);
  if (passed) {
    Audio.win(); vibe([20, 40, 20]);
    if (!lv.sandbox && lv.id !== 999) {
      if (stars > (Store.data.stars[lv.id] || 0)) Store.data.stars[lv.id] = stars;
      if (!Store.data.best[lv.id] || cost < Store.data.best[lv.id]) Store.data.best[lv.id] = cost;
      Store.data.bridges[lv.id] = G.br; Store.save();
    }
  } else { Audio.lose(); vibe(120); }
  showResult(passed, stars, cost, S);
}

/* ---------- modais ---------- */
function openModal(html) { const m = $('modal'); m.innerHTML = html; m.classList.remove('hidden'); return m; }
function closeModal() { const m = $('modal'); m.classList.add('hidden'); m.innerHTML = ''; }
function confirmBox(title, text, ok) {
  const m = openModal(`<div class="card" style="max-width:420px"><div class="hd"><h2>${title}</h2></div><div class="bd">${text}</div><div class="ft"><button class="btn" id="cNo">Cancelar</button><button class="btn dark" id="cYes">Confirmar</button></div></div>`);
  m.querySelector('#cNo').onclick = () => { closeModal(); };
  m.querySelector('#cYes').onclick = () => { closeModal(); ok(); };
}
function showResult(passed, stars, cost, S) {
  const lv = G.lv;
  const next = LEVELS.find(l => l.id === lv.id + 1);
  const peak = Math.round(S.maxEver * 100);
  const starsHtml = `${'★'.repeat(stars)}<i>${'★'.repeat(3 - stars)}</i>`;
  const best = Store.data.best[lv.id];
  const m = openModal(`<div class="card">
    <div class="hd"><h2>${passed ? 'Ponte aprovada!' : 'Reprovada'}</h2><div class="grow"></div>${lv.sandbox ? '' : `<div class="stars">${starsHtml}</div>`}</div>
    <div class="bd"><div class="res">
      <canvas id="heat" width="600" height="300"></canvas>
      <div class="stats">
        ${passed ? '' : `<div class="stat bad"><span>Motivo</span><b>${FAIL_TEXT[S.failReason] || 'Falhou'}</b></div>`}
        <div class="stat ${!lv.sandbox && cost > lv.budget ? 'bad' : 'good'}"><span>Custo</span><b>${fmtMoney(cost)}</b></div>
        ${lv.sandbox ? '' : `<div class="stat"><span>Orçamento</span><b>${fmtMoney(lv.budget)}</b></div>`}
        <div class="stat ${peak >= 80 ? 'bad' : 'good'}"><span>Tensão máxima</span><b>${peak}%</b></div>
        ${best ? `<div class="stat"><span>Melhor custo</span><b>${fmtMoney(best)}</b></div>` : ''}
        <div style="font-size:12px;color:var(--ink2);margin-top:4px">★ passou · ★★ dentro do orçamento · ★★★ e tensão máx. abaixo de 80%</div>
        <div class="legend">0%<span class="grad"></span>100%+</div>
      </div></div></div>
    <div class="ft"><button class="btn" id="rEdit">Editar</button><button class="btn" id="rRetry">Repetir</button>${passed && next && !lv.sandbox ? '<button class="btn primary" id="rNext">Próximo nível</button>' : ''}${passed && (!next || lv.sandbox) ? '<button class="btn primary" id="rMenu">Menu</button>' : ''}</div></div>`);
  m.querySelector('#rEdit').onclick = () => { Audio.click(); stopTest(); };
  m.querySelector('#rRetry').onclick = () => { Audio.click(); restartTest(); };
  const n = m.querySelector('#rNext'); if (n) n.onclick = () => { Audio.click(); closeModal(); startLevel(next.id); };
  const mm = m.querySelector('#rMenu'); if (mm) mm.onclick = () => { Audio.click(); closeModal(); goMenu(); };
  drawHeatmap(m.querySelector('#heat'), S);
}
function drawHeatmap(c, S) {
  const g = c.getContext('2d'), lv = G.lv, br = G.br, nm = nodeMap(lv, br);
  const peaks = memberPeaks(S);
  let x0 = 0, x1 = lv.W, y0 = Math.min(lv.hl, lv.hr), y1 = Math.max(lv.hl, lv.hr);
  for (const n of nm.values()) { x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x); y0 = Math.min(y0, n.y); y1 = Math.max(y1, n.y); }
  x0 -= 2; x1 += 2; y0 -= 1.5; y1 += 1.5;
  const W = c.width, H = c.height, s = Math.min(W / (x1 - x0), H / (y1 - y0));
  const ox = (W - (x1 - x0) * s) / 2, oy = (H - (y1 - y0) * s) / 2;
  const X = x => ox + (x - x0) * s, Y = y => H - oy - (y - y0) * s;
  g.fillStyle = '#f3efe4'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#d9e6f1'; g.lineWidth = 1;
  for (let x = Math.ceil(x0); x <= x1; x++) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), H); g.stroke(); }
  for (let y = Math.ceil(y0); y <= y1; y++) { g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(W, Y(y)); g.stroke(); }
  g.fillStyle = 'rgba(31,58,95,.18)';
  g.fillRect(0, Y(lv.hl), X(0), H); g.fillRect(X(lv.W), Y(lv.hr), W, H);
  g.lineCap = 'round';
  for (const m of br.members) {
    const a = nm.get(m.a), b = nm.get(m.b), p = peaks[m.id] || { peak: 0 };
    const w = Math.max(3, MATS[m.m].width * s * 0.9);
    g.strokeStyle = '#1f3a5f'; g.lineWidth = w + 2; g.setLineDash(p.broken ? [5, 4] : []);
    g.beginPath(); g.moveTo(X(a.x), Y(a.y)); g.lineTo(X(b.x), Y(b.y)); g.stroke();
    g.strokeStyle = heatColor(p.peak); g.lineWidth = w;
    g.beginPath(); g.moveTo(X(a.x), Y(a.y)); g.lineTo(X(b.x), Y(b.y)); g.stroke();
  }
  g.setLineDash([]);
  for (const a of levelAnchors(lv)) { g.fillStyle = '#e2552d'; g.beginPath(); g.arc(X(a.x), Y(a.y), 5, 0, Math.PI * 2); g.fill(); }
}
function showHelp() {
  const rows = MAT_ORDER.map(k => { const M = MATS[k]; return `<tr><td><span class="sw2" style="background:${M.color}"></span><b>${M.name}</b></td><td>R$${M.cost}/m</td><td>${M.maxL} m</td><td>${M.maxT} kN</td><td>${M.cable ? '—' : M.maxC + ' kN'}</td><td>${Math.round(M.rho * 1000)} kg/m</td></tr>`; }).join('');
  const m = openModal(`<div class="card"><div class="hd"><h2>Como jogar</h2><div class="grow"></div><button class="ib" id="hClose">×</button></div><div class="bd">
  <p><b>Objetivo:</b> ligue as âncoras vermelhas e crie uma pista contínua. Toque <b>TESTAR</b>: todos os veículos precisam chegar à bandeira.</p>
  <p><b>Construir:</b> escolha um material e arraste a partir de uma junta ou âncora. O círculo tracejado mostra o comprimento máximo. Também dá para tocar uma junta e depois tocar o destino.</p>
  <p><b>Juntas:</b> segure uma junta para alternar <b>pino</b> (gira, círculo) e <b>solda</b> (rígida, quadrado, R$${CFG.WELD_COST}). Soldas muito exigidas viram pino.</p>
  <p><b>Selecionar:</b> arraste uma junta para movê-la, arraste no vazio para selecionar em caixa; copie, cole e espelhe. Toque um pistão para inverter (estender ⇡ / recolher ⇣).</p>
  <p><b>Tensão:</b> o preview calcula o veículo mais pesado na pior posição. <span style="color:#d63b2a;font-weight:800">Vermelho = tração</span>, <span style="color:#2c6fd1;font-weight:800">azul = compressão</span>; roxo tracejado = mecanismo instável.</p>
  <p><b>Câmera:</b> pinça para zoom, dois dedos para mover, um dedo no vazio também move. Botão ⤢ enquadra o nível.</p>
  <p><b>Estrelas:</b> ★ passou · ★★ dentro do orçamento · ★★★ e tensão máxima abaixo de 80%.</p>
  <table class="mt"><tr><th>Material</th><th>Custo</th><th>Máx.</th><th>Tração</th><th>Compr.</th><th>Peso</th></tr>${rows}</table>
  <p style="font-size:12.5px;color:var(--ink2)">Pista: única superfície para veículos. Cabo: só tração, fica frouxo. Concreto: só nasce de âncoras ou de outro concreto. Pistão: segue a linha do tempo do nível.</p>
  </div></div>`);
  m.querySelector('#hClose').onclick = closeModal;
}
function showSettings() {
  const s = S_();
  const m = openModal(`<div class="card" style="max-width:460px"><div class="hd"><h2>Configurações</h2><div class="grow"></div><button class="ib" id="stClose">×</button></div><div class="bd">
    <label class="tog">Som <input type="checkbox" id="stSound" ${s.sound ? 'checked' : ''}></label>
    <label class="tog">Vibração <input type="checkbox" id="stHap" ${s.haptics ? 'checked' : ''}></label>
    <label class="tog">Modo canhoto (barra espelhada) <input type="checkbox" id="stLefty" ${s.lefty ? 'checked' : ''}></label>
    <label class="tog">Preview de tensão ligado <input type="checkbox" id="stStress" ${s.stress ? 'checked' : ''}></label>
    <div class="row" style="margin-top:12px"><button class="btn" id="stReset" style="border-color:var(--bad);color:var(--bad)">Apagar progresso</button></div>
  </div></div>`);
  const bind = (id, key) => { m.querySelector(id).onchange = e => { s[key] = e.target.checked; Store.save(); if (key === 'stress') { G.stressView = s.stress; } }; };
  bind('#stSound', 'sound'); bind('#stHap', 'haptics'); bind('#stLefty', 'lefty'); bind('#stStress', 'stress');
  m.querySelector('#stClose').onclick = () => { closeModal(); renderMenu(); };
  m.querySelector('#stReset').onclick = () => confirmBox('Apagar progresso?', 'Estrelas, custos e pontes salvas serão removidos.', () => { Store.reset(); renderMenu(); toast('Progresso apagado'); });
}
function goMenu() {
  if (G.lv && G.lv.id !== 999 && G.mode === 'build' && G.br) { Store.data.bridges[G.lv.id] = G.br; Store.save(); }
  G.S = null; G.mode = 'build'; G.lv = null; G.editor = false; closeModal();
  showScreen('menu'); renderMenu();
}

/* =====================================================================
   INPUT
   ===================================================================== */
const ptrs = new Map();
let act = null; // ação corrente de um dedo
let pinch = null;
let lpTimer = 0;
const HIT_NODE = 24, HIT_MEM = 14;
function screenNode(sx, sy, skipId) {
  let best = null, bd = HIT_NODE;
  for (const n of nodeMap(G.lv, G.br).values()) {
    if (n.id === skipId) continue;
    const d = Math.hypot(wx2sx(n.x) - sx, wy2sy(n.y) - sy);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}
function screenMember(sx, sy) {
  const nm = nodeMap(G.lv, G.br); let best = null, bd = HIT_MEM;
  for (const m of G.br.members) {
    const a = nm.get(m.a), b = nm.get(m.b);
    const ax = wx2sx(a.x), ay = wy2sy(a.y), bx = wx2sx(b.x), by = wy2sy(b.y);
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    let t = ((sx - ax) * dx + (sy - ay) * dy) / L2; t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(ax + dx * t - sx, ay + dy * t - sy);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}
const snapG = v => Math.round(v / CFG.GRID) * CFG.GRID;
function endTarget(from, sx, sy, mat) {
  const M = MATS[mat];
  const n = screenNode(sx, sy, from.id);
  if (n) return { x: n.x, y: n.y, id: n.id, anchor: n.anchor };
  let wx = sx2wx(sx), wy = sy2wy(sy);
  const dx = wx - from.x, dy = wy - from.y, L = Math.hypot(dx, dy);
  if (L > M.maxL) { wx = from.x + dx / L * M.maxL; wy = from.y + dy / L * M.maxL; }
  let gx = snapG(wx), gy = snapG(wy);
  if (Math.hypot(gx - from.x, gy - from.y) > M.maxL + 1e-6) {
    let best = null, bd = 1e9;
    for (let ix = -2; ix <= 2; ix++) for (let iy = -2; iy <= 2; iy++) {
      const px = snapG(wx) + ix * CFG.GRID, py = snapG(wy) + iy * CFG.GRID;
      if (Math.hypot(px - from.x, py - from.y) > M.maxL + 1e-6) continue;
      const d = Math.hypot(px - wx, py - wy); if (d < bd) { bd = d; best = [px, py]; }
    }
    if (best) { gx = best[0]; gy = best[1]; }
  }
  const ex = findNodeAt(G.lv, G.br, gx, gy, 0.01);
  if (ex) return { x: ex.x, y: ex.y, id: ex.id, anchor: ex.anchor };
  return { x: gx, y: gy };
}
const mirrorX = x => G.lv.W - x;
function mirrorPoint(P) {
  const x = mirrorX(P.x), y = P.y;
  const n = findNodeAt(G.lv, G.br, x, y, 0.01);
  return n ? { x: n.x, y: n.y, id: n.id, anchor: n.anchor } : { x, y };
}
function updateGhost(sx, sy) {
  const from = act.from, mat = G.tool;
  const to = endTarget(from, sx, sy, mat);
  const v = validateMember(G.lv, G.br, from, to, mat);
  G.ghost = { a: from, b: to, mat, ok: v.ok, why: v.why };
  if (G.mirror) {
    const ma = mirrorPoint(from), mb = mirrorPoint(to);
    if (Math.abs(ma.x - from.x) > 1e-6 || Math.abs(mb.x - to.x) > 1e-6) G.ghost.mirror = { a: ma, b: mb };
  }
  G.dirty = true;
}
function buildMember(from, to, mat) {
  const v = validateMember(G.lv, G.br, from, to, mat);
  if (!v.ok) { if (v.why) toast(v.why); Audio.bad(); vibe(30); return false; }
  commit();
  addMember(G.lv, G.br, from, to, mat);
  if (G.mirror) {
    const ma = mirrorPoint(from), mb = mirrorPoint(to);
    if (!(Math.abs(ma.x - from.x) < 1e-6 && Math.abs(mb.x - to.x) < 1e-6) && !(Math.abs(ma.x - to.x) < 1e-6 && Math.abs(mb.x - from.x) < 1e-6 && Math.abs(ma.y - to.y) < 1e-6)) {
      // recalcula ids após o primeiro membro criar juntas
      const A = findNodeAt(G.lv, G.br, ma.x, ma.y, 0.01) || ma, B = findNodeAt(G.lv, G.br, mb.x, mb.y, 0.01) || mb;
      addMember(G.lv, G.br, A, B, mat);
    }
  }
  Audio.snap(); vibe(12);
  const b = to; spawnParticles('dust', b.x, b.y);
  onBridgeChanged();
  return true;
}
function toggleWeld(n) {
  if (!membersAt(G.br, n.id).length) { toast('Junta sem peças'); return; }
  commit();
  if (G.br.weld[n.id]) delete G.br.weld[n.id]; else G.br.weld[n.id] = true;
  Audio.weld(); vibe([15, 30, 15]);
  toast(G.br.weld[n.id] ? `Solda (rígida) · +${fmtMoney(CFG.WELD_COST)}` : 'Pino (articulado)');
  onBridgeChanged();
}
function eraseAt(sx, sy, joints, a) {
  const n = joints ? screenNode(sx, sy) : null;
  if (n && !n.anchor) { if (!a.committed) { commit(); a.committed = true; } removeJoint(G.br, n.id); G.sel.delete(n.id); Audio.erase(); vibe(10); onBridgeChanged(); return; }
  const m = screenMember(sx, sy);
  if (m) { if (!a.committed) { commit(); a.committed = true; } removeMember(G.br, m.id); Audio.erase(); vibe(10); onBridgeChanged(); }
}
function moveValid(off) {
  const lv = G.lv, br = G.br, nm = nodeMap(lv, br);
  const pos = id => { const n = nm.get(id); return G.sel.has(id) ? { x: n.x + off.x, y: n.y + off.y } : n; };
  const bb = buildBounds(lv);
  for (const id of G.sel) {
    const p = pos(id);
    if (inSolid(lv, p.x, p.y) || p.x < bb.x0 || p.x > bb.x1 || p.y < bb.y0 || p.y > bb.y1) return false;
    for (const n of nm.values()) if (!G.sel.has(n.id) && Math.hypot(n.x - p.x, n.y - p.y) < 0.01) return false;
  }
  for (const m of br.members) {
    if (!G.sel.has(m.a) && !G.sel.has(m.b)) continue;
    const a = pos(m.a), b = pos(m.b), L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L > MATS[m.m].maxL + 1e-6 || L < CFG.MIN_LEN) return false;
  }
  return true;
}
function applyMove(off) {
  commit();
  for (const j of G.br.joints) if (G.sel.has(j.id)) { j.x = Math.round((j.x + off.x) * 1000) / 1000; j.y = Math.round((j.y + off.y) * 1000) / 1000; }
  Audio.snap(); vibe(10); onBridgeChanged();
}
function selectionClip() {
  // membros que tocam a seleção + todos os seus nós (nós não selecionados viram pontos de encaixe)
  const br = G.br, nm = nodeMap(G.lv, br);
  const ms = br.members.filter(m => G.sel.has(m.a) || G.sel.has(m.b));
  const joints = [], seen = new Set();
  for (const m of ms) for (const id of [m.a, m.b]) if (!seen.has(id)) { seen.add(id); const n = nm.get(id); joints.push({ id, x: n.x, y: n.y, weld: !!br.weld[id] }); }
  return { joints, members: ms.map(m => ({ a: m.a, b: m.b, m: m.m, inv: !!m.inv })) };
}
function copySel() {
  G.clip = selectionClip();
  toast(`${G.clip.members.length} peças copiadas`); Audio.click(); updateSelBar();
}
function pasteClip(transform) {
  const clip = transform ? transform.clip : G.clip; if (!clip || !clip.members.length) return;
  const f = transform ? transform.f : (p => ({ x: p.x + 2, y: p.y + 2 }));
  commit();
  const map = {}; const newSel = new Set();
  for (const j of clip.joints) {
    const p = f(j); const x = snapG(p.x), y = snapG(p.y);
    const ex = findNodeAt(G.lv, G.br, x, y, 0.01);
    map[j.id] = ex ? { x: ex.x, y: ex.y, id: ex.id, anchor: ex.anchor } : { x, y, weld: j.weld };
  }
  let n = 0;
  for (const m of clip.members) {
    const A = map[m.a], B = map[m.b];
    const a = A.id ? A : (findNodeAt(G.lv, G.br, A.x, A.y, 0.01) || A);
    const b = B.id ? B : (findNodeAt(G.lv, G.br, B.x, B.y, 0.01) || B);
    if (addMember(G.lv, G.br, a, b, m.m, { inv: m.inv })) n++;
  }
  for (const j of clip.joints) {
    const A = map[j.id], node = findNodeAt(G.lv, G.br, A.x, A.y, 0.01);
    if (node && !node.anchor) { newSel.add(node.id); if (j.weld) G.br.weld[node.id] = true; }
  }
  G.sel = newSel;
  if (!n) { G.undo.pop(); toast('Nada coube aqui'); Audio.bad(); return; }
  Audio.snap(); vibe(12); onBridgeChanged(); updateSelBar();
  toast(transform ? 'Espelhado' : 'Colado (+2 m) — arraste para posicionar');
}
function mirrorSel() {
  pasteClip({ clip: selectionClip(), f: p => ({ x: mirrorX(p.x), y: p.y }) });
}
function deleteSel() {
  if (!G.sel.size) return;
  commit();
  for (const id of [...G.sel]) removeJoint(G.br, id);
  G.sel.clear(); Audio.erase(); vibe(15); onBridgeChanged(); updateSelBar();
}

function onDown(e) {
  e.preventDefault();
  Audio.unlock();
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() });
  if (ptrs.size === 2) {
    cancelAction();
    const [a, b] = [...ptrs.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, s: G.cam.s, cx: G.cam.x, cy: G.cam.y };
    pinch.wx = sx2wx(pinch.mx); pinch.wy = sy2wy(pinch.my);
    G.userCam = true; G.stressCam = false; if (G.mode === 'test') updateTestButtons();
    return;
  }
  if (ptrs.size > 2) return;
  const sx = e.clientX, sy = e.clientY;
  if (G.screen !== 'game' || !G.lv) return;
  if (G.mode === 'test') { act = { type: 'pan', lx: sx, ly: sy }; return; }
  if (!$('hint').classList.contains('hidden')) $('hint').classList.add('hidden');
  if (G.editor) { act = { type: 'editor', lx: sx, ly: sy }; return; }
  const node = screenNode(sx, sy);
  clearTimeout(lpTimer);
  if (node) lpTimer = setTimeout(() => { if (act && !act.moved) { act = null; G.ghost = null; G.moving = null; toggleWeld(node); } }, 520);
  if (G.tool === 'erase') { act = { type: 'erase', lx: sx, ly: sy }; return; }
  if (G.tool === 'select') {
    if (node && !node.anchor) {
      if (!G.sel.has(node.id)) { G.sel.clear(); G.sel.add(node.id); }
      act = { type: 'move', sx, sy, node }; G.moving = { off: { x: 0, y: 0 }, invalid: false }; updateSelBar(); G.dirty = true;
    } else act = { type: 'box', sx, sy, lx: sx, ly: sy, node };
    return;
  }
  // material
  if (node) { act = { type: 'build', from: node, sx, sy }; }
  else act = { type: 'pan', lx: sx, ly: sy, tap: true };
}
function onMove(e) {
  const p = ptrs.get(e.pointerId); if (!p) return;
  e.preventDefault();
  p.x = e.clientX; p.y = e.clientY;
  if (pinch && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    G.cam.s = Math.max(4, Math.min(160, pinch.s * d / Math.max(10, pinch.d)));
    // mantém o ponto do mundo sob o centro da pinça
    G.cam.x = pinch.wx - (mx - VW / 2) / G.cam.s;
    G.cam.y = pinch.wy + (my - VH / 2) / G.cam.s;
    G.dirty = true; return;
  }
  if (!act) return;
  const sx = e.clientX, sy = e.clientY;
  const dist = Math.hypot(sx - p.x0, sy - p.y0);
  if (dist > 8) { act.moved = true; clearTimeout(lpTimer); }
  switch (act.type) {
    case 'pan': G.cam.x -= (sx - act.lx) / G.cam.s; G.cam.y += (sy - act.ly) / G.cam.s; act.lx = sx; act.ly = sy; G.userCam = true; G.stressCam = false; G.dirty = true; break;
    case 'build': if (act.moved) updateGhost(sx, sy); break;
    case 'erase': if (act.moved) eraseAt(sx, sy, false, act); break;
    case 'move': {
      const off = { x: snapG(sx2wx(sx) - sx2wx(act.sx)), y: snapG(sy2wy(sy) - sy2wy(act.sy)) };
      G.moving = { off, invalid: !moveValid(off) }; G.dirty = true; break;
    }
    case 'box': if (act.moved) { G.box = { x0: act.sx, y0: act.sy, x1: sx, y1: sy }; G.dirty = true; } break;
    case 'editor': if (act.moved) { G.cam.x -= (sx - act.lx) / G.cam.s; G.cam.y += (sy - act.ly) / G.cam.s; G.dirty = true; } act.lx = sx; act.ly = sy; break;
  }
}
function onUp(e) {
  const p = ptrs.get(e.pointerId);
  ptrs.delete(e.pointerId);
  clearTimeout(lpTimer);
  if (pinch) { if (ptrs.size < 2) pinch = null; act = null; return; }
  if (!act || !p) return;
  const sx = e.clientX, sy = e.clientY, tap = !act.moved && performance.now() - p.t0 < 450;
  const a = act; act = null;
  switch (a.type) {
    case 'build':
      if (tap) {
        if (G.pending && G.pending !== a.from.id) { const from = nodeMap(G.lv, G.br).get(G.pending); G.pending = null; if (from) buildMember(from, { x: a.from.x, y: a.from.y, id: a.from.id, anchor: a.from.anchor }, G.tool); }
        else { G.pending = G.pending === a.from.id ? null : a.from.id; Audio.click(); }
      } else if (G.ghost) { const g = G.ghost; G.ghost = null; if (g.ok) buildMember(g.a, g.b, g.mat); else { if (g.why) toast(g.why); Audio.bad(); } }
      G.ghost = null; break;
    case 'pan':
      if (tap && a.tap && G.pending && G.mode === 'build') {
        const from = nodeMap(G.lv, G.br).get(G.pending); G.pending = null;
        if (from) { const to = endTarget(from, sx, sy, G.tool); buildMember(from, to, G.tool); }
      }
      break;
    case 'move':
      if (a.moved && G.moving && !G.moving.invalid && (G.moving.off.x || G.moving.off.y)) applyMove(G.moving.off);
      else if (a.moved && G.moving && G.moving.invalid) { toast('Posição inválida'); Audio.bad(); }
      G.moving = null; break;
    case 'box':
      if (a.moved && G.box) {
        const b = G.box, x0 = Math.min(b.x0, b.x1), x1 = Math.max(b.x0, b.x1), y0 = Math.min(b.y0, b.y1), y1 = Math.max(b.y0, b.y1);
        G.sel.clear();
        for (const j of G.br.joints) { const X = wx2sx(j.x), Y = wy2sy(j.y); if (X >= x0 && X <= x1 && Y >= y0 && Y <= y1) G.sel.add(j.id); }
        Audio.click();
      } else if (tap) {
        const m = screenMember(sx, sy);
        if (m && MATS[m.m].piston) { commit(); m.inv = !m.inv; if (!m.inv) delete m.inv; toast(m.inv ? 'Pistão: recolhe ⇣' : 'Pistão: estende ⇡'); Audio.weld(); onBridgeChanged(); }
        else G.sel.clear();
      }
      G.box = null; updateSelBar(); break;
    case 'erase':
      if (tap) eraseAt(sx, sy, true, a); break;
    case 'editor':
      if (tap) editorTap(sx, sy); break;
  }
  G.dirty = true;
}
function cancelAction() { act = null; G.ghost = null; G.box = null; G.moving = null; clearTimeout(lpTimer); G.dirty = true; }
function onWheel(e) {
  if (G.screen !== 'game') return;
  e.preventDefault();
  const k = Math.exp(-e.deltaY * 0.0015);
  const wx = sx2wx(e.clientX), wy = sy2wy(e.clientY);
  G.cam.s = Math.max(4, Math.min(160, G.cam.s * k));
  G.cam.x = wx - (e.clientX - VW / 2) / G.cam.s; G.cam.y = wy + (e.clientY - VH / 2) / G.cam.s;
  G.userCam = true; G.dirty = true;
}
function onKey(e) {
  if (G.screen !== 'game' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && G.sel.size) copySel();
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && G.clip) pasteClip();
  else if (e.key === 'Delete' || e.key === 'Backspace') deleteSel();
  else if (e.key === ' ' && G.mode === 'test') { G.paused = !G.paused; updateTestButtons(); }
  else if (e.key === 'Escape') { if (!$('modal').classList.contains('hidden')) closeModal(); else if (G.mode === 'test') stopTest(); }
}

/* =====================================================================
   EDITOR DE NÍVEIS (oculto: segure o título)
   ===================================================================== */
function levelToJSON(lv) {
  const o = { id: 999, w: lv.w || 1, name: lv.name, hint: lv.hint, W: lv.W, hl: lv.hl, hr: lv.hr, floor: lv.floor, anchors: lv.anchors, rocks: lv.rocks, water: lv.water, veh: lv.veh, mat: lv.mat, ev: lv.ev, budget: lv.budget };
  return JSON.stringify(o);
}
function openEditor(base) {
  const src = base || Store.data.custom || levelById(1);
  const lv = normLevel(JSON.parse(levelToJSON(src)));
  lv.id = 999;
  startLevel(999, lv);
  G.editor = true;
  $('hint').classList.add('hidden');
  $('lvTitle').innerHTML = 'Editor de níveis <small>· toque na grade para pôr/tirar âncoras</small>';
  renderEditorPanel();
}
function renderEditorPanel() {
  const lv = G.lv, p = $('editorPanel');
  p.classList.remove('hidden');
  const opts = ['<option value="">— base —</option>'].concat(LEVELS.map(l => `<option value="${l.id}">${l.id}. ${l.name}</option>`)).join('');
  p.innerHTML = `<h3>Editor</h3><div class="bd">
    <div class="row"><select id="edBase">${opts}</select></div>
    <div class="row"><label class="f">Nome<input type="text" id="edName" value="${(lv.name || '').replace(/"/g, '&quot;')}"></label></div>
    <div class="row"><label class="f">Vão W<input type="number" id="edW" value="${lv.W}" min="4" max="60"></label><label class="f">Orçamento<input type="number" id="edB" value="${lv.budget}" step="500"></label></div>
    <div class="row"><label class="f">Margem esq.<input type="number" id="edHl" value="${lv.hl}"></label><label class="f">Margem dir.<input type="number" id="edHr" value="${lv.hr}"></label><label class="f">Fundo<input type="number" id="edF" value="${lv.floor}"></label></div>
    <div class="row"><label class="f">Água (vazio = sem)<input type="number" id="edWa" value="${lv.water ? lv.water.y : ''}"></label></div>
    <div class="row"><button class="btn" id="edApply">Aplicar campos</button></div>
    <label class="f">JSON do nível</label><textarea id="edJson"></textarea>
    <div class="row"><button class="btn" id="edCopy">Exportar (copiar)</button><button class="btn" id="edPaste">Importar (colar)</button></div>
    <div class="row"><button class="btn" id="edLoad">Carregar JSON</button><button class="btn primary" id="edPlay">Jogar nível</button></div>
  </div>`;
  const ta = p.querySelector('#edJson'); ta.value = levelToJSON(lv);
  const num = (id, d) => { const v = parseFloat(p.querySelector(id).value); return Number.isFinite(v) ? v : d; };
  p.querySelector('#edBase').onchange = e => { const id = +e.target.value; if (id) { const b = levelById(id); applyEditorLevel(JSON.parse(levelToJSON(b))); } };
  p.querySelector('#edApply').onclick = () => {
    const o = JSON.parse(levelToJSON(G.lv));
    o.name = p.querySelector('#edName').value || 'Meu nível';
    o.W = Math.max(4, Math.min(60, Math.round(num('#edW', o.W))));
    o.budget = Math.max(0, Math.round(num('#edB', o.budget)));
    o.hl = Math.round(num('#edHl', o.hl)); o.hr = Math.round(num('#edHr', o.hr)); o.floor = Math.round(num('#edF', o.floor));
    const wv = p.querySelector('#edWa').value.trim();
    o.water = wv === '' ? null : Object.assign({}, o.water || {}, { y: parseFloat(wv) });
    // mantém âncoras das margens coerentes
    o.anchors = o.anchors.map(([x, y]) => [x >= (G.lv.W - 1e-6) && G.lv.W !== o.W ? x - G.lv.W + o.W : x, y]);
    applyEditorLevel(o);
  };
  p.querySelector('#edCopy').onclick = () => copyText(ta.value);
  p.querySelector('#edPaste').onclick = () => pasteText(t => { ta.value = t; loadEditorJSON(t); });
  p.querySelector('#edLoad').onclick = () => loadEditorJSON(ta.value);
  p.querySelector('#edPlay').onclick = () => { Store.data.custom = JSON.parse(levelToJSON(G.lv)); Store.save(); const c = Store.data.custom; G.editor = false; $('editorPanel').classList.add('hidden'); startLevel(999, c); };
}
function loadEditorJSON(t) {
  try {
    const o = JSON.parse(t);
    if (!o || typeof o.W !== 'number' || !Array.isArray(o.anchors)) throw new Error('formato');
    applyEditorLevel(o); toast('Nível carregado');
  } catch (e) { toast('JSON inválido'); Audio.bad(); }
}
function applyEditorLevel(o) {
  o.id = 999;
  const lv = normLevel(o);
  lv.mat = (lv.mat || []).filter(m => MATS[m]); if (!lv.mat.length) lv.mat = MAT_ORDER.slice();
  lv.veh = (lv.veh || []).filter(v => VEH[v.t]); if (!lv.veh.length) lv.veh = [{ t: 'carro', at: 0 }];
  G.lv = lv; G.br = newBridge(); Store.data.custom = JSON.parse(levelToJSON(lv)); Store.save();
  buildMatButtons(); setTool(G.tool); fitView(); onBridgeChanged(true); renderEditorPanel();
}
function editorTap(sx, sy) {
  const lv = G.lv, x = snapG(sx2wx(sx)), y = snapG(sy2wy(sy));
  const i = lv.anchors.findIndex(a => Math.hypot(a[0] - x, a[1] - y) < 0.01);
  const o = JSON.parse(levelToJSON(lv));
  if (i >= 0) o.anchors.splice(i, 1); else o.anchors.push([x, y]);
  Audio.snap(); applyEditorLevel(o);
}
function copyText(t) {
  const fallback = () => {
    try { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); toast(ok ? 'Copiado!' : 'Selecione e copie o texto'); } catch (e) { toast('Selecione e copie o texto'); }
  };
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => toast('Copiado para a área de transferência'), fallback); else fallback(); } catch (e) { fallback(); }
}
function pasteText(cb) {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) { navigator.clipboard.readText().then(t => cb(t), () => toast('Cole o JSON na caixa e toque “Carregar JSON”')); return; }
  } catch (e) { /* segue */ }
  toast('Cole o JSON na caixa e toque “Carregar JSON”');
}

/* =====================================================================
   LOOP PRINCIPAL
   ===================================================================== */
let lastT = performance.now();
G.acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  try {
    if (G.screen === 'game' && G.mode === 'test' && G.S) {
      const S = G.S;
      if (!G.paused) {
        G.acc += dt;
        let n = 0;
        while (G.acc >= CFG.DT && n < 3) { stepWorld(S, G.slow ? CFG.SUB / 4 : CFG.SUB); G.acc -= CFG.DT; n++; }
        if (n === 3) G.acc = 0;
      }
      processSimEvents();
      if (S.maxNow > 0.7 && !G.paused) Audio.creak(Math.min(1, (S.maxNow - 0.7) / 0.3));
      if (G.stressCam && S.hot) {
        const c = S.hot, tx = (c.pa.x + c.pb.x) / 2, ty = (c.pa.y + c.pb.y) / 2;
        G.cam.x += (tx - G.cam.x) * 0.08; G.cam.y += (ty - G.cam.y) * 0.08;
        const ts = Math.max(G.cam.s, 38); G.cam.s += (ts - G.cam.s) * 0.05;
      }
      $('clock').textContent = fmtNum(S.t) + ' s';
      if (S.state !== 'run' && !G.resultShown && S.endT > (S.state === 'win' ? 1.0 : 2.2)) finishTest();
      if ((G.frameN = (G.frameN || 0) + 1) % 6 === 0) updateChips();
      render(dt);
    } else if (G.screen === 'game') {
      render(dt);
    }
  } catch (err) {
    // nunca deixa o loop morrer
    if (!G.loopErr) { G.loopErr = true; setTimeout(() => { G.loopErr = false; }, 3000); if (window.console) console.warn(err); }
  }
  requestAnimationFrame(frame);
}

/* =====================================================================
   BOOT
   ===================================================================== */
function bind() {
  cv.addEventListener('pointerdown', onDown, { passive: false });
  cv.addEventListener('pointermove', onMove, { passive: false });
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); pinch = null; cancelAction(); });
  cv.addEventListener('wheel', onWheel, { passive: false });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  // bloqueia rolagem/zoom da página fora das áreas roláveis
  document.addEventListener('touchmove', e => { if (!e.target.closest('#levelGrid,#mats,#worldTabs,.bd,textarea')) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault());
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'test') { G.paused = true; updateTestButtons(); } });
  document.addEventListener('pointerdown', () => Audio.unlock(), { capture: true });

  $('btnBack').onclick = () => { Audio.click(); if (G.mode === 'test') stopTest(); else goMenu(); };
  $('btnFit').onclick = () => { Audio.click(); fitView(); };
  $('btnHelp').onclick = () => { Audio.click(); showHelp(); };
  $('btnHelp2').onclick = () => { Audio.click(); showHelp(); };
  $('btnSettings').onclick = () => { Audio.click(); showSettings(); };
  $('btnSandbox').onclick = () => { Audio.click(); startLevel(0); };
  $('hintX').onclick = () => $('hint').classList.add('hidden');
  $('hint').onclick = () => $('hint').classList.add('hidden');
  $('tSel').onclick = () => { Audio.click(); setTool(G.tool === 'select' ? (G.lv.mat[0]) : 'select'); };
  $('tErase').onclick = () => { Audio.click(); setTool(G.tool === 'erase' ? (G.lv.mat[0]) : 'erase'); };
  $('tMirror').onclick = () => { G.mirror = !G.mirror; $('tMirror').classList.toggle('on', G.mirror); Audio.click(); toast(G.mirror ? `Espelho: simetria em x = ${fmtNum(G.lv.W / 2)} m` : 'Espelho desligado'); updateChips(); };
  const togStress = () => { G.stressView = !G.stressView; S_().stress = G.stressView; Store.save(); $('tStress').classList.toggle('on', G.stressView); $('tStress2').classList.toggle('on', G.stressView); Audio.click(); updateChips(); G.dirty = true; };
  $('tStress').onclick = togStress; $('tStress2').onclick = togStress;
  $('tUndo').onclick = doUndo; $('tRedo').onclick = doRedo; $('tClear').onclick = doClear;
  $('btnTest').onclick = startTest;
  $('btnEdit').onclick = () => { Audio.click(); stopTest(); };
  $('tPlay').onclick = () => { G.paused = !G.paused; Audio.click(); updateTestButtons(); updateChips(); };
  $('tSlow').onclick = () => { G.slow = !G.slow; Audio.click(); updateTestButtons(); updateChips(); };
  $('tRestart').onclick = () => { Audio.click(); restartTest(); };
  $('tCam').onclick = () => { G.stressCam = !G.stressCam; if (!G.stressCam) fitView(); Audio.click(); updateTestButtons(); updateChips(); };
  $('sCopy').onclick = copySel; $('sPaste').onclick = () => pasteClip(); $('sMirror').onclick = mirrorSel; $('sDel').onclick = deleteSel;
  // segurar o título abre o editor oculto
  let titleT = 0;
  const title = $('title');
  title.addEventListener('pointerdown', () => { clearTimeout(titleT); titleT = setTimeout(() => { vibe(40); Audio.weld(); openEditor(); }, 900); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) title.addEventListener(ev, () => clearTimeout(titleT));
  title.addEventListener('contextmenu', e => e.preventDefault());
}
bind();
resize();
renderMenu();
showScreen('menu');
requestAnimationFrame(frame);
// para testes automatizados
window.__PM = { G, startLevel, startTest, stopTest, openEditor, goMenu, Store };
})();
