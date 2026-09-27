export const FIXED_DT = 1 / 120;
export const BALL_MIN_X_RATIO = 0.28;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function createGame({ width, height, mode = 'cpu', targetScore = 7, difficulty = 'normal', humanSide = 'left', seed = 0x51a7 } = {}) {
  const h = height || 400, w = width || 800;
  const game = {
    width: w, height: h, mode, targetScore, difficulty, humanSide,
    phase: 'playing', paused: false, countdown: 0, serveTimer: 0, matchOver: false,
    score: [0, 0], rally: 0, longestRally: 0, totalHits: 0,
    ball: { x:w/2, y:h/2, vx:0, vy:0, r:Math.max(5,h*.014), speed:0 },
    paddles: [makePaddle(0,w,h), makePaddle(1,w,h)],
    ai: { think:0, target:h/2, rng: seed >>> 0, misses:0 },
    serveToward: 1, lastScorer: -1, shake:0, flash:0,
  };
  launchServe(game, humanSide==='right'&&mode==='practice'?-1:1);
  game.serveTimer = 0.35;
  return game;
}
function makePaddle(side,w,h){const edge=Math.max(25,h*.075);return {y:h/2,prevY:h/2,targetY:h/2,vy:0,h:Math.max(46,h*.225),w:Math.max(8,h*.022),x:side===0?edge:w-edge,side,flash:0};}

export function launchServe(g, direction = g.serveToward) {
  const {ball:b,width:w,height:h}=g;
  b.x=w/2;b.y=h/2;
  const seed=g.ai.rng=(1664525*g.ai.rng+1013904223)>>>0;
  const angle=((seed/4294967296)-.5)*.44;
  b.speed=h*1.06;
  b.vx=Math.cos(angle)*b.speed*(direction<0?-1:1);
  b.vy=Math.sin(angle)*b.speed;
  g.phase='playing';g.serveTimer=0;g.rally=0;
  return g;
}

export function setPaddleTarget(g,index,y){
  const p=g.paddles[index]; if(!p)return;
  p.targetY=clamp(y,p.h/2,g.height-p.h/2);
}

export function pauseGame(g){if(g.matchOver)return;g.paused=true;g.countdown=0;}
export function resumeGame(g){if(!g.paused)return;g.paused=false;g.countdown=1.5;}

function effectiveMaxSpeed(g){ return g.height*1.75; }
function movePaddle(g,p,dt,speedLimit){
  p.prevY=p.y;
  const maxStep=speedLimit*dt;
  const delta=clamp(p.targetY-p.y,-maxStep,maxStep);
  p.y=clamp(p.y+delta,p.h/2,g.height-p.h/2);
  p.vy=dt>0?(p.y-p.prevY)/dt:0;
}
function aiConfig(level){
  if(level==='easy')return {speed:.96,delay:.26,error:.145,miss:.19};
  if(level==='hard')return {speed:1.72,delay:.065,error:.018,miss:0};
  return {speed:1.36,delay:.13,error:.055,miss:.035};
}
function random(g){g.ai.rng=(1664525*g.ai.rng+1013904223)>>>0;return g.ai.rng/4294967296;}
function reflectedY(y,h){const span=h;let v=((y% (2*span))+(2*span))%(2*span);return v>span?2*span-v:v;}
export function predictIntercept(g){
  const b=g.ball, aiIndex=g.humanSide==='right'?0:1, p=g.paddles[aiIndex], x=p.x;
  if((aiIndex===1&&b.vx<=0)||(aiIndex===0&&b.vx>=0))return g.height/2;
  const t=(x-b.x)/b.vx;
  if(t<=0)return b.y;
  return reflectedY(b.y+b.vy*t,g.height);
}
function updateAI(g,dt){
  const p=g.paddles[1], cfg=aiConfig(g.difficulty);
  g.ai.think-=dt;
  if(g.ai.think<=0){
    g.ai.think=cfg.delay;
    let target=g.height/2;
    const aiIndex=g.humanSide==='right'?0:1;
    if((aiIndex===1&&g.ball.vx>0)||(aiIndex===0&&g.ball.vx<0))target=predictIntercept(g);
    target+=(random(g)-.5)*2*g.height*cfg.error;
    if(random(g)<cfg.miss){target+=(random(g)<.5?-1:1)*g.height*.55;g.ai.misses++;}
    g.ai.target=clamp(target,p.h/2,g.height-p.h/2);
  }
  p.targetY=g.ai.target;
  movePaddle(g,p,dt,effectiveMaxSpeed(g)*1.55);
}

