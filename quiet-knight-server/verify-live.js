import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { WebSocket } from 'ws';
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
  return {ws,version};
}
function pass(name,details={}) { console.log(JSON.stringify({acceptance:'PASS',name,...details})); }
try {
  const health=await request('/health'); assert.equal(health.ok,true); assert.equal(health.build,'qk-server-2026-09-08-r2'); pass('public r2 health and CORS'); const previous=await request('/rooms/2EK3SX'); assert.equal(previous.room.version,7); pass('room survives chess server replacement',{code:'2EK3SX'});
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
  const heartbeatClient=await socket(code); await heartbeatClient.version(reset.room.version); heartbeatClient.ws.send(JSON.stringify({type:'room.sync'})); pass('sync request sent',{code});
  const contested=await request('/rooms',{}); const raceKey=randomBytes(24).toString('hex'); const joins=await Promise.all([1,2].map(()=>fetch(base+'/rooms/'+contested.room.code+'/join',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({join_key:raceKey}),signal:AbortSignal.timeout(7000)}))); assert.ok(joins.every(r=>[200,409].includes(r.status))); const owner=await request('/rooms/'+contested.room.code+'/join',{join_key:raceKey});assert.equal(owner.role,'black'); const position=owner.room.fen; const moves=await Promise.all(['e','d'].map(file=>fetch(base+'/rooms/'+contested.room.code+'/move',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({seat_token:contested.seat_token,from:file+'2',to:file+'4',expected_fen:position}),signal:AbortSignal.timeout(7000)})));assert.equal(moves.filter(r=>r.status===200).length,1);assert.equal(moves.filter(r=>r.status===409).length,1);assert.equal((await request('/rooms/'+contested.room.code)).room.moves.length,1);pass('concurrent joins recover, concurrent moves cannot overwrite',{code:contested.room.code});
  pass('COMPLETE', {code, note:'Backend HTTP/WS/Redis test only; not a browser or phone test.'});
} catch(error) { console.error(JSON.stringify({acceptance:'FAIL',name:error.message}));process.exitCode=1; }
finally {clearTimeout(timeout);for(const ws of clients)ws.terminate();if(redis?.isOpen)await redis.quit();}
