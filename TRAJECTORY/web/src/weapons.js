export const WEAPONS = Object.freeze({
  standard: {
    name: "Standard",
    short: "Balanced & precise",
    speed: 1,
    damage: 48,
    blast: 63,
    crater: 42,
    color: "#ffd18a",
  },
  heavy: {
    name: "Heavy",
    short: "Slow • deep crater",
    speed: 0.82,
    damage: 72,
    blast: 80,
    crater: 64,
    color: "#ff9d6b",
  },
  cluster: {
    name: "Cluster",
    short: "Splits after the apex",
    speed: 1,
    damage: 23,
    blast: 43,
    crater: 28,
    color: "#98e4d2",
  },
});
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const radians = (d) => (d * Math.PI) / 180;
export const muzzleSpeed = (power, weapon = "standard") =>
  (80 + clamp(power, 0, 100) * 3.2) * WEAPONS[weapon].speed;
export function launch(unit, angle, power, weapon = "standard") {
  const a = radians(clamp(angle, 5, 85)),
    dir = unit.facing || 1,
    s = muzzleSpeed(power, weapon);
  return {
    x: unit.x + Math.cos(a) * 26 * dir,
    y: unit.y - Math.sin(a) * 26,
    vx: Math.cos(a) * s * dir,
    vy: -Math.sin(a) * s,
    weapon,
    owner: unit.id,
    age: 0,
    child: false,
    trail: [],
  };
}
export function split(p) {
  return [-1, 0, 1].map((i) => ({
    ...p,
    vx: p.vx * 0.83 + i * 42,
    vy: 32 + Math.abs(i) * 7,
    child: true,
    path: i + 1,
    trail: [],
  }));
}
