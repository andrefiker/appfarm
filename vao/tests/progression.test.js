const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const P = require('../progression.js');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const inline = [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].map(x => x[1]);
const context = { console, setTimeout, clearTimeout };
vm.createContext(context);
inline.slice(0, 3).forEach(code => vm.runInContext(code, context));
const S = context.VaoSim, LV = context.VaoLevels;

const legacy = { v: 1, unlocked: 4, best: { 1: 500, 2: 800 }, designs: { 1: { nodes: [[1, 2]], beams: [] } },
  sandbox: { t: 2, veh: 'van', wind: 1, water: 0, design: { nodes: [], beams: [] } }, mute: true, seenHelp: true };
const p = P.normalize(legacy);
assert.equal(p.v, 3);
assert.equal(p.unlocked, 4);
assert.deepEqual(p.designs, legacy.designs);
assert.deepEqual(p.sandbox, legacy.sandbox);
assert.equal(p.mute, true);
assert.equal(p.xp, 120 + 10 + 120 + 20 + 35 + 35);
assert.equal(P.normalize(JSON.parse(JSON.stringify(p))).xp, p.xp, 'migration is idempotent');
assert(P.materialState(P.normalize(null), 'steel') === 'locked');
assert.equal(P.materialState(p, 'steel'), 'discovered');
assert.equal(P.materialState(p, 'cable'), 'locked');
assert.equal(P.nextUnlock(p).material.id, 'cable');
assert.equal(P.available(P.normalize(null), LV.SANDBOX_TERRAINS[0]).join(','), 'road,wood');
assert.equal(P.materialState(P.normalize(null), 'wood', LV.SANDBOX_TERRAINS[0]), 'available');
const v11 = P.normalize({ v: 2, xp: 910, unlocked: 8, best: { 1: 500 }, grades: { 1: 'A' }, stress: { 1: 65 },
  milestones: { first: true }, designs: legacy.designs, sandbox: legacy.sandbox, mute: true, sandboxAll: false });
assert.equal(v11.xp, 910);
assert.equal(v11.v, 3);
assert.equal(v11.pbRewardBaseline[1], 500);
assert(v11.gradeRewards.B && v11.gradeRewards.A);
assert.equal(v11.discovered.cable, true);
assert.equal(v11.challenges.steady, undefined);
assert.deepEqual(v11.designs, legacy.designs);
assert.equal(P.normalize(JSON.parse(JSON.stringify(v11))).xp, 910);
const oldSandbox = P.normalize({v:2, sandbox:{...legacy.sandbox, design:{nodes:[[1,1],[2,2]], beams:[[0,1,'cable']]}}, unlocked:1});
assert.equal(oldSandbox.discovered.cable, true, 'migration preserves used sandbox materials');
assert(P.available(oldSandbox, LV.SANDBOX_TERRAINS[0]).includes('cable'));
const first = P.award(p, LV.LEVELS[2], 2000, 75);
assert(first.gained >= 150);
assert.equal(p.unlocked, 4);
const unchanged = P.award(p, LV.LEVELS[2], 2000, 75);
assert.equal(unchanged.gained, 0, 'unchanged replay cannot farm XP');
const improved = P.award(p, LV.LEVELS[2], 3000, 75);
assert(improved.gained > 0 && improved.gained < first.gained);
assert.equal(P.award(p, LV.LEVELS[2], 3000, 75).gained, 0);
assert.equal(p.best[3], 3000);
assert.equal(P.grade(410, 1000, 70), 'S');
assert.equal(P.grade(410, 1000, 92), 'B');
assert.equal(P.grade(5, 1000, 90), 'C');
assert.equal(P.grade(300, 1000, 78), 'A');
assert.equal(P.grade(450, 1000, 92), 'B');
assert.equal(P.level(P.THRESHOLDS[2] - 1), 2);
assert.equal(P.level(P.THRESHOLDS[2]), 3);

