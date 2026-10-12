import assert from 'node:assert/strict';
import { accountErrorMessage, accountRequest, accountServiceReady } from '../src/account-api.ts';

assert.equal(accountServiceReady({ available: true, migration: 3 }), false);
assert.equal(accountServiceReady({ available: true, migration: 4 }), true);
assert.equal(accountErrorMessage('/players/register', 404, { error: 'Not found' }), 'Server unavailable. Please try again later.');
assert.equal(accountErrorMessage('/players/register', 409, { error: 'duplicate' }), 'Knight ID already taken.');
assert.equal(accountErrorMessage('/players/login', 401, {}), 'Invalid credentials.');
assert.equal(accountErrorMessage('/players/recover', 401, {}), 'Knight ID or recovery code not recognized.');
assert.equal(accountErrorMessage('/players/login', 503, {}), 'Server unavailable. Please try again later.');

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (path, options) => {
    assert.equal(path, '/players/register', 'Account calls must use the current HTTPS origin');
    assert.equal(options.method, 'POST');
    assert.equal(options.credentials, 'include', 'The session cookie must be sent and accepted');
    assert.deepEqual(JSON.parse(options.body), { handle: 'Fiker', password: 'password' });
    return new Response(JSON.stringify({ player: { id: 'player-uuid', registered: true } }), {
      status: 201, headers: { 'Content-Type': 'application/json' },
    });
  };
  const result = await accountRequest('/players/register', { handle: 'Fiker', password: 'password' });
  assert.equal(result.player.id, 'player-uuid');

  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  await assert.rejects(accountRequest('/players/login', { handle: 'Fiker', password: 'password' }),
    error => error.status === 404 && error.message === 'Server unavailable. Please try again later.');

  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(accountRequest('/players/login', { handle: 'Fiker', password: 'password' }),
    error => error.message === 'Connection problem. Check your internet connection.');
} finally {
  globalThis.fetch = originalFetch;
}

console.log('Account API passed: same-origin cookie requests, schema readiness, and clear HTTP/network errors.');
