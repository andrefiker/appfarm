/* VÃO progression. Pure rules, shared by the game and Node tests. */
(function (root) {
'use strict';
var TITLES = ['Aprendiz', 'Construtor', 'Projetista', 'Engenheiro', 'Especialista', 'Mestre', 'Veterano'];
var THRESHOLDS = [0, 180, 440, 800, 1280, 1880, 2600, 3440, 4400, 5480, 6680, 8000];
var EXTRA = [
  { id: 'aluminum', name: 'Alumínio', level: 3, stage: 7, note: 'Leve; suporta vãos maiores que madeira.', traits: [3, 1, 3, 4] },
  { id: 'concrete', name: 'Concreto', level: 4, stage: 10, note: 'Ótimo em compressão; frágil em tração.', traits: [3, 5, 1, 2] },
  { id: 'composite', name: 'Compósito', level: 6, stage: 15, note: 'Leve e forte em tração; custa caro.', traits: [4, 1, 5, 4] }
];
var MILESTONES = [
  { id: 'first', name: 'Primeira Travessia', note: 'Aprove sua primeira ponte.' },
  { id: 'economy', name: 'Econômico', note: 'Use menos de 75% do orçamento.' },
  { id: 'stress', name: 'Treliça', note: 'Passe com esforço abaixo de 80%.' },
  { id: 'five', name: 'Cinco Pontes', note: 'Conclua cinco níveis.' },
  { id: 'long', name: 'Grande Vão', note: 'Conclua um nível do bloco final.' },
  { id: 'truck', name: 'À Prova de Caminhão', note: 'Aprove um teste com caminhão.' },
  { id: 'ten', name: 'Dez Pontes', note: 'Conclua dez níveis.' },
  { id: 'veteran', name: 'Veterano', note: 'Conclua a campanha.' }
];
var MATERIALS = ['road', 'wood', 'steel', 'cable', 'aluminum', 'concrete', 'composite'];
var CHALLENGES = [
  { id: 'steady', name: 'Travessia estável', note: 'Passe com esforço máximo até 70%.', stage: 2 },
  { id: 'compact', name: 'Treliça enxuta', note: 'Passe com até 12 barras.', stage: 3 },
  { id: 'noSteel', name: 'Sem aço', note: 'Passe uma fase que oferece aço sem usá-lo.', stage: 4 },
  { id: 'aluminum', name: 'Estrutura leve', note: 'Use 3 barras de alumínio e baixa massa média.', stage: 7 },
  { id: 'concrete', name: 'Compressão certa', note: 'Faça concreto trabalhar em compressão.', stage: 10 },
  { id: 'composite', name: 'Compósito eficiente', note: 'Use compósito e poupe 15% do orçamento.', stage: 15 },
  { id: 'truck', name: 'Caminhão sem cabos', note: 'Passe com caminhão sem usar cabos.', stage: 12 },
  { id: 'late', name: 'Grande vão calmo', note: 'Passe uma fase final com até 70% de esforço.', stage: 16 }
];
function has(o, k) { return Object.prototype.hasOwnProperty.call(o || {}, k); }
function count(p) { return Object.keys(p.best || {}).filter(function (k) { return Number.isFinite(+p.best[k]); }).length; }
function grade(left, budget, stress) {
  var ratio = budget > 0 ? Math.max(0, left / budget) : 0;
  if (ratio >= 0.4 && stress <= 75) return 'S';
  if (ratio >= 0.25 && stress <= 90) return 'A';
  if (ratio >= 0.1) return 'B';
  return 'C';
}
function rank(g) { return { C: 0, B: 1, A: 2, S: 3 }[g] || 0; }
function level(xp) {
  var n = 1;
  while (n < THRESHOLDS.length && xp >= THRESHOLDS[n]) n++;
  return n;
}
function title(n) { return TITLES[Math.min(TITLES.length - 1, n - 1)]; }
function next(xp) { return THRESHOLDS[Math.min(THRESHOLDS.length - 1, level(xp))]; }
function normalize(v1) {
  var p = { v: 3, unlocked: 1, best: {}, designs: {}, sandbox: { t: 0, veh: 'carro', wind: 0, water: 0, design: null }, mute: false, seenHelp: false,
    xp: 0, grades: {}, stress: {}, milestones: {}, sandboxAll: false, discovered: {}, challenges: {}, pbRewardBaseline: {}, gradeRewards: {} };
  if (v1 && (v1.v === 1 || v1.v === 2 || v1.v === 3)) {
    ['unlocked', 'best', 'designs', 'mute', 'seenHelp', 'sandbox'].forEach(function (k) { if (has(v1, k)) p[k] = v1[k]; });
    if (v1.v >= 2) ['xp', 'grades', 'stress', 'milestones', 'sandboxAll'].forEach(function (k) { if (has(v1, k)) p[k] = v1[k]; });
    if (v1.v === 3) ['discovered', 'challenges', 'pbRewardBaseline', 'gradeRewards'].forEach(function (k) { if (has(v1, k)) p[k] = v1[k]; });
    if (v1.v === 1) {
      Object.keys(p.best || {}).forEach(function (k) {
        if (!Number.isFinite(+p.best[k]) || +k < 1 || +k > 20) return;
        p.xp += 120 + 10 * +k;
        // v1 did not record peak stress: infer only the budget-based grade.
        p.grades[k] = grade(+p.best[k], BUDGETS[+k - 1], 100);
      });
      if (count(p)) { p.milestones.first = true; p.xp += 35; }
      if (Object.keys(p.best).some(function (k) { return +p.best[k] >= (BUDGETS[+k - 1] || Infinity) * 0.25; })) { p.milestones.economy = true; p.xp += 35; }
      if (count(p) >= 5) { p.milestones.five = true; p.xp += 35; }
      if (Object.keys(p.best).some(function (k) { return +k >= 16 && +k <= 20; })) { p.milestones.long = true; p.xp += 35; }
      if (count(p) >= 10) { p.milestones.ten = true; p.xp += 35; }
      if (count(p) >= 20) { p.milestones.veteran = true; p.xp += 35; }
    }
    if (v1.v < 3) {
      p.discovered.road = p.discovered.wood = true;
      if (p.unlocked >= 4) p.discovered.steel = true;
      if (p.unlocked >= 7) p.discovered.cable = true;
      EXTRA.forEach(function (m) { if (p.unlocked >= m.stage && level(p.xp) >= m.level) p.discovered[m.id] = true; });
      Object.keys(p.designs || {}).forEach(function (id) {
        var d = p.designs[id];
        if (d && Array.isArray(d.beams)) d.beams.forEach(function (b) { if (MATERIALS.indexOf(b[2]) >= 0) p.discovered[b[2]] = true; });
      });
      if (p.sandbox && p.sandbox.design && Array.isArray(p.sandbox.design.beams))
        p.sandbox.design.beams.forEach(function (b) { if (MATERIALS.indexOf(b[2]) >= 0) p.discovered[b[2]] = true; });
      if (p.sandboxAll) MATERIALS.forEach(function (m) { p.discovered[m] = true; });
      Object.keys(p.best || {}).forEach(function (id) { p.pbRewardBaseline[id] = +p.best[id]; });
      Object.keys(p.grades || {}).forEach(function (id) {
        ['B', 'A', 'S'].forEach(function (tier) { if (rank(p.grades[id]) >= rank(tier)) p.gradeRewards[tier] = true; });
      });
    }
  }
  if (!p.best || typeof p.best !== 'object') p.best = {};
  if (!p.designs || typeof p.designs !== 'object') p.designs = {};
  if (!p.sandbox || typeof p.sandbox !== 'object') p.sandbox = { t: 0, veh: 'carro', wind: 0, water: 0, design: null };
  ['grades', 'stress', 'milestones', 'discovered', 'challenges', 'pbRewardBaseline', 'gradeRewards'].forEach(function (k) { if (!p[k] || typeof p[k] !== 'object') p[k] = {}; });
  p.xp = Math.max(0, Math.floor(+p.xp || 0));
  p.unlocked = Math.max(1, Math.min(20, Math.floor(+p.unlocked || 1)));
  return p;
}
var BUDGETS = [2000,3000,7750,10000,8500,18000,9250,17750,16500,6500,14750,12000,10250,17000,12250,11500,12750,13500,6000,18250];
function available(p, lv) {
  var old = lv.sandbox ? ['road', 'wood'].concat(['steel', 'cable'].filter(function (k) {
    return p.sandboxAll || p.discovered[k] || p.unlocked >= (k === 'steel' ? 4 : 7);
  })) : lv.mats.slice(); // never remove a material required by the original campaign
  EXTRA.forEach(function (m) {
    if ((lv.sandbox ? (p.sandboxAll || p.discovered[m.id] || level(p.xp) >= m.level) : (lv.id >= m.stage && level(p.xp) >= m.level))) old.push(m.id);
  });
  return old;
}
function discover(p, mats) {
  var fresh = [];
  mats.forEach(function (m) { if (MATERIALS.indexOf(m) >= 0 && !p.discovered[m]) { p.discovered[m] = true; fresh.push(m); } });
  return fresh;
}
function materialState(p, id, lv) { return p.discovered[id] ? 'discovered' : lv && available(p, lv).indexOf(id) >= 0 ? 'available' : 'locked'; }
function nextUnlock(p) {
  var early = [
    { id: 'steel', name: 'Aço', stage: 4, level: 1 },
    { id: 'cable', name: 'Cabo', stage: 7, level: 1 }
  ].find(function (x) { return !p.discovered[x.id]; });
  if (early) return { material: early, xpRemaining: 0, levelRemaining: Math.max(0, early.stage - p.unlocked) };
  var m = EXTRA.find(function (x) { return !p.discovered[x.id]; });
  return m ? { material: m, xpRemaining: Math.max(0, THRESHOLDS[m.level - 1] - p.xp), levelRemaining: Math.max(0, m.stage - p.unlocked) } : null;
}
function structuralMass(design, defs) {
  return design.beams.reduce(function (sum, b) {
    var a = design.nodes[b[0]], c = design.nodes[b[1]];
    return sum + (defs[b[2]] ? defs[b[2]].dens : 0) * Math.hypot(a[0] - c[0], a[1] - c[1]) * 40;
  }, 0);
}
function changeMaterial(design, index, material, allowed, defs) {
  var b = design.beams[index], md = defs[material];
  if (!b || !md || allowed.indexOf(material) < 0) return { ok: false, reason: 'Material indisponível.' };
  var a = design.nodes[b[0]], c = design.nodes[b[1]];
  if (!a || !c || Math.hypot(a[0] - c[0], a[1] - c[1]) > md.maxLen + 1e-6)
    return { ok: false, reason: 'Essa barra é longa demais para ' + md.name + '.' };
  var previous = b[2]; b[2] = material;
  return { ok: true, previous: previous };
}
function challengeWins(p, lv, design, defs, beams, left, stress) {
  if (!design || !beams) return [];
  var used = function (m) { return design.beams.filter(function (b) { return b[2] === m; }).length; };
  var length = design.beams.reduce(function (n, b) { var a = design.nodes[b[0]], c = design.nodes[b[1]]; return n + Math.hypot(a[0] - c[0], a[1] - c[1]); }, 0);
  var avgDensity = length ? structuralMass(design, defs) / (length * 40) : Infinity;
  var eligible = {
    steady: lv.id >= 2 && stress <= 70,
    compact: lv.id >= 3 && design.beams.length <= 12,
    noSteel: lv.id >= 4 && lv.mats.indexOf('steel') >= 0 && !used('steel'),
    aluminum: lv.id >= 7 && used('aluminum') >= 3 && avgDensity <= 0.006,
    concrete: lv.id >= 10 && used('concrete') > 0 && beams.some(function (b) { return b.mat === 'concrete' && b.peakCompression >= 0.3 && b.peakTension < 0.9 && !b.broken; }),
    composite: lv.id >= 15 && used('composite') > 0 && left >= lv.budget * 0.15,
    truck: lv.vehicle === 'caminhao' && !used('cable'),
    late: lv.id >= 16 && stress <= 70
  };
  return CHALLENGES.filter(function (c) { return eligible[c.id] && !p.challenges[c.id]; }).map(function (c) { return c.id; });
}
function milestonesFor(p, lv, left, stress) {
  var c = count(p), ids = [];
  if (c >= 1) ids.push('first');
  if (left >= lv.budget * 0.25) ids.push('economy');
  if (stress < 80) ids.push('stress');
  if (c >= 5) ids.push('five');
  if (lv.id >= 16) ids.push('long');
  if (lv.vehicle === 'caminhao') ids.push('truck');
  if (c >= 10) ids.push('ten');
  if (c >= 20) ids.push('veteran');
  return ids.filter(function (id) { return !p.milestones[id]; });
}
function award(p, lv, left, stress, context) {
  var prev = has(p.best, lv.id) ? +p.best[lv.id] : null;
  var oldLevel = level(p.xp), oldUnlocked = p.unlocked, first = prev === null, improved = first || left > prev;
  var gain = first ? 120 + 10 * lv.id : 0;
  var baseline = has(p.pbRewardBaseline, lv.id) ? +p.pbRewardBaseline[lv.id] : prev;
  if (first) p.pbRewardBaseline[lv.id] = left;
  else if (improved && left - baseline >= lv.budget * 0.05) {
    gain += 25 + Math.min(25, Math.floor((left - baseline) / lv.budget * 100));
    p.pbRewardBaseline[lv.id] = left;
  }
  var g = grade(left, lv.budget, stress);
  if (improved) {
    p.best[lv.id] = left;
    p.stress[lv.id] = stress;
  }
  if (!has(p.grades, lv.id) || rank(g) > rank(p.grades[lv.id])) p.grades[lv.id] = g;
  ['B', 'A', 'S'].forEach(function (tier) {
    if (rank(g) >= rank(tier) && !p.gradeRewards[tier]) { p.gradeRewards[tier] = true; gain += tier === 'S' ? 50 : tier === 'A' ? 35 : 25; }
  });
  p.unlocked = Math.max(p.unlocked, Math.min(20, lv.id + 1));
  var marks = milestonesFor(p, lv, left, stress);
  marks.forEach(function (id) { p.milestones[id] = true; gain += 35; });
  var wins = context ? challengeWins(p, lv, context.design, context.defs, context.beams, left, stress) : [];
  wins.forEach(function (id) { p.challenges[id] = true; gain += 45; });
  p.xp += gain;
  var unlocked = EXTRA.filter(function (m) {
      return (oldLevel < m.level || oldUnlocked < m.stage) && level(p.xp) >= m.level && p.unlocked >= m.stage;
    });
  discover(p, unlocked.map(function (m) { return m.id; }));
  return { gained: gain, first: first, improved: improved, previous: prev, grade: g,
    milestones: marks, challenges: wins, newlyAvailable: unlocked };
}
var api = { normalize: normalize, award: award, grade: grade, level: level, title: title, next: next, available: available,
  count: count, EXTRA: EXTRA, MILESTONES: MILESTONES, CHALLENGES: CHALLENGES, MATERIALS: MATERIALS, THRESHOLDS: THRESHOLDS,
  discover: discover, materialState: materialState, nextUnlock: nextUnlock, changeMaterial: changeMaterial, structuralMass: structuralMass };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VaoProgress = api;
})(this);
