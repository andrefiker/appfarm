import type { Action } from '../engine/index.js';
import type { BotObservation, BotStyle } from './protocol.js';

export type BotRandom = Readonly<{ next(): number }>;
export function decideBot(observation: BotObservation, style: BotStyle, random: BotRandom): Action {
  const l = observation.legalActions; const pressure = observation.currentBet - observation.roundCommitted;
  if (l.check && random.next() > (style === 'aggressive' ? .35 : .15)) return { type: 'check' };
  if (l.betTo && style === 'aggressive' && random.next() > .35) return { type: 'betTo', amount: l.betTo.max };
  if (l.raiseTo && style !== 'cautious' && random.next() > (style === 'aggressive' ? .22 : .58)) return { type: 'raiseTo', amount: style === 'aggressive' ? l.raiseTo.max : l.raiseTo.min };
  if (l.call && (pressure <= Math.max(20, observation.stack / 4) || style === 'aggressive')) return { type: 'call' };
  if (l.check) return { type: 'check' }; if (l.call) return { type: 'call' }; return { type: 'fold' };
}
