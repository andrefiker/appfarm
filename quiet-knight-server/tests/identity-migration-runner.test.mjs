import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../migrate-identity.js', import.meta.url));
const env = { ...process.env };
delete env.QK_APPLY_IDENTITY_MIGRATIONS;
delete env.DATABASE_URL;
const result = spawnSync(process.execPath, [script], { env, encoding: 'utf8' });
assert.equal(result.status, 2, 'migration runner requires an explicit opt-in');
assert.match(result.stderr, /Identity migration not run/);
console.log('Identity migration runner blocks startup without explicit migration opt-in.');
