'use strict';
/* =====================================================================
   CONFIG
   Unidades: metros, toneladas (t), quilonewtons (kN), segundos.
   ===================================================================== */
const CFG = {
  G: 9.81,
  DT: 1 / 60,          // passo fixo de simulação (um "tick")
  SUB: 24,             // subpassos por tick (XPBD small-steps)
  GRID: 1,             // grade de encaixe (m)
  WELD_COST: 50,       // R$ por junta soldada
  WELD_K: 900,         // rigidez angular da solda (kN·m/rad)
  WELD_MMAX: 28,       // momento máximo da solda (kN·m) antes de virar pino
  LIP: 0.3,            // extensão de contato nas pontas livres da pista (m)
  START_OFF: 11,       // distância do início do veículo até a margem
  FLAG_OFF: 9,         // distância da bandeira após a margem
  TIME_LIMIT: 90,
  STUCK_T: 9,
  BUILD_MARGIN: 4,
  BUILD_TOP: 15,
  FILTER: 0.08,        // filtro passa-baixa da tensão (por subpasso)
  DAMP_MEMBER: 0.06,
  DAMP_VEH: 0.05,
  WATER_DRAG: 2.5,
  BUOY: 0.09,          // empuxo por metro de barra submersa (t/m)
  MU: 0.95,
  JOINT_MASS: 0.02,
  MIN_LEN: 0.9,
  SETTLE: 0.6          // s de carga gradual da gravidade na estrutura
};
CFG.H = CFG.DT / CFG.SUB;

/* =====================================================================
   MATERIALS
   rho: t/m · EA: kN · maxT/maxC: kN · maxL: m · cost: R$/m
   ===================================================================== */
const MATS = {
  pista:     { name: 'Pista',     color: '#39434e', width: 0.34, rho: 0.12,  EA: 1.2e5, maxT: 110, maxC: 110, maxL: 4,  cost: 120, deck: true },
  madeira:   { name: 'Madeira',   color: '#b07a3a', width: 0.2,  rho: 0.03,  EA: 5e4,   maxT: 55,  maxC: 45,  maxL: 3.2, cost: 55 },
  aco:       { name: 'Aço',       color: '#556f8c', width: 0.2,  rho: 0.06,  EA: 2e5,   maxT: 220, maxC: 190, maxL: 6,  cost: 170 },
  cabo:      { name: 'Cabo',      color: '#2b2b2b', width: 0.07, rho: 0.008, EA: 8e4,   maxT: 160, maxC: 0,   maxL: 16, cost: 30, cable: true },
  aluminio:  { name: 'Alumínio',  color: '#9aa8b5', width: 0.2,  rho: 0.022, EA: 9e4,   maxT: 140, maxC: 120, maxL: 5,  cost: 230 },
  concreto:  { name: 'Concreto',  color: '#8f8b80', width: 0.42, rho: 0.25,  EA: 4e5,   maxT: 30,  maxC: 650, maxL: 5,  cost: 120, concrete: true },
  composito: { name: 'Compósito', color: '#2e6f62', width: 0.2,  rho: 0.028, EA: 2.6e5, maxT: 320, maxC: 280, maxL: 7,  cost: 380 },
  pistao:    { name: 'Pistão',    color: '#d39324', width: 0.26, rho: 0.08,  EA: 2e5,   maxT: 300, maxC: 300, maxL: 5,  cost: 420, piston: true }
};
const MAT_ORDER = ['pista', 'madeira', 'aco', 'cabo', 'aluminio', 'concreto', 'composito', 'pistao'];

/* VEÍCULOS: m (t), L/H (m), r raio da roda, ax eixos (m, relativo ao centro),
   v velocidade (m/s), F força motora total (kN) */
const VEH = {
  carro:    { name: 'Carro',    m: 1.2, L: 3.6, H: 1.35, r: 0.36, ax: [-1.2, 1.25],      v: 9,   F: 6,   col: '#e9b44c' },
  van:      { name: 'Van',      m: 2.4, L: 4.8, H: 2.1,  r: 0.4,  ax: [-1.6, 1.7],       v: 8,   F: 10,  col: '#7fb3d5' },
  onibus:   { name: 'Ônibus',   m: 7,   L: 9,   H: 2.9,  r: 0.5,  ax: [-3.0, 3.0],       v: 7,   F: 22,  col: '#e07b39' },
  caminhao: { name: 'Caminhão', m: 10,  L: 8,   H: 3.0,  r: 0.5,  ax: [-3.0, -1.8, 2.8], v: 5.5, F: 26,  col: '#7d8f4e' },
  moto:     { name: 'Moto',     m: 0.25, L: 1.9, H: 1.15, r: 0.32, ax: [-0.7, 0.72],     v: 13,  F: 4,   col: '#c0392b' }
};

/* =====================================================================
   LEVELS (helpers; os dados JSON ficam em <script id="levels-data">)
   ===================================================================== */
const LEVELS = ((typeof document !== 'undefined')
  ? JSON.parse(document.getElementById('levels-data').textContent)
  : globalThis.__LEVELS).map(l => normLevel(l));
const WORLDS = [
  { id: 1, name: 'Interior', sub: 'Madeira e o básico' },
  { id: 2, name: 'Rio', sub: 'Cabos e pontes suspensas' },
  { id: 3, name: 'Represa', sub: 'Água, cheias e tremores' },
  { id: 4, name: 'Porto', sub: 'Básculas, pistões e barcos' }
];
const SANDBOX = normLevel({
  id: 0, w: 0, name: 'Sandbox', hint: 'Modo livre: orçamento ilimitado e todos os materiais.',
  W: 30, hl: 0, hr: 0, floor: -10,
  anchors: [[0, 0], [30, 0], [0, -4], [30, -4], [0, 9], [30, 9], [10, -10], [20, -10]],
  rocks: [], water: { y: -6 }, veh: [{ t: 'carro', at: 0 }, { t: 'caminhao', at: 2.5 }],
  mat: MAT_ORDER.slice(), budget: 0, ev: {}, sandbox: true
});

