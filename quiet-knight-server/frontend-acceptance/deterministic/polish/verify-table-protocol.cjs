const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
let harness=fs.readFileSync('points-check/reconnect.cjs','utf8').split("const before=harness")[0];
harness=harness.replace('const context={WebSocket:WS','const roles=[],presence=[];const context={idleDiagnostics:()=>({connection:\'Idle\'}),WebSocket:WS').replace('useRoomRealtime("ABC123",room=>updates.push(room));','useRoomRealtime("ABC123",room=>updates.push(room),{seatToken:"private-fixture",onRole:(role,n)=>roles.push([role,n]),onPresence:p=>presence.push(p)});').replace('Object.assign(context,{updates})','Object.assign(context,{updates,roles,presence})').replace('return{instances,events,','return{roles,presence,instances,events,');
new Function('require',harness+`
const h=harness('polish/src/use-room-realtime.ts'),s=h.instances[0];s.open();assert.ok(!s.url.includes('private-fixture'));assert.equal(s.sent[0].type,'presence.hello');assert.equal(s.sent[0].seat_token,'private-fixture');
const message=m=>s.onmessage({data:JSON.stringify(m)});message({type:'presence.update',white:true,black:false});assert.equal(h.presence.length,1);assert.equal(h.status().connection,'Syncing…');
message({type:'seat.role',role:'black',game_number:2,room_version:8});assert.equal(h.roles[0][0],'black');assert.equal(h.status().connection,'Syncing…');s.message(8);assert.equal(h.status().connection,'Live');
message({type:'seat.role',role:'white',game_number:1,room_version:7});assert.equal(h.roles.length,1);
const old=s.onmessage;h.hide();h.show();h.instances[1].open();assert.equal(h.instances[1].sent[0].type,'presence.hello');old({data:JSON.stringify({type:'seat.role',role:'white',game_number:1,room_version:99})});assert.equal(h.roles.length,1);h.cleanup();console.log('PASS: presence/role cannot establish Live; seat credential only in WS body; stale roles and retired sockets rejected; foreground re-identifies same seat.');
`)(require);
