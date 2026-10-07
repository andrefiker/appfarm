(function(){
'use strict';
const E = window.QuietATCEngine;
const $ = id => document.getElementById(id);
const canvas=$('radar'), ctx=canvas.getContext('2d',{alpha:false});
let game=E.makeGame(Date.now());
let running=false, paused=false, last=performance.now(), drag=null, audio=null;
const stats=loadStats();
$('bestText').textContent='BEST '+String(stats.best||0).padStart(5,'0');

function loadStats(){try{return JSON.parse(localStorage.getItem('quietAtcStats'))||{best:0,totalLanded:0,shifts:0}}catch{return{best:0,totalLanded:0,shifts:0}}}
function saveStats(){localStorage.setItem('quietAtcStats',JSON.stringify(stats))}
function beep(freq=680,dur=.05,vol=.035){try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(audio.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.stop(audio.currentTime+dur)}catch{}}
function buzz(ms=15){try{navigator.vibrate&&navigator.vibrate(ms)}catch{}}
function fmtTime(sec){sec=Math.floor(sec);return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
function selected(){return game.aircraft.find(a=>a.id===game.selectedId)||null}

function start(){
  game=E.makeGame(Date.now());E.trySpawn(game);running=true;paused=false;last=performance.now();
  stats.shifts++;saveStats();$('overlay').classList.remove('show');$('pauseBtn').textContent='PAUSE';beep(540,.08);
}
function endShift(){
  if(game.score>stats.best)stats.best=game.score;stats.totalLanded+=game.landed;saveStats();
  $('bestText').textContent='BEST '+String(stats.best).padStart(5,'0');
  const modal=$('overlay');modal.classList.add('show');
  modal.querySelector('h1').textContent=game.gameOver?'SHIFT ENDED':'QUIET ATC';
  modal.querySelector('p:not(.kicker)').textContent=game.gameOver?(game.lastEvent+'. Score '+game.score+'. Landed '+game.landed+'; handoffs '+game.handedOff+'.'):'Guide arrivals onto runway 18, climb departures out of the sector, and keep every aircraft safely separated.';
  $('startBtn').textContent='START NEW SHIFT';running=false;beep(180,.18,.05);buzz(80);
}

function resize(){
  const r=canvas.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1);
  const w=Math.max(1,Math.floor(r.width*d)),h=Math.max(1,Math.floor(r.height*d));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  ctx.setTransform(d,0,0,d,0,0);
}
function worldToScreen(x,y){const r=canvas.getBoundingClientRect();const pad=18;return{x:pad+x*(r.width-pad*2),y:pad+y*(r.height-pad*2)}}

function draw(){
  resize();const r=canvas.getBoundingClientRect();ctx.fillStyle='#040d0b';ctx.fillRect(0,0,r.width,r.height);
  const cx=r.width/2,cy=r.height/2,maxR=Math.min(r.width,r.height)*.48;
  ctx.strokeStyle='#15372c';ctx.lineWidth=1;
  for(let i=1;i<=4;i++){ctx.beginPath();ctx.arc(cx,cy,maxR*i/4,0,Math.PI*2);ctx.stroke()}
  ctx.beginPath();ctx.moveTo(cx,8);ctx.lineTo(cx,r.height-8);ctx.moveTo(8,cy);ctx.lineTo(r.width-8,cy);ctx.stroke();
  ctx.save();ctx.strokeStyle='#0d2b22';ctx.setLineDash([2,8]);for(let a=0;a<360;a+=30){const t=a*Math.PI/180;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.sin(t)*maxR,cy-Math.cos(t)*maxR);ctx.stroke()}ctx.restore();
  drawRunway();
  if(drag){ctx.save();ctx.strokeStyle='#e8c56b';ctx.lineWidth=1.5;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(drag.start.x,drag.start.y);ctx.lineTo(drag.now.x,drag.now.y);ctx.stroke();ctx.restore()}
  for(const a of game.aircraft)drawAircraft(a);
}
function drawRunway(){
  const t=worldToScreen(E.RUNWAY.threshold.x,E.RUNWAY.threshold.y), f=worldToScreen(E.RUNWAY.farEnd.x,E.RUNWAY.farEnd.y);
  ctx.save();ctx.strokeStyle='#557d6d';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(t.x,t.y);ctx.lineTo(f.x,f.y);ctx.stroke();
  ctx.strokeStyle='#d6eade';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(t.x-9,t.y);ctx.lineTo(t.x+9,t.y);ctx.stroke();
  ctx.setLineDash([4,6]);ctx.strokeStyle='#24523f';ctx.beginPath();ctx.moveTo(t.x,t.y);ctx.lineTo(t.x,Math.max(18,t.y-260));ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#70998a';ctx.font='8px ui-monospace';ctx.textAlign='center';ctx.fillText('18',t.x,t.y+14);ctx.restore();
}
function drawAircraft(a){
  const p=worldToScreen(a.x,a.y),rad=a.heading*Math.PI/180;
  const col=a.conflict==='collision'?'#ff6e6e':a.conflict==='warning'?'#e8c56b':a.selected?'#ffffff':'#79e6b0';
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(rad);ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=a.selected?2:1.3;
  ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(5,6);ctx.lineTo(0,3);ctx.lineTo(-5,6);ctx.closePath();ctx.stroke();ctx.restore();
  ctx.strokeStyle=col;ctx.globalAlpha=.55;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+Math.sin(rad)*32,p.y-Math.cos(rad)*32);ctx.stroke();ctx.globalAlpha=1;
  ctx.font='9px ui-monospace';ctx.fillStyle=col;ctx.textAlign='left';ctx.fillText(a.callsign,p.x+9,p.y-7);
  ctx.fillStyle=a.selected?'#dff8ec':'#76a994';ctx.font='8px ui-monospace';ctx.fillText(String(Math.round(a.altitude/100)).padStart(3,'0')+' '+String(Math.round(a.heading)).padStart(3,'0')+(a.approach?' ILS':''),p.x+9,p.y+4);
  if(a.conflict!=='clear'){ctx.strokeStyle=col;ctx.beginPath();ctx.arc(p.x,p.y,15,0,Math.PI*2);ctx.stroke()}
}

