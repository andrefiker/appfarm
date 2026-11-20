import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as wait} from 'node:timers/promises';
import {randomBytes} from 'node:crypto';
// GitHub-runner-only isolated Redis service; never connect this smoke test to production.
if(process.env.GITHUB_ACTIONS!=='true')throw Error('Only run in the isolated CI job.');
const port=3899,origin='http://127.0.0.1:'+port,env={...process.env,PORT:String(port),FRONTEND_ORIGIN:origin,REDIS_URL:'redis://127.0.0.1:6379',DATABASE_URL:'',NODE_ENV:'test',QK_TEST_SCHEMA:'qk_verify_'+randomBytes(7).toString('hex')};
const child=spawn(process.execPath,['server.js'],{env,stdio:'inherit'});
const request=async(path,body,status=200)=>{
 const r=await fetch(origin+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const x=await r.json();assert.equal(r.status,status,JSON.stringify(x));return x;
};
try{
 for(let i=0;i<100;i++){try{await request('/capabilities');break;}catch(e){if(i===99)throw e;await wait(200);}}
 const host=await request('/rooms',{nickname:'Demo white',side:'white',kind:'live',require_untimed:true});
 const path='/rooms/'+host.room.code;
 const guest=await request(path+'/join',{nickname:'Demo black'});
 let room=guest.room;
 const route=path+'/teaching',w=host.seat_token,b=guest.seat_token;
 const teach=(token,action,extras={},status=200)=>request(route,{seat_token:token,action,game_number:room.game_number,expected_version:room.version,...extras},status);
 assert.equal((await teach(w,'status')).teaching.enabled,false);
 await teach('spectator','status',{},403);
 await teach(w,'tip',{expected_fen:room.fen},403);
 const proposed=await teach(w,'request');room=proposed.room;
 assert.equal('teaching' in room,false);
 const proposal=(await teach(b,'status')).teaching.proposal;
 await teach(w,'accept',{proposal_id:proposal.id},403);
 room=(await teach(b,'accept',{proposal_id:proposal.id})).room;
 assert.equal(room.points_policy.eligible,false);
 assert.equal((await teach(w,'status')).teaching.enabled,true);
 await teach(b,'tip',{expected_fen:room.fen},403);
 await teach(w,'tip',{expected_fen:'stale'},403);
 const tip=await teach(w,'tip',{expected_fen:room.fen});assert.equal(tip.fen,room.fen);
 room=(await teach(b,'disable')).room;assert.equal(room.points_policy.eligible,false);
 await teach(w,'tip',{expected_fen:room.fen},403);
 room=(await request(path+'/resign',{seat_token:w})).room;
 room=(await request(path+'/rematch',{seat_token:b,game_number:room.game_number})).room;
 assert.equal(room.game_number,2);
 assert.equal((await teach(b,'status')).teaching.enabled,false);
 await teach(w,'tip',{game_number:1,expected_fen:room.fen},409);
 console.log('Isolated Redis teaching HTTP checks passed.');
 // Exercise the actual HTTP route and Redis persistence on a fresh untimed room.
 const amateurHost=await request('/rooms',{nickname:'Demo White',side:'white',kind:'live',require_untimed:true});
 const amateurPath='/rooms/'+amateurHost.room.code;
 const amateurGuest=await request(amateurPath+'/join',{nickname:'Demo Black'});
 let active=amateurGuest.room;
 const toggle=(token,enabled,status=200,extra={})=>request(amateurPath+'/amateur',{seat_token:token,enabled,game_number:active.game_number,expected_version:active.version,...extra},status);
 assert.deepEqual(active.amateur,{available:true,enabled:false});
 await toggle('spectator',true,403);
 await toggle(amateurGuest.seat_token,true,409,{expected_version:active.version-1});
 active=(await toggle(amateurGuest.seat_token,true)).room;
 assert.deepEqual(active.amateur,{available:true,enabled:true});
 assert.equal(active.points_policy.eligible,false);
 assert.deepEqual((await request(amateurPath)).room.amateur,active.amateur);
 assert.deepEqual((await request(amateurPath+'/join',{seat_token:amateurHost.seat_token})).room.amateur,active.amateur);
 active=(await toggle(amateurHost.seat_token,false)).room;
 assert.equal(active.amateur.enabled,false);
 assert.equal(active.points_policy.eligible,false);
 active=(await toggle(amateurHost.seat_token,true)).room;
 assert.equal(active.amateur.enabled,true);
 active=(await request(amateurPath+'/resign',{seat_token:amateurGuest.seat_token})).room;
 assert.deepEqual(active.amateur,{available:false,enabled:false});
 active=(await request(amateurPath+'/rematch',{seat_token:amateurHost.seat_token,game_number:active.game_number})).room;
 assert.equal(active.game_number,2);
 assert.deepEqual(active.amateur,{available:true,enabled:false});
 await toggle(amateurHost.seat_token,true,409,{game_number:1});
 console.log('Isolated Redis Amateur Mode HTTP checks passed.');
}finally{child.kill();}
