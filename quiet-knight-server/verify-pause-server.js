import assert from 'node:assert/strict';

// Legacy timed games retain the existing pause protocol after the default changes.
export async function verifyPauseServer({code,white,black,post,read,restart,redis,prefix}) {
  const route='/rooms/'+code;
  const call=async(action,seat,cookie,r,extra={},status=200)=>{
    const result=await post(route+'/pause',{action,seat_token:seat,game_number:r.game_number,expected_version:r.version,request_id:r.pause_request?.id,pause_id:r.pause_id,...extra},cookie);
    assert.equal(result.status,status,'legacy pause '+action);
    return result.data.room;
  };
  let r=await read();
  await call('request','spectator',white.cookie,r,{},403);
  r=await call('request',white.seat_token,white.cookie,r);
  assert.equal(r.clock_running_color,r.turn);assert.equal(r.clock_paused,false);
  await call('accept',white.seat_token,white.cookie,r,{},403);
  await call('accept',black.seat_token,black.cookie,r,{request_id:'stale'},409);
  r=await call('decline',black.seat_token,black.cookie,r);
  assert.equal(r.pause_request,null);
  r=await call('request',white.seat_token,white.cookie,r);
  r=await call('cancel',white.seat_token,white.cookie,r);
  r=await call('request',white.seat_token,white.cookie,r);
  r=await call('accept',black.seat_token,black.cookie,r);
  const paused=structuredClone(r);
  assert.equal(r.clock_paused,true);assert.equal(r.clock_running_color,null);assert.equal(r.turn_started_at,null);
  assert.equal(await redis.zScore(prefix+'clock-deadlines',code),null);
  assert.equal((await post(route+'/move',{seat_token:black.seat_token,from:'e7',to:'e5'},black.cookie)).status,409);
  await restart();
  r=await read();assert.equal(r.clock_paused,true);assert.equal(r.white_time_ms,paused.white_time_ms);assert.equal(r.black_time_ms,paused.black_time_ms);
  const joined=await post(route+'/join',{seat_token:black.seat_token},black.cookie);
  assert.equal(joined.data.room.clock_paused,true);
  r=await call('resume',white.seat_token,white.cookie,r);
  assert.equal(r.clock_running_color,r.turn);assert.equal(r.white_time_ms,paused.white_time_ms);assert.equal(r.black_time_ms,paused.black_time_ms);
  await call('resume',black.seat_token,black.cookie,paused,{},409);
  assert.equal((await read()).turn_started_at,r.turn_started_at);
  console.log(JSON.stringify({event:'pause.server.acceptance',passed:true,checks:['legacy guards/decline/cancel','pause removes deadline','paused move rejected','restart/reconnect preserve times','resume adds no time','stale resume rejected']}));
}
