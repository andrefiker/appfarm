import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { IdentityError, IdentityStore } from '../identity.js';
import { ownsRoomSeat, requireAuthenticated } from '../access-control.js';

const digest = value => createHash('sha256').update(value).digest('hex');
const publicPlayer = player => ({
  id: player.id, handle: player.handle, quiet_points: player.quiet_points,
  scored_games: player.scored_games, wins: player.wins, draws: player.draws, losses: player.losses,
  current_win_streak: player.current_win_streak, best_win_streak: player.best_win_streak,
  registered: player.registered_at !== null, human_games: player.human_games,
  human_wins: player.human_wins, human_draws: player.human_draws, human_losses: player.human_losses,
  computer_games: player.computer_games, computer_wins: player.computer_wins,
  computer_draws: player.computer_draws, computer_losses: player.computer_losses,
});

class MemoryPool {
  players = new Map();
  sessions = new Map();
  computerGames = new Map();
  migrationVersion = 3;
  transactions = 0;
  on() {}
  async connect() { return { query: (sql, values) => this.query(sql, values), release() {} }; }
  async query(sql, values = []) {
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql)) { this.transactions++; return { rows: [] }; }
    if (sql.includes('FROM qk_migrations')) return { rows: [{ version: this.migrationVersion }] };
    if (sql.includes('pg_advisory_xact_lock')) return { rows: [] };
    if (sql.includes('INSERT INTO qk_players')) {
      const [id, handle, normalized, credential_hash, password_hash, recovery_code_hash] = values;
      if ([...this.players.values()].some(p => p.normalized_handle === normalized)) throw Object.assign(new Error('duplicate'), { code: '23505' });
      const p = { id, handle, normalized_handle: normalized, credential_hash, password_hash, recovery_code_hash,
        registered_at: new Date(), quiet_points: 0, scored_games: 0, wins: 0, draws: 0, losses: 0,
        current_win_streak: 0, best_win_streak: 0, human_games: 0, human_wins: 0,
        human_draws: 0, human_losses: 0, computer_games: 0, computer_wins: 0,
        computer_draws: 0, computer_losses: 0 };
      this.players.set(id, p);
      return { rows: [publicPlayer(p)] };
    }
    if (sql.includes('INSERT INTO qk_identity_sessions')) {
      const [id, player_id, token_hash] = values;
      this.sessions.set(token_hash, { id, player_id, revoked_at: null, expires_at: Date.now() + 30 * 86400_000 });
      return { rows: [] };
    }
    if (sql.includes('FROM qk_identity_sessions s JOIN qk_players p')) {
      const session = this.sessions.get(values[0]);
      const player = session && this.players.get(session.player_id);
      return { rows: session && !session.revoked_at && session.expires_at > Date.now() && player ? [publicPlayer(player)] : [] };
    }
    if (sql.includes('FROM qk_players WHERE id=$1 AND registered_at IS NOT NULL')) {
      const p = this.players.get(values[0]);
      return { rows: p?.registered_at ? [{ id: p.id, handle: p.handle }] : [] };
    }
    if (sql.includes('FROM qk_computer_games WHERE player_id=$1 AND client_game_id=$2')) {
      const game = this.computerGames.get(`${values[0]}:${values[1]}`);
      return { rows: game ? [game] : [] };
    }
    if (sql.includes('INSERT INTO qk_computer_games')) {
      const [id, player_id, client_game_id, human_color, result, final_fen, pgn, moves, level, ended_at] = values;
      const game = { id, player_id, client_game_id, human_color, result, final_fen, pgn, moves, level, ended_at };
      this.computerGames.set(`${player_id}:${client_game_id}`, game);
      return { rows: [game] };
    }
    if (sql.includes('UPDATE qk_players SET computer_games=computer_games+1')) {
      const [id, outcome] = values, p = this.players.get(id);
      p.computer_games++;
      if (outcome === 'win') p.computer_wins++;
      if (outcome === 'draw') p.computer_draws++;
      if (outcome === 'loss') p.computer_losses++;
      return { rows: [] };
    }
    if (sql.includes('FROM qk_players WHERE credential_hash=$1')) {
      const p = [...this.players.values()].find(player => player.credential_hash === values[0]);
      return { rows: p ? [publicPlayer(p)] : [] };
    }
    if (sql.includes('FROM qk_players WHERE normalized_handle=$1 AND registered_at IS NOT NULL')) {
      const p = [...this.players.values()].find(player => player.normalized_handle === values[0] && player.registered_at);
      return { rows: p ? [{ id: p.id, recovery_code_hash: p.recovery_code_hash }] : [] };
    }
    if (sql.includes('FROM qk_players WHERE normalized_handle=$1')) {
      const p = [...this.players.values()].find(player => player.normalized_handle === values[0]);
      return { rows: p ? [{ ...publicPlayer(p), password_hash: p.password_hash }] : [] };
    }
    if (sql.includes('UPDATE qk_players SET credential_hash=$2')) {
      const [id, credential_hash, password_hash, recovery_code_hash] = values;
      const p = this.players.get(id);
      if (!p || p.registered_at || p.password_hash) return { rows: [] };
      Object.assign(p, { credential_hash, password_hash, recovery_code_hash, registered_at: new Date() });
      return { rows: [publicPlayer(p)] };
    }
    if (sql.includes('UPDATE qk_players SET password_hash=$2,recovery_code_hash=$3')) {
      const [id, password_hash, recovery_code_hash, oldHash] = values;
      const p = this.players.get(id);
      if (!p || p.recovery_code_hash !== oldHash) return { rows: [] };
      Object.assign(p, { password_hash, recovery_code_hash });
      return { rows: [publicPlayer(p)] };
    }
    if (sql.includes('UPDATE qk_identity_sessions SET revoked_at=now() WHERE player_id=$1')) {
      for (const session of this.sessions.values()) if (session.player_id === values[0] && !session.revoked_at) session.revoked_at = new Date();
      return { rows: [] };
    }
    if (sql.includes('UPDATE qk_identity_sessions SET revoked_at=now() WHERE token_hash=$1')) {
      const session = this.sessions.get(values[0]);
      if (session && !session.revoked_at) session.revoked_at = new Date();
      return { rows: [] };
    }
    throw new Error(`Unimplemented identity test query: ${sql}`);
  }
  async end() {}
}

