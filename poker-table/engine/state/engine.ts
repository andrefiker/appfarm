import type { Card, RandomSource } from '../cards/cards.js';
import { shuffle, standardDeck, take } from '../cards/cards.js';
import { compareHands, rankBest, rankFive, type RankedHand } from '../ranking/ranking.js';
import { buildPots, splitPot, type Pot } from '../pots/pots.js';

export type Variant = 'HOLD_EM_NO_LIMIT' | 'FIVE_CARD_DRAW_FIXED_LIMIT';
export type Phase = 'WAITING' | 'PREPARING' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'RUNOUT' | 'FIRST_BETTING' | 'DRAW' | 'FINAL_BETTING' | 'SHOWDOWN' | 'SETTLEMENT' | 'INTERMISSION';
export type PlayerStatus = 'ACTIVE' | 'SIT_OUT' | 'DEPARTED' | 'BUSTED';
export type Action = Readonly<{ type: 'fold' | 'check' | 'call' | 'betTo' | 'raiseTo'; amount?: number }>;
export type Player = Readonly<{ id: string; seat: number; stack: number; status: PlayerStatus; inHand: boolean; folded: boolean; allIn: boolean; totalCommitted: number; roundCommitted: number; hand: readonly Card[]; exchangeCount: number; drew: boolean; seenWager: number | null }>;
export type Rules = Readonly<{ smallBlind: number; bigBlind: number; ante: number; firstUnit: number; finalUnit: number; fixedRaiseCap: number }>;
export type SettlementPot = Readonly<{ pot: Pot; winners: readonly string[]; payouts: Readonly<Record<string, number>>; winningHands: Readonly<Record<string, RankedHand>> }>;
export type GameState = Readonly<{ variant: Variant; phase: Phase; handNumber: number; players: readonly Player[]; buttonSeat: number; actorId: string | undefined; currentBet: number; minRaise: number; fixedRaises: number; completionTarget: number; deck: readonly Card[]; board: readonly Card[]; discards: readonly Card[]; rules: Rules; tableChipTotal: number; settled: boolean; results: readonly SettlementPot[]; history: readonly string[] }>;
export type LegalActions = Readonly<{ fold: boolean; check: boolean; call: boolean; betTo: Readonly<{ min: number; max: number }> | undefined; raiseTo: Readonly<{ min: number; max: number }> | undefined }>;

const holdemRules: Rules = Object.freeze({ smallBlind: 10, bigBlind: 20, ante: 0, firstUnit: 0, finalUnit: 0, fixedRaiseCap: 0 });
const drawRules: Rules = Object.freeze({ smallBlind: 0, bigBlind: 0, ante: 10, firstUnit: 20, finalUnit: 40, fixedRaiseCap: 3 });
const clonePlayer = (p: Player, update: Partial<Player>): Player => Object.freeze({ ...p, ...update, hand: update.hand ? Object.freeze([...update.hand]) : p.hand });
const active = (p: Player) => p.inHand && !p.folded && !p.allIn;
const contenders = (s: GameState) => s.players.filter((p) => p.inHand && !p.folded);
const afterDistance = (from: number, to: number) => ((to - from + 5) % 5) || 5;
const orderAfter = (s: GameState, seat: number) => [...s.players].filter((p) => p.inHand && !p.folded && !p.allIn).sort((a, b) => afterDistance(seat, a.seat) - afterDistance(seat, b.seat));
const drawOrderAfter = (s: GameState, seat: number) => [...s.players].filter((p) => p.inHand && !p.folded).sort((a, b) => afterDistance(seat, a.seat) - afterDistance(seat, b.seat));
const player = (s: GameState, id: string) => { const p = s.players.find((x) => x.id === id); if (!p) throw new Error(`Unknown player ${id}`); return p; };
function validAmount(n: number): boolean { return Number.isSafeInteger(n) && n >= 0; }

