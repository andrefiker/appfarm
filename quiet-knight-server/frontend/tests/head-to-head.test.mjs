import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rivalForRoom, headToHeadPath, parseHeadToHead} from '../src/head-to-head-model.ts';

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