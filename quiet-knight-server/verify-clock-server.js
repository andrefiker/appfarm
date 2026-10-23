import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {resetTimedClock} from './tests/clock-fixture.js';
import {deadline} from './clock.js';
import {verifyPauseServer} from './verify-pause-server.js';

// Current mandatory-account HTTP/WS suite. All fixtures use the caller's isolated
// PostgreSQL schema and Redis prefix; there is no fixture API in production.
export async function verifyClockServer({request,post,makeRoom,socket,waitFor,redis,pool,prefix,restart,cookies}) {
  const [a,b]=cookies;
  const raw=async code=>JSON.parse(await redis.get(prefix+'room:'+code));
  const save=async room=>{
    await redis.set(prefix+'room:'+room.code,JSON.stringify(room),{EX:604800});
    const due=deadline(room);
    if(due===null)await redis.zRem(prefix+'clock-deadlines',room.code);
    else await redis.zAdd(prefix+'clock-deadlines',{score:due,value:room.code});
  };
  const view=async code=>(await request('/rooms/'+code,{cookie:a})).data.room;
  const noClock=r=>{for(const key of ['time_control','white_time_ms','black_time_ms','clock_running_color','turn_started_at','flagged_color'])assert.equal(Object.hasOwn(r,key),false,key+' absent for untimed game');};
  const fresh=await makeRoom(a,b),route='/rooms/'+fresh.code;
  noClock(fresh.white.room);noClock(fresh.black.room);
  const one=await socket(fresh.code,a,fresh.white.seat_token),two=await socket(fresh.code,b,fresh.black.seat_token);
  // A stale historical wake-up hint must not time out an untimed room.
  await redis.zAdd(prefix+'clock-deadlines',{score:1,value:fresh.code});await delay(400);
  assert.equal((await view(fresh.code)).status,'active');
  assert.equal((await post(route+'/pause',{action:'request',seat_token:fresh.white.seat_token},a)).status,409);
  for(const [cookie,seat,from,to,color] of [[a,fresh.white.seat_token,'e2','e4','b'],[b,fresh.black.seat_token,'e7','e5','w']]){
    const response=await post(route+'/move',{seat_token:seat,from,to,white_time_ms:9999999,time_control:{initial_ms:900000,increment_ms:0}},cookie);
    assert.equal(response.status,200);noClock(response.data.room);assert.equal(response.data.room.turn,color);
  }
  await waitFor(one,event=>event.type==='room.update'&&event.room.last_move?.san==='e5');
  await waitFor(two,event=>event.type==='room.update'&&event.room.last_move?.san==='e4');
  await restart();
  const reconnect=await post(route+'/join',{seat_token:fresh.white.seat_token},a);
  noClock(reconnect.data.room);assert.deepEqual(reconnect.data.room.moves,['e4','e5']);
  const recoveredEvents=await socket(fresh.code,a,fresh.white.seat_token);
  await waitFor(recoveredEvents,event=>event.type==='room.update'&&event.room.moves.length===2);
  assert.equal((await post(route+'/resign',{seat_token:fresh.black.seat_token},b)).status,200);
  assert.match((await pool.query('SELECT pgn FROM qk_games WHERE room_code=$1',[fresh.code])).rows[0].pgn,/\[TimeControl "-"\]/);
  const same=await post(route+'/rematch',{seat_token:fresh.white.seat_token,colors:'same'},a);
  noClock(same.data.room);assert.equal(same.data.room.game_number,2);

  // Recreate persisted 10+0 data without invoking new-game initialization.
  const old=await makeRoom(a,b),oldRoute='/rooms/'+old.code;
  const persisted=await raw(old.code);resetTimedClock(persisted,Date.now());persisted.white_time_ms=20000;persisted.black_time_ms=25000;await save(persisted);
  const before=await raw(old.code);
  const oldView=await view(old.code);assert.deepEqual(oldView.time_control,{initial_ms:600000,increment_ms:0});
  assert.equal(oldView.white_time_ms,before.white_time_ms);assert.equal(oldView.turn_started_at,before.turn_started_at);
  assert.equal((await post(oldRoute+'/move',{seat_token:old.white.seat_token,from:'e2',to:'e5'},a)).status,400);
  assert.equal((await raw(old.code)).turn_started_at,before.turn_started_at);
  await delay(40);
  const moved=await post(oldRoute+'/move',{seat_token:old.white.seat_token,from:'e2',to:'e4',white_time_ms:99999999,turn_started_at:Date.now()+99999999},a);
  assert.equal(moved.status,200);assert.ok(moved.data.room.white_time_ms<20000);assert.equal(moved.data.room.black_time_ms,25000);assert.equal(moved.data.room.clock_running_color,'b');
  await verifyPauseServer({code:old.code,white:{...old.white,cookie:a},black:{...old.black,cookie:b},post,read:()=>view(old.code),restart,redis,prefix});
  const oldAgain=await raw(old.code);oldAgain.black_time_ms=150;oldAgain.turn_started_at=Date.now();await save(oldAgain);
  const events=await socket(old.code,a,old.white.seat_token);
  await waitFor(events,event=>event.type==='room.update'&&event.room.status==='timeout');
  const ended=await view(old.code);assert.equal(ended.status,'timeout');assert.equal(ended.winner,'w');assert.equal(ended.black_time_ms,0);assert.equal(ended.clock_running_color,null);
  assert.equal((await post(oldRoute+'/move',{seat_token:old.black.seat_token,from:'e7',to:'e5'},b)).status,409);
  await view(old.code);await view(old.code);
  const records=(await pool.query('SELECT pgn FROM qk_games WHERE room_code=$1',[old.code])).rows;
  assert.equal(records.length,1);assert.match(records[0].pgn,/\[TimeControl "600\+0"\]/);
  const swap=await post(oldRoute+'/rematch',{seat_token:old.white.seat_token,colors:'swap'},a);
  noClock(swap.data.room);assert.equal(swap.data.room.white_player.id,old.black.room.black_player.id);
  assert.equal(await redis.zScore(prefix+'clock-deadlines',old.code),null);
  assert.equal((await raw(old.code)).clock_paused,false);

  // Restart recovers an expired legacy clock even when its derived index is lost.
  const missed=await makeRoom(a,b),expired=await raw(missed.code);resetTimedClock(expired,Date.now());expired.white_time_ms=1;expired.turn_started_at=Date.now()-1000;await save(expired);await redis.zRem(prefix+'clock-deadlines',missed.code);
  await restart();
  const flagged=await view(missed.code);assert.equal(flagged.status,'timeout');assert.equal(flagged.winner,'b');assert.equal(flagged.white_time_ms,0);
  console.log(JSON.stringify({event:'clock.server.acceptance',passed:true,checks:['new games/same+swap rematches untimed','two WS clients converge','client cannot add clocks/time','untimed pause rejected','reconnect/restart preserve moves','legacy 10+0 preserved','illegal move cannot reset time','active side switches/no increment','legacy timeout broadcast/late move rejection','correct PGN/exactly-once record','legacy missing-index restart recovery']}));
}
