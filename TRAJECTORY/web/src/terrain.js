import { clamp } from "./weapons.js";
export const WIDTH = 1000,
  FLOOR = 600,
  DX = 2;
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function generateTerrain(seed = 1, profile = "rolling") {
  const random = rng(seed),
    phase = random() * 6.28,
    phase2 = random() * 6.28;
  const h = Array.from({ length: WIDTH / DX + 1 }, (_, i) => {
    const x = i * DX;
    let y =
      426 + Math.sin(x / 133 + phase) * 40 + Math.sin(x / 68 + phase2) * 16;
    if (profile === "flat") y = 443;
    if (profile === "valley") y = 330 + Math.sin((x / 1000) * Math.PI) * 140;
    if (profile === "ridge")
      y = 440 - Math.exp(-Math.pow((x - 500) / 130, 2)) * 125;
    if (profile === "high") y = 480 - x * 0.19 + Math.sin(x / 95) * 12;
    return clamp(y, 270, 510);
  });
  for (const cx of [100, 880]) {
    const y = h[Math.round(cx / DX)];
    for (let i = ((cx - 25) / DX) | 0; i <= (cx + 25) / DX; i++) h[i] = y;
  }
  return h;
}
export function heightAt(h, x) {
  const n = clamp(x / DX, 0, h.length - 1),
    i = Math.floor(n);
  return h[i] + ((h[i + 1] ?? h[i]) - h[i]) * (n - i);
}
export function crater(h, x, y, r) {
  let changed = 0;
  for (
    let i = Math.max(0, Math.floor((x - r) / DX));
    i <= Math.min(h.length - 1, Math.ceil((x + r) / DX));
    i++
  ) {
    const d = i * DX - x;
    if (Math.abs(d) > r) continue;
    const reach = Math.sqrt(r * r - d * d);
    if (y + reach >= h[i] && y - reach <= FLOOR) {
      let next = clamp(Math.max(h[i], y + reach), 0, FLOOR - 8);
      if (next !== h[i]) changed++;
      h[i] = next;
    }
  }
  return changed;
}
export function settle(unit, h) {
  const prev = unit.y;
  let support = FLOOR;
  for (let x = unit.x - 11; x <= unit.x + 11; x += 2)
    support = Math.min(support, heightAt(h, x));
  unit.y = support - 9;
  return Math.max(0, unit.y - prev);
}
export function validTerrain(h) {
  return (
    h.length === 501 &&
    h.every((y) => Number.isFinite(y) && y >= 200 && y < FLOOR) &&
    Math.abs(heightAt(h, 100) - heightAt(h, 880)) < 210
  );
}
