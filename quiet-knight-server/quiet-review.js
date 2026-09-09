import {spawn} from 'node:child_process';import {createInterface} from 'node:readline';import {Chess} from 'chess.js';import {EngineError} from './stockfish.js';
export const REVIEW_MAX_PLIES=160;
export function reviewHistory(input,{allowResignation=false}={}){
 if(!input||!Array.isArray(input.moves)||input.moves.length<2||input.moves.length>REVIEW_MAX_PLIES)throw new EngineError('Quiet Review supports completed games of 2–160 half-moves.',400);
 const game=new Chess(),positions=[{fen:game.fen(),moves:[],turn:'w'}],moves=[];
 for(const m of input.moves){if(!m||!/^[a-h][1-8]$/.test(m.from)||!/^[a-h][1-8]$/.test(m.to)||(m.promotion!==undefined&&!/^[qrbn]$/.test(m.promotion)))throw new EngineError('Invalid review history',400);let made;try{if(game.isGameOver())throw Error('Ended');made=game.move({from:m.from,to:m.to,promotion:m.promotion});}catch{throw new EngineError('Invalid review history',400);}moves.push({from:made.from,to:made.to,promotion:made.promotion,san:made.san,color:made.color,uci:made.from+made.to+(made.promotion||'')});positions.push({fen:game.fen(),moves:moves.map(x=>x.uci),turn:game.turn(),terminal:game.isCheckmate()?{score:game.turn()==='w'?-10000:10000,best:null}:game.isDraw()?{score:0,best:null}:null});}
 if(input.final_fen!==game.fen())throw new EngineError('Review position does not match history',409);
 if(!game.isGameOver()&&!(allowResignation&&input.ended_reason==='resigned'))throw new EngineError('Finish the game before requesting a review.',400);
 return{positions,moves};
}
function candidates(history,evaluations){return history.moves.map((move,i)=>{const before=evaluations[i],after=evaluations[i+1];if(!Number.isFinite(before?.score)||!Number.isFinite(after?.score))return null;return{index:i,move,loss:(move.color==='w'?1:-1)*(before.score-after.score),before,after};}).filter(Boolean);}
function momentsFor(history,evaluations){const list=candidates(history,evaluations),used=new Set(),moments=[];const make=(item,type)=>{used.add(item.index);const p=history.positions[item.index];let suggested;
  if(item.before.best&&item.before.best!==item.move.uci)try{const chess=new Chess(p.fen),uci=item.before.best;const m=chess.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});suggested={from:m.from,to:m.to,promotion:m.promotion,san:m.san};}catch{}
  return{type,ply:item.index+1,move_number:Math.floor(item.index/2)+1,color:item.move.color,played_san:item.move.san,fen_before:p.fen,fen_after:history.positions[item.index+1].fen,suggested_move:suggested,advantage_before_cp:Math.max(-10000,Math.min(10000,Math.round(item.before.score))),advantage_after_cp:Math.max(-10000,Math.min(10000,Math.round(item.after.score)))};
 };
 const turning=[...list].sort((a,b)=>b.loss-a.loss).find(x=>x.loss>=150);if(turning)moments.push(make(turning,'turning_point'));
 const missed=[...list].sort((a,b)=>b.loss-a.loss).find(x=>!used.has(x.index)&&x.loss>=100&&x.before.best&&x.before.best!==x.move.uci);if(missed)moments.push(make(missed,'missed_chance'));
 const best=[...list].reverse().find(x=>!used.has(x.index)&&x.loss<=60&&(x.before.best===x.move.uci||x.move.san.includes('#'))&&/[x+#]/.test(x.move.san));if(best)moments.push(make(best,'best_moment'));
 return moments;
}
export async function quietReview(engine,input,signal,options={}){
 if(engine.busy)throw new EngineError('Stockfish is busy. Try reviewing again shortly.',429);
 if(signal?.aborted)throw new EngineError('Request cancelled',499);
 const history=reviewHistory(input,options);const now=Date.now();engine.tokens=Math.min(8,engine.tokens+(now-engine.refilled)/500);engine.refilled=now;if(engine.tokens<2)throw new EngineError('Please wait before another review.',429);engine.tokens-=2;engine.busy=true;const started=Date.now();
 return new Promise((resolve,reject)=>{
  let child,phase='uci',exiting=false,failure,answer,pending=null,latestScore=null;
  const finish=error=>{if(exiting)return;exiting=true;failure=error;child?.kill('SIGKILL');};
  try{child=spawn(engine.binary,[],{stdio:['pipe','pipe','ignore'],shell:false});}catch{engine.busy=false;reject(new EngineError('Stockfish could not start'));return;}
  const timer=setTimeout(()=>finish(new EngineError('Quiet Review reached its time limit. Try again later.')),options.deadline||4800);
  const abort=()=>finish(new EngineError('Request cancelled',499));signal?.addEventListener('abort',abort,{once:true});
  child.on('error',()=>finish(new EngineError('Stockfish could not start')));child.stdin.on('error',()=>finish(new EngineError('Stockfish input failed')));
  const lines=createInterface({input:child.stdout});const write=line=>{if(!exiting)child.stdin.write(line+'\n');};
  const evaluate=(position,ms)=>{if(exiting)return Promise.reject(new EngineError('Review stopped'));if(position.terminal)return Promise.resolve(position.terminal);return new Promise(resolve=>{latestScore=null;pending=value=>resolve({score:Number.isFinite(value.rawScore)?value.rawScore*(position.turn==='w'?1:-1):null,best:value.best});write('position startpos'+(position.moves.length?' moves '+position.moves.join(' '):''));write('go movetime '+ms);});};
  async function analyse(){try{
   const evaluations=[];for(const position of history.positions){if(exiting)return;evaluations.push(await evaluate(position,10));}
   const rough=candidates(history,evaluations).sort((a,b)=>b.loss-a.loss).slice(0,3);const indices=[...new Set(rough.flatMap(x=>[x.index,x.index+1]))];
   for(const i of indices){if(exiting)return;evaluations[i]=await evaluate(history.positions[i],70);}
   if(exiting)return;const moments=momentsFor(history,evaluations);answer={engine:engine.name||'Stockfish 18',moments,message:moments.length?'Moments worth a second look.':'A steady game. No single move stood out in this brief review.',elapsed_ms:Date.now()-started,scope:'Brief post-game review; not exhaustive analysis'};finish();
  }catch(e){finish(e instanceof EngineError?e:new EngineError('Quiet Review unavailable'));}}
  lines.on('line',line=>{
   if(exiting)return;
   if(line.startsWith('id name Stockfish '))engine.name=line.slice(8).slice(0,80);
   if(line==='uciok'&&phase==='uci'){phase='ready';write('setoption name Threads value 1');write('setoption name Hash value 32');write('setoption name Skill Level value 20');write('setoption name UCI_LimitStrength value false');write('ucinewgame');write('isready');}
   else if(line==='readyok'&&phase==='ready'){phase='search';engine.ready=true;void analyse();}
   else if(line.startsWith('info ')&&pending){const match=line.match(/\bscore (cp|mate) (-?\d+)/);if(match&&!/\b(?:lowerbound|upperbound)\b/.test(line))latestScore=match[1]==='cp'?Number(match[2]):Number(match[2])>=0?10000:-10000;}
   else if(line.startsWith('bestmove ')&&pending){const best=line.split(' ')[1];const resolvePosition=pending;pending=null;resolvePosition({rawScore:latestScore,best:/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(best)?best:null});}
  });
  child.on('close',()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);lines.close();engine.busy=false;if(pending){pending({rawScore:null,best:null});pending=null;}if(failure||!answer)reject(failure||new EngineError('Stockfish exited before review completed'));else resolve(answer);});
  write('uci');
 });
}
