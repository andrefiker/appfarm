import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createQuietKnightServer } from '../server.js';

let instance;
let baseUrl;

test.before(async () => {
  instance = createQuietKnightServer({ clockMs: 400, tickMs: 20 });
  await new Promise((resolve) => instance.httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = instance.httpServer.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await instance.close();
});

test('create, join, recover, spectate, sync moves, reject illegal play, timeout, resign, and rematch', async () => {
  const created = await jsonFetch('/api/rooms', { method: 'POST' });
  assert.match(created.code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(created.state.role, 'white');
  assert.equal(created.state.status, 'waiting');
  assert.deepEqual(created.state.clocks, { white: 400, black: 400 });

  const recovered = await jsonFetch(`/api/rooms/${created.code}/join`, {
    method: 'POST', body: { seatToken: created.seatToken },
  });
  assert.equal(recovered.role, 'white');
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.seatToken, created.seatToken);

  const joined = await jsonFetch(`/api/rooms/${created.code}/join`, { method: 'POST', body: {} });
  assert.equal(joined.role, 'black');
  assert.equal(joined.state.status, 'playing');
  assert.equal(joined.state.activeColor, 'white');

  const spectator = await jsonFetch(`/api/rooms/${created.code}/join`, { method: 'POST', body: {} });
  assert.equal(spectator.role, 'spectator');
  assert.equal(spectator.seatToken, null);
  assert.deepEqual(spectator.state.legalMoves, []);

  const blackSocket = new WebSocket(baseUrl.replace('http', 'ws') + `/ws?room=${created.code}`);
  blackSocket.on('open', () => blackSocket.send(JSON.stringify({ type: 'authenticate', seatToken: joined.seatToken })));
  const firstBlackState = await nextState(blackSocket, (next) => next.role === 'black');
  assert.equal(firstBlackState.role, 'black');

  const illegalResponse = await fetch(`${baseUrl}/api/rooms/${created.code}/move`, {
    method: 'POST',
    headers: headers(created.seatToken),
    body: JSON.stringify({ from: 'e2', to: 'e5' }),
  });
  assert.equal(illegalResponse.status, 422);

  const afterE4Promise = nextState(blackSocket);
  const afterE4 = await jsonFetch(`/api/rooms/${created.code}/move`, {
    method: 'POST', token: created.seatToken, body: { from: 'e2', to: 'e4' },
  });
  assert.equal(afterE4.turn, 'black');
  assert.ok(afterE4.clocks.white <= 400);
  assert.equal((await afterE4Promise).fen, afterE4.fen);

  const afterE5 = await jsonFetch(`/api/rooms/${created.code}/move`, {
    method: 'POST', token: joined.seatToken, body: { from: 'e7', to: 'e5' },
  });
  assert.equal(afterE5.turn, 'white');
  const afterNf3 = await jsonFetch(`/api/rooms/${created.code}/move`, {
    method: 'POST', token: created.seatToken, body: { from: 'g1', to: 'f3' },
  });
  assert.equal(afterNf3.turn, 'black');

  await new Promise((resolve) => setTimeout(resolve, 450));
  const timedOut = await jsonFetch(`/api/rooms/${created.code}`, { token: created.seatToken });
  assert.equal(timedOut.status, 'finished');
  assert.equal(timedOut.result.type, 'timeout');
  blackSocket.close();

  const created2 = await jsonFetch('/api/rooms', { method: 'POST' });
  const joined2 = await jsonFetch(`/api/rooms/${created2.code}/join`, { method: 'POST', body: {} });
  const resigned = await jsonFetch(`/api/rooms/${created2.code}/resign`, { method: 'POST', token: created2.seatToken });
  assert.equal(resigned.result.type, 'resignation');
  await jsonFetch(`/api/rooms/${created2.code}/rematch`, { method: 'POST', token: created2.seatToken });
  const rematched = await jsonFetch(`/api/rooms/${created2.code}/rematch`, { method: 'POST', token: joined2.seatToken });
  assert.equal(rematched.status, 'playing');
  assert.equal(rematched.generation, 2);
  assert.deepEqual(rematched.clocks, { white: 400, black: 400 });
  assert.equal(rematched.role, 'white');
});

test('health and static frontend are served by the same origin', async () => {
  const health = await jsonFetch('/health');
  assert.equal(health.ok, true);
  const response = await fetch(`${baseUrl}/`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Quiet Knight/);
  assert.match(html, /Create a game/);
});

async function jsonFetch(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: headers(token),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${data.error}`);
  return data;
}

function headers(token) {
  return {
    'content-type': 'application/json',
    ...(token ? { 'x-seat-token': token } : {}),
  };
}

function nextState(socket, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for WebSocket state')), 1_000);
    const onMessage = (data) => {
      const state = JSON.parse(data.toString()).state;
      if (!predicate(state)) return;
      clearTimeout(timeout);
      socket.off('message', onMessage);
      resolve(state);
    };
    socket.on('message', onMessage);
    socket.once('error', reject);
  });
}
