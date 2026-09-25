/* LEGACY APPDEPLOY SCAFFOLD: retained because platform routes import these modules. The production frontend uses native fetch/WebSocket to Railway; its authority is andrefiker/appfarm/quiet-knight-server/server.js. Do not repair live multiplayer here or wire these legacy room routes back into the UI. */ import { db, json, error } from '@appdeploy/sdk';
import { Chess } from 'chess.js';
import { randomUUID, createHash } from 'node:crypto';
import { notifySubscribers } from './realtime-subscribers';

type Color = 'w' | 'b';
type MoveRecord = { from: string; to: string; promotion?: string; san: string };
type RoomRecord = {
  code: string;
  white_token: string;
  black_token: string | null;
  black_join_digest?: string;
  moves: MoveRecord[];
  fen: string;
  turn: Color;
  status: 'waiting' | 'active' | 'checkmate' | 'draw' | 'resigned';
  winner: Color | null;
  version: number;
  created_at: number;
};

type StoredRoom = RoomRecord & { id: string };

const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const tableFor = (code: string) => `chess_room_${code.replace(/[^A-Z0-9]/g, '')}`;

function makeCode() {
  let out = '';
  for (let i = 0; i < 6; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function gameFromMoves(moves: MoveRecord[]) {
  const game = new Chess();
  for (const move of moves) game.move({ from: move.from, to: move.to, promotion: move.promotion });
  return game;
}

function statusFrom(game: Chess): Pick<RoomRecord, 'status' | 'winner'> {
  if (game.isCheckmate()) return { status: 'checkmate', winner: game.turn() === 'w' ? 'b' : 'w' };
  if (game.isDraw() || game.isStalemate() || game.isInsufficientMaterial() || game.isThreefoldRepetition()) return { status: 'draw', winner: null };
  return { status: 'active', winner: null };
}

function publicRoom(room: RoomRecord) {
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
    moves: room.moves.map(m => m.san),
    last_move: last ? { from: last.from, to: last.to, san: last.san } : null,
  };
}

async function loadRoom(codeRaw: string): Promise<StoredRoom | null> {
  const code = codeRaw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 6) return null;
  const { items } = await db.list<RoomRecord>(tableFor(code), { limit: 1 });
  return items[0] ? (items[0] as StoredRoom) : null;
}

async function saveRoom(room: StoredRoom) {
  const { id, ...record } = room;
  const [ok] = await db.update(tableFor(room.code), [{ id, record }]);
  if (!ok) throw new Error('room_update_failed');
}

async function broadcast(room: RoomRecord, connectionId?: string) {
  await notifySubscribers('chess_room', room.code, publicRoom(room), connectionId);
}

