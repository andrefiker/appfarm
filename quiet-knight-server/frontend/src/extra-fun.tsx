import {useEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {Piece} from './pieces';
import type {Color} from './pieces';
import type {BoardMotion} from './board-effects';
import {boardSquares} from './chess-view-model';
import type {FunOptions} from './fun-options';
import {useChessAudio} from './chess-audio';
import type {SoundTheme} from './sound-themes';

export type Weather = 'off'|'rain'|'dust'|'fireflies';
export function useVisualPermission(enabled:boolean) {
  const [blocked,setBlocked]=useState(()=>document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{
    const q=window.matchMedia('(prefers-reduced-motion: reduce)');let nativeHidden=false;
    const sync=()=>setBlocked(nativeHidden || document.hidden || q.matches);
    const hide=()=>{nativeHidden=true;sync();},show=()=>{nativeHidden=false;sync();};
    q.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
    window.addEventListener('qk-background',hide);window.addEventListener('qk-resume',show);
    return()=>{q.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);window.removeEventListener('qk-background',hide);window.removeEventListener('qk-resume',show);};
  },[]);
  return enabled&&!blocked;
}

export function PawnDetails({square,color,last,fun}:{square:string;color:Color;last:boolean;fun:FunOptions}) {
  const progress=color==='w'?Number(square[1])-2:7-Number(square[1]);
  const stage=Math.max(0,Math.min(4,progress-1));
  return <>
    {last&&fun.survivor?<span className="pawn-headband" data-effect="survivor" aria-hidden="true"><i/></span>:null}
    {stage>0&&fun.graduation?<span className="pawn-medals" data-effect="graduation" data-stage={stage} aria-hidden="true">{'•'.repeat(stage)}</span>:null}
  </>;
}

// Overlay coordinates use the same orientation array as the board buttons.
export function MoveTrails({events,orientation,fun}:{events:BoardMotion[];orientation:Color;fun:FunOptions}) {
  const squares=boardSquares(orientation),point=(s:string)=>{const i=squares.indexOf(s);return{x:i%8+.5,y:Math.floor(i/8)+.5};};
  return <svg className="move-trails" viewBox="0 0 8 8" aria-hidden="true">
    {events.map(m=>{
      const a=point(m.from),b=point(m.to),dx=b.x-a.x,dy=b.y-a.y;
      if(fun.trails&&['b','r'].includes(m.actor?.type||'')&&Math.max(Math.abs(dx),Math.abs(dy))>=3)
        return <path key={m.serial} className={`long-trail trail-${m.actor!.type}`} data-effect="long-trail" d={`M${a.x} ${a.y}L${b.x} ${b.y}`}/>;
      if(!fun.hoofprints||m.actor?.type!=='n')return null;
      const corner=Math.abs(dx)===2?{x:b.x,y:a.y}:{x:a.x,y:b.y};
      const points=[a,{x:(a.x+corner.x)/2,y:(a.y+corner.y)/2},corner,b];
      return <g key={m.serial} className="hoof-trail" data-effect="hoofprints"><path className="hoof-route" d={`M${a.x} ${a.y}L${corner.x} ${corner.y}L${b.x} ${b.y}`}/>{points.map((p,i)=><path key={i} className="hoof-print" style={{'--hoof-delay':`${i*100}ms`} as CSSProperties} d={`M${p.x-.09} ${p.y-.09}v.10a.09 .09 0 0 0 .18 0v-.10`}/>)}</g>;
    })}
  </svg>;
}

export function BoardWeather({weather,enabled}:{weather:Weather;enabled:boolean}) {
  const allowed=useVisualPermission(enabled);
  return allowed&&weather!=='off'?<div className={`board-weather weather-${weather}`} data-weather={weather} aria-hidden="true">{Array.from({length:10},(_,i)=><i key={i} style={{'--weather-y':`${8+(i%5)*19}%`,'--weather-delay':`${-i*.7}s`,left:i%2?'calc(100% - 3px)':'1px'} as CSSProperties}/>)}</div>:null;
}

export function useAudience(count:number,enabled:boolean) {
  const allowed=useVisualPermission(enabled),previous=useRef(count),previousAllowed=useRef(allowed),[reacting,setReacting]=useState(false);
  useEffect(()=>{const fresh=allowed&&previousAllowed.current&&count>previous.current&&previous.current>0;previous.current=count;previousAllowed.current=allowed;setReacting(allowed&&fresh);const t=setTimeout(()=>setReacting(false),1000);return()=>clearTimeout(t);},[count,allowed]);
  return allowed&&reacting;
}

export function HomeKnight({enabled,sound,volume,theme}:{enabled:boolean;sound:boolean;volume:number;theme:SoundTheme}) {
  const allowed=useVisualPermission(enabled),[gesture,setGesture]=useState(''),[caption,setCaption]=useState('');
  const count=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const audio=useChessAudio(sound&&allowed,volume,theme);
  useEffect(()=>{if(!allowed){setGesture('');setCaption('');}return()=>clearTimeout(timer.current);},[allowed]);
  if(!enabled)return <span className="brand-seal" aria-hidden="true"><Piece color="w" kind="n" scope="brand"/></span>;
  return <span className="mascot-wrap"><button type="button" className={`brand-seal home-knight mascot-${gesture}`} aria-label="Play with the knight" onClick={()=>{
    if(!allowed)return;const n=count.current++%3;setGesture(['neigh','bow','refuse'][n]);setCaption(['A tiny neigh.','At your service.','Not today, human.'][n]);
    if(n===0)void audio.neigh();clearTimeout(timer.current);timer.current=setTimeout(()=>{setGesture('');setCaption('');},1000);
  }}><Piece color="w" kind="n" scope="brand"/></button><span className="mascot-caption" role="status">{caption}</span></span>;
}
