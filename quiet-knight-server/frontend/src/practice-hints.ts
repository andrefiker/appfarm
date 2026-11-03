// Hand-authored hints for the existing local teaching positions. Never used in live rooms.
export const puzzleLadder = [
 ['Look at the relationship between Black’s king and queen.','Find a knight move that attacks both, with check.','Nf6+ · d5 → f6'],
 ['Black’s queen stands directly in front of its king.','Bring the rook onto their shared file to pin the queen.','Re1 · a1 → e1'],
 ['Black’s king and queen share a file, with the king in front.','Check along that file and inspect the queen behind it.','Re1+ · a1 → e1'],
 ['Your bishop is blocking your rook’s line to the king.','Move the bishop away while the rook delivers check.','Bb5+ · e2 → b5'],
 ['Black’s own pawns restrict its king’s escape squares.','Bring your rook onto the back rank.','Re8# · e1 → e8'],
 ['The black king and queen can be attacked by a knight at once.','Promote to a knight instead of a queen.','g8=N+ · g7 → g8, choose knight'],
] as const;
export const endgameLadder = [
 ['The enemy king is confined to a corner. Avoid stalemate.','Use your king’s protection to bring the queen closer.','Qg7# · g6 → g7'],
 ['Your king already controls the escape squares.','Bring the rook onto the enemy king’s file.','Rh1# · a1 → h1'],
 ['Your pawn is one square from promotion.','Advance the pawn and compare all four promotion choices.','e8=Q · e7 → e8, choose queen'],
 ['Your rook supports a passed pawn near promotion.','Advance the pawn while preserving rook support.','a8=Q · a7 → a8, choose queen'],
] as const;
