import http from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { Chess } from 'chess.js';
import { createClient } from 'redis';
import { WebSocketServer } from 'ws';
import { StockfishService, EngineError } from './stockfish.js';
import {IdentityStore,IdentityError,publicPlayer,terminal} from './identity.js';
import {PushService,PushError,movePushPlan,nudgePlan} from './push-notifications.js';

const PORT = Number(process.env.PORT || 3000);
const FRONTEND_ORIGIN = new URL(process.env.FRONTEND_ORIGIN || 'https://quiet-knight-live-v2xp3y.v2.appdeploy.ai').origin;
const BUILD = 'qk-server-2026-09-13-r8-capability-delivery';
const log = (event, fields = {}) => console.log(JSON.stringify({event,...fields}));
const identities=new IdentityStore();
await identities.migrate().then(()=>log('identity.storage',{ready:identities.ready,migration:identities.ready?2:0})).catch(()=>log('identity.unavailable'));
const pushes=new PushService({pool:identities.ready?identities.pool:null,logger:log});
log('push.storage',pushes.status());
const computer = new StockfishService();
await computer.probe().then(() => log('computer.ready', computer.status())).catch(() => log('computer.unavailable'));
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const ROOM_TTL = 60 * 60 * 24 * 7;
const redis = createClient({ url: REDIS_URL });
redis.on('error', () => console.error('[redis] connection error'));
await redis.connect();

const sockets = new Map();
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const roomKey = code => `qk:room:${code}`;
const normalizeCode = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
const makeCode = () => Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
const hash = value => createHash('sha256').update(value).digest('hex');
const seatFromJoin = joinKey => hash(`qk-seat:${joinKey}`);
const digestJoin = joinKey => hash(joinKey);

function publicRoom(room) {
  const last = room.moves.length ? room.moves[room.moves.length - 1] : null;
  return {
    code: room.code,
    fen: room.fen,
    turn: room.turn,
    status: room.status,
    winner: room.winner,
    version: room.version,
    created_at: room.created_at,
    game_number: room.game_number||1,
    white_player:room.white_player||null,
    black_player:room.black_player||null,
    points_policy:room.points_policy||{eligible:false,remaining:0,reason:'Guests play casually'},
    score_event:room.score_event||null,
    white_joined: true,
    black_joined: Boolean(room.black_token),
    moves: room.moves.map(move => move.san),
    last_move: last ? { from: last.from, to: last.to, san: last.san } : null,
  };
}

async function loadRoom(code) {
  const normalized = normalizeCode(code);
  if (normalized.length !== 6) return null;
  const raw = await redis.get(roomKey(normalized));
  return raw ? JSON.parse(raw) : null;
}

async function saveRoom(room) {
  const saved = await redis.eval(`local current = redis.call('GET',KEYS[1]); if ARGV[1] == '0' then if current then return 0 end else if not current or cjson.decode(current).version ~= tonumber(ARGV[1]) then return 0 end end; redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[3]); redis.call('PUBLISH','qk:updates',ARGV[4]); return 1`, { keys:[roomKey(room.code)], arguments:[String(room.version-1),JSON.stringify(room),String(ROOM_TTL),JSON.stringify(publicRoom(room))] });
  if (!saved) { const error = new Error('Room changed; retry from the current position'); error.code = 'QK_CONFLICT'; throw error; }
  log('room.saved',{room:room.code,version:room.version,status:room.status});
}

async function settleRoom(room){
 if(!terminal(room)||room.score_event||!identities.ready)return room;
 try{
  const result=await identities.record(room);
  const next={...room,version:room.version+1,score_event:{id:result.id,game_number:result.game_number,result:result.result,scored:result.scored,reason:result.score_reason,white_points:result.white_points,black_points:result.black_points}};
  if(room.white_player)next.white_player=publicPlayer(await identities.profile(room.white_player.id));
  if(room.black_player)next.black_player=publicPlayer(await identities.profile(room.black_player.id));
  await saveRoom(next);return next;
 }catch(error){if(error.code==='QK_CONFLICT')return await loadRoom(room.code)||room;log('score.pending',{room:room.code,game_number:room.game_number||1});return room;}
}

function gameFromMoves(moves) {
  const game = new Chess();
  for (const move of moves) game.move({ from: move.from, to: move.to, promotion: move.promotion });
  return game;
}

