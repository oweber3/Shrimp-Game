// Render quality tier for the frame-time-costly Phase 11 effects (2048
// shadow map, SSAO). 'low' keeps the pre-Phase-11 budget (1024 shadows, no
// SSAO) for software renderers and low-end devices; 'high' turns both on.
//
// Resolution order: ?quality= URL param > localStorage (a prior manual
// choice, via the Q debug key) > WebGL renderer-string detection. A 2s boot
// FPS probe can additionally downgrade high -> low if the real frame rate
// can't hold up once the heavier features are already running; it never
// upgrades low -> high (the render-string check already covers that path).

const STORAGE_KEY = 'shrimp-shift-quality';
const listeners = new Set();
let tier = null;
let userOverridden = false;

export function detectSoftwareRenderer() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
      || document.createElement('canvas').getContext('webgl');
    if (!gl) return true;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    return /swiftshader|llvmpipe|softpipe|software/i.test(name);
  } catch (err) {
    return false;
  }
}

function readOverride() {
  try {
    const forced = new URLSearchParams(window.location.search).get('quality');
    if (forced === 'low' || forced === 'high') return forced;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'low' || stored === 'high') return stored;
  } catch (err) {
    // no window/localStorage (headless-style harness) - fall through
  }
  return null;
}

export function initQuality() {
  if (tier !== null) return tier;
  const override = readOverride();
  if (override) {
    tier = override;
    userOverridden = true;
  } else {
    tier = detectSoftwareRenderer() ? 'low' : 'high';
  }
  console.log(`[quality] tier: ${tier}${userOverridden ? ' (override)' : ' (auto-detected)'}`);
  try {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyQ') setQuality(tier === 'high' ? 'low' : 'high');
    });
  } catch (err) {
    // headless / no window
  }
  return tier;
}

export function getQuality() {
  return tier === null ? initQuality() : tier;
}

export function setQuality(next, persist = true) {
  if (tier === next) return;
  tier = next;
  userOverridden = persist;
  // A manual choice (Q key) wins outright - cancel any in-flight boot probe
  // so its delayed downgrade can't silently override what the player just
  // picked a moment later.
  if (persist) {
    probing = false;
    try { localStorage.setItem(STORAGE_KEY, next); } catch (err) {}
  }
  console.log(`[quality] switched to ${next}`);
  for (const fn of listeners) fn(tier);
}

export function onQualityChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Boot FPS probe: samples real frame times for ~2s starting the first time
// startBootProbe() is called, then downgrades once if the average is too
// low. Skipped entirely if the tier was already forced low or the user (or
// a prior probe) already chose a tier explicitly.
let probing = false;
let probeElapsed = 0;
let probeFrames = 0;

export function startBootProbe() {
  if (userOverridden || getQuality() === 'low') return;
  probing = true;
  probeElapsed = 0;
  probeFrames = 0;
}

export function sampleFrame(dt) {
  if (!probing) return;
  probeElapsed += dt;
  probeFrames++;
  if (probeElapsed < 2) return;
  probing = false;
  const fps = probeFrames / probeElapsed;
  if (fps < 45) {
    console.log(`[quality] boot probe measured ${fps.toFixed(1)}fps, downgrading to low`);
    setQuality('low', false);
  }
}
