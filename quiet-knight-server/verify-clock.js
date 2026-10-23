import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {resetClock as resetUntimedClock,timed,deadline,remaining,moveClock,stopClock,flagClock,hasMatingMaterial,validTimeout} from './clock.js';
import {resetTimedClock as resetClock} from './tests/clock-fixture.js';
import {gameRecord,terminal} from './identity.js';
import {movePushPlan,nudgePlan} from './push-notifications.js';

const room=()=>({code:'CLOCKA',game_number:1,version:1,status:'waiting',turn:'w',winner:null,moves:[],fen:new Chess().fen(),created_at:1000});
const untimed=room();resetUntimedClock(untimed);assert.equal(timed(untimed),false);assert.equal(untimed.time_control,undefined);assert.equal(deadline(untimed),null);
untimed.status='active';const before=structuredClone(untimed);moveClock(untimed,10000000);stopClock(untimed,10000000);assert.equal(flagClock(untimed,10000000),false);assert.deepEqual(untimed,before);
untimed.status='resigned';untimed.winner='w';assert.ok(gameRecord(untimed).pgn.includes('[TimeControl "-"]'));
const rematch=room();rematch.status='active';resetClock(rematch,1000);rematch.clock_paused=true;rematch.pause_id='old-pause';resetUntimedClock(rematch);assert.equal(timed(rematch),false);assert.equal(deadline(rematch),null);assert.equal(rematch.clock_paused,false);assert.equal(rematch.pause_id,null);
for(const key of ['time_control','white_time_ms','black_time_ms','clock_running_color','turn_started_at','flagged_color'])assert.equal(Object.hasOwn(rematch,key),false);
const waiting=room();resetClock(waiting,1000);assert.equal(deadline(waiting),null);assert.equal(remaining(waiting,'w',999999),600000);
waiting.status='active';resetClock(waiting,1000);assert.equal(deadline(waiting),601000);
assert.equal(remaining(waiting,'w',3000),598000);assert.equal(remaining(waiting,'b',3000),600000);
waiting.turn='b';moveClock(waiting,3000);assert.equal(waiting.white_time_ms,598000);assert.equal(deadline(waiting),603000);
assert.equal(flagClock(waiting,602999),false);assert.equal(flagClock(waiting,603000),true);
assert.equal(waiting.status,'timeout');assert.equal(waiting.winner,'w');assert.equal(waiting.black_time_ms,0);assert.equal(deadline(waiting),null);assert.equal(validTimeout(waiting),true);
assert.equal(flagClock(waiting,999999),false);assert.equal(movePushPlan(waiting,'w'),null);assert.throws(()=>nudgePlan(waiting,'w','00000000-0000-0000-0000-000000000000'));
const frozen=structuredClone(waiting);stopClock(waiting,999999);assert.deepEqual(waiting,frozen);
waiting.status='active';waiting.turn='w';resetClock(waiting,700000);assert.equal(waiting.white_time_ms,600000);assert.equal(waiting.black_time_ms,600000);assert.equal(waiting.flagged_color,null);assert.equal(deadline(waiting),1300000);
const legacy=room();legacy.status='active';assert.equal(flagClock(legacy,9999999),false);moveClock(legacy,99);assert.equal(legacy.time_control,undefined);
const samples=[
 ['8/8/8/8/8/8/4k3/7K w - - 0 1',false,'bare king'],
 ['8/8/8/8/8/8/4k3/5B1K w - - 0 1',false,'bishop vs bare king'],
 ['8/8/8/8/8/8/4k3/5N1K w - - 0 1',false,'knight vs bare king'],
 ['8/8/8/8/8/8/4k3/5R1K w - - 0 1',true,'rook'],
 ['8/8/8/8/8/8/4k3/4NN1K w - - 0 1',true,'two knights cooperative mate'],
 ['8/8/8/8/8/8/4k3/4BN1K w - - 0 1',true,'bishop and knight'],
 ['8/8/8/8/8/8/3nk3/5N1K w - - 0 1',true,'opponent knight can block'],
 ['8/8/8/8/8/8/3qk3/5N1K w - - 0 1',false,'knight vs queen'],
 ['8/8/8/8/8/8/3bk3/5B1K w - - 0 1',true,'opposite-color bishops'],
 ['8/8/8/8/8/8/2b1k3/5B1K w - - 0 1',false,'same-color bishops'],
 ['8/8/8/8/8/8/2r1k3/5B1K w - - 0 1',false,'bishop vs rook'],
 ['8/8/8/8/8/8/2p1k3/5B1K w - - 0 1',true,'opponent pawn can promote/block'],
];
for(const [fen,expected,label] of samples)assert.equal(hasMatingMaterial(fen,'w'),expected,label);
const timeout=room();timeout.status='active';resetClock(timeout,1000);assert.equal(flagClock(timeout,601000),true);assert.equal(terminal(timeout),true);assert.equal(gameRecord(timeout).result,'0-1');assert.ok(gameRecord(timeout).pgn.includes('[Result "0-1"]'));
assert.ok(gameRecord(timeout).pgn.includes('[TimeControl "600+0"]'));
assert.throws(()=>gameRecord({...timeout,winner:'w'}));assert.throws(()=>gameRecord({...timeout,white_time_ms:1}));
const drawn={...room(),status:'active',fen:samples[0][0]};resetClock(drawn,1000);flagClock(drawn,601000);assert.equal(drawn.status,'timeout_draw');assert.equal(drawn.winner,null);assert.equal(validTimeout(drawn),true);
console.log(JSON.stringify({event:'clock.unit',passed:true,checks:['new games/rematches untimed','legacy 10+0 start/stop','exact flag boundary','no increment','untimed/10+0 PGN','12 mating-material cases','timeout record validation','terminal push/nudge suppression']}));
