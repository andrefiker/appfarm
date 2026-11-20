import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rivalForRoom, headToHeadPath, parseHeadToHead, scoreboardRoomStatus, recentPairGames, readPinnedOpponent, writePinnedOpponent, hasStoredOpponentPin} from '../src/head-to-head-model.ts';

const alice={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',handle:'Alice'};
const bob={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',handle:'Bob'};
const carol={id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',handle:'Carol'};
const room=(white,black,waiting=false)=>({white_player:white,black_player:black,status:waiting?'waiting':'active',white_joined:true,black_joined:!waiting});

test('same rival and API orientation after switching rooms and colors',()=>{
  assert.deepEqual(rivalForRoom(room(alice,bob),'w',alice.id),bob);
  assert.deepEqual(rivalForRoom(room(bob,alice),'b',alice.id),bob);
  assert.equal(headToHeadPath(alice.id,bob.id),'/players/'+alice.id+'/head-to-head/'+bob.id);
  assert.equal(headToHeadPath(bob.id,alice.id),'/players/'+bob.id+'/head-to-head/'+alice.id);
});
test('known pair can be shown in a new empty room, not under a guest or spectator',()=>{
  assert.deepEqual(rivalForRoom(room(alice,null,true),'w',alice.id,bob),bob);
  assert.equal(rivalForRoom(room(alice,null),'w',alice.id,bob),null);
  assert.equal(rivalForRoom(room(null,bob),'w',alice.id,bob),null);
  assert.equal(rivalForRoom(room(alice,bob),null,alice.id,bob),null);
  assert.equal(rivalForRoom(room(alice,bob),'w',undefined,bob),null);
  assert.equal(rivalForRoom(room(alice,alice),'w',alice.id,bob),null);
  assert.deepEqual(rivalForRoom(room(alice,carol),'w',alice.id,bob),carol);
});
test('only a valid response can produce a count, including true zero',()=>{
  assert.deepEqual(parseHeadToHead({wins:0,draws:0,losses:0}),{wins:0,draws:0,losses:0});
  assert.deepEqual(parseHeadToHead({wins:5,draws:2,losses:7}),{wins:5,draws:2,losses:7});
  for(const v of [null,{}, {wins:1,draws:0}, {wins:1,draws:-1,losses:0},{wins:1,draws:0,losses:'7'}]) assert.equal(parseHeadToHead(v),null);
});
test('online scoreboard always explains why no account pair is available',()=>{
  assert.match(scoreboardRoomStatus(null,null),/Connecting/);
  assert.match(scoreboardRoomStatus(room(alice,bob),null),/Only players/);
  assert.match(scoreboardRoomStatus(room(null,bob),'w'),/Sign in.*new room/);
  assert.match(scoreboardRoomStatus(room(alice,null,true),'w'),/Waiting for opponent/);
  assert.match(scoreboardRoomStatus(room(alice,null),'w'),/Opponent must sign in/);
  assert.match(scoreboardRoomStatus(room(alice,alice),'w'),/different Knight IDs/);
});
test('recent history preserves opponent privacy and correctly orients both colors',()=>{
  const row=(id,w,b,result,ended_at,moves=[])=>({id,white_player_id:w,black_player_id:b,result,ended_at,moves});
  const got=recentPairGames([
    row('lost',alice.id,bob.id,'0-1','2026-11-01'),
    row('won',bob.id,alice.id,'0-1','2026-11-05',[{}, {}, {}]),
    row('draw',alice.id,bob.id,'1/2-1/2','2026-11-03'),
    row('unrelated',alice.id,carol.id,'1-0','2026-11-09'),
    row('guest',alice.id,null,'1-0','2026-11-08'),
    row('invalid',alice.id,bob.id,'*','2026-11-10'),
    row('won',alice.id,bob.id,'0-1','2026-11-11'),
  ],alice.id,bob.id);
  assert.deepEqual(got.map(x=>[x.id,x.outcome,x.moveCount]),[['won','Win',2],['draw','Draw',0],['lost','Loss',0]]);
  assert.deepEqual(recentPairGames([],alice.id,alice.id),[]);
});
test('explicit pin persists per verified viewer and can be removed',()=>{
  const storage=new Map();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{get length(){return storage.size;},key:i=>[...storage.keys()][i]??null,getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
  try {
    assert.equal(hasStoredOpponentPin(),false);
    assert.equal(writePinnedOpponent(alice.id,bob),true);
    assert.equal(hasStoredOpponentPin(),true);
    assert.deepEqual(readPinnedOpponent(alice.id),bob);
    assert.equal(readPinnedOpponent(bob.id),null);
    assert.equal(writePinnedOpponent(alice.id,alice),false);
    assert.equal(writePinnedOpponent(alice.id,null),true);
    assert.equal(readPinnedOpponent(alice.id),null);
    assert.equal(hasStoredOpponentPin(),false);
  } finally {delete globalThis.localStorage;}
});