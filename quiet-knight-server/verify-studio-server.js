import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
export async function verifyStudioServer({request,post,redis,prefix,restart}){
 const caps=await request('/capabilities');assert.equal(caps.status,200);assert.equal(caps.data.new_games,'untimed');assert.equal(caps.data.guest_play,true);
 const a=await post('/rooms',{side:'black',kind:'correspondence',nickname:'<Fox>'});assert.equal(a.status,200);assert.equal(a.data.role,'black');assert.equal(a.data.room.black_nickname,'Fox');assert.equal(a.data.room.white_joined,false);assert.equal(a.data.room.kind,'correspondence');
 const route='/rooms/'+a.data.room.code,black=a.data.seat_token,b=await post(route+'/join',{nickname:'Owl'}),white=b.data.seat_token;assert.equal(b.data.role,'white');assert.equal(b.data.room.time_control,undefined);
 assert.equal(await redis.ttl(prefix+'room:'+a.data.room.code),-1,'Active games must not expire');
 const id=randomUUID(),input={seat_token:white,from:'e2',to:'e4',request_id:id};const move=await post(route+'/move',input);assert.equal(move.status,200);
 const duplicate=await post(route+'/move',input);assert.equal(duplicate.status,200);assert.equal(duplicate.data.duplicate,true);assert.equal(duplicate.data.room.moves.length,1);
 assert.equal((await post(route+'/move',{...input,to:'e3'})).status,409);
 let room=duplicate.data.room;
 const proposal=async(token,action,kind)=>{const r=await post(route+'/consent',{seat_token:token,action,kind,expected_version:room.version,game_number:room.game_number,proposal_id:room.proposal?.id});if(r.status===200)room=r.data.room;return r;};
 assert.equal((await proposal(black,'request','takeback')).status,200);
 assert.equal((await proposal(black,'accept')).status,403);
 assert.equal((await proposal(white,'accept')).status,200);assert.equal(room.moves.length,0);
 assert.equal((await proposal(black,'request','draw')).status,200);
 assert.equal((await proposal(white,'decline')).status,200);assert.equal(room.status,'active');
 assert.equal((await post(route+'/reaction',{seat_token:'spectator',kind:'hello',game_number:1})).status,403);
 const reaction=await post(route+'/reaction',{seat_token:white,kind:'fox',game_number:1});assert.equal(reaction.status,200);room=reaction.data.room;
 assert.equal((await post(route+'/reaction',{seat_token:white,kind:'fox',game_number:1})).status,429);
 assert.equal((await proposal(black,'request','draw')).status,200);assert.equal((await proposal(white,'accept')).status,200);assert.equal(room.status,'draw');assert.equal(room.score_event.result,'1/2-1/2');
 assert.equal(await redis.ttl(prefix+'room:'+a.data.room.code),-1,'Historical games must not expire');
 await restart();assert.equal((await request(route)).data.room.status,'draw');
 assert.equal((await post('/rooms',{variant:'chess960'})).status,400);
 const waiting=await post('/rooms',{});const ttl=await redis.ttl(prefix+'room:'+waiting.data.room.code);assert(ttl>0&&ttl<=7*86400);
 console.log(JSON.stringify({event:'studio.server.acceptance',passed:true,checks:['capabilities','Black creator and White joiner','sanitized nicknames','untimed correspondence','active/history TTL preservation','idempotent moves and conflict','bilateral takeback/draw/decline','spectator reaction denial','reaction cooldown','draw record and restart','unsupported online Chess960','empty lobby TTL']}));
}
