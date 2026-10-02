/* Prismfall audio: every sound is synthesized live with the Web Audio API.
 * No audio files. Music is a small step sequencer whose layers react to
 * level, combo and Fever. */
(function () {
  'use strict';
  let ctx = null, master, musicBus, sfxBus, noiseBuf, timer = null;
  const vol = { music: 0.5, sfx: 0.7 };
  const M = { mode: 'off', bpm: 88, step: 0, next: 0, intensity: 1, fever: false, duck: 1 };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    master = ctx.createGain();
    master.gain.value = 0.9;
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus.connect(master);
    sfxBus.connect(master);
    master.connect(comp);
    comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVol();
    M.next = ctx.currentTime + 0.1;
    timer = setInterval(schedule, 25);
    return true;
  }
  function applyVol() {
    if (!ctx) return;
    const t = ctx.currentTime;
    musicBus.gain.setTargetAtTime(vol.music * 0.55 * M.duck, t, 0.08);
    sfxBus.gain.setTargetAtTime(vol.sfx, t, 0.03);
  }
  function setVolumes(m, s) {
    vol.music = m;
    vol.sfx = s;
    applyVol();
  }

  function env(g, t, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function osc(type, freq, t, dur, peak, dest, o) {
    o = o || {};
    const os = ctx.createOscillator();
    os.type = type;
    os.frequency.setValueAtTime(freq, t);
    if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || dur));
    if (o.detune) os.detune.value = o.detune;
    const g = ctx.createGain();
    env(g, t, o.a || 0.004, dur, peak);
    let node = os;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(o.lp, t);
      if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, t + dur);
      os.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(dest);
    os.start(t);
    os.stop(t + (o.a || 0.004) + dur + 0.05);
  }
  function noise(t, dur, peak, dest, o) {
    o = o || {};
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 2000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    env(g, t, o.a || 0.003, dur, peak);
    s.connect(f);
    f.connect(g);
    g.connect(dest);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.1);
  }

  // ---------------- SFX ----------------
  const S = {};
  const T = () => ctx.currentTime + 0.005;
  S.move = () => osc('triangle', 820, T(), 0.025, 0.07, sfxBus);
  S.rotate = () => osc('sine', 600, T(), 0.06, 0.11, sfxBus, { f2: 900 });
  S.buzz = () => osc('square', 120, T(), 0.06, 0.035, sfxBus, { lp: 600 });
  S.lock = () => { const t = T(); osc('triangle', 260, t, 0.05, 0.12, sfxBus, { f2: 190 }); noise(t, 0.03, 0.05, sfxBus, { type: 'highpass', freq: 3000 }); };
  S.hard = () => { const t = T(); osc('sine', 170, t, 0.2, 0.42, sfxBus, { f2: 42 }); noise(t, 0.09, 0.2, sfxBus, { type: 'lowpass', freq: 1500 }); };
  S.hold = () => { const t = T(); osc('sine', 523, t, 0.06, 0.1, sfxBus); osc('sine', 784, t + 0.05, 0.08, 0.1, sfxBus); };
  S.clear = (n, combo) => {
    const t = T();
    const base = 67 + Math.min(combo || 0, 12);
    const iv = [0, 4, 7, 12, 16, 19];
    const count = Math.min(6, n + 1);
    for (let i = 0; i < count; i++) {
      osc('triangle', mtof(base + iv[i]), t + i * 0.045, 0.22, 0.14, sfxBus);
      osc('sine', mtof(base + iv[i] + 12), t + i * 0.045, 0.3, 0.05, sfxBus);
    }
    if (n >= 4) {
      noise(t, 0.6, 0.12, sfxBus, { freq: 3000, f2: 9000, q: 0.8 });
      osc('sawtooth', mtof(base + 24), t + 0.2, 0.5, 0.05, sfxBus, { lp: 3000, lp2: 800 });
    }
  };
  S.tspin = () => { const t = T(); noise(t, 0.28, 0.12, sfxBus, { freq: 400, f2: 4000, q: 2 }); osc('sine', 330, t, 0.25, 0.1, sfxBus, { f2: 990 }); };
  S.levelUp = () => { const t = T(); [72, 76, 79, 84].forEach((m, i) => osc('square', mtof(m), t + i * 0.07, 0.14, 0.06, sfxBus, { lp: 2400 })); };
  S.gem = (i) => { const t = T(); const m = 93 + [0, 4, 7, 12, 16][(i || 0) % 5]; osc('sine', mtof(m), t, 0.3, 0.09, sfxBus); osc('sine', mtof(m + 19), t, 0.12, 0.03, sfxBus); };
  S.prismReady = () => { const t = T(); [84, 88, 91, 96].forEach((m, i) => osc('sine', mtof(m), t + i * 0.06, 0.35, 0.06, sfxBus)); };
  S.burst = () => {
    const t = T();
    noise(t, 0.9, 0.3, sfxBus, { freq: 200, f2: 9000, q: 0.6 });
    osc('sine', 110, t, 0.6, 0.45, sfxBus, { f2: 30 });
    [62, 66, 69, 74, 78].forEach((m, i) => osc('sawtooth', mtof(m), t + 0.05 + i * 0.03, 0.8, 0.04, sfxBus, { lp: 600, lp2: 6000 }));
  };
  S.pc = () => { const t = T(); for (let i = 0; i < 10; i++) osc('triangle', mtof(72 + i * 2), t + i * 0.035, 0.2, 0.07, sfxBus); };
  S.gameOver = () => { const t = T(); [67, 63, 60, 55, 48].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.16, 0.3, 0.13, sfxBus)); };
  S.win = () => { const t = T(); [72, 76, 79, 84, 88, 91].forEach((m, i) => { osc('square', mtof(m), t + i * 0.09, 0.25, 0.05, sfxBus, { lp: 3000 }); osc('sine', mtof(m - 12), t + i * 0.09, 0.3, 0.08, sfxBus); }); };
  S.count = () => osc('sine', 660, T(), 0.08, 0.1, sfxBus);
  S.go = () => { const t = T(); osc('square', 880, t, 0.16, 0.06, sfxBus, { lp: 3000 }); osc('sine', 1320, t, 0.2, 0.06, sfxBus); };
  S.uiHover = () => osc('sine', 1250, T(), 0.02, 0.025, sfxBus);
  S.uiClick = () => osc('triangle', 700, T(), 0.05, 0.08, sfxBus, { f2: 980 });
  S.buy = () => { const t = T(); [79, 83, 86, 91].forEach((m, i) => osc('sine', mtof(m), t + i * 0.05, 0.2, 0.08, sfxBus)); };
  S.achievement = () => { const t = T(); [76, 81, 85, 88].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.08, 0.3, 0.08, sfxBus)); };
  S.danger = () => osc('sine', 90, T(), 0.12, 0.12, sfxBus, { f2: 60 });

  // ---------------- Music ----------------
  // D major: D A Bm G, with a Bm G D A B-section. Original sequence.
  const PA = [
    { root: 50, tones: [62, 66, 69] }, { root: 45, tones: [61, 64, 69] },
    { root: 47, tones: [62, 66, 71] }, { root: 43, tones: [62, 67, 71] },
  ];
  const PB = [PA[2], PA[3], PA[0], PA[1]];
  const FORM = [PA, PA, PB, PA];
  const SCALE = [74, 76, 78, 81, 83, 86, 88];
  const MOTIFS = [
    [0, -1, -1, 2, -1, -1, 1, -1, 2, -1, 4, -1, 3, -1, -1, -1],
    [4, -1, 3, -1, 2, -1, -1, 1, 2, -1, -1, -1, 0, -1, -1, -1],
    [1, -1, 2, -1, 4, -1, 5, -1, 4, -1, 2, -1, 3, -1, -1, -1],
    [5, -1, -1, 4, -1, -1, 2, -1, 3, -1, 1, -1, 0, -1, -1, -1],
  ];
  const BASS = { 0: 0, 3: 0, 6: 7, 8: 0, 11: 12, 14: 7 };

  function playStep(step, t) {
    const sixteenth = 60 / M.bpm / 4;
    const bar = Math.floor(step / 16) % 16;
    const s = step % 16;
    const chord = FORM[Math.floor(bar / 4)][bar % 4];
    const I = M.mode === 'menu' ? 0 : M.intensity;
    // pad
    if (s === 0) {
      chord.tones.forEach((m, i) => {
        osc('triangle', mtof(m), t, sixteenth * 15, 0.05, musicBus, { a: 0.25, detune: i * 4 - 4 });
        osc('sine', mtof(m - 12), t, sixteenth * 15, 0.03, musicBus, { a: 0.3 });
      });
    }
    // arp
    const arpEvery = M.mode === 'menu' ? 4 : 2;
    if (s % arpEvery === 0) {
      const pat = [0, 1, 2, 1, 2, 0, 1, 2];
      const m = chord.tones[pat[(s / arpEvery) % pat.length]] + 12;
      osc('sine', mtof(m), t, sixteenth * 1.6, M.mode === 'menu' ? 0.035 : 0.045, musicBus, { a: 0.004 });
    }
    if (M.mode !== 'game') return;
    // bass
    if (I >= 1 && BASS[s] !== undefined) {
      osc('triangle', mtof(chord.root + BASS[s] - 12 + 12), t, sixteenth * 1.8, 0.16, musicBus, { lp: 900 });
    }
    // drums
    if (I >= 2) {
      if (s === 0 || s === 8 || (I >= 4 && s === 10)) osc('sine', 130, t, 0.14, 0.32, musicBus, { f2: 42 });
      if (s % 2 === 0 || (M.fever && s % 1 === 0)) noise(t, 0.03, s % 4 === 2 ? 0.05 : 0.025, musicBus, { type: 'highpass', freq: 7000 });
    }
    if (I >= 3 && (s === 4 || s === 12)) noise(t, 0.12, 0.09, musicBus, { freq: 1800, q: 0.7 });
    // lead
    if (I >= 3 || M.fever) {
      const deg = MOTIFS[bar % 4][s];
      if (deg >= 0) {
        const m = SCALE[deg] + (M.fever ? 12 : 0);
        osc('square', mtof(m), t, sixteenth * 2.2, 0.035, musicBus, { lp: 2600, a: 0.006 });
      }
    }
  }

  function schedule() {
    if (!ctx || M.mode === 'off') return;
    const sixteenth = 60 / M.bpm / 4;
    if (M.next < ctx.currentTime - 0.5) M.next = ctx.currentTime + 0.05; // resync after a stall
    while (M.next < ctx.currentTime + 0.12) {
      playStep(M.step, M.next);
      M.next += sixteenth;
      M.step++;
    }
  }

  function setMusic(mode, o) {
    o = o || {};
    if (mode !== M.mode) {
      M.mode = mode;
      M.step = 0;
      if (ctx) M.next = ctx.currentTime + 0.08;
    }
    if (mode === 'menu') M.bpm = 84;
    if (o.level != null) M.bpm = 100 + Math.min(40, (o.level - 1) * 3);
    if (o.intensity != null) M.intensity = o.intensity;
    if (o.fever != null) M.fever = o.fever;
  }
  function duck(on) {
    M.duck = on ? 0.35 : 1;
    applyVol();
  }

  function play(name, a, b) {
    if (!ctx || ctx.state !== 'running' || !S[name]) return;
    try { S[name](a, b); } catch (e) { /* never let audio break the game */ }
  }

  window.PFAudio = { ensure, play, setMusic, setVolumes, duck, get state() { return ctx ? ctx.state : 'none'; }, get music() { return Object.assign({}, M); } };
})();
