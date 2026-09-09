import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {StockfishService} from './stockfish.js';
import {quietReview} from './quiet-review.js';

const gameFrom = sans => { const game = new Chess(); for (const san of sans) game.move(san); return game; };
const fixtures = [
  ['quiet repetition draw', gameFrom(['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8']), false],
  ['tactical scholar mate', gameFrom(['e4','e5','Bc4','Nc6','Qh5','Nf6','Qxf7#']), false],
  ['short mate', gameFrom(['f3','e5','g4','Qh4#']), false],
];
// A legal 150-ply fixture, treated as a trusted completed resignation by this
// unit harness. This does not create a durable ledger record or certify SQL.
let longGame;
for (let seed=1; seed<100 && !longGame; seed++) {
  const game = new Chess(); let state=seed;
  while (!game.isGameOver() && game.history().length<150) {
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const moves=game.moves(); game.move(moves[state % moves.length]);
  }
  if(game.history().length===150 && !game.isGameOver()) longGame=game;
}
assert.ok(longGame, 'bounded deterministic fixture generation');
fixtures.push(['long trusted resignation', longGame, true]);
for (const [name, game, trusted] of fixtures) {
  const input={moves:game.history({verbose:true}).map(m=>({from:m.from,to:m.to,promotion:m.promotion})),final_fen:game.fen(),...(trusted?{ended_reason:'resigned'}:{})};
  const before=JSON.stringify(input); const engine=new StockfishService();
  const result=await quietReview(engine,input,undefined,{allowResignation:trusted});
  assert.equal(JSON.stringify(input),before,'caller history unchanged');
  assert.equal(result.engine,'Stockfish 18'); assert.ok(result.moments.length<=3);
  assert.ok(result.elapsed_ms<4800); assert.equal(engine.busy,false);
  assert.equal(new Set(result.moments.map(m=>m.type)).size,result.moments.length);
  for(const moment of result.moments){
    const position=new Chess(moment.fen_before); position.move(moment.played_san);
    assert.equal(position.fen(),moment.fen_after);
    if(moment.suggested_move) new Chess(moment.fen_before).move(moment.suggested_move);
  }
  console.log(JSON.stringify({event:'review.matrix',name,plies:input.moves.length,elapsed_ms:result.elapsed_ms,moments:result.moments.map(m=>({type:m.type,ply:m.ply,san:m.played_san})),passed:true}));
}
