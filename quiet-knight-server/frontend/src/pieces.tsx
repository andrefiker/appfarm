import sculptorAtlas from './assets/sculptor-atlas.png';

export type Color = 'w' | 'b';
export type Kind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export const pieceNames: Record<Kind, string> = {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};

const atlasSize = {width:1536, height:1024};
const kinds: readonly Kind[] = ['p','n','b','r','q','k'];
// Crops leave a few pixels of real alpha around each original sculpture.
const crops: Record<Color, readonly (readonly [number,number,number,number])[]> = {
 w: [[27,147,214,331],[280,86,222,392],[542,48,214,430],[782,118,222,358],[1034,46,232,430],[1300,14,214,464]],
 b: [[26,656,216,340],[278,590,228,402],[542,564,214,432],[780,626,226,372],[1034,556,234,440],[1298,522,220,474]],
};
const proportions: Record<Kind, readonly [number,number]> = {
 p:[65,66],n:[73,86],b:[58,87],r:[75,77],q:[80,88],k:[73,96],
};

export function Piece({color,kind,label,fitToSquare=false}:{color:Color;kind:Kind;scope:string;label?:string;fitToSquare?:boolean}) {
 const crop = crops[color][kinds.indexOf(kind)];
 const [width,baseHeight]=proportions[kind];
 // Board pieces grow vertically from a shared baseline; leave clearance at the top.
 const height=fitToSquare ? Math.min(97,Math.round(baseHeight*1.08)) : baseHeight;
 const y=98-height;
 return <svg className={`chess-art sculptor-piece art-${color}`} viewBox={fitToSquare ? '3 0 94 100' : '0 0 100 100'}
  data-piece-model={`sculptor-${color==='w'?'ceramic':'basalt'}-${pieceNames[kind]}`}
  role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} focusable="false">
   <svg x={(100-width)/2} y={y} width={width} height={height} viewBox={crop.join(' ')} preserveAspectRatio="none" overflow="hidden">
    <image href={sculptorAtlas} width={atlasSize.width} height={atlasSize.height}/>
   </svg>
 </svg>;
}
