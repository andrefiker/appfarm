import { Chess } from 'chess.js';
import { lossesFromHistory } from './chess-view-model.ts';
import type { Color, Kind } from './pieces';

export type ReviewSelection = { gameId: string; line: string[]; ply: number };

// Appended live moves keep the review in place. Takebacks, replacement lines,
// and rematches invalidate it before anything historical can be displayed.
export function reviewStillValid(selection: ReviewSelection, gameId: string, sans: readonly string[]) {
  return selection.gameId === gameId && selection.line.length <= sans.length &&
    Number.isInteger(selection.ply) && selection.ply >= 0 && selection.ply <= selection.line.length &&
    selection.line.every((san, index) => san === sans[index]);
}

export function positionAtPly(sans: readonly string[], ply: number) {
  if (!Number.isInteger(ply) || ply < 0 || ply > sans.length) return null;
  try {
    const game = new Chess();
    for (const san of sans.slice(0, ply)) game.move(san);
    const position: Record<string, { color: Color; type: Kind }> = {};
    for (const row of game.board()) for (const piece of row) {
      if (piece) position[piece.square] = { color: piece.color, type: piece.type };
    }
    const history = game.history({ verbose: true });
    const last = history[history.length - 1] || null;
    const check = game.inCheck()
      ? Object.keys(position).find(square => position[square].type === 'k' && position[square].color === game.turn()) || null
      : null;
    return { position, last, check, losses: lossesFromHistory(history), fen: game.fen() };
  } catch {
    return null;
  }
}
