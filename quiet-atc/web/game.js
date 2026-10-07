(function(){
'use strict';

const E=window.QuietATCEngine;
const $=id=>document.getElementById(id);
const canvas=$('field');
const ctx=canvas.getContext('2d',{alpha:false});
let mapCanvas=document.createElement('canvas');
let mapCtx=mapCanvas.getContext('2d',{alpha:false});
let mapW=0,mapH=0,mapD=1;
let game=E.makeGame(Date.now());
let running=false,paused=false,timeScale=1,last=performance.now(),draft=null,audio=null,hadWarning=false;
let stats=loadStats();

function loadStats(){
  try{return Object.assign({best:0,landed:0,shifts:0},JSON.parse(localStorage.getItem('quietAtcAirfieldStats')||'{}'))}
  catch{return{best:0,landed:0,shifts:0}}
}
function saveStats(){try{localStorage.setItem('quietAtcAirfieldStats',JSON.stringify(stats))}catch{}}
function beep(freq=650,dur=.05,vol=.035){
  try{
    audio=audio||new(window.AudioContext||window.webkitAudioContext)();
    const o=audio.createOscillator(),g=audio.createGain();
    o.frequency.value=freq;o.type='sine';g.gain.value=vol;o.connect(g);g.connect(audio.destination);
    o.start();g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.stop(audio.currentTime+dur);
  }catch{}
}
function buzz(ms=12){try{navigator.vibrate&&navigator.vibrate(ms)}catch{}}

function resize(){
  const r=canvas.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1);
  const w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));
  if(canvas.width!==w||canvas.height!==h){
    canvas.width=w;canvas.height=h;
    renderStaticMap(r.width,r.height,d);
  }
  ctx.setTransform(d,0,0,d,0,0);
}

function renderStaticMap(w,h,d){
  mapW=w;mapH=h;mapD=d;
  mapCanvas.width=Math.max(1,Math.round(w*d));
  mapCanvas.height=Math.max(1,Math.round(h*d));
  const c=mapCtx;
  c.setTransform(d,0,0,d,0,0);

  const grass=c.createLinearGradient(0,0,w,h);
  grass.addColorStop(0,'#9fbd54');grass.addColorStop(.48,'#82aa43');grass.addColorStop(1,'#688f38');
  c.fillStyle=grass;c.fillRect(0,0,w,h);

  const rnd=E.seeded(77123);
  for(let i=0;i<42;i++){
    const x=rnd()*w,y=rnd()*h,rx=35+rnd()*90,ry=18+rnd()*55;
    c.fillStyle=i%3===0?'rgba(57,111,45,.10)':'rgba(220,221,113,.08)';
    c.beginPath();c.ellipse(x,y,rx,ry,rnd()*Math.PI,0,Math.PI*2);c.fill();
  }

  // lakes
  c.fillStyle='#55abc8';c.strokeStyle='#c6dc99';c.lineWidth=5;
  blob(c,w*.04,h*.22,w*.20,h*.16,-.2);c.fill();c.stroke();
  blob(c,w*.08,h*.83,w*.17,h*.12,.4);c.fill();c.stroke();
  blob(c,w*.95,h*.36,w*.11,h*.16,.1);c.fill();c.stroke();

  // little roads
  c.save();c.strokeStyle='#d1bd79';c.lineWidth=Math.max(7,w*.018);c.lineCap='round';
  c.beginPath();c.moveTo(w*.64,h*.69);c.quadraticCurveTo(w*.80,h*.72,w*.90,h*.91);c.stroke();
  c.beginPath();c.moveTo(w*.68,h*.69);c.lineTo(w*.70,h*.84);c.stroke();
  c.restore();

  // tree clusters, deterministic and away from the runway
  for(let i=0;i<62;i++){
    const x=.05+rnd()*.9,y=.14+rnd()*.80;
    if(Math.abs(y-E.RUNWAY.y)<.12&&x>.15&&x<.88) continue;
    if(Math.hypot(x-E.HELIPAD.x,y-E.HELIPAD.y)<.11) continue;
    const px=x*w,py=y*h,s=2.5+rnd()*4.5;
    c.fillStyle='rgba(37,82,37,.28)';c.beginPath();c.arc(px+2,py+3,s,0,Math.PI*2);c.fill();
    c.fillStyle=i%3?'#396f36':'#4c7d37';c.beginPath();c.arc(px,py,s,0,Math.PI*2);c.fill();
  }

  drawAirfield(c,w,h);
}

