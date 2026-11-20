import {randomUUID} from 'node:crypto';
export class TeachingError extends Error{constructor(message,status=409){super(message);this.status=status;}}
const number=r=>r.game_number||1;
const available=r=>r.status==='active'&&r.kind!=='correspondence'&&!r.time_control&&!r.clock_paused&&!!r.white_token&&!!r.black_token;
const blank=r=>({game:number(r),rev:0,active:false,ever:false,proposal:null});
export function teachingState(r){return r.teaching?.game===number(r)?r.teaching:blank(r);}
export function teachingView(r){
 const state=teachingState(r);
 return {game_number:number(r),revision:state.rev,available:available(r),enabled:available(r)&&state.active===true,
   proposal:available(r)?state.proposal:null};
}
// Only call from the seat-authorized room endpoint. All writes use the room CAS.
export function teachingTransition(r,color,input){
 if(!['w','b'].includes(color))throw new TeachingError('A player seat is required',403);
 if(input.game_number!==number(r))throw new TeachingError('This game has changed');
 if(input.action==='status')return {view:teachingView(r)};
 if(input.expected_version!==r.version||!available(r))throw new TeachingError('An active live untimed table is required. Refresh and try again.');
 const state=teachingState(r), pending=state.proposal;
 if(input.action==='tip'){
   if(!state.active||r.turn!==color||input.expected_fen!==r.fen)throw new TeachingError('Tips require both players to agree and it must be your turn.',403);
   return {view:teachingView(r),fen:r.fen,position_version:r.version};
 }
 const changed={...state,rev:state.rev+1};
 switch(input.action){
   case 'request':
     if(state.active||pending)throw new TeachingError('Teaching is already enabled or requested');
     changed.proposal={id:randomUUID(),by:color};break;
   case 'accept':
   case 'decline':
   case 'cancel':
     if(!pending||pending.id!==input.proposal_id)throw new TeachingError('That teaching request is no longer pending');
     if((input.action==='cancel')!==(pending.by===color))throw new TeachingError('Only the other player can answer',403);
     if(input.action==='accept') {
       changed.active=true;changed.ever=true;
       r.points_policy={eligible:false,remaining:0,reason:'Teaching game: no Quiet Points'};
     }
     changed.proposal=null;break;
   case 'disable':
     if(!state.active)throw new TeachingError('Teaching is not enabled');
     changed.active=false;changed.proposal=null;break;
   default:throw new TeachingError('Invalid teaching action',400);
 }
 r.teaching=changed;return {view:teachingView(r),changed:true};
}
