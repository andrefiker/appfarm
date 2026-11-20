import type {Chess, Square} from 'chess.js';

// Mark attacked occupied squares for both sides. A red mark warns of an attack
// pattern, not a claim that the attacking side can legally move right now.
export function threatenedSquares(game: Chess): Square[] {
 const marked = new Set<Square>();
 for (const row of game.board()) {
  for (const piece of row) {
   if(piece && game.isAttacked(piece.square,piece.color==='w'?'b':'w'))marked.add(piece.square);
  }
 }
 // En passant captures happen on a different square from the destination.
 const ep=game.fen().split(' ')[3];
 if(ep!=='-'){
  for(const move of game.moves({verbose:true})){
   if(move.isEnPassant())marked.add((move.to[0]+move.from[1]) as Square);
  }
 }
 return [...marked];
}