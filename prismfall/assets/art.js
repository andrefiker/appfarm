/* Prismfall art module.
 * All art is generated procedurally from ONE style reference ("soft candy-paper"):
 *   rounded tile, top-lit vertical gradient, glossy top band, thin darker rim,
 *   tiny deterministic paper speckle. Every theme reuses this recipe with a new palette.
 * tools/export-art.mjs renders the same functions to PNGs in assets/sprites/.
 */
(function () {
  'use strict';

  const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

  const THEMES = [
    { id: 'paper', name: 'Morning Paper', unlock: 1,
      colors: { I: '#4fc3e6', O: '#f6c443', T: '#a98bef', S: '#62c987', Z: '#f17575', J: '#6a8cf3', L: '#f49d55' },
      bgTop: '#fff8ee', bgBot: '#e8f2fb', board: '#ffffff', grid: 'rgba(60,80,120,0.07)', accent: '#5b7cf0', ink: '#2b3350' },
    { id: 'candy', name: 'Candy Shop', unlock: 2,
      colors: { I: '#5ed6e0', O: '#ffd36e', T: '#e58bf0', S: '#86e0a0', Z: '#ff7fa3', J: '#8d9cff', L: '#ffad7a' },
      bgTop: '#fff0f6', bgBot: '#f0efff', board: '#fffafd', grid: 'rgba(160,60,120,0.07)', accent: '#e0569a', ink: '#40284a' },
    { id: 'seaglass', name: 'Sea Glass', unlock: 3,
      colors: { I: '#74cdca', O: '#e6d184', T: '#a5b2e3', S: '#93d1a0', Z: '#e79a92', J: '#79a1d6', L: '#e4b483' },
      bgTop: '#effaf8', bgBot: '#e2eef4', board: '#fbfffe', grid: 'rgba(40,110,120,0.08)', accent: '#2f9a96', ink: '#23414a' },
    { id: 'citrus', name: 'Citrus Grove', unlock: 5,
      colors: { I: '#45c7ad', O: '#ffd23f', T: '#c08af2', S: '#98cf47', Z: '#ff6b4a', J: '#3fa4f2', L: '#ff9f1c' },
      bgTop: '#fffbe6', bgBot: '#eefaea', board: '#fffffb', grid: 'rgba(120,110,30,0.08)', accent: '#f08a00', ink: '#3b3a20' },
    { id: 'lavender', name: 'Lavender Field', unlock: 7,
      colors: { I: '#8ac6e4', O: '#f0cf82', T: '#b18bef', S: '#9fd6ae', Z: '#f098b2', J: '#8798ee', L: '#eeb087' },
      bgTop: '#f7f1ff', bgBot: '#ecf3ff', board: '#fefcff', grid: 'rgba(100,70,160,0.08)', accent: '#8a63e8', ink: '#352a52' },
    { id: 'prism', name: 'Prism', unlock: 9, prism: true,
      colors: { I: '#7fd6f0', O: '#ffe07a', T: '#c9a4ff', S: '#8fe6a8', Z: '#ff9aa8', J: '#93a8ff', L: '#ffbf85' },
      bgTop: '#fdf7ff', bgBot: '#eefaff', board: '#ffffff', grid: 'rgba(90,90,160,0.07)', accent: '#7a6cf0', ink: '#2d2f55' },
  ];

  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // amt > 0 lightens toward white, amt < 0 darkens toward black
  function shade(hex, amt) {
    const [r, g, b] = hexToRgb(hex);
    const f = (c) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }
  function rgba(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function canvas(w, h) {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w));
    cv.height = Math.max(1, Math.round(h || w));
    return cv;
  }
  function seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // The style reference: one tile.
  function drawTile(c, s, color, opts) {
    opts = opts || {};
    const pad = Math.max(1, s * 0.045);
    const r = s * 0.2;
    const w = s - pad * 2;
    // body gradient
    let g;
    if (opts.prismHue != null) {
      g = c.createLinearGradient(0, 0, s, s);
      const h = opts.prismHue;
      g.addColorStop(0, 'hsl(' + h + ',90%,86%)');
      g.addColorStop(0.5, 'hsl(' + ((h + 40) % 360) + ',80%,74%)');
      g.addColorStop(1, 'hsl(' + ((h + 80) % 360) + ',70%,66%)');
    } else {
      g = c.createLinearGradient(0, 0, 0, s);
      g.addColorStop(0, shade(color, 0.32));
      g.addColorStop(0.55, color);
      g.addColorStop(1, shade(color, -0.16));
    }
    rr(c, pad, pad, w, w, r);
    c.fillStyle = g;
    c.fill();
    // rim
    c.lineWidth = Math.max(1, s * 0.045);
    c.strokeStyle = opts.prismHue != null ? 'rgba(90,80,160,0.35)' : shade(color, -0.32).replace('rgb', 'rgba').replace(')', ',0.55)');
    c.stroke();
    // inner bottom shade
    c.save();
    rr(c, pad, pad, w, w, r);
    c.clip();
    const sh = c.createLinearGradient(0, s * 0.6, 0, s);
    sh.addColorStop(0, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(40,30,80,0.14)');
    c.fillStyle = sh;
    c.fillRect(0, 0, s, s);
    // gloss band
    const gl = c.createLinearGradient(0, pad, 0, s * 0.48);
    gl.addColorStop(0, 'rgba(255,255,255,0.62)');
    gl.addColorStop(1, 'rgba(255,255,255,0.04)');
    rr(c, pad + s * 0.1, pad + s * 0.07, w - s * 0.2, s * 0.34, r * 0.7);
    c.fillStyle = gl;
    c.fill();
    // paper speckle (deterministic per colour)
    const rnd = seeded(hexToRgb(color).reduce((a, b) => a * 31 + b, 7));
    for (let i = 0; i < 7; i++) {
      c.fillStyle = 'rgba(255,255,255,' + (0.18 + rnd() * 0.2) + ')';
      c.beginPath();
      c.arc(pad + rnd() * w, s * 0.45 + rnd() * s * 0.45, Math.max(0.5, s * 0.018), 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    // shine dot
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath();
    c.arc(pad + s * 0.2, pad + s * 0.18, Math.max(0.8, s * 0.05), 0, Math.PI * 2);
    c.fill();
  }

  function drawGem(c, s) {
    const cx = s / 2, cy = s * 0.52;
    const rw = s * 0.27, rt = s * 0.25, rb = s * 0.3;
    const top = [cx, cy - rt], right = [cx + rw, cy - s * 0.04], bot = [cx, cy + rb], left = [cx - rw, cy - s * 0.04];
    c.save();
    c.shadowColor = 'rgba(80,140,255,0.45)';
    c.shadowBlur = s * 0.12;
    c.beginPath();
    c.moveTo(top[0], top[1]); c.lineTo(right[0], right[1]); c.lineTo(bot[0], bot[1]); c.lineTo(left[0], left[1]); c.closePath();
    const g = c.createLinearGradient(left[0], top[1], right[0], bot[1]);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#bdf1ff');
    g.addColorStop(1, '#6fb8ff');
    c.fillStyle = g;
    c.fill();
    c.restore();
    c.lineWidth = Math.max(1, s * 0.035);
    c.strokeStyle = '#ffffff';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(top[0], top[1]); c.lineTo(right[0], right[1]); c.lineTo(bot[0], bot[1]); c.lineTo(left[0], left[1]); c.closePath();
    c.stroke();
    // facets
    c.lineWidth = Math.max(0.6, s * 0.02);
    c.strokeStyle = 'rgba(70,130,220,0.55)';
    c.beginPath();
    c.moveTo(left[0], left[1]); c.lineTo(right[0], right[1]);
    c.moveTo(cx - rw * 0.45, left[1]); c.lineTo(cx, bot[1]);
    c.moveTo(cx + rw * 0.45, left[1]); c.lineTo(cx, bot[1]);
    c.moveTo(cx - rw * 0.45, left[1]); c.lineTo(cx, top[1]);
    c.moveTo(cx + rw * 0.45, left[1]); c.lineTo(cx, top[1]);
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.beginPath();
    c.moveTo(cx - rw * 0.55, cy - s * 0.08); c.lineTo(cx - rw * 0.15, cy - rt * 0.7); c.lineTo(cx - rw * 0.1, cy - s * 0.08); c.closePath();
    c.fill();
  }

  function drawGhost(c, s, color) {
    const pad = Math.max(1, s * 0.08);
    rr(c, pad, pad, s - pad * 2, s - pad * 2, s * 0.18);
    c.fillStyle = rgba(color, 0.16);
    c.fill();
    c.lineWidth = Math.max(1, s * 0.06);
    c.strokeStyle = rgba(color, 0.7);
    c.setLineDash([s * 0.16, s * 0.1]);
    c.stroke();
    c.setLineDash([]);
  }

  function themeById(id) {
    return THEMES.find((t) => t.id === id) || THEMES[0];
  }

  // Returns { I..L: canvas, gem: canvas, ghost: {I..L}, grey: canvas, size }
  function buildTileSet(themeId, size) {
    const th = themeById(themeId);
    const s = Math.max(4, Math.round(size));
    const set = { size: s, ghost: {} };
    TYPES.forEach((t, i) => {
      const cv = canvas(s);
      drawTile(cv.getContext('2d'), s, th.colors[t], th.prism ? { prismHue: (i * 51 + 190) % 360 } : null);
      set[t] = cv;
      const gv = canvas(s);
      drawGhost(gv.getContext('2d'), s, th.colors[t]);
      set.ghost[t] = gv;
    });
    const gem = canvas(s);
    drawGem(gem.getContext('2d'), s);
    set.gem = gem;
    const grey = canvas(s);
    drawTile(grey.getContext('2d'), s, '#c9cbd6');
    set.grey = grey;
    return set;
  }

  // Sprite sheet for a theme: 7 tiles + gem-on-tile + ghost row
  function buildSheet(themeId, s) {
    const th = themeById(themeId);
    const cv = canvas(s * 8, s * 2);
    const c = cv.getContext('2d');
    const set = buildTileSet(themeId, s);
    TYPES.forEach((t, i) => {
      c.drawImage(set[t], i * s, 0);
      c.drawImage(set.ghost[t], i * s, s);
    });
    c.drawImage(set.T, 7 * s, 0);
    c.drawImage(set.gem, 7 * s, 0);
    c.drawImage(set.grey, 7 * s, s);
    cv.dataset.theme = th.id;
    return cv;
  }

  // App icon: a T piece and an I piece in a light card, with a gem.
  function buildIcon(px) {
    const cv = canvas(px);
    const c = cv.getContext('2d');
    const th = THEMES[0];
    rr(c, px * 0.04, px * 0.04, px * 0.92, px * 0.92, px * 0.2);
    const bg = c.createLinearGradient(0, 0, 0, px);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(1, '#e6f0fb');
    c.fillStyle = bg;
    c.fill();
    c.lineWidth = px * 0.02;
    c.strokeStyle = '#d5dcea';
    c.stroke();
    const s = px * 0.2;
    const tile = (col, x, y, gem) => {
      const t = canvas(s);
      drawTile(t.getContext('2d'), s, col);
      if (gem) drawGem(t.getContext('2d'), s);
      c.drawImage(t, x, y);
    };
    const ox = px * 0.2, oy = px * 0.11;
    // T piece (top)
    tile(th.colors.T, ox + s, oy, false);
    tile(th.colors.T, ox, oy + s, false);
    tile(th.colors.T, ox + s, oy + s, true);
    tile(th.colors.T, ox + s * 2, oy + s, false);
    // I piece (bottom)
    for (let i = 0; i < 3; i++) tile(th.colors.I, ox + s * i, oy + s * 2.15, false);
    tile(th.colors.O, ox + s * 0, oy + s * 3.15 - s * 0.1, false);
    tile(th.colors.Z, ox + s * 2, oy + s * 3.15 - s * 0.1, false);
    return cv;
  }

  window.PFArt = { THEMES, TYPES, themeById, buildTileSet, buildSheet, buildIcon, drawTile, drawGem, shade, rgba, roundRect: rr };
})();
