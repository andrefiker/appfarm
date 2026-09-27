import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyReveal,
  buildBoard,
  chord,
  createFairBoard,
  dailySeed,
  DIFFICULTIES,
  logicalHints,
  neighbors,
  remainingMines,
  solveBoard,
  toggleFlag,
  withFirstReveal,
} from '../src/engine.js';

test('mine count, safe opening neighborhood, adjacency, and deterministic seed', () => {
  const a = buildBoard(9, 9, 10, 40, 321),
    b = buildBoard(9, 9, 10, 40, 321);
  assert.equal(a.cells.filter((c) => c.mine).length, 10);
  assert.ok([40, ...neighbors(40, 9, 9)].every((i) => !a.cells[i].mine));
  assert.deepEqual(a.cells, b.cells);
  for (let i = 0; i < a.cells.length; i++)
    if (!a.cells[i].mine)
      assert.equal(
        a.cells[i].adjacent,
        neighbors(i, 9, 9).filter((j) => a.cells[j].mine).length,
      );
});
test('zero cascade, flags, flagged reveal guard, and loss', () => {
  const board = buildBoard(3, 3, 1, 0, 2, false),
    safeZero = board.cells.findIndex((c) => !c.mine && c.adjacent === 0);
  if (safeZero >= 0) assert.ok(applyReveal(board, safeZero).opened.length > 1);
  const flagged = toggleFlag(board, 8);
  assert.equal(flagged.cells[8].flagged, true);
  assert.equal(remainingMines(flagged), 0);
  assert.equal(applyReveal(flagged, 8).status, 'ignored');
  const mine = board.cells.findIndex((c) => c.mine);
  assert.equal(applyReveal(board, mine).status, 'lost');
});
test('solver finds forced safes and mines and never guesses from hidden data', () => {
  const mine = {
    rows: 1,
    cols: 2,
    mineCount: 1,
    cells: [
      { mine: false, adjacent: 1, revealed: true, flagged: false },
      { mine: true, adjacent: 0, revealed: false, flagged: false },
    ],
  };
  assert.deepEqual(logicalHints(mine), { safe: [], mines: [1] });
  const safe = {
    rows: 2,
    cols: 2,
    mineCount: 1,
    cells: [
      { mine: false, adjacent: 1, revealed: true, flagged: false },
      { mine: true, adjacent: 0, revealed: false, flagged: true },
      { mine: false, adjacent: 0, revealed: false, flagged: false },
      { mine: false, adjacent: 0, revealed: false, flagged: false },
    ],
  };
  assert.deepEqual(logicalHints(safe), { safe: [2, 3], mines: [] });
  const hidden = {
    rows: 1,
    cols: 2,
    mineCount: 1,
    cells: [
      { mine: false, adjacent: 0, revealed: false, flagged: false },
      { mine: true, adjacent: 0, revealed: false, flagged: false },
    ],
  };
  assert.deepEqual(logicalHints(hidden), { safe: [], mines: [] });
});
test('chording opens safe neighbors and wrong flags can detonate', () => {
  const b = {
    rows: 2,
    cols: 3,
    mineCount: 1,
    cells: Array.from({ length: 6 }, (_, i) => ({
      mine: i === 0,
      adjacent: i === 1 ? 1 : 0,
      revealed: i === 1,
      flagged: false,
    })),
  };
  const safeChord = structuredClone(b);
  safeChord.cells[0].flagged = true;
  assert.equal(chord(safeChord, 1).status, 'won');
  const wrong = structuredClone(b);
  wrong.cells[2].flagged = true;
  const result = chord(wrong, 1);
  assert.equal(result.status, 'lost');
  assert.equal(result.board.triggered, 0);
});
test('first reveal preserves its opening index; fair boards solve and retry deterministically', () => {
  assert.equal(
    dailySeed(new Date(2026, 8, 27)),
    dailySeed(new Date(2026, 8, 27)),
  );
  assert.notEqual(
    dailySeed(new Date(2026, 8, 27)),
    dailySeed(new Date(2026, 8, 28)),
  );
  for (const [name, cfg] of Object.entries(DIFFICULTIES))
    for (let k = 1; k <= 3; k++) {
      const start = (k * 7) % (cfg.rows * cfg.cols),
        seed = 4000 + k * 17;
      const b = createFairBoard(cfg.rows, cfg.cols, cfg.mines, start, seed);
      assert.equal(b.cells.filter((c) => c.mine).length, cfg.mines, name);
      assert.equal(b.fair, true);
      assert.equal(solveBoard(b, start).solved, true);
      const state = withFirstReveal(
        { difficulty: name, seed, firstIndex: null },
        b,
        applyReveal(structuredClone(b), start),
        start,
      );
      assert.equal(state.firstIndex, start);
      const retry = createFairBoard(
        cfg.rows,
        cfg.cols,
        cfg.mines,
        state.firstIndex,
        state.seed,
      );
      assert.deepEqual(retry.cells, b.cells);
      assert.equal(retry.seed, b.seed);
    }
});
