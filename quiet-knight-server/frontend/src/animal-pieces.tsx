import type { ReactElement } from 'react';
import type { Color, Kind } from './pieces';

const animals: Record<Kind, { name: string; file: string }> = {
  k: { name: 'lion king', file: 'king' },
  q: { name: 'cat queen', file: 'queen' },
  b: { name: 'owl bishop', file: 'bishop' },
  n: { name: 'horse knight', file: 'knight' },
  r: { name: 'doghouse rook', file: 'rook' },
  p: { name: 'sheep pawn', file: 'pawn' },
};

export function AnimalPiece({ color, kind, label }: { color: Color; kind: Kind; scope: string; label?: string }): ReactElement {
  const army = color === 'w' ? 'ivory' : 'ebony';
  const animal = animals[kind];
  const src = `./animal-kingdom/pieces/${army}-${animal.file}.svg`;
  return <img className={`chess-art animal-piece animal-${kind} art-${color}`} src={src} alt={label || `${color === 'w' ? 'Ivory' : 'Ebony'} ${animal.name}`} draggable={false} />;
}