export function createGame(variant: Variant, seating: readonly Readonly<{ id: string; seat: number; stack?: number; status?: PlayerStatus }>[], buttonSeat = 0): GameState {
  if (seating.length < 2 || seating.length > 5 || new Set(seating.map((p) => p.id)).size !== seating.length || new Set(seating.map((p) => p.seat)).size !== seating.length || seating.some((p) => !Number.isInteger(p.seat) || p.seat < 0 || p.seat > 4) || !Number.isInteger(buttonSeat) || buttonSeat < 0 || buttonSeat > 4) throw new Error('A table has 2–5 uniquely seated players in seats 0–4');
  const players = seating.map((p) => {
    const stack = p.stack ?? 1000; if (!validAmount(stack)) throw new Error('Invalid stack');
    return Object.freeze({ id: p.id, seat: p.seat, stack, status: p.status ?? 'ACTIVE', inHand: false, folded: false, allIn: false, totalCommitted: 0, roundCommitted: 0, hand: Object.freeze([]), exchangeCount: 0, drew: false, seenWager: null });
  }).sort((a, b) => a.seat - b.seat);
  return Object.freeze({ variant, phase: 'WAITING', handNumber: 0, players: Object.freeze(players), buttonSeat, actorId: undefined, currentBet: 0, minRaise: variant === 'HOLD_EM_NO_LIMIT' ? 20 : 0, fixedRaises: 0, completionTarget: 0, deck: standardDeck(), board: Object.freeze([]), discards: Object.freeze([]), rules: variant === 'HOLD_EM_NO_LIMIT' ? holdemRules : drawRules, tableChipTotal: players.reduce((total, p) => total + p.stack, 0), settled: false, results: Object.freeze([]), history: Object.freeze([]) });
}

