import assert from 'node:assert/strict';
import test from 'node:test';
import {
  act, assertInvariants, card, compareHands, createGame, deterministicDeck, draw, legalActions,
  rankBest, rankFive, settle, setBetweenHandStatus, startHand, standardDeck,
  type Card, type GameState, type Player, type Variant,
} from '../engine/index.js';

const C = (id: string): Card => card(id.slice(0, -1) as Card['rank'], id.slice(-1) as Card['suit']);
const H = (...ids: string[]) => rankFive(ids.map(C));
const seats = (stacks: readonly number[], ids = ['A', 'B', 'C', 'D', 'E']) => stacks.map((stack, seat) => ({ id: ids[seat]!, seat, stack }));
const byId = (s: GameState, id: string) => s.players.find((p) => p.id === id)!;
const totalStacks = (s: GameState) => s.players.reduce((n, p) => n + p.stack, 0);

/** A deliberately complete card-location fixture used only to test public settlement. */
function showdown(variant: Variant, input: readonly Readonly<{ id: string; seat: number; stack: number; committed: number; hand: readonly string[]; folded?: boolean }>[], board: readonly string[] = [], buttonSeat = 0): GameState {
  const used = [...board, ...input.flatMap((p) => p.hand)];
  assert.equal(new Set(used).size, used.length, 'fixture cards must be unique');
  const deck = standardDeck().filter((x) => !used.includes(x.id));
  const players = input.map((p): Player => Object.freeze({ id: p.id, seat: p.seat, stack: p.stack, status: 'ACTIVE', inHand: true, folded: p.folded ?? false, allIn: p.stack === 0, totalCommitted: p.committed, roundCommitted: 0, hand: Object.freeze(p.hand.map(C)), exchangeCount: 0, drew: false, seenWager: null }));
  const base = createGame(variant, input.map((p) => ({ id: p.id, seat: p.seat, stack: p.stack })), buttonSeat);
  return Object.freeze({ ...base, phase: 'SHOWDOWN', players: Object.freeze(players), deck: Object.freeze(deck), board: Object.freeze(board.map(C)), tableChipTotal: input.reduce((n, p) => n + p.stack + p.committed, 0), actorId: undefined });
}

/** A betting-only fixture: action validation does not inspect hidden cards. */
function betting(variant: Variant, stacks: readonly number[], actorId = 'A'): GameState {
  const base = createGame(variant, seats(stacks));
  const players = base.players.map((p) => Object.freeze({ ...p, inHand: true, allIn: p.stack === 0 }));
  return Object.freeze({ ...base, phase: variant === 'HOLD_EM_NO_LIMIT' ? 'FLOP' : 'FIRST_BETTING', players: Object.freeze(players), actorId });
}

