import { randomInt } from 'node:crypto';

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
export const SUITS = ['c', 'd', 'h', 's'] as const;
export type Rank = typeof RANKS[number];
export type Suit = typeof SUITS[number];
export type Card = Readonly<{ id: string; rank: Rank; suit: Suit }>;

export interface RandomSource { nextInt(maxExclusive: number): number; }
export const cryptoRandom: RandomSource = { nextInt: (max) => randomInt(max) };

export function card(rank: Rank, suit: Suit): Card { return Object.freeze({ id: `${rank}${suit}`, rank, suit }); }
export function standardDeck(): readonly Card[] {
  return Object.freeze(SUITS.flatMap((suit) => RANKS.map((rank) => card(rank, suit))));
}
export function shuffle(deck: readonly Card[], random: RandomSource = cryptoRandom): readonly Card[] {
  const out = [...deck];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = random.nextInt(i + 1);
    if (!Number.isInteger(j) || j < 0 || j > i) throw new Error('RandomSource returned an invalid value');
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return Object.freeze(out);
}
export function deterministicDeck(ids: readonly string[]): readonly Card[] {
  const all = new Map(standardDeck().map((c) => [c.id, c]));
  if (new Set(ids).size !== ids.length) throw new Error('Deterministic deck contains duplicate cards');
  const chosen = ids.map((id) => all.get(id));
  if (chosen.some((c) => c === undefined)) throw new Error('Deterministic deck contains an invalid card');
  const remaining = standardDeck().filter((c) => !ids.includes(c.id));
  return Object.freeze([...(chosen as Card[]), ...remaining]);
}
export function take(deck: readonly Card[], count: number): readonly [readonly Card[], readonly Card[]] {
  if (!Number.isInteger(count) || count < 0 || count > deck.length) throw new Error('Not enough cards');
  return [Object.freeze(deck.slice(count)), Object.freeze(deck.slice(0, count))];
}
