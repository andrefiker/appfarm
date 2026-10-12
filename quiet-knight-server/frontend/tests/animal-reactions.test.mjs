import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { animalReactionForMove } from '../src/animal-reactions.ts';

function move(fen, from, to, promotion) {
  const game = new Chess(fen);
  const result = game.move({ from, to, ...(promotion ? { promotion } : {}) });
  return { result, checksKing: game.isCheck() };
}

const knightCheck = move('4k3/8/8/5N2/8/8/8/K7 w - - 0 1', 'f5', 'g7');
assert.equal(animalReactionForMove(knightCheck.result, knightCheck.checksKing), 'HORSE SUCCESSFUL');

const castle = move('4k3/8/8/8/8/8/8/4K2R w K - 0 1', 'e1', 'g1');
assert.equal(animalReactionForMove(castle.result, castle.checksKing), 'Security has been upgraded.');

const queenCapture = move('4k3/8/8/8/8/8/3p4/3QK3 w - - 0 1', 'd1', 'd2');
assert.equal(animalReactionForMove(queenCapture.result, queenCapture.checksKing), 'Naturally.');

const bishopCapture = move('4k3/8/8/8/8/2p5/3B4/4K3 w - - 0 1', 'd2', 'c3');
assert.equal(animalReactionForMove(bishopCapture.result, bishopCapture.checksKing), 'The council has spoken.');

const pawnCapture = move('4k3/8/8/8/8/2p5/3P4/4K3 w - - 0 1', 'd2', 'c3');
assert.ok(['Baa.', 'He was only following orders.'].includes(animalReactionForMove(pawnCapture.result, pawnCapture.checksKing)));

const genericCheck = move('4k3/8/8/8/8/8/4R3/K7 w - - 0 1', 'e2', 'e7');
assert.equal(animalReactionForMove(genericCheck.result, genericCheck.checksKing), 'His Majesty is concerned.');

for (const [promotion, expected] of [
  ['q', 'Gerald is now management.'],
  ['n', 'Gerald has become a horse. Questions remain.'],
  ['r', 'Against all expectations, Gerald has risen.'],
]) {
  const promoted = move('7k/P7/8/8/8/8/8/7K w - - 0 1', 'a7', 'a8', promotion);
  assert.equal(animalReactionForMove(promoted.result, promoted.checksKing), expected);
}

assert.equal(animalReactionForMove({ piece: 'p', san: 'e4' }, false), null);
console.log('Animal Kingdom move-reaction cases passed.');