test('ranking matrix covers all categories, kicker vectors, wheels and exact ties', () => {
  const categories: readonly [string, readonly string[]][] = [
    ['HIGH_CARD', ['Ac', 'Kd', '9h', '6s', '3c']], ['PAIR', ['Ac', 'Ad', '9h', '6s', '3c']], ['TWO_PAIR', ['Ac', 'Ad', '9h', '9s', '3c']],
    ['THREE_OF_A_KIND', ['Ac', 'Ad', 'Ah', '6s', '3c']], ['STRAIGHT', ['9c', '8d', '7h', '6s', '5c']], ['FLUSH', ['Ac', 'Jc', '9c', '6c', '3c']],
    ['FULL_HOUSE', ['Ac', 'Ad', 'Ah', '9s', '9c']], ['FOUR_OF_A_KIND', ['Ac', 'Ad', 'Ah', 'As', '3c']], ['STRAIGHT_FLUSH', ['9c', '8c', '7c', '6c', '5c']],
  ];
  for (const [category, cards] of categories) assert.equal(H(...cards).category, category);
  assert.deepEqual(H('Ac', '2d', '3h', '4s', '5c').rankVector, [5]);
  assert.ok(compareHands(H('6c', '5d', '4h', '3s', '2c'), H('Ac', '2d', '3h', '4s', '5c')) > 0);
  assert.ok(compareHands(H('Ac', 'Jc', '9c', '6c', '3c'), H('As', 'Ts', '9s', '6s', '3s')) > 0);
  assert.ok(compareHands(H('Ac', 'Ad', 'Ah', 'Ks', 'Kd'), H('As', 'Ah', 'Ad', 'Qs', 'Qd')) > 0);
  assert.ok(compareHands(H('Ac', 'Ad', 'Ah', 'Ks', 'Kd'), H('As', 'Ah', 'Ad', 'Ks', 'Kh')) === 0);
  assert.ok(compareHands(H('Ac', 'Ad', 'Ah', 'As', 'Kc'), H('Kc', 'Kd', 'Kh', 'Ks', 'Ac')) > 0);
  assert.ok(compareHands(H('Ac', 'Ad', 'Ah', 'As', 'Kc'), H('As', 'Ah', 'Ad', 'Ac', 'Qc')) > 0);
  assert.ok(compareHands(H('Ac', 'Ad', 'Kc', 'Kd', 'Qc'), H('As', 'Ah', 'Qc', 'Qd', 'Kc')) > 0);
  assert.ok(compareHands(H('Ac', 'Ad', 'Kc', 'Kd', 'Qc'), H('As', 'Ah', 'Kc', 'Kd', 'Jc')) > 0);
  assert.ok(compareHands(H('Ac', 'Ad', 'Kc', 'Qs', 'Jc'), H('As', 'Ah', 'Kc', 'Qs', 'Tc')) > 0);
  assert.ok(compareHands(H('Ac', 'Kd', 'Qh', 'Js', '9c'), H('As', 'Kd', 'Qh', 'Js', '8c')) > 0);
  assert.equal(compareHands(H('Ac', 'Kd', 'Qh', 'Js', '9c'), H('As', 'Kh', 'Qd', 'Jc', '9d')), 0);
});

test('holdem best-five matrix includes board plays, one/two hole cards and unique best combination', () => {
  const board = ['Ac', 'Kd', 'Qh', 'Js', 'Tc'].map(C);
  const boardOnly = rankBest([...board, C('2c'), C('3d')]);
  assert.equal(boardOnly.category, 'STRAIGHT'); assert.deepEqual(boardOnly.winningFive.map((x) => x.id), ['Ac', 'Kd', 'Qh', 'Js', 'Tc']);
  assert.equal(compareHands(boardOnly, rankBest([...board, C('4c'), C('5d')])), 0);
  assert.equal(rankBest(['2c', '3d', 'Ac', 'Kd', 'Qh', 'Js', 'Tc'].map(C)).category, 'STRAIGHT');
  assert.equal(rankBest(['Jc', 'Tc', 'Ac', 'Kd', 'Qh', '9s', '2d'].map(C)).category, 'STRAIGHT');
  const best = rankBest(['Ac', 'Ad', 'Ah', 'Ks', 'Kd', '2c', '3d'].map(C));
  assert.equal(best.category, 'FULL_HOUSE'); assert.deepEqual(best.rankVector, [14, 13]);
});

test('no-limit opening completion and short blind preserve the table bring-in', () => {
  let s = betting('HOLD_EM_NO_LIMIT', [5, 100, 100], 'A');
  s = act(s, 'A', { type: 'betTo', amount: 5 });
  assert.deepEqual(legalActions(s, 'B').raiseTo, { min: 20, max: 100 });
  assert.throws(() => act(s, 'B', { type: 'raiseTo', amount: 19 }), /Illegal/);
  s = act(s, 'B', { type: 'raiseTo', amount: 20 }); assert.equal(s.currentBet, 20);
  let hu = startHand(createGame('HOLD_EM_NO_LIMIT', seats([1000, 5]), 0));
  assert.equal(byId(hu, 'B').roundCommitted, 5); assert.equal(hu.currentBet, 20);
  assert.equal(hu.actorId, 'A'); assert.equal(legalActions(hu).call, true);
  hu = act(hu, 'A', { type: 'call' }); assert.equal(hu.phase, 'SHOWDOWN');
  const multi = startHand(createGame('HOLD_EM_NO_LIMIT', seats([1000, 1000, 5]), 0));
  assert.equal(multi.currentBet, 20); assert.equal(multi.actorId, 'A');
});