function blob(c,x,y,rx,ry,rot){
  c.beginPath();
  c.ellipse(x,y,rx,ry,rot,0,Math.PI*2);
}

function W(x){return x*mapW}
function H(y){return y*mapH}
function worldToScreen(x,y){return{x:x*mapW,y:y*mapH}}
function screenToWorld(clientX,clientY){
  const r=canvas.getBoundingClientRect();
  return{x:E.clamp((clientX-r.left)/r.width,-.05,1.05),y:E.clamp((clientY-r.top)/r.height,-.05,1.05)};
}

function drawAirfield(c,w,h){
  const y=E.RUNWAY.y*h,x1=E.RUNWAY.x1*w,x2=E.RUNWAY.x2*w;
  const rh=Math.max(34,Math.min(58,h*.075));

  // apron
  c.fillStyle='#aaa99a';c.strokeStyle='#ece5ca';c.lineWidth=2;
  roundRect(c,w*.61,y+rh*.62,w*.22,h*.10,7);c.fill();c.stroke();

  // runway shadow and strip
  c.fillStyle='rgba(32,42,31,.28)';roundRect(c,x1+4,y-rh/2+6,x2-x1,rh,5);c.fill();
  c.fillStyle='#676b67';c.strokeStyle='#eee9d7';c.lineWidth=2;
  roundRect(c,x1,y-rh/2,x2-x1,rh,4);c.fill();c.stroke();

  // runway edge + centerline
  c.strokeStyle='#d9d6ca';c.lineWidth=1;
  c.beginPath();c.moveTo(x1+8,y-rh*.34);c.lineTo(x2-8,y-rh*.34);c.moveTo(x1+8,y+rh*.34);c.lineTo(x2-8,y+rh*.34);c.stroke();
  c.strokeStyle='#f7f4df';c.lineWidth=2;c.setLineDash([12,10]);
  c.beginPath();c.moveTo(x1+20,y);c.lineTo(x2-20,y);c.stroke();c.setLineDash([]);

  // threshold stripes
  c.fillStyle='#f4f1df';
  for(let i=0;i<4;i++){
    c.fillRect(x1+9,y-rh*.30+i*rh*.18,18,3);
    c.fillRect(x2-27,y-rh*.30+i*rh*.18,18,3);
  }

  // approach gate chevrons
  c.strokeStyle='rgba(255,247,206,.80)';c.lineWidth=2;
  const lg=worldToScreen(E.RUNWAY.leftGate.x,E.RUNWAY.leftGate.y),rg=worldToScreen(E.RUNWAY.rightGate.x,E.RUNWAY.rightGate.y);
  for(const [p,dir] of [[lg,1],[rg,-1]]){
    for(let k=0;k<3;k++){
      const off=k*9*dir;
      c.beginPath();
      c.moveTo(p.x+off-dir*7,p.y-7);c.lineTo(p.x+off,p.y);c.lineTo(p.x+off-dir*7,p.y+7);c.stroke();
    }
  }

  // terminal / hangars
  c.fillStyle='#8c7351';c.strokeStyle='#f2dfb3';c.lineWidth=1.5;
  roundRect(c,w*.69,y+rh*.72,w*.095,h*.052,4);c.fill();c.stroke();
  c.fillStyle='#6d5b43';roundRect(c,w*.80,y+rh*.72,w*.07,h*.045,3);c.fill();c.stroke();
  c.fillStyle='#efe0b0';c.font=Math.max(8,w*.021)+'px system-ui';c.fillText('TERMINAL',w*.69,y+rh*.70);

  // helipad
  const hp=worldToScreen(E.HELIPAD.x,E.HELIPAD.y),hr=Math.max(18,Math.min(31,w*.062));
  c.fillStyle='#7e8177';c.strokeStyle='#ece8d0';c.lineWidth=3;
  c.beginPath();c.arc(hp.x,hp.y,hr,0,Math.PI*2);c.fill();c.stroke();
  c.strokeStyle='#d9d6c5';c.lineWidth=1;c.beginPath();c.arc(hp.x,hp.y,hr*.73,0,Math.PI*2);c.stroke();
  c.fillStyle='#f5f1dc';c.font='bold '+Math.max(16,hr*.85)+'px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText('H',hp.x,hp.y+1);
  c.textAlign='left';c.textBaseline='alphabetic';
}

