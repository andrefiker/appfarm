const test = require('node:test');
const assert = require('node:assert');
const E = require('./load.js')();
const SOL = require('./solutions.json');

function builder(lv) {
  const br = E.newBridge();
  const P = (x, y) => E.findNodeAt(lv, br, x, y, 0.01) || { x, y };
  const add = (x1, y1, x2, y2, m) => { assert.ok(E.addMember(lv, br, P(x1, y1), P(x2, y2), m), `add ${x1},${y1}-${x2},${y2} ${m}`); };
  return { br, add };
}
function warrenL1() {
  const lv = E.levelById(1), { br, add } = builder(lv);
  for (let x = 0; x < 10; x += 2) add(x, 0, x + 2, 0, 'pista');
  const top = [1, 3, 5, 7, 9];
  for (const x of top) { add(x - 1, 0, x, 2, 'madeira'); add(x, 2, x + 1, 0, 'madeira'); }
  for (let i = 0; i < top.length - 1; i++) add(top[i], 2, top[i + 1], 2, 'madeira');
  return { lv, br };
}
function finite(S) {
  for (const p of S.parts) if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.vx)) return false;
  for (const V of S.vehicles) for (const p of V.parts) if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
  return true;
}

test('nível 1: treliça Warren simples de madeira passa dentro do orçamento', () => {
  const { lv, br } = warrenL1();
  const cost = E.bridgeCost(lv, br);
  assert.ok(cost <= lv.budget, `custo ${cost} > orçamento ${lv.budget}`);
  const S = E.runHeadless(lv, br);
  assert.strictEqual(S.state, 'win', S.failReason);
  assert.ok(S.maxEver < 0.8, 'deveria ser robusta (3 estrelas): ' + S.maxEver);
  assert.strictEqual(E.starsFor(lv, true, cost, S.maxEver), 3);
});

test('nível 1: só pista (mecanismo) cai e o preview marca instável', () => {
  const lv = E.levelById(1), { br, add } = builder(lv);
  for (let x = 0; x < 10; x += 2) add(x, 0, x + 2, 0, 'pista');
  assert.ok(E.stressPreview(lv, br).unstable.size > 0);
  const S = E.runHeadless(lv, br);
  assert.strictEqual(S.state, 'fail');
});

test('preview estático concorda com a simulação (nível 1)', () => {
  const { lv, br } = warrenL1();
  const sp = E.stressPreview(lv, br);
  const S = E.runHeadless(lv, br);
  assert.ok(Math.abs(sp.max - S.maxEver) < 0.2, `preview ${sp.max} vs dinâmico ${S.maxEver}`);
});

test('todos os 40 níveis têm solução de referência dentro do orçamento', () => {
  assert.strictEqual(E.LEVELS.length, 40);
  for (const lv of E.LEVELS) {
    const s = SOL[lv.id];
    assert.ok(s, 'sem solução para ' + lv.id);
    const cost = E.bridgeCost(lv, s.bridge);
    assert.ok(cost <= lv.budget, `L${lv.id}: custo ${cost} > ${lv.budget}`);
    const S = E.runHeadless(lv, s.bridge);
    assert.strictEqual(S.state, 'win', `L${lv.id} ${lv.name}: ${S.failReason}`);
    assert.ok(finite(S));
  }
});

test('estabilidade na carga máxima: caminhão sobre ponte fraca não explode', () => {
  const lv = E.levelById(10), { br, add } = builder(lv);
  for (let x = 0; x < 18; x += 3) add(x, 0, x + 3, 0, 'pista');
  for (let x = 3; x < 18; x += 3) add(x, 0, x, -2, 'madeira');
  for (let x = 3; x < 15; x += 3) add(x, -2, x + 3, -2, 'madeira');
  add(0, 0, 3, -2, 'aco'); add(18, 0, 15, -2, 'aco');
  const S = E.createWorld(lv, br);
  let vmax = 0;
  while (S.t < 25) {
    E.stepWorld(S, E.CFG.SUB);
    assert.ok(finite(S), 'NaN em t=' + S.t);
    for (const p of S.parts) vmax = Math.max(vmax, Math.hypot(p.vx, p.vy));
  }
  assert.ok(vmax < 80, 'velocidade explodiu: ' + vmax);
});

test('estabilidade: caminhão parado em ponte de aço robusta fica em equilíbrio', () => {
  const lv = E.levelById(28);
  const S = E.createWorld(lv, SOL[28].bridge);
  while (S.state === 'run' && S.t < 40) { E.stepWorld(S, E.CFG.SUB); assert.ok(finite(S)); }
  assert.strictEqual(S.state, 'win');
});