function hitAircraft(clientX,clientY){
  const rect=canvas.getBoundingClientRect();let best=null,bestD=Infinity;
  for(const a of game.aircraft){const p=worldToScreen(a.x,a.y);const d=Math.hypot((clientX-rect.left)-p.x,(clientY-rect.top)-p.y);if(d<30&&d<bestD){best=a;bestD=d}}
  return best;
}
function pointerDown(ev){
  if(!running||paused)return;const a=hitAircraft(ev.clientX,ev.clientY);if(!a)return;
  E.selectAircraft(game,a.id);updateUI();const p=worldToScreen(a.x,a.y);drag={id:a.id,start:p,now:p,moved:false};canvas.setPointerCapture?.(ev.pointerId);beep(820,.025);buzz(8)
}
function pointerMove(ev){if(!drag)return;const rect=canvas.getBoundingClientRect();drag.now={x:ev.clientX-rect.left,y:ev.clientY-rect.top};drag.moved=Math.hypot(drag.now.x-drag.start.x,drag.now.y-drag.start.y)>18}
function pointerUp(){
  if(!drag)return;const a=game.aircraft.find(x=>x.id===drag.id);if(a&&drag.moved){const dx=drag.now.x-drag.start.x,dy=drag.now.y-drag.start.y;const hdg=E.normHeading(Math.atan2(dx,-dy)/Math.PI*180);E.commandHeading(game,a.id,hdg);toast('HEADING '+String(Math.round(a.targetHeading)).padStart(3,'0'));beep(700,.035)}drag=null;updateUI()
}
function toast(msg){const t=$('toast');t.textContent=msg;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,900)}
function commandHdg(delta){const a=selected();if(!a)return;E.commandHeading(game,a.id,a.targetHeading+delta);beep(680,.03);buzz(8);updateUI()}
function commandAlt(delta){const a=selected();if(!a)return;E.commandAltitude(game,a.id,a.targetAltitude+delta);beep(620,.03);buzz(8);updateUI()}
function approach(){const a=selected();if(!a)return;if(E.clearApproach(game,a.id)){toast('ILS CLEARED — RUNWAY 18');beep(940,.06);buzz(12)}else{toast('LINE UP NORTH OF RWY 18');beep(240,.07)}updateUI()}

function updateUI(){
  $('score').textContent=String(game.score).padStart(5,'0');$('level').textContent=game.level;$('clock').textContent=fmtTime(game.elapsed);
  $('eventText').textContent=game.lastEvent;$('trafficCount').textContent=game.aircraft.length;$('landed').textContent=game.landed;$('handoffs').textContent=game.handedOff;
  const danger=game.aircraft.some(a=>a.conflict==='collision'),warn=game.aircraft.some(a=>a.conflict==='warning');const tr=$('trafficLamp').parentElement;tr.classList.toggle('danger',danger);tr.classList.toggle('warn',!danger&&warn);
  const a=selected(),controls=$('controls');controls.classList.toggle('disabled',!a);
  $('selectedCallsign').textContent=a?a.callsign:'—';$('selectedMeta').textContent=a?(a.kind.toUpperCase()+' • '+Math.round(a.altitude).toLocaleString()+' FT'):'Tap an aircraft';
  $('headingValue').textContent=a?String(Math.round(a.targetHeading)).padStart(3,'0'):'---';$('altitudeValue').textContent=a?String(Math.round(a.targetAltitude/100)).padStart(3,'0')+'00':'-----';
  const can=!!a&&E.canCaptureApproach(a);$('approachBtn').disabled=!a||a.kind!=='arrival';$('approachBtn').classList.toggle('ready',can);$('approachBtn').querySelector('b').textContent=a&&a.approach?'CLEARED':'APPROACH';
}

function frame(now){
  const dt=Math.min(.06,(now-last)/1000);last=now;if(running&&!paused){const before=game.lastEvent;E.updateGame(game,dt);if(game.lastEvent!==before)beep(game.lastEvent.includes('MISSED')?260:760,.04);if(game.gameOver){updateUI();draw();endShift();requestAnimationFrame(frame);return}}updateUI();draw();requestAnimationFrame(frame)
}

$('startBtn').addEventListener('click',start);$('newBtn').addEventListener('click',()=>{if(running){game.gameOver=true;game.lastEvent='SHIFT RESET'}endShift()});
$('pauseBtn').addEventListener('click',()=>{if(!running)return;paused=!paused;$('pauseBtn').textContent=paused?'RESUME':'PAUSE';toast(paused?'PAUSED':'RESUMED');last=performance.now()});
$('hdgMinus').addEventListener('click',()=>commandHdg(-15));$('hdgPlus').addEventListener('click',()=>commandHdg(15));$('altMinus').addEventListener('click',()=>commandAlt(-1000));$('altPlus').addEventListener('click',()=>commandAlt(1000));$('approachBtn').addEventListener('click',approach);
canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',()=>drag=null);
window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused){paused=true;$('pauseBtn').textContent='RESUME'}});
resize();updateUI();draw();if(new URLSearchParams(location.search).get('autostart')==='1')setTimeout(start,0);requestAnimationFrame(frame);
})();
