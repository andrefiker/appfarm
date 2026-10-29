import {useId} from 'react';
import atlasUrl from './assets/faceted-pieces.png';
import {atlas} from './faceted-pieces';
export type Color = 'w' | 'b';
export type Kind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export const pieceNames: Record<Kind, string> = {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};

// The single approved ivory / lighter graphite army. SVG clipping reads from
// one bundled atlas, so board, promotion, captures and study use identical art.
export function Piece({color,kind,label}:{color:Color;kind:Kind;scope:string;label?:string}) {
 const id = `qk-faceted-${useId().replace(/[^a-zA-Z0-9_-]/g,'')}`;
 const sprite = atlas.sprites[`${color}${kind}` as keyof typeof atlas.sprites];
 return <svg className={`chess-art faceted-piece art-${color}`} viewBox={sprite.viewBox}
  data-piece-model={`${color==='w'?'ivory':'graphite'}-${pieceNames[kind]}`}
  role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} focusable="false">
  <defs><clipPath id={id} clipPathUnits="userSpaceOnUse"><path d={sprite.clip}/></clipPath></defs>
  <image href={atlasUrl} width={atlas.width} height={atlas.height} clipPath={`url(#${id})`}/>
 </svg>;
}
