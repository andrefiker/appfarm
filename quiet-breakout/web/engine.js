export const WIDTH = 420;
export const BRICK_W = 42;
export const BRICK_H = 17;
export const BRICK_GAP = 4;
export const BALL_R = 6;
export const PADDLE_W = 82;
export const PADDLE_H = 12;
export const MAX_SPEED = 560;
export const COMFORT_SPEED_CAP = 320;
export const MIN_H_SPEED = 92;

function comfortSpeedFor(stage, mode) {
  const speed = Math.min(245 + (stage - 1) * 2.4, COMFORT_SPEED_CAP);
  return mode === 'zen' ? Math.max(200, speed * 0.78) : speed;
}

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

export function createStage(stage, endless = false) {
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

export function makeBall(x, y, speed, vxSign = 1) {
  speed = Math.min(MAX_SPEED, Math.max(200, speed));
  const vx = Math.min(speed * 0.72, Math.max(MIN_H_SPEED, speed * 0.42)) * vxSign;
  const vy = -Math.sqrt(Math.max(1, speed * speed - vx * vx));
  return { x, y, vx, vy, r: BALL_R, trail: [] };
}

export function createRun(mode = 'classic', height = 820, options = {}) {
  const stage = 1;
  const layout = createStage(stage, mode === 'endless');
  const comfortMode = Boolean(options.comfortMode);
  const speed = comfortMode ? comfortSpeedFor(stage, mode) : mode === 'zen' ? layout.speed * 0.78 : layout.speed;
  return {
    mode, width: WIDTH, height, phase: 'ready', score: 0, stage, lives: mode === 'zen' ? Infinity : 3,
    paddle: { x: WIDTH / 2, y: height - 122, w: PADDLE_W, h: PADDLE_H, previousX: WIDTH / 2 },
    balls: [], bricks: layout.bricks, speed, speedCap: comfortMode ? COMFORT_SPEED_CAP : MAX_SPEED,
    comfortMode,
    combo: 0, comboTimer: 0, rally: 0, clearTimer: 0, shake: 0, paddleFlash: 0, lastEvent: 'ready',
    particles: [], shield: 0, elapsed: 0,
  };
}

export function setComfortMode(run, enabled) {
  run.comfortMode = Boolean(enabled);
  run.speedCap = run.comfortMode ? COMFORT_SPEED_CAP : MAX_SPEED;
  const layout = createStage(run.stage, run.mode === 'endless');
  run.speed = run.comfortMode ? comfortSpeedFor(run.stage, run.mode) : run.mode === 'zen' ? layout.speed * 0.78 : layout.speed;
  if (run.comfortMode) {
    run.shake = 0;
    run.paddleFlash = 0;
    run.particles = [];
    for (const ball of run.balls) {
      ball.trail = [];
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed > run.speed) {
        const k = run.speed / speed;
        ball.vx *= k;
        ball.vy *= k;
      }
    }
  } else {
    for (const ball of run.balls) {
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed < run.speed) {
        const k = run.speed / speed;
        ball.vx *= k;
        ball.vy *= k;
      }
    }
  }
}

export function attachBall(run) {
  run.balls = [makeBall(run.paddle.x, run.paddle.y - 16, run.speed)];
  run.phase = 'ready';
}

export function launch(run) {
  if (run.phase !== 'ready') return false;
  if (!run.balls.length) attachBall(run);
  run.phase = 'running';
  run.lastEvent = 'launch';
  return true;
}

export function movePaddle(run, x) {
  run.paddle.previousX = run.paddle.x;
  run.paddle.x = Math.max(run.paddle.w / 2 + 7, Math.min(WIDTH - run.paddle.w / 2 - 7, x));
  if (run.phase === 'ready' && run.balls.length) {
    run.balls[0].x = run.paddle.x;
    run.balls[0].y = run.paddle.y - 16;
  }
}

