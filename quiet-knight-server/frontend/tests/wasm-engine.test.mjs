import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {Chess} from 'chess.js';
import {positionFromFen,playUci} from '../src/local-rules.ts';
const engine='node_modules/stockfish/bin/stockfish-18-lite-single.js';
async function search(fen,level=5,chess960=false){return new Promise((resolve,reject)=>{
 const p=spawn(process.execPath,[engine],{stdio:['pipe','pipe','pipe']}),lines=createInterface({input:p.stdout});let name='',best,stderr='';
 const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('Engine deadline exceeded'));},12000);
 p.stderr.on('data',s=>{stderr+=String(s).slice(0,200);});p.on('error',reject);
 const write=s=>p.stdin.write(s+'\n');
 lines.on('line',line=>{if(line.startsWith('id name '))name=line.slice(8);
  if(line==='uciok'){write('setoption name Threads value 1');write('setoption name Hash value 16');write('setoption name UCI_Chess960 value '+chess960);write('setoption name Skill Level value '+(level-1)*2);write('isready');}
  if(line==='readyok'){write('position fen '+fen);write('go movetime 100');}
  if(line.startsWith('bestmove ')){best=line.split(' ')[1];write('quit');}
 });p.on('close',code=>{clearTimeout(timer);if(code!==0||!best)reject(Error('WASM engine failed: '+stderr));else resolve({name,move:best});});write('uci');
});}
for(let level=1;level<=10;level++){const r=await search(new Chess().fen(),level);assert.match(r.name,/Stockfish 18/);const game=new Chess();assert(game.move({from:r.move.slice(0,2),to:r.move.slice(2,4),promotion:r.move[4]}));}
const mate='6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',r=await search(mate,10),g=new Chess(mate);g.move({from:r.move.slice(0,2),to:r.move.slice(2,4),promotion:r.move[4]});assert(g.isCheckmate());
const variant='4k3/8/8/8/8/8/8/RK4R1 w GA - 0 1',v=await search(variant,10,true);playUci(positionFromFen(variant),v.move);
console.log('Real bundled Stockfish 18 WASM: all 10 skills return legal moves, mate-in-one and Chess960 legal reply passed. No Elo or physical battery claim.');