function levelById(id) {
  if (id === 0) return SANDBOX;
  return LEVELS.find(l => l.id === id) || null;
}
function normLevel(lv) {
  // garante campos padrão (usado também pelo editor)
  const d = Object.assign({ hl: 0, hr: 0, floor: -8, rocks: [], water: null, ev: {}, mat: ['pista', 'madeira'], budget: 5000, veh: [{ t: 'carro', at: 0 }], hint: '' }, lv);
  d.ev = Object.assign({}, d.ev);
  d.veh = d.veh.slice().sort((a, b) => (a.at || 0) - (b.at || 0));
  return d;
}
function levelAnchors(lv) {
  return lv.anchors.map((p, i) => ({ id: 'a' + i, x: p[0], y: p[1], anchor: true }));
}
function heaviestVehicle(lv) {
  let best = null;
  for (const v of lv.veh) { const T = VEH[v.t]; if (T && (!best || T.m > best.m)) best = T; }
  return best || VEH.carro;
}
function vehicleLabel(lv) {
  const names = [];
  for (const v of lv.veh) { const n = VEH[v.t].name; if (!names.includes(n)) names.push(n); }
  return names.join(' + ');
}
function inSolid(lv, x, y) {
  const e = 1e-6;
  if (x < -e && y < lv.hl - e) return true;
  if (x > lv.W + e && y < lv.hr - e) return true;
  if (y < lv.floor - e) return true;
  for (const r of lv.rocks || []) {
    if (x > r.x - r.w / 2 + e && x < r.x + r.w / 2 - e && y < r.top - e) return true;
  }
  return false;
}
function buildBounds(lv) {
  return { x0: -CFG.BUILD_MARGIN, x1: lv.W + CFG.BUILD_MARGIN, y0: lv.floor, y1: Math.max(lv.hl, lv.hr) + CFG.BUILD_TOP };
}

/* ---------- Modelo da ponte (compartilhado por UI, física e testes) ---------- */
function newBridge() { return { joints: [], members: [], weld: {}, next: 1 }; }
function cloneBridge(b) { return JSON.parse(JSON.stringify(b)); }
function nodeMap(lv, br) {
  const m = new Map();
  for (const a of levelAnchors(lv)) m.set(a.id, a);
  for (const j of br.joints) m.set(j.id, j);
  return m;
}
function memberLen(nm, mb) {
  const a = nm.get(mb.a), b = nm.get(mb.b);
  return Math.hypot(b.x - a.x, b.y - a.y);
}
function bridgeCost(lv, br) {
  const nm = nodeMap(lv, br);
  let c = 0;
  for (const mb of br.members) c += memberLen(nm, mb) * MATS[mb.m].cost;
  for (const id in br.weld) if (br.weld[id] && nm.has(id)) c += CFG.WELD_COST;
  return Math.round(c);
}
function findNodeAt(lv, br, x, y, tol) {
  let best = null, bd = tol;
  for (const n of nodeMap(lv, br).values()) {
    const d = Math.hypot(n.x - x, n.y - y);
    if (d <= bd) { bd = d; best = n; }
  }
  return best;
}
function membersAt(br, id) { return br.members.filter(m => m.a === id || m.b === id); }
function isConcreteRoot(br, id) {
  if (id[0] === 'a') return true;
  return br.members.some(m => m.m === 'concreto' && (m.a === id || m.b === id));
}
/* Valida um novo membro entre dois pontos (nós existentes ou pontos da grade). */
function validateMember(lv, br, A, B, mat) {
  const M = MATS[mat];
  const L = Math.hypot(B.x - A.x, B.y - A.y);
  if (L < CFG.MIN_LEN) return { ok: false, why: 'Muito curto' };
  if (L > M.maxL + 1e-6) return { ok: false, why: 'Comprimento máximo: ' + M.maxL + ' m' };
  const bb = buildBounds(lv);
  for (const P of [A, B]) {
    if (!P.id) {
      if (P.x < bb.x0 || P.x > bb.x1 || P.y < bb.y0 || P.y > bb.y1) return { ok: false, why: 'Fora da área de construção' };
      if (inSolid(lv, P.x, P.y)) return { ok: false, why: 'Dentro do terreno' };
    }
  }
  if (A.id && B.id) {
    if (A.id === B.id) return { ok: false, why: '' };
    if (br.members.some(m => (m.a === A.id && m.b === B.id) || (m.a === B.id && m.b === A.id))) return { ok: false, why: 'Já existe' };
  }
  if (A.anchor && B.anchor && !M.piston) return { ok: false, why: 'Âncora a âncora não faz nada' };
  if (M.concrete) {
    const ra = A.id && isConcreteRoot(br, A.id), rb = B.id && isConcreteRoot(br, B.id);
    if (!ra && !rb) return { ok: false, why: 'Concreto só nasce de âncoras ou de outro concreto' };
  }
  return { ok: true, L };
}
/* Adiciona membro; cria juntas se necessário. Retorna o membro ou null. */
function addMember(lv, br, A, B, mat, opts) {
  const v = validateMember(lv, br, A, B, mat);
  if (!v.ok) return null;
  const ida = A.id || addJoint(br, A.x, A.y);
  const idb = B.id || addJoint(br, B.x, B.y);
  if (br.members.some(m => (m.a === ida && m.b === idb) || (m.a === idb && m.b === ida))) return null;
  const mb = { id: 'm' + (br.next++), a: ida, b: idb, m: mat };
  if (opts && opts.inv) mb.inv = true;
  br.members.push(mb);
  return mb;
}
function addJoint(br, x, y) {
  const j = { id: 'j' + (br.next++), x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 };
  br.joints.push(j);
  return j.id;
}
function removeMember(br, mid) {
  br.members = br.members.filter(m => m.id !== mid);
  pruneJoints(br);
}
function removeJoint(br, jid) {
  if (jid[0] === 'a') {
    br.members = br.members.filter(m => m.a !== jid && m.b !== jid);
    delete br.weld[jid];
  } else {
    br.members = br.members.filter(m => m.a !== jid && m.b !== jid);
    br.joints = br.joints.filter(j => j.id !== jid);
    delete br.weld[jid];
  }
  pruneJoints(br);
}
function pruneJoints(br) {
  const used = new Set();
  for (const m of br.members) { used.add(m.a); used.add(m.b); }
  br.joints = br.joints.filter(j => used.has(j.id));
  for (const id in br.weld) if (!used.has(id)) delete br.weld[id];
}
function deckContinuous(lv, br) {
  // BFS pelos membros de pista entre âncoras das margens superiores
  const nm = nodeMap(lv, br);
  const starts = [], ends = new Set();
  for (const n of nm.values()) {
    if (!n.anchor) continue;
    if (Math.abs(n.x) < 1e-6 && Math.abs(n.y - lv.hl) < 1e-6) starts.push(n.id);
    if (Math.abs(n.x - lv.W) < 1e-6 && Math.abs(n.y - lv.hr) < 1e-6) ends.add(n.id);
  }
  const adj = new Map();
  for (const m of br.members) if (m.m === 'pista') {
    if (!adj.has(m.a)) adj.set(m.a, []); if (!adj.has(m.b)) adj.set(m.b, []);
    adj.get(m.a).push(m.b); adj.get(m.b).push(m.a);
  }
  const seen = new Set(starts), q = starts.slice();
  while (q.length) { const c = q.pop(); if (ends.has(c)) return true; for (const n of adj.get(c) || []) if (!seen.has(n)) { seen.add(n); q.push(n); } }
  return false;
}