function deriveStatus(game) {
  if (game.isCheckmate()) return { status: 'checkmate', winner: game.turn() === 'w' ? 'b' : 'w' };
  if (game.isDraw() || game.isStalemate() || game.isInsufficientMaterial() || game.isThreefoldRepetition()) return { status: 'draw', winner: null };
  return { status: 'active', winner: null };
}

function broadcast(code, payload) {
  log('room.broadcast',{room:code,version:payload.version});
  const set = sockets.get(code);
  if (!set) return;
  const message = JSON.stringify({ type: 'room.update', room: payload });
  for (const ws of [...set]) {
    if (ws.readyState === 1) {
      try { ws.send(message); } catch {}
    } else set.delete(ws);
  }
  if (!set.size) sockets.delete(code);
  void loadRoom(code).then(room=>{if(room)resolveSeats(room);}).catch(()=>{});
}

function roleFor(room,digest){return digest&&digest===hash(room.white_token)?'white':digest&&room.black_token&&digest===hash(room.black_token)?'black':'spectator';}
function tablePresence(code){const set=sockets.get(code)||[];return{white:[...set].some(ws=>ws.readyState===1&&ws.seatRole==='white'),black:[...set].some(ws=>ws.readyState===1&&ws.seatRole==='black')};}
function publishPresence(code){const presence=tablePresence(code);const data=JSON.stringify({type:'presence.update',...presence});for(const ws of sockets.get(code)||[])if(ws.readyState===1)ws.send(data);}
function resolveSeats(room){for(const ws of sockets.get(room.code)||[]){if(ws.readyState!==1||!ws.seatDigest)continue;ws.seatRole=roleFor(room,ws.seatDigest);ws.send(JSON.stringify({type:'seat.role',role:ws.seatRole,game_number:room.game_number||1,room_version:room.version}));}publishPresence(room.code);}
function sendToRole(code,role,payload){let delivered=0;const message=JSON.stringify(payload);for(const ws of sockets.get(code)||[])if(ws.readyState===1&&ws.seatRole===role)try{ws.send(message);delivered++;}catch{}return delivered;}

async function rateLimitNudge(room,seatToken){
  const key=`qk:nudge:${room.code}:${room.game_number||1}:${hash(seatToken).slice(0,24)}`;
  return Number(await redis.eval(`if redis.call('EXISTS',KEYS[1]..':cooldown')==1 then return -1 end; local count=redis.call('INCR',KEYS[1]..':window'); if count==1 then redis.call('EXPIRE',KEYS[1]..':window',1800) end; if count>3 then return -2 end; redis.call('SET',KEYS[1]..':cooldown','1','EX',120); return count`,{keys:[key],arguments:[]}));
}

const subscriber = redis.duplicate();
subscriber.on('error', () => console.error('[redis] subscription connection error'));
await subscriber.connect();
await subscriber.subscribe('qk:updates', message => { try { const view=JSON.parse(message); broadcast(view.code,view); } catch {} });

function corsHeaders(origin) {
  const allowed = origin === FRONTEND_ORIGIN || origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173';
  return {
    'Access-Control-Allow-Origin': allowed ? origin : FRONTEND_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  };
}

