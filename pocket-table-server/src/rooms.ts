import { randomBytes, randomUUID } from 'node:crypto';
import {
  act,
  assertInvariants,
  createGame,
  draw,
  mulberry32,
  settle,
  startHand,
  type Action,
  type GameState,
  type Variant,
} from './engine/index.js';
import {
  buildBotState,
  decide,
  profileForSeat,
  type BotLevel,
  type BotMix,
} from './bots/index.js';
import { pool } from './db.js';

export type RoomSettings = Readonly<{
  variant: Variant;
  seats: number;
  startingStack: number;
  botLevel: BotLevel;
  botMix: BotMix;
  fillBots: boolean;
}>;

type RoomRow = {
  id: string;
  code: string;
  host_user_id: string;
  variant: Variant;
  seats: number;
  starting_stack: number;
  bot_level: BotLevel;
  bot_mix: BotMix;
  fill_bots: boolean;
  hand_seed: number;
  state_json: GameState | null;
};

type Member = Readonly<{ userId: string; handle: string; seat: number }>;

export type LoadedRoom = Readonly<{
  row: RoomRow;
  members: readonly Member[];
  state: GameState | null;
}>;

const locks = new Map<string, Promise<unknown>>();

export async function withRoomLock<T>(code: string, fn: () => Promise<T>): Promise<T> {
  const prior = locks.get(code) ?? Promise.resolve();
  let release!: () => void;
  const marker = new Promise<void>(resolve => { release = resolve; });
  const queued = prior.then(() => marker);
  locks.set(code, queued);
  await prior;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(code) === queued) locks.delete(code);
  }
}

function normalize(state: GameState): GameState {
  assertInvariants(state);
  if (state.phase === 'SHOWDOWN') {
    const settled = settle(state);
    assertInvariants(settled);
    return settled;
  }
  return state;
}

function code(): string {
  return randomBytes(5)
    .toString('base64url')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase()
    .padEnd(6, 'X');
}

function playerId(userId: string): string {
  return `u:${userId}`;
}

function isBot(id: string): boolean {
  return id.startsWith('bot:');
}

function sanitizeSettings(input: Partial<RoomSettings>): RoomSettings {
  const variant: Variant =
    input.variant === 'FIVE_CARD_DRAW_FIXED_LIMIT'
      ? 'FIVE_CARD_DRAW_FIXED_LIMIT'
      : 'HOLD_EM_NO_LIMIT';
  const seats = Number.isInteger(input.seats) ? Math.min(5, Math.max(2, input.seats!)) : 2;
  const startingStack = [2000, 5000, 10000].includes(input.startingStack ?? 0)
    ? input.startingStack!
    : 5000;
  const botLevel: BotLevel = input.botLevel === 1 || input.botLevel === 3 ? input.botLevel : 2;
  const botMix: BotMix = input.botMix === 'balanced' ? 'balanced' : 'mixed';
  return Object.freeze({
    variant,
    seats,
    startingStack,
    botLevel,
    botMix,
    fillBots: Boolean(input.fillBots),
  });
}

export async function createRoom(hostUserId: string, input: Partial<RoomSettings>): Promise<LoadedRoom> {
  const settings = sanitizeSettings(input);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const id = randomUUID();
    const roomCode = code();
    const seed = Math.floor(Math.random() * 2_000_000_000);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO pocket_rooms(
          id, code, host_user_id, variant, seats, starting_stack,
          bot_level, bot_mix, fill_bots, hand_seed
        ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          id, roomCode, hostUserId, settings.variant, settings.seats,
          settings.startingStack, settings.botLevel, settings.botMix,
          settings.fillBots, seed,
        ]
      );
      await client.query(
        'INSERT INTO pocket_room_members(room_id,user_id,seat) VALUES($1,$2,0)',
        [id, hostUserId]
      );
      await client.query('COMMIT');
      return (await loadRoom(roomCode))!;
    } catch (error) {
      await client.query('ROLLBACK');
      if ((error as { code?: string }).code === '23505') continue;
      throw error;
    } finally {
      client.release();
    }
  }
  throw new Error('Could not allocate a room code');
}

export async function loadRoom(roomCodeInput: string): Promise<LoadedRoom | undefined> {
  const roomCode = roomCodeInput.trim().toUpperCase();
  const roomResult = await pool.query(
    'SELECT * FROM pocket_rooms WHERE code=$1',
    [roomCode]
  );
  const row = roomResult.rows[0] as RoomRow | undefined;
  if (!row) return undefined;
  const membersResult = await pool.query(
    `SELECT m.user_id, m.seat, u.handle
       FROM pocket_room_members m
       JOIN pocket_users u ON u.id=m.user_id
      WHERE m.room_id=$1
      ORDER BY m.seat`,
    [row.id]
  );
  const members = membersResult.rows.map((m: { user_id: string; handle: string; seat: number }) =>
    Object.freeze({ userId: m.user_id, handle: m.handle, seat: m.seat })
  );
  return Object.freeze({
    row,
    members: Object.freeze(members),
    state: row.state_json,
  });
}

export async function joinRoom(roomCode: string, userId: string): Promise<LoadedRoom> {
  return withRoomLock(roomCode, async () => {
    const room = await loadRoom(roomCode);
    if (!room) throw new Error('Room not found');
    if (room.state) throw new Error('Hand already started');
    const existing = room.members.find(member => member.userId === userId);
    if (existing) return room;
    const used = new Set(room.members.map(member => member.seat));
    const seat = Array.from({ length: room.row.seats }, (_, i) => i).find(i => !used.has(i));
    if (seat === undefined) throw new Error('Room is full');
    await pool.query(
      'INSERT INTO pocket_room_members(room_id,user_id,seat) VALUES($1,$2,$3)',
      [room.row.id, userId, seat]
    );
    return (await loadRoom(roomCode))!;
  });
}