/* =====================================================================
   EVENTS (funções de linha do tempo, determinísticas)
   ===================================================================== */
function smooth01(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
function waterAt(lv, t) {
  if (!lv.water) return null;
  const w = lv.water;
  if (!w.rise) return w.y;
  const [t0, t1, y1] = w.rise;
  return w.y + (y1 - w.y) * smooth01((t - t0) / (t1 - t0));
}
function windAt(lv, t) {
  const w = lv.ev && lv.ev.wind;
  if (!w) return 0;
  const per = w.per || 4;
  const ramp = smooth01((t - (w.t0 || 1)) / 2);
  const g = 0.55 + 0.45 * Math.sin(2 * Math.PI * t / per) * (0.75 + 0.25 * Math.sin(2 * Math.PI * t * 0.31 + 1.3));
  return w.amp * ramp * g;
}
function quakeAt(lv, t) {
  const q = lv.ev && lv.ev.quake;
  if (!q) return [0, 0, 0, 0];
  const env = smooth01((t - q.t0) / 1.5) * (1 - smooth01((t - q.t1) / 1.5));
  const w = 2 * Math.PI * q.f;
  const x = q.amp * env * Math.sin(w * t);
  const y = 0.35 * q.amp * env * Math.sin(w * 1.7 * t + 0.5);
  const vx = q.amp * env * w * Math.cos(w * t);
  const vy = 0.35 * q.amp * env * w * 1.7 * Math.cos(w * 1.7 * t + 0.5);
  return [x, y, vx, vy];
}
function pistonAt(lv, t) {
  const p = lv.ev && lv.ev.pist;
  if (!p || !p.length) return 1;
  if (t <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) {
    if (t <= p[i][0]) {
      const [ta, fa] = p[i - 1], [tb, fb] = p[i];
      return fa + (fb - fa) * smooth01((t - ta) / (tb - ta));
    }
  }
  return p[p.length - 1][1];
}
function boatState(lv, t) {
  const b = lv.ev && lv.ev.boat;
  if (!b) return null;
  return { active: t >= b.tIn && t <= b.tOut, k: (t - b.tIn) / (b.tOut - b.tIn), b };
}
function segRect(ax, ay, bx, by, x0, y0, x1, y1) {
  // Liang–Barsky
  let t0 = 0, t1 = 1; const dx = bx - ax, dy = by - ay;
  const p = [-dx, dx, -dy, dy], q = [ax - x0, x1 - ax, ay - y0, y1 - ay];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; }
    else { const r = q[i] / p[i]; if (p[i] < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } }
  }
  return true;
}
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* =====================================================================
   PHYSICS  (XPBD "small steps": passo fixo, subpassos, 1 iteração)
   ===================================================================== */
function mkPart(x, y, m, fixed) {
  return { x, y, px: x, py: y, vx: 0, vy: 0, m, w: fixed ? 0 : (m > 0 ? 1 / m : 0), fixed: !!fixed, bx: x, by: y, area: 0, buoy: 0, wet: false, deckDeg: 0, edge: false };
}
function setMass(p, m) { p.m = m; p.w = p.fixed ? 0 : 1 / Math.max(m, 1e-3); }

function createWorld(lvIn, br) {
  const lv = normLevel(lvIn);
  const S = {
    lv, t: 0, tick: 0, parts: [], byId: new Map(), mems: [], angs: [], deck: [], vehicles: [],
    ground: [], waterY: waterAt(lv, 0), wind: 0, qx: 0, qy: 0, qvx: 0, qvy: 0, pf: 1,
    state: 'run', failReason: '', endT: 0, events: [], rng: mulberry32(1234567),
    maxEver: 0, maxNow: 0, hot: null, boatHit: false, spawned: 0,
    fallY: Math.min(lv.hl, lv.hr) - 5, deckMin: Math.min(lv.hl, lv.hr)
  };
  for (const a of levelAnchors(lv)) {
    const p = mkPart(a.x, a.y, 0, true); p.anchor = true; p.id = a.id;
    p.edge = (Math.abs(a.x) < 1e-6 && Math.abs(a.y - lv.hl) < 1e-6) || (Math.abs(a.x - lv.W) < 1e-6 && Math.abs(a.y - lv.hr) < 1e-6);
    S.parts.push(p); S.byId.set(a.id, p);
  }
  for (const j of br.joints) {
    const p = mkPart(j.x, j.y, CFG.JOINT_MASS, false); p.id = j.id;
    S.parts.push(p); S.byId.set(j.id, p);
  }
  for (const mb of br.members) {
    const pa = S.byId.get(mb.a), pb = S.byId.get(mb.b);
    if (!pa || !pb) continue;
    const M = MATS[mb.m];
    const L = Math.hypot(pb.x - pa.x, pb.y - pa.y);
    if (L < 1e-3) continue;
    const mass = M.rho * L;
    if (!pa.fixed) setMass(pa, pa.m + mass / 2);
    if (!pb.fixed) setMass(pb, pb.m + mass / 2);
    pa.area += L / 2; pb.area += L / 2;
    pa.buoy += CFG.BUOY * L / 2; pb.buoy += CFG.BUOY * L / 2;
    const c = {
      id: mb.id, mat: mb.m, M, pa, pb, rest: L, rest0: L, alpha: L / M.EA, mass,
      lam: 0, force: 0, ratio: 0, filt: 0, sgn: 1, peak: 0, broken: false, stub: false,
      cable: !!M.cable, piston: !!M.piston, inv: !!mb.inv, deck: !!M.deck, lipA: 0, lipB: 0, len: L
    };
    S.mems.push(c);
    if (c.deck) S.deck.push(c);
  }
  // soldas: restrições angulares
  for (const id in br.weld) {
    if (!br.weld[id]) continue;
    const pj = S.byId.get(id); if (!pj) continue;
    const ms = S.mems.filter(c => c.pa === pj || c.pb === pj);
    if (!ms.length) continue;
    const other = c => (c.pa === pj ? c.pb : c.pa);
    if (pj.fixed) {
      for (const c of ms) {
        const o = other(c);
        S.angs.push({ jid: id, pj, pa: o, pb: null, ma: c, mb: null, ref: 0, rest: Math.atan2(o.y - pj.y, o.x - pj.x), alpha: 1 / CFG.WELD_K, ratio: 0, filt: 0, broken: false });
      }
    } else {
      ms.sort((c1, c2) => { const o1 = other(c1), o2 = other(c2); return Math.atan2(o1.y - pj.y, o1.x - pj.x) - Math.atan2(o2.y - pj.y, o2.x - pj.x); });
      for (let i = 0; i + 1 < ms.length; i++) {
        const A = other(ms[i]), B = other(ms[i + 1]);
        const ax = A.x - pj.x, ay = A.y - pj.y, bx = B.x - pj.x, by = B.y - pj.y;
        S.angs.push({ jid: id, pj, pa: A, pb: B, ma: ms[i], mb: ms[i + 1], rest: Math.atan2(ax * by - ay * bx, ax * bx + ay * by), alpha: 1 / CFG.WELD_K, ratio: 0, filt: 0, broken: false });
      }
    }
  }
  // chão estático (topo das margens e das pedras)
  S.ground.push({ ax: -90, ay: lv.hl, bx: 0, by: lv.hl });
  S.ground.push({ ax: lv.W, ay: lv.hr, bx: lv.W + 90, by: lv.hr });
  updateDeckLips(S);
  return S;
}
function updateDeckLips(S) {
  for (const p of S.parts) p.deckDeg = 0;
  for (const c of S.deck) if (!c.broken) { c.pa.deckDeg++; c.pb.deckDeg++; }
  for (const c of S.deck) {
    c.lipA = (c.pa.deckDeg <= 1 && !c.pa.edge) ? CFG.LIP : 0;
    c.lipB = (c.pb.deckDeg <= 1 && !c.pb.edge) ? CFG.LIP : 0;
  }
}

