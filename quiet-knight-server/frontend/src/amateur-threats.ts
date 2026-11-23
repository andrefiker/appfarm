import type {Chess, Color, Square} from 'chess.js';

// Mark attacked occupied squares for the requested side, or both sides by default. A red mark warns of an attack
// pattern, not a claim that the attacking side can legally move right now.
export function threatenedSquares(game: Chess, ownColor?: Color): Square[] {
 const marked = new Set<Square>();
 for (const row of game.board()) {
  for (const piece of row) {
   if(piece && (!ownColor||piece.color===ownColor) && game.isAttacked(piece.square,piece.color==='w'?'b':'w'))marked.add(piece.square);
  }
 }
 // En passant captures happen on a different square from the destination.
 const ep=game.fen().split(' ')[3];
 if(ep!=='-' && (!ownColor||game.turn()!==ownColor)){
  for(const move of game.moves({verbose:true})){
   if(move.isEnPassant())marked.add((move.to[0]+move.from[1]) as Square);
  }
 }
 return [...marked];
}

export function threatenedSquaresForBothSides(game: Chess): Square[] {
 return threatenedSquares(game);
}