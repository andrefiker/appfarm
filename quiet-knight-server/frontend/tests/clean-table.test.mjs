import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const require = createRequire(import.meta.url);
const { outputFiles } = await build({
 stdin: { contents: `
 import React from 'react';
 import {renderToStaticMarkup} from 'react-dom/server';
 import {GameSurface} from './src/chess-ui';
 const noop=()=>{};
 export const markup=renderToStaticMarkup(<GameSurface gameId="test" onReviewStart={noop}
   onReviewGame={noop} onNewOpponent={noop} board={{position:{a1:{color:'w',type:'r'}},orientation:'w',selected:null,targets:[],onSquare:noop}}
   online code="TEST01" connection="Live" level={2} me="w" opponentJoined turn="w"
   ended={false} waiting={false} spectator={false} status="Your move" hint="" losses={{w:[],b:['p']}} sans={[]} busy={false}
   tableScore={{white:2,black:1,draws:1}} lifetimeScore={<span>Lifetime-marker</span>}
   onBack={noop} onSettings={noop} onNew={noop} onResign={noop} onCopy={noop} sound={false} onSound={noop} />);
 `, resolveDir: process.cwd(), loader:'tsx' },
 bundle:true, external:['react','react-dom/server'], mainFields:['module','main'], conditions:['import'], write:false, platform:'node', format:'cjs',
 loader:{'.css':'empty','.png':'dataurl'}, logLevel:'silent',
});
const mod={exports:{}};
globalThis.document={hidden:false}; globalThis.window={matchMedia:()=>({matches:false})};
new Function('require','module','exports',outputFiles[0].text)(require,mod,mod.exports);
assert.match(mod.exports.markup, /aria-label="Table scoreboard"/);
assert.match(mod.exports.markup, /aria-label="Copy game link"/);
assert.doesNotMatch(mod.exports.markup, /Lifetime-marker/);

assert.match(mod.exports.markup, /aria-label="Material advantage">White \+5/);

assert.match(mod.exports.markup, /<main class="qk game-shell mobile-table online-table/);
