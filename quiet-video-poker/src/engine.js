export const SUITS = ["♠", "♥", "♦", "♣"];
export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
export const CATEGORY = Object.freeze({
  ROYAL_FLUSH: "Royal Flush", STRAIGHT_FLUSH: "Straight Flush", FOUR_KIND: "Four of a Kind",
  FULL_HOUSE: "Full House", FLUSH: "Flush", STRAIGHT: "Straight", THREE_KIND: "Three of a Kind",
  TWO_PAIR: "Two Pair", JACKS_OR_BETTER: "Jacks or Better", NO_WIN: "No Win",
});
export const PAYTABLE = Object.freeze([
  [CATEGORY.ROYAL_FLUSH, 250], [CATEGORY.STRAIGHT_FLUSH, 50], [CATEGORY.FOUR_KIND, 25],
  [CATEGORY.FULL_HOUSE, 9], [CATEGORY.FLUSH, 6], [CATEGORY.STRAIGHT, 4],
  [CATEGORY.THREE_KIND, 3], [CATEGORY.TWO_PAIR, 2], [CATEGORY.JACKS_OR_BETTER, 1],
]);
export const BET_AMOUNTS = Object.freeze([100, 200, 500, 1000, 5000]);
export const INITIAL_CREDITS = 100000;
const OLD_BETS = Object.freeze([100, 200, 500, 1000, 5000]);

export function migrateEconomy(saved) {
  if (saved.economyVersion === 2) {
    return { ...saved, bet: BET_AMOUNTS.includes(saved.bet) ? saved.bet : BET_AMOUNTS[0] };
  }
  const legacyCredits = Number.isFinite(saved.credits) && saved.credits >= 0 ? saved.credits : 1000;
  const stats = { ...saved.stats };
  for (const key of ["creditsWagered", "creditsWon", "largestWin"]) {
    stats[key] = (Number.isFinite(stats[key]) && stats[key] >= 0 ? stats[key] : 0) * 100;
  }
  return {
    ...saved, economyVersion: 2, credits: Math.round(legacyCredits * 100),
    bet: OLD_BETS[saved.bet - 1] ?? BET_AMOUNTS[0], stats,
  };
}

export function createDeck() {
  return SUITS.flatMap(suit => RANKS.map(rank => ({ rank, suit })));
}

