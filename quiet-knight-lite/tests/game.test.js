import test from 'node:test';
import assert from 'node:assert/strict';
import { GameRoom, hasMatingMaterial } from '../game.js';

function seatedRoom(options = {}) {
  const room = new GameRoom('ABC234', options);
  const white = room.createWhite();
  const black = room.join().token;
  return { room, white, black };
}

test('clock waits for both seats, starts with White, and switches after a move', () => {
  const room = new GameRoom('ABC234', { clockMs: 600_000 });
  const white = room.createWhite();
  assert.equal(room.status, 'waiting');
  assert.equal(room.currentClocks().white, 600_000);
  room.join();
  assert.equal(room.status, 'playing');
  assert.equal(room.activeColor, 'white');
  const now = room.lastTick + 1_500;
  room.move(white, { from: 'e2', to: 'e4' }, now);
  assert.equal(room.clocks.white, 598_500);
  assert.equal(room.activeColor, 'black');
});

test('illegal moves and spectator moves are rejected', () => {
  const { room, white } = seatedRoom();
  assert.throws(() => room.move(white, { from: 'e2', to: 'e5' }), /Illegal move/);
  assert.throws(() => room.move('not-a-seat', { from: 'e2', to: 'e4' }), /seat token/);
});

test('castling is legal and authoritative', () => {
  const { room, white } = seatedRoom({ initialFen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1' });
  room.move(white, { from: 'e1', to: 'g1' });
  assert.equal(room.game.get('g1').type, 'k');
  assert.equal(room.game.get('f1').type, 'r');
});

test('en passant is legal and removes the captured pawn', () => {
  const { room, white } = seatedRoom({ initialFen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1' });
  room.move(white, { from: 'e5', to: 'd6' });
  assert.equal(room.game.get('d6').type, 'p');
  assert.equal(room.game.get('d5'), undefined);
});

test('promotion applies the selected piece', () => {
  const { room, white } = seatedRoom({ initialFen: '7k/P7/8/8/8/8/8/4K3 w - - 0 1' });
  room.move(white, { from: 'a7', to: 'a8', promotion: 'n' });
  assert.equal(room.game.get('a8').type, 'n');
});

test('Fool’s mate resolves as checkmate', () => {
  const { room, white, black } = seatedRoom();
  let now = room.lastTick;
  room.move(white, { from: 'f2', to: 'f3' }, now += 10);
  room.move(black, { from: 'e7', to: 'e5' }, now += 10);
  room.move(white, { from: 'g2', to: 'g4' }, now += 10);
  room.move(black, { from: 'd8', to: 'h4' }, now += 10);
  assert.equal(room.status, 'finished');
  assert.deepEqual(room.result, { type: 'checkmate', winner: 'black', text: 'Black wins by checkmate' });
});

test('timeout continues without clients and resolves from server time', () => {
  const { room } = seatedRoom({ clockMs: 100 });
  const started = room.lastTick;
  room.syncClock(started + 101);
  assert.equal(room.status, 'finished');
  assert.equal(room.result.type, 'timeout');
  assert.equal(room.result.winner, 'black');
});

test('timeout is a draw when the opponent lacks mating material', () => {
  const { room } = seatedRoom({ initialFen: '8/8/8/8/8/8/5k2/7K w - - 0 1' });
  assert.equal(hasMatingMaterial(room.game, 'black'), false);
  room.resolveTimeout('white');
  assert.equal(room.result.type, 'timeout-draw');
  assert.equal(room.result.winner, null);
});

test('resignation and mutual rematch reset to 10+0 and swap colors', () => {
  const { room, white, black } = seatedRoom({ clockMs: 600_000 });
  room.resign(white);
  assert.equal(room.result.type, 'resignation');
  room.requestRematch(white);
  assert.equal(room.status, 'finished');
  room.requestRematch(black);
  assert.equal(room.status, 'playing');
  assert.equal(room.generation, 2);
  assert.deepEqual(room.clocks, { white: 600_000, black: 600_000 });
  assert.equal(room.roleFor(black), 'white');
  assert.equal(room.roleFor(white), 'black');
  assert.equal(room.game.fen(), 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
});

test('draw offer is resolved by the other seat', () => {
  const { room, white, black } = seatedRoom();
  room.offerDraw(white);
  assert.equal(room.drawOffer, 'white');
  room.offerDraw(black);
  assert.equal(room.status, 'finished');
  assert.equal(room.result.type, 'agreement');
});
