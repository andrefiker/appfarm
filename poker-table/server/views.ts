import { legalActions, type GameState } from '../engine/index.js';
import type { BotObservation, PlayerTableView, PublicTableView, PublicSeat } from './protocol.js';

export type SeatOwner = Readonly<{ guestId: string; name: string; bot: boolean; connected: boolean }>;
const cards = (items: readonly { id: string; rank: string; suit: string }[]) => items.map(({ id, rank, suit }) => ({ id, rank, suit }));
export function publicView(tableId: string, version: number, state: GameState, owners: ReadonlyMap<number, SeatOwner>, deadline: number | null, nextVariant: GameState['variant'] | null): PublicTableView {
  const seats: PublicSeat[] = state.players.map((p) => { const o = owners.get(p.seat); return Object.freeze({ seat: p.seat, name: o?.name ?? `Seat ${p.seat + 1}`, stack: p.stack, roundCommitted: p.roundCommitted, dealer: p.seat === state.buttonSeat, folded: p.folded, allIn: p.allIn, connected: o?.connected ?? false, bot: o?.bot ?? false, cards: p.inHand ? p.hand.length : 0 }); });
  return Object.freeze({ protocolVersion: 1, tableId, stateVersion: version, handId: state.handNumber, actorId: state.actorId ?? null, serverTime: Date.now(), deadline, phase: state.phase, variant: state.variant, nextVariant, buttonSeat: state.buttonSeat, actorSeat: state.actorId ? state.players.find((p) => p.id === state.actorId)?.seat ?? null : null, currentBet: state.currentBet, pot: state.players.reduce((n, p) => n + p.totalCommitted, 0), board: cards(state.board), seats: Object.freeze(seats), status: state.actorId ? 'ACTION REQUIRED' : state.phase === 'INTERMISSION' ? 'WAITING FOR NEXT HAND' : state.phase, results: state.results.map((r) => ({ pot: r.pot.amount, winners: r.winners, payouts: r.payouts })) });
}
export function playerView(base: PublicTableView, state: GameState, seat: number | null): PlayerTableView {
  const player = seat === null ? undefined : state.players.find((p) => p.seat === seat);
  return Object.freeze({ ...base, you: Object.freeze({ seat, hand: player ? cards(player.hand) : Object.freeze([]), legalActions: player && state.actorId === player.id ? legalActions(state, player.id) : null }) });
}
export function observation(state: GameState, seat: number): BotObservation {
  const p = state.players.find((x) => x.seat === seat); if (!p || state.actorId !== p.id) throw new Error('Bot observation requires current bot actor');
  return Object.freeze({ ownHand: cards(p.hand), board: cards(state.board), legalActions: legalActions(state, p.id), pot: state.players.reduce((n, x) => n + x.totalCommitted, 0), currentBet: state.currentBet, stack: p.stack, roundCommitted: p.roundCommitted, position: p.seat, history: Object.freeze([...state.history]) });
}
