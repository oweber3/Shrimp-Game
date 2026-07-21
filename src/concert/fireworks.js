import * as THREE from 'three';
import { BUILDING_BY_ID } from '../map/layoutData.js';

const HIGH_PARTICLE_BUDGET = 2600;
const LOW_PARTICLE_BUDGET = 1100;
const HIGH_SHELL_BUDGET = 48;
const LOW_SHELL_BUDGET = 24;
const DEAD_POSITION = -100000;

const PEONY = 0;
const WILLOW = 1;
const RING = 2;
const STROBE = 3;
const SHRIMP = 4;

const PARTICLE_SPARK = 0;
const PARTICLE_WILLOW = 1;
const PARTICLE_TRAIL = 2;
const PARTICLE_STROBE = 3;
const PARTICLE_ROCKET = 4;

const TYPE_NAMES = ['peony', 'willow', 'ring', 'strobe', 'shrimp-pink'];
const TYPE_ALIASES = Object.freeze({
  peony: PEONY,
  willow: WILLOW,
  ring: RING,
  strobe: STROBE,
  shrimp: SHRIMP,
  'shrimp-pink': SHRIMP,
  'shrimp-pink finale': SHRIMP,
  'shrimp-pink-finale': SHRIMP,
  shrimppinkfinale: SHRIMP,
  finale: SHRIMP,
});

const PALETTES = Object.freeze({
  gold: Object.freeze([0xffc84a, 0xfff0a0, 0xff8a24]),
  violet: Object.freeze([0xad65ff, 0x62ffd2, 0xf2d7ff]),
  ember: Object.freeze([0xff3b35, 0xffa52f, 0xfff7e8]),
  pink: Object.freeze([0xff4f9a, 0xff9dcc, 0xffe3f1]),
  white: Object.freeze([0xffffff, 0xcce8ff, 0xfff2cf]),
});

const TYPE_PALETTES = [
  PALETTES.gold,
  PALETTES.gold,
  PALETTES.violet,
  PALETTES.white,
  PALETTES.pink,
];

// Density, shape mix, and launch spacing per movement. The palette alone was
// carrying the whole difference between a quiet bridge and a peak chorus.
const SHELL_PROFILES = Object.freeze({
  'movement-1': Object.freeze({ density: 1, stagger: 0.16, spread: 1, mix: null, mixChance: 0 }),
  'movement-2': Object.freeze({ density: 1.9, stagger: 0.075, spread: 1.3, mix: Object.freeze([RING, SHRIMP]), mixChance: 0.45 }),
  bridge: Object.freeze({ density: 0.45, stagger: 0.4, spread: 0.7, mix: null, mixChance: 0 }),
  'movement-3': Object.freeze({ density: 1.35, stagger: 0.12, spread: 1.1, mix: Object.freeze([RING]), mixChance: 0.25 }),
  finale: Object.freeze({ density: 1.5, stagger: 0.09, spread: 1.15, mix: Object.freeze([RING, SHRIMP]), mixChance: 0.3 }),
  outro: Object.freeze({ density: 0.45, stagger: 0.4, spread: 0.7, mix: null, mixChance: 0 }),
});
const DEFAULT_PROFILE = SHELL_PROFILES['movement-1'];

function shellProfile(movement) {
  if (!movement) return DEFAULT_PROFILE;
  const key = String(movement).trim().toLowerCase();
  return SHELL_PROFILES[key] ?? DEFAULT_PROFILE;
}

const MACHINERY = BUILDING_BY_ID['laitram-machinery'];
const FIREWORK_REAR_Z = MACHINERY.cz - MACHINERY.sz / 2 - 22;
const FIREWORK_HALF_SPAN = MACHINERY.sx * 0.9;

// A broad arc behind Laitram Machinery. North is -Z, so every launch point
// sits beyond the rear wall while the outer pair fans past the building's
// 76-unit footprint. Existing cue-site names remain stable for the director.
const SITES = Object.freeze({
  'stage-nw': Object.freeze([MACHINERY.cx - FIREWORK_HALF_SPAN, 8, FIREWORK_REAR_Z - 14]),
  'stage-ne': Object.freeze([MACHINERY.cx + FIREWORK_HALF_SPAN, 8, FIREWORK_REAR_Z - 14]),
  'stage-sw': Object.freeze([MACHINERY.cx - MACHINERY.sx * 1.15, 10, FIREWORK_REAR_Z + 14]),
  'stage-se': Object.freeze([MACHINERY.cx + MACHINERY.sx * 1.15, 10, FIREWORK_REAR_Z + 14]),
  levee: Object.freeze([MACHINERY.cx, 14, FIREWORK_REAR_Z - 44]),
});
const SITE_SEQUENCE = [SITES['stage-nw'], SITES['stage-ne'], SITES['stage-sw'], SITES['stage-se'], SITES.levee];

