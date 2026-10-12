// Railway pre-deploy HTTP/WebSocket gate: real protocol, isolated SQL schema and Redis prefix.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { WebSocket } from 'ws';
import { createClient } from 'redis';
import { IdentityStore } from './identity.js';

if (!process.env.DATABASE_URL || !process.env.REDIS_URL) throw new Error('DATABASE_URL and REDIS_URL are required');
const schema = `qk_verify_${randomUUID().replaceAll('-', '')}`;
const prefix = `qk:verify:${schema}:`;
const base = 'http://127.0.0.1:39173';
const origin = 'https://quiet-knight-server-production.up.railway.app';
const env = { ...process.env, NODE_ENV: 'test', QK_TEST_SCHEMA: schema, PORT: '39173', VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '' };
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 3000 });
let pool, child, redis, created = false;
const sockets = [];
const waitFor = async (messages, predicate) => {
  for (let i = 0; i < 100; i++) {
    const found = messages.find(predicate);
    if (found) return found;
    await delay(50);
  }
  throw new Error('Expected WebSocket event did not arrive');
};
const request = async (path, { method = 'GET', body, cookie } = {}) => {
  const response = await fetch(base + path, {
    method,
    headers: { Origin: origin, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  return { status: response.status, data: await response.json(), headers: response.headers };
};
const post = (path, body, cookie) => request(path, { method: 'POST', body, cookie });
const cookieOf = response => response.headers.get('set-cookie')?.split(';')[0];
const start = async () => {
  child = spawn(process.execPath, ['server.js'], { env, stdio: 'ignore' });
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Candidate server exited with ${child.exitCode}`);
    try { if ((await request('/health')).status === 200) return; } catch {}
    await delay(100);
  }
  throw new Error('Candidate server did not become healthy');
};
const stop = async () => {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, 'exit');
  child.kill('SIGTERM');
  await Promise.race([exited, delay(3000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
  child = null;
};
const socket = async (code, cookie, seatToken) => {
  const ws = new WebSocket(`${base.replace('http:', 'ws:')}/ws?room=${code}`, { origin, headers: { Cookie: cookie }, handshakeTimeout: 7000 });
  const messages = [];
  ws.on('message', raw => { try { messages.push(JSON.parse(String(raw))); } catch {} });
  ws.on('error', () => {});
  sockets.push(ws);
  await once(ws, 'open');
  ws.send(JSON.stringify({ type: 'presence.hello', seat_token: seatToken }));
  return messages;
};
const makeRoom = async (whiteCookie, blackCookie) => {
  const white = await post('/rooms', {}, whiteCookie);
  assert.equal(white.status, 200);
  const code = white.data.room.code;
  const joinKey = randomBytes(24).toString('hex');
  const black = await post(`/rooms/${code}/join`, { join_key: joinKey }, blackCookie);
  assert.equal(black.status, 200);
  assert.equal(black.data.role, 'black');
  return { code, white: white.data, black: black.data, joinKey };
};

try {
  await admin.query(`CREATE SCHEMA ${schema}`);
  created = true;
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}`, max: 5, connectionTimeoutMillis: 3000 });
  const store = new IdentityStore({ pool });
  await store.migrate();
  assert.equal((await store.health()).migration, 4);
  redis = createClient({ url: process.env.REDIS_URL });
  redis.on('error', () => {});
  await redis.connect();
  await start();
  assert.equal((await request('/players/health')).data.migration, 4);
  assert.equal((await post('/rooms', {})).status, 401);
  const alice = await post('/players/register', { handle: 'PredeployAlice', password: 'ordinarypass' });
  const bob = await post('/players/register', { handle: 'PredeployBob', password: 'ordinarypass' });
  assert.equal(alice.status, 201);
  assert.equal(bob.status, 201);
  const a = cookieOf(alice), b = cookieOf(bob);
  assert.equal((await post('/players/register', { handle: 'predeployalice', password: 'ordinarypass' })).status, 409);
  assert.equal((await request('/players/me', { cookie: a })).data.player.id, alice.data.player.id);

  const room = await makeRoom(a, b);
  assert.equal(room.white.room.white_player.id, alice.data.player.id);
  assert.equal(room.black.room.black_player.id, bob.data.player.id);
  assert.equal((await post(`/rooms/${room.code}/join`, { seat_token: room.white.seat_token }, b)).status, 403);
  const whiteEvents = await socket(room.code, a, room.white.seat_token);
  const blackEvents = await socket(room.code, b, room.black.seat_token);
  await waitFor(whiteEvents, event => event.type === 'seat.role' && event.role === 'white');
  await waitFor(blackEvents, event => event.type === 'seat.role' && event.role === 'black');
  assert.equal((await post(`/rooms/${room.code}/move`, { seat_token: room.white.seat_token, from: 'e2', to: 'e5' }, a)).status, 400);
  const moved = await post(`/rooms/${room.code}/move`, { seat_token: room.white.seat_token, from: 'e2', to: 'e4' }, a);
  assert.equal(moved.status, 200);
  assert.equal(moved.data.room.last_move.san, 'e4');
  await waitFor(blackEvents, event => event.type === 'room.update' && event.room.last_move?.san === 'e4');
  assert.equal((await post(`/rooms/${room.code}/move`, { seat_token: room.white.seat_token, from: 'd2', to: 'd4' }, a)).status, 409);
  assert.equal((await post(`/rooms/${room.code}/move`, { seat_token: room.black.seat_token, from: 'e7', to: 'e5' }, a)).status, 403);
  const replied = await post(`/rooms/${room.code}/move`, { seat_token: room.black.seat_token, from: 'e7', to: 'e5' }, b);
  assert.equal(replied.status, 200);
  assert.equal(replied.data.room.clock_running_color, 'w');
  const nudge = await post(`/rooms/${room.code}/nudge`, { seat_token: room.black.seat_token, request_id: randomUUID() }, b);
  assert.equal(nudge.status, 200);
  assert.equal((await post(`/rooms/${room.code}/nudge`, { seat_token: room.black.seat_token, request_id: randomUUID() }, b)).status, 429);
  sockets.at(-1).close();
  const rejoined = await post(`/rooms/${room.code}/join`, { join_key: room.joinKey }, b);
  assert.equal(rejoined.data.seat_token, room.black.seat_token);
  const resumed = await socket(room.code, b, room.black.seat_token);
  await waitFor(resumed, event => event.type === 'room.update' && event.room.moves.join(' ') === 'e4 e5');
  const ended = await post(`/rooms/${room.code}/resign`, { seat_token: room.black.seat_token }, b);
  assert.equal(ended.status, 200);
  assert.equal(ended.data.room.score_event.white_points, 3);
  for (let i = 0; i < 3; i++) await request(`/rooms/${room.code}`, { cookie: a });
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM qk_games WHERE room_code=$1', [room.code])).rows[0].n, 1);
  assert.equal((await request('/players/me', { cookie: a })).data.player.human_wins, 1);
  assert.equal((await request('/players/me', { cookie: b })).data.player.human_losses, 1);

  await stop();
  await start();
  assert.equal((await request(`/rooms/${room.code}`, { cookie: a })).data.room.score_event.id, ended.data.room.score_event.id);
  assert.equal((await request('/players/me', { cookie: a })).data.player.id, alice.data.player.id);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM qk_games WHERE room_code=$1', [room.code])).rows[0].n, 1);

  const mate = await makeRoom(a, b);
  for (const [cookie, seat, from, to] of [
    [a, mate.white.seat_token, 'f2', 'f3'], [b, mate.black.seat_token, 'e7', 'e5'],
    [a, mate.white.seat_token, 'g2', 'g4'], [b, mate.black.seat_token, 'd8', 'h4'],
  ]) assert.equal((await post(`/rooms/${mate.code}/move`, { seat_token: seat, from, to }, cookie)).status, 200);
  assert.equal((await request(`/rooms/${mate.code}`, { cookie: a })).data.room.status, 'checkmate');
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM qk_games WHERE room_code=$1', [mate.code])).rows[0].n, 1);

  console.log(JSON.stringify({ event: 'server.acceptance', passed: true, migration: 4, checks: ['mandatory auth', 'registration and duplicate ID', 'room create/join and ownership', 'legal/illegal moves', 'authenticated WebSocket seats', 'reconnect/resume', 'clock synchronization', 'nudge rate limit', 'resignation', 'checkmate', 'exactly-once results', 'server restart persistence'] }));
} finally {
  for (const ws of sockets) ws.terminate();
  await stop();
  if (redis?.isOpen) {
    const keys = [];
    for await (const key of redis.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) keys.push(key);
    if (keys.length) await redis.del(keys);
    await redis.quit();
  }
  await pool?.end();
  if (created) await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
}