export function pause(run) { if (run.phase === 'running' || run.phase === 'ready') { run.resumePhase = run.phase; run.phase = 'paused'; } }
export function resume(run) { if (run.phase === 'paused') { run.phase = run.resumePhase || 'running'; run.resumePhase = null; } }

export function paddleBounce(ball, paddle, height = 820, maxSpeed = MAX_SPEED) {
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

export function resolveBallStep(ball, run, dt) {
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
      const data = paddleBounce(ball, p, run.height, run.speedCap || MAX_SPEED);
      run.rally++;
      run.paddleFlash = run.comfortMode ? 0 : 0.18;
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
        if (!run.comfortMode) {
          const count = brick.kind === 'tough' ? 9 : 5;
          for (let n=0;n<count;n++) { const angle=(Math.PI*2*n/count)+(run.stage*.31); const speed=35+(n%3)*18; run.particles.push({x:ball.x,y:ball.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.28+(n%3)*.07,maxLife:.42,color:brick.kind==='tough'?'#e4d6be':brick.y%3===0?'#f3bb67':'#75c9bd'}); }
          if (brick.kind === 'tough') run.shake = Math.max(run.shake, 2.3);
        }
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
  run.lastEvent = 'lifeLost'; run.shake = run.comfortMode ? 0 : 5; run.combo = 0; run.rally = 0;
  if (run.lives <= 0) { run.phase = 'gameover'; run.balls = []; return; }
  run.paddle.x = WIDTH / 2; run.paddle.previousX = run.paddle.x;
  attachBall(run);
}

export function tick(run, dt) {
  dt = Math.min(0.05, Math.max(0, dt));
  if (run.phase === 'stageclear') {
    run.clearTimer -= dt;
    if (run.clearTimer <= 0) {
      run.stage++;
      const layout = createStage(run.stage, run.mode === 'endless');
      run.bricks = layout.bricks;
      run.speed = run.comfortMode
        ? comfortSpeedFor(run.stage, run.mode)
        : run.mode === 'zen' ? layout.speed * 0.78 : layout.speed;
      run.paddle.x = WIDTH / 2; run.paddle.previousX = run.paddle.x;
      run.rally = 0; attachBall(run);
      if (run.mode === 'zen') run.lives = Infinity;
    }
    return [];
  }
  if (run.phase !== 'running') return [];
  run.elapsed += dt;
  run.comboTimer = Math.max(0, run.comboTimer - dt);
  run.shake = run.comfortMode ? 0 : Math.max(0, run.shake - dt * 18);
  run.paddleFlash = Math.max(0, run.paddleFlash - dt);
  for (const p of run.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; p.vy *= 0.985; p.life -= dt; }
  run.particles = run.particles.filter(p => p.life > 0);
  const events = [];
  for (const ball of [...run.balls]) {
    const speed = Math.hypot(ball.vx, ball.vy);
    const speedCap = run.speedCap || MAX_SPEED;
    if (speed > speedCap) { const k = speedCap / speed; ball.vx *= k; ball.vy *= k; }
    const found = resolveBallStep(ball, run, dt);
    events.push(...found);
    ball.trail.unshift({ x: ball.x, y: ball.y });
    if (run.comfortMode) ball.trail.length = 0;
    else if (ball.trail.length > 9) ball.trail.length = 9;
  }
  run.balls = run.balls.filter(ball => ball.y - ball.r <= run.height + 2);
  if (!run.balls.length) { resetAfterLoss(run); events.push(run.phase === 'gameover' ? 'gameover' : 'lifeLost'); }
  if (run.phase !== 'gameover' && run.bricks.every(b => !b.alive)) {
    run.phase = 'stageclear'; run.clearTimer = 1.25; run.score += 100 + run.rally * 2; run.lastEvent = 'stageClear'; events.push('stageClear');
  }
  return events;
}

export function getBreakableCount(run) { return run.bricks.reduce((n,b) => n + (b.alive ? 1 : 0), 0); }