test('no-limit action matrix rejects illegal actions without input mutation and accepts legal extremes', () => {
  let s = startHand(createGame('HOLD_EM_NO_LIMIT', seats([1000, 1000]), 0)); const before = JSON.stringify(s);
  assert.throws(() => act(s, 'B', { type: 'call' }), /Wrong turn/);
  assert.throws(() => act(s, 'A', { type: 'check' }), /Illegal check/);
  assert.throws(() => act(s, 'A', { type: 'betTo', amount: 20 }), /Illegal/);
  assert.throws(() => act(s, 'A', { type: 'raiseTo', amount: 20.5 }), /Illegal/);
  assert.throws(() => act(s, 'A', { type: 'raiseTo', amount: 10_000 }), /Illegal/);
  assert.equal(JSON.stringify(s), before);
  s = act(s, 'A', { type: 'raiseTo', amount: 1000 }); assert.equal(byId(s, 'A').allIn, true);
  assert.equal(legalActions(s, 'B').call, true); s = act(s, 'B', { type: 'call' }); assert.equal(s.phase, 'SHOWDOWN');
});

test('TDA cumulative short-all-in reopening is per player and legal continuation resolves', () => {
  let s = betting('HOLD_EM_NO_LIMIT', [1000, 125, 1000, 200, 1000]);
  s = act(s, 'A', { type: 'betTo', amount: 100 });
  s = act(s, 'B', { type: 'raiseTo', amount: 125 });
  s = act(s, 'C', { type: 'call' });
  s = act(s, 'D', { type: 'raiseTo', amount: 200 });
  s = act(s, 'E', { type: 'call' });
  assert.notEqual(legalActions(s, 'A').raiseTo, undefined, 'A faces cumulative +100 and reopens');
  s = act(s, 'A', { type: 'call' });
  assert.equal(s.actorId, 'C'); assert.equal(legalActions(s).raiseTo, undefined, 'C faces only +75 and stays closed');
  s = act(s, 'C', { type: 'call' }); assert.equal(s.phase, 'TURN');
  let one = betting('HOLD_EM_NO_LIMIT', [1000, 125, 1000]);
  one = act(one, 'A', { type: 'betTo', amount: 100 }); one = act(one, 'B', { type: 'raiseTo', amount: 125 }); one = act(one, 'C', { type: 'call' });
  assert.equal(legalActions(one, 'A').raiseTo, undefined);
  let full = betting('HOLD_EM_NO_LIMIT', [1000, 1000, 1000]);
  full = act(full, 'A', { type: 'betTo', amount: 100 }); full = act(full, 'B', { type: 'raiseTo', amount: 200 }); full = act(full, 'C', { type: 'call' });
  assert.notEqual(legalActions(full, 'A').raiseTo, undefined);
});

