// Pre-deploy gate: candidate HTTP/WS server, real Redis, isolated real-Postgres identity schema.
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import pg from 'pg';
import {WebSocket} from 'ws';
import {createClient} from 'redis';
const schema='qk_verify_'+randomUUID().replaceAll('-','');
const admin=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:3000});
const base='http://127.0.0.1:39173';
const origin='https://quiet-knight-live-v2xp3y.v2.appdeploy.ai';
const env={...process.env,NODE_ENV:'test',QK_TEST_SCHEMA:schema,PORT:'39173',QK_VERIFY_BASE:base,QK_EXPECTED_BUILD:'qk-server-2026-09-12-r7-move-notifications',VAPID_PUBLIC_KEY:'',VAPID_PRIVATE_KEY:''};
let child,redis,nudgeKey;const sockets=[],testRooms=[];const deadline=setTimeout(()=>{console.error('Candidate server acceptance exceeded deadline');process.exit(1);},110000);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function req(path,body,token,status=200){const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(8000)});assert.equal(response.status,status,path);return response.json();}
function run(file){return new Promise((resolve,reject)=>{const p=spawn(process.execPath,[file],{env,stdio:['ignore','pipe','pipe']});let out='';p.stdout.on('data',b=>{out+=b;});p.stderr.resume();p.on('exit',code=>{if(code===0){console.log(out.trim());resolve();}else reject(new Error(file+' failed; credential-bearing assertion details suppressed'));});p.on('error',reject);});}
async function socket(code,token){const ws=new WebSocket(base.replace('http:','ws:')+'/ws?room='+code,{origin});const messages=[];ws.on('message',b=>{try{messages.push(JSON.parse(b));}catch{}});sockets.push(ws);await once(ws,'open');if(token)ws.send(JSON.stringify({type:'presence.hello',seat_token:token}));return{ws,messages};}
try{
 await admin.query(`CREATE SCHEMA ${schema}`);
 child=spawn(process.execPath,['server.js'],{env,stdio:['ignore','pipe','pipe']});child.stdout.resume();child.stderr.resume();
 let up=false;for(let i=0;i<50;i++){try{const h=await req('/health');if(h.ok){up=true;break;}}catch{}await delay(150);}assert.ok(up,'Candidate server must become healthy');
 await run('verify-live.js');
 const a=await req('/players',{handle:'HttpWhite'},null,201),b=await req('/players',{handle:'HttpBlack'},null,201);
 await req('/players',{handle:'httpwhite'},null,409);await req('/players/me',undefined,'invalid',401);
 const created=await req('/rooms',{},a.credential);const code=created.room.code;
 testRooms.push(code);
 const joinKey=randomBytes(24).toString('hex');const joined=await req(`/rooms/${code}/join`,{join_key:joinKey},b.credential);
 assert.equal(created.room.white_player.id,a.player.id);assert.equal(joined.room.black_player.id,b.player.id);
 assert.equal(joined.role,'black');assert.equal((await req(`/rooms/${code}/join`,{join_key:joinKey},b.credential)).role,'black');
 const one=await socket(code,created.seat_token),two=await socket(code,joined.seat_token);
 await delay(120);assert.ok(one.messages.some(m=>m.type==='presence.update'&&m.white&&m.black));assert.ok(two.messages.some(m=>m.type==='seat.role'&&m.role==='black'));
 const spectator=await socket(code,'invalid');await delay(100);assert.ok(spectator.messages.some(m=>m.type==='seat.role'&&m.role==='spectator'));
 two.ws.close();await delay(150);assert.ok(one.messages.some(m=>m.type==='presence.update'&&m.white&&!m.black));
 const back=await socket(code,joined.seat_token);await delay(120);assert.ok(back.messages.some(m=>m.type==='seat.role'&&m.role==='black'));
 redis=createClient({url:process.env.REDIS_URL});redis.on('error',()=>{});await redis.connect();
 const beforeNudge=await req(`/rooms/${code}`);await req(`/rooms/${code}/nudge`,{seat_token:joined.seat_token,request_id:randomUUID()});await delay(60);
 assert.ok(one.messages.some(m=>m.type==='opponent.nudge'&&m.room_code===code));
 assert.equal((await req(`/rooms/${code}`)).room.fen,beforeNudge.room.fen);assert.equal((await req(`/rooms/${code}`)).room.version,beforeNudge.room.version);
 await req(`/rooms/${code}/nudge`,{seat_token:joined.seat_token,request_id:randomUUID()},undefined,429);
 await req(`/rooms/${code}/nudge`,{seat_token:created.seat_token,request_id:randomUUID()},undefined,409);
 await req(`/rooms/${code}/nudge`,{seat_token:'spectator',request_id:randomUUID()},undefined,403);
 const waiting=await req('/rooms',{},a.credential);testRooms.push(waiting.room.code);await req(`/rooms/${waiting.room.code}/nudge`,{seat_token:waiting.seat_token,request_id:randomUUID()},undefined,409);
 nudgeKey=`qk:nudge:${code}:1:${createHash('sha256').update(joined.seat_token).digest('hex').slice(0,24)}`;
 for(let i=0;i<2;i++){await redis.del(nudgeKey+':cooldown');await req(`/rooms/${code}/nudge`,{seat_token:joined.seat_token,request_id:randomUUID()});}
 await redis.del(nudgeKey+':cooldown');await req(`/rooms/${code}/nudge`,{seat_token:joined.seat_token,request_id:randomUUID()},undefined,429);
 const ended=await req(`/rooms/${code}/resign`,{seat_token:joined.seat_token});assert.equal(ended.room.score_event.white_points,3);assert.equal(ended.room.score_event.black_points,0);
 await req(`/rooms/${code}/nudge`,{seat_token:created.seat_token,request_id:randomUUID()},undefined,409);
 const event=ended.room.score_event.id;
 for(let i=0;i<3;i++)await req(`/rooms/${code}`);
 assert.equal((await req('/players/me',undefined,a.credential)).player.quiet_points,3);
 const swap=await req(`/rooms/${code}/rematch`,{seat_token:created.seat_token,colors:'swap',game_number:1});
 assert.equal(swap.room.game_number,2);assert.equal(swap.room.white_player.id,b.player.id);assert.equal(swap.room.black_player.id,a.player.id);
 await delay(120);assert.ok(one.messages.some(m=>m.type==='seat.role'&&m.role==='black'&&m.game_number===2));assert.ok(back.messages.some(m=>m.type==='seat.role'&&m.role==='white'&&m.game_number===2));
 assert.equal((await req(`/rooms/${code}/join`,{seat_token:created.seat_token})).role,'black');
 assert.equal((await req(`/rooms/${code}/join`,{join_key:joinKey})).role,'white');
 await req(`/rooms/${code}/move`,{seat_token:created.seat_token,from:'e2',to:'e4'},undefined,409);
 const move=await req(`/rooms/${code}/move`,{seat_token:joined.seat_token,from:'e2',to:'e4'});assert.equal(move.room.last_move.san,'e4');
 await req(`/rooms/${code}/resign`,{seat_token:created.seat_token});
 const third=await req(`/rooms/${code}/rematch`,{seat_token:created.seat_token,colors:'same',game_number:2});assert.equal(third.room.game_number,3);
 await req(`/rooms/${code}/resign`,{seat_token:created.seat_token});
 const fourth=await req(`/rooms/${code}/rematch`,{seat_token:created.seat_token,colors:'swap',game_number:3});assert.equal(fourth.room.game_number,4);assert.equal(fourth.room.points_policy.eligible,false);
 const casual=await req(`/rooms/${code}/resign`,{seat_token:created.seat_token});assert.equal(casual.room.score_event.scored,false);assert.equal(casual.room.score_event.white_points,0);assert.equal(casual.room.score_event.black_points,0);
 await delay(100);assert.ok(one.messages.some(m=>m.type==='room.update'&&m.room.score_event?.id===event));assert.ok(back.messages.some(m=>m.type==='room.update'&&m.room.game_number===4));
 console.log(JSON.stringify({event:'server.acceptance',passed:true,room:code,game_number:4,first_game_id:event,pair_cap:'fourth casual',checks:['full verify-live','HTTP Knight ID','seat association','win points','idempotent reads','same and swap rematch','join-key recovery after swap','actual color authorization','socket updates','nudge seat and turn authority','nudge room immutability','two-minute cooldown','three-per-thirty-minute cap']}));
}finally{clearTimeout(deadline);for(const s of sockets)s.terminate();if(redis?.isOpen){if(testRooms.length)await redis.del(testRooms.map(code=>'qk:room:'+code));if(nudgeKey)await redis.del(nudgeKey+':cooldown',nudgeKey+':window');await redis.quit();}if(child&&child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit').catch(()=>{});child.kill('SIGTERM');await Promise.race([exited,delay(2000)]);if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');}await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();}
