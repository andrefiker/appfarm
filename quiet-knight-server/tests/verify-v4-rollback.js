// Synthetic cross-image rollback check. Never use this script with a production database.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { IdentityStore } from '../identity.js';

if (!process.env.DATABASE_URL?.includes('qk_backup_restored')) throw new Error('Disposable rollback database required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const store = new IdentityStore({ pool });
try {
  await store.migrate();
  assert.equal((await store.health()).migration, 4);
  if (process.env.QK_ROLLBACK_PHASE === 'seed') {
    const white = await store.register('RollbackAlpha', 'ordinarypass');
    const black = await store.register('RollbackBeta', 'ordinarypass');
    const gameId = randomUUID();
    await pool.query(`INSERT INTO qk_games(id,room_code,game_number,white_player_id,black_player_id,white_handle,black_handle,result,ended_reason,final_fen,pgn,moves,started_at,ended_at,scored,score_reason,white_points,black_points)
      VALUES($1,'ROLLBACK',1,$2,$3,'RollbackAlpha','RollbackBeta','1-0','resigned','synthetic','','[]'::jsonb,now(),now(),true,'synthetic',3,0)`,
      [gameId, white.player.id, black.player.id]);
    await pool.query('UPDATE qk_players SET quiet_points=5,human_games=1,human_wins=1 WHERE id=$1', [white.player.id]);
    await pool.query('UPDATE qk_players SET human_games=1,human_losses=1 WHERE id=$1', [black.player.id]);
    process.stdout.write(JSON.stringify({ whiteId: white.player.id, blackId: black.player.id, gameId, session: white.session, recoveryCode: white.recovery_code }) + '\n');
  } else if (process.env.QK_ROLLBACK_PHASE === 'verify') {
    const state = JSON.parse(await readFile('/state/rollback-state.json', 'utf8'));
    const player = await store.authenticate(null, state.session);
    assert.equal(player?.id, state.whiteId, 'session survives image rollback');
    assert.equal(player.quiet_points, 5);
    assert.equal(player.human_wins, 1);
    assert.equal((await store.login('rollbackalpha', 'ordinarypass')).player.id, state.whiteId);
    assert.equal((await store.recent(state.whiteId))[0].id, state.gameId);
    assert.equal((await pool.query('SELECT human_losses FROM qk_players WHERE id=$1', [state.blackId])).rows[0].human_losses, 1);
    const recovered = await store.recover('RollbackAlpha', state.recoveryCode, 'newpassword');
    assert.equal(recovered.player.id, state.whiteId);
    assert.equal(await store.authenticate(null, state.session), null, 'recovery revokes old session');
    assert.equal((await store.login('ROLLBACKALPHA', 'newpassword')).player.id, state.whiteId);
    assert.equal((await store.recent(state.whiteId))[0].id, state.gameId);
    console.log(JSON.stringify({ event: 'rollback.acceptance', passed: true, migration: 4, checks: ['UUIDs', 'Knight IDs', 'password hashes', 'existing session', 'recovery', 'Quiet Points', 'human results', 'game history'] }));
  } else throw new Error('QK_ROLLBACK_PHASE must be seed or verify');
} finally {
  await pool.end();
}
