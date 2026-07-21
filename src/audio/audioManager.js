// World foley remains procedural Web Audio: footsteps are filtered noise
// ticks, indoor ambience is a detuned oscillator bank, and punches are noise
// bursts. The optional concert media joins the same graph on its own bus.
// Everything is connected after a user gesture to satisfy autoplay policy;
// every method is a safe no-op before unlock.

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.master = null;
    this.worldGain = null;
    this.humGain = null;
    this.concertSource = null;
    this.concertLowpass = null;
    this.concertGain = null;
    this.concertMediaElement = null;
    this._concertActive = false;
    this._indoorBlend = 0;
  }

  unlock() {
    if (this.unlocked) {
      if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    if (typeof window === 'undefined') return false;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      this.ctx = new AC();
    } catch {
      return false;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(this.ctx.destination);

    // Footsteps, punches, and the machinery bed share a world bus so a
    // concert can duck them without lowering collectibles or the concert.
    this.worldGain = this.ctx.createGain();
    this.worldGain.gain.value = this._concertActive ? 0.5 : 1;
    this.worldGain.connect(this.master);

    // Indoor ambience: AC/machinery hum. Three quiet detuned oscillators
    // through a lowpass; silent until the zone blend brings it up.
    this.humGain = this.ctx.createGain();
    this.humGain.gain.value = this._indoorBlend * 0.05;
    this.humGain.connect(this.worldGain);
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
    return true;
  }

  // 0 = outdoors, 1 = fully indoors; driven by the zone lighting blend so
  // the hum fades in over the same half second as the lights. The concert
  // stays audible indoors, but loses its top end as though heard through the
  // building shell.
  setIndoorBlend(b) {
    this._indoorBlend = Math.min(1, Math.max(0, Number.isFinite(b) ? b : 0));
    if (this.humGain) this.humGain.gain.value = this._indoorBlend * 0.05;
    if (this.concertLowpass) {
      const cutoff = 18000 * Math.pow(900 / 18000, this._indoorBlend);
      this.concertLowpass.frequency.setTargetAtTime(
        cutoff,
        this.ctx.currentTime,
        0.04
      );
    }
  }

  /**
   * Route one persistent media element into the Web Audio graph. A media
   * element may only have one MediaElementAudioSourceNode, so restarts reuse
   * this connection instead of rebuilding it.
   */
  connectConcertMedia(mediaElement) {
    if (!mediaElement || !this.unlock()) return false;
    if (this.concertMediaElement === mediaElement && this.concertSource) return true;
    if (this.concertMediaElement && this.concertMediaElement !== mediaElement) return false;

    try {
      this.concertSource = this.ctx.createMediaElementSource(mediaElement);
    } catch {
      return false;
    }
    this.concertMediaElement = mediaElement;
    this.concertLowpass = this.ctx.createBiquadFilter();
    this.concertLowpass.type = 'lowpass';
    this.concertLowpass.Q.value = 0.7;
    this.concertGain = this.ctx.createGain();
    this.concertGain.gain.value = this._concertActive ? 1 : 0;
    this.concertSource.connect(this.concertLowpass);
    this.concertLowpass.connect(this.concertGain);
    this.concertGain.connect(this.master);
    this.setIndoorBlend(this._indoorBlend);
    return true;
  }

  /** Disconnect the persistent concert branch when its owning director dies. */
  disconnectConcertMedia(mediaElement = this.concertMediaElement) {
    if (!this.concertMediaElement || mediaElement !== this.concertMediaElement) return false;
    for (const node of [this.concertSource, this.concertLowpass, this.concertGain]) {
      try { node?.disconnect?.(); } catch { /* an already-disconnected node is clean */ }
    }
    this.concertSource = null;
    this.concertLowpass = null;
    this.concertGain = null;
    this.concertMediaElement = null;
    return true;
  }

  // Duck only world foley/ambience. The concert gain lives beside that bus,
  // directly under master, so the two levels remain independent.
  setConcertActive(active) {
    this._concertActive = Boolean(active);
    if (!this.unlocked) return;
    const now = this.ctx.currentTime;
    this._rampGain(this.worldGain.gain, this._concertActive ? 0.5 : 1, now, 0.08);
    if (this.concertGain) {
      this._rampGain(this.concertGain.gain, this._concertActive ? 1 : 0, now, 0.08);
    }
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
    g.connect(this.worldGain);
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

  _rampGain(param, value, now, seconds) {
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }
}
