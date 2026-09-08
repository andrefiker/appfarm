import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { WebSocket } from 'ws';
import { Chess } from 'chess.js';
import { createClient } from 'redis';
const base = 'https://quiet-knight-server-production.up.railway.app';
const origin = 'https://quiet-knight-live-v2xp3y.v2.appdeploy.ai';
const clients = [];
let redis;
const timeout = setTimeout(() => { console.error('[acceptance] FAIL: overall time limit'); process.exit(1); }, 55000);
async function request(path, body, expected = 200) {
  const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(7000) });
  assert.equal(response.status, expected, 'HTTP status for ' + path);
  assert.equal(response.headers.get('access-control-allow-origin'), origin, 'CORS origin');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return response.json();
}
async function socket(code) {
  const ws = new WebSocket(base.replace('https:', 'wss:') + '/ws?room=' + code, { origin, handshakeTimeout: 7000 });
  const messages = [];
  ws.on('message', value => { try { messages.push(JSON.parse(value)); } catch {} });
  ws.on('error', () => {});
  clients.push(ws);
  async function version(v) {
    const end = Date.now() + 7000;
    while (Date.now() < end) {
      const found = messages.find(m => m.type === 'room.update' && m.room.code === code && m.room.version >= v);
      if (found) return found.room;
      await new Promise(r => setTimeout(r, 30));
    }
    throw new Error('WebSocket update timeout for version ' + v);
  }
  return {ws,version,messages};
}
function pass(name,details={}) { console.log(JSON.stringify({acceptance:'PASS',name,...details})); }
try {
  const health=await request('/health'); assert.equal(health.ok,true); assert.equal(health.build,'qk-server-2026-09-08-r2'); pass('public r2 health and CORS'); if(process.env.QK_PERSISTENCE_ROOM){const previous=await request('/rooms/'+process.env.QK_PERSISTENCE_ROOM);assert.ok(previous.room.version>=7);pass('room survives chess server replacement',{code:previous.room.code});}
  const preflight = await fetch(base + '/rooms', {method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'},signal:AbortSignal.timeout(7000)});
  assert.equal(preflight.status,204); assert.equal(preflight.headers.get('access-control-allow-origin'),origin); pass('preflight');
  const a = await request('/rooms', {}); const code = a.room.code; assert.equal(a.role,'white');
  assert.equal((await request('/rooms/'+code)).room.status,'waiting');
  const join_key = randomBytes(24).toString('hex');
  const b = await request('/rooms/'+code+'/join',{join_key});
  const retry = await request('/rooms/'+code+'/join',{join_key});
  assert.equal(b.role,'black');assert.equal(retry.role,'black');assert.equal(retry.seat_token,b.seat_token);
  const spectator = await request('/rooms/'+code+'/join',{join_key:randomBytes(24).toString('hex')});
  assert.equal(spectator.role,'spectator');assert.equal(spectator.seat_token,null);
  pass('create, read, idempotent Black join, spectator',{code,version:b.room.version});
  const one=await socket(code), two=await socket(code);
  await Promise.all([one.version(b.room.version),two.version(b.room.version)]); pass('two initial socket snapshots',{code});
  const e4=await request('/rooms/'+code+'/move',{seat_token:a.seat_token,from:'e2',to:'e4',expected_fen:b.room.fen});
  const seenE4=await Promise.all([one.version(e4.room.version),two.version(e4.room.version)]);
  assert.ok(seenE4.every(r=>r.last_move.san==='e4')); pass('e4 broadcast to both sockets',{code,version:e4.room.version});
  await request('/rooms/'+code+'/move',{seat_token:a.seat_token,from:'d2',to:'d4'},409);
  await request('/rooms/'+code+'/move',{seat_token:'invalid',from:'e7',to:'e5'},403);
  const e5=await request('/rooms/'+code+'/move',{seat_token:b.seat_token,from:'e7',to:'e5',expected_fen:e4.room.fen});
  const seenE5=await Promise.all([one.version(e5.room.version),two.version(e5.room.version)]);
  assert.ok(seenE5.every(r=>r.moves.join(' ')==='e4 e5')); pass('e5 broadcast and authority guards',{code,version:e5.room.version});
  one.ws.close(); const nf3=await request('/rooms/'+code+'/move',{seat_token:a.seat_token,from:'g1',to:'f3',expected_fen:e5.room.fen});
  const reconnected=await socket(code); assert.equal((await reconnected.version(nf3.room.version)).moves.at(-1),'Nf3');
  const resumed=await request('/rooms/'+code+'/join',{seat_token:b.seat_token,join_key});assert.equal(resumed.role,'black');
  pass('socket reconnect snapshot and seat recovery',{code,version:nf3.room.version});
  redis=createClient({url:process.env.REDIS_URL});redis.on('error',()=>{});await redis.connect();
  const raw=await redis.get('qk:room:'+code);const ttl=await redis.ttl('qk:room:'+code);
  assert.equal(JSON.parse(raw).version,nf3.room.version);assert.ok(ttl>604700&&ttl<=604800);pass('real Redis room and seven-day TTL',{code,ttl});
  const ended=await request('/rooms/'+code+'/resign',{seat_token:a.seat_token});assert.equal(ended.room.winner,'b');
  await two.version(ended.room.version);
  const reset=await request('/rooms/'+code+'/rematch',{seat_token:b.seat_token});assert.equal(reset.room.moves.length,0);assert.equal(reset.room.status,'active');
  await two.version(reset.room.version);pass('resign, rematch and broadcast',{code,version:reset.room.version});
  const heartbeatClient=await socket(code); await heartbeatClient.version(reset.room.version); const beforeSync=heartbeatClient.messages.length;heartbeatClient.ws.send(JSON.stringify({type:'room.sync'})); const syncDeadline=Date.now()+7000;while(heartbeatClient.messages.length===beforeSync&&Date.now()<syncDeadline)await new Promise(r=>setTimeout(r,25));assert.ok(heartbeatClient.messages.length>beforeSync);pass('heartbeat returns fresh socket snapshot',{code});
  const contested=await request('/rooms',{}); const raceKey=randomBytes(24).toString('hex'); const joins=await Promise.all([1,2].map(()=>fetch(base+'/rooms/'+contested.room.code+'/join',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({join_key:raceKey}),signal:AbortSignal.timeout(7000)}))); assert.ok(joins.every(r=>[200,409].includes(r.status))); const owner=await request('/rooms/'+contested.room.code+'/join',{join_key:raceKey});assert.equal(owner.role,'black'); const position=owner.room.fen; const moves=await Promise.all(['e','d'].map(file=>fetch(base+'/rooms/'+contested.room.code+'/move',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({seat_token:contested.seat_token,from:file+'2',to:file+'4',expected_fen:position}),signal:AbortSignal.timeout(7000)})));assert.equal(moves.filter(r=>r.status===200).length,1);assert.equal(moves.filter(r=>r.status===409).length,1);assert.equal((await request('/rooms/'+contested.room.code)).room.moves.length,1);pass('concurrent joins recover, concurrent moves cannot overwrite',{code:contested.room.code});
  async function sequence(plies) {
    const white=await request('/rooms',{});const joined=await request('/rooms/'+white.room.code+'/join',{join_key:randomBytes(24).toString('hex')});let room=joined.room;
    for(let i=0;i<plies.length;i++){const ply=plies[i];const result=await request('/rooms/'+room.code+'/move',{seat_token:i%2?joined.seat_token:white.seat_token,from:ply.slice(0,2),to:ply.slice(2,4),promotion:ply[4]||'q',expected_fen:room.fen});room=result.room;}
    return room;
  }
  const ep=await sequence(['e2e4','a7a6','e4e5','d7d5','e5d6','d8d6']);const replay=new Chess();ep.moves.forEach(san=>replay.move(san));assert.equal(replay.history({verbose:true}).filter(m=>m.captured).map(m=>m.captured).join(''),'pp');assert.ok(ep.moves.includes('exd6'));pass('en passant and subsequent capture',{code:ep.code});
  const promotion=await sequence(['a2a4','h7h5','a4a5','h5h4','a5a6','h4h3','a6b7','h3g2','b7a8q','g2h1q','a8b8','h1g1','b8c8','g1f1','e1f1']);
  const promotedGame=new Chess();promotion.moves.forEach(san=>promotedGame.move(san));assert.equal(promotedGame.history({verbose:true}).at(-1).captured,'q');assert.ok(promotion.moves.some(s=>s.includes('=Q')));pass('both promotions and capture of promoted queen',{code:promotion.code});
  const mate=await sequence(['f2f3','e7e5','g2g4','d8h4']);assert.equal(mate.status,'checkmate');assert.equal(mate.winner,'b');pass('checkmate authority',{code:mate.code});
  pass('COMPLETE', {code, note:'Backend HTTP/WS/Redis test only; not a browser or phone test.'});
} catch(error) { console.error(JSON.stringify({acceptance:'FAIL',name:error.message}));process.exitCode=1; }
finally {clearTimeout(timeout);for(const ws of clients)ws.terminate();if(redis?.isOpen)await redis.quit();}
