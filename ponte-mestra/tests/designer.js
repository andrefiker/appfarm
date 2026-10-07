// Projetista automático: gera pontes simples (treliças, pilares, estais, básculas)
// para provar que cada nível é solucionável e calibrar orçamentos.
const E = require('./load.js')();

function mkBuilder(lv) {
  const br = E.newBridge();
  const P = (x, y) => E.findNodeAt(lv, br, x, y, 0.01) || { x, y };
  const add = (x1, y1, x2, y2, m) => !!E.addMember(lv, br, P(x1, y1), P(x2, y2), m);
  return { br, P, add };
}
function deckXs(lv, p, extra) {
  const k = Math.ceil(lv.W / p);
  const s = new Set();
  for (let i = 0; i <= k; i++) s.add(Math.round(i * lv.W / k));
  for (const x of extra || []) if (x > 0 && x < lv.W) s.add(Math.round(x));
  let xs = [...s].sort((a, b) => a - b);
  // garante vãos <= 4 (limite da pista)
  const out = [xs[0]];
  for (let i = 1; i < xs.length; i++) { let prev = out[out.length - 1]; while (xs[i] - prev > 4) { prev += 4; out.push(prev); } out.push(xs[i]); }
  return out;
}
const yAt = (lv, x) => Math.round(lv.hl + (lv.hr - lv.hl) * x / lv.W);

function genTruss(lv, o) {
  const B = mkBuilder(lv);
  const supportXs = lv.anchors.filter(a => a[0] > 0.5 && a[0] < lv.W - 0.5 && a[1] < 0).map(a => a[0]);
  const xs = deckXs(lv, o.p, o.sup ? supportXs : []);
  const ys = xs.map(x => yAt(lv, x));
  let ok = true;
  for (let i = 0; i + 1 < xs.length; i++) ok = B.add(xs[i], ys[i], xs[i + 1], ys[i + 1], 'pista') && ok;
  const s = o.style === 'top' ? 1 : -1, h = o.h * s, k = xs.length - 1, m = o.mat;
  if (o.h > 0 && k >= 2) {
    for (let i = 1; i < k; i++) ok = B.add(xs[i], ys[i], xs[i], ys[i] + h, m) && ok;
    for (let i = 1; i + 1 < k; i++) ok = B.add(xs[i], ys[i] + h, xs[i + 1], ys[i + 1] + h, m) && ok;
    ok = B.add(xs[0], ys[0], xs[1], ys[1] + h, m) && ok;
    ok = B.add(xs[k], ys[k], xs[k - 1], ys[k - 1] + h, m) && ok;
    for (let i = 1; i + 1 < k; i++) {
      if (xs[i] + xs[i + 1] <= lv.W) ok = B.add(xs[i], ys[i] + h, xs[i + 1], ys[i + 1], m) && ok;
      else ok = B.add(xs[i], ys[i], xs[i + 1], ys[i + 1] + h, m) && ok;
    }
  } else if (k >= 2 && o.h === 0) { /* só pista */ }
  if (!ok) return null;
  if (o.sup) {
    for (const a of lv.anchors) {
      const [ax, ay] = a;
      if (ax > 0.5 && ax < lv.W - 0.5 && ay < 0) {
        // pilar vertical até a pista (concreto se houver, senão material da treliça)
        const yTop = (o.style === 'bottom' && o.h > 0 && xs.indexOf(ax) > 0 && xs.indexOf(ax) < k) ? yAt(lv, ax) - o.h : yAt(lv, ax);
        const pm = lv.mat.includes('concreto') ? 'concreto' : m;
        const L = E.MATS[pm].maxL;
        let y = ay;
        while (yTop - y > L) { if (!B.add(ax, y, ax, y + L, pm)) return null; y += L; B.br.weld[B.P(ax, y).id] = true; }
        if (yTop - y > 0.5 && !B.add(ax, y, ax, yTop, pm)) return null;
      }
      if ((Math.abs(ax) < 1e-6 || Math.abs(ax - lv.W) < 1e-6) && ay < (ax === 0 ? lv.hl : lv.hr) && o.style === 'bottom' && o.h > 0) {
        const i = ax === 0 ? 1 : k - 1;
        B.add(ax, ay, xs[i], ys[i] + h, m);
      }
    }
  }
  if (o.cab && lv.mat.includes('cabo')) {
    for (const [ax, ay] of lv.anchors) {
      if (ay <= Math.max(lv.hl, lv.hr) + 1) continue;
      for (let i = 1; i < xs.length - 1; i++) {
        const L = Math.hypot(xs[i] - ax, ys[i] + (o.style === 'top' ? h : 0) - ay);
        if (L <= 16 && Math.abs(xs[i] - ax) >= 3) B.add(ax, ay, xs[i], ys[i] + (o.style === 'top' && o.h > 0 && i > 0 && i < k ? h : 0), 'cabo');
      }
    }
  }
  return B.br;
}

