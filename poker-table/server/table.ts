import { act, assertInvariants, createGame, draw, legalActions, settle, startHand, type Action, type GameState, type Variant } from '../engine/index.js';
import { decideBot } from './bot.js';
import { observation, publicView, playerView, type SeatOwner } from './views.js';
import type { Command, PlayerTableView } from './protocol.js';
import type { Store, StoredTable } from './store.js';

type Owner = SeatOwner & { style?: 'cautious' | 'balanced' | 'aggressive'; leaving?: boolean };
type OwnerState = Record<string, Owner>;
const ownersOf = (raw: Record<string, unknown>) => raw as OwnerState;
const betweenHands = (state: GameState) => state.phase === 'WAITING' || state.phase === 'INTERMISSION';
const occupied = (owners: OwnerState) => Object.entries(owners).filter(([, owner]) => !owner.leaving && !owner.sitOut);

/** Rebuilds only the lobby roster. It is never called during an active hand. */
function lobbyState(state: GameState, owners: OwnerState, variant: Variant): GameState {
  const previous = new Map(state.players.map((player) => [player.id, player]));
  const seats = occupied(owners).map(([seat, owner]) => ({ id: owner.guestId, seat: Number(seat), stack: previous.get(owner.guestId)?.stack ?? 1000 }));
  if (seats.length < 2) return state;
  const rebuilt = createGame(variant, seats, state.buttonSeat);
  return Object.freeze({ ...rebuilt, handNumber: state.handNumber, buttonSeat: state.buttonSeat });
}
function normalizedOwners(owners: OwnerState): OwnerState { return Object.fromEntries(Object.entries(owners).filter(([, owner]) => !owner.leaving).map(([seat, owner]) => [seat, { ...owner, pending: false }])) as OwnerState; }

