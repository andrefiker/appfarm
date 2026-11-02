import {useEffect, useRef, useState} from 'react';
import type {CSSProperties, RefObject} from 'react';
import {Piece} from './pieces';
import type {Color} from './pieces';
import type {BoardMotion} from './board-effects';

export function CaptureFlight({stage,motion,enabled,orientation,observedSerial=motion?.serial}: {
  stage:RefObject<HTMLElement|null>;motion:BoardMotion|null;enabled:boolean;orientation:Color;observedSerial?:number;
}) {
  const seen=useRef(observedSerial), previousOrientation=useRef(orientation);
  const [flight,setFlight]=useState<{motion:BoardMotion;style:CSSProperties;expires:number}|null>(null);
  useEffect(()=>{
    const fresh=motion && seen.current!==motion.serial, flipped=orientation!==previousOrientation.current;
    seen.current=observedSerial;previousOrientation.current=orientation;
    if (!enabled || !motion || flipped || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) {setFlight(null);return;}
    const victim=motion.captured;
    if (!fresh || !victim) return;
    const root=stage.current;
    const source=root?.querySelector(`[data-square="${victim.square}"]`);
    const targets=root?.querySelectorAll(`[data-lost-color="${victim.color}"] [data-captured="${victim.type}"]`);
    const target=targets?.[targets.length-1];
    if (!root || !source || !target) return;
    const r=root.getBoundingClientRect(),a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
    setFlight({motion,expires:Date.now()+1050,style:{left:a.left-r.left,top:a.top-r.top,width:a.width,height:a.height,
      '--flight-x':`${b.left+b.width/2-a.left-a.width/2}px`,'--flight-y':`${b.top+b.height/2-a.top-a.height/2}px`,
      '--flight-scale':String(b.width/a.width)} as CSSProperties});
  },[motion,enabled,orientation,stage,observedSerial]);
  useEffect(()=>{if (!flight) return;const t=window.setTimeout(()=>setFlight(null),Math.max(0,flight.expires-Date.now()));return()=>clearTimeout(t);},[flight]);
  useEffect(()=>{
    const clear=()=>setFlight(null),visibility=()=>{if(document.hidden)clear();};
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    reduced.addEventListener('change',clear);window.addEventListener('resize',clear);
    document.addEventListener('visibilitychange',visibility);
    return()=>{reduced.removeEventListener('change',clear);window.removeEventListener('resize',clear);document.removeEventListener('visibilitychange',visibility);};
  },[]);
  return enabled && flight?.motion.captured ? <span key={flight.motion.serial} className="capture-flight" style={flight.style} aria-hidden="true" data-effect="tray-landing">
    <Piece color={flight.motion.captured.color} kind={flight.motion.captured.type} fitToSquare scope="tray-flight"/>
  </span> : null;
}