test('fixed-limit opening is exact and partial all-ins use documented completion/reopening/cap rules', () => {
  for (const amount of [21, 40, 100]) { const s = betting('FIVE_CARD_DRAW_FIXED_LIMIT', [1000, 1000]); assert.throws(() => act(s, 'A', { type: 'betTo', amount }), /Illegal/); }
  let s = betting('FIVE_CARD_DRAW_FIXED_LIMIT', [5, 1000]); s = act(s, 'A', { type: 'betTo', amount: 5 });
  assert.deepEqual(legalActions(s, 'B').raiseTo, { min: 20, max: 20 }); s = act(s, 'B', { type: 'raiseTo', amount: 20 }); assert.equal(s.fixedRaises, 0);
  s = betting('FIVE_CARD_DRAW_FIXED_LIMIT', [9, 1000]); s = act(s, 'A', { type: 'betTo', amount: 9 }); assert.equal(legalActions(s, 'B').raiseTo!.min, 20);
  s = betting('FIVE_CARD_DRAW_FIXED_LIMIT', [10, 1000]); s = act(s, 'A', { type: 'betTo', amount: 10 }); assert.equal(legalActions(s, 'B').raiseTo!.min, 30);
  s = betting('FIVE_CARD_DRAW_FIXED_LIMIT', [15, 1000]); s = act(s, 'A', { type: 'betTo', amount: 15 }); assert.equal(legalActions(s, 'B').raiseTo!.min, 35);
  s = betting('FIVE_CARD_DRAW_FIXED_LIMIT', [1000, 25, 1000]); s = act(s, 'A', { type: 'betTo', amount: 20 }); s = act(s, 'B', { type: 'raiseTo', amount: 25 });
  assert.equal(s.fixedRaises, 0); assert.equal(legalActions(s, 'C').raiseTo!.min, 40); s = act(s, 'C', { type: 'raiseTo', amount: 40 }); assert.equal(s.fixedRaises, 0);
  let cap = betting('FIVE_CARD_DRAW_FIXED_LIMIT', [1000, 1000, 1000]);
  cap = act(cap, 'A', { type: 'betTo', amount: 20 }); cap = act(cap, 'B', { type: 'raiseTo', amount: 40 }); cap = act(cap, 'C', { type: 'raiseTo', amount: 60 }); cap = act(cap, 'A', { type: 'raiseTo', amount: 80 });
  assert.equal(cap.fixedRaises, 3); assert.equal(legalActions(cap, 'B').raiseTo, undefined); assert.equal(legalActions(cap, 'B').call, true); assert.equal(legalActions(cap, 'B').fold, true);
  const final = betting('FIVE_CARD_DRAW_FIXED_LIMIT', [1000, 1000]); const finalState = Object.freeze({ ...final, phase: 'FINAL_BETTING' as const });
  assert.deepEqual(legalActions(finalState).betTo, { min: 40, max: 40 }); assert.throws(() => act(finalState, 'A', { type: 'betTo', amount: 100 }), /Illegal/);
  let finalCap: GameState = Object.freeze({ ...betting('FIVE_CARD_DRAW_FIXED_LIMIT', [1000, 1000, 1000]), phase: 'FINAL_BETTING' as const });
  finalCap = act(finalCap, 'A', { type: 'betTo', amount: 40 }); finalCap = act(finalCap, 'B', { type: 'raiseTo', amount: 80 }); finalCap = act(finalCap, 'C', { type: 'raiseTo', amount: 120 }); finalCap = act(finalCap, 'A', { type: 'raiseTo', amount: 160 });
  assert.equal(finalCap.fixedRaises, 3); assert.equal(legalActions(finalCap, 'B').raiseTo, undefined);
});