function send(res, status, data, origin) {
  log('http.response',{status,room:data?.room?.code,role:data?.role,version:data?.room?.version});
  res.writeHead(status, { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function bodyJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64 * 1024) throw new Error('payload_too_large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function createRoom(player=null) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = makeCode();
    if (await redis.exists(roomKey(code))) continue;
    const game = new Chess();
    const room = { code, white_token: randomUUID(), black_token: null, white_join_digest:null, black_join_digest: null, white_player:publicPlayer(player),black_player:null,game_number:1, moves: [], fen: game.fen(), turn: 'w', status: 'waiting', winner: null, version: 1, created_at: Date.now() };
    try { await saveRoom(room); return room; } catch(error) { if(error.code !== 'QK_CONFLICT') throw error; }
  }
  throw new Error('room_create_failed');
}

async function handleApi(req, res, url) {
  const origin = req.headers.origin || '';
  if (req.method === 'OPTIONS') return send(res, 204, {}, origin);
  if (req.method === 'GET' && url.pathname === '/health') { const healthy=redis.isReady&&subscriber.isReady; return send(res,healthy?200:503,{ok:healthy,service:'quiet-knight-live',build:BUILD},origin); }
  if (req.method === 'GET' && url.pathname === '/computer/health') return send(res, computer.ready ? 200 : 503, computer.status(), origin);
  if(req.method==='GET'&&url.pathname==='/push/public-key')return send(res,pushes.available?200:503,{supported:pushes.available,public_key:pushes.available?pushes.publicKey:null},origin);
  if(req.method==='POST'&&(url.pathname==='/push/subscribe'||url.pathname==='/push/unsubscribe')){
    const input=await bodyJson(req);const code=normalizeCode(input.room_code);const room=await loadRoom(code);
    if(!room)return send(res,404,{error:'Room not found'},origin);
    try{return send(res,200,url.pathname.endsWith('/subscribe')?await pushes.subscribe(room,input.seat_token,input.subscription):await pushes.unsubscribe(room,input.seat_token,input.endpoint),origin);}catch(error){if(error instanceof PushError)return send(res,error.status,{error:error.message},origin);throw error;}
  }
  if(req.method==='GET'&&url.pathname==='/players/health')return send(res,200,await identities.health(),origin);
  if(req.method==='POST'&&url.pathname==='/players'){
    const rateKey='qk:id-create:'+hash(String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0]);
    const count=await redis.incr(rateKey);if(count===1)await redis.expire(rateKey,3600);
    if(count>12)return send(res,429,{error:'Please wait before creating another Knight ID'},origin);
    const input=await bodyJson(req);return send(res,201,await identities.create(input.handle),origin);
  }
  if(req.method==='GET'&&url.pathname==='/players/me'){
    const player=await identities.authenticate(req.headers.authorization);if(!player)return send(res,401,{error:'A Knight ID credential is required'},origin);
    return send(res,200,{player,games:await identities.recent(player.id)},origin);
  }
  const pairMatch=url.pathname.match(/^\/players\/([a-f0-9-]{36})\/head-to-head\/([a-f0-9-]{36})$/);
  if(req.method==='GET'&&pairMatch)return send(res,200,await identities.headToHead(pairMatch[1],pairMatch[2]),origin);
  if (req.method === 'POST' && url.pathname === '/computer/move') {
    const controller = new AbortController();
    const closed = () => { if (!res.writableEnded) controller.abort(); };
    res.once('close', closed);
    try {
      let input;
      try { input = await bodyJson(req); } catch { return send(res, 400, { error: 'Invalid computer request' }, origin); }
      const result = await computer.move(input, controller.signal);
      if (res.destroyed) return;
      log('computer.move', { engine: result.engine, app_level: result.level, skill: result.skill, elapsed_ms: result.elapsed_ms });
      return send(res, 200, result, origin);
    } catch (error) {
      if (res.destroyed) return;
      const status = error instanceof EngineError ? error.status : 503;
      if (status === 429) res.setHeader('Retry-After', '1');
      return send(res, status, { error: error instanceof EngineError ? error.message : 'Stockfish unavailable' }, origin);
    } finally { res.off('close', closed); }
  }
  if (req.method === 'POST' && url.pathname === '/rooms') {
    const player=await identities.authenticate(req.headers.authorization);
    const room = await createRoom(player);
    return send(res, 200, { room: publicRoom(room), seat_token: room.white_token, role: 'white' }, origin);
  }
  const match = url.pathname.match(/^\/rooms\/([A-Z0-9]{6})(?:\/(join|move|resign|rematch|nudge))?$/i);
  if (!match) return send(res, 404, { error: 'Not found' }, origin);
  const code = normalizeCode(match[1]);
  const action = match[2] || '';
  let room = await loadRoom(code);
  if (!room) return send(res, 404, { error: 'Room not found' }, origin);
  if (req.method === 'GET' && !action) return send(res, 200, { room: publicRoom(await settleRoom(room)) }, origin);
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, origin);
  const input = await bodyJson(req);

  if (action === 'join') {
    const seatToken = typeof input.seat_token === 'string' ? input.seat_token : '';
    const joinKey = typeof input.join_key === 'string' && /^[a-f0-9]{48}$/.test(input.join_key) ? input.join_key : '';
    const joinDigest = joinKey ? digestJoin(joinKey) : null;
    if(joinDigest&&room.white_join_digest===joinDigest)return send(res,200,{room:publicRoom(room),seat_token:room.white_token,role:'white'},origin);
    if (seatToken && seatToken === room.white_token) return send(res, 200, { room: publicRoom(room), seat_token: room.white_token, role: 'white' }, origin);
    if (seatToken && room.black_token && seatToken === room.black_token) return send(res, 200, { room: publicRoom(room), seat_token: room.black_token, role: 'black' }, origin);
    if (joinDigest && room.black_token && room.black_join_digest === joinDigest) return send(res, 200, { room: publicRoom(room), seat_token: room.black_token, role: 'black' }, origin);
    if (!room.black_token) {
      const player=await identities.authenticate(req.headers.authorization);
      room.black_token = joinKey ? seatFromJoin(joinKey) : randomUUID();
      room.black_join_digest = joinDigest;
      room.black_player=publicPlayer(player);
      room.started_at=Date.now();
      room.points_policy=await identities.pairStatus(room.white_player,room.black_player);
      room.status = 'active';
      room.version += 1;
      await saveRoom(room);
      const view = publicRoom(room);
      return send(res, 200, { room: view, seat_token: room.black_token, role: 'black' }, origin);
    }
    return send(res, 200, { room: publicRoom(room), seat_token: null, role: 'spectator' }, origin);
  }

  const seatToken = typeof input.seat_token === 'string' ? input.seat_token : '';
  const color = seatToken === room.white_token ? 'w' : seatToken && seatToken === room.black_token ? 'b' : null;
  if (!color) return send(res, 403, { error: 'You do not own a seat in this game' }, origin);

  if(action==='nudge'){
    let plan;try{plan=nudgePlan(room,color,input.request_id);}catch(error){if(error instanceof PushError)return send(res,error.status,{error:error.message},origin);throw error;}
    const limited=await rateLimitNudge(room,seatToken);if(limited<0)return send(res,429,{error:'Give them a minute.'},origin);
    const targetRole=plan.targetColor==='w'?'white':'black';
    const liveConnections=sendToRole(room.code,targetRole,{type:'opponent.nudge',event_id:plan.eventId,room_code:room.code,message:'Your opponent nudged you.'});
    if(liveConnections>0){let pushAvailable=false;try{pushAvailable=(await pushes.subscriptionCount(room,plan.targetColor))>0;}catch{log('push.failure',{kind:'nudge-capability',status:'internal'});}return send(res,200,{ok:true,recipient_live:true,push_available:pushAvailable,delivered:true,delivery:'table',message:'Delivered at table.'},origin);}
    let delivery;try{delivery=await pushes.deliver(room,plan,'nudge');}catch{log('push.failure',{kind:'nudge',status:'internal'});delivery={status:'failed',subscriptions:0,sent:0};}
    const pushAvailable=delivery.subscriptions>0;const delivered=delivery.sent>0;
    return send(res,200,{ok:true,recipient_live:false,push_available:pushAvailable,delivered,delivery:delivered?'push':pushAvailable?'failed':'unavailable',message:delivered?'Notification sent.':pushAvailable?'Notification unavailable right now.':"They haven't enabled notifications."},origin);
  }

  if (action === 'move') {
    if (room.status !== 'active') return send(res, 409, { error: 'Game is not active' }, origin);
    if (room.turn !== color) return send(res, 409, { error: 'Not your turn' }, origin);
    if (input.expected_fen && input.expected_fen !== room.fen) return send(res, 409, { error: 'Board changed; refresh and try again' }, origin);
    const game = gameFromMoves(room.moves);
    let move;
    try { move = game.move({ from: input.from, to: input.to, promotion: input.promotion || 'q' }); } catch { move = null; }
    if (!move) return send(res, 400, { error: 'Illegal move' }, origin);
    room.moves.push({ from: move.from, to: move.to, promotion: move.promotion, san: move.san });
    room.fen = game.fen();
    room.turn = game.turn();
    Object.assign(room, deriveStatus(game));
    if(terminal(room))room.ended_at=Date.now();
    room.version += 1;
    await saveRoom(room);
    const pushPlan=movePushPlan(room,color);if(pushPlan)void pushes.deliver(room,pushPlan,'move').catch(()=>log('push.failure',{kind:'move',status:'internal'}));
    room=await settleRoom(room);
    const view = publicRoom(room);
    return send(res, 200, { room: view }, origin);
  }

  if (action === 'resign') {
    if (room.status !== 'active') return send(res, 409, { error: 'Game is not active' }, origin);
    room.status = 'resigned';
    room.winner = color === 'w' ? 'b' : 'w';
    room.ended_at=Date.now();
    room.version += 1;
    await saveRoom(room);
    room=await settleRoom(room);
    const view = publicRoom(room);
    return send(res, 200, { room: view }, origin);
  }

  if (action === 'rematch') {
    if (room.status === 'active' || room.status === 'waiting') return send(res, 409, { error: 'Finish the current game first' }, origin);
    if(input.game_number!==undefined&&input.game_number!==(room.game_number||1))return send(res,409,{error:'The table has already changed games'},origin);
    const previousNumber=room.game_number||1;
    room=await settleRoom(room);
    if((room.game_number||1)!==previousNumber||!terminal(room))return send(res,409,{error:'The rematch has already started'},origin);
    if(room.white_player&&room.black_player&&!room.score_event)return send(res,503,{error:'The result is saved at the table. Please wait for Quiet Points to be recorded before rematching.'},origin);
    if(input.colors!==undefined&&!['same','swap'].includes(input.colors))return send(res,400,{error:'Choose same or swap colors'},origin);
    if(input.colors==='swap'&&room.black_token){
      [room.white_token,room.black_token]=[room.black_token,room.white_token];
      [room.white_player,room.black_player]=[room.black_player||null,room.white_player||null];
      [room.white_join_digest,room.black_join_digest]=[room.black_join_digest||null,room.white_join_digest||null];
    }
    room.game_number=previousNumber+1;room.started_at=Date.now();room.ended_at=null;room.score_event=null;
    room.points_policy=await identities.pairStatus(room.white_player,room.black_player);
    const game = new Chess();
    room.moves = [];
    room.fen = game.fen();
    room.turn = 'w';
    room.status = room.black_token ? 'active' : 'waiting';
    room.winner = null;
    room.version += 1;
    await saveRoom(room);
    const view = publicRoom(room);
    return send(res, 200, { room: view }, origin);
  }

  return send(res, 404, { error: 'Not found' }, origin);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  log('http.request',{method:req.method,path:url.pathname});
  handleApi(req, res, url).catch(err => {
    if(err instanceof IdentityError)return send(res,err.status,{error:err.message},req.headers.origin||'');
    if(err instanceof PushError)return send(res,err.status,{error:err.message},req.headers.origin||'');
    if (err?.code === 'QK_CONFLICT') return send(res,409,{error:'Room changed; retry from the current position'},req.headers.origin||'');
    log('http.error',{name:err?.name||'Error'});
    send(res, 500, { error: 'Server error' }, req.headers.origin || '');
  });
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
server.on('upgrade', async (req, socket, head) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname !== '/ws') return socket.destroy();
    const code = normalizeCode(url.searchParams.get('room'));
    const room = await loadRoom(code);
    if (!room) return socket.destroy();
    wss.handleUpgrade(req, socket, head, ws => {
      ws.roomCode = code;
      log('ws.connected',{room:code,version:room.version});
      const set = sockets.get(code) || new Set();
      set.add(ws);
      sockets.set(code, set);
      ws.alive=true;ws.seatRole='spectator';ws.on('pong',()=>{ws.alive=true;});
      ws.send(JSON.stringify({ type: 'room.update', room: publicRoom(room) }));
      ws.send(JSON.stringify({type:'presence.update',...tablePresence(code)}));
      ws.on('message', async raw => {
        try {
          const message=JSON.parse(String(raw));
          if(message.type==='presence.hello'){
            if(Date.now()-(ws.lastHello||0)<1000)return;ws.lastHello=Date.now();
            const token=typeof message.seat_token==='string'&&message.seat_token.length<=128?message.seat_token:'';
            const latest=await loadRoom(code);if(!latest||ws.readyState!==1)return;
            ws.seatDigest=token?hash(token):null;ws.seatRole=roleFor(latest,ws.seatDigest);
            ws.send(JSON.stringify({type:'seat.role',role:ws.seatRole,game_number:latest.game_number||1,room_version:latest.version}));publishPresence(code);return;
          }
          if(message.type!=='room.sync')return;
          const latest=await loadRoom(code);if(latest&&ws.readyState===1){ws.send(JSON.stringify({type:'room.update',room:publicRoom(await settleRoom(latest))}));resolveSeats(latest);}
        }catch{}
      });
      ws.on('close', () => {
        log('ws.disconnected',{room:code});
        set.delete(ws);
        if (!set.size) sockets.delete(code);
        else publishPresence(code);
      });
      ws.on('error', () => {});
    });
  } catch {
    socket.destroy();
  }
});

const pingTimer=setInterval(()=>{for(const ws of wss.clients){if(ws.alive===false){ws.terminate();continue;}ws.alive=false;try{ws.ping();}catch{ws.terminate();}}},20000);
pingTimer.unref();

server.listen(PORT, '0.0.0.0', () => log('server.listening',{port:PORT,build:BUILD,origin:FRONTEND_ORIGIN}));