function genBascule(lv, o) {
  const B = mkBuilder(lv);
  const W = lv.W, c = (W - 1) / 2, m = o.mat, h = o.h;
  const q = o.q || 3; const sideXs = [0, q]; for (let x = q + o.p; x < c; x += o.p) sideXs.push(x); if (sideXs[sideXs.length - 1] !== c) sideXs.push(c);
  for (const side of [0, 1]) {
    const X = x => side ? W - x : x;
    const xs = sideXs;
    for (let i = 0; i + 1 < xs.length; i++) if (!B.add(X(xs[i]), 0, X(xs[i + 1]), 0, 'pista')) return null;
    const k = xs.length - 1;
    for (let i = 1; i < k; i++) if (!B.add(X(xs[i]), 0, X(xs[i]), h, m)) return null;
    for (let i = 1; i + 1 < k; i++) if (!B.add(X(xs[i]), h, X(xs[i + 1]), h, m)) return null;
    if (!B.add(X(0), 0, X(xs[1]), h, m)) return null;
    if (!B.add(X(xs[k]), 0, X(xs[k - 1]), h, m)) return null;
    for (let i = 1; i + 1 < k; i++) if (!B.add(X(xs[i]), h, X(xs[i + 1]), 0, m)) return null;
    if (!B.add(X(0), -3, X(q), 0, 'pistao')) return null;
  }
  return B.br;
}

function candidates(lv) {
  const out = [];
  const trussMats = ['madeira', 'aluminio', 'aco', 'composito'].filter(m => lv.mat.includes(m));
  if (lv.ev && lv.ev.boat) {
    for (const mat of trussMats) for (const h of [1, 2, 3]) for (const p of [2, 3]) for (const q of [3, 4]) { const br = genBascule(lv, { mat, h, p, q }); if (br) out.push({ br, d: `bascula ${mat} h${h} p${p} q${q}` }); }
    return out;
  }
  for (const mat of trussMats) for (const p of [2, 3, 4]) for (const h of [1, 2, 3]) for (const style of ['top', 'bottom']) for (const sup of [true, false]) for (const cab of [false, true]) {
    if (cab && !lv.anchors.some(a => a[1] > Math.max(lv.hl, lv.hr) + 1)) continue;
    const br = genTruss(lv, { mat, p, h, style, sup, cab });
    if (br) out.push({ br, d: `${style} ${mat} p${p} h${h}${sup ? ' sup' : ''}${cab ? ' cab' : ''}` });
  }
  return out;
}

function solveLevel(lv, opt = {}) {
  const cands = candidates(lv).map(c => ({ ...c, cost: E.bridgeCost(lv, c.br) }));
  for (const c of cands) { const sp = E.stressPreview(lv, c.br); c.pre = sp.max; c.stable = sp.ok; }
  const good = cands.filter(c => c.stable && c.pre < (opt.preMax || 0.85)).sort((a, b) => a.cost - b.cost);
  let tried = 0, firstPass = null;
  for (const c of good) {
    if (tried++ >= (opt.maxTries || 12)) break;
    const S = E.runHeadless(lv, c.br);
    c.state = S.state; c.why = S.failReason; c.peak = S.maxEver;
    if (S.state === 'win') { if (!firstPass) firstPass = c; if (S.maxEver < 0.8) return { best: c, firstPass, n: cands.length }; }
  }
  return { best: null, firstPass, n: cands.length, tried: good.slice(0, tried) };
}
module.exports = { E, genTruss, genBascule, candidates, solveLevel };

if (require.main === module) {
  const ids = process.argv.slice(2).map(Number);
  const list = ids.length ? ids : E.LEVELS.map(l => l.id);
  for (const id of list) {
    const lv = E.levelById(id); const t0 = Date.now();
    const r = solveLevel(lv);
    const c = r.best || r.firstPass;
    if (c) console.log(`L${id} ${lv.name}: ${r.best ? '3★' : 'pass'} R$${c.cost} (budget ${lv.budget}) peak ${c.peak.toFixed(2)} pre ${c.pre.toFixed(2)} [${c.d}] ${Date.now() - t0}ms`);
    else console.log(`L${id} ${lv.name}: NO SOLUTION (${r.n} cands) tried:`, (r.tried || []).map(c => `${c.d} R$${c.cost} ${c.state}/${c.why} pk${(c.peak||0).toFixed(2)} pre${c.pre.toFixed(2)}`).join(' | '));
  }
}