const pool = new MemoryPool();
const store = new IdentityStore({ pool });
store.ready = true;
const existingSchemaPool = new MemoryPool();
const existingSchema = new IdentityStore({ pool: existingSchemaPool });
assert.deepEqual(await existingSchema.checkSchema(), { available: false, migration: 3 });
assert.equal(existingSchema.ready, false, 'A previous schema version must fail closed until its migration is explicitly applied');
assert.equal(existingSchemaPool.transactions, 0, 'Schema checking must not mutate the database');
const password = 'correct-horse-battery-staple';

const created = await store.register('QuietKnight', password);
assert.ok(created.player.registered);
assert.equal(created.player.quiet_points, 0);
assert.match(created.player.id, /^[0-9a-f-]{36}$/i);
const sameSessionOnNewStore = new IdentityStore({ pool });
sameSessionOnNewStore.ready = true;
assert.equal((await sameSessionOnNewStore.authenticate(null, created.session)).id, created.player.id);
const expiring = await store.login('QuietKnight', password);
pool.sessions.get(digest(expiring.session)).expires_at = Date.now() - 1;
assert.equal(await store.authenticate(null, expiring.session), null, 'Expired sessions must be rejected');
await assert.rejects(requireAuthenticated(store, { headers: {} }, ''), error => error.status === 401, 'Gameplay guard must reject unauthenticated requests');
assert.equal((await requireAuthenticated(store, { headers: {} }, created.session)).id, created.player.id);

await assert.rejects(store.register('quietknight', password), error => error instanceof IdentityError && error.status === 409);
assert.equal((await store.login('QUIETKNIGHT', password)).player.id, created.player.id);
const simpleAccount = await store.register('Fiker', 'password');
assert.equal(simpleAccount.player.handle, 'Fiker');
assert.equal((await store.login('fIKer', 'password')).player.id, simpleAccount.player.id);
assert.match(pool.players.get(simpleAccount.player.id).password_hash, /^scrypt\$/);
assert.equal(pool.players.get(simpleAccount.player.id).password_hash.includes('password'), false);
await assert.rejects(store.register('FIKER', 'password'), error => error instanceof IdentityError && error.status === 409 && error.message === 'Knight ID already taken');
await assert.rejects(store.register('A12', 'password'), error => error.status === 400, 'A Knight ID needs three letters');
await assert.rejects(store.register('Bob', 'short'), error => error.status === 400, 'A password needs eight characters');
for (const name of ['Bob', 'Ana', 'James']) assert.equal((await store.register(name, 'plainword')).player.handle, name);
await assert.rejects(store.login('unknown-knight', password), error => error.status === 401);
await assert.rejects(store.login('quietknight', 'incorrect-password'), error => error.status === 401);

