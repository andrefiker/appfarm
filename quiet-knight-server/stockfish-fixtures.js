export const ENDGAME = 'c3 b5 f4 f6 c4 bxc4 h3 Nc6 Na3 a6 Nxc4 Nd4 Na3 Nf3+ Nxf3 e6 Nd4 Bxa3 Nxe6 Bxb2 Nxd8 Bxa1 Nb7 Bxb7 e3 Bxg2 Bxa6 Bxh1 Kf1 Rxa6 Qg4 Rxa2 Qxg7 f5 Qxd7+ Kxd7 e4 fxe4 d4 Bxd4 Bb2 Rxb2 Ke1 Ra2 f5 Nf6 Kd1 Rb2 Ke1 Ng8 Kf1 Bg2+ Ke1 Bxh3 f6 Rb6 Ke2 Rxf6 Ke1 Rf4 Ke2 Be6 Kd1 e3 Ke2 Rf3 Kxf3'.split(' ');
export const FIXTURES = [
  ['opening_white', []],
  ['opening_black', ['e4']],
  ['free_pawn', ['e4', 'd5']],
  ['free_minor', ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Nf6']],
  ['hanging_queen', ['e4', 'e5', 'Qf3', 'Nc6', 'Bc4', 'Nd4', 'a3']],
  ['fork', ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5']],
  ['mate_white', ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6']],
  ['mate_black', ['f3', 'e5', 'g4']],
  ['defense', ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'b5', 'Bb3']],
  ['quiet', ['d4', 'd5', 'Nf3', 'Nf6', 'e3', 'e6', 'Bd3', 'Be7']],
  ['endgame', ENDGAME],
];
