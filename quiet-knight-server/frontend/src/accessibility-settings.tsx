import type {PieceStyle,SoundCues} from './accessibility-preferences';
export function PieceStyleSetting({value,onChange}:{value:PieceStyle;onChange:(v:PieceStyle)=>void}){
 return <label className="preference-row"><span>Piece style</span>
  <select aria-label="Piece style" value={value} onChange={e=>onChange(e.target.value==='contrast'?'contrast':'sculptor')}>
   <option value="sculptor">Staunton (default)</option><option value="contrast">High-contrast silhouettes</option>
  </select>
 </label>;
}
export function SoundCueSettings({value,onChange}:{value:SoundCues;onChange:(v:SoundCues)=>void}){
 return <fieldset className="sound-cue-options"><legend>Sound cues</legend>
  {([['move','Ordinary moves'],['capture','Captures'],['check','Check']] as const).map(([cue,label])=>
   <label className="preference-row" key={cue}><span>{label}</span><input type="checkbox" checked={value[cue]} onChange={e=>onChange({...value,[cue]:e.target.checked})}/></label>)}
  <p className="settings-note">Only one cue per move. Check takes priority when enabled. Game sounds switches them all off without resetting your choices.</p>
 </fieldset>;
}
