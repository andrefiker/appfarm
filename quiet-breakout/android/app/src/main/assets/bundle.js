const WIDTH = 420;
const BRICK_W = 42;
const BRICK_H = 17;
const BRICK_GAP = 4;
const BALL_R = 6;
const PADDLE_W = 82;
const PADDLE_H = 12;
const MAX_SPEED = 560;
const MIN_H_SPEED = 92;

const patterns = [
  ['111111111','111111111','111111111'],
  ['001111100','011111110','111111111','011111110'],
  ['100000001','010000010','001000100','000101000','001000100','010000010','100000001'],
  ['111111111','100000001','101110101','100000001','111111111'],
  ['001111100','011111110','111111111','111111111','011111110','001111100'],
  ['100010001','010101010','001111100','111111111','001111100','010101010','100010001'],
  ['111111111','011111110','001111100','000111000','001111100','011111110','111111111'],
  ['110000011','111000111','011101110','001111100','011101110','111000111','110000011'],
  ['001001100','011011110','111111111','011111110','001111100','000111000'],
  ['111111111','101010101','111111111','001111100','011111110','001111100'],
  ['100000001','110000011','111000111','111101111','111111111'],
  ['111000111','110101011','100111001','001111100','000110000'],
  ['001111100','011001110','110000011','111000111','111111111'],
  ['111111111','100110001','101111101','100110001','111111111'],
  ['000111000','001111100','011111110','111111111','011111110','001111100','000111000'],
  ['110110110','111111111','001111100','111111111','110110110'],
  ['111111111','111000111','110000011','100000001','110000011','111000111','111111111'],
  ['000111000','001111100','011011110','110111011','111111111','110111011'],
  ['111111111','011111110','001001100','111111111','001001100','011111110'],
  ['100010001','110111011','111111111','001111100','111111111','110111011'],
  ['011111110','110110011','111111111','111001111','011111110'],
  ['111001111','110111011','101111101','011111110','001111100'],
  ['110000011','111100111','111111111','011111110','001111100','000110000'],
  ['001111100','111111111','101001101','111111111','001111100'],
  ['111111111','100000001','111011111','101111101','111011111','100000001','111111111'],
  ['001001100','011111110','111001111','111111111','111001111','011111110'],
  ['111111111','111111111','100110001','101111101','100110001','111111111'],
  ['000111000','011111110','111111111','110111011','100110001','000110000'],
  ['111111111','101111101','100110001','111111111','001111100','000110000'],
  ['111000111','111111111','001111100','111111111','111000111'],
  ['100000001','111000111','111111111','110111011','100110001','000110000'],
  ['111111111','001001100','111111111','011111110','111111111','001001100'],
  ['110110011','111111111','011111110','111111111','110011011','100000001'],
  ['111111111','100111001','111111111','001111100','111111111','100111001'],
  ['011111110','111111111','110110011','111111111','011111110','001111100'],
  ['111111111','111001111','101111101','011111110','001111100','011111110'],
  ['001111100','011111110','111111111','110110011','111111111','001111100'],
  ['111111111','111111111','011111110','001111100','011111110','111111111'],
];

function createStage(stage, endless = false) {
  const index = (stage - 1) % patterns.length;
  const cycle = Math.floor((stage - 1) / patterns.length);
  const rows = patterns[index];
  const bricks = [];
  const cols = 9;
  const totalW = cols * BRICK_W + (cols - 1) * BRICK_GAP;
  const left = (WIDTH - totalW) / 2;
  const startY = 112;
  rows.forEach((row, ri) => [...row].forEach((bit, ci) => {
    if (bit !== '1') return;
    const tough = stage >= 6 && ((ri + ci + stage) % 7 === 0 || (cycle > 0 && (ri + ci) % 5 === 0));
    bricks.push({ x: left + ci * (BRICK_W + BRICK_GAP), y: startY + ri * (BRICK_H + BRICK_GAP), w: BRICK_W, h: BRICK_H, hp: tough ? Math.min(2 + Math.floor(cycle / 3), 3) : 1, maxHp: tough ? Math.min(2 + Math.floor(cycle / 3), 3) : 1, kind: tough ? 'tough' : 'normal', alive: true });
  }));
  const speed = Math.min(310 + (stage - 1) * 8 + (endless ? 18 : 0), MAX_SPEED - 30);
  return { bricks, speed, index: stage };
}

