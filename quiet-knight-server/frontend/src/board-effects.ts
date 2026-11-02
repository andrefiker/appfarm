import type { Color, Kind } from './pieces';

type ArmyPiece = { color: Color; type: Kind };
type Position = Record<string, ArmyPiece>;
export type BoardMotion = {
  from: string; to: string; san: string; serial: number;
  actor?: ArmyPiece;
  captured?: ArmyPiece & { square: string };
  promotion?: Kind;
  revenge?: boolean;
  escapedCheck?: boolean;
  rook?: { from: string; to: string };
};

// Presentation metadata only: the chess engine/server has already accepted the move.
export function describeBoardMotion(before: Position, after: Position, move: BoardMotion, previous?: BoardMotion | null): BoardMotion {
  const actor = before[move.from];
  if (!actor) return move;
  const result: BoardMotion = {...move, actor};
  if (move.san.startsWith('O-O')) {
    const rank = move.from[1], long = move.san.startsWith('O-O-O');
    result.to = `${long ? 'c' : 'g'}${rank}`;
    const rookTo = `${long ? 'd' : 'f'}${rank}`;
    const rookFrom = Object.keys(before).find(square => before[square].color === actor.color && before[square].type === 'r' &&
      (after[square]?.color !== actor.color || after[square]?.type !== 'r'));
    if (rookFrom) result.rook = {from:rookFrom, to:rookTo};
    return result;
  }
  let capturedSquare = move.to;
  if (actor.type === 'p' && move.from[0] !== move.to[0] && !before[move.to]) capturedSquare = move.to[0] + move.from[1];
  const victim = before[capturedSquare];
  if (victim && victim.color !== actor.color) result.captured = {...victim, square:capturedSquare};
  result.revenge = Boolean(result.captured && previous?.captured && previous.actor?.color !== actor.color && previous.to === capturedSquare);
  const arriving = after[move.to];
  if (actor.type === 'p' && arriving?.color === actor.color && arriving.type !== 'p') result.promotion = arriving.type;
  return result;
}
