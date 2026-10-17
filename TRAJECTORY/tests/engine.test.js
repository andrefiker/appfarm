import test from "node:test";
import assert from "node:assert/strict";
import {
  integrate,
  DT,
  GRAVITY,
  sweep,
  trace,
  blastDamage,
} from "../web/src/physics.js";
import {
  generateTerrain,
  validTerrain,
  heightAt,
  crater,
  settle,
  rng,
} from "../web/src/terrain.js";
import {
  launch,
  muzzleSpeed,
  radians,
  split,
  WEAPONS,
} from "../web/src/weapons.js";
import { Game, scorePractice, starsFor } from "../web/src/game.js";
import { solve, aimAI } from "../web/src/ai.js";
import { CHALLENGES } from "../web/src/challenges.js";
const run = (g) => {
  let n = 0;
  while (["flight", "settling"].includes(g.phase) && n++ < 3000) g.step();
  assert.ok(n < 3000, "shot must terminate");
};
test("exact constant acceleration is independent of partitions", () => {
  let a = { x: 10, y: 20, vx: 30, vy: -40 };
  let b = { ...a };
  integrate(a, 2, 5, 100);
  for (let i = 0; i < 240; i++) integrate(b, DT, 5, 100);
  assert.ok(Math.abs(a.x - b.x) < 1e-8);
  assert.ok(Math.abs(a.y - b.y) < 1e-8);
  assert.equal(a.y, 140);
});
test("gravity, wind and angle units", () => {
  assert.equal(GRAVITY, 100);
  let p = { x: 0, y: 0, vx: 0, vy: 0 };
  integrate(p, 1, -20);
  assert.deepEqual(p, { x: -10, y: 50, vx: -20, vy: 100 });
  assert.equal(radians(180), Math.PI);
});
test("power is clamped and heavy is slower", () => {
  assert.equal(muzzleSpeed(-1), 80);
  assert.equal(muzzleSpeed(101), 400);
  assert.ok(muzzleSpeed(80, "heavy") < muzzleSpeed(80));
});
test("500 seeds produce valid stable terrain and flat gun support", () => {
  for (let i = 1; i <= 500; i++) {
    const h = generateTerrain(i);
    assert.ok(validTerrain(h));
    assert.deepEqual(h, generateTerrain(i));
    assert.equal(heightAt(h, 90), heightAt(h, 110));
  }
});
test("craters remove ground monotonically and stay finite after repeated destruction", () => {
  const h = generateTerrain(1, "flat");
  const before = [...h];
  crater(h, 500, 443, 64);
  assert.ok(h[250] > before[250]);
  assert.equal(h[250], 507);
  assert.equal(h[200], before[200]);
  for (let i = 0; i < 100; i++) crater(h, 500, 500, 80);
  assert.ok(
    h.every((y, i) => Number.isFinite(y) && y >= before[i] && y <= 592),
  );
});
test("guns settle without floating on crater rims", () => {
  let h = generateTerrain(1, "flat"),
    u = { x: 500, y: 434 };
  crater(h, 500, 440, 70);
  assert.ok(settle(u, h) > 40);
  assert.equal(
    u.y,
    Math.min(
      ...Array.from({ length: 12 }, (_, i) => heightAt(h, 489 + 2 * i)),
    ) - 9,
  );
});
test("swept terrain, unit, obstacle and boundary collisions cannot tunnel", () => {
  let g = new Game();
  g.terrain = generateTerrain(1, "flat");
  assert.equal(sweep({ x: 400, y: 0 }, { x: 400, y: 600 }, g).type, "terrain");
  assert.equal(
    sweep({ x: 0, y: 100 }, { x: -500, y: 100 }, g).type,
    "boundary",
  );
  g.obstacles = [{ x: 450, y: 100, w: 1, h: 100 }];
  assert.equal(
    sweep({ x: 400, y: 150 }, { x: 500, y: 150 }, g).type,
    "obstacle",
  );
  let u = g.units[1];
  assert.equal(
    sweep({ x: u.x - 100, y: u.y }, { x: u.x + 100, y: u.y }, g).type,
    "unit",
  );
});
test("damage is consistent, decays with distance, direct-only targets reject splash", () => {
  const u = { x: 0, y: 0, radius: 14 };
  assert.equal(blastDamage(u, { x: 0, y: 0 }, "standard"), 48);
  assert.equal(blastDamage(u, { x: 100, y: 0 }, "standard"), 0);
  assert.ok(
    blastDamage(u, { x: 40, y: 0 }, "heavy") >
      blastDamage(u, { x: 40, y: 0 }, "standard"),
  );
  assert.equal(
    blastDamage({ ...u, directOnly: true, id: 1 }, { x: 0, y: 0 }, "heavy"),
    0,
  );
});
test("cluster splits once into three independently simulated bomblets", () => {
  let g = new Game({ mode: "practice" });
  const p = launch(g.units[0], 65, 70, "cluster");
  const children = split(p);
  assert.equal(children.length, 3);
  assert.ok(children.every((c) => c.child));
  assert.equal(new Set(children.map((c) => c.vx)).size, 3);
  let t = trace(g, p);
  assert.equal(t.impacts.length, 3);
});
test("extreme shots including wind terminate within bounded steps", () => {
  for (let w of [-30, 0, 30])
    for (let a of [5, 45, 85])
      for (let p of [0, 100]) {
        let g = new Game();
        g.wind = w;
        g.fire(a, p);
        run(g);
        assert.ok(["ai", "result"].includes(g.phase));
      }
});
test("deterministic replay yields identical terrain, health and outcome", () => {
  const replay = () => {
    let g = new Game({ seed: 127 });
    g.fire(48, 72, "cluster");
    run(g);
    return JSON.stringify({
      h: g.terrain,
      u: g.units,
      p: g.phase,
      time: g.time,
      events: g.events,
    });
  };
  assert.equal(replay(), replay());
});
test("fire is locked in flight, restart is fresh and scores bounded", () => {
  let g = new Game();
  assert.ok(g.fire(45, 60));
  assert.equal(g.fire(45, 60), false);
  assert.equal(g.shots, 1);
  assert.equal(new Game().shots, 0);
  assert.equal(scorePractice(1), 1000);
  assert.equal(scorePractice(5), 200);
  assert.equal(starsFor(1), 3);
  assert.equal(starsFor(3), 2);
  assert.equal(starsFor(4), 1);
});
test("AI uses shared physics and improves precision by difficulty and experience", () => {
  const g = new Game({ seed: 4 }),
    target = g.units[0];
  const best = solve(g, g.units[1], target, "standard", 4);
  assert.ok(best.damage > 0);
  let err = { easy: 0, normal: 0, hard: 0 };
  for (const d of Object.keys(err)) {
    for (let i = 0; i < 8; i++) {
      const s = aimAI(g, d, 0, i);
      err[d] += Math.abs(s.angle - best.angle) + Math.abs(s.power - best.power);
    }
  }
  assert.ok(err.hard < err.normal && err.normal < err.easy);
  const a = aimAI(g, "easy", 0, 4),
    b = aimAI(g, "easy", 8, 4);
  assert.ok(b.angle >= 5 && b.angle <= 85);
  assert.ok(a.power >= 0 && a.power <= 100);
});
test("all fifteen authored challenges have a one-shot solution under actual game simulation", () => {
  assert.equal(CHALLENGES.length, 15);
  for (const c of CHALLENGES) {
    let g = new Game({ mode: "challenge", challenge: c.id });
    const w = c.weapon || "standard",
      s = solve(g, g.units[0], g.units[1], w, 2);
    g.fire(s.angle, s.power, w);
    run(g);
    assert.equal(g.winner, 0, `${c.id + 1} ${c.name}: ${JSON.stringify(s)}`);
  }
});
test("ammo exhaustion, defeat, victory and mutual destruction resolve once", () => {
  let g = new Game({ mode: "challenge" });
  g.ammo = 1;
  g.fire(85, 0);
  run(g);
  assert.equal(g.winner, 1);
  g = new Game();
  g.units[1].hp = 0;
  g.finishTurn();
  assert.equal(g.winner, 0);
  g.units[0].hp = 0;
  g.finishTurn();
  assert.equal(g.winner, "draw");
  assert.equal(g.fire(45, 80), false);
});
