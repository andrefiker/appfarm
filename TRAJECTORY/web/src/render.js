import { heightAt, rng } from "./terrain.js";
import { WEAPONS, radians } from "./weapons.js";
import { trace, targetPosition } from "./physics.js";
import { launch } from "./weapons.js";
export function cameraTarget(g, motion) {
  const p = motion ? g.projectiles[0] : null;
  return {
    x: p ? Math.max(450, Math.min(550, p.x)) : 500,
    y: p ? Math.min(0, p.y - 80) : 0,
    z: p ? 1.12 : 1,
  };
}
function trailPath(c, points) {
  const groups = new Map();
  for (const p of points) {
    const key = p.path || 0;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  c.beginPath();
  for (const group of groups.values())
    group.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
  c.stroke();
}
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.fx = [];
    this.ghost = [];
    this.camera = { x: 500, y: 0, z: 1 };
    this.aimCache = "";
    this.preview = [];
    this.last = 0;
    this.recoil = [0, 0];
  }
  resize() {
    const r = this.canvas.getBoundingClientRect(),
      d = Math.min(devicePixelRatio || 1, 2);
    if (
      this.canvas.width !== Math.round(r.width * d) ||
      this.canvas.height !== Math.round(r.height * d)
    ) {
      this.canvas.width = Math.round(r.width * d);
      this.canvas.height = Math.round(r.height * d);
    }
    this.w = r.width;
    this.h = r.height;
    this.dpr = d;
  }
  events(events, motion = true) {
    for (const e of events) {
      if (e.type === "blast") {
        this.fx.push({ ...e, life: 1, total: 1 });
        if (motion) {
          const r = rng((e.x * 111 + e.y * 57) | 0);
          for (let i = 0; i < 22; i++)
            this.fx.push({
              type: "debris",
              x: e.x,
              y: e.y,
              vx: (r() - 0.5) * 160,
              vy: -r() * 180,
              life: 0.5 + r() * 0.6,
              total: 1,
            });
        }
      }
      if (e.type === "damage") this.fx.push({ ...e, life: 1.4, total: 1.4 });
      if (e.type === "fire") {
        this.recoil[e.unit] = 1;
        this.ghost = [];
      }
    }
  }
  worldPoint(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left - this.w / 2) / this.s + this.camera.x,
      y: (clientY - r.top - this.base) / this.s + this.camera.y,
    };
  }
  draw(g, ui, dt = 1 / 60) {
    this.resize();
    const c = this.ctx,
      w = this.w,
      h = this.h;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#081b30");
    sky.addColorStop(0.58, "#344b61");
    sky.addColorStop(1, "#d3966d");
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);
    const rs = rng(894);
    for (let i = 0; i < 38; i++) {
      const x = rs() * w,
        y = rs() * h * 0.56;
      c.fillStyle = `rgba(233,236,232,${0.12 + rs() * 0.4})`;
      c.fillRect(x, y, 1, 1);
    }
    c.fillStyle = "#f7d5aa";
    c.beginPath();
    c.arc(w * 0.78, h * 0.18, 15, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#1b3047";
    c.beginPath();
    c.arc(w * 0.78 - 5, h * 0.18 - 4, 14, 0, Math.PI * 2);
    c.fill();
    const goal = cameraTarget(g, ui.motion);
    if (!ui.motion) this.camera = { ...goal };
    else {
      const ease = Math.min(1, dt * 3);
      for (const k of ["x", "y", "z"])
        this.camera[k] += (goal[k] - this.camera[k]) * ease;
    }
    this.s = (w / 1000) * this.camera.z;
    this.base = h * 0.79 - 420 * this.s;
    // Three silhouette layers drift a little with the flight camera.
    for (let layer = 0; layer < 3; layer++) {
      const rr = rng(111 + layer * 99);
      c.fillStyle = ["#4c5866", "#48505a", "#333e4b"][layer];
      c.beginPath();
      c.moveTo(0, h);
      for (let i = 0; i <= 35; i++) {
        const x = (i / 35) * w,
          y =
            h * 0.6 +
            layer * h * 0.065 -
            (rr() * 75 + Math.sin(i * 0.8) * 20) * (1 - layer * 0.12);
        const xx = x - (this.camera.x - 500) * this.s * 0.12,
          yy = y - this.camera.y * this.s * 0.1;
        if (i === 0) c.lineTo(xx, yy);
        else c.quadraticCurveTo(xx - w / 70, yy + 8, xx, yy);
      }
      c.lineTo(w, h);
      c.closePath();
      c.fill();
    }
    const haze = c.createLinearGradient(0, h * 0.45, 0, h * 0.85);
    haze.addColorStop(0, "rgba(217,157,111,0)");
    haze.addColorStop(0.65, "rgba(217,157,111,.13)");
    haze.addColorStop(1, "rgba(217,157,111,0)");
    c.fillStyle = haze;
    c.fillRect(0, h * 0.4, w, h * 0.5);
    c.save();
    const shake = ui.motion
      ? this.fx
          .filter((f) => f.type === "blast")
          .reduce((a, b) => Math.max(a, b.life), 0) * 3
      : 0;
    c.translate(
      w / 2 + Math.sin(g.time * 63) * shake,
      this.base + Math.cos(g.time * 79) * shake,
    );
    c.scale(this.s, this.s);
    c.translate(-this.camera.x, -this.camera.y);
    for (const o of g.obstacles) {
      c.fillStyle = "#253440";
      c.fillRect(o.x, o.y, o.w, o.h);
      c.strokeStyle = "#cdac83";
      c.lineWidth = 3;
      c.strokeRect(o.x, o.y, o.w, o.h);
      for (let y = o.y + 12; y < o.y + o.h; y += 18) {
        c.beginPath();
        c.moveTo(o.x, y);
        c.lineTo(o.x + o.w, y - 10);
        c.stroke();
      }
    }
    const earth = c.createLinearGradient(0, 300, 0, 650);
    earth.addColorStop(0, "#c88d62");
    earth.addColorStop(0.23, "#a56548");
    earth.addColorStop(1, "#352e35");
    c.fillStyle = earth;
    c.beginPath();
    c.moveTo(0, 700);
    g.terrain.forEach((y, i) => c.lineTo(i * 2, y));
    c.lineTo(1000, 700);
    c.closePath();
    c.fill();
    c.strokeStyle = "#e0a876";
    c.lineWidth = 2.5;
    c.beginPath();
    g.terrain.forEach((y, i) => (i ? c.lineTo(i * 2, y) : c.moveTo(0, y)));
    c.stroke();
    // Fine sediment contours are clipped to the ground, so excavation remains clean.
    c.save();
    c.beginPath();
    c.moveTo(0, 700);
    g.terrain.forEach((y, i) => c.lineTo(i * 2, y));
    c.lineTo(1000, 700);
    c.closePath();
    c.clip();
    const tr = rng(g.seed);
    c.strokeStyle = "rgba(36,29,36,.13)";
    c.lineWidth = 2;
    for (let y = 380; y < 700; y += 17) {
      c.beginPath();
      for (let x = 0; x <= 1000; x += 20)
        c.lineTo(x, y + Math.sin(x / 75 + y) * 7);
      c.stroke();
    }
    for (let i = 0; i < 180; i++) {
      c.fillStyle = "rgba(255,203,145,.09)";
      c.fillRect(tr() * 1000, 350 + tr() * 300, 2 + tr() * 6, 1.5);
    }
    c.restore();
    const player = g.units[0];
    if (g.phase === "aim" && g.turn === 0) {
      const full = g.mode === "practice" && ui.guide,
        key = [
          ui.angle,
          ui.power,
          ui.weapon,
          g.shots,
          g.seed,
          g.challenge,
          full,
        ].join(":");
      if (key !== this.aimCache) {
        this.preview = trace(
          g,
          launch(player, ui.angle, ui.power, ui.weapon),
        ).points;
        this.aimCache = key;
      }
      const pts = full ? this.preview : this.preview.filter((p, i) => i < 5);
      c.strokeStyle = full ? "rgba(255,209,138,.45)" : "#ffd18a";
      c.lineWidth = 3;
      c.setLineDash([5, 10]);
      trailPath(c, pts);
      c.setLineDash([]);
    }
    if (ui.lastTrail?.length) {
      c.strokeStyle = "rgba(255,215,166,.28)";
      c.lineWidth = 2;
      c.setLineDash([4, 9]);
      trailPath(c, ui.lastTrail);
      c.setLineDash([]);
    }
    if (!ui.menu)
      for (const u of g.units) {
        const pos = targetPosition(u, g.time);
        c.save();
        c.translate(pos.x, pos.y);
        const col = u.id === 0 ? "#ffd18a" : "#ff9a87";
        if (g.mode !== "duel" && u.id === 1) {
          c.strokeStyle = col;
          c.lineWidth = 3;
          for (const r of [u.radius + 4, (u.radius + 4) * 0.55]) {
            c.beginPath();
            c.arc(0, 0, r, 0, Math.PI * 2);
            c.stroke();
          }
          c.beginPath();
          c.moveTo(-25, 0);
          c.lineTo(25, 0);
          c.moveTo(0, -25);
          c.lineTo(0, 25);
          c.stroke();
          if (u.motion) {
            c.strokeStyle = "rgba(255,218,166,.3)";
            c.beginPath();
            c.moveTo(-40, 30);
            c.lineTo(40, 30);
            c.stroke();
          }
        } else {
          const angle = u.id === 0 ? ui.angle : ui.aiAngle || 48,
            a =
              -radians(angle) * (u.facing || 1) + (u.facing < 0 ? Math.PI : 0);
          c.fillStyle = "#0c1e29";
          c.beginPath();
          c.roundRect(-24, -4, 48, 16, 6);
          c.fill();
          c.strokeStyle = col;
          c.lineWidth = 2;
          c.stroke();
          c.fillStyle = "#0a1823";
          for (let j = -14; j <= 14; j += 14) {
            c.beginPath();
            c.arc(j, 6, 5, 0, Math.PI * 2);
            c.fill();
          }
          c.save();
          c.rotate(a);
          c.translate(-this.recoil[u.id] * 6, 0);
          c.fillStyle = "#172b34";
          c.fillRect(-6, -6, 41, 12);
          c.fillStyle = col;
          c.fillRect(28, -6, 7, 12);
          c.restore();
          c.fillStyle = "#21333c";
          c.beginPath();
          c.arc(0, -2, 13, Math.PI, Math.PI * 2);
          c.fill();
          if (this.recoil[u.id] > 0.7) {
            c.fillStyle = "#fff1c2";
            c.beginPath();
            c.arc(
              Math.cos(a) * 42,
              Math.sin(a) * 42,
              14 * this.recoil[u.id],
              0,
              Math.PI * 2,
            );
            c.fill();
          }
        }
        c.font = "600 25px system-ui";
        c.textAlign = "center";
        c.fillStyle = col;
        c.fillText(
          u.id === 0 ? "YOU" : g.mode === "duel" ? "RIVAL" : "TARGET",
          0,
          -44,
        );
        c.restore();
        this.recoil[u.id] = Math.max(0, this.recoil[u.id] - dt * 4);
      }
    for (const p of g.projectiles) {
      c.strokeStyle = WEAPONS[p.weapon].color;
      c.lineWidth = 3;
      c.beginPath();
      p.trail.forEach((v, i) => (i ? c.lineTo(v.x, v.y) : c.moveTo(v.x, v.y)));
      c.stroke();
      c.fillStyle = "#fff5d5";
      c.shadowColor = WEAPONS[p.weapon].color;
      c.shadowBlur = 14;
      c.beginPath();
      c.arc(p.x, p.y, 5, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;
    }
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.fx.splice(i, 1);
        continue;
      }
      const a = f.life / f.total;
      c.globalAlpha = a;
      if (f.type === "blast") {
        const r = f.r * (1 - a) * 1.45;
        c.fillStyle = "#ffd394";
        c.beginPath();
        c.arc(f.x, f.y, Math.max(2, r), 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "#fff1c7";
        c.lineWidth = 3;
        c.beginPath();
        c.arc(f.x, f.y, r * 1.3, 0, Math.PI * 2);
        c.stroke();
        c.fillStyle = "#fff7e2";
        c.beginPath();
        c.arc(f.x, f.y, r * 0.45, 0, Math.PI * 2);
        c.fill();
      } else if (f.type === "debris") {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vy += 180 * dt;
        c.fillStyle = "#e6b183";
        c.fillRect(f.x, f.y, 4, 4);
      } else if (f.type === "damage") {
        c.font = "bold 32px system-ui";
        c.textAlign = "center";
        c.fillStyle = f.unit === 1 ? "#ffe6b8" : "#ff9a87";
        c.fillText("−" + f.amount, f.x, f.y - 40 - (1 - a) * 45);
      }
      c.globalAlpha = 1;
    }
    c.restore();
    const head = g.projectiles[0];
    if (head) {
      const px = (head.x - this.camera.x) * this.s + w / 2,
        py = (head.y - this.camera.y) * this.s + this.base;
      if (py < 12) {
        c.fillStyle = "#ffd18a";
        c.textAlign = "center";
        c.font = "11px system-ui";
        c.fillText("↑ SHELL", Math.max(35, Math.min(w - 35, px)), 22);
      }
    }
    if (g.mode === "challenge" && g.challenge === 13) {
      const fog = c.createLinearGradient(0, h * 0.25, 0, h);
      fog.addColorStop(0, "rgba(30,45,62,0)");
      fog.addColorStop(0.5, "rgba(180,188,191,.32)");
      fog.addColorStop(1, "rgba(30,45,62,.04)");
      c.fillStyle = fog;
      c.fillRect(0, 0, w, h);
    }
    // Compass baseline and scale markers provide a quiet frame for the landscape.
    c.fillStyle = "rgba(234,215,189,.45)";
    c.font = "10px system-ui";
    c.textAlign = "left";
    c.fillText("100 m", 16, h - 18);
    c.strokeStyle = "rgba(234,215,189,.35)";
    c.beginPath();
    c.moveTo(16, h - 30);
    c.lineTo(16 + w * 0.1, h - 30);
    c.stroke();
  }
}
