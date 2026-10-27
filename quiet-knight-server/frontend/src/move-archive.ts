import {Chess} from 'chess.js';
import {makeFen} from 'chessops/fen';
import {makeUci} from 'chessops/util';
import {parseSan,makeSan} from 'chessops/san';
import {positionFromFen} from './local-rules.ts';
import type {GameRecord} from './game-record.ts';
export type ArchiveSnapshot={id:string;mode:'friend'|'computer'|'pass';variant:'standard'|'chess960';white:string;black:string;humanColor?:'w'|'b';level?:number;startFen?:string;fen:string;sans:string[];result:GameRecord['result'];reason?:string;startedAt?:string;finishedAt?:string;timeControl?:string;source?:'played'|'legacy-local'|'account-history';serverVersion?:number};
export type ArchiveMove={ply:number;move_number:number;color:'white'|'black';san:string;uci:string;fen_before:string;fen_after:string};
export type ArchiveEvent={observed_at:string;from_ply:number;removed:string[];added:ArchiveMove[];result:GameRecord['result']};
export type ArchiveEntry=ArchiveSnapshot&{key:string;owner:string;startFen:string;firstObservedAt:string;updatedAt:string;moves:ArchiveMove[];events:ArchiveEvent[]};
const DB='quiet-knight-move-archive-v1';
let opening:Promise<IDBDatabase>|undefined;
const pending=new Map<string,{owner:string;snapshot:ArchiveSnapshot}>();
const queues=new Map<string,Promise<void>>(),failures=new Map<string,Error>();
function database(){if(!opening)opening=new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const s=r.result.createObjectStore('games',{keyPath:'key'});s.createIndex('owner','owner');};r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();opening=undefined;};resolve(r.result);};r.onerror=()=>{opening=undefined;reject(r.error||Error('Archive storage unavailable'));};r.onblocked=()=>{opening=undefined;reject(Error('Close other Quiet Knight tabs and retry the archive.'));};});opening.catch(()=>{opening=undefined;});return opening;}
export function replayArchive(s:ArchiveSnapshot):{startFen:string;moves:ArchiveMove[];fen:string}{
 if(!s.id||!Array.isArray(s.sans)||s.sans.length>4000||!s.sans.every(m=>typeof m==='string')||!['*','1-0','0-1','1/2-1/2'].includes(s.result))throw Error('Invalid archive game');
 const startFen=s.startFen||new Chess().fen(),moves:ArchiveMove[]=[];
 if(s.variant==='standard'){
  const game=new Chess(startFen);for(const san of s.sans){const before=game.fen(),m=game.move(san);moves.push({ply:moves.length+1,move_number:Number(before.split(' ')[5]),color:m.color==='w'?'white':'black',san:m.san,uci:m.from+m.to+(m.promotion||''),fen_before:before,fen_after:game.fen()});}
  if(game.fen()!==new Chess(s.fen).fen())throw Error('Archive move history does not match the position');return{startFen,moves,fen:game.fen()};
 }
 const pos=positionFromFen(startFen);for(const san of s.sans){const before=makeFen(pos.toSetup()),m=parseSan(pos,san);if(!m||!pos.isLegal(m))throw Error('Invalid Chess960 archive move');const normalized=makeSan(pos,m),color=pos.turn;pos.play(m);moves.push({ply:moves.length+1,move_number:Number(before.split(' ')[5]),color,san:normalized,uci:makeUci(m),fen_before:before,fen_after:makeFen(pos.toSetup())});}
 const fen=makeFen(pos.toSetup());if(fen!==makeFen(positionFromFen(s.fen).toSetup()))throw Error('Chess960 history does not match the position');return{startFen,moves,fen};
}
export function mergeArchive(owner:string,s:ArchiveSnapshot,old?:ArchiveEntry,now=new Date().toISOString()):ArchiveEntry{
 if(old?.source==='played'&&s.source==='legacy-local')return old;
 const replay=replayArchive(s);let common=0;while(common<(old?.moves.length||0)&&common<replay.moves.length&&old!.moves[common].san===replay.moves[common].san)common++;
 // Explicit fields only: seat tokens, cookies, credentials and diagnostics
 // must never enter the archive, even when an API object has extra fields.
 const row:ArchiveEntry={key:JSON.stringify([owner,s.id]),owner,id:s.id,mode:s.mode,variant:s.variant,white:s.source&&old?old.white:s.white,black:s.source&&old?old.black:s.black,humanColor:s.humanColor??old?.humanColor,level:s.level??old?.level,startFen:replay.startFen,fen:replay.fen,sans:replay.moves.map(m=>m.san),result:s.result,reason:s.reason,startedAt:old?.startedAt||s.startedAt,finishedAt:s.result==='*'?undefined:s.finishedAt||(old?.result===s.result?old.finishedAt:undefined)||now,timeControl:s.timeControl||'-',source:old?.source==='played'?'played':s.source||'played',serverVersion:s.serverVersion??old?.serverVersion,firstObservedAt:old?.firstObservedAt||now,updatedAt:old?.updatedAt||now,moves:replay.moves,events:[...(old?.events||[])]};
 if(old?.serverVersion!==undefined&&s.serverVersion!==undefined&&s.serverVersion<old.serverVersion)return old;
 if(!old||common!==old.moves.length||common!==row.moves.length||old.result!==row.result){row.events.push({observed_at:now,from_ply:common,removed:old?.sans.slice(common)||[],added:row.moves.slice(common),result:row.result});row.updatedAt=now;}
 return row;
}
export function saveArchive(owner:string,snapshot:ArchiveSnapshot):Promise<void>{
 if(!owner)return Promise.reject(Error('Archive profile required'));
 const s=structuredClone(snapshot),key=JSON.stringify([owner,s.id]);pending.set(key,{owner,snapshot:s});
 const work=(queues.get(owner)||Promise.resolve()).catch(()=>{}).then(async()=>{const db=await database();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('games','readwrite'),store=tx.objectStore('games'),r=store.get(key);r.onsuccess=()=>{try{store.put(mergeArchive(owner,s,r.result));}catch(e){tx.abort();reject(e);}};tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error||Error('The move archive could not be saved'));});failures.delete(key);if(pending.get(key)?.snapshot===s)pending.delete(key);});
 queues.set(owner,work.catch(e=>{failures.set(key,e instanceof Error?e:Error('Archive save failed'));}));return work;
}
export async function retryArchive(owner:string){await queues.get(owner);await Promise.all([...pending.values()].filter(p=>p.owner===owner).map(p=>saveArchive(owner,p.snapshot)));}
export async function flushArchive(owner:string){await queues.get(owner);const failure=[...failures].find(([key])=>JSON.parse(key)[0]===owner);if(failure)throw failure[1];}
export async function readArchive(owner:string):Promise<ArchiveEntry[]>{await flushArchive(owner);const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('games','readonly'),r=tx.objectStore('games').index('owner').getAll(owner);r.onsuccess=()=>resolve(r.result.sort((a:ArchiveEntry,b:ArchiveEntry)=>(a.startedAt||a.finishedAt||a.firstObservedAt).localeCompare(b.startedAt||b.finishedAt||b.firstObservedAt)||a.id.localeCompare(b.id)));r.onerror=()=>reject(r.error);});}
export function legacySnapshot(r:GameRecord):ArchiveSnapshot{return{id:r.id,white:r.white,black:r.black,fen:r.fen,sans:r.sans,result:r.result,startedAt:r.date,mode:r.mode==='human'?'friend':'computer',variant:'standard',timeControl:r.timeControl,source:'legacy-local'};}
function tags(e:ArchiveEntry){const value=(s:string)=>s.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/[\r\n]/g,' ');const date=new Date(e.startedAt||e.firstObservedAt);return Object.entries({Event:'Quiet Knight',Site:'Local archive',Date:date.toISOString().slice(0,10).replace(/-/g,'.'),White:e.white,Black:e.black,Result:e.result,TimeControl:e.timeControl||'-',GameId:e.id,Mode:e.mode,Variant:e.variant==='chess960'?'Chess960':'Standard',SetUp:'1',FEN:e.startFen}).map(([k,v])=>`[${k} "${value(v)}"]`).join('\n');}
export function archivePgn(entries:ArchiveEntry[]){return entries.map(e=>tags(e)+'\n\n'+e.moves.map((m,i)=>(m.color==='white'?m.move_number+'. ':i===0?m.move_number+'... ':'')+m.san).join(' ')+' '+e.result).join('\n\n')+'\n';}
export function archiveJson(entries:ArchiveEntry[],now=new Date().toISOString()){
 return JSON.stringify({format:'quiet-knight-move-archive',schema_version:1,exported_at:now,scope:'This device and selected profile only',game_count:entries.length,notes:['Games are in chronological order. A result of * means unfinished or left without a recorded outcome.','moves is the current legal main line; events also retain moves removed by undo/takeback and later branches.','Event times are when this device observed/saved a change, not precise move times.','Chess960 UCI castling targets the rook square. PGN uses SAN castling notation.','No engine analysis is included. No data is sent to an AI service. Older discarded or unobserved moves cannot be reconstructed.'],games:entries.map((e,i)=>({game_index:i+1,id:e.id,mode:e.mode,variant:e.variant,white:e.white,black:e.black,human_color:e.humanColor,computer_level:e.level,result:e.result,status:e.result==='*'?'unfinished':'finished',termination:e.reason,started_at:e.startedAt,finished_at:e.finishedAt,first_observed_at:e.firstObservedAt,last_changed_at:e.updatedAt,time_control:e.timeControl,source:e.source,initial_fen:e.startFen,final_fen:e.fen,ply_count:e.moves.length,moves:e.moves,events:e.events}))},null,2)+'\n';
}

