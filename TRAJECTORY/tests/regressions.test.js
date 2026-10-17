import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../web/src/game.js";
import { trace } from "../web/src/physics.js";
import { launch } from "../web/src/weapons.js";
test("cluster preview follows live craters and target destruction for later bomblets", () => {
  const g = new Game({ mode: "practice", seed: 4 });
  const predicted = trace(g, launch(g.units[0], 25, 70, "cluster")).impacts;
  g.fire(25, 70, "cluster");
  let n = 0;
  while (["flight", "settling"].includes(g.phase) && n++ < 3000) g.step();
  const actual = g.events.filter((e) => e.type === "blast");
  assert.equal(predicted.length, actual.length);
  for (let i = 0; i < actual.length; i++) {
    assert.ok(
      Math.abs(predicted[i].x - actual[i].x) < 1e-8,
      `impact ${i}: predicted ${predicted[i].x} actual ${actual[i].x}`,
    );
    assert.ok(Math.abs(predicted[i].y - actual[i].y) < 1e-8);
  }
});
const R = await import("../web/src/render.js");
test("camera and particles setting disables all camera follow axes", () => {
  assert.equal(typeof R.cameraTarget, "function");
  const g = { projectiles: [{ x: 100, y: -500 }] };
  assert.deepEqual(R.cameraTarget(g, false), { x: 500, y: 0, z: 1 });
  assert.ok(R.cameraTarget(g, true).y < 0);
});
import {solve,aimAI} from '../web/src/ai.js';
test('moving challenge stays solvable at sixteen different firing times',()=>{for(let time=0;time<16;time++){const g=new Game({mode:'challenge',challenge:14});g.time=time;const s=solve(g,g.units[0],g.units[1],'standard',2);g.fire(s.angle,s.power);for(let n=0;n<3000&&['flight','settling'].includes(g.phase);n++)g.step();assert.equal(g.winner,0,'time '+time);}});
test('generated duel fields provide a firing solution from both sides',()=>{for(let seed=1;seed<=20;seed++){const g=new Game({seed});assert.ok(solve(g,g.units[0],g.units[1],'standard',4).damage>0,'player seed '+seed);assert.ok(solve(g,g.units[1],g.units[0],'standard',4).damage>0,'rival seed '+seed);}});
test('AI learns range across attempts without changing physics',()=>{let initial=0,learned=0;const g=new Game({seed:4}),best=solve(g,g.units[1],g.units[0],'standard',4);for(let seed=1;seed<=12;seed++){const a=aimAI(g,'easy',0,seed),b=aimAI(g,'easy',8,seed);initial+=Math.abs(a.angle-best.angle)+Math.abs(a.power-best.power);learned+=Math.abs(b.angle-best.angle)+Math.abs(b.power-best.power);}assert.ok(learned<initial*.5);assert.equal(g.gravity,100);});
