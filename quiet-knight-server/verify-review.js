import assert from 'node:assert/strict';import {Chess} from 'chess.js';import {StockfishService} from './stockfish.js';import {quietReview,reviewHistory} from './quiet-review.js';
const engine=new StockfishService();const chess=new Chess();for(const san of ['f3','e5','g4','Qh4#'])chess.move(san);const input={moves:chess.history({verbose:true}).map(m=>({from:m.from,to:m.to,promotion:m.promotion})),final_fen:chess.fen()};
const result=await quietReview(engine,input);assert.equal(result.engine,'Stockfish 18');assert.ok(result.moments.length>0&&result.moments.length<=3);assert.ok(result.elapsed_ms<4800);assert.equal(engine.busy,false);
for(const m of result.moments){const before=new Chess(m.fen_before);const made=before.move(m.played_san);assert.equal(before.fen(),m.fen_after);assert.equal(made.color,m.color);if(m.suggested_move){const position=new Chess(m.fen_before);position.move(m.suggested_move);}}
assert.ok(result.moments.some(m=>m.played_san==='g4'||m.played_san==='Qh4#'));
assert.throws(()=>reviewHistory({...input,final_fen:new Chess().fen()}),e=>e.status===409);
assert.throws(()=>reviewHistory({...input,moves:[{from:'e2\nquit',to:'e4'},...input.moves]}),e=>e.status===400);
assert.throws(()=>reviewHistory({...input,moves:Array(161).fill({from:'e2',to:'e4'})}),e=>e.status===400);
const unfinished=new Chess();unfinished.move('e4');unfinished.move('e5');const partial={moves:unfinished.history({verbose:true}).map(m=>({from:m.from,to:m.to})),final_fen:unfinished.fen()};assert.throws(()=>reviewHistory(partial),e=>e.status===400);
assert.ok(reviewHistory({...partial,ended_reason:'resigned'},{allowResignation:true}));
const controller=new AbortController();const pending=quietReview(engine,input,controller.signal);await assert.rejects(quietReview(engine,input),e=>e.status===429);controller.abort();await assert.rejects(pending,e=>e.status===499);assert.equal(engine.busy,false);
const slow=new StockfishService();await assert.rejects(quietReview(slow,input,undefined,{deadline:1}),e=>e.status===503);assert.equal(slow.busy,false);
console.log(JSON.stringify({event:'review.acceptance',passed:true,elapsed_ms:result.elapsed_ms,moments:result.moments.map(m=>({type:m.type,ply:m.ply,san:m.played_san})),checks:['actual native Stockfish','bounded moments','legal suggested moves','completed-only','FEN validation','injection rejection','max plies','shared busy guard','cancellation','deadline cleanup']}));
