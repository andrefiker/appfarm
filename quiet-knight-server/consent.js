import {randomUUID} from 'node:crypto';
import {Chess} from 'chess.js';
import {timed,stopClock} from './clock.js';
export class ConsentError extends Error{constructor(message,status=409){super(message);this.status=status;}}
// Caller must authenticate the seat before reaching this transition. Neither
// party can accept their own proposal or replay it into a later game/version.
export function consentTransition(room,color,input,now=Date.now()){
 if(!['w','b'].includes(color))throw new ConsentError('Seat required',403);
 if(room.status!=='active'||room.clock_paused||!room.black_token||!room.white_token)throw new ConsentError('An active, unpaused two-player game is required');
 if(input.expected_version!==room.version||input.game_number!==(room.game_number||1))throw new ConsentError('The table changed; refresh before answering');
 if(input.action==='request'){
  if(!['draw','takeback'].includes(input.kind))throw new ConsentError('Unsupported proposal',400);
  if(room.proposal)throw new ConsentError('Answer or cancel the pending proposal first');
  if(input.kind==='takeback'&&(timed(room)||room.points_policy?.eligible||!room.moves.length))throw new ConsentError('Takebacks require a casual untimed game with moves');
  room.proposal={id:randomUUID(),kind:input.kind,by:color,at:now,game_number:room.game_number||1};return room;
 }
 const p=room.proposal;
 if(!p||input.proposal_id!==p.id||p.game_number!==(room.game_number||1))throw new ConsentError('Proposal is no longer pending');
 if(!['accept','decline','cancel'].includes(input.action))throw new ConsentError('Choose accept, decline or cancel',400);
 if((input.action==='cancel')!==(p.by===color))throw new ConsentError('Only the other player can answer',403);
 if(input.action==='accept'&&p.kind==='draw'){
  room.status='draw';room.winner=null;room.ended_at=now;
  room.draw_agreement={by:p.by,accepted_by:color,game_number:room.game_number||1};stopClock(room,now);
 }else if(input.action==='accept'&&p.kind==='takeback'){
  if(timed(room)||room.points_policy?.eligible)throw new ConsentError('Takeback is no longer available');
  room.moves=room.moves.slice(0,-1);const game=new Chess();for(const m of room.moves)game.move(m);room.fen=game.fen();room.turn=game.turn();
 }
 room.proposal=null;return room;
}