test('actual side-pot settlement covers winner permutations, folded money, ties, odd chips and one-shot settlement', () => {
  const base = (hands: readonly string[][]) => showdown('FIVE_CARD_DRAW_FIXED_LIMIT', [
    { id: 'A', seat: 0, stack: 0, committed: 100, hand: hands[0]! }, { id: 'B', seat: 1, stack: 0, committed: 300, hand: hands[1]! }, { id: 'C', seat: 2, stack: 0, committed: 500, hand: hands[2]! },
  ]);
  let s = settle(base([['Ah', 'Kh', 'Qh', 'Jh', 'Th'], ['Ks', 'Qs', 'Js', 'Ts', '9s'], ['Qc', 'Jc', 'Tc', '9c', '8c']]));
  assert.deepEqual(s.results.map((x) => x.pot.amount), [300, 400]); assert.deepEqual(s.players.map((p) => p.stack), [300, 400, 200]); assertInvariants(s);
  s = settle(base([['Ah', 'Kh', 'Qh', 'Jh', 'Th'], ['2s', '3s', '4s', '5s', '7s'], ['Ks', 'Qs', 'Js', 'Ts', '9s']])); assert.deepEqual(s.players.map((p) => p.stack), [300, 0, 600]);
  s = settle(base([['2h', '3h', '4h', '5h', '7h'], ['Ah', 'Kh', 'Qh', 'Jh', 'Th'], ['Ks', 'Qs', 'Js', 'Ts', '9s']])); assert.deepEqual(s.players.map((p) => p.stack), [0, 700, 200]);
  s = settle(base([['2h', '3h', '4h', '5h', '7h'], ['Ks', 'Qs', 'Js', 'Ts', '9s'], ['Ah', 'Kh', 'Qh', 'Jh', 'Th']])); assert.deepEqual(s.players.map((p) => p.stack), [0, 0, 900]);
  const tied = showdown('FIVE_CARD_DRAW_FIXED_LIMIT', [
    { id: 'A', seat: 0, stack: 0, committed: 5, hand: ['Ah', 'Kh', 'Qh', 'Jh', 'Th'] }, { id: 'B', seat: 1, stack: 0, committed: 5, hand: ['As', 'Ks', 'Qs', 'Js', 'Ts'] }, { id: 'C', seat: 2, stack: 0, committed: 5, hand: ['2c', '3c', '4c', '5c', '7c'] },
  ], [], 0);
  s = settle(tied); assert.deepEqual(s.players.map((p) => p.stack), [7, 8, 0], 'odd chip starts at B, left of button'); assert.throws(() => settle(s), /already applied/);
  const folded = showdown('FIVE_CARD_DRAW_FIXED_LIMIT', [
    { id: 'A', seat: 0, stack: 0, committed: 100, hand: ['Ah', 'Kh', 'Qh', 'Jh', 'Th'] }, { id: 'B', seat: 1, stack: 0, committed: 100, hand: ['Ks', 'Qs', 'Js', 'Ts', '9s'], folded: true }, { id: 'C', seat: 2, stack: 0, committed: 100, hand: ['Qc', 'Jc', 'Tc', '9c', '8c'] },
  ]);
  s = settle(folded); assert.deepEqual(s.players.map((p) => p.stack), [300, 0, 0]);
  const fourLevels = showdown('FIVE_CARD_DRAW_FIXED_LIMIT', [
    { id: 'A', seat: 0, stack: 0, committed: 50, hand: ['Jc', 'Tc', '9c', '8c', '7c'] }, { id: 'B', seat: 1, stack: 0, committed: 100, hand: ['Qd', 'Jd', 'Td', '9d', '8d'] },
    { id: 'C', seat: 2, stack: 0, committed: 200, hand: ['Ah', 'Kh', 'Qh', 'Jh', 'Th'] }, { id: 'D', seat: 3, stack: 0, committed: 300, hand: ['Ks', 'Qs', 'Js', 'Ts', '9s'] },
  ]);
  s = settle(fourLevels); assert.deepEqual(s.results.map((x) => x.pot.amount), [200, 150, 200]); assert.deepEqual(s.players.map((p) => p.stack), [0, 0, 550, 100]); assertInvariants(s);
});

test('all-in runouts from flop, turn and river produce five board cards and no actor', () => {
  const toFlop = () => { let s = startHand(createGame('HOLD_EM_NO_LIMIT', seats([100, 100]), 0)); s = act(s, 'A', { type: 'call' }); return act(s, 'B', { type: 'check' }); };
  let flop = toFlop(); assert.equal(flop.phase, 'FLOP'); flop = act(flop, 'B', { type: 'betTo', amount: 80 }); flop = act(flop, 'A', { type: 'call' }); assert.equal(flop.phase, 'SHOWDOWN'); assert.equal(flop.board.length, 5); assert.equal(flop.actorId, undefined); assertInvariants(settle(flop));
  let turn = toFlop(); turn = act(turn, 'B', { type: 'check' }); turn = act(turn, 'A', { type: 'check' }); assert.equal(turn.phase, 'TURN'); turn = act(turn, 'B', { type: 'betTo', amount: 80 }); turn = act(turn, 'A', { type: 'call' }); assert.equal(turn.phase, 'SHOWDOWN'); assert.equal(turn.board.length, 5); assertInvariants(settle(turn));
  let river = toFlop(); river = act(river, 'B', { type: 'check' }); river = act(river, 'A', { type: 'check' }); river = act(river, 'B', { type: 'check' }); river = act(river, 'A', { type: 'check' }); assert.equal(river.phase, 'RIVER'); river = act(river, 'B', { type: 'betTo', amount: 80 }); river = act(river, 'A', { type: 'call' }); assert.equal(river.phase, 'SHOWDOWN'); assert.equal(river.board.length, 5); assertInvariants(settle(river));
});

