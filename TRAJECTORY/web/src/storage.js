import { clamp } from "./weapons.js";
import { starsFor } from "./game.js";
export const STORAGE_KEY = "trajectory.progress.v1";
export function loadProgress(storage) {
  const p = {
    version: 1,
    wins: 0,
    losses: 0,
    shots: 0,
    hits: 0,
    direct: 0,
    bestPractice: 0,
    challenges: Array(15).fill(0),
    tutorial: false,
    settings: {
      sound: true,
      haptics: true,
      left: true,
      guide: true,
      motion: true,
      difficulty: "normal",
    },
  };
  try {
    const raw = JSON.parse(storage?.getItem(STORAGE_KEY) || "null");
    if (raw && typeof raw === "object") {
      for (const k of [
        "wins",
        "losses",
        "shots",
        "hits",
        "direct",
        "bestPractice",
      ])
        if (Number.isFinite(raw[k])) p[k] = Math.floor(clamp(raw[k], 0, 1e9));
      p.challenges = p.challenges.map((_, i) =>
        Number.isFinite(raw.challenges?.[i])
          ? Math.floor(clamp(raw.challenges[i], 0, 3))
          : 0,
      );
      for (const k of ["sound", "haptics", "left", "guide", "motion"])
        if (typeof raw.settings?.[k] === "boolean")
          p.settings[k] = raw.settings[k];
      if (["easy", "normal", "hard"].includes(raw.settings?.difficulty))
        p.settings.difficulty = raw.settings.difficulty;
      p.tutorial = raw.tutorial === true;
    }
  } catch {}
  return p;
}
export function saveProgress(storage, p) {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
export function recordResult(p, g) {
  if (g.recorded) return;
  g.recorded = true;
  p.shots += g.shots;
  p.hits += g.hits;
  p.direct += g.direct;
  if (g.mode === "duel") {
    if (g.winner === 0) p.wins++;
    else if (g.winner === 1) p.losses++;
  }
  if (g.mode === "challenge" && g.winner === 0)
    p.challenges[g.challenge] = Math.max(
      p.challenges[g.challenge],
      starsFor(g.shots),
    );
}
export function achievements(p) {
  return [
    p.wins >= 1 && "First victory",
    p.direct >= 1 && "Dead centre",
    p.wins >= 5 && "Field veteran",
    p.challenges.filter(Boolean).length >= 5 && "Problem solver",
    p.challenges.every(Boolean) && "Master of the arc",
    p.bestPractice >= 3500 && "Sharpshooter",
  ].filter(Boolean);
}
