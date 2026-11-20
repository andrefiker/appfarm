import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {threatenedSquares} from '../src/amateur-threats.ts';

test('the starting position has no attacked occupied squares',()=>assert.deepEqual(threatenedSquares(new Chess()),[]));
test('opposing pawns highlight both occupied targets, not empty squares or defended allies',()=>{
 const game=new Chess();for(const m of ['e4','d5'])game.move(m);
 assert.deepEqual(threatenedSquares(game).sort(),['d5','e4']);
 game.move('exd5');assert.deepEqual(threatenedSquares(game),['d5']);
});
test('a checked king is marked and a blocker stops a sliding attack',()=>{
 const game=new Chess('4k3/8/8/8/4R3/8/8/K7 b - - 0 1');
 assert.deepEqual(threatenedSquares(game),['e8']);
 const blocked=new Chess('4k3/8/4P3/8/4R3/8/8/K7 b - - 0 1');
 assert.deepEqual(threatenedSquares(blocked),[]);
});
test('en passant marks the capturable pawn on its actual square',()=>{
 const game=new Chess();for(const m of ['e4','a6','e5','d5'])game.move(m);
 assert.ok(threatenedSquares(game).includes('d5'));
});