function roundRect(c,x,y,w,h,r){
  c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();
}

function draw(){
  resize();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.drawImage(mapCanvas,0,0);
  ctx.setTransform(mapD,0,0,mapD,0,0);

  const sel=game.aircraft.find(a=>a.id===game.selectedId);
  if(sel) drawDestinationHint(sel);

  for(const a of game.aircraft) drawRoute(a);
  if(draft) drawDraft();
  for(const a of game.aircraft) drawAircraft(a);
}

function drawDestinationHint(a){
  ctx.save();
  if(a.type==='heli'){
    const p=worldToScreen(E.HELIPAD.x,E.HELIPAD.y);
    ctx.strokeStyle='rgba(255,230,92,.85)';ctx.lineWidth=3;ctx.setLineDash([8,6]);
    ctx.beginPath();ctx.arc(p.x,p.y,Math.max(34,mapW*.10),0,Math.PI*2);ctx.stroke();
  }else{
    ctx.strokeStyle='rgba(255,237,125,.85)';ctx.lineWidth=3;ctx.setLineDash([8,6]);
    for(const gate of [E.RUNWAY.leftGate,E.RUNWAY.rightGate]){
      const p=worldToScreen(gate.x,gate.y);ctx.beginPath();ctx.arc(p.x,p.y,Math.max(30,mapW*.08),0,Math.PI*2);ctx.stroke();
    }
  }
  ctx.restore();
}

function drawRoute(a){
  if(!a.route||a.routeIndex>=a.route.length)return;
  const start=worldToScreen(a.x,a.y);
  ctx.save();ctx.beginPath();ctx.moveTo(start.x,start.y);
  for(let i=a.routeIndex;i<a.route.length;i++){
    const p=worldToScreen(a.route[i].x,a.route[i].y);ctx.lineTo(p.x,p.y);
  }
  ctx.strokeStyle=a.selected?'rgba(255,248,190,.95)':a.type==='heli'?'rgba(245,189,62,.55)':'rgba(255,255,255,.55)';
  ctx.lineWidth=a.selected?3:2;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([6,6]);ctx.stroke();ctx.restore();
}

function drawDraft(){
  if(draft.points.length<2)return;
  ctx.save();ctx.beginPath();
  const p0=worldToScreen(draft.points[0].x,draft.points[0].y);ctx.moveTo(p0.x,p0.y);
  for(let i=1;i<draft.points.length;i++){const p=worldToScreen(draft.points[i].x,draft.points[i].y);ctx.lineTo(p.x,p.y)}
  ctx.strokeStyle='#fff7a8';ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([7,5]);ctx.shadowColor='#694';ctx.shadowBlur=5;ctx.stroke();ctx.restore();
}

