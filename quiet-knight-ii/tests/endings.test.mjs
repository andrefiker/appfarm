import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,Chess,lockedPawnDead} from '../web/rules.js';

test('a king temporarily blocking a pawn is not a dead fortress',()=>{
 const fen='k7/8/8/p1p1p1p1/P1P1P1P1/1K6/1P6/8 w - - 0 1';
 const g=new Game(fen);
 assert.equal(lockedPawnDead(g.chess),false);
 assert.equal(g.status().over,false);
 // A concrete cooperative continuation breaks the barrier in four plies.
 for(const move of ['Ka3','Kb8','b4','axb4+'])g.move(move);
 assert.equal(g.chess.get('a5'),undefined);
 assert.equal(g.chess.get('b4').color,'b');
 assert.equal(g.status().over,false);
});
test('a genuinely fixed pawn barrier still ends automatically',()=>{
 const g=new Game('k7/8/8/p1p1p1p1/P1P1P1P1/1K6/8/8 w - - 0 1');
 assert.equal(lockedPawnDead(g.chess),true);
 assert.equal(g.status().reason,'Dead position');
});
test('resigning against a bare king is a draw for either color',()=>{
 for(const [fen,color] of [['7k/8/8/8/8/8/8/KQ6 w - - 0 1','w'],['kq6/8/8/8/8/8/8/7K b - - 0 1','b']]){
  const g=new Game(fen);g.resign(color);assert.equal(g.status().score,'1/2-1/2');assert.match(g.status().reason,/only a king/);
  assert.equal(Game.restore(g.serialize()).status().score,'1/2-1/2');
  assert.equal(Game.fromPgn(g.exportPgn()).status().score,'1/2-1/2');
 }
});
test('a knight may mate with help from the opposing army; do not overdeclare draws',()=>{
 const c=new Chess('7k/8/8/8/8/8/8/KQN5 w - - 0 1');
 const g=new Game(c.fen());g.resign('b');assert.equal(g.status().score,'1-0');
 const h=new Game('k7/8/1n6/8/8/8/8/6QK w - - 0 1');h.resign('w');assert.equal(h.status().score,'0-1');
});
test('resignation does not replace a completed result and rejects invalid sides',()=>{
 const g=new Game();for(const move of ['f3','e5','g4','Qh4#'])g.move(move);
 g.resign('b');assert.equal(g.status().reason,'Checkmate');assert.equal(g.status().score,'0-1');
 assert.throws(()=>new Game().resign('x'));
});