// Pre-baked 2D point offsets: curled body, head, antennae, tail and legs.
const SHRIMP_GLYPH = new Float32Array([
  -5.5, 1.7, -4.8, 2.7, -3.7, 3.4, -2.5, 3.7, -1.2, 3.5,
   0.0, 2.9,  1.0, 2.0,  1.5, 0.8,  1.3,-0.5,  0.5,-1.5,
  -0.6,-2.0, -1.8,-2.1, -2.9,-1.7, -3.8,-1.0, -4.2,-0.1,
  -4.1, 0.9, -3.5, 1.6, -2.5, 2.0, -1.5, 1.8, -0.8, 1.1,
  -0.7, 0.2, -1.3,-0.5, -2.2,-0.8, -3.0,-0.5, -3.2, 0.3,
   1.1, 2.7,  2.3, 3.8,  1.0, 2.6,  2.8, 2.9,
  -4.8, 2.1, -6.5, 3.6, -5.1, 1.6, -6.8, 2.1,
  -3.1,-1.4, -4.0,-3.2, -2.0,-1.9, -2.4,-3.7,
  -0.8,-1.8, -0.5,-3.7,  0.2,-1.2,  1.0,-3.0,
  -5.2, 1.2, -7.0, 0.3, -5.2, 1.2, -6.8,-0.8,
]);

function shellTypeIndex(type) {
  if (typeof type !== 'string') return PEONY;
  return TYPE_ALIASES[type.trim().toLowerCase()] ?? PEONY;
}

function namedSite(site, ordinal) {
  if (typeof site !== 'string') return null;
  const key = site.trim().toLowerCase();
  if (SITES[key]) return SITES[key];
  if (key === 'north' || key.includes('north-cluster')) {
    return ordinal % 2 === 0 ? SITES['stage-nw'] : SITES['stage-ne'];
  }
  if (key === 'south') return ordinal % 2 === 0 ? SITES['stage-sw'] : SITES['stage-se'];
  if (key.includes('levee')) return SITES.levee;
  if (key.includes('pair') || key.includes('fan') || key === 'all') {
    return SITE_SEQUENCE[ordinal % SITE_SEQUENCE.length];
  }
  return null;
}

/**
 * Create a cue-driven, fixed-budget firework renderer.
 *
 * The returned object owns exactly one Points object and one BufferGeometry.
 * All particle and airborne-shell slots are allocated here and recycled for
 * every subsequent launch.
 */
