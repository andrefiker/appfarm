import {useId} from 'react';
import type {Color,Kind} from './pieces';

const profiles: Record<Kind,string> = {
 p:'M24 83 Q25 77 33 75 Q40 67 42 59 L39 57 Q36 55 40 52 H43 A13 13 0 1 1 57 52 H60 Q64 55 61 57 L58 59 Q60 68 67 75 Q75 78 76 83Z',
 n:'M20 83 Q20 77 29 75 L34 69 Q30 54 38 41 Q46 27 59 23 L63 15 L68 26 Q77 30 80 39 L88 53 Q89 57 85 61 L80 64 Q76 65 72 61 L64 55 Q57 60 58 68 L70 74 Q79 76 80 83Z',
 b:'M24 83 Q25 77 33 75 Q41 68 42 51 L38 49 Q34 47 39 44 H44 Q35 39 38 31 Q41 23 50 15 Q61 22 64 31 Q67 39 56 44 H61 Q66 47 62 49 L58 51 Q59 68 67 75 Q75 78 76 83Z',
 r:'M23 83 Q24 77 32 75 L39 63 L39 47 L32 43 L30 29 H38 V35 H45 V29 H55 V35 H62 V29 H70 L68 43 L61 47 V63 L68 75 Q76 78 77 83Z',
 q:'M21 83 Q22 77 31 75 Q40 67 41 49 H37 Q33 46 38 43 L30 23 L41 29 L45 17 L50 27 L55 17 L59 29 L70 23 L62 43 Q67 46 63 49 H59 Q60 67 69 75 Q78 78 79 83Z',
 k:'M21 83 Q22 77 31 75 Q41 68 41 45 H37 Q33 43 37 39 H40 L32 24 Q39 21 47 21 V16 H41 V11 H47 V5 H53 V11 H59 V16 H53 V21 Q61 21 68 24 L60 39 H63 Q67 43 63 45 H59 Q59 68 69 75 Q78 78 79 83Z',
};
const palette = {
 w:{edge:'#62401f',shine:'#ffe3a8',start:'#855022',light:'#ebbc76',mid:'#bf8545',end:'#70401b',grain:'#7a471f'},
 b:{edge:'#161216',shine:'#bbb0a4',start:'#251a19',light:'#706360',mid:'#433634',end:'#181415',grain:'#b89b87'},
};
const rings: Record<Kind,number[]> = {p:[55,75],n:[73],b:[47,75],r:[43,75],q:[46,75],k:[42,75]};

export function StauntonArt({color,kind,fitToSquare}: {color:Color;kind:Kind;fitToSquare:boolean}) {
 const id=useId(), tone=palette[color];
 const g=id+'wood', clip=id+'crop';
 const low=kind==='p', base=low?20:kind==='b'?21:17;
 const foot=`M${base} 84 Q${base} 81 ${base+5} 80 H${95-base} Q${100-base} 81 ${100-base} 84 L${102-base} 93 Q${102-base} 97 ${97-base} 97 H${3+base} Q${base-2} 97 ${base-2} 93Z`;
 return <svg data-turned-wood="" x={fitToSquare?4:7} y={fitToSquare?0:2} width={fitToSquare?92:86} height={fitToSquare?100:96} viewBox="0 0 100 100" aria-hidden="true">
  <defs>
   <linearGradient id={g}><stop stopColor={tone.start}/><stop offset=".29" stopColor={tone.light}/><stop offset=".64" stopColor={tone.mid}/><stop offset="1" stopColor={tone.end}/></linearGradient>
   <clipPath id={clip}><path d={profiles[kind]}/><path d={foot}/></clipPath>
  </defs>
  <g fill={`url(#${g})`} stroke={tone.edge} strokeWidth="1.55" strokeLinejoin="round">
   <path d={profiles[kind]}/><path d={foot}/>
   {kind==='q' && [30,45,55,70].map((x,i)=><circle key={x} cx={x} cy={i===0||i===3?23:17} r="3"/>)}
  </g>
  <g clipPath={`url(#${clip})`} fill="none">
   <g stroke={tone.grain} strokeWidth=".48" opacity={color==='w'?'.28':'.19'}>
    {Array.from({length:7},(_,i)=><path key={i} d={`M${20+9*i} 7 Q${54-4*i} 39 ${24+8*i} 64 T${20+10*i} 99`}/>)}
   </g>
   <g stroke={tone.shine} strokeLinecap="round" opacity=".59" strokeWidth="1.5">
    {rings[kind].map(y=><path key={y} d={`M22 ${y} Q50 ${y+4} 78 ${y}`}/>)}
    <path d="M17 87 Q50 93 83 87 M16 93 Q50 97 84 93"/>
    {kind==='p' && <path d="M40 39 Q41 31 48 29"/>}
    {kind==='n' && <path d="M36 55 Q39 36 61 28 M42 59 Q45 46 53 42 M64 36 L70 38 M79 50 L82 52"/>}
    {kind==='b' && <path d="M44 36 Q43 29 48 23"/>}
    {kind==='k' && <path d="M35 26 Q50 22 65 26"/>}
   </g>
   <g stroke={tone.edge} strokeLinecap="round" strokeWidth="2.2">
    {kind==='b'&& <path d="M57 23 L48 35"/>}
    {kind==='n'&& <path d="M69 40 L70 40 M79 56 L82 56"/>}
   </g>
  </g>
 </svg>;
}
