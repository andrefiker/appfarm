import {useEffect, useRef} from 'react';
import type {BoardMotion} from './board-effects';
import type {Kind} from './pieces';
import type {FunOptions} from './fun-options';

// Small synthesized gestures, with no samples, downloads, or looping audio.
const voices: Record<Kind, {wave: OscillatorType; pitch: number; end: number; beats: number[]}> = {
  p: {wave:'triangle',pitch:190,end:70,beats:[0]},
  n: {wave:'triangle',pitch:260,end:100,beats:[0,.10]},
  b: {wave:'sine',pitch:900,end:380,beats:[0,.06]},
  r: {wave:'triangle',pitch:130,end:42,beats:[0]},
  q: {wave:'sine',pitch:660,end:990,beats:[0,.10,.20]},
  k: {wave:'sine',pitch:440,end:330,beats:[0,.14]},
};
export function pieceSoundEnabled(fun: FunOptions, kind: Kind) {
  const keys = {p:'soundP',n:'soundN',b:'soundB',r:'soundR',q:'soundQ',k:'soundK'} as const;
  return fun.sounds && fun[keys[kind]];
}
export function usePersonalityAudio(motion: BoardMotion | null, enabled: boolean, volume: number, fun: FunOptions, observedSerial=motion?.serial) {
  const context = useRef<AudioContext | null>(null), active = useRef(new Set<OscillatorNode>());
  const current = useRef({enabled, volume, fun}); current.current = {enabled, volume, fun};
  const seen = useRef(motion?.serial);
  const stop = () => {for (const node of active.current) {try {node.stop();} catch {}} active.current.clear();};
  useEffect(() => {
    const unlock = () => {
      if (!current.current.enabled || !current.current.fun.sounds) return;
      try {
        context.current ||= new AudioContext();
        void context.current.resume().catch(() => undefined);
      } catch { /* Unsupported or blocked audio leaves gameplay intact. */ }
    };
    const hide = () => {if (document.hidden) stop();};
    document.addEventListener('pointerdown',unlock,{passive:true});
    document.addEventListener('keydown',unlock);
    document.addEventListener('visibilitychange',hide);
    window.addEventListener('qk-background',stop);
    return () => {
      document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);
      document.removeEventListener('visibilitychange',hide);window.removeEventListener('qk-background',stop);
      stop();void context.current?.close().catch(() => undefined);context.current=null;
    };
  }, []);
  useEffect(() => {
    const fresh = motion?.serial !== seen.current; seen.current=observedSerial;
    if (!enabled || !fun.sounds) {stop();return;}
    const ctx=context.current, kind=motion?.actor?.type;
    if (kind && !pieceSoundEnabled(fun,kind)) {stop();return;}
    if (!fresh || !kind || document.hidden || ctx?.state!=='running') return;
    const voice=voices[kind], level=Math.max(0,Math.min(1,volume/100))*.11;
    for (const beat of voice.beats) {
      const at=ctx.currentTime+(motion?.captured?.square ? .30 : .04)+beat;
      const node=ctx.createOscillator(), gain=ctx.createGain();
      node.type=voice.wave;node.frequency.setValueAtTime(voice.pitch,at);node.frequency.exponentialRampToValueAtTime(voice.end,at+.12);
      gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(level,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+.16);
      node.connect(gain);gain.connect(ctx.destination);active.current.add(node);
      node.onended=()=>{active.current.delete(node);node.disconnect();gain.disconnect();};
      node.start(at);node.stop(at+.17);
    }
  }, [motion,enabled,volume,fun,observedSerial]);
}
