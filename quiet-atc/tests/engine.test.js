const assert=require('node:assert/strict');
const E=require('../web/engine.js');

assert.equal(E.normHeading(-10),350);
assert.equal(E.normHeading(370),10);
assert.equal(E.signedHeadingDelta(350,10),20);
assert.equal(E.stepHeading(350,10,5),355);
assert.ok(E.RUNWAY.captureRadius>=0.14);
assert.ok(E.HELIPAD.captureRadius>=0.14);

const trimmed=E.trimRouteStart([{x:.36,y:.4},{x:.42,y:.4},{x:.60,y:.4}],{x:.40,y:.4});
assert.equal(trimmed.length,1);
assert.equal(trimmed[0].x,.60);

const pts=E.simplifyPoints([{x:.1,y:.1},{x:.101,y:.101},{x:.3,y:.3}]);
assert.equal(pts.length,2);

let r=E.resolveRoute('plane',[{x:.4,y:.2},{x:E.RUNWAY.leftGate.x,y:E.RUNWAY.leftGate.y}]);
assert.equal(r.landing,true);assert.equal(r.destination,'runway-east');assert.ok(r.route.length>=5);

r=E.resolveRoute('plane',[{x:.8,y:.2},{x:E.RUNWAY.rightGate.x,y:E.RUNWAY.rightGate.y}]);
assert.equal(r.landing,true);assert.equal(r.destination,'runway-west');

r=E.resolveRoute('heli',[{x:.7,y:.6},{x:E.HELIPAD.x,y:E.HELIPAD.y}]);
assert.equal(r.landing,true);assert.equal(r.destination,'helipad');

r=E.resolveRoute('heli',[{x:.2,y:.2},{x:.4,y:.4}]);
assert.equal(r.landing,false);

const a=E.createAircraft({id:1,callsign:'A1',type:'plane',x:.4,y:.4,heading:90,speed:.05});
const b=E.createAircraft({id:2,callsign:'B2',type:'plane',x:.45,y:.4,heading:270,speed:.05});
assert.equal(E.classifyConflict(a,b),'warning');
b.x=.415;assert.equal(E.classifyConflict(a,b),'collision');
b.x=.7;assert.equal(E.classifyConflict(a,b),'clear');

const g=E.makeGame(123);
g.aircraft=[a];
assert.equal(E.assignPath(g,1,[{x:.5,y:.4},{x:E.RUNWAY.rightGate.x,y:E.RUNWAY.y}]),true);
assert.equal(a.landing,true);
assert.equal(a.selected,true);

const movingAssign=E.createAircraft({id:9,callsign:'F9',type:'plane',x:.40,y:.40,heading:90,speed:.05});
const movingGame=E.makeGame(9);movingGame.aircraft=[movingAssign];
E.assignPath(movingGame,9,[{x:.36,y:.40},{x:.42,y:.40},{x:.60,y:.40}]);
assert.ok(E.distance(movingAssign,movingAssign.route[0])>0.15);

const m=E.createAircraft({id:3,callsign:'M3',type:'plane',x:.2,y:.2,heading:90,speed:.05});
m.route=[{x:.5,y:.2}];
E.moveAircraft(m,1);
assert.ok(m.x>.2);
assert.ok(Math.abs(m.y-.2)<.03);

const turn=E.createAircraft({id:8,callsign:'T8',type:'plane',x:.2,y:.2,heading:0,speed:0});
turn.route=[{x:.7,y:.2}];
E.moveAircraft(turn,.25);
assert.ok(turn.heading>35);

assert.equal(E.trafficLevel(0,0),1);
assert.equal(E.trafficLevel(60,6),2);
assert.equal(E.trafficLevel(110,12),3);
assert.equal(E.trafficLevel(180,25),4);
assert.equal(E.trafficLevel(300,40),5);
assert.ok(E.spawnInterval(1)>E.spawnInterval(5));

const g1=E.makeGame(999);E.trySpawn(g1);
const snap=g1.aircraft.map(x=>({type:x.type,x:x.x,y:x.y,heading:x.heading,speed:x.speed}));
const g2=E.makeGame(999);E.trySpawn(g2);
assert.deepEqual(snap,g2.aircraft.map(x=>({type:x.type,x:x.x,y:x.y,heading:x.heading,speed:x.speed})));

const landingGame=E.makeGame(2);
const p=E.createAircraft({id:1,callsign:'OK1',type:'heli',x:E.HELIPAD.x,y:E.HELIPAD.y,heading:0,speed:0});
p.completed=true;landingGame.aircraft=[p];landingGame.spawnClock=999;
E.updateGame(landingGame,.01);
assert.equal(landingGame.landed,1);assert.ok(landingGame.score>=100);assert.equal(landingGame.aircraft.length,0);

const missGame=E.makeGame(3);missGame.spawnClock=999;
for(let n=0;n<3;n++){
  missGame.aircraft=[E.createAircraft({id:n+1,callsign:'M'+n,type:'plane',x:1.2,y:.5,heading:90,speed:0})];
  E.updateGame(missGame,.01);
}
assert.equal(missGame.gameOver,true);assert.equal(missGame.missed,3);

const col=E.makeGame(4);col.spawnClock=999;
col.aircraft=[
 E.createAircraft({id:1,callsign:'X1',type:'plane',x:.5,y:.5,heading:0,speed:0}),
 E.createAircraft({id:2,callsign:'Y2',type:'plane',x:.51,y:.5,heading:180,speed:0})
];
E.updateGame(col,.01);
assert.equal(col.gameOver,true);assert.match(col.lastEvent,/COLLISION/);

console.log('QUIET ATC v1.1.1 engine tests passed');