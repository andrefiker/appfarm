import { heightAt, WIDTH, FLOOR, crater, settle } from "./terrain.js";
import { WEAPONS, clamp, split } from "./weapons.js";
export const DT = 1 / 120,
  GRAVITY = 100;
export function integrate(p, dt, wind = 0, gravity = GRAVITY) {
  p.x += p.vx * dt + 0.5 * wind * dt * dt;
  p.y += p.vy * dt + 0.5 * gravity * dt * dt;
  p.vx += wind * dt;
  p.vy += gravity * dt;
}
export function targetPosition(u, time) {
  return u.motion
    ? { x: u.baseX + Math.sin(time * u.motion) * u.amplitude, y: u.y }
    : u;
}
export function sweep(a, b, world, time = 0, owner = null, age = 1) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
  for (let i = 1; i <= steps; i++) {
    const k = i / steps,
      x = a.x + (b.x - a.x) * k,
      y = a.y + (b.y - a.y) * k;
    for (const unit of world.units) {
      if (unit.hp <= 0 || (unit.id === owner && age < 0.3)) continue;
      const u = targetPosition(unit, time);
      if (Math.hypot(x - u.x, y - u.y) < (unit.radius || 14) + 2)
        return { x, y, type: "unit", unit };
    }
    for (const o of world.obstacles || [])
      if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h)
        return { x, y, type: "obstacle", obstacle: o };
    if (x < 0 || x > WIDTH || y > FLOOR + 20 || y < -1400)
      return { x, y, type: "boundary" };
    if (y >= heightAt(world.terrain, x)) return { x, y, type: "terrain" };
  }
  return null;
}
export function advance(p, world, time, dt = DT) {
  const old = { x: p.x, y: p.y };
  integrate(p, dt, world.wind, world.gravity ?? GRAVITY);
  p.age += dt;
  const hit = sweep(old, p, world, time, p.owner, p.age);
  if (hit) {
    p.x = hit.x;
    p.y = hit.y;
    return { hit };
  }
  if (p.weapon === "cluster" && !p.child && p.vy >= 12)
    return { children: split(p) };
  if (p.age > 16) return { hit: { x: p.x, y: p.y, type: "boundary" } };
  return {};
}
export function blastDamage(unit, impact, weapon) {
  const w = WEAPONS[weapon],
    d = Math.max(
      0,
      Math.hypot(unit.x - impact.x, unit.y - impact.y) - (unit.radius || 14),
    );
  if (unit.directOnly && impact.unit?.id !== unit.id) return 0;
  return d >= w.blast ? 0 : Math.round(w.damage * (1 - d / w.blast));
}
export function applyExplosion(world, hit, weapon, time = world.time || 0) {
  const events = [],
    w = WEAPONS[weapon];
  crater(world.terrain, hit.x, hit.y, w.crater);
  for (const unit of world.units) {
    if (unit.hp <= 0) continue;
    const pos = targetPosition(unit, time),
      amount = blastDamage({ ...unit, ...pos }, hit, weapon);
    if (amount > 0) {
      unit.hp = Math.max(0, unit.hp - amount);
      events.push({
        type: "damage",
        unit: unit.id,
        amount,
        x: pos.x,
        y: unit.y,
      });
    }
  }
  for (const unit of world.units) {
    if (!unit.motion) {
      const fall = settle(unit, world.terrain);
      if (fall > 28 && unit.hp > 0) {
        const amount = Math.round((fall - 28) * 0.3);
        unit.hp = Math.max(0, unit.hp - amount);
        events.push({
          type: "damage",
          unit: unit.id,
          amount,
          x: unit.x,
          y: unit.y,
        });
      }
    }
  }
  return events;
}
export function trace(world, p, maxSteps = 2000) {
  if (p.weapon === "cluster")
    world = {
      ...world,
      terrain: [...world.terrain],
      units: world.units.map((u) => ({ ...u })),
    };
  const queue = [p],
    points = [],
    impacts = [];
  let closest = Infinity,
    elapsed = 0;
  for (let i = 0; i < maxSteps && queue.length; i++) {
    elapsed += DT;
    for (let j = queue.length - 1; j >= 0; j--) {
      const q = queue[j],
        r = advance(q, world, (world.time || 0) + elapsed);
      if (i % 8 === 0) points.push({ x: q.x, y: q.y, path: q.path || 0 });
      const target = world.units.find((u) => u.id !== p.owner && u.hp > 0);
      if (target) {
        const pos = targetPosition(target, (world.time || 0) + elapsed);
        closest = Math.min(closest, Math.hypot(q.x - pos.x, q.y - pos.y));
      }
      if (r.hit) {
        impacts.push({ ...r.hit, weapon: q.weapon });
        if (p.weapon === "cluster" && r.hit.type !== "boundary")
          applyExplosion(world, r.hit, q.weapon, (world.time || 0) + elapsed);
        queue.splice(j, 1);
      } else if (r.children) {
        queue.splice(j, 1, ...r.children);
      }
    }
  }
  return { points, impacts, closest, elapsed };
}
