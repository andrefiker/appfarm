import { IdentityStore } from './identity.js';

if (process.env.QK_APPLY_IDENTITY_MIGRATIONS !== 'true' || !process.env.DATABASE_URL) {
  console.error('Identity migration not run. Set QK_APPLY_IDENTITY_MIGRATIONS=true and DATABASE_URL explicitly.');
  process.exitCode = 2;
} else {
  const identities = new IdentityStore();
  let status = null;
  try {
    await identities.migrate();
    status = await identities.health();
    if (!status.available || status.migration < 4) throw new Error('schema verification failed');
    console.log(JSON.stringify({ event: 'identity.migration.complete', migration: status.migration }));
  } catch (error) {
    console.error(JSON.stringify({ event: 'identity.migration.failed', name: error?.name || 'Error', code: error?.code || null, migration: status?.migration ?? null, available: status?.available ?? null }));
    process.exitCode = 1;
  } finally {
    await identities.close().catch(() => {});
  }
}
