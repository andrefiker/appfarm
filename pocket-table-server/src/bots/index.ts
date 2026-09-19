import type {
  Card,
  GameState,
  LegalActions,
  RandomSource,
} from '../engine/index.js';
import { legalActions, rankBest, rankFive } from '../engine/index.js';

export type BotLevel = 1 | 2 | 3;
export type BotProfile = 'balanced' | 'tight' | 'loose' | 'aggressive' | 'caller';
export type BotMix = 'balanced' | 'mixed';

export type BotPlayerView = Readonly<{
  id: string;
  seat: number;
  stack: number;
  inHand: boolean;
  folded: boolean;
  allIn: boolean;
  totalCommitted: number;
  roundCommitted: number;
  holeCards?: readonly Card[];
}>;

export type BotState = Readonly<{
  actorId: string;
  variant: GameState['variant'];
  phase: GameState['phase'];
  board: readonly Card[];
  currentBet: number;
  minRaise: number;
  pot: number;
  buttonSeat: number;
  players: readonly BotPlayerView[];
  legal: LegalActions;
}>;

export type BotDecision =
  | Readonly<{
      kind: 'action';
      action: Readonly<{
        type: 'fold' | 'check' | 'call' | 'betTo' | 'raiseTo';
        amount?: number;
      }>;
    }>
  | Readonly<{ kind: 'draw'; indices: readonly number[] }>;

export function profileForSeat(seat: number, mix: BotMix): BotProfile {
  if (mix === 'balanced') return 'balanced';
  const profiles: readonly BotProfile[] = ['tight', 'aggressive', 'loose', 'caller'];
  return profiles[seat % profiles.length]!;
}

export function profileLabel(profile: BotProfile): string {
  return ({
    balanced: 'BAL',
    tight: 'TIGHT',
    loose: 'LOOSE',
    aggressive: 'AGGRO',
    caller: 'CALLER',
  } as const)[profile];
}

export function buildBotState(state: GameState, actorId: string): BotState {
  const actor = state.players.find(p => p.id === actorId);
  if (!actor) throw new Error('Unknown bot actor');
  return Object.freeze({
    actorId,
    variant: state.variant,
    phase: state.phase,
    board: Object.freeze([...state.board]),
    currentBet: state.currentBet,
    minRaise: state.minRaise,
    pot: state.players.reduce((sum, p) => sum + p.totalCommitted, 0),
    buttonSeat: state.buttonSeat,
    players: Object.freeze(
      state.players.map(p =>
        Object.freeze({
          id: p.id,
          seat: p.seat,
          stack: p.stack,
          inHand: p.inHand,
          folded: p.folded,
          allIn: p.allIn,
          totalCommitted: p.totalCommitted,
          roundCommitted: p.roundCommitted,
          holeCards: p.id === actorId ? Object.freeze([...p.hand]) : undefined,
        })
      )
    ),
    legal: legalActions(state, actorId),
  });
}

function assertHiddenInfo(view: BotState): void {
  for (const p of view.players) {
    if (p.id !== view.actorId && p.holeCards && p.holeCards.length > 0) {
      throw new Error('Bot received foreign hole cards');
    }
  }
}

const rankValue: Record<Card['rank'], number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  T: 10, J: 11, Q: 12, K: 13, A: 14,
};

function actorCards(view: BotState): readonly Card[] {
  const cards = view.players.find(p => p.id === view.actorId)?.holeCards;
  if (!cards) throw new Error('Bot has no own cards');
  return cards;
}

function holdemStrength(view: BotState): number {
  const hand = actorCards(view);
  if (view.board.length < 3) {
    const [a, b] = [...hand].sort((x, y) => rankValue[y.rank] - rankValue[x.rank]);
    if (!a || !b) return 0.2;
    const pair = a.rank === b.rank;
    const suited = a.suit === b.suit;
    const gap = Math.abs(rankValue[a.rank] - rankValue[b.rank]);
    let score = (rankValue[a.rank] + rankValue[b.rank]) / 28;
    if (pair) score += 0.28 + rankValue[a.rank] / 70;
    if (suited) score += 0.07;
    if (gap <= 1) score += 0.05;
    if (rankValue[a.rank] >= 12 && rankValue[b.rank] >= 10) score += 0.09;
    return Math.max(0.05, Math.min(0.98, score));
  }
  const ranked = rankBest([...hand, ...view.board]);
  const categoryBase =
    [0.18, 0.38, 0.52, 0.63, 0.72, 0.78, 0.86, 0.94, 0.99][ranked.categoryValue] ?? 0.2;
  return Math.min(0.995, categoryBase + (ranked.rankVector[0] ?? 0) / 180);
}

function drawStrength(view: BotState): number {
  const ranked = rankFive(actorCards(view));
  return [0.16, 0.4, 0.58, 0.7, 0.79, 0.83, 0.9, 0.96, 0.995][ranked.categoryValue] ?? 0.2;
}

function chooseAggressiveTarget(
  view: BotState,
  random: RandomSource
): { type: 'betTo' | 'raiseTo'; amount: number } | undefined {
  const bounds = view.legal.raiseTo ?? view.legal.betTo;
  if (!bounds) return undefined;
  const type = view.legal.raiseTo ? 'raiseTo' : 'betTo';
  if (bounds.min === bounds.max) return { type, amount: bounds.min };
  const actor = view.players.find(p => p.id === view.actorId)!;
  const potTarget = Math.max(
    bounds.min,
    view.currentBet +
      Math.max(
        view.minRaise,
        Math.floor(view.pot * (0.45 + random.nextInt(35) / 100))
      )
  );
  const stackGuard =
    actor.roundCommitted + Math.max(0, Math.floor(actor.stack * 0.72));
  return {
    type,
    amount: Math.min(
      bounds.max,
      Math.max(bounds.min, Math.min(potTarget, stackGuard))
    ),
  };
}

