import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,Chess,DEFAULT_POSITION,validPosition,attackMap} from '../web/rules.js';

const fixtures=[
 ['start',DEFAULT_POSITION,4,197281],
 ['Kiwipete','r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',3,97862],
 ['rook ending','8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',4,43238],
 ['promotion and castling','r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',3,9467],
 ['promotion tactics','rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',3,62379],
 ['middlegame','r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',3,89890]
];
for(const [name,fen,depth,nodes] of fixtures)test('Perft '+name,()=>assert.equal(new Chess(fen).perft(depth),nodes));
test('castling through check is illegal',()=>{const c=new Chess('4kr2/8/8/8/8/8/8/R3K2R w KQ - 0 1');assert(!c.moves().includes('O-O'));assert(c.moves().includes('O-O-O'));});
test('en passant and king exposure',()=>{const c=new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');assert(c.move('exd6').isEnPassant());const pinned=new Chess('4r1k1/8/8/3pP3/8/8/8/4K3 w - d6 0 1');assert(!pinned.moves().includes('exd6'));});
test('all four promotions',()=>{const c=new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1');assert.deepEqual(c.moves({verbose:true}).filter(m=>m.promotion).map(m=>m.promotion).sort(),['b','n','q','r']);});
test('pinned geometric attacks differ from legal moves',()=>{const c=new Chess('4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1');assert(attackMap(c).w.d2.includes('e2'));assert(!c.moves({square:'e2',verbose:true}).some(m=>m.to==='d2'));});
test('checkmate, stalemate and mate precedence',()=>{const m=new Game('7k/6Q1/6K1/8/8/8/8/8 b - - 150 80');assert.equal(m.status().reason,'Checkmate');const s=new Game('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');assert.equal(s.status().reason,'Stalemate');});
test('standard dead material',()=>{for(const f of ['7k/8/8/8/8/8/8/K7 w - - 0 1','7k/8/8/8/8/8/8/KB6 w - - 0 1','7k/8/8/8/8/8/8/KN6 w - - 0 1'])assert.equal(new Game(f).status().reason,'Dead position');});
test('claimable 50 moves versus automatic 75 moves',()=>{const c=new Game('7k/8/8/8/8/8/8/KR6 w - - 100 1');assert.equal(c.status().over,false);assert.equal(c.status().claim,'50-move rule');assert.equal(new Game('7k/8/8/8/8/8/8/KR6 w - - 150 1').status().reason,'75-move rule');});
test('threefold is claimable and fivefold automatic',()=>{const g=new Game();const cycle=()=>['Nf3','Nf6','Ng1','Ng8'].forEach(m=>g.move(m));cycle();cycle();assert.equal(g.status().claim,'Threefold repetition');assert(!g.status().over);cycle();cycle();assert.equal(g.status().reason,'Fivefold repetition');});
test('declared-move draw claim leaves board unchanged',()=>{const g=new Game('7k/8/8/8/8/8/8/KR6 w - - 99 1');const fen=g.chess.fen(),option=g.claimOptions()[0];assert(option?.move);g.claim(option.move);assert.equal(g.chess.fen(),fen);assert(g.status().over);});
test('save restore and undo',()=>{const g=new Game();['e4','c5','Nf3','d6'].forEach(m=>g.move(m));const restored=Game.restore(JSON.parse(JSON.stringify(g.serialize())));assert.equal(restored.chess.fen(),g.chess.fen());restored.undo();assert.equal(restored.moves.length,3);});
test('FEN and PGN round trips',()=>{const g=new Game();['d4','d5','c4','e6','Nc3','Nf6'].forEach(m=>g.move(m));assert.equal(new Game(g.chess.fen()).chess.fen(),g.chess.fen());assert.equal(Game.fromPgn(g.exportPgn()).chess.fen(),g.chess.fen());});
test('invalid FEN, castling rights and saves rejected',()=>{assert.throws(()=>validPosition('invalid'));assert.throws(()=>validPosition('7k/8/8/8/8/8/8/K7 w KQ - 0 1'));assert.throws(()=>Game.restore({schema:1,root:DEFAULT_POSITION,moves:[{from:'e2',to:'e5'}]}));assert.throws(()=>Game.fromPgn('[Result "bad"]\n\n1. e4'));});
test('terminal positions reject moves',()=>{const g=new Game();['f3','e5','g4','Qh4#'].forEach(m=>g.move(m));assert(g.status().over);assert.throws(()=>g.move('e4'));});
test('32 seeded legal games preserve kings and history',()=>{let seed=37,plies=0,terminal=0;const rnd=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};for(let i=0;i<32;i++){const g=new Game();for(let p=0;p<200&&!g.status().over;p++){const legal=g.chess.moves({verbose:true});assert(legal.length);const m=legal[rnd(legal.length)];g.move(m);plies++;assert.equal(g.chess.board().flat().filter(x=>x?.type==='k').length,2);}terminal+=Number(g.status().over);assert.equal(Game.restore(g.serialize()).chess.fen(),g.chess.fen());}console.log(JSON.stringify({seed:37,games:32,plies,terminal,cap:200}));});
