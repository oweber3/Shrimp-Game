const SPEED_OF_SOUND = 343;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

/**
 * Standalone procedural firework audio adapter.
 *
 * It can be created before AudioManager unlocks; context and destination are
 * resolved lazily from the manager on the first launch/burst. Pass the result
 * directly as createFireworks({ audio }).
 */
export function createFireworkAudio({
  audioManager = null,
  context = null,
  destination = null,
  distance = 55,
  volume = 1,
} = {}) {
  let activeContext = null;
  let output = null;
  let noise = null;
  let disposed = false;

  function ensureOutput() {
    if (disposed) return null;
    const ctx = context || audioManager?.ctx;
    if (!ctx || typeof ctx.createGain !== 'function') return null;
    const target = destination || audioManager?.concertGain || audioManager?.master || ctx.destination;
    if (!target) return null;
    if (ctx !== activeContext) {
      try { output?.disconnect(); } catch { /* already disconnected */ }
      activeContext = ctx;
      output = ctx.createGain();
      output.gain.value = clamp(volume, 0, 2);
      output.connect(target);
      noise = null;
    }
    return ctx;
  }

  function noiseBuffer(ctx) {
    if (noise) return noise;
    const length = Math.max(1, Math.floor(ctx.sampleRate * 1.2));
    noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < length; i++) {
      // Slightly correlated noise has more body than raw white noise.
      const previous = i > 0 ? samples[i - 1] * 0.28 : 0;
      samples[i] = previous + (Math.random() * 2 - 1) * 0.72;
    }
    return noise;
  }

  function parseDelay(value) {
    if (value && typeof value === 'object') {
      if (Number.isFinite(value.delay)) return Math.max(0, value.delay);
      if (Number.isFinite(value.distance)) return Math.max(0, value.distance) / SPEED_OF_SOUND;
    }
    if (Number.isFinite(value)) return Math.max(0, value);
    return Math.max(0, distance) / SPEED_OF_SOUND;
  }

  function parseIntensity(value, fallback = 1) {
    if (value && typeof value === 'object') return clamp(value.intensity, 0.05, 1.5);
    return clamp(value, 0.05, 1.5) || fallback;
  }

  function launch(delayOrOptions, intensity = 1) {
    const ctx = ensureOutput();
    if (!ctx || !output) return false;
    const delay = parseDelay(delayOrOptions);
    const strength = parseIntensity(delayOrOptions && typeof delayOrOptions === 'object' ? delayOrOptions : intensity);
    const start = ctx.currentTime + delay;
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(430 + Math.random() * 90, start);
      oscillator.frequency.exponentialRampToValueAtTime(1350 + Math.random() * 300, start + 0.46);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.075 * strength, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      oscillator.connect(gain);
      gain.connect(output);
      oscillator.start(start);
      oscillator.stop(start + 0.52);
      return true;
    } catch {
      return false;
    }
  }

  function burst(delayOrOptions, intensity = 1, type = 'peony') {
    const ctx = ensureOutput();
    if (!ctx || !output) return false;
    const delay = parseDelay(delayOrOptions);
    const options = delayOrOptions && typeof delayOrOptions === 'object' ? delayOrOptions : null;
    const strength = parseIntensity(options || intensity);
    const shellType = options?.type || type;
    const start = ctx.currentTime + delay;
    const strobe = shellType === 'strobe';
    const willow = shellType === 'willow';

    try {
      const crackle = ctx.createBufferSource();
      const crackleFilter = ctx.createBiquadFilter();
      const crackleGain = ctx.createGain();
      crackle.buffer = noiseBuffer(ctx);
      crackleFilter.type = 'bandpass';
      crackleFilter.frequency.value = strobe ? 2600 : willow ? 1250 : 1850;
      crackleFilter.Q.value = strobe ? 0.45 : 0.7;
      crackleGain.gain.setValueAtTime(0.24 * strength, start);
      crackleGain.gain.exponentialRampToValueAtTime(0.0001, start + (willow ? 0.75 : 0.42));
      crackle.connect(crackleFilter);
      crackleFilter.connect(crackleGain);
      crackleGain.connect(output);
      crackle.start(start, Math.random() * 0.2, willow ? 0.78 : 0.46);

      const boom = ctx.createOscillator();
      const boomGain = ctx.createGain();
      boom.type = 'sine';
      boom.frequency.setValueAtTime(88, start);
      boom.frequency.exponentialRampToValueAtTime(38, start + 0.32);
      boomGain.gain.setValueAtTime(0.2 * strength, start);
      boomGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.36);
      boom.connect(boomGain);
      boomGain.connect(output);
      boom.start(start);
      boom.stop(start + 0.38);
      return true;
    } catch {
      return false;
    }
  }

  function reset() {
    try { output?.disconnect(); } catch { /* already disconnected */ }
    output = null;
    noise = null;
    activeContext = null;
  }

  function dispose() {
    if (disposed) return;
    reset();
    disposed = true;
  }

  return { launch, burst, reset, dispose };
}
