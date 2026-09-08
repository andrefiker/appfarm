import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { Chess } from 'chess.js';

// One bounded native child at a time. Never run chess search on Node's event loop.
export const SKILLS = Object.freeze([0, 2, 4, 7, 9, 11, 14, 16, 18, 20]);
export const THINK_MS = Object.freeze([80, 100, 140, 180, 220, 260, 320, 400, 500, 650]);
export class EngineError extends Error {
  constructor(message, status = 503) { super(message); this.status = status; }
}
export function validatePosition(input) {
  if (!input || !Number.isInteger(input.level) || input.level < 1 || input.level > 10 || !Array.isArray(input.moves) || input.moves.length > 600) throw new EngineError('Invalid level or move history', 400);
  const game = new Chess(), moves = [];
  for (const move of input.moves) {
    if (!move || !/^[a-h][1-8]$/.test(move.from) || !/^[a-h][1-8]$/.test(move.to) || (move.promotion !== undefined && !/^[qrbn]$/.test(move.promotion))) throw new EngineError('Invalid move history', 400);
    try {
      if (game.isGameOver()) throw new Error('Game ended');
      const made = game.move({ from: move.from, to: move.to, promotion: move.promotion });
      moves.push(made.from + made.to + (made.promotion || ''));
    } catch { throw new EngineError('Illegal move history', 400); }
  }
  if (input.expected_fen !== game.fen()) throw new EngineError('Position does not match history', 409);
  return { game, moves, level: input.level, fen: game.fen() };
}

export class StockfishService {
  constructor({ binary = process.env.STOCKFISH_PATH || '/opt/stockfish/stockfish-ubuntu-x86-64', deadline = 3000 } = {}) {
    this.binary = binary; this.deadline = deadline; this.busy = false; this.name = null; this.ready = false;
    this.tokens = 8; this.refilled = Date.now();
  }
  status() { return { available: this.ready, engine: this.name, levels: 10, skills: SKILLS, busy: this.busy }; }
  async probe() { return this.run({ level: 10, moves: [], game: new Chess(), fen: new Chess().fen() }, undefined, true); }
  async move(input, signal) {
    // Rate and capacity checks precede expensive history replay. No unbounded queue.
    if (this.busy) throw new EngineError('Computer is busy. Try again shortly.', 429);
    const now = Date.now();
    this.tokens = Math.min(8, this.tokens + (now - this.refilled) / 500); this.refilled = now;
    if (this.tokens < 1) throw new EngineError('Computer is busy. Try again shortly.', 429);
    this.tokens -= 1;
    const position = validatePosition(input);
    if (position.game.isGameOver()) return { engine: this.name, level: input.level, skill: SKILLS[input.level - 1], fen: position.fen, move: null };
    return this.run(position, signal);
  }
  run(position, signal, probe = false) {
    if (this.busy) return Promise.reject(new EngineError('Computer is busy. Try again shortly.', 429));
    if (signal?.aborted) return Promise.reject(new EngineError('Request cancelled', 499));
    this.busy = true;
    const started = Date.now();
    return new Promise((resolve, reject) => {
      let answer, failure, exiting = false, phase = 'uci', child;
      const finish = error => {
        if (exiting) return;
        exiting = true; failure = error;
        if (error && error.status !== 499) this.ready = false;
        child.kill('SIGKILL');
      };
      try { child = spawn(this.binary, [], { stdio: ['pipe', 'pipe', 'ignore'], shell: false }); }
      catch { this.busy = false; this.ready = false; reject(new EngineError('Stockfish could not start')); return; }
      const timer = setTimeout(() => finish(new EngineError('Stockfish timed out')), this.deadline);
      const abort = () => finish(new EngineError('Request cancelled', 499));
      signal?.addEventListener('abort', abort, { once: true });
      child.stdin.on('error', () => finish(new EngineError('Stockfish input failed')));
      child.on('error', () => { failure = new EngineError('Stockfish could not start'); this.ready = false; });
      const lines = createInterface({ input: child.stdout });
      const write = command => { if (!exiting) child.stdin.write(command + '\n'); };
      lines.on('line', line => {
        if (exiting) return;
        if (line.startsWith('id name Stockfish ')) this.name = line.slice(8).slice(0, 80);
        if (line === 'uciok' && phase === 'uci') {
          if (!this.name) return finish(new EngineError('Unexpected engine'));
          phase = 'ready';
          write('setoption name Threads value 1');
          write('setoption name Hash value 32');
          write('setoption name UCI_LimitStrength value false');
          write('setoption name Skill Level value ' + SKILLS[position.level - 1]);
          write('ucinewgame'); write('isready');
        } else if (line === 'readyok' && phase === 'ready') {
          this.ready = true; phase = 'search';
          if (probe) { answer = this.status(); return finish(); }
          write('position startpos' + (position.moves.length ? ' moves ' + position.moves.join(' ') : ''));
          write('go movetime ' + THINK_MS[position.level - 1]);
        } else if (line.startsWith('bestmove ') && phase === 'search') {
          const raw = line.split(' ')[1];
          if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(raw)) return finish(new EngineError('Stockfish returned no legal move'));
          try {
            const made = position.game.move({ from: raw.slice(0, 2), to: raw.slice(2, 4), promotion: raw[4] });
            answer = { engine: this.name, level: position.level, skill: SKILLS[position.level - 1], fen: position.fen, move: { from: made.from, to: made.to, promotion: made.promotion, san: made.san }, elapsed_ms: Date.now() - started };
            finish();
          } catch { finish(new EngineError('Stockfish returned an illegal move')); }
        }
      });
      child.on('close', () => {
        clearTimeout(timer); signal?.removeEventListener('abort', abort); lines.close(); this.busy = false;
        if (failure || !answer) { this.ready = failure?.status === 499 ? this.ready : false; reject(failure || new EngineError('Stockfish exited unexpectedly')); }
        else resolve(answer);
      });
      write('uci');
    });
  }
}
