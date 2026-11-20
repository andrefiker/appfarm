import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {amateurTransition,amateurView,amateurUsed} from '../amateur.js';

const table=()=>({status:'active',kind:'live',version:3,game_number:1,white_token:'w',black_token:'b',points_policy:{eligible:true}});
const toggle=(room,color,enabled)=>amateurTransition(room,color,{enabled,expected_version:room.version,game_number:room.game_number});
describe('Amateur Mode',()=>{
 it('either seated player can toggle shared markings and they never restore points mid-game',()=>{
  for(const color of ['w','b']){
   const room=table();assert.deepEqual(amateurView(room),{available:true,enabled:false});
   toggle(room,color,true);assert.equal(amateurView(room).enabled,true);assert.equal(room.points_policy.eligible,false);
   toggle(room,color==='w'?'b':'w',false);assert.equal(amateurView(room).enabled,false);assert.equal(amateurUsed(room),true);
   room.game_number++;assert.deepEqual(amateurView(room),{available:true,enabled:false});assert.equal(amateurUsed(room),false);
  }
 });
 it('rejects spectators, stale inputs, timed games, waiting or ended rooms, and correspondence',()=>{
  const room=table();
  assert.throws(()=>toggle(room,null,true),{status:403});
  assert.throws(()=>amateurTransition(room,'w',{enabled:true,expected_version:2,game_number:1}),{status:409});
  assert.throws(()=>amateurTransition(room,'w',{enabled:true,expected_version:3,game_number:2}),{status:409});
  assert.throws(()=>toggle(room,'b','true'),{status:400});
  for(const extra of [{time_control:{seconds:600}},{kind:'correspondence'},{status:'waiting'},{status:'resigned'},{black_token:null}]){
   const r={...room,...extra};assert.equal(amateurView(r).available,false);assert.throws(()=>toggle(r,'w',true),{status:409});
  }
  assert.equal(amateurUsed(room),false);
 });
});
