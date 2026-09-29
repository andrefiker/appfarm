import { WIDTH, createRun, createStage, attachBall, launch, movePaddle, pause, resume, tick, getBreakableCount, setComfortMode } from './engine.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d', { alpha: false });
const defaults = { sound: false, haptics: false, reducedMotion: true, comfortProfileVersion: 2 };
const savedSettings = read('qb-settings', {});
let settings = { ...defaults, ...savedSettings };
if (savedSettings.comfortProfileVersion !== 2) {
  settings.reducedMotion = true;
  settings.haptics = false;
  settings.comfortProfileVersion = 2;
  save('qb-settings', settings);
}
let stats = read('qb-stats', { classicBest: 0, endlessBest: 0, highStage: 1 });
let run = null;
let screen = 'menu';
let lastTime = performance.now();
let logicalHeight = 820;
let scale = 1;
let hitAreas = [];
let audio = null;
let dragging = false;
let autosaveTimer = 0;

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
function saveStats() { save('qb-stats', stats); }
function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  scale = rect.width / WIDTH; logicalHeight = rect.height / scale;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  if (run) { run.height = logicalHeight; run.paddle.y = logicalHeight - 122; if (run.phase === 'ready' && run.balls.length) run.balls[0].y = run.paddle.y - 16; }
}
window.addEventListener('resize', resize, { passive: true }); resize();

function ensureAudio() {
  if (!settings.sound) return null;
  if (!audio) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audio = new AC(); }
  if (audio?.state === 'suspended') audio.resume();
  return audio;
}
function tone(freq, duration = 0.055, wave = 'sine', volume = 0.055, endFreq = null) {
  const ac = ensureAudio(); if (!ac) return;
  const osc = ac.createOscillator(), gain = ac.createGain();
  osc.type = wave; osc.frequency.setValueAtTime(freq, ac.currentTime);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, ac.currentTime + duration);
  gain.gain.setValueAtTime(volume, ac.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.connect(gain); gain.connect(ac.destination); osc.start(); osc.stop(ac.currentTime + duration);
}
function sound(event) {
  if (!settings.sound) return;
  const cues = { wall: [480,.025,'sine',.022], paddle: [570,.07,'triangle',.06,740], paddleEdge: [360,.09,'triangle',.065,760], brick: [720,.065,'sine',.04,900], toughHit: [250,.075,'triangle',.045,190], toughBreak: [400,.11,'triangle',.055,780], stageClear: [500,.22,'sine',.065,1050], lifeLost: [280,.22,'sine',.07,110], gameover: [220,.38,'triangle',.06,75], launch: [330,.12,'sine',.04,600] };
  const c = cues[event]; if (c) tone(...c);
}
function vibrate(pattern = 10) { if (settings.haptics && navigator.vibrate) navigator.vibrate(pattern); }