const recovered = await store.recover('QuietKnight', created.recovery_code, 'a-different-long-password');
assert.equal(recovered.player.id, created.player.id);
assert.equal(await store.authenticate(null, created.session), null, 'Recovery must revoke old sessions');
await assert.rejects(store.recover('QuietKnight', created.recovery_code, password), error => error.status === 401, 'Recovery code must be one time');
assert.equal((await store.login('quietknight', 'a-different-long-password')).player.id, created.player.id);
await store.logout(recovered.session);
assert.equal(await store.authenticate(null, recovered.session), null, 'Logout must revoke the session');

const roomSeat = { white_token: 'white-seat', black_token: 'black-seat', white_player: { id: created.player.id }, black_player: { id: '72b9d12c-934a-4acb-8f81-b8c3db8a2b8a' } };
assert.equal(ownsRoomSeat(roomSeat, 'white-seat', created.player.id), true);
assert.equal(ownsRoomSeat(roomSeat, 'white-seat', roomSeat.black_player.id), false, 'Switching accounts cannot restore another player’s seat');

const computerGameId = '6ddc859e-f735-4b24-8f6f-96a1539e4e93';
const foolMate = [
  { from: 'f2', to: 'f3' }, { from: 'e7', to: 'e5' },
  { from: 'g2', to: 'g4' }, { from: 'd8', to: 'h4' },
];
const result1 = await store.recordComputer(created.player.id, computerGameId, foolMate, 'w', 5);
await store.recordComputer(created.player.id, computerGameId, foolMate, 'w', 5);
assert.equal(result1.result, '0-1', 'Server must derive the winner from the replayed legal game');
assert.equal(pool.computerGames.size, 1, 'A completed game id can only be recorded once');
assert.equal(pool.players.get(created.player.id).computer_games, 1);
assert.equal(pool.players.get(created.player.id).computer_losses, 1);
await assert.rejects(store.recordComputer(created.player.id, '21d1898c-ae4d-4c0b-8d92-f36f9e6a4ea1', [{ from: 'e2', to: 'e4' }], 'w', 5), error => error.status === 400, 'An unfinished move list cannot be recorded as a result');

const legacyToken = 'A'.repeat(43);
const legacyId = 'b2c879d2-b841-42fd-b5b3-1ba87b73c1e4';
pool.players.set(legacyId, {
  id: legacyId, handle: 'OldKnight', normalized_handle: 'oldknight', credential_hash: digest(legacyToken),
  password_hash: null, recovery_code_hash: null, registered_at: null, quiet_points: 17, scored_games: 6,
  wins: 5, draws: 1, losses: 0, current_win_streak: 2, best_win_streak: 4,
  human_games: 6, human_wins: 5, human_draws: 1, human_losses: 0,
  computer_games: 0, computer_wins: 0, computer_draws: 0, computer_losses: 0,
});
const claimed = await store.claim(`Bearer ${legacyToken}`, '', password);
assert.equal(claimed.player.id, legacyId, 'Claim must preserve the legacy UUID');
assert.equal(claimed.player.quiet_points, 17, 'Claim must preserve legacy Quiet Points');
assert.equal(claimed.player.human_games, 6, 'Claim must preserve historical results');
assert.equal(await store.authenticate(`Bearer ${legacyToken}`, ''), null, 'Claim must invalidate the old device credential');
assert.equal((await store.authenticate(null, claimed.session)).id, legacyId);
await assert.rejects(requireAuthenticated(store, { headers: { authorization: `Bearer ${legacyToken}` } }, ''), error => error.status === 401, 'Unclaimed legacy identities cannot enter gameplay');

console.log('Account tests passed: registration, case-insensitive uniqueness, login, session persistence/revocation, one-time recovery, legacy identity/points/history preservation, authenticated access guard, and idempotent server-derived computer results.');
