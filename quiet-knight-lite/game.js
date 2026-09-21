import { Chess } from 'chess.js';
import { randomBytes } from 'node:crypto';

export const START_MS = 10 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function roomCode() {
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

export function seatToken() {
  return randomBytes(24).toString('base64url');
}

export class GameRoom {
  constructor(code, { clockMs = START_MS, initialFen } = {}) {
    this.code = code;
    this.clockMs = clockMs;
    this.game = initialFen ? new Chess(initialFen) : new Chess();
    this.seats = { white: null, black: null };
    this.clocks = { white: clockMs, black: clockMs };
    this.status = 'waiting';
    this.result = null;
    this.activeColor = null;
    this.lastTick = null;
    this.rematchVotes = new Set();
    this.drawOffer = null;
    this.generation = 1;
    this.createdAt = Date.now();
    this.updatedAt = this.createdAt;
  }

  createWhite() {
    const token = seatToken();
    this.seats.white = token;
    return token;
  }

  roleFor(token) {
    if (token && token === this.seats.white) return 'white';
    if (token && token === this.seats.black) return 'black';
    return 'spectator';
  }

  join(token) {
    const recovered = this.roleFor(token);
    if (recovered !== 'spectator') return { role: recovered, token, recovered: true };

    if (!this.seats.white) {
      const nextToken = seatToken();
      this.seats.white = nextToken;
      this.startIfReady();
      return { role: 'white', token: nextToken, recovered: false };
    }
    if (!this.seats.black) {
      const nextToken = seatToken();
      this.seats.black = nextToken;
      this.startIfReady();
      return { role: 'black', token: nextToken, recovered: false };
    }
    return { role: 'spectator', token: null, recovered: false };
  }

  startIfReady(now = Date.now()) {
    if (this.status === 'waiting' && this.seats.white && this.seats.black) {
      this.status = 'playing';
      this.activeColor = this.game.turn() === 'w' ? 'white' : 'black';
      this.lastTick = now;
      this.updatedAt = now;
      return true;
    }
    return false;
  }

  currentClocks(now = Date.now()) {
    const clocks = { ...this.clocks };
    if (this.status === 'playing' && this.activeColor && this.lastTick != null) {
      clocks[this.activeColor] = Math.max(0, clocks[this.activeColor] - (now - this.lastTick));
    }
    return clocks;
  }

  syncClock(now = Date.now()) {
    if (this.status !== 'playing' || !this.activeColor || this.lastTick == null) return false;
    this.clocks[this.activeColor] = Math.max(0, this.clocks[this.activeColor] - (now - this.lastTick));
    this.lastTick = now;
    if (this.clocks[this.activeColor] <= 0) {
      this.resolveTimeout(this.activeColor, now);
      return true;
    }
    return false;
  }

  resolveTimeout(flaggedColor, now = Date.now()) {
    const winner = opposite(flaggedColor);
    const draw = !hasMatingMaterial(this.game, winner);
    this.status = 'finished';
    this.activeColor = null;
    this.lastTick = null;
    this.result = draw
      ? { type: 'timeout-draw', winner: null, text: 'Draw — timeout against insufficient material' }
      : { type: 'timeout', winner, text: `${title(winner)} wins on time` };
    this.updatedAt = now;
  }

  requireSeat(token) {
    const role = this.roleFor(token);
    if (role === 'spectator') throw gameError(403, 'A valid seat token is required.');
    return role;
  }

  move(token, intent, now = Date.now()) {
    const role = this.requireSeat(token);
    if (this.status !== 'playing') throw gameError(409, 'The game is not active.');
    if (this.activeColor !== role) throw gameError(409, 'It is not your turn.');

    if (this.syncClock(now)) throw gameError(409, 'Your clock expired before the move arrived.');

    let move;
    try {
      move = this.game.move({
        from: String(intent.from || '').toLowerCase(),
        to: String(intent.to || '').toLowerCase(),
        promotion: String(intent.promotion || 'q').toLowerCase(),
      });
    } catch {
      move = null;
    }
    if (!move) throw gameError(422, 'Illegal move.');

    this.drawOffer = null;
    this.rematchVotes.clear();
    this.updatedAt = now;
    this.resolveBoardResult(now);
    if (this.status === 'playing') {
      this.activeColor = this.game.turn() === 'w' ? 'white' : 'black';
      this.lastTick = now;
    }
    return move;
  }

  resolveBoardResult(now = Date.now()) {
    if (!this.game.isGameOver()) return false;
    this.status = 'finished';
    this.activeColor = null;
    this.lastTick = null;
    if (this.game.isCheckmate()) {
      const winner = this.game.turn() === 'w' ? 'black' : 'white';
      this.result = { type: 'checkmate', winner, text: `${title(winner)} wins by checkmate` };
    } else if (this.game.isStalemate()) {
      this.result = { type: 'stalemate', winner: null, text: 'Draw by stalemate' };
    } else if (this.game.isThreefoldRepetition()) {
      this.result = { type: 'threefold', winner: null, text: 'Draw by threefold repetition' };
    } else if (this.game.isInsufficientMaterial()) {
      this.result = { type: 'insufficient', winner: null, text: 'Draw by insufficient material' };
    } else {
      this.result = { type: 'draw', winner: null, text: 'Draw by the fifty-move rule' };
    }
    this.updatedAt = now;
    return true;
  }

  resign(token, now = Date.now()) {
    const role = this.requireSeat(token);
    if (this.status !== 'playing') throw gameError(409, 'The game is not active.');
    this.syncClock(now);
    if (this.status !== 'playing') return;
    const winner = opposite(role);
    this.status = 'finished';
    this.activeColor = null;
    this.lastTick = null;
    this.result = { type: 'resignation', winner, text: `${title(winner)} wins by resignation` };
    this.updatedAt = now;
  }

  offerDraw(token, now = Date.now()) {
    const role = this.requireSeat(token);
    if (this.status !== 'playing') throw gameError(409, 'The game is not active.');
    if (this.drawOffer === opposite(role)) {
      this.syncClock(now);
      if (this.status !== 'playing') return;
      this.status = 'finished';
      this.activeColor = null;
      this.lastTick = null;
      this.result = { type: 'agreement', winner: null, text: 'Draw by agreement' };
      this.drawOffer = null;
    } else {
      this.drawOffer = role;
    }
    this.updatedAt = now;
  }

  requestRematch(token, now = Date.now()) {
    const role = this.requireSeat(token);
    if (this.status !== 'finished') throw gameError(409, 'Finish the current game before requesting a rematch.');
    this.rematchVotes.add(token);
    if (this.seats.white && this.seats.black && this.rematchVotes.has(this.seats.white) && this.rematchVotes.has(this.seats.black)) {
      const previousWhite = this.seats.white;
      this.seats.white = this.seats.black;
      this.seats.black = previousWhite;
      this.game = new Chess();
      this.clocks = { white: this.clockMs, black: this.clockMs };
      this.status = 'playing';
      this.result = null;
      this.activeColor = 'white';
      this.lastTick = now;
      this.rematchVotes.clear();
      this.drawOffer = null;
      this.generation += 1;
    }
    this.updatedAt = now;
  }

  stateFor(token, now = Date.now()) {
    const role = this.roleFor(token);
    const clocks = this.currentClocks(now);
    const board = this.game.board().flatMap((rank, rankIndex) => rank.flatMap((piece, fileIndex) => piece ? [{
      square: `${'abcdefgh'[fileIndex]}${8 - rankIndex}`,
      type: piece.type,
      color: piece.color === 'w' ? 'white' : 'black',
    }] : []));
    const turn = this.game.turn() === 'w' ? 'white' : 'black';
    const legalMoves = role === turn && this.status === 'playing'
      ? this.game.moves({ verbose: true }).map(({ from, to, promotion }) => ({ from, to, promotion: promotion || null }))
      : [];
    return {
      code: this.code,
      role,
      generation: this.generation,
      status: this.status,
      result: this.result,
      fen: this.game.fen(),
      board,
      turn,
      inCheck: this.game.inCheck(),
      clocks,
      activeColor: this.activeColor,
      serverNow: now,
      seats: { white: Boolean(this.seats.white), black: Boolean(this.seats.black) },
      legalMoves,
      drawOffer: this.drawOffer,
      rematchRequested: token ? this.rematchVotes.has(token) : false,
    };
  }
}

export function hasMatingMaterial(game, color) {
  const pieces = game.board().flat().filter(Boolean).filter((piece) => (piece.color === 'w' ? 'white' : 'black') === color);
  const nonKings = pieces.filter((piece) => piece.type !== 'k');
  if (nonKings.length === 0) return false;
  if (nonKings.some((piece) => ['p', 'r', 'q'].includes(piece.type))) return true;
  const knights = nonKings.filter((piece) => piece.type === 'n');
  const bishops = [];
  game.board().forEach((rank, rankIndex) => rank.forEach((piece, fileIndex) => {
    if (piece && piece.type === 'b' && (piece.color === 'w' ? 'white' : 'black') === color) {
      bishops.push((rankIndex + fileIndex) % 2);
    }
  }));
  if (knights.length === 1 && bishops.length === 0 && nonKings.length === 1) return false;
  if (knights.length === 0 && bishops.length > 0 && bishops.every((squareColor) => squareColor === bishops[0])) return false;
  return true;
}

export function gameError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function opposite(color) {
  return color === 'white' ? 'black' : 'white';
}

function title(color) {
  return color[0].toUpperCase() + color.slice(1);
}
