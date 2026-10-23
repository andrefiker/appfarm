import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';

// Runs only inside verify-server's random SQL schema / Redis namespace.
export async function verifyGuestServer({request,post,socket,waitFor,restart,pool,accountCookie}) {
  const playersBefore=(await pool.query('SELECT count(*)::int AS n FROM qk_players')).rows[0].n;
  const a=await post('/rooms',{});assert.equal(a.status,200);
  const code=a.data.room.code,route='/rooms/'+code,white=a.data.seat_token;
  assert.equal(a.data.room.white_player,null);assert.equal(a.data.room.time_control,undefined);
  const joinKey=randomBytes(24).toString('hex');
  const b=await post(route+'/join',{join_key:joinKey});assert.equal(b.status,200);assert.equal(b.data.role,'black');
  const black=b.data.seat_token;assert.equal(b.data.room.black_player,null);assert.equal(b.data.room.points_policy.eligible,false);
  assert.equal((await post(route+'/join',{join_key:joinKey})).data.seat_token,black);
  const watch=await post(route+'/join',{});assert.equal(watch.data.role,'spectator');assert.equal(watch.data.seat_token,null);
  const one=await socket(code,null,white),two=await socket(code,null,black),spectator=await socket(code,null,'invalid-seat');
  await waitFor(one,e=>e.type==='seat.role'&&e.role==='white');await waitFor(two,e=>e.type==='seat.role'&&e.role==='black');
  await waitFor(spectator,e=>e.type==='seat.role'&&e.role==='spectator');
  for(const action of ['move','resign','rematch','nudge','pause'])assert.equal((await post(route+'/'+action,{seat_token:'invalid-seat',from:'e2',to:'e4'})).status,403);
  assert.equal((await post(route+'/move',{seat_token:white,from:'e2',to:'e5'})).status,400);
  assert.equal((await post(route+'/move',{seat_token:white,from:'e2',to:'e4'})).status,200);
  await waitFor(two,e=>e.type==='room.update'&&e.room.last_move?.san==='e4');
  const nudge=await post(route+'/nudge',{seat_token:white,request_id:randomUUID()});assert.equal(nudge.status,200);
  assert.equal((await post(route+'/move',{seat_token:black,from:'e7',to:'e5'})).status,200);
  await waitFor(one,e=>e.type==='room.update'&&e.room.last_move?.san==='e5');
  await waitFor(spectator,e=>e.type==='room.update'&&e.room.last_move?.san==='e5');
  assert.equal(spectator.some(e=>e.type==='seat.role'&&e.role!=='spectator'),false,'Broadcasts must not elevate a spectator');
  await restart();
  const resumed=await post(route+'/join',{seat_token:white});assert.equal(resumed.data.role,'white');assert.deepEqual(resumed.data.room.moves,['e4','e5']);
  const ended=await post(route+'/resign',{seat_token:black});assert.equal(ended.status,200);assert.equal(ended.data.room.score_event.scored,false);
  for(const colors of ['same','swap']){
    if(colors==='swap')assert.equal((await post(route+'/resign',{seat_token:black})).status,200);
    const next=await post(route+'/rematch',{seat_token:white,colors});assert.equal(next.status,200);assert.equal(next.data.room.time_control,undefined);
  }
  assert.equal((await post(route+'/join',{seat_token:white})).data.role,'black');
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM qk_players')).rows[0].n,playersBefore,'Guest play must not create hidden accounts');
  assert.equal((await request('/players/me')).status,401);
  assert.equal((await post('/players/me/computer-games',{})).status,401);
  // An account-owned seat still requires that account, even with the seat token.
  const owned=await post('/rooms',{},accountCookie),ownedCode=owned.data.room.code,seat=owned.data.seat_token;
  assert.equal((await post('/rooms/'+ownedCode+'/join',{seat_token:seat})).status,403);
  const intruder=await socket(ownedCode,null,seat);
  await waitFor(intruder,e=>e.type==='seat.role'&&e.role==='spectator');
  await post('/rooms/'+ownedCode+'/join',{});
  await waitFor(intruder,e=>e.type==='room.update'&&e.room.status==='active');
  assert.equal(intruder.some(e=>e.type==='seat.role'&&e.role==='white'),false,'Room updates cannot bypass account seat ownership');
  const engine=await post('/computer/move',{moves:[{from:'a1',to:'a8'}],level:1});
  assert.notEqual(engine.status,401,'Computer play must not require authentication');
  console.log(JSON.stringify({event:'guest.server.acceptance',passed:true,checks:['no account required or silently created','two guest WS clients and spectator','legal/illegal moves','idempotent guest join','seat-token authority','nudge','restart/resume','casual results','same/swap untimed rematch','private history protected','account-owned seats protected on HTTP and repeated WS broadcasts','computer endpoint does not require login']}));
}
