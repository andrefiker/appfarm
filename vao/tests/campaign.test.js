const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const inline = [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].map(x => x[1]);
const context = { console, setTimeout, clearTimeout };
vm.createContext(context);
inline.slice(0, 2).forEach(code => vm.runInContext(code, context));
const S = context.VaoSim;
const LV = require('../levels-v2.js');
assert.equal(LV.LEVELS.length, 36);
assert(LV.SANDBOX_TERRAINS.length >= 6);
const envs = new Set(LV.LEVELS.map(l => l.env));
const kinds = new Set(LV.LEVELS.map(l => l.kind));
const chapters = new Set(LV.LEVELS.map(l => l.chapter));
assert(envs.size >= 9, 'campaign has at least nine visual environments');
assert(kinds.size >= 30, 'campaign geometry/objectives are intentionally non-repetitive');
assert(chapters.size >= 9, 'campaign is divided into distinct structural chapters');
const signatures = new Set();
for (const lv of LV.LEVELS) {
  assert.equal(lv.id >= 1 && lv.id <= 36, true);
  assert(Number.isFinite(lv.budget) && lv.budget > 0);
  assert(lv.start < lv.goal && lv.goal < lv.w);
  assert(Array.isArray(lv.terrain) && lv.terrain.length >= 2);
  assert(Array.isArray(lv.anchors) && lv.anchors.length >= 4);
  assert(Array.isArray(lv.mats) && lv.mats.includes('road') && lv.mats.includes('wood'));
  assert(S.VEHICLES[lv.vehicle], 'known vehicle for level ' + lv.id);
  for (const a of lv.anchors) assert(a[0] >= 0 && a[0] <= lv.w && a[1] >= -1 && a[1] <= lv.h);
  const gy0 = S.groundY(lv, lv.start), gy1 = S.groundY(lv, lv.goal);
  assert(gy0 < lv.h && gy1 < lv.h, 'start and finish are on grounded terrain for level ' + lv.id);
  const signature = JSON.stringify({
    terrain:lv.terrain.map(p=>p.map(q=>q.map ? q.map(Number) : q)),
    anchors:lv.anchors,
    platform:!!lv.platform, water:!!lv.water, wind:!!lv.wind,
    start:lv.start,goal:lv.goal,w:lv.w,vehicle:lv.vehicle
  });
  assert(!signatures.has(signature), 'duplicate structural level signature at ' + lv.id);
  signatures.add(signature);
}
assert(LV.LEVELS.filter(l=>l.platform).length >= 5);
assert(LV.LEVELS.filter(l=>l.water).length >= 9);
assert(LV.LEVELS.filter(l=>l.wind).length >= 7);
assert(LV.LEVELS.filter(l=>l.terrain.length >= 3).length >= 12);
assert(LV.LEVELS.filter(l=>l.terrain.some(p=>p.some(q=>q[1] <= 4.5))).length >= 10);
assert.equal(LV.LEVELS.filter(l=>l.brief).length,36,'every campaign level has an engineering brief');
assert(new Set(LV.LEVELS.map(l=>l.brief.type)).size>=6,'briefs use several engineering objective families');
for(const lv of LV.LEVELS){ assert(lv.brief.label&&lv.brief.note&&lv.brief.reward>=30,'complete brief metadata on '+lv.id); }
console.log('VÃO 1.4 campaign variety, terrain integrity and engineering brief checks passed');