function sweepPaddle(g,p,fromX,fromY,toX,toY,dt){
  const b=g.ball, r=b.r, left=p.x-p.w/2-r, right=p.x+p.w/2+r;
  let t;
  if(b.vx<0){if(fromX<right||toX>right||toX===fromX)return false;t=(right-fromX)/(toX-fromX);}
  else {if(fromX>left||toX<left||toX===fromX)return false;t=(left-fromX)/(toX-fromX);}
  if(t<0||t>1)return false;
  const by=fromY+(toY-fromY)*t;
  const py=p.prevY+(p.y-p.prevY)*t;
  if(Math.abs(by-py)>p.h/2+r)return false;
  b.x=b.vx<0?right:left;b.y=by;
  const offset=clamp((by-py)/(p.h/2),-1,1);
  const paddleMotion=clamp(p.vy/effectiveMaxSpeed(g),-1,1);
  const angle=offset*1.05+paddleMotion*.27;
  const pre=b.speed;
  const hitIndex=++g.totalHits;
  b.speed=Math.min(g.height*2.22,Math.max(g.height*1.06,b.speed+g.height*.028));
  b.vx=Math.cos(angle)*b.speed*(p.side===0?1:-1);
  if(Math.abs(b.vx)<b.speed*BALL_MIN_X_RATIO)b.vx=Math.sign(b.vx||1)*b.speed*BALL_MIN_X_RATIO;
  b.vy=Math.sin(angle)*b.speed;
  // Small paddle-motion English, bounded so the return remains predictable.
  b.vy=clamp(b.vy+paddleMotion*g.height*.17,-b.speed*.88,b.speed*.88);
  const magnitude=Math.hypot(b.vx,b.vy);b.vx=b.vx/magnitude*b.speed;b.vy=b.vy/magnitude*b.speed;
  g.rally++;g.longestRally=Math.max(g.longestRally,g.rally);
  p.flash=.12;g.flash=.11;g.shake=pre>g.height*1.8?Math.min(3,pre/g.height):0;
  return {offset,paddleMotion,power:Math.abs(offset)>.77&&Math.abs(paddleMotion)>.3,speed:b.speed};
}