test('veículos nunca atravessam (tunneling) a pista', () => {
  for (const id of [1, 10, 17, 24, 28, 35, 40]) {
    const lv = E.levelById(id);
    const S = E.createWorld(lv, SOL[id].bridge);
    const prev = new Map();
    while (S.state === 'run' && S.t < 60) {
      E.stepWorld(S, E.CFG.SUB);
      for (const V of S.vehicles) for (const w of V.wheels) {
        for (const c of S.deck) {
          if (c.broken) continue;
          const ax = c.pa.x, ay = c.pa.y, bx = c.pb.x, by = c.pb.y;
          if (w.x < Math.min(ax, bx) || w.x > Math.max(ax, bx) || Math.abs(bx - ax) < 1e-6) continue;
          const t = (w.x - ax) / (bx - ax), y = ay + (by - ay) * t;
          const d = w.y - y; // + acima da pista
          const key = w; const k2 = c;
          const pm = prev.get(key) || new Map();
          const p0 = pm.get(k2);
          if (p0 !== undefined && p0 > 0 && p0 < w.r * 1.5) assert.ok(d > 0, `L${id}: roda atravessou a pista em t=${S.t.toFixed(2)}`);
          pm.set(k2, d); prev.set(key, pm);
        }
      }
    }
    assert.strictEqual(S.state, 'win', `L${id}`);
  }
});

test('simulação determinística', () => {
  const lv = E.levelById(23);
  const a = E.runHeadless(lv, SOL[23].bridge), b = E.runHeadless(lv, SOL[23].bridge);
  assert.strictEqual(a.t, b.t);
  assert.strictEqual(a.maxEver, b.maxEver);
});

test('concreto só nasce de âncora ou de outro concreto', () => {
  const lv = E.levelById(21), br = E.newBridge();
  assert.ok(!E.validateMember(lv, br, { x: 4, y: 0 }, { x: 4, y: -3 }, 'concreto').ok);
  const a = E.findNodeAt(lv, br, 8, -8, 0.01);
  assert.ok(E.addMember(lv, br, a, { x: 8, y: -4 }, 'concreto'));
  const j = E.findNodeAt(lv, br, 8, -4, 0.01);
  assert.ok(E.validateMember(lv, br, j, { x: 8, y: 0 }, 'concreto').ok);
});

test('cabo frouxo não resiste a compressão', () => {
  const lv = E.levelById(11), br = E.newBridge();
  const a0 = E.findNodeAt(lv, br, 0, 0, 0.01);
  E.addMember(lv, br, a0, { x: 0, y: 3 }, 'cabo');
  const S = E.createWorld(lv, br);
  for (let i = 0; i < 120; i++) E.stepWorld(S, E.CFG.SUB);
  const tip = S.parts.find(p => !p.fixed);
  assert.ok(tip.y < 0, 'cabo deveria cair (sem rigidez à compressão)');
});

test('moto salta um vão de 4 m usando rampas (nível 9)', () => {
  const lv = E.levelById(9), { br, add } = builder(lv);
  for (const s of [1, -1]) {
    const X = x => (s > 0 ? x : 18 - x);
    add(X(0), 0, X(3), 0, 'pista'); add(X(3), 0, X(6), 1, 'pista');
    add(X(0), -2, X(3), -2, 'madeira'); add(X(3), -2, X(3), 0, 'madeira'); add(X(0), 0, X(3), -2, 'aco');
    add(X(3), -2, X(6), 1, 'aco'); add(X(3), -2, X(6), -1, 'madeira'); add(X(6), -1, X(6), 1, 'madeira');
  }
  assert.ok(!E.deckContinuous(lv, br), 'a pista tem um vão');
  const S = E.createWorld(lv, br);
  let air = 0;
  while (S.state === 'run' && S.t < 20) {
    E.stepWorld(S, E.CFG.SUB);
    const V = S.vehicles[0];
    if (V && V.cx > 6.5 && V.cx < 11.5 && V.wheels.every(w => w.cF === 0)) air += E.CFG.DT;
  }
  assert.strictEqual(S.state, 'win', S.failReason);
  assert.ok(air > 0.15, 'a moto deveria voar sobre o vão: ' + air);
  assert.ok(E.bridgeCost(lv, br) < lv.budget);
});