function drawAircraft(a){
  const p=worldToScreen(a.x,a.y),rad=a.heading*DEG;
  const colors=['#f4f0de','#e9694e','#409dcc','#f1bd3f'];
  const color=colors[a.palette%colors.length];

  ctx.save();ctx.translate(p.x+3,p.y+5);ctx.rotate(rad);ctx.globalAlpha=.22;ctx.fillStyle='#182411';
  if(a.type==='heli') helicopterShape(ctx,1.08,true);else planeShape(ctx,1.08,true);
  ctx.restore();

  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(rad);
  if(a.warning){ctx.shadowColor='#ff382f';ctx.shadowBlur=15}else if(a.selected){ctx.shadowColor='#fff7a8';ctx.shadowBlur=12}
  ctx.fillStyle=color;ctx.strokeStyle='#36493b';ctx.lineWidth=1.2;
  if(a.type==='heli') helicopterShape(ctx,1,false);else planeShape(ctx,1,false);
  ctx.restore();

  if(a.selected){
    ctx.save();ctx.strokeStyle='#fff9ba';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,22,0,Math.PI*2);ctx.stroke();ctx.restore();
  }

  ctx.save();ctx.font='800 9px system-ui';ctx.textAlign='center';ctx.fillStyle='#183321';ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=3;ctx.strokeText(a.callsign,p.x,p.y-22);ctx.fillText(a.callsign,p.x,p.y-22);ctx.restore();
}

const DEG=Math.PI/180;
function planeShape(c,s,shadow){
  c.beginPath();
  c.moveTo(0,-17*s);c.lineTo(3,-5*s);c.lineTo(15,3*s);c.lineTo(15,7*s);c.lineTo(3,4*s);
  c.lineTo(2,13*s);c.lineTo(7,17*s);c.lineTo(7,19*s);c.lineTo(0,17*s);
  c.lineTo(-7,19*s);c.lineTo(-7,17*s);c.lineTo(-2,13*s);c.lineTo(-3,4*s);
  c.lineTo(-15,7*s);c.lineTo(-15,3*s);c.lineTo(-3,-5*s);c.closePath();
  c.fill();if(!shadow)c.stroke();
}
function helicopterShape(c,s,shadow){
  c.beginPath();c.ellipse(0,-2*s,7*s,12*s,0,0,Math.PI*2);c.fill();if(!shadow)c.stroke();
  c.fillRect(-2*s,7*s,4*s,13*s);
  c.beginPath();c.moveTo(-6*s,19*s);c.lineTo(6*s,19*s);c.lineTo(0,14*s);c.closePath();c.fill();if(!shadow)c.stroke();
  if(!shadow){
    c.strokeStyle='#3d4b3e';c.lineWidth=1.4;c.beginPath();c.moveTo(-17*s,-3*s);c.lineTo(17*s,-3*s);c.moveTo(0,-18*s);c.lineTo(0,12*s);c.stroke();
  }
}

function hitAircraft(clientX,clientY){
  const rect=canvas.getBoundingClientRect();
  const px=clientX-rect.left,py=clientY-rect.top;
  const radius=Math.max(54,Math.min(72,mapW*.15));
  let best=null,bd=Infinity;
  for(const a of game.aircraft){
    const p=worldToScreen(a.x,a.y);
    const d=Math.hypot(px-p.x,py-p.y);
    if(d<=radius&&d<bd){best=a;bd=d}
  }
  return best;
}

function pointerDown(ev){
  if(!running||paused)return;
  ev.preventDefault();
  const a=hitAircraft(ev.clientX,ev.clientY);
  if(!a)return;
  game.selectedId=a.id;for(const x of game.aircraft)x.selected=x.id===a.id;
  draft={id:a.id,points:[{x:a.x,y:a.y}],pointerId:ev.pointerId};
  const p=screenToWorld(ev.clientX,ev.clientY);
  if(E.distance(p,a)>0.015)draft.points.push(p);
  canvas.setPointerCapture?.(ev.pointerId);
  game.lastEvent=a.callsign+' — DRAW ROUTE';
  beep(820,.025);buzz(10);
}
function pointerMove(ev){
  if(!draft)return;
  ev.preventDefault();
  const p=screenToWorld(ev.clientX,ev.clientY),last=draft.points[draft.points.length-1];
  if(E.distance(p,last)>=0.016)draft.points.push(p);
}
function pointerUp(ev){
  if(!draft)return;
  ev.preventDefault();
  const a=game.aircraft.find(x=>x.id===draft.id);
  const end=screenToWorld(ev.clientX,ev.clientY);
  const lastPoint=draft.points[draft.points.length-1];
  if(E.distance(end,lastPoint)>=0.008)draft.points.push(end);
  if(a&&draft.points.length>=2){
    E.assignPath(game,a.id,draft.points);
    if(a.landing){
      game.lastEvent=a.type==='heli'?a.callsign+' HELIPAD LOCKED':a.callsign+' RUNWAY LOCKED';
      beep(980,.07);buzz(18);
    }else{
      game.lastEvent=a.callsign+' ROUTE SET';beep(690,.04);buzz(8);
    }
  }
  draft=null;
}
function pointerCancel(){draft=null}

