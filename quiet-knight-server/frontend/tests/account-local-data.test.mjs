import assert from 'node:assert/strict';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
};
const { recentTables, rememberTable } = await import('../src/game-record.ts');
const game = { id: 'game-1', white: 'A', black: 'Computer', result: '1-0', fen: 'start', sans: ['e4'], date: new Date().toISOString(), mode: 'computer' };

rememberTable(game, 'player-a-uuid');
assert.equal(recentTables('player-a-uuid').length, 1);
assert.equal(recentTables('player-b-uuid').length, 0, 'Another account must not see this local game');
assert.equal(recentTables().length, 0, 'Legacy device-wide game history must not leak into a signed-in account');
rememberTable({ ...game, id: 'legacy-game' });
assert.equal(recentTables('player-a-uuid').length, 1, 'Unowned local history must not be copied into an account');
console.log('Local account isolation passed: saved games and recent history stay scoped to the owning player UUID.');
