// Reproducible real-engine sample; run with STOCKFISH_PATH pointing to Stockfish 18.
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { StockfishService, selectBeginnerMove, validatePosition } from './stockfish.js';

const endgame = 'c3 b5 f4 f6 c4 bxc4 h3 Nc6 Na3 a6 Nxc4 Nd4 Na3 Nf3+ Nxf3 e6 Nd4 Bxa3 Nxe6 Bxb2 Nxd8 Bxa1 Nb7 Bxb7 e3 Bxg2 Bxa6 Bxh1 Kf1 Rxa6 Qg4 Rxa2 Qxg7 f5 Qxd7+ Kxd7 e4 fxe4 d4 Bxd4 Bb2 Rxb2 Ke1 Ra2 f5 Nf6 Kd1 Rb2 Ke1 Ng8 Kf1 Bg2+ Ke1 Bxh3 f6 Rb6 Ke2 Rxf6 Ke1 Rf4 Ke2 Be6 Kd1 e3 Ke2 Rf3 Kxf3'.split(' ');
const fixtures = [
  ['opening_white', []],
  ['opening_black', ['e4']],
  ['free_pawn', ['e4', 'd5']],
  ['free_minor', ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Nf6']],
  ['hanging_queen', ['e4', 'e5', 'Qf3', 'Nc6', 'Bc4', 'Nd4', 'a3']],
  ['fork', ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5']],
  ['mate_white', ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6']],
  ['mate_black', ['f3', 'e5', 'g4']],
  ['defense', ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'b5', 'Bb3']],
  ['quiet', ['d4', 'd5', 'Nf3', 'Nf6', 'e3', 'e6', 'Bd3', 'Be7']],
  ['endgame', endgame],
];

function request(sans, level) {
  const game = new Chess(), moves = sans.map(san => {
    const move = game.move(san);
    return { from: move.from, to: move.to, promotion: move.promotion };
  });
  return { moves, level, expected_fen: game.fen() };
}
function seeded(seed) {
  let value = seed;
  return () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}
const results = [];
let selection;
const service = new StockfishService({ binary: process.env.STOCKFISH_PATH, random: seeded(41), onSelection: value => { selection = value; } });
await service.probe();
for (const [name, sans] of fixtures) {
  const row = { name, levels: {} };
  for (let level = 1; level <= 10; level++) {
    const input = request(sans, level);
    selection = null;
    const result = await service.move(input);
    assert.ok(validatePosition(input).game.move(result.move), `${name}: L${level} illegal`);
    const uci = result.move.from + result.move.to + (result.move.promotion || '');
    row.levels[level] = { san: result.move.san, uci, ms: result.elapsed_ms };
    if (level <= 3) {
      assert.ok(selection?.complete, `${name}: incomplete MultiPV at L${level}`);
      const lines = selection.candidates;
      const rng = seeded(10000 * level + sans.length);
      const draws = Array.from({ length: 128 }, () => selectBeginnerMove(lines, level, rng));
      const ranks = draws.map(move => lines.find(line => line.move === move).rank);
      row.levels[level].best_rate = Math.round(100 * ranks.filter(rank => rank === 1).length / ranks.length);
      row.levels[level].mean_rank = +(ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length).toFixed(2);
      row.levels[level].mean_cp_loss = lines[0].cp === undefined ? null : +(
        draws.reduce((sum, move) => sum + Math.max(0, lines[0].cp - (lines.find(line => line.move === move).cp ?? lines[0].cp)), 0) / draws.length
      ).toFixed(1);
    }
  }
  results.push(row);
  console.log(JSON.stringify(row));
}
const summary = [1, 2, 3].map(level => ({
  level,
  best_rate: Math.round(results.reduce((sum, row) => sum + row.levels[level].best_rate, 0) / results.length),
  mean_rank: +(results.reduce((sum, row) => sum + row.levels[level].mean_rank, 0) / results.length).toFixed(2),
  mean_cp_loss: +(results.filter(row => row.levels[level].mean_cp_loss !== null).reduce((sum, row) => sum + row.levels[level].mean_cp_loss, 0) / results.filter(row => row.levels[level].mean_cp_loss !== null).length).toFixed(1),
}));
assert.ok(summary[0].best_rate < summary[1].best_rate && summary[1].best_rate < summary[2].best_rate, 'beginner best-move progression');
assert.ok(summary[0].mean_rank > summary[1].mean_rank && summary[1].mean_rank > summary[2].mean_rank, 'beginner rank progression');
console.log(JSON.stringify({ summary, fixtures: results.length, note: 'Beginner evaluation loss comes from each shallow MultiPV search, not a calibrated human rating.' }));
