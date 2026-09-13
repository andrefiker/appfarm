// Runs against real Postgres in a fresh isolated SQL schema; never touches production players/games.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {Chess} from 'chess.js';
import {IdentityStore,publicPlayer} from './identity.js';
import {PushService,movePushPlan} from './push-notifications.js';
import {resetClock,flagClock} from './clock.js';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required for real PostgreSQL acceptance');
const schema='qk_verify_'+randomUUID().replaceAll('-','');
const admin=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:3000});
let store;
try{
 await admin.query(`CREATE SCHEMA ${schema}`);
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:5,options:`-c search_path=${schema}`,connectionTimeoutMillis:3000,statement_timeout:7000});
 store=new IdentityStore({pool});await store.migrate();await store.migrate();
 assert.equal((await store.health()).migration,3);
 const a=await store.create('QuietA'),b=await store.create('QuietB');
 assert.equal(a.credential.length,43);assert.equal((await store.authenticate('Bearer '+a.credential)).id,a.player.id);
 await assert.rejects(store.create('quieta'),e=>e.status===409);
 await assert.rejects(store.create('x'),e=>e.status===400);
 await assert.rejects(store.authenticate('Bearer '+('x'.repeat(43))),e=>e.status===401);
 assert.equal(await store.authenticate(null),null);
 const stored=(await pool.query('SELECT credential_hash FROM qk_players WHERE id=$1',[a.player.id])).rows[0];
 assert.equal(stored.credential_hash.length,64);assert.notEqual(stored.credential_hash,a.credential);
 const make=(number,{white=a.player,black=b.player,winner='w',status='resigned',sans=[]}={})=>{
  const game=new Chess();for(const san of sans)game.move(san);
  return{code:'TESTAA',game_number:number,white_player:publicPlayer(white),black_player:publicPlayer(black),winner,status,moves:game.history({verbose:true}).map(m=>({from:m.from,to:m.to,promotion:m.promotion,san:m.san})),fen:game.fen(),created_at:Date.now(),ended_at:Date.now()};
 };
 const first=make(1);const repeated=await Promise.all(Array.from({length:6},()=>store.record(first)));
 assert.equal(new Set(repeated.map(x=>x.id)).size,1);assert.equal((await store.profile(a.player.id)).quiet_points,3);assert.equal((await store.profile(b.player.id)).quiet_points,0);
 await store.record(make(2,{winner:'b'}));
 const draw=make(3,{status:'draw',winner:null,sans:['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8']});
 const d=await store.record(draw);assert.equal(d.white_points,1);assert.equal(d.black_points,1);
 assert.equal((await store.profile(a.player.id)).quiet_points,4);assert.equal((await store.profile(b.player.id)).quiet_points,4);
 assert.equal((await store.pairStatus(a.player,b.player)).eligible,false);
 const fourth=await store.record(make(4));assert.equal(fourth.scored,false);assert.equal(fourth.white_points,0);assert.equal(fourth.black_points,0);
 assert.equal((await store.profile(a.player.id)).scored_games,3);
 const self=await store.record(make(5,{black:a.player}));assert.equal(self.scored,false);
 const guest=await store.record(make(6,{black:null}));assert.equal(guest.scored,false);
 await assert.rejects(store.record({...first,game_number:7,fen:new Chess().fen().replace(' w ',' b ')}));
 await assert.rejects(store.record({...first,game_number:7,status:'active'}));
 const h2h=await store.headToHead(a.player.id,b.player.id);assert.deepEqual(h2h,{wins:2,losses:1,draws:1});
 // Exactly three simultaneous games can score for a fresh pair, despite separate room locks.
 const c=await store.create('QuietC'),e=await store.create('QuietD');
 const races=await Promise.all(Array.from({length:5},(_,i)=>store.record({...make(i+1,{white:c.player,black:e.player}),code:'RACE'+String(i).padStart(2,'0')})));
 assert.equal(races.filter(x=>x.scored).length,3);assert.equal((await store.profile(c.player.id)).quiet_points,9);
 // Rolling window expiry (isolated fixtures only) restores eligibility.
 await pool.query("UPDATE qk_games SET ended_at=now()-interval '25 hours' WHERE white_player_id=$1",[c.player.id]);
 assert.equal((await store.pairStatus(c.player,e.player)).remaining,3);
 const mate=await store.record({...make(20,{white:c.player,black:e.player,winner:'b',status:'checkmate',sans:['f3','e5','g4','Qh4#']}),code:'MATEAA'});
 assert.equal(mate.black_points,3);assert.ok(mate.pgn.includes('[Result "0-1"]'));
 const timedGame={...make(21,{white:c.player,black:e.player,status:'active',winner:null,sans:['e4','e5']}),code:'TIMEAA',turn:'w'};
 resetClock(timedGame,Date.now()-600000);flagClock(timedGame,Date.now());
 const onTime=await store.record(timedGame);assert.equal(onTime.black_points,3);assert.equal(onTime.ended_reason,'timeout');assert.ok(onTime.pgn.includes('[Result "0-1"]'));
 assert.equal((await store.record(timedGame)).id,onTime.id);
 const delivered=[];const push=new PushService({pool,publicKey:'public-test',privateKey:'private-test',transport:{setVapidDetails:()=>{},sendNotification:async(subscription,payload)=>delivered.push({subscription,payload})}});
 const pushRoom={code:'PUSHDB',game_number:1,version:3,status:'active',turn:'b',moves:[{san:'e4'}],white_token:'white-seat',black_token:'black-seat',white_player:publicPlayer(a.player),black_player:publicPlayer(b.player)};
 const subscription={endpoint:'https://push.example/device-b',keys:{p256dh:'A'.repeat(65),auth:'B'.repeat(22)}};
 await push.subscribe(pushRoom,'black-seat',subscription);const plan=movePushPlan(pushRoom,'w');
 assert.equal((await push.deliver(pushRoom,plan,'move')).sent,1);assert.equal((await push.deliver(pushRoom,plan,'move')).status,'duplicate');assert.equal(delivered.length,1);
 assert.equal((await pool.query('SELECT count(*)::int AS n FROM qk_push_subscriptions')).rows[0].n,1);assert.equal((await pool.query('SELECT count(*)::int AS n FROM qk_push_events')).rows[0].n,1);
 await assert.rejects(push.subscribe(pushRoom,'wrong-seat',subscription),error=>error.status===403);
 const data=(await admin.query('SHOW data_directory')).rows[0].data_directory;
 if(process.env.RAILWAY_ENVIRONMENT_ID)assert.ok(data.startsWith('/var/lib/postgresql/data/'),'Postgres data must live under the attached volume');
 console.log(JSON.stringify({event:'identity.acceptance',passed:true,migration:3,checks:['handle uniqueness','credential hashing/resume/rejection','guest unchanged','win/draw/loss','concurrent idempotency','rolling pair cap','same ID excluded','legitimate endings','history','head-to-head','additive push tables','seat-bound subscription','move-event dedupe','volume data directory']}));
}finally{
 await store?.close();
 // This randomly named schema was created by this exact run and contains only test fixtures.
 await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();
}
