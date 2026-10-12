// Compare sampled moves with one consistent, longer Stockfish analysis per fixture.
// Run: STOCKFISH_PATH=/path/to/stockfish node calibrate-stockfish.js > results.jsonl
//      STOCKFISH_PATH=/path/to/stockfish node score-stockfish.js results.jsonl
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { Chess } from 'chess.js';
import { FIXTURES } from './stockfish-fixtures.js';

const binary = process.env.STOCKFISH_PATH || '/opt/stockfish/stockfish-ubuntu-x86-64';
const rows = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').map(JSON.parse).filter(row => row.name);
if (rows.length !== FIXTURES.length) throw Error('Expected one row per fixture');

function analyze(sans) {
  return new Promise((resolve, reject) => {
    const game = new Chess();
    const moves = sans.map(san => {
      const move = game.move(san);
      return move.from + move.to + (move.promotion || '');
    });
    const count = game.moves().length;
    const child = spawn(binary, [], { stdio: ['pipe', 'pipe', 'ignore'] });
    const lines = createInterface({ input: child.stdout });
    const snapshots = new Map();
    let phase = 'uci';
    const timer = setTimeout(() => { child.kill(); reject(Error('Analysis timed out')); }, 20000);
    const write = command => child.stdin.write(command + '\n');
    lines.on('line', line => {
      if (line === 'uciok' && phase === 'uci') {
        phase = 'ready';
        write('setoption name Threads value 1');
        write('setoption name Hash value 32');
        write('setoption name Skill Level value 20');
        write('setoption name UCI_LimitStrength value false');
        write('setoption name MultiPV value ' + count);
        write('isready');
      } else if (line === 'readyok' && phase === 'ready') {
        phase = 'search';
        write('position startpos' + (moves.length ? ' moves ' + moves.join(' ') : ''));
        write('go nodes 150000');
      } else if (line.startsWith('info ') && phase === 'search') {
        const match = line.match(/\bdepth (\d+)\b.*\bmultipv (\d+)\b.*\bscore (cp|mate) (-?\d+)\b.*\bpv ([a-h][1-8][a-h][1-8][qrbn]?)(?:\s|$)/);
        if (!match) return;
        const depth = Number(match[1]);
        if (!snapshots.has(depth)) snapshots.set(depth, new Map());
        const score = match[3] === 'mate' ? Math.sign(Number(match[4])) * 3000 : Number(match[4]);
        snapshots.get(depth).set(Number(match[2]), { move: match[5], score });
      } else if (line.startsWith('bestmove ') && phase === 'search') {
        clearTimeout(timer);
        child.kill();
        const complete = [...snapshots].filter(([, ranks]) => ranks.size === count).sort((a, b) => b[0] - a[0])[0];
        if (!complete) return reject(Error('Incomplete reference analysis'));
        resolve({ depth: complete[0], lines: [...complete[1]].sort((a, b) => a[0] - b[0]).map(([, candidate]) => candidate) });
      }
    });
    child.on('error', reject);
    write('uci');
  });
}

const losses = Array.from({ length: 10 }, () => []);
for (let index = 0; index < FIXTURES.length; index++) {
  const [name, sans] = FIXTURES[index];
  if (rows[index].name !== name) throw Error('Fixture order mismatch');
  const reference = await analyze(sans);
  const best = reference.lines[0].score;
  const ranked = new Map(reference.lines.map((line, rank) => [line.move, { rank: rank + 1, score: line.score }]));
  const levels = Array.from({ length: 10 }, (_, level) => {
    const candidate = ranked.get(rows[index].levels[level + 1].uci);
    if (!candidate) throw Error(`${name}: level ${level + 1} absent from reference`);
    const loss = Math.max(0, best - candidate.score);
    losses[level].push(loss);
    return { rank: candidate.rank, loss };
  });
  console.log(JSON.stringify({ fixture: name, depth: reference.depth, levels }));
}
console.log(JSON.stringify({ summary: losses.map((values, index) => ({
  level: index + 1,
  mean_cp_loss: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
  median_cp_loss: [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)],
})) }));