function solveDist(c, h2) {
  const a = c.pa, b = c.pb, wa = a.w, wb = b.w, ws = wa + wb;
  let dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1e-9;
  c.len = len;
  if (ws === 0) { c.lam = 0; return; }
  const C = len - c.rest;
  if (c.cable && C < 0) { c.lam = 0; return; }
  const dl = -C / (ws + c.alpha / h2);
  c.lam = dl; dx /= len; dy /= len;
  a.x -= wa * dl * dx; a.y -= wa * dl * dy;
  b.x += wb * dl * dx; b.y += wb * dl * dy;
}
function wrapPi(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
function solveAng(c, h2) {
  const J = c.pj, A = c.pa, B = c.pb;
  const ax = A.x - J.x, ay = A.y - J.y, la2 = ax * ax + ay * ay;
  if (la2 < 1e-8) return;
  let th, gAx, gAy, gBx = 0, gBy = 0, wsum;
  if (B) {
    const bx = B.x - J.x, by = B.y - J.y, lb2 = bx * bx + by * by;
    if (lb2 < 1e-8) return;
    th = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    gAx = ay / la2; gAy = -ax / la2; gBx = -by / lb2; gBy = bx / lb2;
  } else {
    th = Math.atan2(ay, ax);
    gAx = -ay / la2; gAy = ax / la2;
  }
  const gJx = -(gAx + gBx), gJy = -(gAy + gBy);
  const C = wrapPi(th - c.rest);
  wsum = A.w * (gAx * gAx + gAy * gAy) + J.w * (gJx * gJx + gJy * gJy) + (B ? B.w * (gBx * gBx + gBy * gBy) : 0);
  if (wsum === 0) { c.lam = 0; return; }
  const dl = -C / (wsum + c.alpha / h2);
  c.lam = dl;
  A.x += A.w * gAx * dl; A.y += A.w * gAy * dl;
  J.x += J.w * gJx * dl; J.y += J.w * gJy * dl;
  if (B) { B.x += B.w * gBx * dl; B.y += B.w * gBy * dl; }
}
function dampPair(a, b, k) {
  const ws = a.w + b.w; if (ws === 0) return;
  let dx = b.x - a.x, dy = b.y - a.y; const l = Math.sqrt(dx * dx + dy * dy) || 1e-9; dx /= l; dy /= l;
  const rv = (b.vx - a.vx) * dx + (b.vy - a.vy) * dy;
  const imp = rv * k / ws;
  a.vx += dx * imp * a.w; a.vy += dy * imp * a.w;
  b.vx -= dx * imp * b.w; b.vy -= dy * imp * b.w;
}

function breakMember(S, c) {
  if (c.broken) return;
  c.broken = true;
  const a = c.pa, b = c.pb;
  const u = 0.35 + 0.3 * S.rng();
  const mx = a.x + (b.x - a.x) * u, my = a.y + (b.y - a.y) * u;
  const sm = Math.max(c.mass * 0.25, 0.01);
  if (!a.fixed) setMass(a, Math.max(a.m - sm, CFG.JOINT_MASS));
  if (!b.fixed) setMass(b, Math.max(b.m - sm, CFG.JOINT_MASS));
  const s1 = mkPart(mx, my, sm, false), s2 = mkPart(mx, my, sm, false);
  s1.vx = a.vx * 0.5 + (S.rng() - 0.5); s1.vy = a.vy * 0.5 + S.rng();
  s2.vx = b.vx * 0.5 + (S.rng() - 0.5); s2.vy = b.vy * 0.5 + S.rng();
  s1.area = s2.area = c.rest / 2 * 0.5; s1.buoy = s2.buoy = CFG.BUOY * c.rest / 2; s1.debris = s2.debris = true;
  S.parts.push(s1, s2);
  const mk = (p, q, L) => ({ id: c.id + '_s', mat: c.mat, M: c.M, pa: p, pb: q, rest: L, rest0: L, alpha: L / c.M.EA, mass: sm, lam: 0, force: 0, ratio: 0, filt: 0, sgn: 1, peak: 0, broken: false, stub: true, cable: c.cable, piston: false, deck: false, len: L, lipA: 0, lipB: 0 });
  S.mems.push(mk(a, s1, c.rest * u), mk(b, s2, c.rest * (1 - u)));
  for (const g of S.angs) if (g.ma === c || g.mb === c) g.broken = true;
  if (c.deck) updateDeckLips(S);
  S.events.push({ type: 'break', x: mx, y: my, mat: c.mat });
}

/* =====================================================================
   VEHICLES
   ===================================================================== */
function spawnVehicle(S, spec, idx) {
  const lv = S.lv, T = VEH[spec.t] || VEH.carro, d = spec.d === -1 ? -1 : 1;
  const x0 = d > 0 ? -CFG.START_OFF : lv.W + CFG.START_OFF;
  const gy = (d > 0 ? lv.hl : lv.hr) + S.qy;
  const yc = gy + T.r;
  const V = { spec, T, d, idx, parts: [], wheels: [], cons: [], target: T.v, arrived: false, active: true,
    stopDone: !spec.stop, stopT: 0, flipT: 0, best: 0, bestT: S.t, spin: 0, cx: x0, cy: yc, ang: 0, failed: false };
  const mC = T.m * 0.78 / 4, mW = T.m * 0.22 / T.ax.length;
  const top = T.H - T.r;
  const corners = [[-T.L / 2, 0.05], [T.L / 2, 0.05], [T.L / 2, top], [-T.L / 2, top]];
  const cs = corners.map(([lx, ly]) => { const p = mkPart(x0 + lx * d, yc + ly, mC, false); p.veh = true; p.area = T.L * T.H * 0.04; return p; });
  V.chassis = cs;
  const rigid = (p, q) => ({ pa: p, pb: q, rest: Math.hypot(q.x - p.x, q.y - p.y), alpha: 0, lam: 0, damp: 0 });
  V.cons.push(rigid(cs[0], cs[1]), rigid(cs[1], cs[2]), rigid(cs[2], cs[3]), rigid(cs[3], cs[0]), rigid(cs[0], cs[2]), rigid(cs[1], cs[3]));
  const Fw = T.m * CFG.G / T.ax.length;
  const ks = Fw / 0.035;
  for (const ax of T.ax) {
    const w = mkPart(x0 + ax * d, yc, mW, false); w.veh = true; w.wheel = true; w.r = T.r; w.cF = 0; w.area = 0.1;
    V.wheels.push(w);
    const near = (ax * d < 0) === (d > 0) ? cs[0] : cs[1];
    for (const q of [cs[2], cs[3], near]) {
      const L = Math.hypot(q.x - w.x, q.y - w.y);
      V.cons.push({ pa: w, pb: q, rest: L, alpha: 1 / ks, lam: 0, damp: CFG.DAMP_VEH });
    }
  }
  V.parts = cs.concat(V.wheels);
  S.vehicles.push(V);
  S.spawned++;
  return V;
}

function collideWheel(S, wh, h2) {
  wh.cF = 0; wh.cpa = null; wh.cpb = null;
  const r = wh.r;
  for (const g of S.ground) testSeg(wh, r, g.ax + S.qx, g.ay + S.qy, g.bx + S.qx, g.by + S.qy, null, null, 0, 0, h2);
  for (const c of S.deck) {
    if (c.broken) continue;
    testSeg(wh, r, c.pa.x, c.pa.y, c.pb.x, c.pb.y, c.pa, c.pb, c.lipA, c.lipB, h2);
  }
}
function testSeg(wh, r, ax, ay, bx, by, pa, pb, lipA, lipB, h2) {
  const m = r + 0.35;
  if (wh.x < (ax < bx ? ax : bx) - m || wh.x > (ax > bx ? ax : bx) + m || wh.y < (ay < by ? ay : by) - m || wh.y > (ay > by ? ay : by) + m) return;
  const ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey;
  if (L2 < 1e-8) return;
  const L = Math.sqrt(L2);
  let t = ((wh.x - ax) * ex + (wh.y - ay) * ey) / L2;
  const tmin = -lipA / L, tmax = 1 + lipB / L;
  if (t < tmin) t = tmin; else if (t > tmax) t = tmax;
  const qx = ax + ex * t, qy = ay + ey * t;
  const dx = wh.x - qx, dy = wh.y - qy, d2 = dx * dx + dy * dy;
  if (d2 >= r * r || d2 < 1e-12) return;
  const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, C = d - r;
  const tc = t < 0 ? 0 : t > 1 ? 1 : t;
  const fa = 1 - tc, fb = tc;
  const W = wh.w + (pa ? pa.w * fa * fa + pb.w * fb * fb : 0);
  if (W === 0) return;
  const dl = -C / W;
  wh.x += wh.w * nx * dl; wh.y += wh.w * ny * dl;
  if (pa) {
    pa.x -= pa.w * fa * nx * dl; pa.y -= pa.w * fa * ny * dl;
    pb.x -= pb.w * fb * nx * dl; pb.y -= pb.w * fb * ny * dl;
  }
  const F = dl / h2;
  if (F > wh.cF) { wh.cF = F; wh.cpa = pa; wh.cpb = pb; wh.ct = tc; wh.ctx = ex / L; wh.cty = ey / L; }
}
function tractionWheel(S, V, wh, h) {
  if (wh.cF <= 0) return;
  let tx = wh.ctx, ty = wh.cty;
  if (tx * V.d < 0) { tx = -tx; ty = -ty; }
  let svx, svy;
  if (wh.cpa) { const t = wh.ct; svx = wh.cpa.vx * (1 - t) + wh.cpb.vx * t; svy = wh.cpa.vy * (1 - t) + wh.cpb.vy * t; }
  else { svx = S.qvx; svy = S.qvy; }
  const vt = (wh.vx - svx) * tx + (wh.vy - svy) * ty;
  const n = V.wheels.length, share = V.T.m / n;
  let F = share * 4 * (V.target - vt);
  const cap = Math.min(CFG.MU * wh.cF, V.T.F / n * (V.target === 0 ? 2.5 : 1));
  if (F > cap) F = cap; else if (F < -cap) F = -cap;
  const I = F * h;
  wh.vx += tx * I * wh.w; wh.vy += ty * I * wh.w;
  if (wh.cpa) {
    const t = wh.ct, pa = wh.cpa, pb = wh.cpb;
    pa.vx -= tx * I * pa.w * (1 - t); pa.vy -= ty * I * pa.w * (1 - t);
    pb.vx -= tx * I * pb.w * t; pb.vy -= ty * I * pb.w * t;
  }
}
function updateVehicleLogic(S, V) {
  const lv = S.lv, cs = V.chassis;
  V.cx = (cs[0].x + cs[1].x + cs[2].x + cs[3].x) / 4;
  V.cy = (cs[0].y + cs[1].y + cs[2].y + cs[3].y) / 4;
  const fx = cs[1].x - cs[0].x, fy = cs[1].y - cs[0].y;
  V.ang = Math.atan2(fy * V.d, fx * V.d);
  const vx = (cs[0].vx + cs[1].vx) / 2;
  V.spin += vx * CFG.DT / V.T.r;
  const flagX = V.d > 0 ? lv.W + CFG.FLAG_OFF : -CFG.FLAG_OFF;
  if (!V.arrived && V.d * (V.cx - flagX) > 0) { V.arrived = true; S.events.push({ type: 'arrive', idx: V.idx }); }
  if (V.arrived && V.d * (V.cx - flagX) > 30) { V.active = false; return; }
  // checkpoint
  V.target = V.T.v;
  if (!V.stopDone) {
    const sx = V.spec.stop[0], dist = V.d * (sx - V.cx);
    const vabs = Math.abs(vx);
    if (dist < Math.max(0.4, vabs * vabs / 5 + 0.3) && dist > -2) {
      V.target = 0;
      if (vabs < 0.4) V.stopT += CFG.DT;
      if (V.stopT >= V.spec.stop[1]) V.stopDone = true;
    }
  }
  // progresso (detecção de travamento)
  const prog = V.d * (V.cx - (V.d > 0 ? -CFG.START_OFF : lv.W + CFG.START_OFF));
  if (prog > V.best + 0.5) { V.best = prog; V.bestT = S.t; }
  if (V.target === 0) V.bestT = S.t;
  // capotamento
  const up = (cs[3].y + cs[2].y) - (cs[0].y + cs[1].y);
  V.flipT = up < 0 ? V.flipT + CFG.DT : 0;
}

/* ---------- Simulação: subpasso e tick ---------- */
function substep(S) {
  const h = CFG.H, h2 = h * h, G = CFG.G, lv = S.lv;
  S.t += h;
  const t = S.t;
  S.waterY = waterAt(lv, t);
  S.wind = windAt(lv, t);
  const q = quakeAt(lv, t); S.qx = q[0]; S.qy = q[1]; S.qvx = q[2]; S.qvy = q[3];
  S.pf = pistonAt(lv, t);
  const wy = S.waterY, wind = S.wind, floorY = lv.floor + 0.1 + S.qy;
  // carga gradual: a estrutura "assenta" sem choque de carga súbita
  const gs = t < CFG.SETTLE ? smooth01(t / CFG.SETTLE) : 1, Gb = G * gs;
  const P = S.parts;
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    p.px = p.x; p.py = p.y;
    if (p.fixed) { p.x = p.bx + S.qx; p.y = p.by + S.qy; continue; }
    let fx = wind * p.area, fy = 0;
    if (wy !== null && p.y < wy) { const dd = (wy - p.y) / 0.4; fy += p.buoy * Gb * (dd > 1 ? 1 : dd); p.wet = true; } else p.wet = false;
    p.vx += fx * p.w * h; p.vy += (fy * p.w - Gb) * h;
    p.x += p.vx * h; p.y += p.vy * h;
    if (p.y < floorY) { p.y = floorY; p.x = p.px + (p.x - p.px) * 0.5; }
  }
  const VS = S.vehicles;
  for (const V of VS) {
    if (!V.active) continue;
    for (const p of V.parts) {
      p.px = p.x; p.py = p.y;
      p.vx += wind * p.area * p.w * 0.5 * h; p.vy -= G * h;
      p.x += p.vx * h; p.y += p.vy * h;
    }
  }
  // restrições
  const pf = S.pf;
  const M = S.mems;
  for (let i = 0; i < M.length; i++) {
    const c = M[i];
    if (c.broken) continue;
    if (c.piston) c.rest = c.rest0 * (c.inv ? 2 - pf : pf);
    solveDist(c, h2);
  }
  for (let i = 0; i < S.angs.length; i++) { const g = S.angs[i]; if (!g.broken) solveAng(g, h2); }
  for (const V of VS) {
    if (!V.active) continue;
    for (const c of V.cons) solveDist(c, h2);
    for (const w of V.wheels) collideWheel(S, w, h2);
  }
  // velocidades
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    p.vx = (p.x - p.px) / h; p.vy = (p.y - p.py) / h;
    if (p.wet) { const k = 1 - CFG.WATER_DRAG * h; p.vx *= k; p.vy *= k; }
  }
  for (const V of VS) {
    if (!V.active) continue;
    for (const p of V.parts) { p.vx = (p.x - p.px) / h; p.vy = (p.y - p.py) / h; }
    for (const c of V.cons) if (c.damp) dampPair(c.pa, c.pb, c.damp);
    for (const w of V.wheels) tractionWheel(S, V, w, h);
  }
  // amortecimento axial e tensões
  const F = CFG.FILTER;
  for (let i = 0; i < M.length; i++) {
    const c = M[i];
    if (c.broken) continue;
    if (!(c.cable && c.len < c.rest)) dampPair(c.pa, c.pb, CFG.DAMP_MEMBER);
    if (c.stub) continue;
    const T = -c.lam / h2;
    c.force = T;
    let r;
    if (T >= 0) r = T / c.M.maxT; else r = c.M.maxC > 0 ? -T / c.M.maxC : 0;
    c.sgn = T >= 0 ? 1 : -1;
    c.filt += (r - c.filt) * F;
    if (c.filt > c.peak) c.peak = c.filt;
    if (c.filt > 1) breakMember(S, c);
  }
  for (let i = 0; i < S.angs.length; i++) {
    const g = S.angs[i];
    if (g.broken) continue;
    const Mo = Math.abs(g.lam || 0) / h2;
    g.filt += (Mo / CFG.WELD_MMAX - g.filt) * F;
    if (g.filt > 1) { g.broken = true; S.events.push({ type: 'weld', x: g.pj.x, y: g.pj.y }); }
  }
}

