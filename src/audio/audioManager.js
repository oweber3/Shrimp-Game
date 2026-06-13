// Procedural Web Audio (Phase 7): no audio files at all. Footsteps are
// filtered noise ticks, the indoor ambience is a detuned oscillator pair
// through a lowpass, the punch is a noise burst. Everything is created
// after the first user gesture (the start overlay click) to satisfy the
// browser autoplay policy; every method is a safe no-op before unlock.

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.master = null;
    this.humGain = null;
  }

  unlock() {
    if (this.unlocked) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      return;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(this.ctx.destination);

    // Indoor ambience: AC/machinery hum. Three quiet detuned oscillators
    // through a lowpass; silent until the zone blend brings it up.
    this.humGain = this.ctx.createGain();
    this.humGain.gain.value = 0;
    this.humGain.connect(this.master);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    lp.connect(this.humGain);
    for (const f of [62, 89, 124.5]) {
      const osc = this.ctx.createOscillator();
      osc.type = f > 100 ? 'triangle' : 'sine';
      osc.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.value = f > 100 ? 0.25 : 1;
      osc.connect(g);
      g.connect(lp);
      osc.start();
    }

    this.unlocked = true;
  }

  // 0 = outdoors, 1 = fully indoors; driven by the zone lighting blend so
  // the hum fades in over the same half second as the lights.
  setIndoorBlend(b) {
    if (this.humGain) this.humGain.gain.value = b * 0.05;
  }

  footstep(jogging) {
    this._burst({
      seconds: 0.05,
      freq: 580 + Math.random() * 160,
      q: 1.2,
      peak: jogging ? 0.16 : 0.1,
      decay: 0.05
    });
  }

  punch() {
    this._burst({ seconds: 0.16, freq: 320, q: 0.8, peak: 0.4, decay: 0.14 });
  }

  // Bright two-note arpeggio for collecting a Golden Shrimp.
  collect() {
    if (!this.unlocked) return;
    const t0 = this.ctx.currentTime;
    [880, 1320].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = this.ctx.createGain();
      const start = t0 + i * 0.08;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.22, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(g);
      g.connect(this.master);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  }

  _burst({ seconds, freq, q, peak, decay }) {
    if (!this.unlocked) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(seconds);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + decay);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + seconds);
  }

  _noiseBuffer(seconds) {
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
}