const fresh = P.normalize(null);
assert.deepEqual(P.available(fresh, LV.LEVELS[0]), LV.LEVELS[0].mats);
const veteran = P.normalize(null);
veteran.xp = 2700; veteran.unlocked = 20;
for (const lv of LV.LEVELS) {
  const available = P.available(veteran, lv);
  assert(lv.mats.every(k => available.includes(k)), `level ${lv.id} retains its v1 tools`);
  assert.equal(lv.budget, [2000,3000,7750,10000,8500,18000,9250,17750,16500,6500,14750,12000,10250,17000,12250,11500,12750,13500,6000,18250][lv.id - 1]);
}
assert.equal(LV.LEVELS.length, 20);
assert(P.available(veteran, LV.LEVELS[14]).includes('composite'));
assert(!P.available(fresh, LV.LEVELS[14]).includes('composite'));
assert(!P.available(fresh, LV.SANDBOX_TERRAINS[0]).includes('composite'));
veteran.sandboxAll = true;
assert.equal(P.available(veteran, LV.SANDBOX_TERRAINS[0]).length, 7);

const m = S.MATS;
const edited = { nodes: [[10,8],[11,9]], beams: [[0,1,'wood']] };
const geometry = JSON.stringify(edited.nodes);
const beforeCost = S.designCost(edited);
assert.equal(P.changeMaterial(edited, 0, 'steel', ['road','wood','steel'], m).ok, true);
assert.equal(JSON.stringify(edited.nodes), geometry);
assert.deepEqual(edited.beams.map(b => b.slice(0,2)), [[0,1]]);
assert(S.designCost(edited) > beforeCost);
const newPhysics = new S.Sim(context.Matter, { h:16, w:30, terrain:[], anchors:[[10,8]], mats:Object.keys(m), vehicle:'carro', seed:1 }, edited, {noVehicle:true});
assert(Math.abs(newPhysics.beams[0].tlim - m.steel.tens * .006) < 1e-12);
assert.equal(P.changeMaterial(edited, 0, 'composite', ['road','wood','steel'], m).ok, false);
assert.equal(edited.beams[0][2], 'steel');
const longBeam = {nodes:[[0,0],[4,0]], beams:[[0,1,'cable']]};
assert.equal(P.changeMaterial(longBeam,0,'wood',['wood','cable'],m).ok,false);
assert.equal(longBeam.beams[0][2], 'cable');
assert(m.aluminum.dens < m.wood.dens && m.aluminum.tens < m.steel.tens);
assert(m.concrete.comp > m.steel.comp && m.concrete.tens < m.wood.tens && m.concrete.dens > m.steel.dens);
assert(m.composite.dens < m.aluminum.dens && m.composite.cost > m.steel.cost && m.composite.comp < m.steel.comp);
const small = { h: 16, w: 10, terrain: [], anchors: [[2, 2]], mats: Object.keys(m), vehicle: 'carro', seed: 1 };
const nodes = [[2, 2], [2, 4]];
for (const k of ['wood', 'steel', 'cable', 'aluminum', 'concrete', 'composite']) {
  const d = { nodes, beams: [[0, 1, k]] };
  assert.equal(S.validateDesign(small, d).length, 0);
  const sim = new S.Sim(context.Matter, small, d, { noVehicle: true });
  assert.equal(sim.beams[0].mat, k);
  assert(Math.abs(sim.beams[0].tlim - m[k].tens * .006) < 1e-12);
  assert(Math.abs(sim.beams[0].clim - m[k].comp * .006 * (m[k].buckle ? Math.min(1, 2 / 2) : 1)) < 1e-12);
  assert.equal(S.designCost(d), Math.round(m[k].cost * 2 / 10) * 10);
  for (let i = 0; i < 10; i++) sim.step();
}
// A reference truss from the original first level actually crosses within budget.
// Swap its braces to compare material behavior under the same vehicle and terrain.
const crossing = LV.LEVELS[0];
const outcomes = {};
for (const k of ['wood', 'steel', 'cable', 'aluminum', 'concrete', 'composite']) {
  const d = { nodes: [[10,8],[12,8],[14,8],[11,9],[13,9]],
    beams: [[0,1,'road'],[1,2,'road'],[0,3,k],[3,1,k],[1,4,k],[4,2,k],[3,4,k]] };
  const trial = { ...crossing, mats: Object.keys(m) };
  assert.equal(S.validateDesign(trial, d).length, 0);
  const sim = new S.Sim(context.Matter, trial, d, {});
  for (let i = 0; i < 3000 && sim.state === 'running'; i++) sim.step();
  outcomes[k] = { result: sim.result, cost: S.designCost(d), failure: sim.firstFailure };
}
assert.equal(outcomes.wood.result, 'success');
assert(outcomes.wood.cost <= crossing.budget);
assert.equal(outcomes.cable.result, 'fail', 'cables cannot replace compression braces');
assert.equal(outcomes.concrete.result, 'fail', 'concrete fails in tension');
assert(outcomes.concrete.failure && outcomes.concrete.failure.mat === 'concrete');
assert(['tração','compressão','deformação'].includes(outcomes.concrete.failure.mode));
assert(outcomes.cable.failure && outcomes.cable.failure.index >= 0);
assert(outcomes.cable.failure.frame >= 0);
assert.equal(m.cable.comp, 0);
assert(outcomes.concrete.failure.percent > 0);
function forceOne(material, force) {
  const d = { nodes:[[2,2],[2,4]], beams:[[0,1,material]] };
  const s = new S.Sim(context.Matter, small, d, {noVehicle:true});
  const dt = (1000/60)/8;
  s.beams[0].c.lam = -(force/.06) * dt * dt;
  s._postSub();
  return s;
}
const concreteTension = forceOne('concrete', .006);
const concreteCompression = forceOne('concrete', -.006);
assert.equal(concreteTension.firstFailure.mode, 'tração');
assert.equal(concreteTension.firstFailure.index, 0);
assert.equal(concreteCompression.firstFailure, null, 'same load is safe in compression');
assert(concreteCompression.beams[0].peakCompression > 0);
const cableCompression = forceOne('cable', -.006);
assert.equal(cableCompression.beams[0].stress, 0, 'slack cable cannot resist compression');
assert.equal(cableCompression.firstFailure, null);
for (const k of ['steel', 'aluminum', 'composite']) assert.equal(outcomes[k].result, 'success');
assert(outcomes.composite.cost > outcomes.steel.cost && outcomes.steel.cost > outcomes.aluminum.cost);
const antiFarm = P.normalize(null), lv = LV.LEVELS[5];
P.award(antiFarm, lv, 2000, 88);
const originalXp = antiFarm.xp;
for (let left = 2010; left <= 2090; left += 10) assert.equal(P.award(antiFarm, lv, left, 88).gained, 0);
assert.equal(antiFarm.xp, originalXp);
assert(P.award(antiFarm, lv, 2900, 88).gained > 0, 'cumulative 5% budget saving rewards once');
const afterReward = antiFarm.xp;
for (let left = 2910; left < 3200; left += 10) P.award(antiFarm, lv, left, 88);
assert.equal(antiFarm.xp, afterReward, 'small PB steps after rewarded baseline cannot farm XP');
const challengeState = P.normalize(null);
const challengeDesign = { nodes:[[0,0],[1,0]], beams:[[0,1,'wood']] };
const challengeLv = LV.LEVELS[3];
const challengeFirst = P.award(challengeState, challengeLv, 1000, 65, {design:challengeDesign,defs:m,beams:[]});
assert(challengeFirst.challenges.includes('steady') && challengeFirst.challenges.includes('noSteel'));
const challengeAgain = P.award(challengeState, challengeLv, 1000, 65, {design:challengeDesign,defs:m,beams:[]});
assert.equal(challengeAgain.gained, 0);
assert.deepEqual(challengeAgain.challenges, []);
assert.equal(P.normalize(JSON.parse(JSON.stringify(challengeState))).challenges.noSteel, true);
console.log('VÃO progression, migration, original campaign and material simulation checks passed');