function buildSeating(room: LoadedRoom) {
  const settings = room.row;
  const memberBySeat = new Map(room.members.map(member => [member.seat, member]));
  const seating = [];
  for (let seat = 0; seat < settings.seats; seat += 1) {
    const member = memberBySeat.get(seat);
    if (member) {
      seating.push({
        id: playerId(member.userId),
        seat,
        stack: settings.starting_stack,
      });
    } else if (settings.fill_bots) {
      seating.push({
        id: `bot:${seat}`,
        seat,
        stack: settings.starting_stack,
      });
    }
  }
  return seating;
}

async function persistState(roomId: string, state: GameState, seed?: number): Promise<void> {
  await pool.query(
    `UPDATE pocket_rooms
        SET state_json=$2::jsonb,
            hand_seed=COALESCE($3, hand_seed),
            updated_at=now()
      WHERE id=$1`,
    [roomId, JSON.stringify(state), seed ?? null]
  );
}

export async function startRoom(roomCode: string, userId: string): Promise<LoadedRoom> {
  return withRoomLock(roomCode, async () => {
    const room = await loadRoom(roomCode);
    if (!room) throw new Error('Room not found');
    if (room.row.host_user_id !== userId) throw new Error('Only the host can start');
    if (room.state) return room;
    const seating = buildSeating(room);
    if (seating.length < 2) throw new Error('Need at least two occupied seats or enable bots');
    const initial = createGame(room.row.variant, seating, 0);
    let state = normalize(startHand(initial, mulberry32(room.row.hand_seed)));
    state = await runBots(room, state);
    await persistState(room.row.id, state);
    return (await loadRoom(roomCode))!;
  });
}

async function runBots(room: LoadedRoom, input: GameState): Promise<GameState> {
  let state = input;
  let guard = 0;
  while (
    state.actorId &&
    isBot(state.actorId) &&
    state.phase !== 'INTERMISSION' &&
    guard < 80
  ) {
    const seat = state.players.find(p => p.id === state.actorId)?.seat ?? 0;
    const random = mulberry32(
      room.row.hand_seed ^
        (state.handNumber * 104729 + state.history.length * 7919 + seat * 97)
    );
    const decision = decide(
      buildBotState(state, state.actorId),
      random,
      room.row.bot_level,
      profileForSeat(seat, room.row.bot_mix)
    );
    if (decision.kind === 'draw') {
      state = normalize(draw(state, state.actorId, decision.indices));
    } else {
      state = normalize(act(state, state.actorId, decision.action));
    }
    guard += 1;
  }
  if (guard >= 80) throw new Error('Bot loop guard tripped');
  return state;
}

export async function applyAction(
  roomCode: string,
  userId: string,
  action: Action
): Promise<LoadedRoom> {
  return withRoomLock(roomCode, async () => {
    const room = await loadRoom(roomCode);
    if (!room?.state) throw new Error('Room has not started');
    const id = playerId(userId);
    if (room.state.actorId !== id) throw new Error('Not your turn');
    let state = normalize(act(room.state, id, action));
    state = await runBots(room, state);
    await persistState(room.row.id, state);
    return (await loadRoom(roomCode))!;
  });
}

export async function applyDraw(
  roomCode: string,
  userId: string,
  indexes: readonly number[]
): Promise<LoadedRoom> {
  return withRoomLock(roomCode, async () => {
    const room = await loadRoom(roomCode);
    if (!room?.state) throw new Error('Room has not started');
    const id = playerId(userId);
    if (room.state.actorId !== id) throw new Error('Not your turn');
    let state = normalize(draw(room.state, id, indexes));
    state = await runBots(room, state);
    await persistState(room.row.id, state);
    return (await loadRoom(roomCode))!;
  });
}

export async function nextHand(roomCode: string, userId: string): Promise<LoadedRoom> {
  return withRoomLock(roomCode, async () => {
    const room = await loadRoom(roomCode);
    if (!room?.state) throw new Error('Room has not started');
    if (room.row.host_user_id !== userId) throw new Error('Only the host starts the next hand');
    if (room.state.phase !== 'INTERMISSION') throw new Error('Current hand is not finished');
    const nextSeed = room.row.hand_seed + 104729;
    let state = normalize(startHand(room.state, mulberry32(nextSeed)));
    const seededRoom = Object.freeze({
      ...room,
      row: Object.freeze({ ...room.row, hand_seed: nextSeed }),
    }) as LoadedRoom;
    state = await runBots(seededRoom, state);
    await persistState(room.row.id, state, nextSeed);
    return (await loadRoom(roomCode))!;
  });
}

export function safePayload(room: LoadedRoom, viewerUserId: string) {
  const viewer = playerId(viewerUserId);
  const member = room.members.find(m => m.userId === viewerUserId);
  if (!member) throw new Error('You are not seated in this room');
  const state = room.state
    ? Object.freeze({
        ...room.state,
        deck: Object.freeze([]),
        discards: Object.freeze([]),
        players: Object.freeze(
          room.state.players.map(p =>
            Object.freeze({
              ...p,
              hand:
                p.id === viewer || (room.state!.settled && !p.folded)
                  ? p.hand
                  : Object.freeze([]),
            })
          )
        ),
      })
    : null;
  return Object.freeze({
    code: room.row.code,
    hostUserId: room.row.host_user_id,
    settings: Object.freeze({
      variant: room.row.variant,
      seats: room.row.seats,
      startingStack: room.row.starting_stack,
      botLevel: room.row.bot_level,
      botMix: room.row.bot_mix,
      fillBots: room.row.fill_bots,
    }),
    members: room.members,
    viewerPlayerId: viewer,
    state,
  });
}
