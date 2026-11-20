import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {whyIllegal,beginnerLessons,lessonMatches,threatPuzzles} from '../src/beginner-rules.ts';
test('legality explanations distinguish legal moves, own pieces, motion and blockers',()=>{
 const game=new Chess();
 assert.equal(whyIllegal(game,'e2','e4'),null);
 assert.match(whyIllegal(game,'e2','f3'),/diagonally only to capture/);
 assert.match(whyIllegal(game,'c1','h6'),/cannot jump/);
 assert.match(whyIllegal(game,'b1','b3'),/moves in an L/);
 assert.match(whyIllegal(game,'d1','d2'),/own pawn/);
 assert.match(whyIllegal(game,'e1','g1'),/own knight|clear the squares/i);
 assert.equal(game.fen(),new Chess().fen());
});
test('checks, pins and attacked castling paths get distinct explanations',()=>{
 const pinned=new Chess('k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1');
 assert.match(whyIllegal(pinned,'e2','d2'),/leave your king in check/);
 const attacked=new Chess('k4r2/8/8/8/8/8/8/4K2R w K - 0 1');
 assert.match(whyIllegal(attacked,'e1','g1'),/through/);
 const check=new Chess('k3r3/8/8/8/8/8/P7/4K3 w - - 0 1');
 assert.match(whyIllegal(check,'a2','a3'),/already in check/);
});
test('all three lessons require their chess concept and exact demo moves are legal',()=>{
 const moves=[{from:'e2',to:'e7'},{from:'e1',to:'g1'},{from:'e7',to:'e8',promotion:'n'}];
 for(const [i,lesson] of beginnerLessons.entries()){
  const game=new Chess(lesson.fen);
  assert.equal(whyIllegal(game,moves[i].from,moves[i].to),null);
  assert.equal(lessonMatches(lesson.id,game,game.move(moves[i])),true);
 }
 const check=new Chess(beginnerLessons[0].fen);
 assert.equal(lessonMatches('check',check,check.move('Re3')),false);
});
test('each threat position has a single threatened non-king square and the stated attacker can capture it',()=>{
 for(const p of threatPuzzles){
  const game=new Chess(p.fen.replace(' w ',' b '));
  const captures=game.moves({verbose:true}).filter(m=>m.captured);
  assert.deepEqual(captures.map(m=>[m.from,m.to]),[[p.attacker,p.answer]]);
 }
});
