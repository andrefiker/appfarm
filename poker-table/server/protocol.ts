import type { Action, GameState, LegalActions, Variant } from '../engine/index.js';

export const PROTOCOL_VERSION = 1;
export type Command = Readonly<{ protocolVersion: number; tableId: string; actionId: string; expectedVersion: number; handId?: number; turnId?: string; type: 'action' | 'draw' | 'sit' | 'bot' | 'queueVariant' | 'sync'; action?: Action; indexes?: readonly number[]; seat?: number; variant?: Variant; botStyle?: BotStyle }>;
export type BotStyle = 'cautious' | 'balanced' | 'aggressive';
export type PublicSeat = Readonly<{ seat: number; name: string; stack: number; roundCommitted: number; dealer: boolean; folded: boolean; allIn: boolean; connected: boolean; bot: boolean; cards: number }>;
export type PublicTableView = Readonly<{ protocolVersion: number; tableId: string; stateVersion: number; handId: number; actorId: string | null; serverTime: number; deadline: number | null; phase: GameState['phase']; variant: Variant; nextVariant: Variant | null; buttonSeat: number; actorSeat: number | null; currentBet: number; pot: number; board: readonly { id: string; rank: string; suit: string }[]; seats: readonly PublicSeat[]; status: string; results: readonly unknown[] }>;
export type PlayerTableView = Readonly<PublicTableView & { you: Readonly<{ seat: number | null; hand: readonly { id: string; rank: string; suit: string }[]; legalActions: LegalActions | null }> }>;
export type BotObservation = Readonly<{ ownHand: readonly { id: string; rank: string; suit: string }[]; board: readonly { id: string; rank: string; suit: string }[]; legalActions: LegalActions; pot: number; currentBet: number; stack: number; roundCommitted: number; position: number; history: readonly string[] }>;
