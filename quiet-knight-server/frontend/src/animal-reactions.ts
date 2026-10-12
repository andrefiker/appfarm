export type AnimalReactionMove = {
  piece: string;
  captured?: string;
  promotion?: string;
  san: string;
};

export function animalReactionForMove(made: AnimalReactionMove, checksKing: boolean): string | null {
  if (made.promotion) return made.promotion === 'q' ? 'Gerald is now management.' : made.promotion === 'n' ? 'Gerald has become a horse. Questions remain.' : 'Against all expectations, Gerald has risen.';
  if (made.san.startsWith('O-O')) return 'Security has been upgraded.';
  if (made.piece === 'q' && made.captured) return 'Naturally.';
  if (made.piece === 'b' && made.captured) return 'The council has spoken.';
  if (made.piece === 'n' && (made.captured || checksKing)) return 'HORSE SUCCESSFUL';
  if (made.captured === 'p') return Math.random() < .5 ? 'Baa.' : 'He was only following orders.';
  if (checksKing) return 'His Majesty is concerned.';
  return null;
}
