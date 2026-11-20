import {StauntonArt} from './staunton-pieces';
import {ContrastGlyph} from './classic-pieces';
import './piece-accessibility.css';

export type Color = 'w' | 'b';
export type Kind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export const pieceNames: Record<Kind, string> = {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};

export function Piece({color,kind,label,fitToSquare=false}:{color:Color;kind:Kind;scope:string;label?:string;fitToSquare?:boolean}) {
 return <svg className={`chess-art sculptor-piece art-${color}`} viewBox={fitToSquare ? '3 0 94 100' : '0 0 100 100'}
  data-piece-model={`staunton-${color==='w'?'boxwood':'ebony'}-${pieceNames[kind]}`}
  role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} focusable="false">
   <StauntonArt color={color} kind={kind} fitToSquare={fitToSquare}/>
   <ContrastGlyph color={color} kind={kind}/>
 </svg>;
}