function rounded(x,y,w,h,r,fill,stroke=null,line=1) {
  ctx.beginPath(); ctx.roundRect(x,y,w,h,r); if (fill) { ctx.fillStyle=fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle=stroke; ctx.lineWidth=line; ctx.stroke(); }
}
function text(s,x,y,size,color='#f6f1e6',align='left',weight=500,spacing=0) {
  ctx.fillStyle=color; ctx.font=`${weight} ${size}px Inter, ui-sans-serif, system-ui, -apple-system, sans-serif`; ctx.textAlign=align; ctx.textBaseline='middle';
  if (!spacing) { ctx.fillText(s,x,y); return; }
  let width=0; for (const ch of s) width += ctx.measureText(ch).width + spacing; let xx=x-(align==='center'?width/2:align==='right'?width:0);
  for (const ch of s) { ctx.fillText(ch,xx,y); xx += ctx.measureText(ch).width+spacing; }
}
function button(label, x,y,w,h, action, style='primary') {
  hitAreas.push({x,y,w,h,action});
  const primary=style==='primary';
  rounded(x,y,w,h,h/2,primary?'#f2b863':'rgba(246,241,230,.045)',primary?'#ffd794':'rgba(246,241,230,.18)',1);
  text(label,x+w/2,y+h/2+0.5,15,primary?'#201a15':'#eee7db','center',650,.2);
}
function header() {
  text('QUIET',26,34,18,'#f6c675','left',600,4.2);
  text('BREAKOUT',26,55,11,'#c8bdac','left',550,4.2);
  if (screen==='game' && run) {
    text(String(run.score).padStart(5,'0'),235,36,18,'#fff2d8','right',650,.6);
    text('SCORE',235,56,8,'#8b8a8b','right',550,1.6);
    text(`STAGE ${String(run.stage).padStart(2,'0')}`,302,38,11,'#dfd4c4','center',600,1.2);
    text('◆'.repeat(Math.min(3, Number.isFinite(run.lives)?run.lives:3)),350,38,14,'#f2b863','center',700,3);
    hitAreas.push({x:365,y:15,w:39,h:42,action:'pause'});
    rounded(370,19,32,32,16,'rgba(255,255,255,.04)','rgba(255,255,255,.18)');
    if(run.phase==='paused') { text('▶',386,35,12,'#f6c675','center',700); }
    else { rounded(381,28,3,13,1,'#f6c675'); rounded(388,28,3,13,1,'#f6c675'); }
    ctx.strokeStyle='rgba(255,255,255,.09)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(24,76);ctx.lineTo(396,76);ctx.stroke();
  }
}
function background() {
  const grad=ctx.createLinearGradient(0,0,WIDTH,logicalHeight); grad.addColorStop(0,'#12161b');grad.addColorStop(.52,'#0d1116');grad.addColorStop(1,'#11151a');
  ctx.fillStyle=grad;ctx.fillRect(0,0,WIDTH,logicalHeight);
  const t=settings.reducedMotion?0:performance.now()*.00008;
  for(let i=0;i<31;i++) { const x=(i*137.5+25)%WIDTH, y=98+((i*211.7+43)%Math.max(160,logicalHeight-180)); const alpha=.055+.035*Math.sin(t+i*2);
    ctx.fillStyle=`rgba(${i%3===0?'239,179,96':'115,169,166'},${alpha})`;ctx.beginPath();ctx.arc(x,y,i%8===0?1.5:.8,0,Math.PI*2);ctx.fill(); }
}
function brickColor(b) {
  if(b.kind==='tough') return b.hp>1?['#98a2a3','#778282']:['#d7a76c','#a37a4d'];
  const colors=[['#f2bd6a','#bd7b3e'],['#ea8370','#a74f51'],['#65bbb0','#327d7a'],['#d9a1bb','#965e7d']];
  return colors[Math.floor((b.y-112)/21)%colors.length];
}
function drawBricks() {
  for(const b of run.bricks) if(b.alive) {
    const [top,bottom]=brickColor(b); const grad=ctx.createLinearGradient(b.x,b.y,b.x,b.y+b.h);grad.addColorStop(0,top);grad.addColorStop(1,bottom);
    ctx.shadowColor=b.kind==='tough'?'rgba(172,184,182,.18)':`${top}44`;ctx.shadowBlur=8;
    rounded(b.x,b.y,b.w,b.h,5,grad,'rgba(255,255,255,.18)',.8);ctx.shadowBlur=0;
    rounded(b.x+3,b.y+2,b.w-6,2,1,'rgba(255,255,255,.22)');
    if(b.kind==='tough') { text(String(b.hp),b.x+b.w/2,b.y+b.h/2+1,9,'#f4eee4','center',700); }
  }
}
function drawPaddle() {
  const p=run.paddle, y=p.y;
  const glow=ctx.createLinearGradient(p.x-p.w/2,y,p.x+p.w/2,y);glow.addColorStop(0,'#b46e3a');glow.addColorStop(.5,run.paddleFlash>0?'#fff8da':'#ffe1a0');glow.addColorStop(1,'#bf7540');
  if(!settings.reducedMotion) { ctx.shadowColor='rgba(245,178,93,.48)';ctx.shadowBlur=13; }
  rounded(p.x-p.w/2,y,p.w,p.h,6,glow,'rgba(255,233,186,.65)',.7);ctx.shadowBlur=0;
  if(!settings.reducedMotion) rounded(p.x-p.w/2+7,y+3,p.w-14,2,1,'rgba(255,255,255,.48)');
}
function drawParticles() {
  if(settings.reducedMotion) return;
  for(const p of run.particles) { const alpha=Math.max(0,p.life/p.maxLife); ctx.globalAlpha=alpha;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,1.2+alpha*.7,0,Math.PI*2);ctx.fill(); } ctx.globalAlpha=1;
}
function drawBall(ball) {
  if(!settings.reducedMotion) {
    for(let i=ball.trail.length-1;i>=0;i--) { const a=(1-i/ball.trail.length)*.15; ctx.fillStyle=`rgba(255,198,110,${a})`;ctx.beginPath();ctx.arc(ball.trail[i].x,ball.trail[i].y,ball.r*(.35+.42*(1-i/ball.trail.length)),0,Math.PI*2);ctx.fill(); }
  }
  if(!settings.reducedMotion) {
    const g=ctx.createRadialGradient(ball.x-2,ball.y-3,1,ball.x,ball.y,ball.r*2.7);g.addColorStop(0,'#fffef7');g.addColorStop(.24,'#fff2cb');g.addColorStop(.52,'#ffd77e');g.addColorStop(1,'rgba(252,169,65,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r*2.7,0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle='#fffdf4';ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r*.78,0,Math.PI*2);ctx.fill();
}
function drawPlayfield() {
  if(run.phase==='running'||run.phase==='ready'||run.phase==='paused'||run.phase==='stageclear'||run.phase==='gameover') {
    ctx.save();
    if(run.shake>0&&!settings.reducedMotion) ctx.translate((Math.random()-.5)*run.shake,(Math.random()-.5)*run.shake);
    ctx.strokeStyle='rgba(255,255,255,.035)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(17,88);ctx.lineTo(17,run.height-91);ctx.lineTo(403,run.height-91);ctx.lineTo(403,88);ctx.stroke();
    drawBricks();drawParticles();drawPaddle();for(const ball of run.balls)drawBall(ball);
    ctx.restore();
    if(run.phase==='ready') {
      rounded(112,run.height*.57-21,196,40,20,'rgba(255,255,255,.055)','rgba(255,255,255,.1)');
      text('TAP TO SERVE',210,run.height*.57,11,'#eee2cd','center',600,2);
    }
    if(run.phase==='stageclear') {
      rounded(67,run.height*.46-37,286,74,19,'rgba(13,17,22,.88)','rgba(246,198,117,.27)');
      text('STAGE CLEAR',210,run.height*.46-7,17,'#f5c575','center',650,2.4);
      text('+100  ·  NEXT BOARD',210,run.height*.46+18,9,'#c7bdaf','center',500,1.4);
    }
    if(run.phase==='paused'||run.phase==='gameover') {
      ctx.fillStyle='rgba(7,10,14,.7)';ctx.fillRect(0,78,WIDTH,run.height-78);
      const title=run.phase==='paused'?'PAUSED':'RUN COMPLETE';
      text(title,210,run.height*.42,24,'#f6e9d2','center',650,3);
      if(run.phase==='paused') {
        button('RESUME',96,run.height*.49,228,48,'resume');
        button('RESTART RUN',96,run.height*.49+60,228,42,'restart','secondary');
        button('SETTINGS',96,run.height*.49+112,228,42,'settings','secondary');
      } else {
        text(`SCORE  ${run.score.toLocaleString()}`,210,run.height*.47,13,'#d8cdbc','center',550,1);
        button('PLAY AGAIN',96,run.height*.53,228,48,`restart:${run.mode}`);
        button('MAIN MENU',96,run.height*.53+60,228,42,'menu','secondary');
      }
    }
  }
}
function drawMenu() {
  text('A little light. A long rally.',26,logicalHeight*.19,13,'#a9a59e','left',450,.2);
  text('Break the quiet.',26,logicalHeight*.19+43,32,'#f2eee5','left',600,-.7);
  text('One paddle. One bright ball. Your angle.',26,logicalHeight*.19+76,12,'#9c9da0','left',450,.1);
  if(settings.reducedMotion) text('COMFORT MODE ON  ·  SLOWER, STEADIER PLAY',26,logicalHeight*.19+105,8,'#d0a96d','left',550,1.1);
  const y=logicalHeight*.48;
  button('CLASSIC',26,y,368,58,'start:classic');
  text(`BEST  ${String(stats.classicBest).padStart(5,'0')}     ·     STAGE ${String(stats.highStage).padStart(2,'0')}`,210,y+78,9,'#9e9b95','center',550,1.1);
  button('ENDLESS',26,y+105,178,48,'start:endless','secondary');
  button('ZEN',216,y+105,178,48,'start:zen','secondary');
  text(`ENDLESS BEST  ${String(stats.endlessBest).padStart(5,'0')}`,210,y+174,9,'#85868a','center',500,1.1);
  button(settings.sound?'SOUND  ON':'SOUND  OFF',26,logicalHeight-88,112,38,'sound','secondary');
  button(settings.haptics?'HAPTICS  ON':'HAPTICS  OFF',154,logicalHeight-88,136,38,'haptics','secondary');
  button('OPTIONS',302,logicalHeight-88,92,38,'settings','secondary');
  text('DRAG ANYWHERE IN THE LOWER FIELD TO MOVE',210,logicalHeight-31,8,'#73767a','center',500,1.05);
}
function drawSettings() {
  text('SETTINGS',26,logicalHeight*.2,25,'#f2eee5','left',600,1.2);
  text('A quieter game, your way.',26,logicalHeight*.2+31,12,'#a9a59e');
  const y=logicalHeight*.38;
  button(`SOUND  ${settings.sound?'ON':'OFF'}`,26,y,368,52,'sound','secondary');
  button(`HAPTICS  ${settings.haptics?'ON':'OFF'}`,26,y+66,368,52,'haptics','secondary');
  button(`COMFORT MODE  ${settings.reducedMotion?'ON':'OFF'}`,26,y+132,368,52,'motion','secondary');
  text(settings.reducedMotion?'Slower ball. No shake, trail, particles or shimmer.':'Normal ball speed and effects.',26,y+199,10,'#85868a','left',450,.1);
  button('BACK TO GAME',26,logicalHeight-95,368,48,run?'resume':'menu');
}
function draw() {
  hitAreas=[]; background(); header();
  if(screen==='menu')drawMenu(); else if(screen==='settings')drawSettings(); else if(run)drawPlayfield();
  if(screen==='game'&&run?.phase==='running') {
    const count=getBreakableCount(run);
    if(count>0) text(`${count} BRICKS LEFT`,WIDTH/2,91,8,'rgba(222,213,197,.42)','center',550,1.5);
  }
}
function start(mode) {
  run=createRun(mode,logicalHeight,{comfortMode:settings.reducedMotion});run.paddle.y=logicalHeight-122;attachBall(run);screen='game';
  sound('launch');
}
function action(name) {
  if(name==='menu') { screen='menu';run=null;return; }
  if(name==='settings') { screen='settings';return; }
  if(name.startsWith('start:')) { start(name.split(':')[1]);return; }
  if(name.startsWith('restart:')) { start(name.split(':')[1]);return; }
  if(name==='restart'&&run) { start(run.mode);return; }
  if(name==='pause'&&run) { if(run.phase==='paused')resume(run);else pause(run);return; }
  if(name==='resume'&&run) { screen='game';resume(run);return; }
  if(name==='sound') { settings.sound=!settings.sound;save('qb-settings',settings);return; }
  if(name==='haptics') { settings.haptics=!settings.haptics;save('qb-settings',settings);return; }
  if(name==='motion') { settings.reducedMotion=!settings.reducedMotion;save('qb-settings',settings);if(run)setComfortMode(run,settings.reducedMotion);return; }
}
function localPoint(e) { const rect=canvas.getBoundingClientRect();return {x:(e.clientX-rect.left)/scale,y:(e.clientY-rect.top)/scale}; }
canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();ensureAudio();canvas.setPointerCapture(e.pointerId);const p=localPoint(e);
  const hit=[...hitAreas].reverse().find(a=>p.x>=a.x&&p.x<=a.x+a.w&&p.y>=a.y&&p.y<=a.y+a.h);
  if(hit) { action(hit.action);draw();return; }
  if(screen==='game'&&run) {
    if(run.phase==='ready') { launch(run);sound('launch'); }
    if(run.phase==='running'&&p.y>run.height*.62) { dragging=true;movePaddle(run,p.x); }
  }
});
canvas.addEventListener('pointermove',e=>{
  if(!dragging||!run)return;e.preventDefault();movePaddle(run,localPoint(e).x);
},{passive:false});
canvas.addEventListener('pointerup',()=>{dragging=false;});canvas.addEventListener('pointercancel',()=>{dragging=false;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());

document.addEventListener('visibilitychange',()=>{if(document.hidden&&run&&screen==='game')pause(run);});
window.addEventListener('blur',()=>{if(run&&screen==='game')pause(run);});
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'||e.key===' ') { if(run&&screen==='game') { if(run.phase==='running')pause(run);else if(run.phase==='paused')resume(run); } e.preventDefault(); }
  if(run&&screen==='game'&&(e.key==='ArrowLeft'||e.key==='ArrowRight')) movePaddle(run,run.paddle.x+(e.key==='ArrowLeft'?-28:28));
});
function frame(now) {
  const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
  if(run&&screen==='game') {
    const before=run.lastEvent;const events=tick(run,dt);
    for(const ev of events) { sound(ev);if(ev==='paddleEdge'||ev==='toughBreak')vibrate(ev==='toughBreak'?18:10);if(ev==='lifeLost')vibrate([25,45,25]); }
    if(run.mode==='classic') { stats.classicBest=Math.max(stats.classicBest,run.score);stats.highStage=Math.max(stats.highStage,run.stage); }
    if(run.mode==='endless') stats.endlessBest=Math.max(stats.endlessBest,run.score);
    autosaveTimer+=dt;if(autosaveTimer>1.5||run.phase==='gameover'){saveStats();autosaveTimer=0;}
  }
  draw();requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
