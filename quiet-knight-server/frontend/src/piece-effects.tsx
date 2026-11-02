import {useEffect, useRef, useState} from 'react';
import {Piece} from './pieces';
import type {Color} from './pieces';
import type {BoardMotion} from './board-effects';

// One-second CSS effects get a short cleanup margin to finish their final frame.
const EFFECT_RETENTION_MS = 1050;

export function usePieceEffects(motion: BoardMotion | null, enabled: boolean, orientation: Color, winner?: Color | null, observedSerial = motion?.serial) {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [events, setEvents] = useState<(BoardMotion & {expires:number})[]>([]);
  const [victory, setVictory] = useState<Color | null>(null);
  const seen = useRef<number | null>(null), previousWinner = useRef(winner);
  const previousOrientation = useRef(orientation);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    const fresh = motion && motion.serial !== seen.current;
    const flipped = orientation !== previousOrientation.current;
    previousOrientation.current = orientation;
    seen.current = observedSerial ?? seen.current;
    if (!enabled || reduced || !motion || document.hidden) {setEvents([]);return;}
    if (fresh) {
      const touched = [motion.from,motion.to,motion.captured?.square,motion.rook?.from,motion.rook?.to].filter(Boolean);
      setEvents(old => [...old.filter(event => !flipped && event.expires > Date.now() &&
        ![event.from,event.to,event.captured?.square,event.rook?.from,event.rook?.to].some(square => square && touched.includes(square))),
        {...motion,expires:Date.now()+EFFECT_RETENTION_MS}].slice(-3));
    } else if (flipped) setEvents([]);
  }, [motion, observedSerial, enabled, reduced, orientation]);
  useEffect(() => {
    if (!events.length) return;
    const timer = window.setTimeout(() => setEvents(old=>old.filter(event=>event.expires>Date.now())), Math.max(0,Math.min(...events.map(event=>event.expires))-Date.now()));
    return () => window.clearTimeout(timer);
  }, [events]);
  useEffect(() => {
    const hide = () => {if (document.hidden) {setEvents([]);setVictory(null);}};
    document.addEventListener('visibilitychange',hide);
    return () => document.removeEventListener('visibilitychange',hide);
  }, []);
  useEffect(() => {
    const fresh = winner && winner !== previousWinner.current;
    previousWinner.current = winner;
    setVictory(enabled && !reduced && fresh ? winner : null);
    const timer = window.setTimeout(() => setVictory(null), EFFECT_RETENTION_MS);
    return () => window.clearTimeout(timer);
  }, [winner, enabled, reduced, orientation]);
  return {events: enabled && !reduced ? events : [], victory: enabled && !reduced ? victory : null};
}

export function CaptureEffect({motion}: {motion: BoardMotion}) {
  if (!motion.captured) return null;
  return <span className="capture-ghost" aria-hidden="true" data-effect="capture">
    {[0,1,2].map(shard => <span className={`capture-shard shard-${shard}`} key={shard}>
      <Piece color={motion.captured!.color} kind={motion.captured!.type} fitToSquare scope={`capture-${shard}`} />
    </span>)}
  </span>;
}

export function LandingEffect({motion}: {motion: BoardMotion}) {
  return <>
    {motion.captured ? <span className={`strike-effect strike-${motion.actor?.type || 'p'}`} aria-hidden="true" data-effect={`attack-${motion.actor?.type || 'p'}`}><i/><i/><i/></span> : null}
    {motion.actor?.type === 'n' ? <span className="knight-dust" aria-hidden="true" data-effect="knight-dust"><i/><i/><i/></span> : null}
    {motion.promotion && motion.actor ? <span className="promotion-effect" aria-hidden="true" data-effect="promotion"><span className="promotion-pawn"><Piece color={motion.actor.color} kind="p" fitToSquare scope="promotion-ghost"/></span><i className="promotion-swirl"/></span> : null}
  </>;
}
