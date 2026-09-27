export const DIFFICULTIES = {
  Easy: { rows: 9, cols: 9, mines: 10 },
  Medium: { rows: 12, cols: 11, mines: 19 },
  Hard: { rows: 14, cols: 12, mines: 30 },
  Expert: { rows: 18, cols: 14, mines: 48 },
};
export const VERSION = '1';
export function rngFromSeed(seed) {
  let t = Number(seed) >>> 0 || 1;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashSeed(value) {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}
export function dailySeed(date = new Date()) {
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return hashSeed(`quiet-mines:${VERSION}:${iso}`);
}
export function neighbors(index, rows, cols) {
  const r = Math.floor(index / cols),
    c = index % cols,
    out = [];
  for (let y = Math.max(0, r - 1); y <= Math.min(rows - 1, r + 1); y++)
    for (let x = Math.max(0, c - 1); x <= Math.min(cols - 1, c + 1); x++) {
      const i = y * cols + x;
      if (i !== index) out.push(i);
    }
  return out;
}
function countAdjacent(board, i) {
  return neighbors(i, board.rows, board.cols).reduce(
    (n, j) => n + Number(board.cells[j].mine),
    0,
  );
}
function placeMines(rows, cols, mineCount, excluded, random) {
  const available = Array.from({ length: rows * cols }, (_, i) => i).filter(
    (i) => !excluded.has(i),
  );
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  const mines = new Set(available.slice(0, mineCount));
  return {
    rows,
    cols,
    mineCount,
    cells: Array.from({ length: rows * cols }, (_, i) => ({
      mine: mines.has(i),
      adjacent: 0,
      revealed: false,
      flagged: false,
    })),
  };
}
export function buildBoard(
  rows,
  cols,
  mineCount,
  safeIndex,
  seed,
  safeNeighborhood = true,
) {
  const safe = new Set([safeIndex]);
  if (safeNeighborhood)
    neighbors(safeIndex, rows, cols).forEach((i) => safe.add(i));
  const board = placeMines(rows, cols, mineCount, safe, rngFromSeed(seed));
  board.cells.forEach((c, i) => {
    if (!c.mine) c.adjacent = countAdjacent(board, i);
  });
  return board;
}
export function logicalHints(board) {
  const safe = new Set(),
    mines = new Set(),
    constraints = [],
    covered = (i) => !board.cells[i].revealed && !board.cells[i].flagged;
  for (let i = 0; i < board.cells.length; i++) {
    const cell = board.cells[i];
    if (!cell.revealed || cell.adjacent === 0) continue;
    const near = neighbors(i, board.rows, board.cols),
      flagged = near.filter((j) => board.cells[j].flagged).length,
      hidden = near.filter(covered);
    if (hidden.length)
      constraints.push({
        cells: new Set(hidden),
        mines: cell.adjacent - flagged,
      });
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of constraints) {
      if (c.mines < 0 || c.mines > c.cells.size) continue;
      if (c.mines === 0)
        for (const i of c.cells)
          if (!safe.has(i) && !mines.has(i)) {
            safe.add(i);
            changed = true;
          }
      if (c.mines === c.cells.size)
        for (const i of c.cells)
          if (!mines.has(i) && !safe.has(i)) {
            mines.add(i);
            changed = true;
          }
    }
    for (let a = 0; a < constraints.length; a++)
      for (let b = 0; b < constraints.length; b++) {
        if (a === b) continue;
        const A = constraints[a],
          B = constraints[b];
        if (A.cells.size >= B.cells.size) continue;
        let subset = true;
        for (const i of A.cells)
          if (!B.cells.has(i)) {
            subset = false;
            break;
          }
        if (!subset) continue;
        const diff = new Set([...B.cells].filter((i) => !A.cells.has(i))),
          count = B.mines - A.mines;
        if (diff.size && count >= 0 && count <= diff.size) {
          if (count === 0)
            for (const i of diff)
              if (!safe.has(i) && !mines.has(i)) {
                safe.add(i);
                changed = true;
              }
          if (count === diff.size)
            for (const i of diff)
              if (!mines.has(i) && !safe.has(i)) {
                mines.add(i);
                changed = true;
              }
        }
      }
  }
  safe.forEach((i) => mines.delete(i));
  return { safe: [...safe], mines: [...mines] };
}
export function revealCascade(board, startIndex) {
  const opened = [],
    queue = [startIndex],
    seen = new Set();
  while (queue.length) {
    const i = queue.shift();
    if (seen.has(i)) continue;
    seen.add(i);
    const cell = board.cells[i];
    if (cell.mine || cell.flagged || cell.revealed) continue;
    cell.revealed = true;
    opened.push(i);
    if (cell.adjacent === 0)
      neighbors(i, board.rows, board.cols).forEach((j) => queue.push(j));
  }
  return opened;
}
export function solveBoard(source, startIndex) {
  const board = structuredClone(source);
  revealCascade(board, startIndex);
  let progress = true;
  while (progress) {
    const hints = logicalHints(board),
      before = board.cells.filter((c) => c.revealed).length;
    hints.mines.forEach((i) => {
      board.cells[i].flagged = true;
    });
    hints.safe.forEach((i) => revealCascade(board, i));
    progress = board.cells.filter((c) => c.revealed).length > before;
  }
  return {
    solved: board.cells.filter((c) => !c.mine).every((c) => c.revealed),
    revealed: board.cells.filter((c) => c.revealed).length,
  };
}
export function createFairBoard(
  rows,
  cols,
  mineCount,
  safeIndex,
  seed,
  maxAttempts = 2500,
) {
  let s = seed >>> 0;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    s = (s + 0x9e3779b9) >>> 0;
    const board = placeMines(
      rows,
      cols,
      mineCount,
      new Set([safeIndex, ...neighbors(safeIndex, rows, cols)]),
      rngFromSeed(s),
    );
    board.cells.forEach((c, i) => {
      if (!c.mine) c.adjacent = countAdjacent(board, i);
    });
    if (solveBoard(board, safeIndex).solved)
      return {
        ...board,
        seed: seed >>> 0,
        layoutSeed: s,
        attempts: attempt + 1,
        fair: true,
      };
  }
  throw new Error(
    `Could not generate a verified fair board after ${maxAttempts} attempts.`,
  );
}
export function createClassicBoard(rows, cols, mineCount, safeIndex, seed) {
  return {
    ...buildBoard(rows, cols, mineCount, safeIndex, seed, true),
    seed: seed >>> 0,
    fair: false,
    attempts: 1,
  };
}
export function applyReveal(board, index) {
  const cell = board.cells[index];
  if (!cell || cell.flagged || cell.revealed)
    return { board, opened: [], status: 'ignored' };
  if (cell.mine)
    return {
      board: {
        ...board,
        lost: true,
        triggered: index,
        cells: board.cells.map((c, i) => ({
          ...c,
          revealed: c.revealed || c.mine,
        })),
      },
      opened: [index],
      status: 'lost',
    };
  const opened = revealCascade(board, index);
  const won = board.cells.every((c) => c.mine || c.revealed);
  if (won) board.won = true;
  return { board, opened, status: won ? 'won' : 'revealed' };
}
export function toggleFlag(board, index) {
  const cell = board.cells[index];
  if (!cell || cell.revealed || board.won || board.lost) return board;
  const cells = board.cells.slice();
  cells[index] = { ...cell, flagged: !cell.flagged };
  return { ...board, cells };
}
export function chord(board, index) {
  const cell = board.cells[index];
  if (!cell?.revealed || cell.adjacent === 0 || board.won || board.lost)
    return { board, opened: [], status: 'ignored' };
  const near = neighbors(index, board.rows, board.cols);
  if (near.filter((i) => board.cells[i].flagged).length !== cell.adjacent)
    return { board, opened: [], status: 'ignored' };
  let next = board,
    opened = [];
  for (const i of near)
    if (!next.cells[i].revealed && !next.cells[i].flagged) {
      const result = applyReveal(next, i);
      next = result.board;
      opened.push(...result.opened);
      if (result.status === 'lost')
        return { board: next, opened, status: 'lost' };
    }
  return { board: next, opened, status: next.won ? 'won' : 'chorded' };
}
export function withFirstReveal(game, board, result, index) {
  return {
    ...game,
    board: result.board,
    firstIndex: index,
    generationAttempts: board.attempts,
  };
}

export function remainingMines(board) {
  return board.mineCount - board.cells.filter((c) => c.flagged).length;
}
