import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {mergeArchive,archiveJson,archivePgn,replayArchive} from '../src/move-archive.ts';
import {chess960Fen,playUci,positionFromFen} from '../src/local-rules.ts';
import {makeFen} from 'chessops/fen';
function snapshot(id,moves,result='*'){const c=new Chess();for(const m of moves)c.move(m);return{id,mode:'computer',variant:'standard',white:'You',black:'Stockfish',sans:moves,fen:c.fen(),result};}
let old=mergeArchive('guest',snapshot('one',['e4','e5']));assert.equal(old.moves.length,2);assert.equal(mergeArchive('guest',snapshot('one',['e4','e5']),old).events.length,1);
old=mergeArchive('guest',snapshot('one',['e4']),old);old=mergeArchive('guest',snapshot('one',['e4','c5']),old);assert.deepEqual(old.events[1].removed,['e5']);assert.equal(old.events[2].added[0].san,'c5');
const entries=Array.from({length:15},(_,i)=>mergeArchive('guest',snapshot('game-'+i,['f3','e5','g4','Qh4#'],'0-1')));const json=JSON.parse(archiveJson(entries));assert.equal(json.game_count,15);assert.equal(json.games[0].moves[3].uci,'d8h4');assert.equal(json.games[0].moves[3].fen_after,entries[0].fen);
for(const block of archivePgn(entries).trim().split(/\n\n(?=\[Event)/)){const c=new Chess();c.loadPgn(block);assert.equal(c.history().at(-1),'Qh4#');assert.equal(c.getHeaders().Result,'0-1');}
assert.throws(()=>replayArchive({...snapshot('bad',['e4']),fen:new Chess().fen()}));
const leaky={...snapshot('safe',['e4']),seat_token:'PRIVATE',password:'SECRET',connection_id:'HIDDEN'};const out=archiveJson([mergeArchive('guest',leaky)]);for(const secret of ['PRIVATE','SECRET','HIDDEN','seat_token','password','owner'])assert.equal(out.includes(secret),false);
const start=chess960Fen(42),pos=positionFromFen(start),san=playUci(pos,'e2e4');const v=mergeArchive('guest',{...snapshot('960',[]),variant:'chess960',startFen:start,sans:[san],fen:makeFen(pos.toSetup())});assert.equal(v.moves[0].uci,'e2e4');assert.match(archivePgn([v]),/\[Variant "Chess960"\]/);
const promotion=new Chess('7k/P7/6K1/8/8/8/8/8 w - - 0 1');promotion.move('a8=N');const promoted=mergeArchive('guest',{...snapshot('promotion',[]),startFen:'7k/P7/6K1/8/8/8/8/8 w - - 0 1',sans:['a8=N'],fen:promotion.fen()});assert.equal(promoted.moves[0].uci,'a7a8n');
console.log('Move archive: full replay, 15-game export, PGN roundtrip, unfinished games, undo branches, duplicate sync, promotion, Chess960 and secret exclusion passed.');
