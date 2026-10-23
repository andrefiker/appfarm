export function skillForLevel(level:number){return Math.round((Math.max(1,Math.min(10,level))-1)*20/9);}
export const ENGINE_NAME = 'Stockfish 18 Lite · offline WASM';
export type Style = 'balanced'|'fox'|'tortoise'|'owl'|'beginner';
export type EngineLine = {move:string;cp:number;mate?:number;pv:string[];depth:number;rank:number;engineChosen?:boolean};
export type EngineResult=EngineLine[] & {engineMove?:string};
export type SearchOptions = {ms?:number;level?:number;style?:Style;chess960?:boolean;signal?:AbortSignal;analysis?:boolean};
// One disposable worker per search. Termination is the cancellation boundary:
// no stale callback, hidden-page work, shared memory, network service or queue.
export function engineSearch(fen:string,options:SearchOptions={}):Promise<EngineResult> {
  if(fen.length>200 || /[\r\n]/.test(fen))return Promise.reject(Error('Invalid engine position'));
  if(options.signal?.aborted)return Promise.reject(new DOMException('Cancelled','AbortError'));
  return new Promise((resolve,reject)=>{
    const worker = new Worker(new URL('engine/stockfish-18-lite-single.js',document.baseURI));
    const lines=new Map<number,EngineLine>();
    let ended=false,ready=false,bestMove:string|undefined;
    const ms=Math.max(40,Math.min(1500,options.ms??250));
    const finish=(error?:Error)=>{if(ended)return;ended=true;clearTimeout(timer);options.signal?.removeEventListener('abort',abort);worker.terminate();
      const result=[...lines.values()].sort((a,b)=>a.rank-b.rank) as EngineResult;result.engineMove=bestMove;
      if(error)reject(error);else if(result.length)resolve(result);else reject(Error('Engine returned no evaluation'));};
    const abort=()=>finish(new DOMException('Cancelled','AbortError'));
    const timer=setTimeout(()=>finish(Error('Offline engine timed out')),12000+ms);
    options.signal?.addEventListener('abort',abort,{once:true});
    worker.onerror=()=>finish(Error('Offline engine could not load'));
    worker.onmessage=e=>{
      const text=String(e.data);
      for(const line of text.split('\n')){
        if(line==='uciok'){
          worker.postMessage('setoption name Hash value 16');
          worker.postMessage('setoption name Threads value 1');
          worker.postMessage('setoption name UCI_Chess960 value '+Boolean(options.chess960));
          worker.postMessage('setoption name Skill Level value '+(options.analysis?20:skillForLevel(options.level??5)));
          worker.postMessage('setoption name MultiPV value '+(options.analysis?3:(options.style==='beginner'||(options.level??5)<=2)?8:4));
          worker.postMessage('isready');
        } else if(line==='readyok'&&!ready){ready=true;worker.postMessage('ucinewgame');worker.postMessage('position fen '+fen);worker.postMessage('go movetime '+ms);
        } else if(line.startsWith('info ')){
          const pv=line.match(/\bpv ([a-h][1-8][a-h][1-8][qrbn]?(?: .*)?)/),score=line.match(/\bscore (cp|mate) (-?\d+)/);
          if(!pv||!score||/\b(?:upperbound|lowerbound)\b/.test(line))continue;
          const rank=Number(line.match(/multipv (\d+)/)?.[1]||1),depth=Number(line.match(/depth (\d+)/)?.[1]||0);
          const mate=score[1]==='mate'?Number(score[2]):undefined;
          lines.set(rank,{move:pv[1].split(' ')[0],pv:pv[1].trim().split(' ').slice(0,12),cp:mate===undefined?Number(score[2]):Math.sign(mate)*(100000-Math.abs(mate)*100),mate,rank,depth});
        } else if(line.startsWith('bestmove ')){const move=line.split(' ')[1];bestMove=move;for(const candidate of lines.values())candidate.engineChosen=candidate.move===move;finish();}
      }
    };
    worker.postMessage('uci');
  });
}
export function selectStyle(lines:EngineLine[],style:Style,features:(move:string)=>{capture:number;check:boolean;center:number;exposure:number},level=5):EngineLine {
  if(!lines.length)throw Error('No engine candidates');
  const sorted=[...lines].sort((a,b)=>b.cp-a.cp),best=sorted[0],chosen=sorted.find(x=>x.engineChosen)||best;
  if(style==='balanced')return chosen;
  const tolerance=style==='beginner'?650:Math.max(25,160-level*12);
  const eligible=style==='beginner'||level<=2?sorted.filter(x=>best.cp-x.cp<=tolerance):sorted.filter(x=>Math.abs(chosen.cp-x.cp)<=tolerance);
  if(style==='beginner'||level<=2)return eligible[eligible.length-1];
  return eligible.reduce((chosen,line)=>{
    const score=(x:EngineLine)=>{const f=features(x.move);return x.cp+(style==='fox'?f.capture*18+(f.check?24:0):style==='tortoise'?-f.exposure*22:style==='owl'?f.center*14:0);};
    return score(line)>score(chosen)?line:chosen;
  });
}
