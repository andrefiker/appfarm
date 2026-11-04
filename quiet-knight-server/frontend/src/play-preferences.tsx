import {useEffect,useState} from 'react';
import {funDefaults,readFunOptions} from './fun-options';
import type {FunOptions} from './fun-options';
import {readSoundTheme} from './sound-themes';
import type {SoundTheme} from './sound-themes';
import type {Weather} from './extra-fun';
import type {Style} from './offline-engine';
export type PlayPreferences={schema:1;hintsRevision:number;battery:boolean;rematchColors:'same'|'swap';textSize:'standard'|'large';coordinates:boolean;fun:FunOptions;weather:Weather;soundTheme:SoundTheme;quiet:boolean;reactions:boolean;left:boolean;drag:boolean;confirm:boolean;animate:boolean;playful:boolean;hints:boolean;contrast:boolean;style:Style;think:number;adaptive:boolean;nickname:string};
const defaults:PlayPreferences={schema:1,hintsRevision:2,battery:false,rematchColors:'swap',textSize:'standard',coordinates:false,fun:funDefaults,weather:'off',soundTheme:'classic',quiet:false,reactions:false,left:false,drag:true,confirm:false,animate:true,playful:true,hints:true,contrast:false,style:'balanced',think:250,adaptive:false,nickname:''};
export function usePlayPreferences(){
  const [prefs,setPrefs]=useState<PlayPreferences>(()=>{
    try{const p=JSON.parse(localStorage.getItem('qk-play-preferences-v1')||'null');if(!p||p.schema!==1)return defaults;
      return {...defaults,...Object.fromEntries(Object.keys(defaults).filter(k=>typeof p[k]===typeof defaults[k as keyof PlayPreferences]).map(k=>[k,p[k]])),hintsRevision:2,hints:p.hintsRevision===2&&typeof p.hints==='boolean'?p.hints:true,rematchColors:p.rematchColors==='same'?'same':'swap',textSize:p.textSize==='large'?'large':'standard',fun:readFunOptions(p.fun),weather:['rain','dust','fireflies'].includes(p.weather)?p.weather:'off',soundTheme:readSoundTheme(p.soundTheme),think:Math.max(50,Math.min(1500,Number(p.think)||250)),style:['balanced','fox','tortoise','owl','beginner'].includes(p.style)?p.style:'balanced',nickname:String(p.nickname||'').replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,24)};
    }catch{return defaults;}
  });
  useEffect(()=>{
    document.body.dataset.battery=String(prefs.battery);document.body.dataset.textSize=prefs.textSize;document.body.dataset.coordinates=String(prefs.coordinates);
    document.body.dataset.quiet=String(prefs.quiet);document.body.dataset.left=String(prefs.left);
    document.body.dataset.motion=String(prefs.animate);document.body.dataset.contrast=String(prefs.contrast);
    try{localStorage.setItem('qk-play-preferences-v1',JSON.stringify(prefs));}catch{}
  },[prefs]);
  return {prefs,update:(patch:Partial<PlayPreferences>)=>setPrefs(p=>({...p,...patch}))};
}
export function PlaySettings({prefs,update}:{prefs:PlayPreferences;update:(p:Partial<PlayPreferences>)=>void}){
  return <section aria-label="Play preferences"><h3>Play your way</h3>
    {([['quiet','Quiet Mode'],['battery','Battery saver'],['reactions','Receive / send quiet reactions'],['left','Left-handed controls'],['drag','Drag to move (tap always works)'],['confirm','Confirm each move'],['animate','Move animations'],['playful','Playful piece effects'],['hints','Legal destination previews'],['contrast','High contrast'],['coordinates','Square coordinates'],['adaptive','Adaptive difficulty for local computer games']] as const).map(([key,label])=><label className="preference-row" key={key}><span>{label}</span><input type="checkbox" checked={prefs[key]} onChange={e=>update({[key]:e.target.checked})}/></label>)}
    <label className="preference-row">Text size<select aria-label="Text size" value={prefs.textSize} onChange={e=>update({textSize:e.target.value as PlayPreferences['textSize']})}><option value="standard">Standard</option><option value="large">Large</option></select></label>
    <label className="preference-row">Rematch colors<select aria-label="Rematch colors" value={prefs.rematchColors} onChange={e=>update({rematchColors:e.target.value as 'same'|'swap'})}><option value="swap">Swap sides</option><option value="same">Keep sides</option></select></label>
    <p className="settings-note">Battery saver pauses decorative effects and limits computer searches to 100 ms. Your separate animation and thinking preferences are restored when it is switched off.</p>
    <details className="fun-settings"><summary>Fun extras</summary>
      {([['comic','Comic capture labels'],['replay','Capture replay button'],['tray','Captured-piece landing'],['sneak','En passant sneak'],['crown','Promotion crown'],['revenge','Recapture spark'],['poses','Checkmate piece poses'],['handshake','Draw handshake'],['entrance','Rematch entrance'],['sounds','Personality sounds']] as const).map(([key,label])=><label className="preference-row" key={key}><span>{label}</span><input type="checkbox" checked={prefs.fun[key]} onChange={e=>update({fun:{...prefs.fun,[key]:e.target.checked}})}/></label>)}
      <details className="extra-fun-settings"><summary>More character</summary>
      {([['survivor','Last-pawn headband'],['dodge','King escape dodge'],['trails','Long-move trails'],['hoofprints','Knight hoofprints'],['graduation','Pawn graduation details'],['indignation','Royal indignation'],['photo','Victory photograph'],['movie','Whole-game movie'],['audience','Captured-piece audience'],['easter','Playful home knight']] as const).map(([key,label])=><label className="preference-row" key={key}><span>{label}</span><input type="checkbox" checked={prefs.fun[key]} onChange={e=>update({fun:{...prefs.fun,[key]:e.target.checked}})}/></label>)}
      <label className="preference-row">Board weather<select aria-label="Board weather" value={prefs.weather} onChange={e=>update({weather:e.target.value as Weather})}><option value="off">Off</option><option value="rain">Rain</option><option value="dust">Drifting dust</option><option value="fireflies">Fireflies</option></select></label>
      <label className="preference-row">Move sound theme<select aria-label="Move sound theme" value={prefs.soundTheme} onChange={e=>update({soundTheme:e.target.value as SoundTheme})}><option value="classic">Classic</option><option value="wood">Wooden clicks</option><option value="marble">Marble clacks</option><option value="orchestra">Tiny orchestra</option><option value="cartoon">Cartoon</option></select></label>
      <p className="settings-note">Weather stays at the edges. Badges are cosmetic. Movies are read-only. Sound themes require move sounds; piece personality sounds keep their own voices.</p>
      </details>
      <p className="settings-note">Move effects last one second. Replay is a separate view and never changes the match. Personality sounds also require move sounds to be enabled.</p>
      <details><summary>Choose piece sounds</summary>{([['soundP','Pawn thud'],['soundN','Knight hoofbeats'],['soundB','Bishop sweep'],['soundR','Rook rumble'],['soundQ','Queen chime'],['soundK','King clang']] as const).map(([key,label])=><label className="preference-row" key={key}><span>{label}</span><input type="checkbox" checked={prefs.fun[key]} onChange={e=>update({fun:{...prefs.fun,[key]:e.target.checked}})}/></label>)}</details>
    </details>
    <p className="settings-note">Playful effects add brief captures, leaps and celebrations. Move animations must be on; Quiet Mode and reduced motion suppress these effects.</p>
    <p className="settings-note">Quiet Mode keeps turn, check and connection warnings visible. Analysis remains available after play. Adaptive difficulty adjusts the next local game by one level after a win/loss; it never changes human games.</p>
    <label className="preference-row">Opponent style<select aria-label="Opponent style" value={prefs.style} onChange={e=>update({style:e.target.value as Style})}><option value="balanced">Balanced</option><option value="beginner">Beginner · forgiving</option><option value="fox">Fox · tactical</option><option value="tortoise">Tortoise · cautious</option><option value="owl">Owl · central / positional</option></select></label>
    <label className="preference-row">Engine thinking budget<select aria-label="Engine thinking budget" value={prefs.think} onChange={e=>update({think:Number(e.target.value)})}><option value="100">Battery saver · 100 ms</option><option value="250">Balanced · 250 ms</option><option value="750">Deeper · 750 ms</option><option value="1500">Maximum · 1.5 s</option></select></label>
    <p className="settings-note">One engine thread; 16 MB hash. Searches stop on background or navigation. Budgets are limits, not Elo ratings. Styles select among legal engine candidates within a declared centipawn tolerance.</p>
    <label className="preference-row">Guest nickname<input aria-label="Guest nickname" maxLength={24} value={prefs.nickname} onChange={e=>update({nickname:e.target.value.replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,24)})}/></label>
  </section>;
}
