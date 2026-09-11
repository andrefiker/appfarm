import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, startHand } from '../engine/index.js';
import { observation, playerView, publicView } from './views.js';
import { decideBot } from './bot.js';

test('recipient views never expose another private hand or deck', () => {
  const state = startHand(createGame('HOLD_EM_NO_LIMIT', [{ id: 'a', seat: 0 }, { id: 'b', seat: 1 }], 0));
  const owners = new Map([
    [0, { guestId: 'a', name: 'A', bot: false, connected: true }],
    [1, { guestId: 'b', name: 'B', bot: false, connected: true }],
  ]);
  const publicState = publicView('room-abcd1234', 1, state, owners, null, null);
  const playerA = playerView(publicState, state, 0);
  const spectator = playerView(publicState, state, null);
  assert.equal(JSON.stringify(playerA).includes(state.players[1]!.hand[0]!.id), false);
  assert.equal(JSON.stringify(spectator).includes(state.players[0]!.hand[0]!.id), false);
  assert.equal(JSON.stringify(publicState).includes('deck'), false);
});

test('fresh room hides internal engine placeholder seats', () => {
  const waiting = createGame('HOLD_EM_NO_LIMIT', [{ id: 'lobby-0', seat: 0 }, { id: 'lobby-1', seat: 1 }]);
  const publicState = publicView('room-fresh123', 0, waiting, new Map(), null, null);
  assert.deepEqual(publicState.seats, []);
});

test('bot decision is deterministic for identical authorized observation', () => {
  const state = startHand(createGame('HOLD_EM_NO_LIMIT', [{ id: 'a', seat: 0 }, { id: 'b', seat: 1 }], 0));
  const seat = state.players.find((player) => player.id === state.actorId)!.seat;
  const authorized = observation(state, seat);
  assert.deepEqual(decideBot(authorized, 'balanced', { next: () => .5 }), decideBot(authorized, 'balanced', { next: () => .5 }));
});
