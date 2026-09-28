import test from "node:test";
import assert from "node:assert/strict";
import { BET_AMOUNTS, INITIAL_CREDITS, CATEGORY as C, createDeck, shuffleDeck, deal, drawReplacement, evaluateHand, payoutFor, recommendHolds, migrateEconomy } from "../src/engine.js";

const c = (rank, suit) => ({ rank, suit });
const hands = {
  royal: [c(10,"♠"),c(11,"♠"),c(12,"♠"),c(13,"♠"),c(14,"♠")],
  straightFlush: [c(5,"♥"),c(6,"♥"),c(7,"♥"),c(8,"♥"),c(9,"♥")],
  fourKind: [c(9,"♠"),c(9,"♥"),c(9,"♦"),c(9,"♣"),c(2,"♠")],
  fullHouse: [c(8,"♠"),c(8,"♥"),c(8,"♦"),c(4,"♣"),c(4,"♠")],
  flush: [c(2,"♦"),c(5,"♦"),c(8,"♦"),c(10,"♦"),c(13,"♦")],
  straight: [c(3,"♠"),c(4,"♥"),c(5,"♦"),c(6,"♣"),c(7,"♠")],
  wheel: [c(14,"♠"),c(2,"♥"),c(3,"♦"),c(4,"♣"),c(5,"♠")],
  aceHigh: [c(10,"♠"),c(11,"♥"),c(12,"♦"),c(13,"♣"),c(14,"♠")],
  wrap: [c(12,"♠"),c(13,"♥"),c(14,"♦"),c(2,"♣"),c(3,"♠")],
  kingAceWrap: [c(13,"♠"),c(14,"♥"),c(2,"♦"),c(3,"♣"),c(4,"♠")],
  threeKind: [c(6,"♠"),c(6,"♥"),c(6,"♦"),c(2,"♣"),c(13,"♠")],
  twoPair: [c(6,"♠"),c(6,"♥"),c(2,"♦"),c(2,"♣"),c(13,"♠")],
  jacks: [c(11,"♠"),c(11,"♥"),c(2,"♦"),c(5,"♣"),c(13,"♠")],
  lowPair: [c(10,"♠"),c(10,"♥"),c(2,"♦"),c(5,"♣"),c(13,"♠")],
};

const cases = [
  ["Royal Flush", "royal", C.ROYAL_FLUSH], ["Straight Flush", "straightFlush", C.STRAIGHT_FLUSH],
  ["Four of a Kind", "fourKind", C.FOUR_KIND], ["Full House", "fullHouse", C.FULL_HOUSE],
  ["Flush", "flush", C.FLUSH], ["Straight", "straight", C.STRAIGHT], ["Ace-low Straight", "wheel", C.STRAIGHT],
  ["Ace-high Straight", "aceHigh", C.STRAIGHT], ["Q-K-A-2-3 is not a straight", "wrap", C.NO_WIN],
  ["K-A-2-3-4 is not a straight", "kingAceWrap", C.NO_WIN], ["Three of a Kind", "threeKind", C.THREE_KIND],
  ["Two Pair", "twoPair", C.TWO_PAIR], ["Jacks or Better", "jacks", C.JACKS_OR_BETTER],
  ["low pair does not pay", "lowPair", C.NO_WIN],
];
for (const [name, fixture, expected] of cases) test(name, () => assert.equal(evaluateHand(hands[fixture]).category, expected));

test("all five bet choices scale the 9/6 table and the maximum royal bonus", () => {
  assert.deepEqual(BET_AMOUNTS, [100, 200, 500, 1000, 5000]);
  for (const bet of BET_AMOUNTS) {
    for (const [category, multiplier] of [[C.STRAIGHT_FLUSH, 50], [C.FOUR_KIND, 25], [C.FULL_HOUSE, 9], [C.FLUSH, 6], [C.STRAIGHT, 4], [C.THREE_KIND, 3], [C.TWO_PAIR, 2], [C.JACKS_OR_BETTER, 1]]) {
      assert.equal(payoutFor(category, bet), multiplier * bet);
    }
    assert.equal(payoutFor(C.ROYAL_FLUSH, bet), (bet === 5000 ? 800 : 250) * bet);
    assert.equal(payoutFor(C.NO_WIN, bet), 0);
  }
  assert.throws(() => payoutFor(C.FULL_HOUSE, 300), /valid bet/);
});

