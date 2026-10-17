import test from "node:test";
import assert from "node:assert/strict";
const S = await import("../web/src/storage.js").catch(() => ({}));
test("storage loads safe defaults, validates hostile data, and survives unavailable storage", () => {
  assert.equal(typeof S.loadProgress, "function");
  assert.equal(S.loadProgress(null).settings.left, true);
  assert.equal(S.loadProgress({ getItem: () => "{broken" }).wins, 0);
  let p = S.loadProgress({
    getItem: () =>
      JSON.stringify({
        wins: -5,
        shots: "oops",
        settings: { sound: false, left: false },
        challenges: [99, -4, "x"],
      }),
  });
  assert.equal(p.wins, 0);
  assert.equal(p.settings.left, false);
  assert.equal(p.challenges[0], 3);
  assert.equal(p.challenges[1], 0);
  assert.equal(p.challenges[2], 0);
  assert.equal(S.saveProgress(null, p), false);
});
test("results record once, achievements unlock and best scores never regress", () => {
  assert.equal(typeof S.recordResult, "function");
  let p = S.loadProgress(null);
  const g = { mode: "duel", winner: 0, shots: 3, hits: 2, direct: 1 };
  S.recordResult(p, g);
  assert.equal(p.wins, 1);
  assert.equal(p.shots, 3);
  S.recordResult(p, g);
  assert.equal(p.shots, 3);
  assert.ok(S.achievements(p).includes("First victory"));
  S.recordResult(p, {
    ...g,
    mode: "challenge",
    challenge: 2,
    shots: 1,
    recorded: false,
  });
  assert.equal(p.challenges[2], 3);
  S.recordResult(p, {
    ...g,
    mode: "challenge",
    challenge: 2,
    shots: 4,
    recorded: false,
  });
  assert.equal(p.challenges[2], 3);
});