function makeBall(x, y, speed, vxSign = 1) {
  speed = Math.min(MAX_SPEED, Math.max(200, speed));
  const vx = Math.min(speed * 0.72, Math.max(MIN_H_SPEED, speed * 0.42)) * vxSign;
  const vy = -Math.sqrt(Math.max(1, speed * speed - vx * vx));
  return { x, y, vx, vy, r: BALL_R, trail: [] };
}

function createRun(mode = 'classic', height = 820) {
  const stage = 1;
  const layout = createStage(stage, mode === 'endless');
  return {
    mode, width: WIDTH, height, phase: 'ready', score: 0, stage, lives: mode === 'zen' ? Infinity : 3,
    paddle: { x: WIDTH / 2, y: height - 122, w: PADDLE_W, h: PADDLE_H, previousX: WIDTH / 2 },
    balls: [], bricks: layout.bricks, speed: mode === 'zen' ? layout.speed * 0.78 : layout.speed,
    combo: 0, comboTimer: 0, rally: 0, clearTimer: 0, shake: 0, paddleFlash: 0, lastEvent: 'ready',
    particles: [], shield: 0, elapsed: 0,
  };
}

function attachBall(run) {
  run.balls = [makeBall(run.paddle.x, run.paddle.y - 16, run.speed)];
  run.phase = 'ready';
}

function launch(run) {
  if (run.phase !== 'ready') return false;
  if (!run.balls.length) attachBall(run);
  run.phase = 'running';
  run.lastEvent = 'launch';
  return true;
}

function movePaddle(run, x) {
  run.paddle.previousX = run.paddle.x;
  run.paddle.x = Math.max(run.paddle.w / 2 + 7, Math.min(WIDTH - run.paddle.w / 2 - 7, x));
  if (run.phase === 'ready' && run.balls.length) {
    run.balls[0].x = run.paddle.x;
    run.balls[0].y = run.paddle.y - 16;
  }
}

function pause(run) { if (run.phase === 'running' || run.phase === 'ready') { run.resumePhase = run.phase; run.phase = 'paused'; } }
function resume(run) { if (run.phase === 'paused') { run.phase = run.resumePhase || 'running'; run.resumePhase = null; } }

function paddleBounce(ball, paddle, height = 820, maxSpeed = MAX_SPEED) {
  const rel = Math.max(-1, Math.min(1, (ball.x - paddle.x) / (paddle.w / 2)));
  const speed = Math.min(maxSpeed, Math.max(200, Math.hypot(ball.vx, ball.vy) * 1.015));
  const influence = Math.max(-34, Math.min(34, (paddle.x - paddle.previousX) * 0.20));
  let angle = rel * 1.02 + influence / speed;
  const maxAngle = Math.PI / 2 - 0.19;
  angle = Math.max(-maxAngle, Math.min(maxAngle, angle));
  let vx = Math.sin(angle) * speed;
  if (Math.abs(vx) < MIN_H_SPEED) vx = Math.sign(vx || (rel < 0 ? -1 : 1)) * Math.min(MIN_H_SPEED, speed * 0.72);
  const vy = -Math.sqrt(Math.max(1, speed * speed - vx * vx));
  ball.vx = vx; ball.vy = vy;
  ball.y = paddle.y - ball.r - 0.2;
  return { rel, speed };
}

function circleRect(ball, rect) {
  const px = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
  const py = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
  const dx = ball.x - px, dy = ball.y - py;
  const d2 = dx * dx + dy * dy;
  if (d2 >= ball.r * ball.r) return null;
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    return { nx: dx / d, ny: dy / d, overlap: ball.r - d };
  }
  const sides = [
    { d: Math.abs(ball.x - rect.x), nx: -1, ny: 0 }, { d: Math.abs(rect.x + rect.w - ball.x), nx: 1, ny: 0 },
    { d: Math.abs(ball.y - rect.y), nx: 0, ny: -1 }, { d: Math.abs(rect.y + rect.h - ball.y), nx: 0, ny: 1 },
  ].sort((a,b) => a.d - b.d);
  return { nx: sides[0].nx, ny: sides[0].ny, overlap: ball.r + sides[0].d };
}

