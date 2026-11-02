import {useEffect,useRef,useState} from 'react';
import {parseSan} from 'chessops/san';
import {makeSquare} from 'chessops/util';
import {boardPosition,positionFromFen,blankStudy} from './local-rules';
import {ChessBoard} from './chess-ui';
import type {Position} from './chess-ui';
import type {Color} from './pieces';
import {useVisualPermission} from './extra-fun';

type Frame={position:Position;san:string;check:string|null;last:{from:string;to:string}|null};
export function movieFrames(sans:readonly string[],startFen=blankStudy().start):Frame[] {
  if(sans.length>4000)throw Error('This game is too long for a movie. Use move history instead.');
  const pos=positionFromFen(startFen),frames:Frame[]=[];
  const snapshot=(san:string,last:Frame['last'])=>{const king=pos.board.kingOf(pos.turn);return{position:boardPosition(pos),san,last,check:pos.isCheck()&&king!==undefined?makeSquare(king):null};};
  frames.push(snapshot('',null));
  for(const san of sans){const move=parseSan(pos,san);if(!move||!('from'in move))throw Error('This history cannot be replayed.');pos.play(move);frames.push(snapshot(san,{from:makeSquare(move.from),to:makeSquare(move.to)}));}
  return frames;
}

export function GameMovie({sans,startFen,orientation,gameId,motionAllowed=true}:{sans:string[];startFen?:string;orientation:Color;gameId:string;motionAllowed?:boolean}) {
  const[frames,setFrames]=useState<Frame[]|null>(null),[cursor,setCursor]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[error,setError]=useState('');
  const dialog=useRef<HTMLDialogElement>(null),signature=JSON.stringify([gameId,startFen,sans]),openedWith=useRef('');
  const allowed=useVisualPermission(motionAllowed);
  function close(){setFrames(null);setPlaying(false);}
  useEffect(()=>{if(frames&&openedWith.current!==signature)close();},[signature,frames]);
  useEffect(()=>{if(!allowed)setPlaying(false);},[allowed]);
  useEffect(()=>{const d=dialog.current;if(!d)return;if(frames&&!d.open)d.showModal();else if(!frames&&d.open)d.close();},[frames]);
  useEffect(()=>{
    if(!playing||!allowed||!frames)return;
    if(cursor>=frames.length-1){setPlaying(false);return;}
    const linger=/[x+#]/.test(frames[cursor].san)?1.8:1;
    const timer=setTimeout(()=>setCursor(n=>Math.min(n+1,frames.length-1)),1000*linger/speed);
    return()=>clearTimeout(timer);
  },[playing,allowed,frames,cursor,speed]);
  const frame=frames?.[cursor];
  return <section className="game-movie-action">
    <button className="secondary" type="button" disabled={!sans.length} onClick={()=>{try{const next=movieFrames(sans,startFen);openedWith.current=signature;setFrames(next);setCursor(0);setPlaying(false);setError('');}catch(e){setError((e as Error).message);}}}>Watch game movie</button>
    {error?<p role="status">{error}</p>:null}
    <dialog className="qk-dialog game-movie-dialog" ref={dialog} aria-labelledby="movie-title" onClose={close} onCancel={close}>
      <div className="dialog-head"><h2 id="movie-title">Game movie</h2><button type="button" autoFocus onClick={close}>Close movie</button></div>
      <p>Read-only replay. New moves close this view; the live game continues.</p>
      {frame&&frames?<>
        <ChessBoard position={frame.position} orientation={orientation} selected={null} targets={[]} last={frame.last} check={frame.check} motion={null} locked onSquare={()=>{}} drag={false} playful={false} replayMode/>
        <p role="status" data-movie-ply={cursor}>Position {cursor} of {frames.length-1}{frame.san?` · ${Math.ceil(cursor/2)}. ${frame.san}`:' · Starting position'}</p>
        <div className="movie-controls"><button type="button" disabled={cursor===0} onClick={()=>{setPlaying(false);setCursor(0);}}>Start</button><button type="button" disabled={cursor===0} onClick={()=>{setPlaying(false);setCursor(c=>c-1);}}>Previous frame</button><button type="button" disabled={!allowed} onClick={()=>{if(cursor===frames.length-1)setCursor(0);setPlaying(p=>!p);}}>{playing?'Pause movie':'Play movie'}</button><button type="button" disabled={cursor===frames.length-1} onClick={()=>{setPlaying(false);setCursor(c=>c+1);}}>Next frame</button><button type="button" disabled={cursor===frames.length-1} onClick={()=>{setPlaying(false);setCursor(frames.length-1);}}>End</button></div>
        <label>Movie position<input type="range" aria-label="Movie position" min="0" max={frames.length-1} value={cursor} onChange={e=>{setPlaying(false);setCursor(Number(e.target.value));}}/></label>
        <label>Movie speed<select aria-label="Movie speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label>
        <p>Captures and checks stay on screen longer.{!allowed?' Automatic playback is paused by Quiet Mode, motion settings, or backgrounding. Use the frame buttons.':''}</p>
      </>:null}
    </dialog>
  </section>;
}