test('draw matrix includes all-in ante, turn order, malformed draws and full five-player deck capacity', () => {
  let ante = startHand(createGame('FIVE_CARD_DRAW_FIXED_LIMIT', seats([5, 100]), 0));
  assert.equal(byId(ante, 'A').allIn, true); assert.equal(ante.phase, 'FIRST_BETTING');
  ante = act(ante, 'B', { type: 'check' }); assert.equal(ante.phase, 'DRAW'); assert.equal(ante.actorId, 'B');
  ante = draw(ante, 'B', []); assert.equal(ante.actorId, 'A'); ante = draw(ante, 'A', [0, 1, 2, 3, 4]); assert.equal(ante.phase, 'SHOWDOWN'); assertInvariants(ante); assert.equal(totalStacks(settle(ante)), 105);
  let malformed = startHand(createGame('FIVE_CARD_DRAW_FIXED_LIMIT', seats([1000, 1000]), 0)); malformed = act(malformed, malformed.actorId!, { type: 'check' }); malformed = act(malformed, malformed.actorId!, { type: 'check' });
  assert.throws(() => draw(malformed, malformed.actorId!, [-1]), /Invalid/); assert.throws(() => draw(malformed, malformed.actorId!, [0, 0]), /Invalid/); assert.throws(() => draw(malformed, malformed.actorId!, [5]), /Invalid/);
  let five = startHand(createGame('FIVE_CARD_DRAW_FIXED_LIMIT', seats([1000, 1000, 1000, 1000, 1000]), 0));
  for (let n = 0; n < 5; n += 1) five = act(five, five.actorId!, { type: 'check' });
  assert.equal(five.phase, 'DRAW'); for (let n = 0; n < 5; n += 1) five = draw(five, five.actorId!, [0, 1, 2, 3, 4]);
  assert.equal(five.deck.length, 2); assert.equal(five.discards.length, 25); assert.equal(five.phase, 'FINAL_BETTING'); assertInvariants(five);
});

test('dealer rotation and seating validation respect clockwise physical seats across status changes', () => {
  assert.throws(() => createGame('HOLD_EM_NO_LIMIT', [{ id: 'A', seat: 0 }, { id: 'A', seat: 1 }]), /uniquely/);
  assert.throws(() => createGame('HOLD_EM_NO_LIMIT', [{ id: 'A', seat: 0 }, { id: 'B', seat: 5 }]), /seats 0–4/);
  assert.throws(() => createGame('HOLD_EM_NO_LIMIT', [{ id: 'A', seat: 0.5 }, { id: 'B', seat: 2 }]), /seats 0–4/);
  let s = createGame('HOLD_EM_NO_LIMIT', [{ id: 'A', seat: 0 }, { id: 'C', seat: 2 }, { id: 'D', seat: 3 }, { id: 'E', seat: 4 }], 2);
  s = startHand(s); assert.equal(s.buttonSeat, 2);
  s = Object.freeze({ ...s, phase: 'INTERMISSION' as const, settled: true, actorId: undefined });
  s = setBetweenHandStatus(s, 'C', 'SIT_OUT'); s = startHand(s); assert.equal(s.buttonSeat, 3);
  s = Object.freeze({ ...s, phase: 'INTERMISSION' as const, settled: true, actorId: undefined }); s = setBetweenHandStatus(s, 'E', 'DEPARTED'); s = startHand(s); assert.equal(s.buttonSeat, 0);
  s = Object.freeze({ ...s, phase: 'INTERMISSION' as const, settled: true, actorId: undefined }); s = setBetweenHandStatus(s, 'C', 'ACTIVE'); s = startHand(s); assert.equal(s.buttonSeat, 2, 'heads-up expands to three eligible seats clockwise');
  assert.throws(() => setBetweenHandStatus(startHand(createGame('HOLD_EM_NO_LIMIT', seats([100, 100]))), 'A', 'SIT_OUT'), /between hands/);
});

