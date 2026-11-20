export class AmateurError extends Error {
 constructor(message,status=409){super(message);this.status=status;}
}
const gameNumber=room=>room.game_number||1;
const state=room=>room.amateur?.game===gameNumber(room)?room.amateur:null;
const available=room=>room.status==='active'&&room.kind!=='correspondence'&&!room.time_control&&Boolean(room.white_token&&room.black_token);
export const amateurUsed=room=>state(room)?.ever===true;
export const AMATEUR_POINTS_REASON='Amateur game: no Quiet Points';
export function amateurView(room){
 const canPlay=available(room);
 return {available:canPlay,enabled:canPlay&&state(room)?.enabled===true};
}
export function amateurTransition(room,color,input){
 if(color!=='w'&&color!=='b')throw new AmateurError('A player seat is required',403);
 if(typeof input.enabled!=='boolean')throw new AmateurError('Pass an enabled boolean',400);
 if(!available(room)||input.game_number!==gameNumber(room)||input.expected_version!==room.version)
  throw new AmateurError('The live untimed game changed. Try again.');
 if(amateurView(room).enabled===input.enabled)return false;
 room.amateur={game:gameNumber(room),enabled:input.enabled,ever:amateurUsed(room)||input.enabled};
 if(room.amateur.ever)room.points_policy={eligible:false,remaining:0,reason:AMATEUR_POINTS_REASON};
 return true;
}