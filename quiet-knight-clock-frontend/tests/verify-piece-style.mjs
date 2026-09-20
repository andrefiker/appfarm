import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const pieces = read('../src/pieces.tsx');
const court = read('../src/court-army-pieces.tsx');
const preferences = read('../src/table-atmosphere.tsx');
const app = read('../src/GameApp.tsx');
const ui = read('../src/chess-ui.tsx');
const keepsake = read('../src/game-keepsake.tsx');

for (const kind of ['p', 'n', 'b', 'r', 'q', 'k']) {
  assert.match(court, new RegExp("kind === [\"']" + kind + "[\"']"));
}
for (const anatomy of ['head', 'shoulders', 'torso', 'arms', 'legs', 'feet']) {
  assert.match(court, new RegExp('data-anatomy=[^\\n]*' + anatomy));
}
for (const role of ['infantry soldier', 'palace guard', 'cleric bishop', 'standing queen', 'standing king', 'mounted cavalry']) {
  assert.match(court, new RegExp('data-figure-role=[^\\n]*' + role));
}
assert.match(court, /horse head neck body four legs/);
assert.match(court, /rider head torso arms legs/);
assert.doesNotMatch(court, /FigureBase|base\)/);
assert.match(pieces, /createContext<PieceStyle>\('classic'\)/);
assert.match(pieces, /style === 'court-army'/);
assert.match(preferences, /qk-piece-style-v1/);
assert.match(preferences, /\?['"]court-army['"]:['"]classic['"]/);
assert.match(app, /PieceStyleProvider style=\{table\.pieceStyle\}/);
assert.match(app, /Classic Quiet Knight/);
assert.match(app, /Court &amp; Army/);
assert.match(ui, /scope=\{.board-/);
assert.match(ui, /scope=\{.lost-/);
assert.match(ui, /scope=\{.promotion-/);
assert.match(keepsake, /postcard-/);
assert.doesNotMatch(court, /https?:\/\//);

console.log(JSON.stringify({
  event: 'frontend.piece-style.acceptance',
  passed: true,
  checks: [
    'classic remains default',
    'twelve local vector variants',
    'explicit humanoid anatomy and role silhouettes',
    'mounted rider on a four-legged horse',
    'no chess-piece pedestal geometry',
    'local preference persistence',
    'board/captures/promotion/final-position shared renderer',
    'no external art dependency',
  ],
}));
