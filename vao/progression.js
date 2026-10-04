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
function has(o, k) { return Object.prototype.hasOwnProperty.call(o || {}, k); }
function count(p) { return Object.keys(p.best || {}).filter(function (k) { return Number.isFinite(+p.best[k]); }).length; }
function grade(left, budget, stress) {
  var ratio = budget > 0 ? Math.max(0, left / budget) : 0;
  if (ratio >= 0.4 && stress < 90) return 'S';
  if (ratio >= 0.25) return 'A';
  if (ratio >= 0.1) return 'B';
  return 'C';
}
function level(xp) {
  var n = 1;
  while (n < THRESHOLDS.length && xp >= THRESHOLDS[n]) n++;
  return n;
}
function title(n) { return TITLES[Math.min(TITLES.length - 1, n - 1)]; }
function next(xp) { return THRESHOLDS[Math.min(THRESHOLDS.length - 1, level(xp))]; }
function normalize(v1) {
  var p = { v: 2, unlocked: 1, best: {}, designs: {}, sandbox: { t: 0, veh: 'carro', wind: 0, water: 0, design: null }, mute: false, seenHelp: false,
    xp: 0, grades: {}, stress: {}, milestones: {}, sandboxAll: false };
  if (v1 && (v1.v === 1 || v1.v === 2)) {
    ['unlocked', 'best', 'designs', 'mute', 'seenHelp', 'sandbox'].forEach(function (k) { if (has(v1, k)) p[k] = v1[k]; });
    if (v1.v === 2) ['xp', 'grades', 'stress', 'milestones', 'sandboxAll'].forEach(function (k) { if (has(v1, k)) p[k] = v1[k]; });
    else {
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
  }
  if (!p.best || typeof p.best !== 'object') p.best = {};
  if (!p.designs || typeof p.designs !== 'object') p.designs = {};
  if (!p.sandbox || typeof p.sandbox !== 'object') p.sandbox = { t: 0, veh: 'carro', wind: 0, water: 0, design: null };
  ['grades', 'stress', 'milestones'].forEach(function (k) { if (!p[k] || typeof p[k] !== 'object') p[k] = {}; });
  p.xp = Math.max(0, Math.floor(+p.xp || 0));
  p.unlocked = Math.max(1, Math.min(20, Math.floor(+p.unlocked || 1)));
  return p;
}
var BUDGETS = [2000,3000,7750,10000,8500,18000,9250,17750,16500,6500,14750,12000,10250,17000,12250,11500,12750,13500,6000,18250];
function available(p, lv) {
  var old = lv.mats.slice(); // never remove a material required by the original campaign
  EXTRA.forEach(function (m) {
    if ((lv.sandbox ? (p.sandboxAll || level(p.xp) >= m.level) : (lv.id >= m.stage && level(p.xp) >= m.level))) old.push(m.id);
  });
  return old;
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
function award(p, lv, left, stress) {
  var prev = has(p.best, lv.id) ? +p.best[lv.id] : null;
  var oldLevel = level(p.xp), oldUnlocked = p.unlocked, first = prev === null, improved = first || left > prev;
  var gain = first ? 120 + 10 * lv.id : improved ? 20 + Math.min(55, Math.floor((left - prev) / Math.max(1, lv.budget) * 100)) : 0;
  if (improved) {
    p.best[lv.id] = left;
    p.grades[lv.id] = grade(left, lv.budget, stress);
    p.stress[lv.id] = stress;
  }
  p.unlocked = Math.max(p.unlocked, Math.min(20, lv.id + 1));
  var marks = milestonesFor(p, lv, left, stress);
  marks.forEach(function (id) { p.milestones[id] = true; gain += 35; });
  p.xp += gain;
  return { gained: gain, first: first, improved: improved, previous: prev, grade: grade(left, lv.budget, stress),
    milestones: marks, newlyAvailable: EXTRA.filter(function (m) {
      return (oldLevel < m.level || oldUnlocked < m.stage) && level(p.xp) >= m.level && p.unlocked >= m.stage;
    }) };
}
var api = { normalize: normalize, award: award, grade: grade, level: level, title: title, next: next, available: available,
  count: count, EXTRA: EXTRA, MILESTONES: MILESTONES, THRESHOLDS: THRESHOLDS };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VaoProgress = api;
})(this);
