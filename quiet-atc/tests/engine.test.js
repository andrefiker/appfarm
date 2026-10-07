const assert = require('node:assert/strict');
const E = require('../web/engine.js');

assert.equal(E.normHeading(-10),350);
assert.equal(E.normHeading(370),10);
assert.equal(E.signedHeadingDelta(350,10),20);
assert.equal(E.signedHeadingDelta(10,350),-20);
assert.equal(E.stepHeading(350,10,5),355);
assert.equal(E.stepHeading(10,350,5),5);

const a=E.createAircraft({id:1,callsign:'A',kind:'arrival',x:.5,y:.4,heading:180,altitude:3000,speed:.05});
const b=E.createAircraft({id:2,callsign:'B',kind:'overflight',x:.54,y:.4,heading:90,altitude:3500,speed:.05});
assert.equal(E.classifyConflict(a,b),'warning');
b.x=.51;b.altitude=3200;assert.equal(E.classifyConflict(a,b),'collision');
b.x=.7;assert.equal(E.classifyConflict(a,b),'clear');

const cap=E.createAircraft({id:3,callsign:'ILS1',kind:'arrival',x:.51,y:.5,heading:185,altitude:2800});
assert.equal(E.canCaptureApproach(cap),true);
assert.equal(E.clearApproach({aircraft:[cap]},3),true);
assert.equal(cap.approach,true);
assert.equal(cap.targetHeading,180);

const bad=E.createAircraft({id:4,callsign:'BAD',kind:'arrival',x:.8,y:.5,heading:180,altitude:2000});
assert.equal(E.canCaptureApproach(bad),false);

const land=E.createAircraft({id:5,callsign:'LAND',kind:'arrival',x:.5,y:.85,heading:181,altitude:700,approach:true});
assert.equal(E.isLanded(land),true);
land.altitude=1500;assert.equal(E.isLanded(land),false);

const dep=E.createAircraft({id:6,callsign:'DEP',kind:'departure',x:1.04,y:.4,heading:90,altitude:6000});
assert.equal(E.isSafeExit(dep),true);dep.altitude=3000;assert.equal(E.isSafeExit(dep),false);

const moving=E.createAircraft({id:7,callsign:'MOV',kind:'overflight',x:.5,y:.5,heading:0,targetHeading:90,altitude:5000,targetAltitude:7000,speed:.05});
E.moveAircraft(moving,1);assert.equal(moving.heading,16);assert.equal(moving.altitude,6350);assert.ok(moving.x>.5);assert.ok(moving.y<.5);

assert.equal(E.trafficLevel(0,0),1);assert.equal(E.trafficLevel(60,600),2);assert.equal(E.trafficLevel(120,1500),3);assert.equal(E.trafficLevel(220,3000),4);assert.equal(E.trafficLevel(400,6000),5);
assert.ok(E.spawnInterval(1)>E.spawnInterval(5));

const g=E.makeGame(1234);E.trySpawn(g);const snapshot=g.aircraft.map(x=>({kind:x.kind,x:x.x,y:x.y,heading:x.heading,altitude:x.altitude}));
const g2=E.makeGame(1234);E.trySpawn(g2);assert.deepEqual(snapshot,g2.aircraft.map(x=>({kind:x.kind,x:x.x,y:x.y,heading:x.heading,altitude:x.altitude})));

const scoreGame=E.makeGame(1);scoreGame.aircraft=[E.createAircraft({id:1,callsign:'OK',kind:'arrival',x:.5,y:.85,heading:180,targetHeading:180,altitude:700,targetAltitude:700,speed:0,approach:true})];scoreGame.spawnClock=999;E.updateGame(scoreGame,.01);assert.equal(scoreGame.landed,1);assert.ok(scoreGame.score>=250);assert.equal(scoreGame.aircraft.length,0);

const colGame=E.makeGame(2);colGame.spawnClock=999;colGame.aircraft=[E.createAircraft({id:1,callsign:'X',kind:'overflight',x:.4,y:.4,heading:0,altitude:5000,speed:0}),E.createAircraft({id:2,callsign:'Y',kind:'overflight',x:.405,y:.4,heading:0,altitude:5200,speed:0})];E.updateGame(colGame,.01);assert.equal(colGame.gameOver,true);assert.match(colGame.lastEvent,/COLLISION/);

console.log('QUIET ATC engine tests: 28 assertions passed');