function resolveBallStep(ball, run, dt) {
  const maxComponent = Math.max(Math.abs(ball.vx), Math.abs(ball.vy));
  const slices = Math.max(1, Math.ceil(maxComponent * dt / (ball.r * 0.55)));
  const step = dt / slices;
  let events = [];
  for (let i = 0; i < slices; i++) {
    const oldY = ball.y;
    ball.x += ball.vx * step;
    ball.y += ball.vy * step;
    if (ball.x - ball.r < 6) { ball.x = 6 + ball.r; ball.vx = Math.abs(ball.vx); events.push('wall'); }
    else if (ball.x + ball.r > WIDTH - 6) { ball.x = WIDTH - 6 - ball.r; ball.vx = -Math.abs(ball.vx); events.push('wall'); }
    if (ball.y - ball.r < 75) { ball.y = 75 + ball.r; ball.vy = Math.abs(ball.vy); events.push('wall'); }

    const p = run.paddle;
    if (ball.vy > 0 && oldY + ball.r <= p.y && ball.y + ball.r >= p.y && ball.x >= p.x - p.w / 2 - ball.r && ball.x <= p.x + p.w / 2 + ball.r) {
      const data = paddleBounce(ball, p);
      run.rally++;
      run.paddleFlash = 0.18;
      run.comboTimer = 2.2;
      events.push(data.rel > 0.78 || data.rel < -0.78 ? 'paddleEdge' : 'paddle');
    }

    for (const brick of run.bricks) {
      if (!brick.alive) continue;
      const hit = circleRect(ball, brick);
      if (!hit) continue;
      ball.x += hit.nx * hit.overlap;
      ball.y += hit.ny * hit.overlap;
      if (ball.vx * hit.nx + ball.vy * hit.ny < 0) {
        if (Math.abs(hit.nx) > 0.72) ball.vx *= -1;
        else if (Math.abs(hit.ny) > 0.55) ball.vy *= -1;
        else { ball.vx *= -1; ball.vy *= -1; }
      }
      brick.hp--;
      run.combo = run.comboTimer > 0 ? run.combo + 1 : 1;
      run.comboTimer = 2.2;
      run.score += (brick.hp <= 0 ? 10 : 4) * Math.min(5, 1 + Math.floor((run.combo - 1) / 4));
      if (brick.hp <= 0) {
        brick.alive = false;
        const count = brick.kind === 'tough' ? 9 : 5;
        for (let n=0;n<count;n++) { const angle=(Math.PI*2*n/count)+(run.stage*.31); const speed=35+(n%3)*18; run.particles.push({x:ball.x,y:ball.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.28+(n%3)*.07,maxLife:.42,color:brick.kind==='tough'?'#e4d6be':brick.y%3===0?'#f3bb67':'#75c9bd'}); }
        if (brick.kind === 'tough') run.shake = Math.max(run.shake, 2.3);
        events.push(brick.kind === 'tough' ? 'toughBreak' : 'brick');
      } else events.push('toughHit');
      run.lastEvent = events[events.length - 1];
      break;
    }
  }
  return events;
}

function resetAfterLoss(run) {
  run.lives--;
  run.lastEvent = 'lifeLost'; run.shake = 5; run.combo = 0; run.rally = 0;
  if (run.lives <= 0) { run.phase = 'gameover'; run.balls = []; return; }
  run.paddle.x = WIDTH / 2; run.paddle.previousX = run.paddle.x;
  attachBall(run);
}

