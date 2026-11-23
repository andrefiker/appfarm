import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {computerLevels,isComputerLevel,nextComputerLevel,practiceErrorRate,forgivingMove} from '../src/computer-difficulty.ts';
test('there are eleven settings below level 3 and the original levels are preserved',()=>{
 assert.equal(computerLevels.filter(n=>n<3).length,11);
 for(let n=1;n<=10;n++)assert.ok(isComputerLevel(n));
 for(const n of [0,-1,0.4,3.25,10.25,NaN,'1'])assert.equal(isComputerLevel(n),false);
 assert.equal(new Set(computerLevels).size,computerLevels.length);
});
test('forgiveness falls at each practice level and ends at level 3',()=>{
 const probabilities=computerLevels.filter(n=>n<=3).map(practiceErrorRate);
 assert.ok(probabilities[0]>0.8);
 assert.ok(probabilities.every((n,i)=>i===0||n<probabilities[i-1]));
 assert.equal(practiceErrorRate(3),0);assert.equal(practiceErrorRate(10),0);
});
test('a forgiving move is a legal move; terminal and standard positions do not fake moves',()=>{
 const game=new Chess();game.move('e4');
 const moves=game.moves({verbose:true}),samples=[0,0.25,0.7,0.99999];
 for(const choice of samples){let step=0;const move=forgivingMove(moves,0.25,()=>step++===0?0:choice);
  assert.ok(move&&moves.includes(move));assert.doesNotThrow(()=>new Chess(game.fen()).move(move));}
 assert.equal(forgivingMove([],0.25,()=>0),null);
 assert.equal(forgivingMove(moves,3,()=>0),null);
 assert.equal(forgivingMove(moves,2.75,()=>0.99),null);
});
test('adaptive difficulty walks adjacent steps and clamps to endpoints',()=>{
 assert.equal(nextComputerLevel(3,-1),2.75);assert.equal(nextComputerLevel(2.75,1),3);
 assert.equal(nextComputerLevel(0.25,-1),0.25);assert.equal(nextComputerLevel(10,1),10);
});
