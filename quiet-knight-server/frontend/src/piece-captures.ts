import {Chess} from 'chess.js';
import type {Position} from './chess-ui';

// Replaying the canonical move list gives each piece a stable identity without
// changing the chess position or adding private state to the server.
export function pieceCaptureCounts(sans:string[], expected?:Position, startFen?:string):Record<string,number> {
 try {
  const game=new Chess(startFen), counts:Record<string,number>={};
  for(const san of sans){
   const move=game.move(san);if(!move)throw Error('Invalid move');
   const previous=counts[move.from]||0;
   delete counts[move.from];
   if(move.flags.includes('e')){
    const captured=move.to[0]+move.from[1];delete counts[captured];
   }
   delete counts[move.to];
   const total=previous+(move.captured?1:0);if(total)counts[move.to]=total;
   if(move.flags.includes('k')||move.flags.includes('q')){
    const rank=move.color==='w'?'1':'8', kingSide=move.flags.includes('k');
    const from=(kingSide?'h':'a')+rank,to=(kingSide?'f':'d')+rank;
    const rook=counts[from]||0;delete counts[from];delete counts[to];if(rook)counts[to]=rook;
   }
  }
  if(expected){for(const row of game.board())for(const cell of row){if(!cell)continue;const piece=expected[cell.square];if(!piece||piece.color!==cell.color||piece.type!==cell.type)return {};}
   if(Object.keys(expected).length!==game.board().flat().filter(Boolean).length)return {};
  }
  return counts;
 } catch {return {};}
}