export class TableService {
  constructor(private readonly store: Store, readonly tableId = 'main') {}
  async initialize(): Promise<void> { await this.store.transaction(async (client) => { if (await this.store.loadForUpdate(client, this.tableId)) return; const state = createGame('HOLD_EM_NO_LIMIT', [{ id: 'lobby-0', seat: 0 }, { id: 'lobby-1', seat: 1 }]); await client.query('insert into poker_tables(id,version,state,owners) values($1,0,$2,$3)', [this.tableId, JSON.stringify(state), JSON.stringify({})]); }); }
  private view(table: StoredTable, guestId: string | null): PlayerTableView { const entries = new Map<number, SeatOwner>(); for (const [seat, owner] of Object.entries(ownersOf(table.owners))) entries.set(Number(seat), owner); const ownSeat = Object.entries(ownersOf(table.owners)).find(([, owner]) => owner.guestId === guestId)?.[0]; const base = publicView(table.id, table.version, table.state, entries, table.deadline, table.nextVariant as Variant | null); return playerView(base, table.state, ownSeat === undefined ? null : Number(ownSeat)); }
  async snapshot(guestId: string | null): Promise<PlayerTableView> { await this.advanceDue(); return this.store.transaction(async (client) => { const table = await this.store.loadForUpdate(client, this.tableId); if (!table) throw new Error('missing_table'); return this.view(table, guestId); }); }
  private deadline(state: GameState, owners: OwnerState, now = Date.now()): number | null { if (!state.actorId) return null; const actor = state.players.find((player) => player.id === state.actorId); return now + (actor && owners[String(actor.seat)]?.bot ? 1_000 : 30_000); }
  private finalize(state: GameState, table: StoredTable, owners: OwnerState): StoredTable { assertInvariants(state); return { ...table, version: table.version + 1, state, owners, deadline: this.deadline(state, owners) }; }
  private apply(state: GameState, playerId: string, type: 'action' | 'draw', action?: Action, indexes?: readonly number[]): GameState { let next = type === 'draw' ? draw(state, playerId, indexes ?? []) : act(state, playerId, action!); if (next.phase === 'SHOWDOWN') next = settle(next); return next; }
  async command(guestId: string, command: Command): Promise<PlayerTableView> { if (command.protocolVersion !== 1 || command.tableId !== this.tableId || !command.actionId) throw new Error('invalid_protocol'); return this.store.transaction(async (client) => { const table = await this.store.loadForUpdate(client, this.tableId); if (!table) throw new Error('missing_table'); if (command.type === 'sync') return this.view(table, guestId); const duplicate = await this.store.receipt(client, table.id, command.actionId); if (duplicate) return duplicate as PlayerTableView; if (command.expectedVersion !== table.version) throw new Error('stale_command'); const owners = ownersOf(table.owners); let state = table.state; let nextVariant = table.nextVariant; const ownSeat = Object.entries(owners).find(([, owner]) => owner.guestId === guestId)?.[0];
    if (command.type === 'sit' || command.type === 'bot') { if (command.seat === undefined || !Number.isInteger(command.seat) || command.seat < 0 || command.seat > 4 || owners[String(command.seat)]) throw new Error('seat_unavailable'); owners[String(command.seat)] = command.type === 'bot' ? { guestId: `bot-${command.seat}`, name: `Pat ${command.seat + 1}`, bot: true, connected: true, style: command.botStyle ?? 'balanced', pending: !betweenHands(state) } : { guestId, name: `Guest ${guestId.slice(0, 4)}`, bot: false, connected: true, pending: !betweenHands(state) }; }
    else if (command.type === 'leave' || command.type === 'sitOut') { if (ownSeat === undefined) throw new Error('not_seated'); owners[ownSeat] = { ...owners[ownSeat]!, ...(command.type === 'leave' ? { leaving: true } : { sitOut: true }) }; }
    // Queuing is safe during a hand: it only changes the variant selected by
    // the following startIfReady() call and never changes active-hand rules.
    else if (command.type === 'queueVariant') { if (ownSeat === undefined || !command.variant) throw new Error('variant_not_allowed'); nextVariant = command.variant; }
    else { if (ownSeat === undefined) throw new Error('not_seated'); const player = state.players.find((candidate) => candidate.seat === Number(ownSeat)); if (!player || state.actorId !== player.id) throw new Error('not_your_turn'); if (command.handId !== state.handNumber || command.turnId !== `${state.handNumber}:${state.actorId}`) throw new Error('stale_turn'); state = this.apply(state, player.id, command.type, command.action, command.indexes); }
    const updated = this.finalize(state, { ...table, nextVariant }, owners); if (updated.state.settled) await this.store.saveResult(client, updated.id, updated.state.handNumber, updated.state.results); const response = this.view(updated, guestId); await this.store.save(client, updated); await this.store.saveReceipt(client, table.id, command.actionId, updated.version, response); return response;
  }); }
  async startIfReady(): Promise<void> { await this.store.transaction(async (client) => { const table = await this.store.loadForUpdate(client, this.tableId); if (!table || !betweenHands(table.state)) return; const owners = normalizedOwners(ownersOf(table.owners)); const seats = occupied(owners); if (seats.length < 2 || !seats.some(([, owner]) => !owner.bot)) return; const variant = (table.nextVariant as Variant | null) ?? table.state.variant; const state = startHand(lobbyState(table.state, owners, variant)); await this.store.save(client, this.finalize(state, { ...table, nextVariant: null }, owners)); }); }
  /** Applies one due bot action or rules-defined human timeout; safe during process recovery. */
  async advanceDue(now = Date.now()): Promise<void> { await this.store.transaction(async (client) => { const table = await this.store.loadForUpdate(client, this.tableId); if (!table || !table.deadline || table.deadline > now || !table.state.actorId) return; const owners = ownersOf(table.owners); const actor = table.state.players.find((player) => player.id === table.state.actorId); if (!actor) return; const owner = owners[String(actor.seat)]; if (!owner) return; let state: GameState;
    if (owner.bot) { if (table.state.phase === 'DRAW') { const counts = new Map(actor.hand.map((card) => [card.rank, actor.hand.filter((other) => other.rank === card.rank).length])); const indexes = actor.hand.flatMap((card, index) => counts.get(card.rank)! >= 2 || ['A', 'K', 'Q', 'J'].includes(card.rank) ? [] : [index]); state = this.apply(table.state, actor.id, 'draw', undefined, indexes); } else state = this.apply(table.state, actor.id, 'action', decideBot(observation(table.state, actor.seat), owner.style ?? 'balanced', { next: () => 0.5 })); }
    else if (table.state.phase === 'DRAW') state = this.apply(table.state, actor.id, 'draw', undefined, []); else { const legal = legalActions(table.state, actor.id); state = this.apply(table.state, actor.id, 'action', legal.check ? { type: 'check' } : { type: 'fold' }); }
    const updated = this.finalize(state, table, owners); if (updated.state.settled) await this.store.saveResult(client, updated.id, updated.state.handNumber, updated.state.results); await this.store.save(client, updated);
  }); }
}
