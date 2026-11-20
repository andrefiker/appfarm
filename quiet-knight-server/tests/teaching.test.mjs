import {strict as a} from 'node:assert';
import {test} from 'node:test';
import {teachingTransition as step,teachingState,teachingView} from '../teaching.js';
const room=()=>({version:3,game_number:1,status:'active',turn:'w',fen:'initial',white_token:'w-token',black_token:'b-token',points_policy:{eligible:true}});
const call=(r,c,action,extras={})=>step(r,c,{action,game_number:r.game_number,expected_version:r.version,...extras});
test('both seats must agree, only the current player can ask, approval survives reconnect',()=>{
 const r=room(); a.equal(teachingView(r).enabled,false);
 a.throws(()=>call(r,'w','tip',{expected_fen:r.fen}),{status:403});
 a.throws(()=>call(r,null,'status'),{status:403});
 const p=call(r,'w','request').view.proposal.id;
 a.equal(teachingView(r).enabled,false);
 a.throws(()=>call(r,'w','accept',{proposal_id:p}),{status:403});
 call(r,'b','accept',{proposal_id:p});
 a.equal(teachingView(JSON.parse(JSON.stringify(r))).enabled,true);
 a.equal(r.points_policy.eligible,false);
 a.throws(()=>call(r,'b','tip',{expected_fen:r.fen}),{status:403});
 a.throws(()=>call(r,'w','tip',{expected_fen:'old'}),{status:403});
 a.throws(()=>call(r,'w','tip',{expected_fen:r.fen,expected_version:2}),{status:409});
 a.equal(call(r,'w','tip',{expected_fen:r.fen}).fen,r.fen);
 call(r,'b','disable');a.equal(teachingView(r).enabled,false);a.equal(teachingState(r).ever,true);a.equal(r.points_policy.eligible,false);
 r.game_number++;a.equal(teachingView(r).enabled,false);a.equal(teachingState(r).ever,false);
});
test('invalid tables, stale game, cancel and declined requests cannot produce tips',()=>{
 const r=room();
 for(const oth of [{status:'waiting'},{status:'draw'},{kind:'correspondence'},{time_control:'10+0'},{white_token:null}]){
  a.throws(()=>call({...r,...oth},'w','request'),{status:409});
 }
 a.throws(()=>call(r,'w','request',{game_number:2}),{status:409});
 let p=call(r,'w','request').view.proposal.id;
 call(r,'b','decline',{proposal_id:p});a.equal(teachingView(r).proposal,null);
 p=call(r,'b','request').view.proposal.id;
 call(r,'b','cancel',{proposal_id:p});a.equal(teachingView(r).proposal,null);
 a.throws(()=>call(r,'w','accept',{proposal_id:p}),{status:409});
});