function drawIndices(view: BotState): readonly number[] {
  const cards = actorCards(view);
  const ranked = rankFive(cards);
  if (ranked.categoryValue >= 4 || ranked.category === 'FULL_HOUSE') {
    return Object.freeze([]);
  }
  const counts = new Map<Card['rank'], number>();
  for (const c of cards) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  if (ranked.category === 'FOUR_OF_A_KIND') {
    return Object.freeze(cards.map((c, i) => [c, i] as const).filter(([c]) => counts.get(c.rank) === 1).map(([, i]) => i));
  }
  if (ranked.category === 'THREE_OF_A_KIND') {
    return Object.freeze(cards.map((c, i) => [c, i] as const).filter(([c]) => counts.get(c.rank) === 1).map(([, i]) => i));
  }
  if (ranked.category === 'TWO_PAIR') {
    return Object.freeze(cards.map((c, i) => [c, i] as const).filter(([c]) => counts.get(c.rank) === 1).map(([, i]) => i));
  }
  if (ranked.category === 'PAIR') {
    return Object.freeze(cards.map((c, i) => [c, i] as const).filter(([c]) => counts.get(c.rank) === 1).map(([, i]) => i));
  }
  const suitCounts = new Map<Card['suit'], number>();
  for (const c of cards) suitCounts.set(c.suit, (suitCounts.get(c.suit) ?? 0) + 1);
  const fourFlush = [...suitCounts.entries()].find(([, n]) => n === 4)?.[0];
  if (fourFlush) {
    return Object.freeze(cards.map((c, i) => [c, i] as const).filter(([c]) => c.suit !== fourFlush).map(([, i]) => i));
  }
  const ordered = cards.map((c, i) => ({ i, v: rankValue[c.rank] })).sort((a, b) => b.v - a.v);
  return Object.freeze(ordered.slice(2).map(x => x.i).sort((a, b) => a - b));
}

function randomLegalDecision(view: BotState, random: RandomSource): BotDecision {
  const choices: Array<BotDecision> = [];
  if (view.legal.check) choices.push(Object.freeze({ kind: 'action', action: Object.freeze({ type: 'check' as const }) }));
  if (view.legal.call) choices.push(Object.freeze({ kind: 'action', action: Object.freeze({ type: 'call' as const }) }));
  if (view.legal.fold) choices.push(Object.freeze({ kind: 'action', action: Object.freeze({ type: 'fold' as const }) }));
  const aggressive = chooseAggressiveTarget(view, random);
  if (aggressive) choices.push(Object.freeze({ kind: 'action', action: Object.freeze(aggressive) }));
  if (!choices.length) throw new Error('Bot found no legal decision');
  return choices[random.nextInt(choices.length)]!;
}

export function decide(
  view: BotState,
  random: RandomSource,
  level: BotLevel = 2,
  profile: BotProfile = 'balanced'
): BotDecision {
  assertHiddenInfo(view);

  if (view.phase === 'DRAW') {
    if (level === 1 && random.nextInt(100) < 28) {
      const count = random.nextInt(6);
      const pool = [0, 1, 2, 3, 4];
      const picked: number[] = [];
      while (picked.length < count) {
        const at = random.nextInt(pool.length);
        picked.push(pool.splice(at, 1)[0]!);
      }
      return Object.freeze({ kind: 'draw', indices: Object.freeze(picked.sort((a, b) => a - b)) });
    }
    return Object.freeze({ kind: 'draw', indices: drawIndices(view) });
  }

  if (level === 1 && random.nextInt(100) < 36) {
    return randomLegalDecision(view, random);
  }

  const strength =
    view.variant === 'HOLD_EM_NO_LIMIT'
      ? holdemStrength(view)
      : drawStrength(view);
  const noise = random.nextInt(100) / 100;

  const levelCall = level === 3 ? 0.29 : 0.36;
  const levelAggro = level === 3 ? 0.67 : 0.76;
  const callShift =
    profile === 'tight' ? 0.11 :
    profile === 'loose' ? -0.12 :
    profile === 'caller' ? -0.17 :
    profile === 'aggressive' ? -0.04 : 0;
  const aggroShift =
    profile === 'tight' ? 0.09 :
    profile === 'aggressive' ? -0.15 :
    profile === 'caller' ? 0.14 :
    profile === 'loose' ? -0.04 : 0;

  const aggressive = chooseAggressiveTarget(view, random);
  if (
    aggressive &&
    (strength > levelAggro + aggroShift ||
      (strength > 0.58 + aggroShift && noise > (level === 3 ? 0.58 : 0.69)))
  ) {
    return Object.freeze({ kind: 'action', action: Object.freeze(aggressive) });
  }

  if (view.legal.check) {
    return Object.freeze({ kind: 'action', action: Object.freeze({ type: 'check' as const }) });
  }
  if (
    view.legal.call &&
    (strength > levelCall + callShift ||
      noise > (level === 3 ? 0.9 : 0.78))
  ) {
    return Object.freeze({ kind: 'action', action: Object.freeze({ type: 'call' as const }) });
  }
  if (view.legal.fold) {
    return Object.freeze({ kind: 'action', action: Object.freeze({ type: 'fold' as const }) });
  }
  if (view.legal.call) {
    return Object.freeze({ kind: 'action', action: Object.freeze({ type: 'call' as const }) });
  }
  throw new Error('Bot found no legal decision');
}
