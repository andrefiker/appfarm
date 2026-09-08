import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {Chess} from 'chess.js';

export class IdentityError extends Error {constructor(status,message){super(message);this.status=status;}}
const hash=value=>createHash('sha256').update(value).digest('hex');
const publicColumns='id,handle,quiet_points,scored_games,wins,draws,losses,current_win_streak,best_win_streak';
const compact=p=>p?{id:p.id,handle:p.handle,quiet_points:p.quiet_points}:null;
const pairKey=(a,b)=>[a,b].sort().join(':');
export const terminal=room=>['checkmate','draw','resigned'].includes(room.status);
export function gameRecord(room){
 if(!terminal(room)||!Array.isArray(room.moves)||room.moves.length>4000)throw new IdentityError(400,'A completed legal game is required');
 const game=new Chess();
 try{for(const m of room.moves)game.move({from:m.from,to:m.to,promotion:m.promotion});}catch{throw new IdentityError(400,'Invalid game history');}
 if(game.fen()!==room.fen)throw new IdentityError(400,'Final position does not match history');
 if(room.status==='checkmate'&&(!game.isCheckmate()||room.winner===(game.turn())))throw new IdentityError(400,'Invalid checkmate result');
 if(room.status==='draw'&&!game.isDraw())throw new IdentityError(400,'Invalid draw result');
 if(room.status!=='draw'&&!['w','b'].includes(room.winner))throw new IdentityError(400,'Invalid winner');
 const result=room.status==='draw'?'1/2-1/2':room.winner==='w'?'1-0':'0-1';
 const started=new Date(room.started_at||room.created_at);
 const ended=new Date(room.ended_at||Date.now());
 game.header('Event','Quiet Knight','Date',started.toISOString().slice(0,10).replaceAll('-','.'),'White',room.white_player?.handle||'White','Black',room.black_player?.handle||'Black','Result',result);
 return{game,result,started,ended,pgn:game.pgn()};
}
export class IdentityStore{
 constructor({connectionString=process.env.DATABASE_URL,pool}={}){
  const testSchema=process.env.NODE_ENV==='test'&&/^qk_verify_[a-f0-9]+$/.test(process.env.QK_TEST_SCHEMA||'')?process.env.QK_TEST_SCHEMA:null;
  this.pool=pool||(connectionString?new pg.Pool({connectionString,...(testSchema?{options:`-c search_path=${testSchema}`} : {}),max:5,connectionTimeoutMillis:2500,idleTimeoutMillis:30000,statement_timeout:5000,application_name:'quiet-knight'}):null);
  this.pool?.on('error',()=>console.error('[identity] database connection error'));
  this.ready=false;
 }
 async migrate(){if(!this.pool)return;const c=await this.pool.connect();try{await c.query('BEGIN');await c.query("SELECT pg_advisory_xact_lock(72651001)");await c.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));await c.query('COMMIT');this.ready=true;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
 required(){if(!this.pool||!this.ready)throw new IdentityError(503,'Knight ID is temporarily unavailable. Guest play is still available.');}
 async create(handle){this.required();if(typeof handle!=='string'||!/^[A-Za-z0-9_-]{3,20}$/.test(handle))throw new IdentityError(400,'Use 3–20 letters, numbers, underscores or hyphens');const token=randomBytes(32).toString('base64url');try{const {rows}=await this.pool.query(`INSERT INTO qk_players(id,handle,normalized_handle,credential_hash) VALUES($1,$2,$3,$4) RETURNING ${publicColumns}`,[randomUUID(),handle,handle.toLowerCase(),hash(token)]);return{player:rows[0],credential:token};}catch(e){if(e.code==='23505')throw new IdentityError(409,'That handle is already taken');throw e;}}
 async authenticate(header){if(!header)return null;this.required();const m=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(header);if(!m)throw new IdentityError(401,'Knight ID credential is invalid');const {rows}=await this.pool.query(`SELECT ${publicColumns} FROM qk_players WHERE credential_hash=$1`,[hash(m[1])]);if(!rows[0])throw new IdentityError(401,'Knight ID credential is invalid');return rows[0];}
 async profile(id){this.required();const {rows}=await this.pool.query(`SELECT ${publicColumns} FROM qk_players WHERE id=$1`,[id]);return rows[0]||null;}
 async pairStatus(white,black,c=this.pool){if(!white||!black)return{eligible:false,reason:'Guests play casually',remaining:0};if(white.id===black.id)return{eligible:false,reason:'Same Knight ID on both seats',remaining:0};this.required();const {rows}=await c.query("SELECT count(*)::int AS n FROM qk_games WHERE LEAST(white_player_id,black_player_id)=$1 AND GREATEST(white_player_id,black_player_id)=$2 AND scored AND ended_at>now()-interval '24 hours'",[white.id,black.id].sort());return{eligible:rows[0].n<3,reason:rows[0].n<3?'Quiet Points game':'Today’s points between you two are complete. Rematches are now casual.',remaining:Math.max(0,3-rows[0].n)};}
 async record(room){this.required();const record=gameRecord(room);const c=await this.pool.connect();try{
  await c.query('BEGIN');
  // Lock the game even for guests, then the unordered pair and players in a stable order.
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`game:${room.code}:${room.game_number||1}`]);
  const old=await c.query('SELECT * FROM qk_games WHERE room_code=$1 AND game_number=$2',[room.code,room.game_number||1]);
  if(old.rows[0]){await c.query('COMMIT');return old.rows[0];}
  const ids=[...new Set([room.white_player?.id,room.black_player?.id].filter(Boolean))].sort();
  if(ids.length===2)await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`pair:${pairKey(...ids)}`]);
  const players=ids.length?(await c.query(`SELECT ${publicColumns} FROM qk_players WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE`,[ids])).rows:[];
  const white=players.find(p=>p.id===room.white_player?.id),black=players.find(p=>p.id===room.black_player?.id);
  const eligibility=await this.pairStatus(white,black,c);
  const wp=eligibility.eligible?(record.result==='1-0'?3:record.result==='1/2-1/2'?1:0):0;
  const bp=eligibility.eligible?(record.result==='0-1'?3:record.result==='1/2-1/2'?1:0):0;
  const {rows}=await c.query(`INSERT INTO qk_games(id,room_code,game_number,white_player_id,black_player_id,white_handle,black_handle,result,ended_reason,final_fen,pgn,moves,started_at,ended_at,scored,score_reason,white_points,black_points) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,[randomUUID(),room.code,room.game_number||1,white?.id||null,black?.id||null,white?.handle||'White',black?.handle||'Black',record.result,room.status,room.fen,record.pgn,JSON.stringify(room.moves),record.started,record.ended,eligibility.eligible,eligibility.reason,wp,bp]);
  if(eligibility.eligible)for(const [player,points]of[[white,wp],[black,bp]])await c.query(`UPDATE qk_players SET quiet_points=quiet_points+$2,scored_games=scored_games+1,wins=wins+CASE WHEN $2=3 THEN 1 ELSE 0 END,draws=draws+CASE WHEN $2=1 THEN 1 ELSE 0 END,losses=losses+CASE WHEN $2=0 THEN 1 ELSE 0 END,current_win_streak=CASE WHEN $2=3 THEN current_win_streak+1 ELSE 0 END,best_win_streak=GREATEST(best_win_streak,CASE WHEN $2=3 THEN current_win_streak+1 ELSE 0 END),updated_at=now() WHERE id=$1`,[player.id,points]);
  await c.query('COMMIT');return rows[0];
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
 async recent(playerId){this.required();return(await this.pool.query('SELECT id,room_code,game_number,white_player_id,black_player_id,white_handle,black_handle,result,ended_reason,final_fen,moves,ended_at,scored,score_reason,white_points,black_points FROM qk_games WHERE white_player_id=$1 OR black_player_id=$1 ORDER BY ended_at DESC LIMIT 8',[playerId])).rows;}
 async headToHead(a,b){this.required();const {rows}=await this.pool.query("SELECT count(*) FILTER(WHERE (white_player_id=$1 AND result='1-0') OR (black_player_id=$1 AND result='0-1'))::int AS wins,count(*) FILTER(WHERE (white_player_id=$2 AND result='1-0') OR (black_player_id=$2 AND result='0-1'))::int AS losses,count(*) FILTER(WHERE result='1/2-1/2')::int AS draws FROM qk_games WHERE LEAST(white_player_id,black_player_id)=LEAST($1::uuid,$2::uuid) AND GREATEST(white_player_id,black_player_id)=GREATEST($1::uuid,$2::uuid)",[a,b]);return rows[0];}
 async health(){if(!this.pool||!this.ready)return{available:false,migration:0};try{const {rows}=await this.pool.query('SELECT max(version)::int AS version FROM qk_migrations');return{available:true,migration:rows[0].version};}catch{return{available:false,migration:0};}}
 async close(){await this.pool?.end();}
}
export {compact as publicPlayer};
