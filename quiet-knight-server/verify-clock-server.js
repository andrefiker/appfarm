import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {resetClock,deadline} from './clock.js';

// Called only by the isolated pre-deploy server suite. No fixture endpoint exists.
export async function verifyClockServer({req,redis,socket,testRooms,restart,prefix}) {
  const delay=ms=>new Promise(r=>setTimeout(r,ms));
  const raw=async code=>JSON.parse(await redis.get(prefix+'room:'+code));
  const saveFixture=async room=>{await redis.set(prefix+'room:'+room.code,JSON.stringify(room),{EX:604800});const due=deadline(room);if(due!==null)await redis.zAdd(prefix+'clock-deadlines',{score:due,value:room.code});};
  const a=await req('/players',{handle:'ClockWhite'},null,201),b=await req('/players',{handle:'ClockBlack'},null,201);
  const white=await req('/rooms',{},a.credential), code=white.room.code;testRooms.push(code);
  assert.equal(white.room.white_time_ms,600000);assert.equal(white.room.black_time_ms,600000);assert.equal(white.room.clock_running_color,null);
  await delay(40);assert.equal((await req('/rooms/'+code)).room.turn_started_at,null);
  const black=await req('/rooms/'+code+'/join',{},b.credential);
  assert.equal(black.room.clock_running_color,'w');assert.equal(black.room.time_control.increment_ms,0);
  const snap=await raw(code);await req('/rooms/'+code+'/join',{seat_token:white.seat_token});assert.equal((await raw(code)).turn_started_at,snap.turn_started_at);
  await req('/rooms/'+code+'/move',{seat_token:white.seat_token,from:'e2',to:'e5'},undefined,400);
  assert.equal((await raw(code)).turn_started_at,snap.turn_started_at);assert.equal((await raw(code)).version,snap.version);
  const one=await socket(code,white.seat_token),two=await socket(code,black.seat_token);
  await delay(80);
  const moved=await req('/rooms/'+code+'/move',{seat_token:white.seat_token,from:'e2',to:'e4',white_time_ms:9999999,turn_started_at:Date.now()+9999999});
  assert.ok(moved.room.white_time_ms<600000);assert.equal(moved.room.black_time_ms,600000);assert.equal(moved.room.clock_running_color,'b');
  await delay(80);assert.ok(two.messages.some(m=>m.type==='room.update'&&m.room.last_move?.san==='e4'&&m.room.clock_running_color==='b'));
  // Drive the isolated canonical deadline close without changing the production 10+0 constant.
  const near=await raw(code);near.black_time_ms=120;near.turn_started_at=Date.now();await saveFixture(near);
  const end=Date.now()+4000;while(Date.now()<end&&(await raw(code)).status==='active')await delay(40);
  const flagged=await raw(code);assert.equal(flagged.status,'timeout');assert.equal(flagged.winner,'w');assert.equal(flagged.black_time_ms,0);assert.equal(flagged.clock_running_color,null);
  await delay(150);assert.ok(one.messages.some(m=>m.type==='room.update'&&m.room.status==='timeout'));
  const finished=await req('/rooms/'+code);assert.equal(finished.room.score_event.white_points,3);assert.equal(finished.room.score_event.black_points,0);
  const event=finished.room.score_event.id;await Promise.all([req('/rooms/'+code),req('/rooms/'+code)]);assert.equal((await req('/players/me',undefined,a.credential)).player.quiet_points,3);
  await req('/rooms/'+code+'/move',{seat_token:black.seat_token,from:'e7',to:'e5'},undefined,409);
  assert.equal((await raw(code)).moves.length,1);assert.equal((await raw(code)).score_event.id,event);
  const next=await req('/rooms/'+code+'/rematch',{seat_token:white.seat_token,colors:'swap',game_number:1});
  assert.equal(next.room.white_time_ms,600000);assert.equal(next.room.black_time_ms,600000);assert.equal(next.room.game_number,2);assert.equal(next.room.white_player.id,b.player.id);
  // An old wake-up hint is harmless: latest room state controls the decision.
  await redis.zAdd(prefix+'clock-deadlines',{score:1,value:code});await delay(400);assert.equal((await raw(code)).status,'active');
  await redis.zAdd(prefix+'clock-deadlines',{score:deadline(await raw(code)),value:code});
  const legacy=await req('/rooms',{}),lc=legacy.room.code;testRooms.push(lc);const lr=await raw(lc);
  for(const field of ['time_control','white_time_ms','black_time_ms','clock_running_color','turn_started_at','flagged_color'])delete lr[field];await saveFixture(lr);
  const lb=await req('/rooms/'+lc+'/join',{});assert.equal(lb.room.time_control,undefined);
  const lm=await req('/rooms/'+lc+'/move',{seat_token:legacy.seat_token,from:'e2',to:'e4'});assert.equal(lm.room.time_control,undefined);
  await req('/rooms/'+lc+'/resign',{seat_token:lb.seat_token});const rematch=await req('/rooms/'+lc+'/rematch',{seat_token:legacy.seat_token,colors:'same'});assert.equal(rematch.room.white_time_ms,600000);
  // Expired read and late move both reconcile even without the deadline index.
  const expired=await raw(lc);expired.turn_started_at=Date.now()-600001;await saveFixture(expired);await redis.zRem(prefix+'clock-deadlines',lc);
  await req('/rooms/'+lc+'/move',{seat_token:legacy.seat_token,from:'e2',to:'e4'},undefined,409);assert.equal((await raw(lc)).status,'timeout');
  // Insufficient-material flag: isolated guests, no fabricated player ledger history.
  const draw=await req('/rooms',{}),dc=draw.room.code;testRooms.push(dc);await req('/rooms/'+dc+'/join',{});const dr=await raw(dc);
  dr.fen='8/8/8/8/8/8/4k3/5B1K b - - 0 1';dr.turn='b';resetClock(dr,Date.now()-600001);dr.clock_running_color='b';await saveFixture(dr);
  const drawResult=(await req('/rooms/'+dc)).room;assert.equal(drawResult.status,'timeout_draw');assert.equal(drawResult.winner,null);assert.equal(drawResult.black_time_ms,0);
  // Restart recovery with no sockets, a missed deadline, and a missing derived index.
  one.ws.terminate();two.ws.terminate();const recovery=await raw(code);recovery.white_time_ms=120;recovery.turn_started_at=Date.now();await saveFixture(recovery);await redis.zRem(prefix+'clock-deadlines',code);
  await restart();await delay(600);const recovered=await raw(code);assert.equal(recovered.status,'timeout');assert.equal(recovered.winner,'b');assert.equal(recovered.game_number,2);
  assert.equal((await req('/rooms/'+code)).room.score_event.black_points,3);
  console.log(JSON.stringify({event:'clock.server.acceptance',passed:true,checks:['waiting/join start','no client time authority','illegal/retry immutability','move+clock broadcast','automatic flag without client action','late move rejected','timeout +3/+0 once','swap/same reset','stale wake-up safe','legacy until rematch','insufficient-material timeout draw','restart/missing-index recovery']}));
}
