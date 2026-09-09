import type { Card } from '../cards/cards.js';

export type HandCategory = 'HIGH_CARD' | 'PAIR' | 'TWO_PAIR' | 'THREE_OF_A_KIND' | 'STRAIGHT' | 'FLUSH' | 'FULL_HOUSE' | 'FOUR_OF_A_KIND' | 'STRAIGHT_FLUSH';
export type RankedHand = Readonly<{ category: HandCategory; categoryValue: number; rankVector: readonly number[]; winningFive: readonly Card[] }>;
const value: Record<Card['rank'], number> = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, T: 10, J: 11, Q: 12, K: 13, A: 14 };
const categoryValue: Record<HandCategory, number> = { HIGH_CARD: 0, PAIR: 1, TWO_PAIR: 2, THREE_OF_A_KIND: 3, STRAIGHT: 4, FLUSH: 5, FULL_HOUSE: 6, FOUR_OF_A_KIND: 7, STRAIGHT_FLUSH: 8 };

function sorted(cards: readonly Card[]): Card[] { return [...cards].sort((a, b) => value[b.rank] - value[a.rank] || a.id.localeCompare(b.id)); }
function straightHigh(cards: readonly Card[]): number | undefined {
  const unique = [...new Set(cards.map((c) => value[c.rank]))].sort((a, b) => b - a);
  if (unique.length !== 5) return undefined;
  if (unique[0]! - unique[4]! === 4) return unique[0];
  if (unique.join(',') === '14,5,4,3,2') return 5;
  return undefined;
}
function orderStraight(cards: readonly Card[], high: number): Card[] {
  return [...cards].sort((a, b) => {
    const av = value[a.rank] === 14 && high === 5 ? 1 : value[a.rank];
    const bv = value[b.rank] === 14 && high === 5 ? 1 : value[b.rank];
    return bv - av || a.id.localeCompare(b.id);
  });
}
export function rankFive(cards: readonly Card[]): RankedHand {
  if (cards.length !== 5 || new Set(cards.map((c) => c.id)).size !== 5) throw new Error('rankFive requires five unique cards');
  const groups = [...new Map<number, Card[]>().entries()];
  const byRank = new Map<number, Card[]>();
  for (const c of cards) byRank.set(value[c.rank], [...(byRank.get(value[c.rank]) ?? []), c]);
  const grouped = [...byRank.entries()].sort((a, b) => b[1].length - a[1].length || b[0] - a[0]);
  void groups;
  const flush = cards.every((c) => c.suit === cards[0]!.suit);
  const sh = straightHigh(cards);
  const make = (category: HandCategory, vector: readonly number[], winningFive: readonly Card[] = sorted(cards)): RankedHand => Object.freeze({ category, categoryValue: categoryValue[category], rankVector: Object.freeze([...vector]), winningFive: Object.freeze([...winningFive]) });
  if (flush && sh !== undefined) return make('STRAIGHT_FLUSH', [sh], orderStraight(cards, sh));
  if (grouped[0]![1].length === 4) return make('FOUR_OF_A_KIND', [grouped[0]![0], grouped[1]![0]]);
  if (grouped[0]![1].length === 3 && grouped[1]![1].length === 2) return make('FULL_HOUSE', [grouped[0]![0], grouped[1]![0]]);
  if (flush) return make('FLUSH', sorted(cards).map((c) => value[c.rank]));
  if (sh !== undefined) return make('STRAIGHT', [sh], orderStraight(cards, sh));
  if (grouped[0]![1].length === 3) return make('THREE_OF_A_KIND', [grouped[0]![0], ...grouped.slice(1).map((g) => g[0])]);
  if (grouped[0]![1].length === 2 && grouped[1]![1].length === 2) return make('TWO_PAIR', [grouped[0]![0], grouped[1]![0], grouped[2]![0]]);
  if (grouped[0]![1].length === 2) return make('PAIR', [grouped[0]![0], ...grouped.slice(1).map((g) => g[0])]);
  return make('HIGH_CARD', sorted(cards).map((c) => value[c.rank]));
}
export function compareHands(a: RankedHand, b: RankedHand): number {
  if (a.categoryValue !== b.categoryValue) return a.categoryValue - b.categoryValue;
  for (let i = 0; i < Math.max(a.rankVector.length, b.rankVector.length); i += 1) {
    const av = a.rankVector[i] ?? 0; const bv = b.rankVector[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}
export function rankBest(cards: readonly Card[]): RankedHand {
  if (cards.length < 5 || cards.length > 7 || new Set(cards.map((c) => c.id)).size !== cards.length) throw new Error('rankBest requires 5–7 unique cards');
  let best: RankedHand | undefined;
  for (let a = 0; a < cards.length - 4; a += 1) for (let b = a + 1; b < cards.length - 3; b += 1) for (let c = b + 1; c < cards.length - 2; c += 1) for (let d = c + 1; d < cards.length - 1; d += 1) for (let e = d + 1; e < cards.length; e += 1) {
    const candidate = rankFive([cards[a]!, cards[b]!, cards[c]!, cards[d]!, cards[e]!]);
    if (!best || compareHands(candidate, best) > 0) best = candidate;
  }
  return best!;
}