test("old bankroll and statistics migrate once without wiping play history", () => {
  const legacy = { credits: 846, bet: 4, settings: { sound: false }, stats: { handsPlayed: 12, creditsWagered: 71, creditsWon: 28, largestWin: 15, categories: { Flush: 2 } } };
  const migrated = migrateEconomy(legacy);
  assert.equal(INITIAL_CREDITS, 100000);
  assert.equal(migrated.credits, 84600);
  assert.equal(migrated.bet, 1000);
  assert.deepEqual([migrated.stats.creditsWagered, migrated.stats.creditsWon, migrated.stats.largestWin], [7100, 2800, 1500]);
  assert.equal(migrated.stats.handsPlayed, 12);
  assert.equal(migrated.stats.categories.Flush, 2);
  assert.equal(migrated.settings.sound, false);
  assert.deepEqual(migrateEconomy(migrated), migrated);
  assert.equal(migrateEconomy({ credits: 0, bet: 5 }).bet, 5000);
});

test("shuffling is deterministic with an injected RNG and preserves the deck", () => {
  const deck = createDeck();
  assert.equal(deck.length, 52);
  const shuffled = shuffleDeck(deck, () => 0);
  assert.equal(shuffled.length, 52);
  assert.equal(new Set(shuffled.map(x => `${x.rank}${x.suit}`)).size, 52);
  assert.equal(deck[0].rank, 2);
  assert.deepEqual(shuffleDeck(deck, () => .5), shuffleDeck(deck, () => .5));
});

test("discarded cards are replaced from the remaining deck without duplicates", () => {
  const deck = createDeck();
  const { hand, remaining } = deal(deck);
  const holds = [true, false, true, false, false];
  const before = hand.slice();
  const result = drawReplacement(hand, holds, remaining);
  assert.strictEqual(result.hand[0], before[0]);
  assert.strictEqual(result.hand[2], before[2]);
  assert.deepEqual([result.hand[1].rank, result.hand[3].rank, result.hand[4].rank], [7, 8, 9]);
  assert.equal(result.remaining.length, 44);
  assert.equal(new Set(result.hand.map(card => `${card.rank}${card.suit}`)).size, 5);
});

test("full deal and replacement never repeat a card from the hand", () => {
  for (let seed = 0; seed < 30; seed++) {
    let x = seed + 1;
    const random = () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646;
    const { hand, remaining } = deal(shuffleDeck(createDeck(), random));
    const result = drawReplacement(hand, [false, false, false, false, false], remaining);
    assert.equal(new Set(result.hand.map(card => `${card.rank}${card.suit}`)).size, 5);
    const finalKeys = new Set(result.hand.map(card => `${card.rank}${card.suit}`));
    assert.equal(finalKeys.size, 5);
  }
});

test("held cards remain the exact same card objects after the draw", () => {
  const { hand, remaining } = deal(createDeck());
  const holds = [false, true, false, true, false];
  const card2 = hand[1], card4 = hand[3];
  const finalHand = drawReplacement(hand, holds, remaining).hand;
  assert.strictEqual(finalHand[1], card2);
  assert.strictEqual(finalHand[3], card4);
});

test("hint holds an obvious pair and four cards to a royal", () => {
  assert.deepEqual(recommendHolds(hands.jacks), [0, 1]);
  const fourRoyal = [c(10,"♣"),c(11,"♣"),c(12,"♣"),c(13,"♣"),c(4,"♦")];
  assert.deepEqual(recommendHolds(fourRoyal), [0, 1, 2, 3]);
  const fourStraightFlush = [c(5,"♠"),c(6,"♠"),c(7,"♠"),c(8,"♠"),c(13,"♦")];
  assert.deepEqual(recommendHolds(fourStraightFlush), [0, 1, 2, 3]);
  const fourFlush = [c(2,"♥"),c(5,"♥"),c(8,"♥"),c(12,"♥"),c(3,"♣")];
  assert.deepEqual(recommendHolds(fourFlush), [0, 1, 2, 3]);
});
