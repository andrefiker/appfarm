const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const nodes = new Map(), data = new Map();
function element(id) {
  if (nodes.has(id)) return nodes.get(id);
  const classes = new Set(['hidden']);
  const el = { id, style: {}, children: [], dataset: {}, textContent: '', innerHTML: '',
    classList: { add: x => classes.add(x), remove: x => classes.delete(x), toggle: (x, yes) => {
      if (yes === undefined ? !classes.has(x) : yes) classes.add(x); else classes.delete(x);
    }, contains: x => classes.has(x) },
    appendChild(child) { this.children.push(child); this.lastChild = child; },
    addEventListener() {}, querySelector(sel) { return element(id + sel); }, getContext() { return new Proxy({}, { get: () => () => {} }); }
  };
  nodes.set(id, el); return el;
}
const document = { getElementById: element, createElement: () => element('new-' + nodes.size), querySelectorAll: () => [] };
const context = { console, document, navigator: {}, innerWidth: 900, innerHeight: 440, devicePixelRatio: 1,
  localStorage: { getItem: k => data.get(k) || null, setItem: (k, v) => data.set(k, v) },
  performance: { now: () => 0 }, requestAnimationFrame() {}, addEventListener() {},
  setTimeout, clearTimeout };
context.window = context;
vm.createContext(context);
scripts.slice(0, 3).forEach(s => vm.runInContext(s, context));
context.VaoLevels = require('../levels-v2.js');
context.VaoProgress = require('../progression.js');
vm.runInContext(scripts[scripts.length - 1], context);
const game = context.__vao, Sim = context.VaoSim.Sim, M = context.Matter;
const original = { nodes: [[10,8],[12,8],[14,8],[11,9],[13,9]],
  beams: [[0,1,'road'],[1,2,'road'],[0,3,'wood'],[3,1,'wood'],[1,4,'wood'],[4,2,'wood'],[3,4,'wood']] };
game.prog.unlocked = 4;
game.openLevel('sb0');
game.setDesign(original);
game.selectBeam(2);
const before = context.VaoSim.designCost(game.design);
game.changeSelectedMaterial('steel');
assert.equal(game.design.beams[2][2], 'steel');
assert.deepEqual(JSON.parse(JSON.stringify(game.design.nodes)), original.nodes);
assert.equal(game.design.beams[2][0], original.beams[2][0]);
assert.equal(game.design.beams[2][1], original.beams[2][1]);
assert(context.VaoSim.designCost(game.design) > before);
assert.equal(game.selectedBeam, 2);
const persisted = JSON.parse(data.get('vao-v1'));
assert.equal(persisted.sandbox.design.beams[2][2], 'steel');
assert.equal(new Sim(M, context.VaoLevels.LEVELS[0], game.design, {}).beams[2].mat, 'steel');
game.changeSelectedMaterial('wood');
game.openLevel(1);
game.setDesign(original);
game.startTest();
assert.equal(game.mode, 'test');
for (let i = 0; i < 3000 && game.sim.state === 'running'; i++) game.sim.step();
assert.equal(game.sim.result, 'success');
game.stopTest();
assert.equal(game.mode, 'build');
assert.equal(game.design.beams[2][2], 'wood');
assert.equal(game.lastFailure, null);
assert.equal(JSON.parse(data.get('vao-v1')).designs[1].beams[2][2], 'wood');
// Complete failure -> diagnosis -> same geometry -> material edit -> retest loop.
game.currentLevel.vehicle = 'caminhao';
game.currentLevel.mats.push('steel'); // QA load variant; campaign level 1 still has its original material list.
game.startTest();
for (let i = 0; i < 3000 && game.sim.state === 'running'; i++) game.sim.step();
assert.equal(game.sim.result, 'fail');
assert.equal(game.sim.firstFailure.mat, 'wood');
game.stopTest();
assert.equal(game.selectedBeam, game.lastFailure.index);
const topology = JSON.stringify(game.design.nodes) + JSON.stringify(game.design.beams.map(b => b.slice(0,2)));
for (let i = 2; i < game.design.beams.length; i++) {
  game.selectBeam(i); game.changeSelectedMaterial('steel');
}
assert.equal(JSON.stringify(game.design.nodes) + JSON.stringify(game.design.beams.map(b => b.slice(0,2))), topology);
game.startTest();
for (let i = 0; i < 3000 && game.sim.state === 'running'; i++) game.sim.step();
assert.equal(game.sim.result, 'success');
game.stopTest();
assert.equal(JSON.parse(data.get('vao-v1')).designs[1].beams[2][2], 'steel');
console.log('VÃO editor swap, simulation, return-to-build and local persistence passed');
