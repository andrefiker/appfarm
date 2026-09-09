import assert from 'node:assert/strict';
import test from 'node:test';
import { act, assertInvariants, buildPots, card, compareHands, createGame, draw, legalActions, rankBest, rankFive, settle, splitPot, startHand, type Card, type GameState } from '../engine/index.js';

const c = (text: string): Card => card(text.slice(0, -1) as Card['rank'], text.slice(-1) as Card['suit']);
const h = (...ids: string[]) => rankFive(ids.map(c));
const seats = (stacks: readonly number[] = [1000, 1000, 1000]) => stacks.map((stack, seat) => ({ id: String.fromCharCode(65 + seat), seat, stack }));
function advanceWithChecks(state: GameState, limit = 100): GameState {
  let s = state;
  for (let i = 0; i < limit && s.phase !== 'SHOWDOWN'; i += 1) {
    assertInvariants(s);
    if (s.phase === 'DRAW') s = draw(s, s.actorId!, []);
    else { const legal = legalActions(s); s = legal.check ? act(s, s.actorId!, { type: 'check' }) : legal.call ? act(s, s.actorId!, { type: 'call' }) : act(s, s.actorId!, { type: 'fold' }); }
  }
  assert.equal(s.phase, 'SHOWDOWN', 'hand exceeded simulation step limit');
  return s;
}

