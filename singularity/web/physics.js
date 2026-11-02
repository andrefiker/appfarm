/* SINGULARITY — deterministic, testable orbital mechanics. MIT-style AppFarm source. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SingularityPhysics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const length = (x, y) => Math.hypot(x, y);
  function acceleration(x, y, hole, grav = 1) {
    const dx = hole.x - x, dy = hole.y - y;
    const r2 = dx * dx + dy * dy;
    const softened = Math.max(r2, hole.r * hole.r * 0.55);
    const inv = 1 / Math.sqrt(softened);
    const scale = (hole.mu || 3100000) * grav / (softened * Math.sqrt(softened));
    return { x: dx * scale, y: dy * scale, radius: Math.sqrt(r2), directionX: dx * inv, directionY: dy * inv };
  }
  function step(body, hole, dt, grav = 1) {
    // Kick-drift-kick (velocity Verlet) is significantly more stable than Euler for near-orbits.
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.05) return body;
    const a = acceleration(body.x, body.y, hole, grav);
    const vx = body.vx + 0.5 * a.x * dt;
    const vy = body.vy + 0.5 * a.y * dt;
    const x = body.x + vx * dt, y = body.y + vy * dt;
    const b = acceleration(x, y, hole, grav);
    body.vx = vx + 0.5 * b.x * dt;
    body.vy = vy + 0.5 * b.y * dt;
    body.x = x; body.y = y;
    body.lifetime = (body.lifetime || 0) + dt;
    body.closest = Math.min(body.closest == null ? Infinity : body.closest, b.radius);
    return body;
  }
  function heading(source, target) {
    const dx = target.x - source.x, dy = target.y - source.y;
    const d = length(dx, dy);
    // Shot speed is bounded so gestures work on both narrow and wide touchscreens.
    const speed = clamp(d * 2.2, 380, 850);
    return d > 1 ? { vx: dx / d * speed, vy: dy / d * speed, speed } : { vx: 0, vy: -440, speed: 440 };
  }
  function trajectory(source, target, hole, grav = 1, count = 90, dt = 1/45) {
    const shot = heading(source, target);
    const body = { x: source.x, y: source.y, vx: shot.vx, vy: shot.vy, closest: Infinity };
    const pts = [];
    for (let i = 0; i < count; i++) {
      step(body, hole, dt, grav);
      if (i % 3 === 0) pts.push({ x: body.x, y: body.y });
      if (length(body.x - hole.x, body.y - hole.y) < hole.r * 0.83) break;
    }
    return pts;
  }
  function collect(body, item, radius = 17) {
    return length(body.x - item.x, body.y - item.y) <= radius;
  }
  return { acceleration, step, heading, trajectory, collect, clamp, length };
});
