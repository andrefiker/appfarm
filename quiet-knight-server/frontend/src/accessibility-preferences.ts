export type PieceStyle='sculptor'|'contrast';
export type SoundCue='move'|'capture'|'check';
export type SoundCues=Record<SoundCue,boolean>;
export function readPieceStyle(raw:unknown):PieceStyle{return raw==='contrast'?'contrast':'sculptor';}
export function readSoundCues(raw:unknown):SoundCues{
 const value=raw&&typeof raw==='object'?raw as Partial<SoundCues>:{};
 return {move:typeof value.move==='boolean'?value.move:true,
  capture:typeof value.capture==='boolean'?value.capture:true,
  check:typeof value.check==='boolean'?value.check:true};
}
// Exactly one sound for one move. An enabled check cue takes priority.
export function soundCue(prefs:SoundCues,capture:boolean,check:boolean):SoundCue|null{
 if(check&&prefs.check)return 'check';
 const base=capture?'capture':'move';
 return prefs[base]?base:null;
}