export function stepGame(g,dt=FIXED_DT,inputs={}){
  if(!g||g.matchOver||g.paused)return {type:'none'};
  if(g.countdown>0){g.countdown=Math.max(0,g.countdown-dt);return {type:'countdown',value:Math.ceil(g.countdown)};}
  if(g.serveTimer>0){g.serveTimer=Math.max(0,g.serveTimer-dt);return {type:'none'};}
  if(inputs.targets){for(const [i,y] of inputs.targets)setPaddleTarget(g,i,y);}
  if(g.mode==='cpu')updateAI(g,dt);
  else if(g.mode==='local'){movePaddle(g,g.paddles[0],dt,effectiveMaxSpeed(g)*1.55);movePaddle(g,g.paddles[1],dt,effectiveMaxSpeed(g)*1.55);}
  else if(g.mode==='practice'){const humanIndex=g.humanSide==='right'?1:0;movePaddle(g,g.paddles[humanIndex],dt,effectiveMaxSpeed(g)*1.55);}
  if(g.mode==='cpu'){const humanIndex=g.humanSide==='right'?1:0;movePaddle(g,g.paddles[humanIndex],dt,effectiveMaxSpeed(g)*1.55);}
  if(g.mode==='practice'){
    const humanIndex=g.humanSide==='right'?1:0,p=g.paddles[humanIndex];
    const ox=g.ball.x,oy=g.ball.y,nx=ox+g.ball.vx*dt,ny=oy+g.ball.vy*dt;
    if(g.ball.vy<0&&ny-g.ball.r<0){g.ball.y=g.ball.r;g.ball.vy=Math.abs(g.ball.vy);return {type:'wall'};}
    if(g.ball.vy>0&&ny+g.ball.r>g.height){g.ball.y=g.height-g.ball.r;g.ball.vy=-Math.abs(g.ball.vy);return {type:'wall'};}
    if((humanIndex===0&&g.ball.vx<0)||(humanIndex===1&&g.ball.vx>0)){const hit=sweepPaddle(g,p,ox,oy,nx,ny,dt);if(hit)return {type:'paddle',...hit,side:humanIndex};}
    if(humanIndex===0&&nx+g.ball.r>=g.width){g.ball.x=g.width-g.ball.r;g.ball.vx=-Math.abs(g.ball.vx);g.rally++;g.longestRally=Math.max(g.longestRally,g.rally);return {type:'wall'};}
    if(humanIndex===1&&nx-g.ball.r<=0){g.ball.x=g.ball.r;g.ball.vx=Math.abs(g.ball.vx);g.rally++;g.longestRally=Math.max(g.longestRally,g.rally);return {type:'wall'};}
    g.ball.x=nx;g.ball.y=ny;return {type:'none'};
  }
  const b=g.ball,ox=b.x,oy=b.y,nx=ox+b.vx*dt,ny=oy+b.vy*dt;
  if(b.vy<0&&ny-b.r<0){b.y=b.r;b.vy=Math.abs(b.vy);return {type:'wall'};}
  if(b.vy>0&&ny+b.r>g.height){b.y=g.height-b.r;b.vy=-Math.abs(b.vy);return {type:'wall'};}
  const candidates=[];
  if(b.vx<0)candidates.push(g.paddles[0]);else candidates.push(g.paddles[1]);
  for(const p of candidates){const hit=sweepPaddle(g,p,ox,oy,nx,ny,dt);if(hit)return {type:'paddle',...hit,side:p.side};}
  if(nx<-b.r){g.score[1]++;return pointScored(g,1);}
  if(nx>g.width+b.r){g.score[0]++;return pointScored(g,0);}
  b.x=nx;b.y=ny;return {type:'none'};
}
function pointScored(g,scorer){
  g.lastScorer=scorer;g.longestRally=Math.max(g.longestRally,g.rally);g.serveToward=1-scorer;
  if(g.score[scorer]>=g.targetScore){g.matchOver=true;g.phase='over';return {type:'match',scorer,score:[...g.score],rally:g.longestRally};}
  g.phase='serve';g.serveTimer=.62;g.ball.x=g.width/2;g.ball.y=g.height/2;g.ball.vx=0;g.ball.vy=0;g.ball.speed=0;g.rally=0;
  return {type:'score',scorer,score:[...g.score]};
}

export function resizeGame(g,width,height){
  const sx=width/g.width,sy=height/g.height;
  for(const p of g.paddles){p.y*=sy;p.prevY*=sy;p.targetY*=sy;p.h=Math.max(46,height*.225);p.w=Math.max(8,height*.022);p.x=p.side===0?Math.max(25,height*.075):width-Math.max(25,height*.075);}
  g.ball.x*=sx;g.ball.y*=sy;g.ball.vx*=sy;g.ball.vy*=sy;g.ball.r=Math.max(5,height*.014);g.width=width;g.height=height;
  g.ball.speed=Math.hypot(g.ball.vx,g.ball.vy);
}

export function snapshot(g){return {mode:g.mode,score:[...g.score],rally:g.rally,longestRally:g.longestRally,paused:g.paused,matchOver:g.matchOver,ball:{...g.ball},paddles:g.paddles.map(p=>({y:p.y,vy:p.vy,targetY:p.targetY}))};}
