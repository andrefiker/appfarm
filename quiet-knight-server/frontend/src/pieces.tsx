import {useId} from 'react';
export type Color = 'w' | 'b';
export type Kind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export const pieceNames: Record<Kind, string> = {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};

// Original Staunton artwork. Each army uses the same 100×100 geometry.
// Width is authored into the silhouette, never a non-uniform image transform.
const shapes: Record<Kind, string[]> = {
 p: ['M36 46C19 34 28 12 50 12S81 34 64 46L66 53H34Z', 'M37 53H63L59 61Q59 70 70 78H30Q41 70 41 61Z'],
 r: ['M23 15H36V28H44V15H56V28H64V15H77V41H23Z', 'M29 41H71L66 49H34Z', 'M35 49H65L62 65L71 78H29L38 65Z'],
 n: ['M27 78L32 60L40 48L25 52L17 44L29 25L44 18L48 8L58 18Q78 29 78 51Q78 65 69 78Z'],
 b: ['M50 8Q28 26 28 38Q28 51 50 53Q72 51 72 38Q72 26 50 8Z', 'M34 54H66L61 62Q62 71 71 78H29Q38 71 39 62Z'],
 q: ['M22 28L36 39L50 18L64 39L78 28L69 58H31Z', 'M31 58H69L65 65L72 78H28L35 65Z'],
 k: ['M44 5H56V15H67V25H56V35H44V25H33V15H44Z', 'M28 41Q50 27 72 41L66 60H34Z', 'M34 60H66L63 67L73 78H27L37 67Z'],
};
const base = 'M25 78H75L82 85V94H18V85Z';
export function Piece({color,kind,label}:{color:Color;kind:Kind;scope:string;label?:string;fitToSquare?:boolean}) {
 const id='qk-clear-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const white=color==='w', edge=white?'#493424':'#c4c8be', line=white?'#795638':'#c4c8be';
 return <svg className={`chess-art clear-piece art-${color}`} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"
  data-piece-model={`${white?'ivory':'graphite'}-${pieceNames[kind]}`} data-piece-style="clear-staunton"
  role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} focusable="false">
  <defs>
   <linearGradient id={id} x1="0" y1="0" x2="1" y2=".25">
    <stop offset="0" stopColor={white?'#d5aa6e':'#20282d'}/><stop offset=".35" stopColor={white?'#fff8df':'#59636a'}/><stop offset=".6" stopColor={white?'#f4dfaf':'#303b42'}/><stop offset="1" stopColor={white?'#c5975d':'#152027'}/>
   </linearGradient>
  </defs>
  <g fill={`url(#${id})`} stroke={edge} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
   {shapes[kind].map((d,i)=><path key={i} d={d}/>)}
   {kind==='q'?<><circle cx="21" cy="23" r="5"/><circle cx="50" cy="13" r="5"/><circle cx="79" cy="23" r="5"/></>:null}
   <path d={base}/>
  </g>
  <path d="M21 88H79" stroke={white?'#fff5ce':'#d3ad66'} strokeWidth="3"/>
  <path d="M26 81H74" fill="none" stroke={line} strokeWidth="2" strokeLinecap="round"/>
  {kind==='b'?<path d="M57 21L43 38" stroke={line} strokeWidth="4" strokeLinecap="round"/>:null}
  {kind==='n'?<><path d="M57 28Q70 40 64 60L57 72M33 43L42 41" fill="none" stroke={line} strokeWidth="2.5" strokeLinecap="round"/><circle cx="44" cy="30" r="3" fill={white?'#493424':'#f0e7c9'}/></>:null}
  {kind==='r'?<path d="M36 45H64" stroke={line} strokeWidth="2"/>:null}
 </svg>;
}
