import { useId } from 'react';

export type Color = 'w' | 'b';
export type Kind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export const pieceNames: Record<Kind, string> = {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};

// Sculptor: original, softly rounded turned forms with inset tool marks.
const forms: Record<Kind, { body: string; mark: string }> = {
 p: {body:'M50 23a13 13 0 1 1 0 26 13 13 0 0 1 0-26ZM42 49h16l3 9 9 15H30l9-15Z',mark:'M44 29q-5 4-5 8M42 55h16'},
 n: {body:'M27 73q2-16 13-25l-11-2-10-10 16-15 6-12 8 8q19 1 27 18l-1 38Z',mark:'M44 27h3M55 23q15 11 14 32M25 36l7 4'},
 b: {body:'M50 8q11 11 15 20 6 15-8 24l3 6 10 15H30l10-15 3-6q-14-9-8-24 4-9 15-20Z',mark:'M54 24l-11 14M42 57h16'},
 r: {body:'M24 18h12v10h8V18h12v10h8V18h12v17l-8 10v15l7 13H25l7-13V45l-8-10Z',mark:'M33 38h34M37 47v13'},
 q: {body:'M22 24l14 13 14-20 14 20 14-13-11 28-5 3 9 18H29l9-18-5-3Z M18 20a4 4 0 1 1 8 0 4 4 0 0 1-8 0ZM46 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0ZM74 20a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z',mark:'M37 52h26M43 60h14'},
 k: {body:'M46 8h8v7h8v8h-8v8h-8v-8h-8v-8h8ZM29 37q11-12 21 0 10-12 21 0l-5 15-6 4 9 17H31l9-17-6-4Z',mark:'M41 51h18M43 58h14'},
};

export function Piece({color,kind,label,fitToSquare=false}:{color:Color;kind:Kind;scope:string;label?:string;fitToSquare?:boolean}) {
 const id = 'sculptor-' + useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const ceramic = color === 'w';
 const tones = ceramic ? ['#fff8e8','#d7c4a5','#a18061'] : ['#81766c','#38322f','#171615'];
 const f = forms[kind];
 return <svg className={`chess-art sculptor-piece art-${color}`} viewBox={fitToSquare ? '9 3 82 91' : '0 0 100 100'}
  data-piece-model={`sculptor-${ceramic?'ceramic':'basalt'}-${pieceNames[kind]}`}
  role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} focusable="false">
  <defs><linearGradient id={id} x1="5%" y1="5%" x2="82%" y2="100%"><stop stopColor={tones[0]}/><stop offset=".54" stopColor={tones[1]}/><stop offset="1" stopColor={tones[2]}/></linearGradient></defs>
  <ellipse cx="51" cy="86" rx="34" ry="6" fill="#110e0d" opacity=".27"/>
  <g fill={`url(#${id})`} stroke={ceramic?'#765940':'#a79887'} strokeWidth={ceramic?1.4:1.15} strokeLinejoin="round">
   <path d={f.body}/><path d="M31 72h38l6 7q8 2 8 7-33 9-66 0 0-5 8-7Z"/>
  </g>
  <path d={f.mark+'M28 80q22 4 44 0'} stroke={ceramic?'#fff4db':'#b4a99b'} fill="none" strokeLinecap="round" strokeWidth="1.35" opacity=".64"/>
 </svg>;
}