test('invariants reject conservation and card-accounting corruption', () => {
  const s = startHand(createGame('HOLD_EM_NO_LIMIT', seats([1000, 1000]), 0)); assertInvariants(s);
  const made = Object.freeze({ ...s, players: Object.freeze(s.players.map((p, i) => i === 0 ? Object.freeze({ ...p, stack: p.stack + 1 }) : p)) }); assert.throws(() => assertInvariants(made), /conservation/);
  const lost = Object.freeze({ ...s, players: Object.freeze(s.players.map((p, i) => i === 0 ? Object.freeze({ ...p, stack: p.stack - 1 }) : p)) }); assert.throws(() => assertInvariants(lost), /conservation/);
  const negative = Object.freeze({ ...s, players: Object.freeze(s.players.map((p, i) => i === 0 ? Object.freeze({ ...p, stack: -1 }) : p)) }); assert.throws(() => assertInvariants(negative), /Chip invariant/);
  const duplicateHand = Object.freeze({ ...s, players: Object.freeze(s.players.map((p, i) => i === 1 ? Object.freeze({ ...p, hand: s.players[0]!.hand }) : p)) }); assert.throws(() => assertInvariants(duplicateHand), /Card-location/);
  const duplicateDeck = Object.freeze({ ...s, deck: Object.freeze([s.players[0]!.hand[0]!, ...s.deck]) }); assert.throws(() => assertInvariants(duplicateDeck), /Card-location/);
  const missing = Object.freeze({ ...s, deck: Object.freeze(s.deck.slice(1)) }); assert.throws(() => assertInvariants(missing), /Card-location/);
  let flop = startHand(createGame('HOLD_EM_NO_LIMIT', seats([100, 100]), 0)); flop = act(flop, 'A', { type: 'call' }); flop = act(flop, 'B', { type: 'check' });
  const boardDeck = Object.freeze({ ...flop, deck: Object.freeze([flop.board[0]!, ...flop.deck]) }); assert.throws(() => assertInvariants(boardDeck), /Card-location/);
  let allIn = startHand(createGame('HOLD_EM_NO_LIMIT', seats([20, 20]), 0)); allIn = act(allIn, 'A', { type: 'call' }); const paid = settle(allIn);
  const duplicatePayout = Object.freeze({ ...paid, players: Object.freeze(paid.players.map((p, i) => i === 0 ? Object.freeze({ ...p, stack: p.stack + 1 }) : p)) }); assert.throws(() => assertInvariants(duplicatePayout), /conservation/);
});

test('200 seeded legal hands exercise varied actions and settle with invariants', () => {
  let completed = 0; const actionKinds = new Set<string>();
  for (let seed = 1; seed <= 100; seed += 1) for (const variant of ['HOLD_EM_NO_LIMIT', 'FIVE_CARD_DRAW_FIXED_LIMIT'] as const) {
    let value = seed >>> 0; const random = { nextInt(max: number) { value = (value * 1664525 + 1013904223) >>> 0; return value % max; } };
    let s = startHand(createGame(variant, seats([1000, 200, 80, 40, 20]), seed % 5), random);
    for (let step = 0; step < 160 && s.phase !== 'SHOWDOWN'; step += 1) {
      assertInvariants(s);
      if (s.phase === 'DRAW') { const count = random.nextInt(6); s = draw(s, s.actorId!, Array.from({ length: count }, (_, i) => i)); actionKinds.add(`draw${count}`); continue; }
      const legal = legalActions(s); const choices = (['fold', 'check', 'call', 'betTo', 'raiseTo'] as const).filter((kind) => kind === 'raiseTo' ? legal.raiseTo : kind === 'betTo' ? legal.betTo : legal[kind]);
      const chosen = choices[random.nextInt(choices.length)]!;
      if (chosen === 'raiseTo') s = act(s, s.actorId!, { type: chosen, amount: random.nextInt(2) ? legal.raiseTo!.max : legal.raiseTo!.min });
      else if (chosen === 'betTo') s = act(s, s.actorId!, { type: chosen, amount: random.nextInt(2) ? legal.betTo!.max : legal.betTo!.min });
      else s = act(s, s.actorId!, { type: chosen });
      actionKinds.add(chosen);
    }
    assert.equal(s.phase, 'SHOWDOWN', `seed ${seed}/${variant} exceeded transition limit`); s = settle(s); assertInvariants(s); assert.equal(totalStacks(s), s.tableChipTotal); completed += 1;
  }
  assert.equal(completed, 200); for (const required of ['fold', 'check', 'call', 'betTo', 'raiseTo', 'draw0', 'draw5']) assert.ok(actionKinds.has(required), `missing ${required}`);
});