/* Avança um tick de 1/60 s (ou fração de subpassos para câmera lenta). */
function stepWorld(S, nsub) {
  const lv = S.lv;
  for (let k = 0; k < nsub; k++) {
    while (S.spawned < lv.veh.length && S.t >= (lv.veh[S.spawned].at || 0)) spawnVehicle(S, lv.veh[S.spawned], S.spawned);
    substep(S);
  }
  S.tick += nsub / CFG.SUB;
  postTick(S);
}
function postTick(S) {
  const lv = S.lv;
  let mx = 0, hot = null;
  for (const c of S.mems) {
    if (c.broken || c.stub) continue;
    if (c.filt > mx) { mx = c.filt; hot = c; }
  }
  S.maxNow = mx; S.hot = hot;
  if (mx > S.maxEver) S.maxEver = mx;
  for (const c of S.mems) if (c.broken && !c.stub && c.peak > S.maxEver) S.maxEver = c.peak;
  for (const V of S.vehicles) if (V.active) updateVehicleLogic(S, V);
  if (S.state !== 'run') { S.endT += CFG.DT; return; }
  // barco
  const bs = boatState(lv, S.t);
  if (bs && bs.active && S.waterY !== null) {
    const b = bs.b, y0 = S.waterY, y1 = S.waterY + b.h;
    for (const c of S.mems) {
      if (c.broken || c.stub) continue;
      if (segRect(c.pa.x, c.pa.y, c.pb.x, c.pb.y, b.x0, y0, b.x1, y1)) { S.boatHit = true; return fail(S, 'boat'); }
    }
  }
  for (const V of S.vehicles) {
    if (!V.active || V.arrived) continue;
    for (const p of V.parts) {
      const bottom = p.wheel ? p.y - p.r : p.y;
      if (S.waterY !== null && bottom < S.waterY) { S.events.push({ type: 'splash', x: p.x, y: S.waterY }); V.failed = true; return fail(S, 'water'); }
      if (p.y < S.fallY || p.y < lv.floor + 0.3) { V.failed = true; return fail(S, 'fell'); }
    }
    if (V.flipT > 1.5) { V.failed = true; return fail(S, 'flip'); }
    if (S.t - V.bestT > CFG.STUCK_T) { V.failed = true; return fail(S, 'stuck'); }
  }
  if (S.spawned === lv.veh.length && S.vehicles.every(V => V.arrived)) { S.state = 'win'; S.endT = 0; return; }
  if (S.t > CFG.TIME_LIMIT) return fail(S, 'timeout');
}
function fail(S, why) { S.state = 'fail'; S.failReason = why; S.endT = 0; S.events.push({ type: 'fail', why }); }
const FAIL_TEXT = {
  water: 'Um veículo caiu na água!',
  fell: 'Um veículo caiu no vão!',
  flip: 'Um veículo capotou!',
  stuck: 'Um veículo ficou travado.',
  boat: 'O barco bateu na ponte!',
  timeout: 'Tempo esgotado.'
};
function memberPeaks(S) {
  const out = {};
  for (const c of S.mems) if (!c.stub) out[c.id] = { peak: c.peak, broken: c.broken, sgn: c.sgn };
  return out;
}
/* Executa um teste completo sem renderizar (usado pelos testes automáticos). */
function runHeadless(lv, br, maxT) {
  const S = createWorld(lv, br);
  const lim = maxT || CFG.TIME_LIMIT + 1;
  while (S.state === 'run' && S.t < lim) stepWorld(S, CFG.SUB);
  return S;
}
function starsFor(lv, passed, cost, maxStress) {
  if (!passed) return 0;
  if (lv.sandbox) return 1;
  let s = 1;
  if (cost <= lv.budget) { s = 2; if (maxStress < 0.8) s = 3; }
  return s;
}