export function createFireworks({ scene, quality = 'high', audio, onBurst = null } = {}) {
  const lowQuality = quality === 'low';
  const particleBudget = lowQuality ? LOW_PARTICLE_BUDGET : HIGH_PARTICLE_BUDGET;
  const shellBudget = lowQuality ? LOW_SHELL_BUDGET : HIGH_SHELL_BUDGET;
  const particleScale = lowQuality ? 0.52 : 1;

  const positions = new Float32Array(particleBudget * 3);
  const velocities = new Float32Array(particleBudget * 3);
  const colors = new Float32Array(particleBudget * 3);
  const baseColors = new Float32Array(particleBudget * 3);
  const life = new Float32Array(particleBudget);
  const maxLife = new Float32Array(particleBudget);
  const gravity = new Float32Array(particleBudget);
  const drag = new Float32Array(particleBudget);
  const particleKind = new Uint8Array(particleBudget);
  const trailClock = new Float32Array(particleBudget);
  const flickerPhase = new Float32Array(particleBudget);

  const shellActive = new Uint8Array(shellBudget);
  const shellTypes = new Uint8Array(shellBudget);
  const shellPositions = new Float32Array(shellBudget * 3);
  const shellVelocities = new Float32Array(shellBudget * 3);
  const shellAge = new Float32Array(shellBudget);
  const shellFuse = new Float32Array(shellBudget);
  const shellParticle = new Int16Array(shellBudget);
  const shellColors = new Float32Array(shellBudget * 9);

  positions.fill(DEAD_POSITION);
  shellParticle.fill(-1);

  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  const colorAttribute = new THREE.BufferAttribute(colors, 3);
  positionAttribute.setUsage(THREE.DynamicDrawUsage);
  colorAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('color', colorAttribute);
  const material = new THREE.PointsMaterial({
    size: lowQuality ? 2.2 : 2.7,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'concert-fireworks';
  points.frustumCulled = false;
  scene?.add?.(points);

  const scratchColor = new THREE.Color();
  const burstReport = { x: 0, y: 0, z: 0, type: '', intensity: 1, r: 1, g: 1, b: 1 };
  let particleCursor = 0;
  let shellCursor = 0;
  let launchSequence = 0;
  let currentMovement = 'movement-1';
  let disposed = false;

  function hideParticle(index) {
    life[index] = 0;
    const p = index * 3;
    positions[p] = DEAD_POSITION;
    positions[p + 1] = DEAD_POSITION;
    positions[p + 2] = DEAD_POSITION;
    colors[p] = 0;
    colors[p + 1] = 0;
    colors[p + 2] = 0;
  }

  function allocateParticle() {
    for (let checked = 0; checked < particleBudget; checked++) {
      const index = particleCursor;
      particleCursor = (particleCursor + 1) % particleBudget;
      if (life[index] <= 0) return index;
    }
    // Under a saturated barrage, replace an older spark/trail but never an
    // airborne shell's rocket marker.
    for (let checked = 0; checked < particleBudget; checked++) {
      const index = particleCursor;
      particleCursor = (particleCursor + 1) % particleBudget;
      if (particleKind[index] !== PARTICLE_ROCKET) return index;
    }
    return -1;
  }

  function emitParticle(x, y, z, vx, vy, vz, r, g, b, seconds, pull, resistance, kind) {
    const index = allocateParticle();
    if (index < 0) return -1;
    const p = index * 3;
    positions[p] = x;
    positions[p + 1] = y;
    positions[p + 2] = z;
    velocities[p] = vx;
    velocities[p + 1] = vy;
    velocities[p + 2] = vz;
    baseColors[p] = colors[p] = r;
    baseColors[p + 1] = colors[p + 1] = g;
    baseColors[p + 2] = colors[p + 2] = b;
    life[index] = maxLife[index] = seconds;
    gravity[index] = pull;
    drag[index] = resistance;
    particleKind[index] = kind;
    trailClock[index] = 0.045 + Math.random() * 0.045;
    flickerPhase[index] = Math.random() * Math.PI * 2;
    return index;
  }

  function writeColor(target, value, fallback) {
    try {
      if (value && typeof value === 'object' && Number.isFinite(value.r)) {
        shellColors[target] = value.r;
        shellColors[target + 1] = value.g;
        shellColors[target + 2] = value.b;
        return;
      }
      if (typeof value === 'number') scratchColor.setHex(value);
      else if (typeof value === 'string') scratchColor.set(value);
      else scratchColor.setHex(fallback);
    } catch {
      scratchColor.setHex(fallback);
    }
    shellColors[target] = scratchColor.r;
    shellColors[target + 1] = scratchColor.g;
    shellColors[target + 2] = scratchColor.b;
  }

  function storePalette(shellIndex, palette, typeIndex) {
    let source = palette;
    let singleColor = null;
    if (typeof source === 'string') {
      const namedPalette = PALETTES[source.trim().toLowerCase()];
      if (namedPalette) source = namedPalette;
      else singleColor = source;
    } else if (typeof source === 'number' || (source && Number.isFinite(source.r))) {
      singleColor = source;
    }
    const target = shellIndex * 9;
    if (singleColor !== null) {
      const fallback = TYPE_PALETTES[typeIndex];
      for (let i = 0; i < 3; i++) writeColor(target + i * 3, singleColor, fallback[i]);
      return;
    }
    if (!source || typeof source.length !== 'number' || source.length === 0) {
      source = TYPE_PALETTES[typeIndex];
    }
    const fallback = TYPE_PALETTES[typeIndex];
    for (let i = 0; i < 3; i++) {
      writeColor(target + i * 3, source[i % source.length], fallback[i]);
    }
  }

  function siteIntoShell(shellIndex, site, ordinal) {
    let source = namedSite(site, ordinal);
    if (!source && Array.isArray(site) && typeof site[0] !== 'number' && site.length > 0) {
      source = namedSite(site[ordinal % site.length], ordinal);
    }
    if (!source && site && typeof site === 'object') {
      if (site.position && typeof site.position === 'object') source = site.position;
      else source = site;
    }
    if (!source) source = SITE_SEQUENCE[(launchSequence + ordinal) % SITE_SEQUENCE.length];

    const p = shellIndex * 3;
    if (Array.isArray(source) || ArrayBuffer.isView(source)) {
      shellPositions[p] = Number.isFinite(source[0]) ? source[0] : MACHINERY.cx;
      shellPositions[p + 1] = Number.isFinite(source[1]) ? source[1] : 8;
      shellPositions[p + 2] = Number.isFinite(source[2]) ? source[2] : FIREWORK_REAR_Z;
    } else {
      shellPositions[p] = Number.isFinite(source.x) ? source.x : MACHINERY.cx;
      shellPositions[p + 1] = Number.isFinite(source.y) ? source.y : 8;
      shellPositions[p + 2] = Number.isFinite(source.z) ? source.z : FIREWORK_REAR_Z;
    }
  }

  function safeAudio(method, delay, intensity, typeName) {
    try {
      if (typeof audio?.[method] === 'function') audio[method](delay, intensity, typeName);
    } catch {
      // Fireworks remain visual-only when an optional audio adapter fails.
    }
  }

  function allocateShell() {
    for (let checked = 0; checked < shellBudget; checked++) {
      const index = shellCursor;
      shellCursor = (shellCursor + 1) % shellBudget;
      if (!shellActive[index]) return index;
    }
    return -1;
  }

  function launchOne(typeIndex, site, palette, ordinal, profile) {
    const shellIndex = allocateShell();
    if (shellIndex < 0) return false;
    const p = shellIndex * 3;
    siteIntoShell(shellIndex, site, ordinal);
    storePalette(shellIndex, palette, typeIndex);

    shellActive[shellIndex] = 1;
    shellTypes[shellIndex] = typeIndex;
    shellAge[shellIndex] = 0;
    // Staggering the fuse turns a simultaneous volley into a ripple; a tight
    // stagger on the hot movements is what reads as a barrage.
    shellFuse[shellIndex] = 1.35 + Math.random() * 0.55 + ordinal * profile.stagger;
    shellVelocities[p] = (Math.random() - 0.5) * 8 * profile.spread;
    shellVelocities[p + 1] = 56 + Math.random() * 12;
    shellVelocities[p + 2] = (Math.random() - 0.5) * 8 * profile.spread;

    const c = shellIndex * 9;
    shellParticle[shellIndex] = emitParticle(
      shellPositions[p], shellPositions[p + 1], shellPositions[p + 2],
      0, 0, 0,
      shellColors[c], shellColors[c + 1], shellColors[c + 2],
      shellFuse[shellIndex] + 0.2, 0, 0, PARTICLE_ROCKET
    );
    safeAudio('launch', 0.025, 0.65, TYPE_NAMES[typeIndex]);
    return true;
  }

  function paletteColor(shellIndex, particleIndex) {
    return shellIndex * 9 + (particleIndex % 3) * 3;
  }

  function burstSphere(shellIndex, amount, speedMin, speedRange, seconds, pull, resistance, kind) {
    const p = shellIndex * 3;
    for (let i = 0; i < amount; i++) {
      const y = Math.random() * 2 - 1;
      const theta = Math.random() * Math.PI * 2;
      const across = Math.sqrt(Math.max(0, 1 - y * y));
      const speed = speedMin + Math.random() * speedRange;
      const c = paletteColor(shellIndex, i);
      emitParticle(
        shellPositions[p], shellPositions[p + 1], shellPositions[p + 2],
        Math.cos(theta) * across * speed,
        y * speed,
        Math.sin(theta) * across * speed,
        shellColors[c], shellColors[c + 1], shellColors[c + 2],
        seconds * (0.82 + Math.random() * 0.36), pull, resistance, kind
      );
    }
  }

  function burstRing(shellIndex, amount) {
    const p = shellIndex * 3;
    const phase = Math.random() * Math.PI * 2;
    const tilt = (Math.random() - 0.5) * 0.38;
    for (let i = 0; i < amount; i++) {
      const angle = phase + i / amount * Math.PI * 2;
      const speed = 17 + Math.random() * 3;
      const c = paletteColor(shellIndex, i);
      emitParticle(
        shellPositions[p], shellPositions[p + 1], shellPositions[p + 2],
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        Math.sin(angle) * speed * tilt,
        shellColors[c], shellColors[c + 1], shellColors[c + 2],
        2.15, -3.4, 0.08, PARTICLE_SPARK
      );
    }
  }

  function burstShrimp(shellIndex) {
    const p = shellIndex * 3;
    const glyphPoints = SHRIMP_GLYPH.length / 2;
    const repeats = lowQuality ? 1 : 2;
    for (let repeat = 0; repeat < repeats; repeat++) {
      for (let i = 0; i < glyphPoints; i++) {
        const x = SHRIMP_GLYPH[i * 2];
        const y = SHRIMP_GLYPH[i * 2 + 1];
        const c = paletteColor(shellIndex, i + repeat);
        const spread = 2.75 + repeat * 0.22;
        emitParticle(
          shellPositions[p] + x * 0.12,
          shellPositions[p + 1] + y * 0.12,
          shellPositions[p + 2] + (Math.random() - 0.5) * 0.4,
          x * spread,
          y * spread + 2.4,
          (Math.random() - 0.5) * 1.5,
          shellColors[c], shellColors[c + 1], shellColors[c + 2],
          2.5 + Math.random() * 0.45, -2.15, 0.075, PARTICLE_SPARK
        );
      }
    }
  }

  function burstShell(shellIndex) {
    const typeIndex = shellTypes[shellIndex];
    if (typeIndex === PEONY) {
      burstSphere(shellIndex, Math.round(76 * particleScale), 12, 11, 2.35, -4.8, 0.055, PARTICLE_SPARK);
    } else if (typeIndex === WILLOW) {
      burstSphere(shellIndex, Math.round(54 * particleScale), 8, 8, 3.45, -6.1, 0.115, PARTICLE_WILLOW);
    } else if (typeIndex === RING) {
      burstRing(shellIndex, Math.round(72 * particleScale));
    } else if (typeIndex === STROBE) {
      burstSphere(shellIndex, Math.round(58 * particleScale), 7, 10, 1.75, -2.9, 0.15, PARTICLE_STROBE);
    } else {
      burstShrimp(shellIndex);
    }

    const p = shellIndex * 3;
    const delay = 0.06 + Math.max(0, shellPositions[p + 1]) / 343;
    const intensity = typeIndex === SHRIMP ? 1 : 0.82;
    safeAudio('burst', delay, intensity, TYPE_NAMES[typeIndex]);
    if (typeof onBurst === 'function') {
      const c = shellIndex * 9;
      burstReport.x = shellPositions[p];
      burstReport.y = shellPositions[p + 1];
      burstReport.z = shellPositions[p + 2];
      burstReport.type = TYPE_NAMES[typeIndex];
      burstReport.intensity = intensity;
      burstReport.r = shellColors[c];
      burstReport.g = shellColors[c + 1];
      burstReport.b = shellColors[c + 2];
      try {
        onBurst(burstReport);
      } catch {
        // A failing visual hook must never strand the shell mid-burst.
      }
    }
    const rocket = shellParticle[shellIndex];
    if (rocket >= 0) hideParticle(rocket);
    shellParticle[shellIndex] = -1;
    shellActive[shellIndex] = 0;
  }

  function updateShells(dt) {
    for (let i = 0; i < shellBudget; i++) {
      if (!shellActive[i]) continue;
      const p = i * 3;
      shellAge[i] += dt;
      shellVelocities[p + 1] -= 9.2 * dt;
      shellPositions[p] += shellVelocities[p] * dt;
      shellPositions[p + 1] += shellVelocities[p + 1] * dt;
      shellPositions[p + 2] += shellVelocities[p + 2] * dt;

      const rocket = shellParticle[i];
      if (rocket >= 0 && life[rocket] > 0) {
        const rp = rocket * 3;
        positions[rp] = shellPositions[p];
        positions[rp + 1] = shellPositions[p + 1];
        positions[rp + 2] = shellPositions[p + 2];
      }
      if (shellAge[i] >= shellFuse[i]) burstShell(i);
    }
  }

  function emitTrail(parent) {
    const p = parent * 3;
    emitParticle(
      positions[p], positions[p + 1], positions[p + 2],
      velocities[p] * 0.06, velocities[p + 1] * 0.06, velocities[p + 2] * 0.06,
      baseColors[p] * 0.72, baseColors[p + 1] * 0.72, baseColors[p + 2] * 0.72,
      0.44, -1.2, 1.4, PARTICLE_TRAIL
    );
  }

  function updateParticles(dt) {
    for (let i = 0; i < particleBudget; i++) {
      if (life[i] <= 0 || particleKind[i] === PARTICLE_ROCKET) continue;
      life[i] -= dt;
      if (life[i] <= 0) {
        hideParticle(i);
        continue;
      }

      const p = i * 3;
      const damping = Math.max(0, 1 - drag[i] * dt);
      velocities[p] *= damping;
      velocities[p + 1] = velocities[p + 1] * damping + gravity[i] * dt;
      velocities[p + 2] *= damping;
      positions[p] += velocities[p] * dt;
      positions[p + 1] += velocities[p + 1] * dt;
      positions[p + 2] += velocities[p + 2] * dt;

      let brightness = Math.min(1, life[i] / Math.max(0.001, maxLife[i]) * 1.7);
      if (particleKind[i] === PARTICLE_STROBE) {
        brightness *= Math.sin(life[i] * 38 + flickerPhase[i]) > 0.15 ? 1 : 0.025;
      }
      colors[p] = baseColors[p] * brightness;
      colors[p + 1] = baseColors[p + 1] * brightness;
      colors[p + 2] = baseColors[p + 2] * brightness;

      if (!lowQuality && particleKind[i] === PARTICLE_WILLOW) {
        trailClock[i] -= dt;
        if (trailClock[i] <= 0) {
          emitTrail(i);
          trailClock[i] += 0.075;
        }
      }
    }
  }

  /** Set the movement whose density profile unqualified launches inherit. */
  function setMovement(movement) {
    if (movement) currentMovement = movement;
    return currentMovement;
  }

  function launch({ type = 'peony', count = 1, site, palette, movement } = {}) {
    if (disposed) return 0;
    const typeIndex = shellTypeIndex(type);
    const profile = shellProfile(movement ?? currentMovement);
    const requested = Number.isFinite(count) ? Math.floor(count) : 1;
    // The low tier keeps roughly its pre-profile shell count so a barrage
    // still fits the halved pool.
    const density = profile.density * (lowQuality ? 0.65 : 1);
    const scaled = requested > 0 ? Math.max(1, Math.round(requested * density)) : 0;
    const total = Math.min(shellBudget, Math.max(0, scaled));
    let launched = 0;
    for (let i = 0; i < total; i++) {
      // Hot movements fold ring and shrimp shells into the requested type so a
      // barrage is a mix of shapes rather than six of the same burst.
      let shapeIndex = typeIndex;
      if (profile.mix && i > 0 && Math.random() < profile.mixChance) {
        shapeIndex = profile.mix[i % profile.mix.length];
      }
      if (!launchOne(shapeIndex, site, palette, i, profile)) break;
      launched++;
    }
    launchSequence = (launchSequence + Math.max(1, launched)) % SITE_SEQUENCE.length;
    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
    return launched;
  }

  function update(dt) {
    if (disposed) return;
    const delta = Number.isFinite(dt) ? Math.min(0.1, Math.max(0, dt)) : 0;
    if (delta <= 0) return;
    updateShells(delta);
    updateParticles(delta);
    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
  }

  function clear() {
    if (disposed) return;
    shellActive.fill(0);
    shellParticle.fill(-1);
    life.fill(0);
    positions.fill(DEAD_POSITION);
    colors.fill(0);
    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
  }

  function dispose() {
    if (disposed) return;
    clear();
    disposed = true;
    points.removeFromParent();
    geometry.dispose();
    material.dispose();
  }

  return { launch, setMovement, update, clear, dispose };
}