function tick(run, dt) {
  dt = Math.min(0.05, Math.max(0, dt));
  if (run.phase === 'stageclear') {
    run.clearTimer -= dt;
    if (run.clearTimer <= 0) {
      run.stage++;
      const layout = createStage(run.stage, run.mode === 'endless');
      run.bricks = layout.bricks;
      run.speed = run.mode === 'zen' ? layout.speed * 0.78 : layout.speed;
      run.paddle.x = WIDTH / 2; run.paddle.previousX = run.paddle.x;
      run.rally = 0; attachBall(run);
      if (run.mode === 'zen') run.lives = Infinity;
    }
    return [];
  }
  if (run.phase !== 'running') return [];
  run.elapsed += dt;
  run.comboTimer = Math.max(0, run.comboTimer - dt);
  run.shake = Math.max(0, run.shake - dt * 18);
  run.paddleFlash = Math.max(0, run.paddleFlash - dt);
  for (const p of run.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; p.vy *= 0.985; p.life -= dt; }
  run.particles = run.particles.filter(p => p.life > 0);
  const events = [];
  for (const ball of [...run.balls]) {
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > MAX_SPEED) { const k = MAX_SPEED / speed; ball.vx *= k; ball.vy *= k; }
    const found = resolveBallStep(ball, run, dt);
    events.push(...found);
    ball.trail.unshift({ x: ball.x, y: ball.y });
    if (ball.trail.length > 9) ball.trail.length = 9;
  }
  run.balls = run.balls.filter(ball => ball.y - ball.r <= run.height + 2);
  if (!run.balls.length) { resetAfterLoss(run); events.push(run.phase === 'gameover' ? 'gameover' : 'lifeLost'); }
  if (run.phase !== 'gameover' && run.bricks.every(b => !b.alive)) {
    run.phase = 'stageclear'; run.clearTimer = 1.25; run.score += 100 + run.rally * 2; run.lastEvent = 'stageClear'; events.push('stageClear');
  }
  return events;
}

function getBreakableCount(run) { return run.bricks.reduce((n,b) => n + (b.alive ? 1 : 0), 0); }


const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d', { alpha: false });
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const defaults = { sound: true, haptics: true, reducedMotion: prefersReduced.matches };
let settings = { ...defaults, ...read('qb-settings', {}) };
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
const reducedMotionMedia = prefersReduced;

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
  ctx.shadowColor='rgba(245,178,93,.48)';ctx.shadowBlur=13;
  rounded(p.x-p.w/2,y,p.w,p.h,6,glow,'rgba(255,233,186,.65)',.7);ctx.shadowBlur=0;
  rounded(p.x-p.w/2+7,y+3,p.w-14,2,1,'rgba(255,255,255,.48)');
}
function drawParticles() {
  for(const p of run.particles) { const alpha=Math.max(0,p.life/p.maxLife); ctx.globalAlpha=alpha;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,1.2+alpha*.7,0,Math.PI*2);ctx.fill(); } ctx.globalAlpha=1;
}
function drawBall(ball) {
  if(!settings.reducedMotion) {
    for(let i=ball.trail.length-1;i>=0;i--) { const a=(1-i/ball.trail.length)*.15; ctx.fillStyle=`rgba(255,198,110,${a})`;ctx.beginPath();ctx.arc(ball.trail[i].x,ball.trail[i].y,ball.r*(.35+.42*(1-i/ball.trail.length)),0,Math.PI*2);ctx.fill(); }
  }
  const g=ctx.createRadialGradient(ball.x-2,ball.y-3,1,ball.x,ball.y,ball.r*2.7);g.addColorStop(0,'#fffef7');g.addColorStop(.24,'#fff2cb');g.addColorStop(.52,'#ffd77e');g.addColorStop(1,'rgba(252,169,65,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r*2.7,0,Math.PI*2);ctx.fill();
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
  button(`REDUCED MOTION  ${settings.reducedMotion?'ON':'OFF'}`,26,y+132,368,52,'motion','secondary');
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
  run=createRun(mode,logicalHeight);run.paddle.y=logicalHeight-122;attachBall(run);screen='game';
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
  if(name==='motion') { settings.reducedMotion=!settings.reducedMotion;save('qb-settings',settings);return; }
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