export function shuffleDeck(deck = createDeck(), random = Math.random) {
  const shuffled = deck.map(card => ({ ...card }));
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function deal(deck = shuffleDeck()) {
  if (deck.length < 5) throw new Error("A fresh deck must contain at least five cards.");
  return { hand: deck.slice(0, 5).map(c => ({ ...c })), remaining: deck.slice(5).map(c => ({ ...c })) };
}

export function drawReplacement(hand, held, remaining) {
  if (hand.length !== 5 || held.length !== 5) throw new Error("A poker hand must contain five hold positions.");
  const need = held.filter(value => !value).length;
  if (remaining.length < need) throw new Error("Not enough cards remain in the deck.");
  const used = new Set(hand.map(keyCard));
  const drawn = remaining.slice(0, need);
  for (const card of drawn) {
    if (used.has(keyCard(card))) throw new Error("Deck state contains a card already in the hand.");
    used.add(keyCard(card));
  }
  let index = 0;
  const finalHand = hand.map((card, i) => held[i] ? card : { ...drawn[index++] });
  return { hand: finalHand, remaining: remaining.slice(need).map(c => ({ ...c })) };
}

const keyCard = c => `${c.rank}${c.suit}`;
function straightHigh(ranks) {
  const unique = [...new Set(ranks)].sort((a, b) => a - b);
  if (unique.length !== 5) return 0;
  if (unique.join(",") === "2,3,4,5,14") return 5;
  return unique[4] - unique[0] === 4 ? unique[4] : 0;
}

export function evaluateHand(hand) {
  if (!Array.isArray(hand) || hand.length !== 5 || new Set(hand.map(keyCard)).size !== 5) throw new Error("Expected five distinct cards.");
  const ranks = hand.map(c => c.rank);
  const counts = new Map();
  for (const rank of ranks) counts.set(rank, (counts.get(rank) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = hand.every(c => c.suit === hand[0].suit);
  const high = straightHigh(ranks);
  let category = CATEGORY.NO_WIN;
  if (flush && high === 14 && new Set(ranks).has(10)) category = CATEGORY.ROYAL_FLUSH;
  else if (flush && high) category = CATEGORY.STRAIGHT_FLUSH;
  else if (groups[0][1] === 4) category = CATEGORY.FOUR_KIND;
  else if (groups[0][1] === 3 && groups[1][1] === 2) category = CATEGORY.FULL_HOUSE;
  else if (flush) category = CATEGORY.FLUSH;
  else if (high) category = CATEGORY.STRAIGHT;
  else if (groups[0][1] === 3) category = CATEGORY.THREE_KIND;
  else if (groups[0][1] === 2 && groups[1][1] === 2) category = CATEGORY.TWO_PAIR;
  else if (groups[0][1] === 2 && groups[0][0] >= 11) category = CATEGORY.JACKS_OR_BETTER;
  return { category, winning: category !== CATEGORY.NO_WIN, groups, straightHigh: high };
}

export function payoutFor(category, bet) {
  if (!BET_AMOUNTS.includes(bet)) throw new Error("Select a valid bet amount.");
  const base = PAYTABLE.find(([name]) => name === category)?.[1] ?? 0;
  if (category === CATEGORY.ROYAL_FLUSH && bet === 5000) return 800 * bet;
  return base * bet;
}

export function recommendHolds(hand) {
  if (hand.length !== 5) return [];
  const ev = evaluateHand(hand);
  if ([CATEGORY.ROYAL_FLUSH, CATEGORY.STRAIGHT_FLUSH, CATEGORY.FOUR_KIND, CATEGORY.FULL_HOUSE,
    CATEGORY.FLUSH, CATEGORY.STRAIGHT, CATEGORY.THREE_KIND, CATEGORY.TWO_PAIR].includes(ev.category)) return [0, 1, 2, 3, 4];
  const bySuit = new Map(SUITS.map(s => [s, []]));
  hand.forEach((c, i) => bySuit.get(c.suit).push({ ...c, i }));
  const royalSuitCounts = new Map();
  for (const c of hand) if (c.rank >= 10) royalSuitCounts.set(c.suit, (royalSuitCounts.get(c.suit) ?? 0) + 1);
  const fourRoyalSuit = [...royalSuitCounts].find(([, n]) => n === 4);
  if (fourRoyalSuit) return hand.map((c, i) => c.suit === fourRoyalSuit[0] && c.rank >= 10 ? i : -1).filter(i => i >= 0);

  for (const suit of SUITS) {
    const suited = bySuit.get(suit);
    if (suited.length < 4) continue;
    const ranks = new Set(suited.map(c => c.rank));
    if (ranks.has(14)) ranks.add(1);
    for (let low = 1; low <= 10; low++) {
      const seq = [low, low + 1, low + 2, low + 3, low + 4];
      const matches = suited.filter(c => seq.includes(c.rank === 14 ? 1 : c.rank));
      if (matches.length === 4) return matches.map(c => c.i);
    }
  }

  const counts = new Map();
  hand.forEach((c, i) => counts.set(c.rank, [...(counts.get(c.rank) ?? []), i]));
  const pair = [...counts].find(([, indexes]) => indexes.length >= 2);
  if (pair) return pair[1];

  const fourFlush = [...bySuit.values()].find(cards => cards.length === 4);
  if (fourFlush) return fourFlush.map(c => c.i);

  for (let low = 1; low <= 10; low++) {
    const seq = [low, low + 1, low + 2, low + 3, low + 4];
    const matches = hand.map((c, i) => ({ c, i })).filter(({ c }) => seq.includes(c.rank === 14 ? 1 : c.rank));
    if (matches.length === 4 && new Set(matches.map(x => x.c.rank)).size === 4) return matches.map(x => x.i);
  }

  const highCards = hand.map((c, i) => ({ ...c, i })).filter(c => c.rank >= 11);
  if (highCards.length >= 2) return highCards.slice(0, 2).map(c => c.i);
  return highCards.length ? [highCards[0].i] : [];
}
