import {validPosition} from './rules.js';
export const LEVELS=[
 {name:'Gentle',skill:0,depth:3,time:120},
 {name:'Casual',skill:4,depth:6,time:220},
 {name:'Club',skill:9,depth:10,time:450},
 {name:'Expert',skill:15,depth:15,time:900},
 {name:'Master',skill:20,depth:20,time:1600}
];
// One outstanding search per worker. Termination is cancellation: no stale UCI reply can escape.
export class Engine{
 constructor(){this.worker=null;this.reject=null;this.generation=0;this.ready=false;}
 cancel(){this.generation++;if(this.reject)this.reject(Error('Cancelled'));this.reject=null;if(this.worker)this.worker.terminate();this.worker=null;this.ready=false;}
 async search(game,level=2){
  this.cancel();const generation=this.generation,c=validPosition(game.chess.fen());
  if(game.status().over||!c.moves().length)return null;
  const profile=LEVELS[Math.max(0,Math.min(4,level))];
  return new Promise((resolve,reject)=>{
   let timer,score=null,pv=[],phase='uci';const worker=this.worker=new Worker('./vendor/stockfish-17.1-lite-single-03e3232.js');
   const finish=(error,value)=>{clearTimeout(timer);if(generation!==this.generation)return;this.reject=null;worker.terminate();this.worker=null;this.ready=false;error?reject(error):resolve(value);};
   this.reject=e=>{clearTimeout(timer);reject(e);};
   timer=setTimeout(()=>finish(Error('Stockfish timed out. Tap Retry engine.')),15000+profile.time);
   worker.onerror=()=>finish(Error('Stockfish could not start. Tap Retry engine.'));
   worker.onmessage=({data})=>{if(generation!==this.generation)return;for(const line of String(data).split('\n')){
    if(line==='uciok'&&phase==='uci'){phase='ready';worker.postMessage('setoption name Hash value 16');worker.postMessage('setoption name Skill Level value '+profile.skill);worker.postMessage('isready');}
    else if(line==='readyok'&&phase==='ready'){phase='search';this.ready=true;worker.postMessage('ucinewgame');worker.postMessage('position fen '+game.root+(game.moves.length?' moves '+game.moves.map(m=>m.from+m.to+(m.promotion||'')).join(' '):''));worker.postMessage('go depth '+profile.depth+' movetime '+profile.time);}
    else if(line.startsWith('info ')){const s=line.match(/score (cp|mate) (-?\d+)/);if(s)score={type:s[1],value:Number(s[2])};const p=line.match(/ pv (.+)/);if(p)pv=p[1].split(' ');}
    else if(line.startsWith('bestmove ')){const move=line.split(' ')[1];if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)){finish(Error('Engine returned no valid move.'));return;}const obj={from:move.slice(0,2),to:move.slice(2,4),...(move[4]?{promotion:move[4]}:{})};try{c.move(obj);}catch{finish(Error('Engine move failed legal validation.'));return;}finish(null,{move:obj,score,pv,engine:'Stockfish 17.1 Lite'});}
   }};
   worker.postMessage('uci');
  });
 }
}
