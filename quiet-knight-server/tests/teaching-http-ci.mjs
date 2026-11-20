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
}finally{child.kill();}
