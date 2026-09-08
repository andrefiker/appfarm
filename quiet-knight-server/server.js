import http from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { Chess } from 'chess.js';
import { createClient } from 'redis';
import { WebSocketServer } from 'ws';
import { StockfishService, EngineError } from './stockfish.js';

const PORT = Number(process.env.PORT || 3000);
const FRONTEND_ORIGIN = new URL(process.env.FRONTEND_ORIGIN || 'https://quiet-knight-live-v2xp3y.v2.appdeploy.ai').origin;
const BUILD = 'qk-server-2026-09-08-r3-stockfish';
const log = (event, fields = {}) => console.log(JSON.stringify({event,...fields}));
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
}

const subscriber = redis.duplicate();
subscriber.on('error', () => console.error('[redis] subscription connection error'));
await subscriber.connect();
await subscriber.subscribe('qk:updates', message => { try { const view=JSON.parse(message); broadcast(view.code,view); } catch {} });

function corsHeaders(origin) {
  const allowed = origin === FRONTEND_ORIGIN || origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173';
  return {
    'Access-Control-Allow-Origin': allowed ? origin : FRONTEND_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
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

async function createRoom() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = makeCode();
    if (await redis.exists(roomKey(code))) continue;
    const game = new Chess();
    const room = { code, white_token: randomUUID(), black_token: null, black_join_digest: null, moves: [], fen: game.fen(), turn: 'w', status: 'waiting', winner: null, version: 1, created_at: Date.now() };
    try { await saveRoom(room); return room; } catch(error) { if(error.code !== 'QK_CONFLICT') throw error; }
  }
  throw new Error('room_create_failed');
}

async function handleApi(req, res, url) {
  const origin = req.headers.origin || '';
  if (req.method === 'OPTIONS') return send(res, 204, {}, origin);
  if (req.method === 'GET' && url.pathname === '/health') { const healthy=redis.isReady&&subscriber.isReady; return send(res,healthy?200:503,{ok:healthy,service:'quiet-knight-live',build:BUILD},origin); }
  if (req.method === 'GET' && url.pathname === '/computer/health') return send(res, computer.ready ? 200 : 503, computer.status(), origin);
  if (req.method === 'POST' && url.pathname === '/computer/move') {
    const controller = new AbortController();
    const closed = () => { if (!res.writableEnded) controller.abort(); };
    res.once('close', closed);
    try {
      let input;
      try { input = await bodyJson(req); } catch { return send(res, 400, { error: 'Invalid computer request' }, origin); }
      const result = await computer.move(input, controller.signal);
      if (res.destroyed) return;
      log('computer.move', { engine: result.engine, level: result.level, skill: result.skill, elapsed_ms: result.elapsed_ms });
      return send(res, 200, result, origin);
    } catch (error) {
      if (res.destroyed) return;
      const status = error instanceof EngineError ? error.status : 503;
      if (status === 429) res.setHeader('Retry-After', '1');
      return send(res, status, { error: error instanceof EngineError ? error.message : 'Stockfish unavailable' }, origin);
    } finally { res.off('close', closed); }
  }
  if (req.method === 'POST' && url.pathname === '/rooms') {
    const room = await createRoom();
    return send(res, 200, { room: publicRoom(room), seat_token: room.white_token, role: 'white' }, origin);
  }
  const match = url.pathname.match(/^\/rooms\/([A-Z0-9]{6})(?:\/(join|move|resign|rematch))?$/i);
  if (!match) return send(res, 404, { error: 'Not found' }, origin);
  const code = normalizeCode(match[1]);
  const action = match[2] || '';
  let room = await loadRoom(code);
  if (!room) return send(res, 404, { error: 'Room not found' }, origin);
  if (req.method === 'GET' && !action) return send(res, 200, { room: publicRoom(room) }, origin);
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, origin);
  const input = await bodyJson(req);

  if (action === 'join') {
    const seatToken = typeof input.seat_token === 'string' ? input.seat_token : '';
    const joinKey = typeof input.join_key === 'string' && /^[a-f0-9]{48}$/.test(input.join_key) ? input.join_key : '';
    const joinDigest = joinKey ? digestJoin(joinKey) : null;
    if (seatToken && seatToken === room.white_token) return send(res, 200, { room: publicRoom(room), seat_token: room.white_token, role: 'white' }, origin);
    if (seatToken && room.black_token && seatToken === room.black_token) return send(res, 200, { room: publicRoom(room), seat_token: room.black_token, role: 'black' }, origin);
    if (joinDigest && room.black_token && room.black_join_digest === joinDigest) return send(res, 200, { room: publicRoom(room), seat_token: room.black_token, role: 'black' }, origin);
    if (!room.black_token) {
      room.black_token = joinKey ? seatFromJoin(joinKey) : randomUUID();
      room.black_join_digest = joinDigest;
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
    room.version += 1;
    await saveRoom(room);
    const view = publicRoom(room);
    return send(res, 200, { room: view }, origin);
  }

  if (action === 'resign') {
    if (room.status !== 'active') return send(res, 409, { error: 'Game is not active' }, origin);
    room.status = 'resigned';
    room.winner = color === 'w' ? 'b' : 'w';
    room.version += 1;
    await saveRoom(room);
    const view = publicRoom(room);
    return send(res, 200, { room: view }, origin);
  }

  if (action === 'rematch') {
    if (room.status === 'active' || room.status === 'waiting') return send(res, 409, { error: 'Finish the current game first' }, origin);
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
      ws.send(JSON.stringify({ type: 'room.update', room: publicRoom(room) }));
      ws.on('message', async raw => {
        try { const message=JSON.parse(String(raw)); if(message.type!=='room.sync')return; const latest=await loadRoom(code); if(latest&&ws.readyState===1)ws.send(JSON.stringify({type:'room.update',room:publicRoom(latest)})); } catch {}
      });
      ws.on('close', () => {
        log('ws.disconnected',{room:code});
        set.delete(ws);
        if (!set.size) sockets.delete(code);
      });
      ws.on('error', () => {});
    });
  } catch {
    socket.destroy();
  }
});

server.listen(PORT, '0.0.0.0', () => log('server.listening',{port:PORT,build:BUILD,origin:FRONTEND_ORIGIN}));
