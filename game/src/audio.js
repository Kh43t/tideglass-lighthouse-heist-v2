// Tideglass II — procedural WebAudio: ocean ambience, panned footsteps,
// alarm, pickups. No audio files; everything is synthesized on first input.
export class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ocean = null;
    this.muted = false;
  }
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.startOcean();
    } catch { this.ctx = null; }
  }
  startOcean() {
    // Looping filtered noise = waves; a slow LFO swells it like surf.
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 420; filter.Q.value = 0.6;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.05;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain); lfoGain.connect(gain.gain);
    src.connect(filter); filter.connect(gain); gain.connect(this.master);
    src.start(); lfo.start();
    this.ocean = src;
  }
  blip(freq, dur, type = 'sine', vol = 0.2, when = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  pickup(kind) {
    if (kind === 'pearl') { this.blip(880, 0.12); this.blip(1318, 0.18, 'sine', 0.18, 0.07); }
    else { this.blip(660, 0.09); this.blip(990, 0.12, 'sine', 0.16, 0.05); }
  }
  relic() {
    [523, 659, 784, 1046].forEach((f, i) => this.blip(f, 0.25, 'triangle', 0.2, i * 0.09));
  }
  alarm() {
    this.blip(440, 0.22, 'square', 0.14);
    this.blip(587, 0.22, 'square', 0.14, 0.2);
    this.blip(440, 0.22, 'square', 0.14, 0.4);
  }
  caught() {
    [392, 311, 233].forEach((f, i) => this.blip(f, 0.3, 'sawtooth', 0.16, i * 0.14));
  }
  pebble() { this.blip(180, 0.08, 'triangle', 0.18); }
  pebbleLand() { this.blip(120, 0.1, 'triangle', 0.14); this.blip(90, 0.14, 'sine', 0.12, 0.05); }
  smoke() { this.blip(240, 0.35, 'sine', 0.1); }
  bell() {
    this.blip(1174, 0.5, 'sine', 0.2);
    this.blip(1760, 0.4, 'sine', 0.1, 0.02);
  }
  floorClear() { [523, 659, 784].forEach((f, i) => this.blip(f, 0.2, 'triangle', 0.18, i * 0.1)); }
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.blip(f, 0.35, 'triangle', 0.18, i * 0.12)); }
  // Footstep panned by the walker's x position on the 1280-wide arena.
  footstep(x, sprinting) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    o.type = 'sine';
    o.frequency.value = sprinting ? 140 : 100;
    const pan = Math.max(-0.8, Math.min(0.8, (x / 1280) * 2 - 1));
    if (p) p.pan.value = pan;
    g.gain.setValueAtTime(sprinting ? 0.09 : 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(g);
    if (p) { g.connect(p); p.connect(this.master); } else g.connect(this.master);
    o.start(t); o.stop(t + 0.09);
  }
}