/* =====================================================================
   STRESS_PREVIEW  (solução estática linear: K u = f, Cholesky denso)
   ===================================================================== */
function stressPreview(lvIn, br) {
  const lv = normLevel(lvIn);
  const nm = nodeMap(lv, br);
  const res = { mem: {}, weld: {}, unstable: new Set(), max: 0, ok: true };
  if (!br.members.length) return res;
  const free = new Map(); let n = 0;
  for (const j of br.joints) free.set(j.id, n++);
  const N = n * 2;
  if (N === 0) { for (const m of br.members) res.mem[m.id] = 0; return res; }
  const mems = br.members.map(mb => {
    const a = nm.get(mb.a), b = nm.get(mb.b), M = MATS[mb.m];
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1e-6;
    return { mb, M, a, b, L, ux: (b.x - a.x) / L, uy: (b.y - a.y) / L, k: M.EA / L, ia: free.has(mb.a) ? free.get(mb.a) : -1, ib: free.has(mb.b) ? free.get(mb.b) : -1, on: true };
  });
  // soldas (linearizadas)
  const welds = [];
  for (const id in br.weld) {
    if (!br.weld[id] || !nm.has(id)) continue;
    const J = nm.get(id);
    const ms = mems.filter(m => m.mb.a === id || m.mb.b === id);
    const other = m => (m.mb.a === id ? m.b : m.a);
    const fi = id => (free.has(id) ? free.get(id) : -1);
    if (J.anchor) {
      for (const m of ms) { const o = other(m); const vx = o.x - J.x, vy = o.y - J.y, l2 = vx * vx + vy * vy; welds.push({ id, g: [[fi(o.id), -vy / l2, vx / l2]] }); }
    } else {
      ms.sort((m1, m2) => { const o1 = other(m1), o2 = other(m2); return Math.atan2(o1.y - J.y, o1.x - J.x) - Math.atan2(o2.y - J.y, o2.x - J.x); });
      for (let i = 0; i + 1 < ms.length; i++) {
        const A = other(ms[i]), B = other(ms[i + 1]);
        const ax = A.x - J.x, ay = A.y - J.y, la = ax * ax + ay * ay, bx = B.x - J.x, by = B.y - J.y, lb = bx * bx + by * by;
        const gA = [ay / la, -ax / la], gB = [-by / lb, bx / lb], gJ = [-(gA[0] + gB[0]), -(gA[1] + gB[1])];
        welds.push({ id, g: [[fi(A.id), gA[0], gA[1]], [fi(B.id), gB[0], gB[1]], [fi(id), gJ[0], gJ[1]]] });
      }
    }
  }
  let kavg = 0; for (const m of mems) kavg += m.k; kavg /= mems.length;
  const kreg = 1e-4 * kavg;
  const mechNodes = new Set();
  function assemble() {
    const K = new Float64Array(N * N);
    const add = (i, j, v) => { K[i * N + j] += v; };
    for (const m of mems) {
      if (!m.on) continue;
      const e = [m.ux * m.ux * m.k, m.ux * m.uy * m.k, m.uy * m.uy * m.k];
      const blk = (p, q, s) => { if (p < 0 || q < 0) return; add(2 * p, 2 * q, s * e[0]); add(2 * p, 2 * q + 1, s * e[1]); add(2 * p + 1, 2 * q, s * e[1]); add(2 * p + 1, 2 * q + 1, s * e[2]); };
      blk(m.ia, m.ia, 1); blk(m.ib, m.ib, 1); blk(m.ia, m.ib, -1); blk(m.ib, m.ia, -1);
    }
    for (const w of welds) {
      const dofs = [];
      for (const [fi, gx, gy] of w.g) if (fi >= 0) { dofs.push([2 * fi, gx], [2 * fi + 1, gy]); }
      for (const [i, gi] of dofs) for (const [j, gj] of dofs) add(i, j, CFG.WELD_K * gi * gj);
    }
    const diag0 = new Float64Array(N);
    for (let i = 0; i < N; i++) { diag0[i] = K[i * N + i]; K[i * N + i] += kreg; }
    mechNodes.clear();
    // Cholesky (in-place, triângulo inferior); pivô ~ kreg => mecanismo
    for (let j = 0; j < N; j++) {
      let s = K[j * N + j];
      for (let k = 0; k < j; k++) s -= K[j * N + k] * K[j * N + k];
      if (s < kreg * 4 && diag0[j] > 0) mechNodes.add(j >> 1);
      if (diag0[j] === 0) mechNodes.add(j >> 1);
      if (s <= 1e-12) s = 1e-12;
      const d = Math.sqrt(s); K[j * N + j] = d;
      for (let i = j + 1; i < N; i++) {
        let v = K[i * N + j];
        for (let k = 0; k < j; k++) v -= K[i * N + k] * K[j * N + k];
        K[i * N + j] = v / d;
      }
    }
    return K;
  }
  function solve(K, f) {
    const y = new Float64Array(N);
    for (let i = 0; i < N; i++) { let s = f[i]; for (let k = 0; k < i; k++) s -= K[i * N + k] * y[k]; y[i] = s / K[i * N + i]; }
    for (let i = N - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < N; k++) s -= K[k * N + i] * y[k]; y[i] = s / K[i * N + i]; }
    return y;
  }
  const dead = new Float64Array(N);
  for (const m of mems) {
    const w = m.M.rho * m.L * CFG.G / 2;
    if (m.ia >= 0) dead[2 * m.ia + 1] -= w;
    if (m.ib >= 0) dead[2 * m.ib + 1] -= w;
  }
  const decks = mems.filter(m => m.M.deck);
  const T = heaviestVehicle(lv);
  const axW = T.m * CFG.G / T.ax.length;
  function loadCase(xc) {
    const f = Float64Array.from(dead);
    let any = false;
    for (const ax of T.ax) {
      const x = xc + ax;
      let best = null, by = -1e9, bt = 0;
      for (const m of decks) {
        const x0 = Math.min(m.a.x, m.b.x), x1 = Math.max(m.a.x, m.b.x);
        if (x < x0 - 1e-6 || x > x1 + 1e-6 || x1 - x0 < 1e-6) continue;
        const t = (x - m.a.x) / (m.b.x - m.a.x), y = m.a.y + (m.b.y - m.a.y) * t;
        if (y > by) { by = y; best = m; bt = t; }
      }
      if (!best) continue;
      any = true;
      if (best.ia >= 0) f[2 * best.ia + 1] -= axW * (1 - bt);
      if (best.ib >= 0) f[2 * best.ib + 1] -= axW * bt;
    }
    return any ? f : null;
  }
  function forces(u) {
    const out = [];
    for (const m of mems) {
      if (!m.on) { out.push(0); continue; }
      const ua = m.ia >= 0 ? [u[2 * m.ia], u[2 * m.ia + 1]] : [0, 0];
      const ub = m.ib >= 0 ? [u[2 * m.ib], u[2 * m.ib + 1]] : [0, 0];
      out.push(m.k * ((ub[0] - ua[0]) * m.ux + (ub[1] - ua[1]) * m.uy));
    }
    return out;
  }
  let K = assemble();
  // pré-passo: cabos comprimidos ficam frouxos
  const mid = loadCase(lv.W / 2) || dead;
  const f0 = forces(solve(K, mid));
  let changed = false;
  mems.forEach((m, i) => { if (m.M.cable && f0[i] < 0) { m.on = false; changed = true; } });
  if (changed) K = assemble();
  const cases = [dead];
  for (let xc = -T.L / 2; xc <= lv.W + T.L / 2 + 1e-6; xc += 1) { const f = loadCase(xc); if (f) cases.push(f); }
  const env = new Float64Array(mems.length);
  const sg = new Int8Array(mems.length).fill(1);
  const wenv = new Float64Array(welds.length);
  const unstableNodes = new Set(mechNodes);
  for (const f of cases) {
    const u = solve(K, f);
    for (let i = 0; i < n; i++) if (Math.hypot(u[2 * i], u[2 * i + 1]) > 0.3) unstableNodes.add(i);
    const fs = forces(u);
    mems.forEach((m, i) => {
      const Tf = fs[i];
      let r = Tf >= 0 ? Tf / m.M.maxT : (m.M.maxC > 0 ? -Tf / m.M.maxC : 0);
      if (m.M.cable && Tf < 0) r = 0;
      if (r > env[i]) { env[i] = r; sg[i] = Tf >= 0 ? 1 : -1; }
    });
    welds.forEach((w, i) => {
      let th = 0;
      for (const [fi, gx, gy] of w.g) if (fi >= 0) th += gx * u[2 * fi] + gy * u[2 * fi + 1];
      const r = Math.abs(CFG.WELD_K * th) / CFG.WELD_MMAX;
      if (r > wenv[i]) wenv[i] = r;
    });
  }
  mems.forEach((m, i) => {
    res.mem[m.mb.id] = env[i] * sg[i];
    if (env[i] > res.max) res.max = env[i];
    if (unstableNodes.has(m.ia) || unstableNodes.has(m.ib)) res.unstable.add(m.mb.id);
  });
  welds.forEach((w, i) => { res.weld[w.id] = Math.max(res.weld[w.id] || 0, wenv[i]); if (wenv[i] > res.max) res.max = wenv[i]; });
  if (res.unstable.size) res.ok = false;
  return res;
}

if (typeof module !== 'undefined') {
  module.exports = { CFG, MATS, MAT_ORDER, VEH, LEVELS, WORLDS, SANDBOX, levelById, normLevel, levelAnchors, newBridge, cloneBridge, nodeMap, bridgeCost,
    validateMember, addMember, addJoint, removeMember, removeJoint, createWorld, stepWorld, runHeadless, stressPreview, starsFor, deckContinuous, findNodeAt, FAIL_TEXT, inSolid, memberPeaks };
}