export const chessRoutes = {
  'POST /api/rooms': [async () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const code = makeCode();
      const existing = await loadRoom(code);
      if (existing) continue;
      const game = new Chess();
      const room: RoomRecord = {
        code,
        white_token: randomUUID(),
        black_token: null,
        moves: [],
        fen: game.fen(),
        turn: 'w',
        status: 'waiting',
        winner: null,
        version: 1,
        created_at: Date.now(),
      };
      const [id] = await db.add(tableFor(code), [room]);
      if (!id) continue;
      return json({ room: publicRoom(room), seat_token: room.white_token, role: 'white' });
    }
    return error('Could not create a room', 503);
  }],

  'GET /api/rooms/:code': [async ({ params }) => {
    const room = await loadRoom(params.code);
    if (!room) return error('Room not found', 404);
    return json({ room: publicRoom(room) });
  }],

  'POST /api/rooms/:code/join': [async ({ params, body }) => {
    const room = await loadRoom(params.code);
    if (!room) return error('Room not found', 404);
    const input = (body || {}) as { seat_token?: string; join_key?: string }; const joinDigest = typeof input.join_key === 'string' && /^[a-f0-9]{48}$/.test(input.join_key) ? createHash('sha256').update(input.join_key).digest('hex') : null;
    if (input.seat_token && input.seat_token === room.white_token) return json({ room: publicRoom(room), seat_token: room.white_token, role: 'white' });
    if (input.seat_token && room.black_token && input.seat_token === room.black_token) return json({ room: publicRoom(room), seat_token: room.black_token, role: 'black' });
    if (joinDigest && room.black_token && room.black_join_digest === joinDigest) return json({ room: publicRoom(room), seat_token: room.black_token, role: 'black' });
    if (!room.black_token) {
      room.black_token = joinDigest ? createHash('sha256').update(`qk-seat:${input.join_key}`).digest('hex') : randomUUID(); if (joinDigest) room.black_join_digest = joinDigest;
      room.status = 'active';
      room.version += 1;
      await saveRoom(room);
      await broadcast(room);
      return json({ room: publicRoom(room), seat_token: room.black_token, role: 'black' });
    }
    return json({ room: publicRoom(room), seat_token: null, role: 'spectator' });
  }],

  'POST /api/rooms/:code/move': [async ({ params, body }) => {
    const room = await loadRoom(params.code);
    if (!room) return error('Room not found', 404);
    const input = (body || {}) as { seat_token?: string; from?: string; to?: string; promotion?: string; expected_fen?: string; connection_id?: string };
    const color: Color | null = input.seat_token === room.white_token ? 'w' : input.seat_token && input.seat_token === room.black_token ? 'b' : null;
    if (!color) return error('You do not own a seat in this game', 403);
    if (room.status !== 'active') return error('Game is not active', 409);
    if (room.turn !== color) return error('Not your turn', 409);
    if (input.expected_fen && input.expected_fen !== room.fen) return error('Board changed; refresh and try again', 409);
    if (!input.from || !input.to) return error('Move requires from and to squares', 400);
    const game = gameFromMoves(room.moves);
    let move;
    try {
      move = game.move({ from: input.from, to: input.to, promotion: input.promotion || 'q' });
    } catch {
      return error('Illegal move', 400);
    }
    if (!move) return error('Illegal move', 400);
    room.moves = [...room.moves, { from: move.from, to: move.to, promotion: move.promotion, san: move.san }];
    room.fen = game.fen();
    room.turn = game.turn();
    const derived = statusFrom(game);
    room.status = derived.status;
    room.winner = derived.winner;
    room.version += 1;
    await saveRoom(room);
    await broadcast(room, input.connection_id);
    return json({ room: publicRoom(room) });
  }],

  'POST /api/rooms/:code/resign': [async ({ params, body }) => {
    const room = await loadRoom(params.code);
    if (!room) return error('Room not found', 404);
    const input = (body || {}) as { seat_token?: string; connection_id?: string };
    const color: Color | null = input.seat_token === room.white_token ? 'w' : input.seat_token && input.seat_token === room.black_token ? 'b' : null;
    if (!color) return error('You do not own a seat in this game', 403);
    if (room.status !== 'active') return error('Game is not active', 409);
    room.status = 'resigned';
    room.winner = color === 'w' ? 'b' : 'w';
    room.version += 1;
    await saveRoom(room);
    await broadcast(room, input.connection_id);
    return json({ room: publicRoom(room) });
  }],

  'POST /api/rooms/:code/rematch': [async ({ params, body }) => {
    const room = await loadRoom(params.code);
    if (!room) return error('Room not found', 404);
    const input = (body || {}) as { seat_token?: string; connection_id?: string };
    const ownsSeat = input.seat_token === room.white_token || (room.black_token && input.seat_token === room.black_token);
    if (!ownsSeat) return error('You do not own a seat in this game', 403);
    if (room.status === 'active' || room.status === 'waiting') return error('Finish the current game first', 409);
    const game = new Chess();
    room.moves = [];
    room.fen = game.fen();
    room.turn = 'w';
    room.status = room.black_token ? 'active' : 'waiting';
    room.winner = null;
    room.version += 1;
    await saveRoom(room);
    await broadcast(room, input.connection_id);
    return json({ room: publicRoom(room) });
  }],
};
