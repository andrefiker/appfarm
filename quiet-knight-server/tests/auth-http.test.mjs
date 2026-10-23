import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const base = 'http://127.0.0.1:3999';
let server;
const request = async (path, { method = 'GET', body, cookie } = {}) => {
  const response = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), Origin: 'https://quiet-knight-server-production.up.railway.app' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, headers: response.headers, data: await response.json() };
};
const post = (path, body, cookie) => request(path, { method: 'POST', body, cookie });
const cookieOf = result => result.headers.get('set-cookie')?.split(';')[0];

async function start() {
  server = spawn(process.execPath, ['server.js'], { cwd: fileURLToPath(new URL('..', import.meta.url)), env: { ...process.env, PORT: '3999' }, stdio: 'ignore' });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Server exited with ${server.exitCode}`);
    try { if ((await request('/players/health')).status === 200) return; } catch {}
    await delay(100);
  }
  throw new Error('Isolated application server did not start');
}
async function stop() {
  if (!server) return;
  const child = server;
  server = undefined;
  if (child.exitCode === null) {
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill('SIGTERM');
    await exited;
  }
}

try {
  await start();
  assert.deepEqual((await request('/players/health')).data, { available: true, migration: 4 });
  assert.equal((await request('/players/me')).status, 401);
  const guest = await post('/rooms', {});
  assert.equal(guest.status, 200);
  assert.equal(guest.data.room.white_player, null);
  assert.equal((await post('/players/me/computer-games', {})).status, 401);

  const created = await post('/players/register', { handle: 'Fiker', password: 'password' });
  assert.equal(created.status, 201);
  assert.equal(created.data.player.handle, 'Fiker');
  assert.ok(created.data.recovery_code);
  const accountId = created.data.player.id;
  assert.match(accountId, /^[0-9a-f-]{36}$/i);
  const initialCookie = cookieOf(created);
  assert.match(created.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/);
  assert.equal((await request('/players/me', { cookie: initialCookie })).data.player.id, accountId);
  assert.equal((await post('/players/register', { handle: 'fIKer', password: 'password' })).status, 409);
  assert.equal((await post('/players/register', { handle: 'A12', password: 'password' })).status, 400);
  assert.equal((await post('/players/register', { handle: 'Bob', password: 'short' })).status, 400);
  const bob = await post('/players/register', { handle: 'Bob', password: 'plainword' });
  assert.equal(bob.status, 201);
  assert.equal((await post('/players/login', { handle: 'Fiker', password: 'wrongpass' })).status, 401);
  const loggedIn = await post('/players/login', { handle: 'FIKER', password: 'password' });
  assert.equal(loggedIn.status, 200);
  assert.equal(loggedIn.data.player.id, accountId);
  const deviceCookie = cookieOf(loggedIn);

  const moves = [{ from: 'f2', to: 'f3' }, { from: 'e7', to: 'e5' }, { from: 'g2', to: 'g4' }, { from: 'd8', to: 'h4' }];
  const computerGame = { client_game_id: randomUUID(), moves, human_color: 'w', level: 5 };
  const recorded = await post('/players/me/computer-games', computerGame, deviceCookie);
  assert.equal(recorded.status, 201);
  assert.equal((await post('/players/me/computer-games', computerGame, deviceCookie)).data.game.id, recorded.data.game.id);
  const beforeRestart = await request('/players/me', { cookie: deviceCookie });
  assert.equal(beforeRestart.data.player.computer_losses, 1);
  assert.equal(beforeRestart.data.computer_games.length, 1);

  await stop();
  await start();
  const afterRestart = await request('/players/me', { cookie: deviceCookie });
  assert.equal(afterRestart.data.player.id, accountId);
  assert.equal(afterRestart.data.player.computer_losses, 1);
  assert.equal(afterRestart.data.computer_games.length, 1);
  const foreign = await request(`/players/${accountId}/head-to-head/${randomUUID()}`, { cookie: cookieOf(bob) });
  assert.equal(foreign.status, 403);

  assert.equal((await post('/players/logout', {}, deviceCookie)).status, 200);
  assert.equal((await request('/players/me', { cookie: deviceCookie })).status, 401);
  const recovered = await post('/players/recover', { handle: 'Fiker', recovery_code: created.data.recovery_code, password: 'newwords' });
  assert.equal(recovered.status, 200);
  assert.equal(recovered.data.player.id, accountId);
  assert.equal((await request('/players/me', { cookie: initialCookie })).status, 401);
  assert.equal((await post('/players/recover', { handle: 'Fiker', recovery_code: created.data.recovery_code, password: 'newwords' })).status, 401);
  const anotherDevice = await post('/players/login', { handle: 'fiker', password: 'newwords' });
  assert.equal(anotherDevice.status, 200);
  assert.equal(anotherDevice.data.player.id, accountId);
  assert.equal((await request('/players/me', { cookie: cookieOf(anotherDevice) })).data.player.computer_losses, 1);

  console.log('Real HTTP auth passed on isolated PostgreSQL 16 and Redis 7: registration, 8-character password, secure cookies, login, logout, recovery, duplicate ID, authorization, result idempotency, and server restart.');
} finally {
  await stop();
}