function start(){
  game=E.makeGame(Date.now());E.trySpawn(game);game.spawnClock=3.2;
  running=true;paused=false;timeScale=1;hadWarning=false;last=performance.now();
  stats.shifts++;saveStats();
  $('overlay').classList.remove('show');$('pauseBtn').textContent='Ⅱ';$('speedBtn').textContent='1×';beep(560,.07);
}
function finish(){
  running=false;
  stats.best=Math.max(stats.best,game.score);stats.landed+=game.landed;saveStats();
  const ov=$('overlay');ov.classList.add('show');
  ov.querySelector('h1').textContent='SHIFT OVER';
  ov.querySelector('.lead').textContent=game.lastEvent+'. You landed '+game.landed+' aircraft and scored '+game.score+'.';
  $('startBtn').textContent='PLAY AGAIN';
  beep(190,.18,.05);buzz([60,40,60]);
}

function updateUI(){
  $('score').textContent=String(game.score).padStart(4,'0');
  $('landed').textContent=game.landed;
  $('level').textContent=game.level;
  $('best').textContent=Math.max(stats.best,game.score);
  $('misses').textContent=[0,1,2].map(i=>i<3-game.missed?'●':'○').join(' ');
  $('event').textContent=game.lastEvent;
  const warn=game.aircraft.some(a=>a.warning);
  $('warning').hidden=!warn;
  if(warn&&!hadWarning){beep(250,.09,.045);buzz(22)}
  hadWarning=warn;
}

function frame(now){
  const dt=Math.min(.06,(now-last)/1000);last=now;
  if(running&&!paused){
    const beforeLanded=game.landed,beforeEvent=game.lastEvent;
    E.updateGame(game,dt*timeScale*(draft?0.42:1));
    if(game.landed>beforeLanded)beep(1060,.08);
    else if(game.lastEvent!==beforeEvent&&game.lastEvent.includes('MISSED'))beep(260,.10);
    if(game.gameOver){updateUI();draw();finish();requestAnimationFrame(frame);return}
  }
  updateUI();draw();requestAnimationFrame(frame);
}

$('startBtn').addEventListener('click',start);
$('pauseBtn').addEventListener('click',()=>{
  if(!running)return;paused=!paused;$('pauseBtn').textContent=paused?'▶':'Ⅱ';game.lastEvent=paused?'PAUSED':'BACK IN CONTROL';last=performance.now();beep(paused?330:650,.04);
});
$('speedBtn').addEventListener('click',()=>{
  if(!running)return;timeScale=timeScale===1?1.65:1;$('speedBtn').textContent=timeScale===1?'1×':'2×';beep(timeScale===1?520:780,.035);
});
canvas.addEventListener('pointerdown',pointerDown);
canvas.addEventListener('pointermove',pointerMove);
canvas.addEventListener('pointerup',pointerUp);
canvas.addEventListener('pointercancel',pointerCancel);
window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused){paused=true;$('pauseBtn').textContent='▶';game.lastEvent='PAUSED'}});
resize();updateUI();draw();requestAnimationFrame(frame);
})();