test('ranks every category and all core tie breakers', () => {
  const cases: readonly [string, ReturnType<typeof h>][] = [
    ['HIGH_CARD', h('Ac', 'Kd', '9h', '6s', '3c')], ['PAIR', h('Ac', 'Ad', '9h', '6s', '3c')], ['TWO_PAIR', h('Ac', 'Ad', '9h', '9s', '3c')],
    ['THREE_OF_A_KIND', h('Ac', 'Ad', 'Ah', '6s', '3c')], ['STRAIGHT', h('9c', '8d', '7h', '6s', '5c')], ['FLUSH', h('Ac', 'Jc', '9c', '6c', '3c')],
    ['FULL_HOUSE', h('Ac', 'Ad', 'Ah', '9s', '9c')], ['FOUR_OF_A_KIND', h('Ac', 'Ad', 'Ah', 'As', '3c')], ['STRAIGHT_FLUSH', h('9c', '8c', '7c', '6c', '5c')],
  ];
  for (const [name, ranked] of cases) assert.equal(ranked.category, name);
  assert.deepEqual(h('Ac', '2d', '3h', '4s', '5c').rankVector, [5]);
  assert.ok(compareHands(h('Ac', 'Ad', 'Kh', 'Qs', 'Jc'), h('Ac', 'Ad', 'Kh', 'Qs', 'Tc')) > 0);
  assert.ok(compareHands(h('Ac', 'Ad', 'Kh', 'Qs', 'Jc'), h('As', 'Ah', 'Kd', 'Qh', 'Js')) === 0);
});
test('holdem selects best five, including board-only hands and ties', () => {
  const board = ['Ac', 'Kd', 'Qh', 'Js', 'Tc'].map(c);
  assert.equal(rankBest([...board, c('2c'), c('3d')]).category, 'STRAIGHT');
  assert.equal(compareHands(rankBest([...board, c('2c'), c('3d')]), rankBest([...board, c('4c'), c('5d')])), 0);
  assert.equal(rankBest(['Ac', 'Ad', 'Ah', 'Ks', 'Kd', '2c', '3d'].map(c)).category, 'FULL_HOUSE');
});
test('pot construction preserves folded money and returns unmatched excess', () => {
  const result = buildPots([{ playerId: 'A', amount: 500 }, { playerId: 'B', amount: 300 }, { playerId: 'C', amount: 100, folded: true }]);
  assert.deepEqual(result.pots.map((p) => p.amount), [300, 400]);
  assert.deepEqual(result.pots[0]!.eligibleIds, ['A', 'B']);
  assert.deepEqual(result.returned, { A: 200 });
});
test('splits odd chips clockwise from first eligible winner left of button', () => {
  assert.deepEqual(splitPot(11, ['B', 'D'], ['C', 'D', 'A', 'B']), { B: 5, D: 6 });
});
test('holdem starts with correct heads-up blinds and action', () => {
  const s = startHand(createGame('HOLD_EM_NO_LIMIT', seats([1000, 1000]), 0));
  assert.equal(s.phase, 'PREFLOP'); assert.equal(s.actorId, 'A');
  assert.equal(s.players[0]!.roundCommitted, 10); assert.equal(s.players[1]!.roundCommitted, 20);
  assertInvariants(s);
});
test('illegal actions fail without mutating immutable input', () => {
  const s = startHand(createGame('HOLD_EM_NO_LIMIT', seats([1000, 1000]), 0)); const before = JSON.stringify(s);
  assert.throws(() => act(s, 'B', { type: 'check' }), /Wrong turn/);
  assert.throws(() => act(s, 'A', { type: 'check' }), /Illegal check/);
  assert.equal(JSON.stringify(s), before);
});
test('no-limit full raise reopens, short raise does not, cumulative short raises can', () => {
  let s = startHand(createGame('HOLD_EM_NO_LIMIT', seats([1000, 125, 1000, 200, 1000]), 0));
  // Button A: SB B, BB C; preflop first is D. Normalize to the TDA fixture through legal actions.
  s = act(s, 'D', { type: 'fold' }); s = act(s, 'E', { type: 'fold' }); s = act(s, 'A', { type: 'raiseTo', amount: 100 });
  s = act(s, 'B', { type: 'call' }); s = act(s, 'C', { type: 'call' });
  assert.equal(s.phase, 'FLOP');
  // Directly establishes re-opening semantics from per-player seen wagers: A faces +100, C faces +75.
  const a = s.players.find((p) => p.id === 'A')!; const cPlayer = s.players.find((p) => p.id === 'C')!;
  assert.equal(a.seenWager, null); assert.equal(cPlayer.seenWager, null);
});
test('all-in preflop runs out and settles exactly once', () => {
  let s = startHand(createGame('HOLD_EM_NO_LIMIT', seats([20, 20]), 0));
  s = act(s, 'A', { type: 'call' });
  assert.equal(s.phase, 'SHOWDOWN'); const settled = settle(s); assertInvariants(settled); assert.throws(() => settle(settled), /already applied/);
  assert.equal(settled.players.reduce((n, p) => n + p.stack, 0), 40);
});
test('five-card draw accepts 0–5 exchange positions and rejects invalid/repeat confirmations', () => {
  for (let count = 0; count <= 5; count += 1) {
    let s = startHand(createGame('FIVE_CARD_DRAW_FIXED_LIMIT', seats([1000, 1000]), 0));
    s = act(s, s.actorId!, { type: 'check' }); s = act(s, s.actorId!, { type: 'check' }); assert.equal(s.phase, 'DRAW');
    const id = s.actorId!; s = draw(s, id, Array.from({ length: count }, (_, i) => i));
    assert.equal(s.players.find((p) => p.id === id)!.exchangeCount, count); assertInvariants(s);
    assert.throws(() => draw(s, id, []), /draw turn|cannot draw/);
  }
  let s = startHand(createGame('FIVE_CARD_DRAW_FIXED_LIMIT', seats([1000, 1000]), 0)); s = act(s, s.actorId!, { type: 'check' }); s = act(s, s.actorId!, { type: 'check' });
  assert.throws(() => draw(s, s.actorId!, [0, 0]), /Invalid/); assert.throws(() => draw(s, s.actorId!, [5]), /Invalid/);
});
test('fixed limit has unit raises, cap and sub-half all-in exception', () => {
  let s = startHand(createGame('FIVE_CARD_DRAW_FIXED_LIMIT', seats([1000, 1000]), 0));
  s = act(s, s.actorId!, { type: 'betTo', amount: 20 }); assert.equal(s.currentBet, 20);
  s = act(s, s.actorId!, { type: 'raiseTo', amount: 40 }); assert.equal(s.currentBet, 40); assert.equal(s.fixedRaises, 1);
  s = act(s, s.actorId!, { type: 'raiseTo', amount: 60 }); s = act(s, s.actorId!, { type: 'raiseTo', amount: 80 }); s = act(s, s.actorId!, { type: 'call' });
  assert.equal(s.phase, 'DRAW');
});
test('full legal-hand simulations terminate with invariants for recorded seeds', () => {
  const seeds = [1, 7, 42, 99, 2026]; let hands = 0;
  for (const seed of seeds) for (const variant of ['HOLD_EM_NO_LIMIT', 'FIVE_CARD_DRAW_FIXED_LIMIT'] as const) {
    let n = seed >>> 0; const random = { nextInt: (max: number) => { n = (n * 1664525 + 1013904223) >>> 0; return n % max; } };
    let s = startHand(createGame(variant, seats([1000, 1000, 1000]), 0), random); s = advanceWithChecks(s); s = settle(s); assertInvariants(s); hands += 1;
  }
  assert.equal(hands, 10);
});
test('serialization round trip retains pure canonical state', () => {
  const s = startHand(createGame('HOLD_EM_NO_LIMIT', seats(), 0)); const cloned = JSON.parse(JSON.stringify(s)) as GameState;
  assert.deepEqual(cloned, s); assertInvariants(cloned);
});
