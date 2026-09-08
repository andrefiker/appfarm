import http from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { Chess } from 'chess.js';
import { createClient } from 'redis';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 3000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://quiet-knight-live-v2xp3y.v2.appdeploy.ai';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const ROOM_TTL = 60 * 60 * 24 * 7;
const redis = createClient({ url: REDIS_URL });
redis.on('error', err => console.error('[redis]', err?.message || err));
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
  await redis.set(roomKey(room.code), JSON.stringify(room), { EX: ROOM_TTL });
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
    await saveRoom(room);
    return room;
  }
  throw new Error('room_create_failed');
}

async function handleApi(req, res, url) {
  const origin = req.headers.origin || '';
  if (req.method === 'OPTIONS') return send(res, 204, {}, origin);
  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true, service: 'quiet-knight-live' }, origin);
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
      broadcast(code, view);
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
    broadcast(code, view);
    return send(res, 200, { room: view }, origin);
  }

  if (action === 'resign') {
    if (room.status !== 'active') return send(res, 409, { error: 'Game is not active' }, origin);
    room.status = 'resigned';
    room.winner = color === 'w' ? 'b' : 'w';
    room.version += 1;
    await saveRoom(room);
    const view = publicRoom(room);
    broadcast(code, view);
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
    broadcast(code, view);
    return send(res, 200, { room: view }, origin);
  }

  return send(res, 404, { error: 'Not found' }, origin);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  handleApi(req, res, url).catch(err => {
    console.error('[request]', err?.stack || err);
    send(res, 500, { error: 'Server error' }, req.headers.origin || '');
  });
});

const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', async (req, socket, head) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname !== '/ws') return socket.destroy();
    const code = normalizeCode(url.searchParams.get('room'));
    const room = await loadRoom(code);
    if (!room) return socket.destroy();
    wss.handleUpgrade(req, socket, head, ws => {
      ws.roomCode = code;
      const set = sockets.get(code) || new Set();
      set.add(ws);
      sockets.set(code, set);
      ws.send(JSON.stringify({ type: 'room.update', room: publicRoom(room) }));
      ws.on('close', () => {
        set.delete(ws);
        if (!set.size) sockets.delete(code);
      });
      ws.on('error', () => {});
    });
  } catch {
    socket.destroy();
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`Quiet Knight server listening on ${PORT}`));
