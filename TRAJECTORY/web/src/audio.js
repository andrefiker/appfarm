export class Sound {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.flight = null;
  }
  unlock() {
    try {
      if (!this.ctx)
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended") this.ctx.resume();
    } catch {}
  }
  tone(freq, duration = 0.12, type = "sine", volume = 0.06, slide = 1) {
    if (!this.settings.sound || !this.ctx) return;
    const t = this.ctx.currentTime,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(
      Math.max(15, freq * slide),
      t + duration,
    );
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + duration);
  }
  noise(duration = 0.25, volume = 0.14) {
    if (!this.settings.sound || !this.ctx) return;
    const c = this.ctx,
      b = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate),
      a = b.getChannelData(0);
    for (let i = 0; i < a.length; i++)
      a[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / a.length, 2);
    const s = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain();
    s.buffer = b;
    f.type = "lowpass";
    f.frequency.value = 650;
    g.gain.value = volume;
    s.connect(f);
    f.connect(g);
    g.connect(c.destination);
    s.start();
  }
  play(type) {
    if (type === "fire") {
      this.noise(0.25, 0.22);
      this.tone(110, 0.26, "triangle", 0.1, 0.25);
    } else if (type === "blast") {
      this.noise(0.5, 0.23);
      this.tone(65, 0.4, "sine", 0.14, 0.3);
    } else if (type === "damage") {
      this.tone(700, 0.15, "sine", 0.06, 0.5);
    } else if (type === "victory") {
      [440, 554, 659, 880].forEach((f, i) =>
        setTimeout(() => this.tone(f, 0.3), i * 100),
      );
    } else if (type === "defeat") {
      this.tone(220, 0.5, "triangle", 0.06, 0.5);
    } else if (type === "split") this.tone(1100, 0.12, "sine", 0.03, 0.3);
    else this.tone(400, 0.045, "sine", 0.025, 1.3);
  }
  setFlight(on) {
    if (!on) {
      if (this.flight) {
        try {
          this.flight.o.stop();
        } catch {}
        this.flight = null;
      }
      return;
    }
    if (this.flight || !this.settings.sound || !this.ctx) return;
    const o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.value = 190;
    g.gain.value = 0.009;
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    this.flight = { o, g };
  }
  suspend() {
    this.setFlight(false);
    this.ctx?.suspend();
  }
  haptic(kind = "tap") {
    if (!this.settings.haptics) return;
    try {
      if (window.Android?.haptic)
        window.Android.haptic(kind === "blast" ? 35 : 14);
      else navigator.vibrate?.(kind === "blast" ? 25 : 10);
    } catch {}
  }
}
