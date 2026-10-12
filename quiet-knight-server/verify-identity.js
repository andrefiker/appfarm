// Railway pre-deploy identity gate. All writes stay in a random synthetic schema.
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { IdentityStore } from './identity.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const schema = `qk_verify_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 3000 });
let pool;
let created = false;
const digest = value => createHash('sha256').update(value).digest('hex');

try {
  await admin.query(`CREATE SCHEMA ${schema}`);
  created = true;
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}`, max: 5, connectionTimeoutMillis: 3000, statement_timeout: 10000 });
  const legacySql = (await readFile(new URL('./tests/fixtures/schema-v3.sql', import.meta.url), 'utf8')).replace(/^\uFEFF/, '');
  await pool.query(legacySql);
  const store = new IdentityStore({ pool });
  assert.deepEqual(await store.checkSchema(), { available: false, migration: 3 });

  const aliceId = randomUUID(), bobId = randomUUID();
  const legacyToken = randomBytes(32).toString('base64url');
  for (const [id, handle, tokenHash, points, wins, draws, losses] of [
    [aliceId, 'LegacyAlice', digest(legacyToken), 7, 1, 1, 1],
    [bobId, 'LegacyBob', digest(randomBytes(32).toString('base64url')), 7, 1, 1, 1],
  ]) {
    await pool.query(`INSERT INTO qk_players(id,handle,normalized_handle,credential_hash,quiet_points,scored_games,wins,draws,losses)
      VALUES($1,$2,$3,$4,$5,3,$6,$7,$8)`, [id, handle, handle.toLowerCase(), tokenHash, points, wins, draws, losses]);
  }
  for (const [number, result, reason, whitePoints, blackPoints] of [
    [1, '1-0', 'resigned', 3, 0], [2, '0-1', 'resigned', 0, 3], [3, '1/2-1/2', 'draw', 1, 1],
  ]) {
    await pool.query(`INSERT INTO qk_games(id,room_code,game_number,white_player_id,black_player_id,white_handle,black_handle,result,ended_reason,final_fen,pgn,moves,started_at,ended_at,scored,score_reason,white_points,black_points)
      VALUES($1,'LEGACY',$2,$3,$4,'LegacyAlice','LegacyBob',$5,$6,'synthetic','','[]'::jsonb,now(),now(),true,'synthetic',$7,$8)`,
      [randomUUID(), number, aliceId, bobId, result, reason, whitePoints, blackPoints]);
  }
  const before = (await pool.query('SELECT id,handle,normalized_handle,credential_hash,quiet_points,scored_games,wins,draws,losses FROM qk_players ORDER BY id')).rows;
  const gamesBefore = (await pool.query('SELECT id,result,white_player_id,black_player_id FROM qk_games ORDER BY game_number')).rows;

  await store.migrate();
  await store.migrate();
  assert.deepEqual(await store.health(), { available: true, migration: 4 });
  const after = (await pool.query('SELECT id,handle,normalized_handle,credential_hash,quiet_points,scored_games,wins,draws,losses FROM qk_players ORDER BY id')).rows;
  assert.deepEqual(after, before, 'migration must preserve UUIDs, Knight IDs, credentials and Quiet Points');
  assert.deepEqual((await pool.query('SELECT id,result,white_player_id,black_player_id FROM qk_games ORDER BY game_number')).rows, gamesBefore);
  const counts = (await pool.query('SELECT human_games,human_wins,human_draws,human_losses,computer_games FROM qk_players WHERE id=$1', [aliceId])).rows[0];
  assert.deepEqual(counts, { human_games: 3, human_wins: 1, human_draws: 1, human_losses: 1, computer_games: 0 });

  const claimed = await store.claim(`Bearer ${legacyToken}`, null, 'ordinarypass');
  assert.equal(claimed.player.id, aliceId);
  assert.equal(claimed.player.quiet_points, 7);
  assert.equal((await store.authenticate(null, claimed.session)).id, aliceId);
  assert.equal(await store.authenticate(`Bearer ${legacyToken}`, null), null, 'claim revokes legacy credential');
  const login = await store.login('legacyalice', 'ordinarypass');
  assert.equal(login.player.id, aliceId);
  const recovered = await store.recover('LegacyAlice', claimed.recovery_code, 'newpassword');
  assert.equal(recovered.player.id, aliceId);
  assert.equal((await store.authenticate(null, recovered.session)).id, aliceId);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM qk_identity_sessions WHERE player_id=$1 AND revoked_at IS NULL', [aliceId])).rows[0].n, 1);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM qk_games')).rows[0].n, 3);
  console.log(JSON.stringify({ event: 'identity.acceptance', passed: true, migration: 4, checks: ['v3-to-v4', 'idempotent migration', 'legacy UUID/ID/points/history preservation', 'human counters', 'secure claim', 'login', 'one-time recovery', 'session revocation'] }));
} finally {
  await pool?.end();
  if (created) await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
}
