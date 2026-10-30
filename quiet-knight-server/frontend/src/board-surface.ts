import artwork from './assets/emerald-enamel-reference.png';

// Original approved preview pixels, rendered through a viewport rather than
// regenerated. Only the 32 empty squares in Emerald Enamel's middle ranks are
// sampled: no title, other board, or stationary piece can leak into a game.
export const ENAMEL_ARTWORK = artwork;
export const ENAMEL_SOURCE = {width:1024,height:1536,tile:52} as const;
export function enamelViewport(square:string) {
 const file=square.charCodeAt(0)-97, row=8-Number(square[1]);
 const sampleRow=row<2?row+2:row>5?row-4:row;
 return {x:546+file*52,y:63+sampleRow*52,size:52};
}
export function enamelStyle(square:string) {
 const {x,y,size}=enamelViewport(square);
 return {
  backgroundImage:`url("${artwork}")`,
  backgroundSize:`${ENAMEL_SOURCE.width/size*100}% ${ENAMEL_SOURCE.height/size*100}%`,
  backgroundPosition:`${x/(ENAMEL_SOURCE.width-size)*100}% ${y/(ENAMEL_SOURCE.height-size)*100}%`,
  backgroundRepeat:'no-repeat',
 };
}
