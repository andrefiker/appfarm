const assert=require('node:assert/strict');
const {test}=require('node:test');
const P=require('../web/physics.js');
const hole={x:0,y:0,r:30,mu:2500000};
test('gravitational acceleration points toward well and obeys left/right symmetry',()=>{
 const a=P.acceleration(100,0,hole),b=P.acceleration(-100,0,hole);
 assert(a.x<0);assert.equal(a.y,0);assert.equal(a.x,-b.x);
});
test('softening prevents singularities and NaN at event horizon',()=>{
 for(const xy of [[0,0],[.1,.1],[100,100]]){
  const a=P.acceleration(xy[0],xy[1],hole);
  assert(Number.isFinite(a.x));assert(Number.isFinite(a.y));
 }
});
test('velocity Verlet accelerates probe toward gravity source',()=>{
 const p={x:140,y:0,vx:0,vy:110}; P.step(p,hole,.01);
 assert(p.vx<0);assert(p.y>0);
});
test('stable near-circular orbits do not quickly spiral or explode',()=>{
 const radius=120, speed=Math.sqrt(hole.mu/radius);
 const p={x:radius,y:0,vx:0,vy:speed};
 for(let i=0;i<9000;i++)P.step(p,hole,1/180);
 assert(Math.abs(Math.hypot(p.x,p.y)-radius)<3,`Orbit drifted to ${Math.hypot(p.x,p.y)}`);
});
test('zero and invalid dt leave bodies untouched',()=>{
 const p={x:100,y:10,vx:0,vy:1};P.step(p,hole,0);P.step(p,hole,1);assert.deepEqual(p,{x:100,y:10,vx:0,vy:1});
});
test('aiming is normalized and bounded',()=>{
 assert.equal(P.heading({x:0,y:0},{x:0,y:0}).vy,-440);
 const v=P.heading({x:0,y:0},{x:10000,y:0});assert.equal(v.speed,850);assert.equal(v.vx,850);
});
test('prediction returns finite points and terminates before capture',()=>{
 const pts=P.trajectory({x:0,y:300},{x:5,y:-200},hole,1,200);
 assert(pts.length>0);
 for(const p of pts){assert(Number.isFinite(p.x)&&Number.isFinite(p.y));assert(Math.hypot(p.x,p.y)>=hole.r*.83);}
});
test('shard collision boundary is inclusive',()=>{
 assert(P.collect({x:0,y:0},{x:17,y:0},17));
 assert(!P.collect({x:0,y:0},{x:17.01,y:0},17));
});
