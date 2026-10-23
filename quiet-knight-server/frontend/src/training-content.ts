// Original, deliberately small teaching set authored for Quiet Knight (CC0).
// Continuations are curated, not a statistical game database.
export const puzzles=[
 {name:'Fork · royal double attack',fen:'4k1q1/8/8/3N4/8/8/8/4K3 w - - 0 1',solution:['d5f6'],hint:'Find a knight check that also attacks the queen.',explanation:'Nf6+ attacks the king on e8 and queen on g8. Black must answer the check.',theme:'fork',difficulty:1},
 {name:'Pin · use the open file',fen:'4k3/4q3/8/8/8/8/8/R5K1 w - - 0 1',solution:['a1e1'],hint:'Place the rook on the king and queen’s file.',explanation:'Re1 pins the queen on e7 to the king on e8. A pinned piece cannot expose its king.',theme:'pin',difficulty:1},
 {name:'Skewer · king in front',fen:'4q3/8/4k3/8/8/8/8/R5K1 w - - 0 1',solution:['a1e1'],hint:'Check along the e-file.',explanation:'Re1+ puts the king in front of its queen. After the king moves, the rook may win the queen; examine Black’s replies.',theme:'skewer',difficulty:2},
 {name:'Discovered check',fen:'4k3/8/8/q7/8/8/4B3/4R1K1 w - - 0 1',solution:['e2b5'],hint:'Move the bishop off the rook’s file.',explanation:'Bb5+ uncovers the rook on e1. The rook gives check while the bishop develops.',theme:'discovered attack',difficulty:2},
 {name:'Back-rank mate',fen:'6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',solution:['e1e8'],hint:'The king has no flight square behind its pawns.',explanation:'Re8# attacks across the eighth rank. The black pawns block every escape square.',theme:'mate pattern',difficulty:1},
 {name:'Underpromotion fork',fen:'8/4k1P1/5q2/8/8/8/8/1K6 w - - 0 1',solution:['g7g8n'],hint:'A knight promotion can give check and attack the queen.',explanation:'g8=N+ forks the king on e7 and queen on f6. Underpromotion changes the attack pattern.',theme:'fork / underpromotion',difficulty:3},
] as const;
export const openings=[
 {name:'Italian Game',moves:['e4','e5','Nf3','Nc6','Bc4'],note:'Develop toward the centre, then consider castling. Curated line; no frequency statistics.'},
 {name:'Ruy Lopez',moves:['e4','e5','Nf3','Nc6','Bb5'],note:'The bishop pressures the knight defending e5.'},
 {name:'Queen’s Gambit',moves:['d4','d5','c4'],note:'Challenge the central d5 pawn from the flank.'},
 {name:'Sicilian Defence',moves:['e4','c5'],note:'Black contests d4 asymmetrically.'},
 {name:'French Defence',moves:['e4','e6','d4','d5'],note:'Build a solid pawn centre; the c8 bishop needs a plan.'},
 {name:'Caro–Kann Defence',moves:['e4','c6','d4','d5'],note:'Support d5 while leaving the c8 bishop free.'},
 {name:'King’s Indian setup',moves:['d4','Nf6','c4','g6','Nc3','Bg7'],note:'Fianchetto and prepare to challenge White’s centre.'},
 {name:'English Opening',moves:['c4','e5','Nc3'],note:'Control d5 and choose a flexible central setup.'},
] as const;
export const endgames=[
 {name:'King and queen mate',fen:'7k/8/5KQ1/8/8/8/8/8 w - - 0 1',goal:'checkmate',hint:'Qg7 is mate. Keep the opposing king confined without stalemating it.'},
 {name:'King and rook mate',fen:'7k/5K2/8/8/8/8/8/R7 w - - 0 1',goal:'checkmate',hint:'Rh1 is mate: your king covers g7 and g8, and the rook controls the h-file.'},
 {name:'King and pawn promotion',fen:'8/4P3/4K3/8/8/8/8/7k w - - 0 1',goal:'promotion',hint:'Advance e8 and choose any promotion; compare the resulting positions.'},
 {name:'Rook activity',fen:'8/P6k/5K2/8/8/8/8/R7 w - - 0 1',goal:'promotion',hint:'Promote a8 with the rook supporting your passed pawn. The rook ending exercise focuses on conversion.'},
] as const;
