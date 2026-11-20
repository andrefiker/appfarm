import sculptorAtlas from './assets/sculptor-atlas.png';

export type Color = 'w' | 'b';
export type Kind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export const pieceNames: Record<Kind, string> = {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};

const atlasSize = {width:1536, height:1024};
const kinds: readonly Kind[] = ['p','n','b','r','q','k'];
// Crops leave a few pixels of real alpha around each original sculpture.
const crops: Record<Color, readonly (readonly [number,number,number,number])[]> = {
 w: [[38,188,191,289],[274,92,215,385],[538,82,201,397],[784,142,219,337],[1044,78,211,401],[1294,20,215,459]],
 b: [[34,698,197,299],[270,598,219,399],[538,590,205,403],[784,650,223,349],[1046,586,217,413],[1294,526,221,473]],
};
const proportions: Record<Kind, readonly [number,number]> = {
 p:[65,66],n:[73,86],b:[63,87],r:[75,77],q:[75,88],k:[76,96],
};

export function Piece({color,kind,label,fitToSquare=false}:{color:Color;kind:Kind;scope:string;label?:string;fitToSquare?:boolean}) {
 const crop = crops[color][kinds.indexOf(kind)];
 const [width,height]=proportions[kind];
 const y=98-height;
 return <svg className={`chess-art sculptor-piece art-${color}`} viewBox={fitToSquare ? '3 0 94 100' : '0 0 100 100'}
  data-piece-model={`sculptor-${color==='w'?'ceramic':'basalt'}-${pieceNames[kind]}`}
  role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} focusable="false">
   <svg x={(100-width)/2} y={y} width={width} height={height} viewBox={crop.join(' ')} preserveAspectRatio="none" overflow="hidden">
    <image href={sculptorAtlas} width={atlasSize.width} height={atlasSize.height}/>
   </svg>
 </svg>;
}
