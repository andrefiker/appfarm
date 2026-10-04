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
assert.equal(p.v, 2);
assert.equal(p.unlocked, 4);
assert.deepEqual(p.designs, legacy.designs);
assert.deepEqual(p.sandbox, legacy.sandbox);
assert.equal(p.mute, true);
assert.equal(p.xp, 120 + 10 + 120 + 20 + 35 + 35);
assert.equal(P.normalize(JSON.parse(JSON.stringify(p))).xp, p.xp, 'migration is idempotent');
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
assert.equal(P.grade(410, 1000, 92), 'A');
assert.equal(P.grade(5, 1000, 90), 'C');
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
console.log('VÃO progression, migration, original campaign and material simulation checks passed');
