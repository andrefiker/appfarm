import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { StockfishService, SKILLS, BEGINNER, selectBeginnerMove, validatePosition } from './stockfish.js';
const binary = process.env.STOCKFISH_PATH;
const engine = new StockfishService({ binary });
function input(sans=[], level=10) { const game=new Chess(); const moves=sans.map(san=>{const m=game.move(san);return{from:m.from,to:m.to,promotion:m.promotion};});return{moves,level,expected_fen:game.fen()}; }
await engine.probe(); assert.match(engine.name,/^Stockfish 18/);
const timings=[];
for(let level=1;level<=10;level++) { const request=input(['e4'],level), response=await engine.move(request); const game=validatePosition(request).game;assert.ok(game.move(response.move));assert.equal(response.skill,SKILLS[level-1]);assert.equal(response.fen,request.expected_fen);timings.push(response.elapsed_ms); }
for(let level=1;level<=10;level++) { const request=input([],level), response=await engine.move(request);assert.ok(validatePosition(request).game.move(response.move)); }
assert.deepEqual(SKILLS,[20,20,20,2,5,8,14,16,18,20]);
assert.deepEqual(BEGINNER.map(({candidates,nodes})=>[candidates,nodes]),[[6,1800],[5,3500],[4,7000]]);
const candidates=[{rank:1,move:'e2e4',cp:100},{rank:2,move:'d2d4',cp:70},{rank:3,move:'g1f3',cp:35},{rank:4,move:'b1c3',cp:0},{rank:5,move:'a2a3',cp:-40},{rank:6,move:'h2h3',cp:-80}];
assert.equal(selectBeginnerMove(candidates,1,()=>0.6),'b1c3');
assert.equal(selectBeginnerMove(candidates,2,()=>0.6),'g1f3');
assert.equal(selectBeginnerMove(candidates,3,()=>0.6),'d2d4');
for(const [sans,level] of [[['e4','d5'],1],[['e4','e5','Qf3','Nc6','Bc4','Nd4','a3'],2],[['e4','e5','Qh5','Nc6','Bc4','Nf6'],3]]){
  const request=input(sans,level), response=await engine.move(request);
  assert.ok(validatePosition(request).game.move(response.move));
}
let mate=await engine.move(input(['e4','e5','Qh5','Nc6','Bc4','Nf6']));assert.equal(mate.move.san,'Qxf7#');
mate=await engine.move(input(['f3','e5','g4']));assert.equal(mate.move.san,'Qh4#');
const promotion=input(['a4','h5','a5','h4','a6','h3','axb7','hxg2','bxa8=Q']);
assert.match((await engine.move(promotion)).move.san,/=Q/);
const afterCastle=input(['e4','e5','Nf3','Nc6','Bc4','Bc5','O-O']);
assert.ok(validatePosition(afterCastle).game.move((await engine.move(afterCastle)).move));
for(const request of [{...input(),level:11},{...input(),level:1.5},{...input(),moves:[{from:'e2\nquit',to:'e4'}]},{...input(),moves:[{from:'e2',to:'e5'}]},{...input(),expected_fen:'wrong'}])assert.throws(()=>validatePosition(request));
const ended=input(['f3','e5','g4','Qh4#']);assert.equal((await engine.move(ended)).move,null);
let last=Date.now(),gap=0;const tick=setInterval(()=>{gap=Math.max(gap,Date.now()-last);last=Date.now();},10);
const active=engine.move(input());await assert.rejects(engine.move(input()),e=>e.status===429);await active;clearInterval(tick);assert.ok(gap<150,'native search must leave event loop responsive');
const abort=new AbortController();const cancelled=engine.move(input(),abort.signal);setTimeout(()=>abort.abort(),40);await assert.rejects(cancelled,e=>e.status===499);assert.equal(engine.busy,false);await engine.probe();
const timeout=new StockfishService({binary,deadline:1});await assert.rejects(timeout.probe());assert.equal(timeout.busy,false);
const missing=new StockfishService({binary:'/does-not-exist'});await assert.rejects(missing.probe());assert.equal(missing.busy,false);
console.log(JSON.stringify({test:'PASS',engine:engine.name,levels:SKILLS,timings_ms:timings,event_loop_gap_ms:gap,checks:'legal moves all levels both colors; White and Black mate in one; promotion and castling position; injection/history/FEN validation; terminal game; capacity; cancellation/recovery; timeout; missing binary'}));
