import assert from 'node:assert/strict';

export async function verifyPauseServer({req,redis,socket,testRooms,restart,prefix}) {
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const a=await req('/rooms',{}),code=a.room.code;testRooms.push(code);
  const call=(action,token,r,extra={},status=200)=>req('/rooms/'+code+'/pause',{action,seat_token:token,game_number:r.game_number,expected_version:r.version,request_id:r.pause_request?.id,pause_id:r.pause_id,...extra},undefined,status);
  await call('request',a.seat_token,a.room,{},409);
  const b=await req('/rooms/'+code+'/join',{});let r=b.room;
  const one=await socket(code,a.seat_token),two=await socket(code,b.seat_token);
  await call('request','spectator',r,{},403);
  r=(await call('request',a.seat_token,r)).room;
  const requestVersion=r.version;
  assert.equal(r.clock_paused,false);assert.equal(r.clock_running_color,'w');
  await call('accept',a.seat_token,r,{},403);
  await call('accept',b.seat_token,r,{request_id:'old-request'},409);
  r=(await call('decline',b.seat_token,r)).room;assert.equal(r.pause_request,null);assert.equal(r.clock_running_color,'w');
  r=(await call('request',b.seat_token,r)).room;
  r=(await call('cancel',b.seat_token,r)).room;assert.equal(r.pause_request,null);
  r=(await call('request',a.seat_token,r)).room;
  const pending=r;
  r=(await req('/rooms/'+code+'/move',{seat_token:a.seat_token,from:'e2',to:'e4'})).room;
  assert.equal(r.pause_request,null);await call('accept',b.seat_token,pending,{},409);
  r=(await call('request',a.seat_token,r)).room;
  await delay(70);r=(await call('accept',b.seat_token,r)).room;
  const paused=r;
  assert.equal(r.clock_paused,true);assert.equal(r.clock_running_color,null);assert.equal(r.turn_started_at,null);assert.equal(r.turn,'b');assert.ok(r.black_time_ms<600000);
  assert.equal(await redis.zScore(prefix+'clock-deadlines',code),null);
  await req('/rooms/'+code+'/move',{seat_token:b.seat_token,from:'e7',to:'e5'},undefined,409);
  await req('/rooms/'+code+'/nudge',{seat_token:a.seat_token,request_id:'00000000-0000-0000-0000-000000000000'},undefined,409);
  await delay(100);
  assert.ok(two.messages.some(m=>m.type==='room.update'&&m.room.clock_paused));
  one.ws.terminate();two.ws.terminate();await restart();
  r=(await req('/rooms/'+code)).room;assert.equal(r.clock_paused,true);assert.equal(r.black_time_ms,paused.black_time_ms);assert.equal(r.white_time_ms,paused.white_time_ms);
  assert.equal((await req('/rooms/'+code+'/join',{seat_token:b.seat_token})).room.clock_paused,true);
  // The requester may resume; no accumulated pause time is charged or refunded.
  r=(await call('resume',a.seat_token,r)).room;
  assert.equal(r.clock_running_color,'b');assert.equal(r.black_time_ms,paused.black_time_ms);assert.equal(r.clock_paused,false);
  const resumedStart=r.turn_started_at;
  await call('resume',b.seat_token,paused,{},409);
  assert.equal((await req('/rooms/'+code)).room.turn_started_at,resumedStart);
  // The accepting opponent may also resume a later pause.
  r=(await call('request',a.seat_token,r)).room;r=(await call('accept',b.seat_token,r)).room;r=(await call('resume',b.seat_token,r)).room;
  assert.equal(r.clock_running_color,'b');
  r=(await call('request',b.seat_token,r)).room;r=(await call('accept',a.seat_token,r)).room;
  r=(await req('/rooms/'+code+'/resign',{seat_token:b.seat_token})).room;assert.equal(r.clock_paused,false);
  r=(await req('/rooms/'+code+'/rematch',{seat_token:a.seat_token,colors:'swap'})).room;
  assert.equal(r.clock_paused,false);assert.equal(r.pause_request,null);assert.equal(r.pause_id,null);assert.equal(r.white_time_ms,600000);assert.equal(r.black_time_ms,600000);
  await call('resume',a.seat_token,paused,{},409);
  r=(await call('request',b.seat_token,r)).room;
  // Time expiry wins over acceptance, including a delayed response to the request.
  const raw=JSON.parse(await redis.get(prefix+'room:'+code));raw.turn_started_at=Date.now()-600001;await redis.set(prefix+'room:'+code,JSON.stringify(raw),{EX:604800});
  await call('accept',a.seat_token,r,{},409);r=(await req('/rooms/'+code)).room;assert.equal(r.status,'timeout');assert.equal(r.clock_paused,false);
  assert.ok(requestVersion>2);
  console.log(JSON.stringify({event:'pause.server.acceptance',passed:true,checks:['waiting/spectator guards','request does not stop time','only opponent accepts','decline/cancel','move clears pending request','stale response rejected','paused moves and nudge rejected','atomic deadline removal','restart and reconnect preserve pause','either player resumes with no added time','duplicate resume cannot reset clock','resign/rematch clears pause','timeout beats delayed acceptance']}));
}
