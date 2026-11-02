import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {describeBoardMotion} from '../src/board-effects.ts';
const position = game => Object.fromEntries(game.board().flat().filter(Boolean).map(p=>[p.square,{color:p.color,type:p.type}]));
function effect(fen,move) {
  const game=new Chess(fen), before=position(game), made=game.move(move), after=position(game);
  const e=describeBoardMotion(before,after,{from:made.from,to:made.to,san:made.san,serial:1});
  assert.equal(game.fen(),new Chess(game.fen()).fen());
  return e;
}
const ep=effect('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1','exd6');
assert.deepEqual(ep.captured,{color:'b',type:'p',square:'d5'});
assert.equal(ep.to,'d6');assert.equal(ep.actor.type,'p');
for(const promotion of ['q','r','b','n']){
  const e=effect('1r2k3/P7/8/8/8/8/8/4K3 w - - 0 1',{from:'a7',to:'b8',promotion});
  assert.equal(e.promotion,promotion);assert.equal(e.captured.square,'b8');assert.equal(e.actor.type,'p');
}
for(const [san,to,from,rookTo] of [['O-O','g1','h1','f1'],['O-O-O','c1','a1','d1']]){
  const e=effect('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',san);
  assert.equal(e.to,to);assert.deepEqual(e.rook,{from,to:rookTo});assert.equal(e.captured,undefined);
}
// Chess960 king travels to g1 even though UCI names the original rook square.
const e=describeBoardMotion({b1:{color:'w',type:'k'},f1:{color:'w',type:'r'}},{g1:{color:'w',type:'k'},f1:{color:'w',type:'r'}},{from:'b1',to:'f1',san:'O-O',serial:2});
assert.equal(e.to,'g1');assert.equal(e.rook,undefined,'stationary rook must not jump from h1');
const quiet=effect(undefined,'Nf3');assert.equal(quiet.actor.type,'n');assert.equal(quiet.captured,undefined);
console.log('Board effects: en passant, all capture promotions, both castles, stationary Chess960 rook and quiet knight passed.');

const recaptureGame=new Chess();let lastEffect=null;
for (const san of ['e4','d5','exd5','Qxd5']) {
 const before=position(recaptureGame),made=recaptureGame.move(san);
 lastEffect=describeBoardMotion(before,position(recaptureGame),{from:made.from,to:made.to,san,serial:recaptureGame.history().length},lastEffect);
}
assert.equal(lastEffect.revenge,true,'immediate recapture is recognized');
const previous=lastEffect;const before=position(recaptureGame),made=recaptureGame.move('Nc3');
assert.equal(describeBoardMotion(before,position(recaptureGame),{from:made.from,to:made.to,san:made.san,serial:5},previous).revenge,false);
console.log('Recapture presentation metadata passed.');
