import {useEffect,useState} from 'react';
import type {Style} from './offline-engine';
export type PlayPreferences={schema:1;quiet:boolean;reactions:boolean;left:boolean;drag:boolean;confirm:boolean;animate:boolean;hints:boolean;contrast:boolean;style:Style;think:number;adaptive:boolean;nickname:string};
const defaults:PlayPreferences={schema:1,quiet:false,reactions:false,left:false,drag:true,confirm:false,animate:true,hints:true,contrast:false,style:'balanced',think:250,adaptive:false,nickname:''};
export function usePlayPreferences(){
  const [prefs,setPrefs]=useState<PlayPreferences>(()=>{
    try{const p=JSON.parse(localStorage.getItem('qk-play-preferences-v1')||'null');if(!p||p.schema!==1)return defaults;
      return {...defaults,...Object.fromEntries(Object.keys(defaults).filter(k=>typeof p[k]===typeof defaults[k as keyof PlayPreferences]).map(k=>[k,p[k]])),think:Math.max(50,Math.min(1500,Number(p.think)||250)),style:['balanced','fox','tortoise','owl','beginner'].includes(p.style)?p.style:'balanced',nickname:String(p.nickname||'').replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,24)};
    }catch{return defaults;}
  });
  useEffect(()=>{
    document.body.dataset.quiet=String(prefs.quiet);document.body.dataset.left=String(prefs.left);
    document.body.dataset.motion=String(prefs.animate);document.body.dataset.contrast=String(prefs.contrast);
    try{localStorage.setItem('qk-play-preferences-v1',JSON.stringify(prefs));}catch{}
  },[prefs]);
  return {prefs,update:(patch:Partial<PlayPreferences>)=>setPrefs(p=>({...p,...patch}))};
}
export function PlaySettings({prefs,update}:{prefs:PlayPreferences;update:(p:Partial<PlayPreferences>)=>void}){
  return <section aria-label="Play preferences"><h3>Play your way</h3>
    {([['quiet','Quiet Mode'],['reactions','Receive / send quiet reactions'],['left','Left-handed controls'],['drag','Drag to move (tap always works)'],['confirm','Confirm each move'],['animate','Move animations'],['hints','Legal destination previews'],['contrast','High contrast'],['adaptive','Adaptive difficulty for local computer games']] as const).map(([key,label])=><label className="preference-row" key={key}><span>{label}</span><input type="checkbox" checked={prefs[key]} onChange={e=>update({[key]:e.target.checked})}/></label>)}
    <p className="settings-note">Quiet Mode keeps turn, check and connection warnings visible. Analysis remains available after play. Adaptive difficulty adjusts the next local game by one level after a win/loss; it never changes human games.</p>
    <label className="preference-row">Opponent style<select aria-label="Opponent style" value={prefs.style} onChange={e=>update({style:e.target.value as Style})}><option value="balanced">Balanced</option><option value="beginner">Beginner · forgiving</option><option value="fox">Fox · tactical</option><option value="tortoise">Tortoise · cautious</option><option value="owl">Owl · central / positional</option></select></label>
    <label className="preference-row">Engine thinking budget<select aria-label="Engine thinking budget" value={prefs.think} onChange={e=>update({think:Number(e.target.value)})}><option value="100">Battery saver · 100 ms</option><option value="250">Balanced · 250 ms</option><option value="750">Deeper · 750 ms</option><option value="1500">Maximum · 1.5 s</option></select></label>
    <p className="settings-note">One engine thread; 16 MB hash. Searches stop on background or navigation. Budgets are limits, not Elo ratings. Styles select among legal engine candidates within a declared centipawn tolerance.</p>
    <label className="preference-row">Guest nickname<input aria-label="Guest nickname" maxLength={24} value={prefs.nickname} onChange={e=>update({nickname:e.target.value.replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,24)})}/></label>
  </section>;
}
