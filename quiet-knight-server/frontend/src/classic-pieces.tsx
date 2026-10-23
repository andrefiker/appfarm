import type {Color,Kind} from './pieces';
// Original vector Staunton silhouettes, authored for Quiet Knight.
const heads:Record<Kind,string>={
  p:'M34 39a16 16 0 1 1 32 0a16 16 0 1 1-32 0M36 57h28l-5 12H41Z',
  r:'M25 18h12v13h8V18h10v13h8V18h12v28H25ZM32 46h36l-6 24H38Z',
  n:'M31 70l5-22-13-4 9-23 18-9 15 13 8 24-4 21ZM34 33l14-8M57 28h1',
  b:'M50 12Q22 35 34 48l16 8 16-8Q78 35 50 12ZM54 23l-9 16M37 58h26l-4 12H41Z',
  q:'M22 25l11 40h34l11-40-17 13-11-20-11 20ZM21 19h2M49 12h2M77 19h2',
  k:'M50 10v22M40 20h20M32 38q18-13 36 0l-5 27H37ZM35 69h30',
};
export function ClassicPiece({color,kind,label}:{color:Color;kind:Kind;label?:string}){
  return <svg className="chess-art classic-piece" viewBox="0 0 100 100" role={label?'img':undefined} aria-label={label} aria-hidden={!label} focusable="false"><g fill={color==='w'?'#fff9e9':'#162329'} stroke={color==='w'?'#18242b':'#f7edcd'} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d={heads[kind]}/><path d="M35 70h30l5 9H30ZM25 81h50v10H25Z"/></g></svg>;
}