export function accountSnapshots(human:{room_code:string;game_number:number;white_handle:string;black_handle:string;moves:{san:string}[];result:string;final_fen:string;ended_at:string}[],computer:{id:string;client_game_id?:string;moves:{san?:string;from?:string;to?:string;promotion?:string}[];result:string;final_fen:string;ended_at:string;level:number}[]):ArchiveSnapshot[]{
 const out:ArchiveSnapshot[]=[];
 for(const g of human)out.push({id:g.room_code+':'+g.game_number,mode:'friend',variant:'standard',white:g.white_handle,black:g.black_handle,sans:g.moves.map(m=>m.san),fen:g.final_fen,result:g.result as ArchiveSnapshot['result'],finishedAt:g.ended_at,source:'account-history'});
 for(const g of computer){try{const c=new Chess();for(const m of g.moves){if(m.san)c.move(m.san);else c.move({from:m.from!,to:m.to!,promotion:m.promotion});}out.push({id:g.client_game_id||'account:'+g.id,mode:'computer',variant:'standard',white:'White',black:'Black',level:g.level,sans:c.history(),fen:g.final_fen,result:g.result as ArchiveSnapshot['result'],finishedAt:g.ended_at,source:'account-history'});}catch{/* Original account record remains available if it cannot be replayed. */}}
 return out;
}
