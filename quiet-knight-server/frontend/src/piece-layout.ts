import type { Kind } from './pieces';

// Use the actual silhouette, not the atlas cell's unequal empty margins.
// Both armies share heights and a baseline; square viewBoxes preserve aspect.
const boardHeights: Record<Kind, number> = { p: .84, r: .88, n: .90, b: .92, q: .94, k: .96 };
export function boardPieceViewBox(bounds: readonly [number, number, number, number], kind: Kind) {
  const [left, top, right, bottom] = bounds;
  const size = (bottom - top) / boardHeights[kind];
  return `${(left + right - size) / 2} ${bottom - size * .98} ${size} ${size}`;
}
