import {useCallback,useEffect,useRef,useState} from 'react';
import {themeVoices} from './sound-themes';
import type {SoundTheme} from './sound-themes';
type AudioStatus='idle'|'ready'|'blocked'|'unsupported';
export function useChessAudio(enabled:boolean,volume:number,theme:SoundTheme='classic') {
 const context=useRef<AudioContext|null>(null),active=useRef(new Set<OscillatorNode>()),mounted=useRef(true);
 const settings=useRef({enabled,volume,theme});settings.current={enabled,volume,theme};
 const[state,setState]=useState<AudioStatus>('idle');
 const report=useCallback((next:AudioStatus)=>{if(mounted.current)setState(next);},[]);
 const permitted=(force=false)=>!document.hidden&&document.body.dataset.quiet!=='true'&&settings.current.volume>0&&(force||settings.current.enabled);
 const stop=()=>{for(const osc of active.current){try{osc.stop();}catch{}}active.current.clear();};
 const unlock=useCallback(async()=>{
  try{let ctx=context.current;if(!ctx||ctx.state==='closed'){
   const Ctor=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
   if(!Ctor){report('unsupported');return null;}ctx=new Ctor();context.current=ctx;
  }
  if(ctx.state!=='running'){let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([ctx.resume(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Audio activation timed out')),1200);})]);}finally{clearTimeout(timer);}}
  if(!mounted.current||context.current!==ctx)return null;if((ctx.state as string)!=='running'){report('blocked');return null;}report('ready');return ctx;
  }catch{report('blocked');return null;}
 },[report]);
 const tone=(ctx:AudioContext,at:number,pitch:number,end:number,duration:number,wave:OscillatorType,level:number)=>{
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=wave;
  osc.frequency.setValueAtTime(pitch,at);osc.frequency.exponentialRampToValueAtTime(end,at+Math.min(.08,duration));
  gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(level,at+.003);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  osc.connect(gain);gain.connect(ctx.destination);active.current.add(osc);
  osc.onended=()=>{active.current.delete(osc);osc.disconnect();gain.disconnect();};osc.start(at);osc.stop(at+duration+.01);
 };
 const play=useCallback(async(capture=false,check=false,force=false,own=false)=>{
  if(!permitted(force))return false;const requested=Date.now(),ctx=await unlock();
  if(!ctx||Date.now()-requested>700||!permitted(force))return false;
  try{
   const level=Math.max(0,Math.min(1,settings.current.volume/100)),now=ctx.currentTime+.008;
   const selected=window.matchMedia('(prefers-reduced-motion: reduce)').matches?'classic':settings.current.theme;
   if(selected!=='classic'){
    const voice=themeVoices[selected],factor=capture?.75:1;
    voice.beats.forEach((beat,i)=>{const harmonic=selected==='orchestra'?[1,1.25,1.5][i]:1;tone(ctx,now+beat,voice.pitch*factor*harmonic,voice.end*factor*harmonic,voice.duration,voice.wave,.13*level);});
    if(check)tone(ctx,now+.28,1568,1568,.18,'sine',.12*level);
   }else{
    const chime=(at:number,pitch:number)=>{for(const[ratio,strength]of[[1,.22],[2,.025]])tone(ctx,at,pitch*ratio*1.015,pitch*ratio,.21,'sine',strength*level);};
    if(own)tone(ctx,now,capture?360:520,capture?180:280,.05,'triangle',.16*level);
    else{chime(now,capture?784:988);chime(now+.085,capture?1047:1319);}
    if(check)chime(now+(own?.045:.17),1568);
   }
   report('ready');return true;
  }catch{report('blocked');return false;}
 },[unlock,report]);
 const knock=useCallback(async()=>{const ctx=context.current;if(!permitted()||ctx?.state!=='running')return;for(const offset of[0,.085])tone(ctx,ctx.currentTime+.008+offset,240,110,.045,'triangle',.10*Math.min(1,settings.current.volume/100));},[]);
 const neigh=useCallback(async()=>{
  if(!permitted()||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const ctx=await unlock();if(!ctx||!permitted())return;const level=.09*Math.min(1,settings.current.volume/100);
  [0,.09,.18,.28].forEach((offset,i)=>tone(ctx,ctx.currentTime+.008+offset,650-i*65,820-i*160,.09,'triangle',level));
 },[unlock]);
 useEffect(()=>{
  mounted.current=true;
  const quiet=()=>{stop();void context.current?.suspend().catch(()=>undefined);};
  const visibility=()=>{if(document.hidden)quiet();};
  const gesture=()=>{if(permitted())void unlock();};
  window.addEventListener('qk-background',quiet);document.addEventListener('visibilitychange',visibility);document.addEventListener('pointerup',gesture,{passive:true});document.addEventListener('keydown',gesture);
  return()=>{mounted.current=false;window.removeEventListener('qk-background',quiet);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('pointerup',gesture);document.removeEventListener('keydown',gesture);stop();const ctx=context.current;context.current=null;void ctx?.close().catch(()=>undefined);};
 },[unlock]);
 useEffect(()=>{if(!enabled||volume===0)stop();},[enabled,volume]);
 return{play,knock,neigh,test:()=>play(false,false,true),status:!enabled?'Sound off':state==='ready'?'Sound ready':state==='unsupported'?'Audio is unavailable in this browser':'Tap Test sound to enable audio'};
}
