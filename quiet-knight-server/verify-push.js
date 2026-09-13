import assert from 'node:assert/strict';
import {moveEventId,movePushPlan,nudgePlan,PushService} from './push-notifications.js';

const room={code:'PUSHAA',game_number:2,version:7,status:'active',turn:'b',moves:[{san:'e4'}],white_token:'white-secret',black_token:'black-secret',white_player:{id:'00000000-0000-0000-0000-000000000001',handle:'Andre'},black_player:{id:'00000000-0000-0000-0000-000000000002',handle:'Paloma'}};
const move=movePushPlan(room,'w');
assert.equal(move.eventId,moveEventId(room));
assert.equal(move.targetColor,'b');
assert.equal(move.body,'Andre moved. Your turn.');
assert.equal(movePushPlan({...room,white_player:null},'w').body,'Your opponent moved. Your turn.');
assert.equal(movePushPlan({...room,status:'checkmate'},'w'),null);
assert.equal(movePushPlan({...room,turn:'w'},'w'),null);
assert.equal(nudgePlan(room,'w','11111111-1111-4111-8111-111111111111').body,'Andre is waiting for your move.');
assert.throws(()=>nudgePlan(room,'b','11111111-1111-4111-8111-111111111111'),error=>error.status===409);
assert.throws(()=>nudgePlan({...room,black_token:null},'w','11111111-1111-4111-8111-111111111111'),error=>error.status===409);

const events=new Set(),updates=[];let deliveries=0;
const pool={query:async(sql,args=[])=>{
  if(sql.startsWith('INSERT INTO qk_push_subscriptions'))return{rows:[{id:'sub-1',created_at:new Date(),updated_at:new Date()}],rowCount:1};
  if(sql.startsWith('INSERT INTO qk_push_events')){if(events.has(args[0]))return{rows:[],rowCount:0};events.add(args[0]);return{rows:[{event_id:args[0]}],rowCount:1};}
  if(sql.startsWith('SELECT count(*)'))return{rows:[{count:1}],rowCount:1};
  if(sql.startsWith('SELECT id,endpoint'))return{rows:[{id:'sub-1',endpoint:'https://push.example/sub',p256dh:'A'.repeat(65),auth:'B'.repeat(22)}],rowCount:1};
  if(sql.startsWith('UPDATE qk_push_subscriptions')){updates.push({sql,args});return{rows:[],rowCount:1};}
  if(sql.startsWith('SELECT 1 FROM qk_push_events'))return{rows:events.has(args[0])?[{exists:1}]:[],rowCount:events.has(args[0])?1:0};
  throw new Error('Unexpected SQL in push test');
}};
const transport={setVapidDetails:()=>{},sendNotification:async(subscription,payload)=>{deliveries++;assert.equal(subscription.endpoint,'https://push.example/sub');assert.equal(JSON.parse(payload).roomCode,'PUSHAA');}};
const service=new PushService({pool,publicKey:'public-test',privateKey:'private-test',transport});
await service.subscribe(room,'black-secret',{endpoint:'https://push.example/sub',keys:{p256dh:'A'.repeat(65),auth:'B'.repeat(22)}});
assert.equal(await service.subscriptionCount(room,'b'),1);
const accepted=await service.deliver(room,move,'move');
assert.deepEqual({status:accepted.status,subscriptions:accepted.subscriptions,sent:accepted.sent},{status:'sent',subscriptions:1,sent:1});
assert.equal((await service.deliver(room,move,'move')).status,'duplicate');
assert.equal(deliveries,1);
assert.ok(await service.hasEvent(move.eventId));
assert.ok(updates.some(item=>item.sql.includes('last_success_at')));
await assert.rejects(service.subscribe(room,'wrong',{endpoint:'https://push.example/sub',keys:{p256dh:'A'.repeat(65),auth:'B'.repeat(22)}}),error=>error.status===403);
await assert.rejects(service.subscribe(room,'black-secret',{endpoint:'http://push.example/sub',keys:{p256dh:'A'.repeat(65),auth:'B'.repeat(22)}}),error=>error.status===400);
const expiredPlan={...move,eventId:'move:PUSHAA:2:8:2'};
const expired=new PushService({pool,publicKey:'public-test',privateKey:'private-test',transport:{setVapidDetails:()=>{},sendNotification:async()=>{const error=new Error('gone');error.statusCode=410;throw error;}}});
const expiredResult=await expired.deliver({...room,version:8,moves:[...room.moves,{san:'e5'}]},expiredPlan,'move');
assert.deepEqual({status:expiredResult.status,subscriptions:expiredResult.subscriptions,sent:expiredResult.sent},{status:'failed',subscriptions:1,sent:0});
assert.ok(updates.some(item=>item.sql.includes('disabled_at')));

const noSubscriptions=new PushService({pool:{query:async(sql,args=[])=>{
  if(sql.startsWith('INSERT INTO qk_push_events'))return{rows:[{event_id:args[0]}],rowCount:1};
  if(sql.startsWith('SELECT id,endpoint'))return{rows:[],rowCount:0};
  throw new Error('Unexpected SQL in empty-subscription test');
}},publicKey:'public-test',privateKey:'private-test',transport:{setVapidDetails:()=>{},sendNotification:async()=>{throw new Error('must not send');}}});
const unavailable=await noSubscriptions.deliver({...room,version:9}, {...move,eventId:'nudge:PUSHAA:2:22222222-2222-4222-8222-222222222222'},'nudge');
assert.deepEqual({status:unavailable.status,subscriptions:unavailable.subscriptions,sent:unavailable.sent},{status:'no-subscription',subscriptions:0,sent:0});

console.log(JSON.stringify({event:'push.acceptance',passed:true,checks:['authoritative active-move plan','terminal suppression','correct opponent','handle and guest copy','nudge authority','subscription seat ownership','HTTPS endpoint validation','deterministic event dedupe','accepted push evidence','no-subscription capability result','permanent subscription cleanup']}));