/** Narrow between-hand status operation. It deliberately cannot alter cards, chips, or an in-progress hand. */
export function setBetweenHandStatus(input: GameState, id: string, status: PlayerStatus): GameState {
  if (input.phase !== 'WAITING' && input.phase !== 'INTERMISSION') throw new Error('Player status can change only between hands');
  const existing = player(input, id);
  return Object.freeze({ ...input, players: replace(input, clonePlayer(existing, { status })) });
}
function commit(p: Player, targetTotal: number, roundTarget?: number): Player {
  if (!validAmount(targetTotal) || targetTotal < p.totalCommitted) throw new Error('Invalid commitment');
  const cost = targetTotal - p.totalCommitted; if (cost > p.stack) throw new Error('Insufficient stack');
  const stack = p.stack - cost;
  return clonePlayer(p, { stack, totalCommitted: targetTotal, roundCommitted: roundTarget ?? p.roundCommitted + cost, allIn: stack === 0 });
}
function replace(s: GameState, changed: Player): readonly Player[] { return Object.freeze(s.players.map((p) => p.id === changed.id ? changed : p)); }
function nextActor(s: GameState, afterSeat: number): string | undefined { return orderAfter(s, afterSeat)[0]?.id; }
function roundComplete(s: GameState): boolean {
  const ps = s.players.filter((p) => active(p));
  return ps.every((p) => p.roundCommitted === s.currentBet && p.seenWager === s.currentBet);
}
function withActor(s: GameState, actorId: string | undefined): GameState { return Object.freeze({ ...s, actorId }); }
function finishOrNext(s: GameState, afterSeat: number): GameState {
  if (contenders(s).length <= 1) return Object.freeze({ ...s, phase: 'SHOWDOWN', actorId: undefined });
  if (roundComplete(s)) return advance(s);
  const actorId = nextActor(s, afterSeat); if (!actorId) return advance(s);
  return withActor(s, actorId);
}
function resetRound(s: GameState, phase: Phase, actorAfterSeat: number): GameState {
  const players = Object.freeze(s.players.map((p) => clonePlayer(p, { roundCommitted: 0, seenWager: null })));
  const base = Object.freeze({ ...s, phase, players, currentBet: 0, minRaise: s.variant === 'HOLD_EM_NO_LIMIT' ? s.rules.bigBlind : 0, fixedRaises: 0, completionTarget: 0 });
  /* With at most one player able to wager, any further betting would be a dry side pot. */
  if (base.players.filter(active).length < 2) return advance(base);
  const actorId = nextActor(base, actorAfterSeat);
  return actorId ? withActor(base, actorId) : advance(base);
}
function advance(s: GameState): GameState {
  if (s.variant === 'FIVE_CARD_DRAW_FIXED_LIMIT') {
    if (s.phase === 'FIRST_BETTING') return Object.freeze({ ...s, phase: 'DRAW', actorId: drawOrderAfter(s, s.buttonSeat)[0]?.id, currentBet: 0 });
    if (s.phase === 'FINAL_BETTING') return Object.freeze({ ...s, phase: 'SHOWDOWN', actorId: undefined });
    return s;
  }
  if (s.phase === 'PREFLOP') { const [deck, cards] = take(s.deck, 3); return resetRound(Object.freeze({ ...s, deck, board: Object.freeze([...s.board, ...cards]) }), 'FLOP', s.buttonSeat); }
  if (s.phase === 'FLOP') { const [deck, cards] = take(s.deck, 1); return resetRound(Object.freeze({ ...s, deck, board: Object.freeze([...s.board, ...cards]) }), 'TURN', s.buttonSeat); }
  if (s.phase === 'TURN') { const [deck, cards] = take(s.deck, 1); return resetRound(Object.freeze({ ...s, deck, board: Object.freeze([...s.board, ...cards]) }), 'RIVER', s.buttonSeat); }
  if (s.phase === 'RIVER') return Object.freeze({ ...s, phase: 'SHOWDOWN', actorId: undefined });
  return s;
}
export function startHand(input: GameState, random?: RandomSource): GameState {
  if (input.phase !== 'WAITING' && input.phase !== 'INTERMISSION') throw new Error('Hand cannot start now');
  const eligible = input.players.filter((p) => p.status === 'ACTIVE' && p.stack > 0);
  if (eligible.length < 2) throw new Error('At least two eligible players are required');
  const sorted = [...eligible].sort((a, b) => a.seat - b.seat);
  const currentButton = sorted.find((p) => p.seat === input.buttonSeat);
  const button = input.handNumber === 0 && currentButton ? currentButton : sorted.find((p) => p.seat > input.buttonSeat) ?? sorted[0]!;
  const deck = shuffle(standardDeck(), random);
  let state: GameState = Object.freeze({ ...input, handNumber: input.handNumber + 1, buttonSeat: button.seat, deck, board: Object.freeze([]), discards: Object.freeze([]), currentBet: 0, minRaise: input.variant === 'HOLD_EM_NO_LIMIT' ? input.rules.bigBlind : 0, fixedRaises: 0, completionTarget: 0, settled: false, results: Object.freeze([]), history: Object.freeze([]), players: Object.freeze(input.players.map((p) => clonePlayer(p, { inHand: eligible.some((e) => e.id === p.id), folded: false, allIn: false, totalCommitted: 0, roundCommitted: 0, hand: Object.freeze([]), exchangeCount: 0, drew: false, seenWager: null }))), phase: 'PREPARING', actorId: undefined });
  for (const p of state.players.filter((p) => p.inHand)) { const [d, cards] = take(state.deck, input.variant === 'HOLD_EM_NO_LIMIT' ? 2 : 5); state = Object.freeze({ ...state, deck: d, players: replace(state, clonePlayer(p, { hand: cards })) }); }
  if (input.variant === 'FIVE_CARD_DRAW_FIXED_LIMIT') {
    for (const p of state.players.filter((p) => p.inHand)) { const paid = Math.min(p.stack, state.rules.ante); state = Object.freeze({ ...state, players: replace(state, commit(player(state, p.id), paid, 0)) }); }
    return finishOrNext(Object.freeze({ ...state, phase: 'FIRST_BETTING' }), state.buttonSeat);
  }
  const handPlayers = state.players.filter((p) => p.inHand).sort((a, b) => a.seat - b.seat);
  const bi = handPlayers.findIndex((p) => p.seat === state.buttonSeat);
  const headsUp = handPlayers.length === 2;
  const sb = headsUp ? handPlayers[bi]! : handPlayers[(bi + 1) % handPlayers.length]!;
  const bb = handPlayers[(handPlayers.indexOf(sb) + 1) % handPlayers.length]!;
  state = Object.freeze({ ...state, players: replace(state, commit(player(state, sb.id), Math.min(sb.stack, state.rules.smallBlind), Math.min(sb.stack, state.rules.smallBlind))) });
  state = Object.freeze({ ...state, players: replace(state, commit(player(state, bb.id), Math.min(bb.stack, state.rules.bigBlind), Math.min(bb.stack, state.rules.bigBlind))), currentBet: state.rules.bigBlind });
  const first = headsUp && active(sb) ? sb.id : nextActor(state, bb.seat);
  return first ? Object.freeze({ ...state, phase: 'PREFLOP', actorId: first }) : finishOrNext(Object.freeze({ ...state, phase: 'PREFLOP' }), bb.seat);
}
function fixedUnit(s: GameState): number { return s.phase === 'FINAL_BETTING' ? s.rules.finalUnit : s.rules.firstUnit; }
function openingTarget(s: GameState): number { return s.variant === 'HOLD_EM_NO_LIMIT' ? s.rules.bigBlind : fixedUnit(s); }
function raiseTarget(s: GameState): number {
  if (s.completionTarget > 0) return s.completionTarget;
  /* An incomplete opening is completed to the table unit, never "short bet + unit". */
  if (s.variant === 'HOLD_EM_NO_LIMIT' && s.currentBet < openingTarget(s)) return openingTarget(s);
  return s.currentBet + (s.variant === 'HOLD_EM_NO_LIMIT' ? s.minRaise : fixedUnit(s));
}
export function legalActions(s: GameState, id = s.actorId): LegalActions {
  if (!id || s.actorId !== id || !['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'FIRST_BETTING', 'FINAL_BETTING'].includes(s.phase)) return Object.freeze({ fold: false, check: false, call: false, betTo: undefined, raiseTo: undefined });
  const p = player(s, id); if (!active(p)) return Object.freeze({ fold: false, check: false, call: false, betTo: undefined, raiseTo: undefined });
  const call = s.currentBet - p.roundCommitted; const max = p.roundCommitted + p.stack;
  const canRaise = p.seenWager === null || s.currentBet - p.seenWager >= (s.variant === 'HOLD_EM_NO_LIMIT' ? s.minRaise : Math.ceil(fixedUnit(s) / 2));
  if (call === 0) {
    if (s.currentBet === 0) { const min = s.variant === 'HOLD_EM_NO_LIMIT' ? Math.min(s.minRaise, max) : Math.min(fixedUnit(s), max); const betMax = s.variant === 'FIVE_CARD_DRAW_FIXED_LIMIT' ? min : max; return Object.freeze({ fold: true, check: true, call: false, betTo: max > 0 ? Object.freeze({ min, max: betMax }) : undefined, raiseTo: undefined }); }
    const min = raiseTarget(s);
    const allowed = max > s.currentBet && (s.completionTarget > 0 || (canRaise && (s.variant !== 'FIVE_CARD_DRAW_FIXED_LIMIT' || s.fixedRaises < s.rules.fixedRaiseCap)));
    return Object.freeze({ fold: true, check: true, call: false, betTo: undefined, raiseTo: allowed ? Object.freeze({ min: Math.min(min, max), max: s.variant === 'FIVE_CARD_DRAW_FIXED_LIMIT' ? Math.min(min, max) : max }) : undefined });
  }
  const min = raiseTarget(s);
  const allowed = max > s.currentBet && (s.completionTarget > 0 || (canRaise && (s.variant !== 'FIVE_CARD_DRAW_FIXED_LIMIT' || s.fixedRaises < s.rules.fixedRaiseCap)));
  return Object.freeze({ fold: true, check: false, call: call > 0 && p.stack > 0, betTo: undefined, raiseTo: allowed ? Object.freeze({ min: Math.min(min, max), max: s.variant === 'FIVE_CARD_DRAW_FIXED_LIMIT' ? Math.min(min, max) : max }) : undefined });
}
export function act(input: GameState, id: string, action: Action): GameState {
  const legal = legalActions(input, id); if (input.actorId !== id) throw new Error('Wrong turn');
  const p = player(input, id); const call = input.currentBet - p.roundCommitted;
  let s = input; let changed = p;
  if (action.type === 'fold') { if (!legal.fold) throw new Error('Illegal fold'); changed = clonePlayer(p, { folded: true, seenWager: input.currentBet }); }
  else if (action.type === 'check') { if (!legal.check) throw new Error('Illegal check'); changed = clonePlayer(p, { seenWager: input.currentBet }); }
  else if (action.type === 'call') { if (!legal.call) throw new Error('Illegal call'); const paid = Math.min(call, p.stack); changed = commit(p, p.totalCommitted + paid, p.roundCommitted + paid); changed = clonePlayer(changed, { seenWager: input.currentBet }); }
  else {
    const bounds = action.type === 'betTo' ? legal.betTo : legal.raiseTo; const target = action.amount;
    if (!bounds || target === undefined || !Number.isSafeInteger(target) || target < bounds.min || target > bounds.max) throw new Error('Illegal bet amount');
    if (action.type === 'betTo' && input.currentBet !== 0) throw new Error('Cannot bet into a wager');
    if (action.type === 'raiseTo' && input.currentBet === 0) throw new Error('Cannot raise without a wager');
    const increase = target - input.currentBet; const max = p.roundCommitted + p.stack;
    const allIn = target === max;
    const minimum = input.variant === 'HOLD_EM_NO_LIMIT' ? input.minRaise : fixedUnit(input);
    const completion = target === raiseTarget(input) && (input.completionTarget > 0 || input.currentBet < openingTarget(input));
    if (increase < minimum && !allIn && !completion) throw new Error('Subminimum non-all-in raise');
    changed = commit(p, p.totalCommitted + (target - p.roundCommitted), target); changed = clonePlayer(changed, { seenWager: target });
    const full = increase >= minimum && !completion;
    const qualifyingFixed = input.variant === 'FIVE_CARD_DRAW_FIXED_LIMIT' && action.type === 'raiseTo' && !completion && increase >= Math.ceil(fixedUnit(input) / 2);
    const half = Math.ceil(fixedUnit(input) / 2);
    const incompleteFixed = input.variant === 'FIVE_CARD_DRAW_FIXED_LIMIT' && !completion && ((input.currentBet === 0 && target < half) || (input.currentBet > 0 && increase < half));
    const nextCompletion = incompleteFixed ? (input.currentBet === 0 ? fixedUnit(input) : input.currentBet + fixedUnit(input)) : 0;
    s = Object.freeze({ ...s, currentBet: target, minRaise: input.variant === 'HOLD_EM_NO_LIMIT' && full ? increase : input.minRaise, fixedRaises: input.variant === 'FIVE_CARD_DRAW_FIXED_LIMIT' && qualifyingFixed ? input.fixedRaises + 1 : input.fixedRaises, completionTarget: nextCompletion });
  }
  s = Object.freeze({ ...s, players: replace(s, changed), history: Object.freeze([...s.history, `${id}:${action.type}`]) });
  return finishOrNext(s, changed.seat);
}
export function draw(input: GameState, id: string, indexes: readonly number[]): GameState {
  if (input.phase !== 'DRAW' || input.actorId !== id) throw new Error('Not this player’s draw turn');
  if (new Set(indexes).size !== indexes.length || indexes.length > 5 || indexes.some((n) => !Number.isInteger(n) || n < 0 || n > 4)) throw new Error('Invalid draw positions');
  const p = player(input, id); if (p.folded || !p.inHand || p.drew) throw new Error('Player cannot draw');
  let s = input; let changed = p;
  if (indexes.length) { const [deck, replacements] = take(s.deck, indexes.length); const hand = [...p.hand]; indexes.forEach((at, i) => { hand[at] = replacements[i]!; }); changed = clonePlayer(p, { hand: Object.freeze(hand), exchangeCount: indexes.length, drew: true }); s = Object.freeze({ ...s, deck, discards: Object.freeze([...s.discards, ...indexes.map((i) => p.hand[i]!)]) }); }
  else changed = clonePlayer(p, { exchangeCount: 0, drew: true });
  s = Object.freeze({ ...s, players: replace(s, changed), history: Object.freeze([...s.history, `${id}:draw${indexes.length}`]) });
  const next = drawOrderAfter(s, changed.seat).find((x) => !x.drew)?.id;
  if (!next) return resetRound(Object.freeze({ ...s, phase: 'FINAL_BETTING' }), 'FINAL_BETTING', s.buttonSeat);
  return withActor(s, next);
}
export function settle(input: GameState): GameState {
  if (input.settled) throw new Error('Settlement already applied');
  if (input.phase !== 'SHOWDOWN') throw new Error('Settlement requires showdown');
  const alive = contenders(input); if (!alive.length) throw new Error('No winner');
  /* Once every opponent folded, contribution layers no longer define eligibility: the
     sole live hand takes the entire committed pot without any hand exposure. */
  if (alive.length === 1) {
    const winner = alive[0]!;
    const amount = input.players.filter((p) => p.inHand).reduce((total, p) => total + p.totalCommitted, 0);
    const players = Object.freeze(input.players.map((p) => clonePlayer(p, { stack: p.stack + (p.id === winner.id ? amount : 0) })));
    const pot: Pot = Object.freeze({ amount, eligibleIds: Object.freeze([winner.id]), contributorIds: Object.freeze(input.players.filter((p) => p.inHand && p.totalCommitted > 0).map((p) => p.id)) });
    const result: SettlementPot = Object.freeze({ pot, winners: Object.freeze([winner.id]), payouts: Object.freeze({ [winner.id]: amount }), winningHands: Object.freeze({}) });
    return Object.freeze({ ...input, players, phase: 'INTERMISSION', actorId: undefined, settled: true, results: Object.freeze([result]) });
  }
  const { pots, returned } = buildPots(input.players.filter((p) => p.inHand).map((p) => ({ playerId: p.id, amount: p.totalCommitted, folded: p.folded })));
  let players = input.players.map((p) => clonePlayer(p, { stack: p.stack + (returned[p.id] ?? 0) })); const results: SettlementPot[] = [];
  const clockwise = [...input.players].sort((a, b) => afterDistance(input.buttonSeat, a.seat) - afterDistance(input.buttonSeat, b.seat)).map((p) => p.id);
  for (const pot of pots) {
    const eligible = alive.filter((p) => pot.eligibleIds.includes(p.id));
    if (eligible.length === 1) {
      const winner = eligible[0]!; const payouts = Object.freeze({ [winner.id]: pot.amount });
      players = players.map((p) => clonePlayer(p, { stack: p.stack + (p.id === winner.id ? pot.amount : 0) }));
      results.push(Object.freeze({ pot, winners: Object.freeze([winner.id]), payouts, winningHands: Object.freeze({}) }));
      continue;
    }
    const hands = Object.fromEntries(eligible.map((p) => [p.id, input.variant === 'HOLD_EM_NO_LIMIT' ? rankBest([...p.hand, ...input.board]) : rankFive(p.hand)])) as Record<string, RankedHand>;
    const best = eligible.reduce((a, b) => compareHands(hands[a.id]!, hands[b.id]!) >= 0 ? a : b);
    const winners = eligible.filter((p) => compareHands(hands[p.id]!, hands[best.id]!) === 0).map((p) => p.id);
    const payouts = splitPot(pot.amount, winners, clockwise); players = players.map((p) => clonePlayer(p, { stack: p.stack + (payouts[p.id] ?? 0) })); results.push(Object.freeze({ pot, winners: Object.freeze(winners), payouts, winningHands: Object.freeze(hands) }));
  }
  return Object.freeze({ ...input, players: Object.freeze(players), phase: 'INTERMISSION', actorId: undefined, settled: true, results: Object.freeze(results) });
}
export function assertInvariants(s: GameState): void {
  if (s.players.some((p) => !validAmount(p.stack) || !validAmount(p.totalCommitted) || !validAmount(p.roundCommitted) || p.roundCommitted > p.totalCommitted)) throw new Error('Chip invariant failed');
  const cards = [...s.deck, ...s.board, ...s.discards, ...s.players.flatMap((p) => p.hand)];
  if (new Set(cards.map((c) => c.id)).size !== cards.length || cards.length !== 52) throw new Error('Card-location invariant failed');
  if (s.actorId) {
    const actor = s.players.find((p) => p.id === s.actorId);
    const validActor = s.phase === 'DRAW' ? Boolean(actor && actor.inHand && !actor.folded && !actor.drew) : Boolean(actor && active(actor));
    if (!validActor) throw new Error('Actor invariant failed');
  }
  if (!validAmount(s.tableChipTotal)) throw new Error('Invalid table chip total');
  const stacks = s.players.reduce((total, p) => total + p.stack, 0);
  const committed = s.players.reduce((total, p) => total + p.totalCommitted, 0);
  if (s.settled ? stacks !== s.tableChipTotal : stacks + committed !== s.tableChipTotal) throw new Error('Chip conservation invariant failed');
  if (s.settled && s.phase !== 'INTERMISSION') throw new Error('Settled-state invariant failed');
}
