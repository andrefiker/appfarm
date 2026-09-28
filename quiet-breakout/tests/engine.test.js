import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH, MAX_SPEED, MIN_H_SPEED, createRun, createStage, makeBall, movePaddle, paddleBounce, resolveBallStep, tick, launch, pause, resume, attachBall } from '../web/engine.js';

test('30 stages are deterministic and have original playable layouts', () => {
  const signatures = new Set();
  for (let stage=1; stage<=30; stage++) {
    const a=createStage(stage), b=createStage(stage);
    assert.deepEqual(a,b);
    assert.ok(a.bricks.length>=12 && a.bricks.length<=65, `stage ${stage} brick count`);
    assert.ok(a.bricks.every(brick=>brick.x>=0 && brick.x+brick.w<=WIDTH && brick.hp>=1));
    assert.ok(a.speed<=MAX_SPEED);
    signatures.add(a.bricks.map(brick=>`${brick.x}:${brick.y}`).join('|'));
  }
  assert.equal(signatures.size,30,'every handcrafted stage has a distinct board');
});

test('wall reflection is stable at edges', () => {
  const run=createRun('classic',820); run.bricks=[];
  const ball={x:10,y:220,vx:-360,vy:0,r:6,trail:[]};
  const events=resolveBallStep(ball,run,0.04);
  assert.ok(events.includes('wall')); assert.ok(ball.vx>0); assert.ok(ball.x>=12);
  const right={x:WIDTH-10,y:220,vx:360,vy:0,r:6,trail:[]};
  resolveBallStep(right,run,0.04); assert.ok(right.vx<0); assert.ok(right.x<=WIDTH-12);
});

test('paddle return angle follows impact position and respects horizontal floor', () => {
  const paddle={x:210,y:700,w:82,h:12,previousX:210};
  const center={x:210,y:688,vx:0,vy:330,r:6}; paddleBounce(center,paddle);
  const edge={x:247,y:688,vx:0,vy:330,r:6}; paddleBounce(edge,paddle);
  assert.ok(Math.abs(edge.vx)>Math.abs(center.vx));
  assert.ok(center.vy<0 && edge.vy<0);
  assert.ok(Math.abs(center.vx)>=MIN_H_SPEED);
});

test('paddle motion adds only a bounded angle nudge', () => {
  const ball={x:200,y:688,vx:0,vy:330,r:6};
  const out=paddleBounce(ball,{x:210,y:700,w:82,h:12,previousX:0});
  assert.ok(Math.abs(ball.vx)<=MAX_SPEED);
  assert.ok(Math.abs(ball.vx)>=MIN_H_SPEED);
  assert.ok(out.speed<=MAX_SPEED);
});

test('high speed stays capped and substeps prevent brick tunneling', () => {
  const run=createRun('classic',820);
  run.bricks=[{x:180,y:200,w:42,h:17,hp:1,maxHp:1,kind:'normal',alive:true}];
  const ball={x:201,y:160,vx:0,vy:560,r:6,trail:[]};
  const events=resolveBallStep(ball,run,0.12);
  assert.ok(events.includes('brick'));
  assert.equal(run.bricks[0].alive,false);
  const fast=makeBall(210,200,900);
  assert.ok(Math.hypot(fast.vx,fast.vy)<=MAX_SPEED);
});

test('tough brick damage takes two collisions and scoring updates', () => {
  const run=createRun('classic',820); run.bricks=[{x:189,y:200,w:42,h:17,hp:2,maxHp:2,kind:'tough',alive:true}];
  const ball={x:210,y:190,vx:0,vy:300,r:6,trail:[]};
  const first=resolveBallStep(ball,run,0.025);
  assert.ok(first.includes('toughHit')); assert.equal(run.bricks[0].hp,1); assert.ok(run.score>0);
  ball.x=210;ball.y=190;ball.vx=0;ball.vy=300;
  const second=resolveBallStep(ball,run,0.025);
  assert.ok(second.includes('toughBreak')); assert.equal(run.bricks[0].alive,false);
});

test('life loss resets quickly and game over follows the third lost ball', () => {
  const run=createRun('classic',820); run.bricks=[{x:100,y:120,w:42,h:17,hp:1,maxHp:1,kind:'normal',alive:true}];attachBall(run);launch(run);
  run.balls[0].y=830;run.balls[0].vy=350;
  tick(run,0.01); assert.equal(run.lives,2); assert.equal(run.phase,'ready'); assert.equal(run.balls.length,1);
  for(let i=0;i<2;i++){launch(run);run.balls[0].y=830;run.balls[0].vy=350;tick(run,0.01);}
  assert.equal(run.lives,0);assert.equal(run.phase,'gameover');assert.equal(run.balls.length,0);
});

test('stage clear awards score and advances after a short transition', () => {
  const run=createRun('classic',820);run.bricks=[];attachBall(run);launch(run);
  const score=run.score;tick(run,0.016);assert.equal(run.phase,'stageclear');assert.ok(run.score>score);
  for(let i=0;i<24;i++) tick(run,0.05);assert.equal(run.stage,1);
  for(let i=0;i<4;i++) tick(run,0.05);assert.equal(run.stage,2);assert.equal(run.phase,'ready');assert.ok(run.bricks.length>0);
});

test('pause freezes simulation and resume restores play state', () => {
  const run=createRun('classic',820);attachBall(run);launch(run);pause(run);
  const x=run.balls[0].x,y=run.balls[0].y;
  tick(run,0.04);assert.equal(run.balls[0].x,x);assert.equal(run.balls[0].y,y);
  resume(run);assert.equal(run.phase,'running');
});

test('paddle is clamped to both playfield edges', () => {
  const run=createRun();movePaddle(run,-500);assert.ok(run.paddle.x>=run.paddle.w/2);
  movePaddle(run,1000);assert.ok(run.paddle.x<=WIDTH-run.paddle.w/2);
});
