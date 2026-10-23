import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {makeFen} from 'chessops/fen';
import {makeSquare,parseSquare} from 'chessops/util';
import {blankStudy,chess960Fen,positionFromFen,playUci,replay,legalMoves,studyPgn,importStudyPgn,outcome,loadStudy,saveStudy} from '../src/local-rules.ts';
import {puzzles,openings,endgames} from '../src/training-content.ts';
import {reviewAssessment,adaptiveLevel} from '../src/review-assessment.ts';
import {selectStyle,skillForLevel} from '../src/offline-engine.ts';

const positions=new Set();
for(let i=0;i<960;i++){
 const fen=chess960Fen(i),pos=positionFromFen(fen),row=fen.split('/').at(-1).split(' ')[0];positions.add(row);
 const bishops=[...row].flatMap((x,i)=>x==='B'?[i]:[]),rooks=[...row].flatMap((x,i)=>x==='R'?[i]:[]);
 assert.notEqual(bishops[0]%2,bishops[1]%2);assert(rooks[0]<row.indexOf('K')&&row.indexOf('K')<rooks[1]);assert(legalMoves(pos).length>=18);
}
assert.equal(positions.size,960);assert.equal(chess960Fen(518).split('/')[0],'rnbqkbnr');
for(const [fen,uci,king,rook]of[
 ['4k3/8/8/8/8/8/8/RK4R1 w GA - 0 1','b1g1','g1','f1'],
 ['4k3/8/8/8/8/8/8/RK4R1 w GA - 0 1','b1a1','c1','d1'],
 ['4k3/8/8/8/8/8/8/6KR w H - 0 1','g1h1','g1','f1'],
]){const p=positionFromFen(fen);playUci(p,uci);assert.equal(makeSquare(p.board.kingOf('white')),king);assert.equal(p.board.get(parseSquare(rook)).role,'rook');}
assert.throws(()=>positionFromFen('8/8/8/8/8/8/8/8 w - - 0 1'));
assert.throws(()=>positionFromFen('4k3/8/8/8/8/8/8/4K3 w K - 0 1'));
assert.throws(()=>positionFromFen('4k3/8/8/8/8/8/8/4K3 w - e6 0 1'));
const ep=positionFromFen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');playUci(ep,'e5d6');assert.equal(ep.board.get(parseSquare('d5')),undefined);
for(const p of puzzles){const pos=positionFromFen(p.fen);for(const move of p.solution)playUci(pos,move);if(p.name==='Back-rank mate')assert(pos.isCheckmate());}
for(const o of openings){const chess=new Chess();for(const move of o.moves)chess.move(move);}
for(const p of endgames){const pos=positionFromFen(p.fen);assert(!pos.isEnd());}
for(const [fen,uci]of[[endgames[0].fen,'g6g7'],[endgames[1].fen,'a1h1']]){const p=positionFromFen(fen);playUci(p,uci);assert(p.isCheckmate());}
for(const promotion of ['q','r','b','n']){const p=positionFromFen(endgames[2].fen);playUci(p,'e7e8'+promotion);assert.notEqual(p.board.get(parseSquare('e8')).role,'pawn');}
const game=importStudyPgn('[Event "Test"]\n1. e4 e5 2. Nf3 Nc6 *');assert.equal(game.moves.length,4);assert.deepEqual(importStudyPgn(studyPgn(game)).moves,game.moves);
const variant={...blankStudy(),start:chess960Fen(518),variant:'chess960',moves:['e2e4','e7e5'],cursor:2};assert.equal(importStudyPgn(studyPgn(variant)).variant,'chess960');assert.deepEqual(importStudyPgn(studyPgn(variant)).moves,variant.moves);
assert.throws(()=>importStudyPgn('1. e4 garbage *'));assert.throws(()=>importStudyPgn('1. e4 * e5'));assert.throws(()=>importStudyPgn('x'.repeat(100001)));
const repeat={...blankStudy(),moves:Array(4).fill(['g1f3','g8f6','f3g1','f6g8']).flat(),cursor:16};assert.match(outcome(repeat),/fivefold/);
const mate={...blankStudy(),moves:['f2f3','e7e5','g2g4','d8h4'],cursor:4};assert.match(outcome(mate),/checkmate/);
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
assert(saveStudy(game,'guest'));assert(saveStudy(variant,'account-A'));assert.equal(loadStudy('guest').variant,'standard');assert.equal(loadStudy('account-A').variant,'chess960');
saveStudy(mate,'guest');storage.set('qk-study-v2:guest','broken');assert.deepEqual(loadStudy('guest').moves,game.moves);assert.deepEqual(loadStudy('account-B').moves,[]);
const lines=[{move:'a2a3',cp:30},{move:'e2e4',cp:20},{move:'d2d4',cp:5}],features=m=>({capture:m==='e2e4'?3:0,check:m==='e2e4',center:m==='d2d4'?7:0,exposure:m==='a2a3'?5:0});
assert.equal(selectStyle([{move:'a2a3',cp:30},{move:'e2e4',cp:20,engineChosen:true}],'balanced',features,5).move,'e2e4');
assert.equal(selectStyle(lines,'fox',features,5).move,'e2e4');assert.equal(selectStyle(lines,'owl',features,5).move,'d2d4');assert.equal(selectStyle(lines,'tortoise',features,5).move,'e2e4');assert.equal(selectStyle(lines,'beginner',features,1).move,'d2d4');
const roundtrip=new Chess();roundtrip.loadPgn(studyPgn(game));assert.equal(makeFen(replay(game).pos.toSetup()),roundtrip.fen());
const seventyFive={...blankStudy(),start:'4k3/8/8/8/8/8/8/R3K3 w - - 150 76'};assert.match(outcome(seventyFive),/75-move/);
const resigned=importStudyPgn('1. e4 e5 0-1');assert.match(studyPgn(resigned),/\[Result "0-1"\]/);
assert.equal(reviewAssessment(150,-100,'w',true).category,'Blunder');assert.equal(reviewAssessment(-100,0,'b').category,'Mistake');assert.equal(reviewAssessment(0,-49,'w').category,'No major loss');assert.equal(reviewAssessment(0,NaN,'b').category,'Not evaluated');assert(reviewAssessment(100,-20,'w',true).missedTactic);assert.equal(adaptiveLevel(5,'win',false),5);assert.equal(adaptiveLevel(5,'loss',true),4);assert.equal(adaptiveLevel(10,'win',true),10);
assert.equal(skillForLevel(10),20);assert.equal(skillForLevel(1),0);assert.equal(new Set(Array.from({length:10},(_,i)=>skillForLevel(i+1))).size,10);
console.log('Studio rules: all 960 setups, stationary/normal Chess960 castling, en passant, underpromotion, authored exercises, PGN/FEN, corruption recovery, namespaces and style choices passed.');
