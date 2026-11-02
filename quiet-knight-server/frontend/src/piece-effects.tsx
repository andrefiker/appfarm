import {useEffect, useRef, useState} from 'react';
import {Piece} from './pieces';
import type {Color} from './pieces';
import type {BoardMotion} from './board-effects';
import type {FunOptions} from './fun-options';

// One-second CSS effects get a short cleanup margin to finish their final frame.
const EFFECT_RETENTION_MS = 1050;

export function usePieceEffects(motion: BoardMotion | null, enabled: boolean, orientation: Color, winner?: Color | null, observedSerial = motion?.serial, draw = false, entrance = 0) {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [events, setEvents] = useState<(BoardMotion & {expires:number})[]>([]);
  const [victory, setVictory] = useState<Color | null>(null);
  const [handshake, setHandshake] = useState(false), [arriving, setArriving] = useState(false);
  const previousDraw = useRef(draw), previousEntrance = useRef(0);
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
    const hide = () => {if (document.hidden) {setEvents([]);setVictory(null);setHandshake(false);setArriving(false);}};
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
  useEffect(() => {
    const fresh = draw && !previousDraw.current;previousDraw.current=draw;
    setHandshake(Boolean(enabled && !reduced && !document.hidden && fresh));
    const timer=window.setTimeout(()=>setHandshake(false),EFFECT_RETENTION_MS);
    return ()=>window.clearTimeout(timer);
  }, [draw,enabled,reduced,orientation]);
  useEffect(() => {
    const fresh = entrance > 0 && entrance !== previousEntrance.current;previousEntrance.current=entrance;
    setArriving(Boolean(enabled && !reduced && !document.hidden && fresh));
    const timer=window.setTimeout(()=>setArriving(false),EFFECT_RETENTION_MS);
    return ()=>window.clearTimeout(timer);
  }, [entrance,enabled,reduced,orientation]);
  const allowed=enabled && !reduced;
  return {events: allowed ? events : [], victory: allowed ? victory : null, handshake:allowed && handshake, arriving:allowed && arriving, allowed};
}

export function CaptureEffect({motion, sneak = false}: {motion: BoardMotion; sneak?: boolean}) {
  if (!motion.captured) return null;
  return <span className={`capture-ghost${sneak ? ' capture-sneak' : ''}`} aria-hidden="true" data-effect="capture">
    {[0,1,2].map(shard => <span className={`capture-shard shard-${shard}`} key={shard}>
      <Piece color={motion.captured!.color} kind={motion.captured!.type} fitToSquare scope={`capture-${shard}`} />
    </span>)}
  </span>;
}

export function LandingEffect({motion, fun}: {motion: BoardMotion; fun: FunOptions}) {
  return <>
    {motion.captured ? <span className={`strike-effect strike-${motion.actor?.type || 'p'}`} aria-hidden="true" data-effect={`attack-${motion.actor?.type || 'p'}`}><i/><i/><i/></span> : null}
    {motion.actor?.type === 'n' ? <span className="knight-dust" aria-hidden="true" data-effect="knight-dust"><i/><i/><i/></span> : null}
    {motion.promotion && motion.actor ? <span className="promotion-effect" aria-hidden="true" data-effect="promotion"><span className="promotion-pawn"><Piece color={motion.actor.color} kind="p" fitToSquare scope="promotion-ghost"/></span><i className="promotion-swirl"/></span> : null}
    {motion.captured && fun.comic ? <span className="comic-impact" aria-hidden="true" data-effect="comic">{({p:'BONK!',n:'HOP!',b:'SWISH!',r:'CLANG!',q:'BOOM!',k:'AHEM!'} as const)[motion.actor?.type || 'p']}</span> : null}
    {motion.revenge && fun.revenge ? <span className="revenge-spark" aria-hidden="true" data-effect="revenge">✦</span> : null}
    {motion.captured && motion.captured.square !== motion.to && fun.sneak ? <span className="sneak-trail" aria-hidden="true" data-effect="sneak"><i/><i/></span> : null}
    {motion.promotion && fun.crown ? <svg className="promotion-crown" viewBox="0 0 40 26" aria-hidden="true" data-effect="crown"><path d="M4 5 12 12 20 2 28 12 36 5 32 23H8Z"/></svg> : null}
  </>;
}
