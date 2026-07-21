import * as THREE from 'three';
import { EXTERIOR_LAYER } from '../zones.js';
import { BUILDING_BY_ID, translateLaitramMachineryPoint } from '../map/layoutData.js';
import {
  EARTH_STAGE_BASE_RADIUS,
  EARTH_STAGE_CENTER as EARTH_STAGE_CENTER_XZ,
  EARTH_STAGE_FOOTPRINT_RADIUS,
  EARTH_STAGE_TOP,
} from './earthStagePlacement.js';

// Phase 4's venue is deliberately self-contained. The director only has to
// pass its current show payload; this module owns every object and restores
// every external value it touches when the show ends.

const MACHINERY = BUILDING_BY_ID['laitram-machinery'];
const MACHINERY_FRONT_CENTER = translateLaitramMachineryPoint(35, 19.5);
const SKY_SHOW_REAR_Z = MACHINERY.cz - MACHINERY.sz / 2 - 28;
const SKY_SHOW_CENTER = new THREE.Vector3(MACHINERY.cx, 96, SKY_SHOW_REAR_Z - 18);
const SKY_FADE_SECONDS = 8;
const BEAM_COUNT_HIGH = 8;
const BEAM_COUNT_LOW = 5;
const SHOCKWAVE_COUNT = 3;
const SHOCKWAVE_LIFETIME = 1.35;
const MAX_FOV_PUNCH = 5;
const MAX_CAMERA_SHAKE = 0.24;

// Sky hue drift runs on its own slow clock so a movement never sits on one
// flat colour for its full two-minute stretch.
const SKY_CYCLE_SECONDS = 13;
// A cue flash decays to roughly a tenth of its peak in ~150ms.
const FLASH_DECAY = 15;

const TAU = Math.PI * 2;
const DOWN = new THREE.Vector3(0, -1, 0);
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

/** Cosine-eased 0→1→0 blend on its own period, offset per beam. */
function cycleBlend(seconds, period, offset) {
  return 0.5 - 0.5 * Math.cos((seconds / period + offset) * TAU);
}

const PALETTES = Object.freeze({
  'movement-1': Object.freeze({ sky: 0x09051f, horizon: 0x28105a, beam: 0xa66cff, accent: 0xffc44d }),
  'movement-2': Object.freeze({ sky: 0x160306, horizon: 0x7d160b, beam: 0xff3a18, accent: 0xff8b24 }),
  bridge: Object.freeze({ sky: 0x050e22, horizon: 0x3b0c5f, beam: 0x20e5ff, accent: 0xff47e6 }),
  'movement-3': Object.freeze({ sky: 0x030b1b, horizon: 0x123c72, beam: 0x8bdcff, accent: 0xff2638 }),
  outro: Object.freeze({ sky: 0x030417, horizon: 0x16104c, beam: 0x7886ff, accent: 0xd6dbff }),
});

function color(value, fallback) {
  if (value?.isColor) return value.clone();
  try { return new THREE.Color(value ?? fallback); } catch { return new THREE.Color(fallback); }
}

function movementKey(value) {
  const raw = typeof value === 'object' ? value?.id ?? value?.section ?? value?.name : value;
  const key = String(raw ?? '').toLowerCase();
  if (key === '1' || key.includes('movement-1') || key.includes('movement1')) return 'movement-1';
  if (key === '2' || key.includes('movement-2') || key.includes('movement2')) return 'movement-2';
  if (key === '3' || key.includes('movement-3') || key.includes('movement3') || key.includes('red-rim')) return 'movement-3';
  if (key.includes('bridge') || key.includes('swae')) return 'bridge';
  if (key.includes('outro') || key.includes('seahawk')) return 'outro';
  return 'movement-1';
}

function resolvePalette(movement, supplied) {
  const base = PALETTES[movementKey(movement)];
  if (!supplied) return {
    sky: color(base.sky, 0x09051f),
    horizon: color(base.horizon, 0x28105a),
    beam: color(base.beam, 0xa66cff),
    accent: color(base.accent, 0xffc44d),
  };

  if (typeof supplied === 'string' && /movement|bridge|outro|swae|seahawk|red-rim/i.test(supplied)) {
    return resolvePalette(movementKey(supplied));
  }

  if (supplied?.isColor || typeof supplied === 'number' || typeof supplied === 'string') {
    const main = color(supplied, base.beam);
    return { sky: color(base.sky), horizon: main.clone().multiplyScalar(0.42), beam: main, accent: main.clone() };
  }

  return {
    sky: color(supplied.sky ?? supplied.background, base.sky),
    horizon: color(supplied.horizon ?? supplied.fog, base.horizon),
    beam: color(supplied.beam ?? supplied.primary, base.beam),
    accent: color(supplied.accent ?? supplied.rim ?? supplied.secondary, base.accent),
  };
}

function copyColor(target, value) {
  if (target?.copy && value) target.copy(value);
}

function snapshotAtmosphere(scene, atmosphere) {
  const outdoor = atmosphere?.outdoor;
  return {
    nightFactor: atmosphere?.nightFactor,
    outdoor: outdoor ? {
      ambientColor: outdoor.ambientColor?.clone?.(),
      ambientIntensity: outdoor.ambientIntensity,
      hemiIntensity: outdoor.hemiIntensity,
      sunIntensity: outdoor.sunIntensity,
      background: outdoor.background?.clone?.(),
    } : null,
    sun: atmosphere?.sun ? {
      intensity: atmosphere.sun.intensity,
      color: atmosphere.sun.color?.clone?.(),
    } : null,
    ambient: atmosphere?.ambient ? {
      intensity: atmosphere.ambient.intensity,
      color: atmosphere.ambient.color?.clone?.(),
    } : null,
    hemi: atmosphere?.hemi ? {
      intensity: atmosphere.hemi.intensity,
      color: atmosphere.hemi.color?.clone?.(),
      groundColor: atmosphere.hemi.groundColor?.clone?.(),
    } : null,
    starOpacity: atmosphere?.starMat?.opacity,
    moonOpacity: atmosphere?.moonMat?.opacity,
    cloudsVisible: atmosphere?.clouds?.visible,
    background: scene?.background ?? null,
    fogColor: scene?.fog?.color?.clone?.(),
    fogNear: scene?.fog?.near,
    fogFar: scene?.fog?.far,
    fogDensity: scene?.fog?.density,
    environmentIntensity: scene?.environmentIntensity,
  };
}

function restoreAtmosphere(scene, atmosphere, state) {
  if (!state) return;
  if (atmosphere && state.nightFactor != null) atmosphere.nightFactor = state.nightFactor;
  const outdoor = atmosphere?.outdoor;
  if (outdoor && state.outdoor) {
    copyColor(outdoor.ambientColor, state.outdoor.ambientColor);
    copyColor(outdoor.background, state.outdoor.background);
    outdoor.ambientIntensity = state.outdoor.ambientIntensity;
    outdoor.hemiIntensity = state.outdoor.hemiIntensity;
    outdoor.sunIntensity = state.outdoor.sunIntensity;
  }
  for (const key of ['sun', 'ambient', 'hemi']) {
    const light = atmosphere?.[key];
    const saved = state[key];
    if (!light || !saved) continue;
    light.intensity = saved.intensity;
    copyColor(light.color, saved.color);
    copyColor(light.groundColor, saved.groundColor);
  }
  if (atmosphere?.starMat && state.starOpacity != null) atmosphere.starMat.opacity = state.starOpacity;
  if (atmosphere?.moonMat && state.moonOpacity != null) atmosphere.moonMat.opacity = state.moonOpacity;
  if (atmosphere?.clouds && state.cloudsVisible != null) atmosphere.clouds.visible = state.cloudsVisible;
  if (scene) {
    scene.background = state.background;
    if (scene.fog?.color && state.fogColor) scene.fog.color.copy(state.fogColor);
    if (scene.fog) {
      if (Number.isFinite(state.fogNear)) scene.fog.near = state.fogNear;
      if (Number.isFinite(state.fogFar)) scene.fog.far = state.fogFar;
      if (Number.isFinite(state.fogDensity)) scene.fog.density = state.fogDensity;
    }
    if (state.environmentIntensity != null) scene.environmentIntensity = state.environmentIntensity;
  }
}

function applyAtmosphere(scene, atmosphere, baseline, palette, strength, concertBackground, flash = 0) {
  if (!scene && !atmosphere) return;
  const amount = clamp01(strength);
  const burst = clamp01(flash);
  const outdoor = atmosphere?.outdoor;
  const baseBackground = baseline?.outdoor?.background ?? baseline?.fogColor ?? new THREE.Color(0x10182b);
  concertBackground.copy(baseBackground).lerp(palette.sky, amount);

  if (atmosphere) atmosphere.nightFactor = THREE.MathUtils.lerp(finite(baseline?.nightFactor), 1, amount);
  if (outdoor) {
    copyColor(outdoor.background, concertBackground);
    if (outdoor.ambientColor) {
      const base = baseline?.outdoor?.ambientColor ?? outdoor.ambientColor;
      outdoor.ambientColor.copy(base).lerp(palette.horizon, amount * 0.72);
    }
    outdoor.ambientIntensity = THREE.MathUtils.lerp(finite(baseline?.outdoor?.ambientIntensity, 0.3), 0.2, amount);
    outdoor.hemiIntensity = THREE.MathUtils.lerp(finite(baseline?.outdoor?.hemiIntensity, 0.35), 0.14, amount);
    outdoor.sunIntensity = THREE.MathUtils.lerp(finite(baseline?.outdoor?.sunIntensity, 2), 0.08, amount);
  }

  const ambient = atmosphere?.ambient;
  if (ambient) {
    ambient.intensity = THREE.MathUtils.lerp(finite(baseline?.ambient?.intensity, 0.3), 0.2, amount);
    if (ambient.color) ambient.color.copy(baseline?.ambient?.color ?? ambient.color).lerp(palette.horizon, amount * 0.65);
  }
  const hemi = atmosphere?.hemi;
  if (hemi) {
    hemi.intensity = THREE.MathUtils.lerp(finite(baseline?.hemi?.intensity, 0.35), 0.14, amount);
    if (hemi.color) hemi.color.copy(baseline?.hemi?.color ?? hemi.color).lerp(palette.beam, amount * 0.35);
  }
  const sun = atmosphere?.sun;
  if (sun) {
    sun.intensity = THREE.MathUtils.lerp(finite(baseline?.sun?.intensity, 2), 0.08, amount);
    if (sun.color) sun.color.copy(baseline?.sun?.color ?? sun.color).lerp(palette.accent, amount * 0.5);
  }

  if (atmosphere?.starMat) atmosphere.starMat.opacity = Math.max(finite(baseline?.starOpacity), amount * 0.92);
  if (atmosphere?.moonMat) atmosphere.moonMat.opacity = Math.max(finite(baseline?.moonOpacity), amount * 0.72);
  if (atmosphere?.clouds && amount > 0.5) atmosphere.clouds.visible = false;
  if (scene) {
    // The normal atmosphere uses a baked cubemap, which cannot be tinted in
    // place. An owned flat color is a cheap, deterministic concert takeover.
    if (amount > 0.001) scene.background = concertBackground;
    if (scene.fog?.color) {
      scene.fog.color.copy(baseline?.fogColor ?? baseBackground)
        .lerp(palette.horizon, amount * 0.82)
        .lerp(palette.accent, burst * 0.55);
    }
    // Hauling the haze in on a burst is what turns the beam cones into
    // visible shafts instead of flat translucent triangles. Exponential fog
    // takes a density spike; the campus scene's linear fog takes a pull-in.
    if (scene.fog && Number.isFinite(baseline?.fogDensity)) {
      scene.fog.density = baseline.fogDensity * (1 + burst * 1.9);
    } else if (scene.fog) {
      if (Number.isFinite(baseline?.fogNear)) {
        scene.fog.near = THREE.MathUtils.lerp(baseline.fogNear, baseline.fogNear * 0.5, burst);
      }
      if (Number.isFinite(baseline?.fogFar)) {
        scene.fog.far = THREE.MathUtils.lerp(baseline.fogFar, baseline.fogFar * 0.62, burst);
      }
    }
    if (scene.environmentIntensity != null) {
      scene.environmentIntensity = THREE.MathUtils.lerp(finite(baseline?.environmentIntensity, 1), 0.18, amount);
    }
  }
}

/**
 * Build the Phase 4 concert sky takeover.
 *
 * Optional integrations are intentionally duck-typed: the module is safe to
 * import and run in a standalone Three.js scene without atmosphere or postfx.
 */
export function createConcertStaging({
  scene,
  camera,
  atmosphere = null,
  streetlights = null,
  postfx = null,
  quality = 'high',
} = {}) {
  if (!scene?.add || !scene?.remove) {
    throw new TypeError('createConcertStaging requires a Three.js scene');
  }

  const lowQuality = quality === 'low';
  const beamCount = lowQuality ? BEAM_COUNT_LOW : BEAM_COUNT_HIGH;

  const root = new THREE.Group();
  root.name = 'concert-staging';
  root.visible = false;
  scene.add(root);

  const resources = new Set();
  const own = (resource) => { resources.add(resource); return resource; };

  // --- Background sky beams -------------------------------------------
  // These are deliberately free-floating high behind Machinery: no platform,
  // truss, fixture meshes, or ground source remains at the legacy venue.
  const beamGeometry = own(new THREE.ConeGeometry(1, 1, 24, 1, true));
  beamGeometry.translate(0, -0.5, 0);
  const beams = [];
  const beamMotion = [];
  const beamHalf = (beamCount - 1) / 2;
  for (let i = 0; i < beamCount; i++) {
    const material = own(new THREE.MeshBasicMaterial({
      color: 0xa66cff, transparent: true, opacity: 0,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: true, toneMapped: false,
    }));
    const beam = new THREE.Mesh(beamGeometry, material);
    beam.name = `concert-sky-beam-${i + 1}`;
    beam.position.set(
      MACHINERY.cx + (i - beamHalf) * 23,
      38 + (i % 3) * 8,
      SKY_SHOW_REAR_Z - (i % 2) * 14,
    );
    root.add(beam);
    beams.push(beam);
    beamMotion.push({
      yawRate: (0.071 + i * 0.019) * (i % 2 ? -1 : 1),
      yawPhase: i * 1.27,
      tiltRate: 0.111 + i * 0.027,
      tiltPhase: i * 0.83,
      strobeOffset: i / beamCount,
      hueOffset: i * 0.19,
      reach: 96 + i * 7,
    });
  }

  // --- Aurora horizon wash --------------------------------------------
  // One shader-driven curtain gives the movement palettes a large readable
  // backdrop without adding real lights or geometry to the playable ground.
  const auroraUniforms = {
    uTime: { value: 0 },
    uBeat: { value: 0 },
    uStrength: { value: 0 },
    uColorA: { value: new THREE.Color(0xa66cff) },
    uColorB: { value: new THREE.Color(0xffc44d) },
  };
  const auroraMaterial = own(new THREE.ShaderMaterial({
    uniforms: auroraUniforms,
    vertexShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vUv = uv;
        vec3 p = position;
        float edge = sin(uv.x * 3.14159265);
        p.y += sin(uv.x * 15.0 + uTime * 0.42) * 8.0 * edge;
        p.z += sin(uv.x * 9.0 - uTime * 0.31) * 5.0 * edge;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uBeat;
      uniform float uStrength;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      void main() {
        float sideFade = smoothstep(0.0, 0.15, vUv.x) * (1.0 - smoothstep(0.85, 1.0, vUv.x));
        float verticalFade = smoothstep(0.02, 0.23, vUv.y) * (1.0 - smoothstep(0.68, 1.0, vUv.y));
        float curtain = 0.55 + 0.45 * sin(vUv.x * 34.0 + vUv.y * 7.0 + uTime * 0.7);
        curtain = 0.35 + 0.65 * curtain * curtain;
        vec3 wash = mix(uColorA, uColorB, vUv.y + 0.16 * sin(vUv.x * 11.0 - uTime * 0.35));
        float alpha = sideFade * verticalFade * curtain * uStrength * (0.7 + uBeat * 0.3);
        gl_FragColor = vec4(wash, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }));
  const aurora = new THREE.Mesh(
    own(new THREE.PlaneGeometry(280, 130, lowQuality ? 20 : 40, lowQuality ? 6 : 10)),
    auroraMaterial,
  );
  aurora.name = 'concert-sky-aurora';
  aurora.position.copy(SKY_SHOW_CENTER);
  aurora.position.y = 103;
  aurora.position.z -= 24;
  aurora.frustumCulled = false;
  root.add(aurora);

  const ringGeometry = own(new THREE.RingGeometry(0.92, 1, 64));
  const shockwaves = [];
  for (let i = 0; i < SHOCKWAVE_COUNT; i++) {
    const material = own(new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    const ring = new THREE.Mesh(ringGeometry, material);
    ring.name = `concert-shockwave-${i + 1}`;
    ring.position.set(
      MACHINERY_FRONT_CENTER.x,
      SKY_SHOW_CENTER.y + i * 0.02,
      SKY_SHOW_CENTER.z + 8,
    );
    ring.visible = false;
    root.add(ring);
    shockwaves.push({ ring, age: SHOCKWAVE_LIFETIME + 1 });
  }

  // --- Cue flash dome ---------------------------------------------------
  // A small inverted sphere pinned to the camera. depthTest off makes it a
  // full-view additive wash without needing a post-processing pass.
  const flashMat = own(new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0,
    side: THREE.BackSide, blending: THREE.AdditiveBlending,
    depthWrite: false, depthTest: false, toneMapped: false,
  }));
  const flashDome = new THREE.Mesh(own(new THREE.SphereGeometry(30, 16, 10)), flashMat);
  flashDome.name = 'concert-cue-flash';
  flashDome.frustumCulled = false;
  flashDome.renderOrder = 6;
  flashDome.visible = false;
  root.add(flashDome);

  root.traverse((object) => {
    object.layers.set(EXTERIOR_LAYER);
    if (object.isMesh) {
      object.castShadow = false;
      object.receiveShadow = false;
    }
  });

  const concertBackground = new THREE.Color();
  const beamTarget = new THREE.Vector3();
  const beamDirection = new THREE.Vector3();
  const shakeOffset = new THREE.Vector3();
  const nextShake = new THREE.Vector3();
  const flashColor = new THREE.Color();
  // The drifted palette handed to the atmosphere each frame. Keeping it as
  // owned scratch avoids four Color allocations per frame at 60fps.
  const framePalette = {
    sky: new THREE.Color(), horizon: new THREE.Color(),
    beam: new THREE.Color(), accent: new THREE.Color(),
  };
  let currentPalette = resolvePalette('movement-1');
  let paletteKey = '';
  let paletteSource = null;
  let atmosphereBaseline = null;
  let postfxBaseline = 0;
  let active = false;
  let disposed = false;
  let lastElapsed = 0;
  let kick = 0;
  let flashLevel = 0;
  let shockwaveCursor = 0;
  let fovOffset = 0;

  /** Re-resolve only when the movement or supplied palette actually changes. */
  function selectPalette(movement, supplied) {
    const key = movementKey(movement);
    if (key === paletteKey && supplied === paletteSource) return currentPalette;
    paletteKey = key;
    paletteSource = supplied;
    currentPalette = resolvePalette(movement, supplied);
    return currentPalette;
  }

  function restoreCamera() {
    if (!camera) return;
    if (camera.position?.sub) camera.position.sub(shakeOffset);
    shakeOffset.set(0, 0, 0);
    if (Number.isFinite(camera.fov) && fovOffset !== 0) {
      camera.fov -= fovOffset;
      fovOffset = 0;
      camera.updateProjectionMatrix?.();
    }
  }

  function setBeam(beam, target, radius) {
    beamDirection.copy(target).sub(beam.position);
    const distance = Math.max(1, beamDirection.length());
    beam.quaternion.setFromUnitVectors(DOWN, beamDirection.multiplyScalar(1 / distance));
    beam.scale.set(radius, distance, radius);
  }

  function start() {
    if (disposed || active) return api;
    atmosphereBaseline = snapshotAtmosphere(scene, atmosphere);
    postfxBaseline = finite(
      postfx?.getNight?.(),
      finite(postfx?.nightFactor, finite(atmosphereBaseline?.nightFactor)),
    );
    active = true;
    lastElapsed = 0;
    kick = 0;
    flashLevel = 0;
    paletteKey = '';
    paletteSource = null;
    currentPalette = resolvePalette('movement-1');
    root.visible = true;
    return api;
  }

  function update({
    elapsed = 0, movement = 'movement-1', beatPhase = 0, bpm = 155,
    palette = null,
  } = {}) {
    if (!active || disposed) return api;
    const now = Math.max(0, finite(elapsed));
    const dt = clamp01(now - lastElapsed);
    lastElapsed = now;
    const phase = ((finite(beatPhase) % 1) + 1) % 1;
    const pulse = phase < 0.16 ? phase / 0.16 : Math.exp(-(phase - 0.16) * 3.8);
    // Sweeps are driven in beats so the rig retimes itself with the movement.
    const beats = now * Math.max(1, finite(bpm, 155)) / 60;
    selectPalette(movement, palette);
    const takeover = clamp01(now / SKY_FADE_SECONDS);

    flashLevel *= Math.exp(-dt * FLASH_DECAY);
    if (flashLevel < 0.002) flashLevel = 0;

    // Secondary hue drift on top of the movement palette. Without it the sky
    // holds one flat colour for the whole two-minute movement.
    const drift = cycleBlend(now, SKY_CYCLE_SECONDS, 0);
    framePalette.sky.copy(currentPalette.sky).lerp(currentPalette.horizon, drift * 0.24);
    framePalette.horizon.copy(currentPalette.horizon).lerp(currentPalette.accent, drift * 0.3);
    framePalette.beam.copy(currentPalette.beam).lerp(currentPalette.accent, drift * 0.45);
    framePalette.accent.copy(currentPalette.accent).lerp(currentPalette.beam, drift * 0.25);

    applyAtmosphere(
      scene, atmosphere, atmosphereBaseline, framePalette,
      takeover, concertBackground, flashLevel,
    );
    const concertNight = 0.82 + pulse * 0.18;
    // Keep the public night factor in sync with the pulse as well. The normal
    // frame loop may call the streetlight hook again after staging, and will
    // then reproduce the concert value instead of erasing the beat response.
    if (atmosphere) {
      atmosphere.nightFactor = THREE.MathUtils.lerp(
        finite(atmosphereBaseline?.nightFactor),
        concertNight,
        takeover,
      );
    }
    streetlights?.update?.(
      atmosphere?.nightFactor ?? THREE.MathUtils.lerp(0, concertNight, takeover),
      camera?.position,
    );
    postfx?.setNight?.(THREE.MathUtils.lerp(postfxBaseline, 1, takeover));

    auroraUniforms.uTime.value = now;
    auroraUniforms.uBeat.value = pulse;
    auroraUniforms.uStrength.value = takeover * (0.1 + pulse * 0.055 + flashLevel * 0.08);
    auroraUniforms.uColorA.value.copy(framePalette.horizon).lerp(framePalette.beam, 0.5);
    auroraUniforms.uColorB.value.copy(framePalette.accent);

    for (let i = 0; i < beams.length; i++) {
      const beam = beams[i];
      const motion = beamMotion[i];
      const yaw = beats * motion.yawRate + motion.yawPhase;
      const tilt = Math.sin(beats * motion.tiltRate + motion.tiltPhase);
      const reach = motion.reach * (1 + tilt * 0.35);
      // Sweep a high upstage target so the cones cross behind the acts instead
      // of orbiting or washing whichever performer is active.
      beamTarget.set(
        SKY_SHOW_CENTER.x + Math.cos(yaw) * reach,
        142 + tilt * 42,
        SKY_SHOW_CENTER.z + Math.sin(yaw * 0.83 + motion.tiltPhase) * reach * 0.3,
      );
      setBeam(beam, beamTarget, 6.5 + i * 0.42);

      // Each cone strobes on its own slice of the bar, so they read as a rig
      // chasing the beat rather than one block fading in unison.
      const beat = (phase + motion.strobeOffset) % 1;
      const strobe = beat < 0.14 ? beat / 0.14 : Math.exp(-(beat - 0.14) * 4.4);
      const blend = cycleBlend(now, SKY_CYCLE_SECONDS, motion.hueOffset);
      beam.material.color.copy(framePalette.beam).lerp(framePalette.accent, blend);
      beam.material.opacity = takeover * (0.035 + strobe * 0.085) + flashLevel * 0.04;
    }

    if (flashLevel > 0.002) {
      flashDome.visible = true;
      flashMat.color.copy(flashColor);
      flashMat.opacity = flashLevel * 0.34;
      if (camera?.position) flashDome.position.copy(camera.position);
    } else if (flashDome.visible) {
      flashDome.visible = false;
      flashMat.opacity = 0;
    }

    for (const wave of shockwaves) {
      if (wave.age > SHOCKWAVE_LIFETIME) continue;
      wave.age += dt;
      const progress = clamp01(wave.age / SHOCKWAVE_LIFETIME);
      wave.ring.scale.setScalar(2 + progress * 135);
      wave.ring.material.opacity = Math.sin(progress * Math.PI) * (1 - progress * 0.35) * 0.9;
      if (progress >= 1) wave.ring.visible = false;
    }

    // Remove the previous camera contribution first, preserving any movement
    // made by the game camera between concert updates.
    if (camera?.position?.sub) camera.position.sub(shakeOffset);
    if (Number.isFinite(camera?.fov)) camera.fov -= fovOffset;
    kick *= Math.exp(-dt * 8.5);
    if (kick < 0.0005) kick = 0;
    const shake = Math.min(MAX_CAMERA_SHAKE, kick * MAX_CAMERA_SHAKE);
    nextShake.set(
      Math.sin(now * 79.3) * shake,
      Math.sin(now * 101.7 + 0.7) * shake * 0.72,
      0,
    );
    shakeOffset.copy(nextShake);
    if (camera?.position?.add) camera.position.add(shakeOffset);
    fovOffset = Math.min(MAX_FOV_PUNCH, kick * MAX_FOV_PUNCH);
    if (Number.isFinite(camera?.fov)) {
      camera.fov += fovOffset;
      camera.updateProjectionMatrix?.();
    }
    return api;
  }

  /**
   * Spike the full-view flash. Called on shell bursts and drum-hit cues; the
   * level decays to roughly a tenth over 150ms.
   */
  function flash(strength = 1, tint = null) {
    if (!active || disposed) return api;
    flashLevel = Math.min(1, flashLevel + clamp01(strength) * 0.85);
    if (tint && Number.isFinite(tint.r)) flashColor.setRGB(tint.r, tint.g, tint.b);
    else if (tint != null) flashColor.copy(color(tint, 0xffffff));
    else flashColor.copy(currentPalette.accent);
    return api;
  }

  function shockwave() {
    if (!active || disposed) return api;
    const wave = shockwaves[shockwaveCursor];
    shockwaveCursor = (shockwaveCursor + 1) % shockwaves.length;
    wave.age = 0;
    wave.ring.visible = true;
    wave.ring.scale.setScalar(2);
    wave.ring.material.color.copy(currentPalette.accent);
    wave.ring.material.opacity = 0;
    kick = Math.min(1, kick + 1);
    flash(1);
    return api;
  }

  function stop() {
    if (!active) return api;
    restoreCamera();
    restoreAtmosphere(scene, atmosphere, atmosphereBaseline);
    streetlights?.update?.(finite(atmosphereBaseline?.nightFactor), camera?.position);
    postfx?.setNight?.(postfxBaseline);
    for (const wave of shockwaves) {
      wave.age = SHOCKWAVE_LIFETIME + 1;
      wave.ring.visible = false;
      wave.ring.material.opacity = 0;
    }
    for (const beam of beams) beam.material.opacity = 0;
    auroraUniforms.uStrength.value = 0;
    flashLevel = 0;
    flashDome.visible = false;
    flashMat.opacity = 0;
    root.visible = false;
    active = false;
    atmosphereBaseline = null;
    return api;
  }

  function dispose() {
    if (disposed) return;
    stop();
    scene.remove(root);
    for (const resource of resources) resource.dispose?.();
    resources.clear();
    disposed = true;
  }

  const api = { start, update, shockwave, flash, stop, dispose };
  return api;
}

// ============================================================================
// Earth-stage venue
//
// This is intentionally a sibling adapter rather than a branch inside the sky
// venue above.  The existing show therefore keeps its exact object layout and
// lifecycle, while another show can opt into the same public staging contract
// with a grounded, progress-driven set.
// ============================================================================

const EARTH_STAGE_CENTER = Object.freeze([
  EARTH_STAGE_CENTER_XZ.x,
  0,
  EARTH_STAGE_CENTER_XZ.z,
]);
const EARTH_STAGE_HEIGHT = EARTH_STAGE_TOP;
const EARTH_STAGE_REST_Y = 0.025;
const EARTH_BEAM_HEIGHT = 92;
const EARTH_BEAM_RING_RADIUS = 32;
const EARTH_SHOCKWAVE_LIFETIME = 1.35;

const EARTH_PALETTES = Object.freeze({
  intro: Object.freeze({ sky: 0x010101, horizon: 0x100503, beam: 0xd88635, accent: 0xffe4bd }),
  verse: Object.freeze({ sky: 0x010101, horizon: 0x160603, beam: 0xb94d22, accent: 0xffaa4a }),
  chorus: Object.freeze({ sky: 0x020101, horizon: 0x250703, beam: 0xffa53d, accent: 0xfff2d7 }),
  horn: Object.freeze({ sky: 0x010101, horizon: 0x200602, beam: 0xff7a20, accent: 0xffcf72 }),
  'horn-sparse': Object.freeze({ sky: 0x010101, horizon: 0x120402, beam: 0xc65b1f, accent: 0xffb85a }),
  'horn-rising': Object.freeze({ sky: 0x010101, horizon: 0x1c0903, beam: 0xffe0a3, accent: 0xffffff }),
  bridge: Object.freeze({ sky: 0x020101, horizon: 0x260505, beam: 0xd52f1d, accent: 0xffd59a }),
  'bridge-climax': Object.freeze({ sky: 0x010102, horizon: 0x190410, beam: 0xff3d24, accent: 0xffd45c }),
  finale: Object.freeze({ sky: 0x010101, horizon: 0x310805, beam: 0xffb13f, accent: 0xffffff }),
  outro: Object.freeze({ sky: 0x010101, horizon: 0x120403, beam: 0xc96d2b, accent: 0xffe1bd }),
});

const EARTH_CLIMAX_COLORS = Object.freeze([
  0xff3d24, 0xffa62b, 0xfff1c4, 0xc653ff,
  0x4abfff, 0xff4f91, 0xffd45c, 0xffffff,
].map((value) => new THREE.Color(value)));

function earthSectionKey(value) {
  const raw = typeof value === 'object'
    ? [value?.target, value?.section, value?.id].filter(Boolean).join(' ')
    : value;
  const key = String(raw ?? '').toLowerCase();
  if (key.includes('chorus-final') || key.includes('finale')) return 'finale';
  if (key.includes('bridge-climax') || key.includes('multicolor') || key.includes('climax')) {
    return 'bridge-climax';
  }
  if (key.includes('horn-break-4') || key.includes('sparse')) return 'horn-sparse';
  if (key.includes('horn-break-5') || key.includes('rising')) return 'horn-rising';
  if (key.includes('outro')) return 'outro';
  if (key.includes('bridge')) return 'bridge';
  if (key.includes('horn')) return 'horn';
  if (key.includes('chorus')) return 'chorus';
  if (key.includes('verse')) return 'verse';
  if (key.includes('intro') || key.includes('arm')) return 'intro';
  return null;
}

function roughenTerrace(geometry, tier) {
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const radius = Math.hypot(x, z);
    if (radius < 0.001) continue;
    const angle = Math.atan2(z, x);
    const variation = Math.min(EARTH_STAGE_FOOTPRINT_RADIUS / EARTH_STAGE_BASE_RADIUS, 1
      + Math.sin(angle * 5 + tier * 1.73) * 0.022
      + Math.sin(angle * 11 - tier * 0.91) * 0.012);
    position.setX(i, x * variation);
    position.setZ(i, z * variation);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function smooth01(value) {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

/**
 * Build the grounded earth-mound venue used by the second concert.
 *
 * `armingProgress` and `teardownProgress` are normalized 0..1 values. If a
 * caller does not provide an arming value, the adapter retains a four-second
 * song-clock fallback so it remains useful in isolation and in the harness.
 * `stop()` remains an immediate, cleanup-safe stop just like the sky adapter;
 * drive `teardownProgress` through update() before calling it for the visible
 * sink animation.
 */
export function createEarthConcertStaging({
  scene,
  camera,
  atmosphere = null,
  streetlights = null,
  postfx = null,
  quality = 'high',
  center = EARTH_STAGE_CENTER,
  stageTop = EARTH_STAGE_HEIGHT,
} = {}) {
  if (!scene?.add || !scene?.remove) {
    throw new TypeError('createEarthConcertStaging requires a Three.js scene');
  }

  const lowQuality = quality === 'low';
  const beamCount = lowQuality ? 5 : 8;
  const hazeCount = lowQuality ? 2 : 3;
  const moundHeight = Math.max(1, finite(stageTop, EARTH_STAGE_HEIGHT));
  const moundHeightScale = moundHeight / EARTH_STAGE_HEIGHT;
  const moundHiddenY = -moundHeight - 0.5;
  const stageCenter = new THREE.Vector3(...EARTH_STAGE_CENTER);
  if (Array.isArray(center) || ArrayBuffer.isView(center)) {
    stageCenter.set(
      finite(center[0], EARTH_STAGE_CENTER[0]),
      finite(center[1], EARTH_STAGE_CENTER[1]),
      finite(center[2], EARTH_STAGE_CENTER[2]),
    );
  } else if (center && typeof center === 'object') {
    stageCenter.set(
      finite(center.x, EARTH_STAGE_CENTER[0]),
      finite(center.y, EARTH_STAGE_CENTER[1]),
      finite(center.z, EARTH_STAGE_CENTER[2]),
    );
  }

  const root = new THREE.Group();
  root.name = 'concert-earth-staging';
  root.position.copy(stageCenter);
  root.visible = false;
  scene.add(root);

  const resources = new Set();
  const own = (resource) => { resources.add(resource); return resource; };

  // --- Terraced raw-earth mound --------------------------------------------
  const moundRoot = new THREE.Group();
  moundRoot.name = 'concert-earth-mound';
  moundRoot.position.y = moundHiddenY;
  root.add(moundRoot);

  const radiusScale = EARTH_STAGE_BASE_RADIUS / 39;
  const terraceSpecs = [
    { bottom: 39, top: 32.5, height: 9, y: 4.5, color: 0x4b2919 },
    { bottom: 29.5, top: 24, height: 9, y: 13.5, color: 0x5c321d },
    { bottom: 21.5, top: 16.5, height: 8.5, y: 22.25, color: 0x6b3b21 },
    { bottom: 14, top: 10.5, height: 7.5, y: 30.25, color: 0x754329 },
  ].map((spec) => ({
    ...spec,
    bottom: spec.bottom * radiusScale,
    top: spec.top * radiusScale,
  }));
  terraceSpecs.forEach((spec, index) => {
    const geometry = own(roughenTerrace(
      new THREE.CylinderGeometry(spec.top, spec.bottom, spec.height, lowQuality ? 16 : 22, 1),
      index,
    ));
    geometry.scale(1, moundHeightScale, 1);
    const material = own(new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: 0.98,
      metalness: 0,
      flatShading: true,
    }));
    const terrace = new THREE.Mesh(geometry, material);
    terrace.name = `concert-earth-terrace-${index + 1}`;
    terrace.position.y = spec.y * moundHeightScale;
    moundRoot.add(terrace);
  });

  // A stable summit transform lets integration either parent the performer or
  // read the numeric world-space Y from the public getters below.
  const performerAnchor = new THREE.Group();
  performerAnchor.name = 'concert-earth-performer-anchor';
  performerAnchor.position.y = moundHeight;
  moundRoot.add(performerAnchor);

  // --- Cheap crossed-plane haze --------------------------------------------
  const hazeUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uColor: { value: new THREE.Color(0xb94d22) },
  };
  const hazeMaterial = own(new THREE.ShaderMaterial({
    uniforms: hazeUniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uColor;
      void main() {
        float side = smoothstep(0.0, 0.18, vUv.x) * (1.0 - smoothstep(0.82, 1.0, vUv.x));
        float vertical = smoothstep(0.0, 0.16, vUv.y) * (1.0 - smoothstep(0.74, 1.0, vUv.y));
        float wisp = 0.62 + 0.38 * sin(vUv.x * 17.0 + vUv.y * 5.0 + uTime * 0.35);
        gl_FragColor = vec4(uColor, side * vertical * wisp * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }));
  const hazeGeometry = own(new THREE.PlaneGeometry(64, 24, 1, 1));
  for (let i = 0; i < hazeCount; i++) {
    const haze = new THREE.Mesh(hazeGeometry, hazeMaterial);
    haze.name = `concert-earth-haze-${i + 1}`;
    haze.position.y = 13 + i * 1.3;
    haze.rotation.y = i / hazeCount * Math.PI;
    haze.renderOrder = 1;
    moundRoot.add(haze);
  }

  // --- Vertical emissive beam ring -----------------------------------------
  // The open cylinders are bloom geometry, not real lights. A tiny pooled
  // spotlight rig below supplies actual illumination for the black performer
  // and the matte dirt.
  const beamGeometry = own(new THREE.CylinderGeometry(2.1, 0.72, 1, lowQuality ? 8 : 12, 1, true));
  beamGeometry.translate(0, 0.5, 0);
  const beams = [];
  for (let i = 0; i < beamCount; i++) {
    const angle = i / beamCount * TAU;
    const material = own(new THREE.MeshBasicMaterial({
      color: 0xffa53d,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
    }));
    const beam = new THREE.Mesh(beamGeometry, material);
    beam.name = `concert-earth-beam-${i + 1}`;
    beam.position.set(
      Math.cos(angle) * EARTH_BEAM_RING_RADIUS,
      0.3,
      Math.sin(angle) * EARTH_BEAM_RING_RADIUS,
    );
    root.add(beam);
    beams.push({ beam, angle, phase: i / beamCount });
  }

  // --- Warm key/fill/rim lights --------------------------------------------
  const lightSpecs = [
    { color: 0xffe2ba, intensity: 240, position: [0, 108, 22], angle: Math.PI / 5.2 },
    { color: 0xff9a38, intensity: 170, position: [-27, 58, 18], angle: Math.PI / 4.1 },
    { color: 0xb82416, intensity: 150, position: [27, 54, -18], angle: Math.PI / 4.1 },
  ];
  const moundLights = lightSpecs.map((spec, index) => {
    const light = new THREE.SpotLight(spec.color, 0, 145, spec.angle, 0.68, 1.25);
    light.name = `concert-earth-light-${index + 1}`;
    light.position.fromArray(spec.position);
    light.castShadow = false;
    light.userData.baseIntensity = spec.intensity;
    light.target.name = `concert-earth-light-target-${index + 1}`;
    root.add(light, light.target);
    return light;
  });
  // A compact warm fill close to the summit keeps the all-black costume
  // readable against the near-black sky without flattening the dirt tiers.
  const performerFill = new THREE.PointLight(0xffd8ad, 0, 105, 2);
  performerFill.name = 'concert-earth-performer-fill';
  performerFill.position.set(0, moundHeight + 27, 13);
  performerFill.castShadow = false;
  root.add(performerFill);

  // --- Ground shockwave pool ------------------------------------------------
  const ringGeometry = own(new THREE.RingGeometry(0.92, 1, 64));
  const shockwaves = [];
  for (let i = 0; i < SHOCKWAVE_COUNT; i++) {
    const material = own(new THREE.MeshBasicMaterial({
      color: 0xffd28a,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }));
    const ring = new THREE.Mesh(ringGeometry, material);
    ring.name = `concert-earth-shockwave-${i + 1}`;
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.24 + i * 0.012;
    ring.visible = false;
    root.add(ring);
    shockwaves.push({ ring, age: EARTH_SHOCKWAVE_LIFETIME + 1 });
  }

  // --- Full-view cue flash --------------------------------------------------
  const flashMat = own(new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  }));
  const flashDome = new THREE.Mesh(own(new THREE.SphereGeometry(30, 16, 10)), flashMat);
  flashDome.name = 'concert-earth-cue-flash';
  flashDome.frustumCulled = false;
  flashDome.renderOrder = 6;
  flashDome.visible = false;
  root.add(flashDome);

  root.traverse((object) => {
    object.layers.set(EXTERIOR_LAYER);
    if (object.isMesh) {
      object.castShadow = false;
      object.receiveShadow = false;
    }
  });

  const up = new THREE.Vector3(0, 1, 0);
  const beamTarget = new THREE.Vector3();
  const beamDirection = new THREE.Vector3();
  const shakeOffset = new THREE.Vector3();
  const nextShake = new THREE.Vector3();
  const flashColor = new THREE.Color();
  const earthRed = new THREE.Color(0xff351c);
  const concertBackground = new THREE.Color();
  const framePalette = {
    sky: new THREE.Color(),
    horizon: new THREE.Color(),
    beam: new THREE.Color(),
    accent: new THREE.Color(),
  };
  let currentPalette = null;
  let paletteKey = '';
  let paletteSource = null;
  let lightProfile = 'intro';
  let atmosphereBaseline = null;
  let postfxBaseline = 0;
  let active = false;
  let disposed = false;
  let lastElapsed = 0;
  let lastArmingProgress = 0;
  let lastTeardownProgress = 0;
  let stageLevel = 0;
  let sawExternalArming = false;
  let teardownStarted = false;
  let kick = 0;
  let flashLevel = 0;
  let shockwaveCursor = 0;
  let fovOffset = 0;

  function selectPalette(key, supplied) {
    const resolvedKey = EARTH_PALETTES[key] ? key : 'intro';
    if (resolvedKey === paletteKey && supplied === paletteSource && currentPalette) return currentPalette;
    paletteKey = resolvedKey;
    paletteSource = supplied;
    const base = EARTH_PALETTES[resolvedKey];
    if (!supplied) {
      currentPalette = {
        sky: color(base.sky),
        horizon: color(base.horizon),
        beam: color(base.beam),
        accent: color(base.accent),
      };
    } else if (supplied?.isColor || typeof supplied === 'number' || typeof supplied === 'string') {
      const main = color(supplied, base.beam);
      currentPalette = {
        sky: color(base.sky),
        horizon: main.clone().multiplyScalar(0.18),
        beam: main,
        accent: main.clone().lerp(new THREE.Color(0xffffff), 0.35),
      };
    } else {
      currentPalette = {
        sky: color(supplied.sky ?? supplied.background, base.sky),
        horizon: color(supplied.horizon ?? supplied.fog, base.horizon),
        beam: color(supplied.beam ?? supplied.primary, base.beam),
        accent: color(supplied.accent ?? supplied.secondary, base.accent),
      };
    }
    return currentPalette;
  }

  function restoreCamera() {
    if (!camera) return;
    if (camera.position?.sub) camera.position.sub(shakeOffset);
    shakeOffset.set(0, 0, 0);
    if (Number.isFinite(camera.fov) && fovOffset !== 0) {
      camera.fov -= fovOffset;
      fovOffset = 0;
      camera.updateProjectionMatrix?.();
    }
  }

  function setColumn(beam, target, width = 1) {
    beamDirection.copy(target).sub(beam.position);
    const distance = Math.max(1, beamDirection.length());
    beam.quaternion.setFromUnitVectors(up, beamDirection.multiplyScalar(1 / distance));
    beam.scale.set(width, distance, width);
  }

  function resolveStageLevel(now, state, armingProgress, teardownProgress) {
    if ((teardownStarted || state === 'teardown') && Number.isFinite(teardownProgress)) {
      return 1 - smooth01(teardownProgress);
    }
    if (teardownStarted) return stageLevel;
    if (Number.isFinite(armingProgress)) {
      sawExternalArming = true;
      const progress = clamp01(armingProgress);
      return 1 - Math.pow(1 - progress, 3);
    }
    if (sawExternalArming) return 1;
    const fallback = clamp01(now / 4);
    return 1 - Math.pow(1 - fallback, 3);
  }

  function start() {
    if (disposed || active) return api;
    atmosphereBaseline = snapshotAtmosphere(scene, atmosphere);
    postfxBaseline = finite(
      postfx?.getNight?.(),
      finite(postfx?.nightFactor, finite(atmosphereBaseline?.nightFactor)),
    );
    active = true;
    lastElapsed = 0;
    lastArmingProgress = 0;
    lastTeardownProgress = 0;
    stageLevel = 0;
    sawExternalArming = false;
    teardownStarted = false;
    kick = 0;
    flashLevel = 0;
    shockwaveCursor = 0;
    lightProfile = 'intro';
    paletteKey = '';
    paletteSource = null;
    currentPalette = null;
    moundRoot.position.y = moundHiddenY;
    root.visible = true;
    return api;
  }

  function update({
    elapsed = 0,
    movement = null,
    beatPhase = 0,
    bpm = 142,
    palette = null,
    state = null,
    armingProgress = null,
    teardownProgress = null,
  } = {}) {
    if (!active || disposed) return api;
    const now = Math.max(0, finite(elapsed));
    let dt = clamp01(now - lastElapsed);
    lastElapsed = now;
    // The song clock deliberately freezes during teardown. Use normalized
    // lifecycle progress as the visual clock there (and during media pre-roll)
    // so flashes, rings, and camera kick still decay smoothly.
    if (state === 'arming' && Number.isFinite(armingProgress)) {
      dt = Math.max(dt, clamp01((armingProgress - lastArmingProgress) * 4));
      lastArmingProgress = armingProgress;
    }
    if ((teardownStarted || state === 'teardown') && Number.isFinite(teardownProgress)) {
      dt = Math.max(dt, clamp01((teardownProgress - lastTeardownProgress) * 4));
      lastTeardownProgress = teardownProgress;
    }
    const phase = ((finite(beatPhase) % 1) + 1) % 1;
    const pulse = phase < 0.15 ? phase / 0.15 : Math.exp(-(phase - 0.15) * 4.1);
    const beats = now * Math.max(1, finite(bpm, 142)) / 60;
    const movementProfile = earthSectionKey(movement);
    if (movementProfile) lightProfile = movementProfile;
    selectPalette(lightProfile, palette);

    stageLevel = resolveStageLevel(now, state, armingProgress, teardownProgress);
    moundRoot.position.y = THREE.MathUtils.lerp(
      moundHiddenY,
      EARTH_STAGE_REST_Y,
      stageLevel,
    );

    flashLevel *= Math.exp(-dt * FLASH_DECAY);
    if (flashLevel < 0.002) flashLevel = 0;

    // Keep the sky very close to black; only the horizon and light shafts carry
    // the earth-tone movement color.
    const drift = cycleBlend(now, 17, 0);
    framePalette.sky.copy(currentPalette.sky).lerp(currentPalette.horizon, drift * 0.06);
    framePalette.horizon.copy(currentPalette.horizon).lerp(currentPalette.beam, drift * 0.12);
    framePalette.beam.copy(currentPalette.beam).lerp(currentPalette.accent, drift * 0.24);
    framePalette.accent.copy(currentPalette.accent).lerp(currentPalette.beam, drift * 0.12);
    applyAtmosphere(
      scene,
      atmosphere,
      atmosphereBaseline,
      framePalette,
      stageLevel,
      concertBackground,
      flashLevel,
    );
    // The sky venue deliberately reveals stars and moon; this grounded venue
    // wants a blank, near-black roof over the practical lights.
    if (atmosphere?.starMat) {
      atmosphere.starMat.opacity = THREE.MathUtils.lerp(finite(atmosphereBaseline?.starOpacity), 0, stageLevel);
    }
    if (atmosphere?.moonMat) {
      atmosphere.moonMat.opacity = THREE.MathUtils.lerp(finite(atmosphereBaseline?.moonOpacity), 0, stageLevel);
    }
    if (atmosphere?.clouds && stageLevel > 0.05) atmosphere.clouds.visible = false;

    const concertNight = 0.92 + pulse * 0.08;
    if (atmosphere) {
      atmosphere.nightFactor = THREE.MathUtils.lerp(
        finite(atmosphereBaseline?.nightFactor),
        concertNight,
        stageLevel,
      );
    }
    streetlights?.update?.(
      atmosphere?.nightFactor ?? THREE.MathUtils.lerp(0, concertNight, stageLevel),
      camera?.position,
    );
    postfx?.setNight?.(THREE.MathUtils.lerp(postfxBaseline, 1, stageLevel));

    // Haze follows the mound, remains intentionally faint, and drops out on
    // the low tier sooner than any geometry-heavy volumetric approximation.
    hazeUniforms.uTime.value = now;
    hazeUniforms.uColor.value.copy(framePalette.horizon).lerp(framePalette.beam, 0.36);
    hazeUniforms.uOpacity.value = stageLevel * (lowQuality ? 0.035 : 0.052) * (0.8 + pulse * 0.2);

    // Section changes replace these formulas immediately: vertical intro,
    // slow verse sweep, chorus fan, horn chase, sparse/rising break variants,
    // crossed bridge, multicolor climax, and all-column finale spread.
    for (let i = 0; i < beams.length; i++) {
      const record = beams[i];
      const { beam, angle } = record;
      let radial = 0;
      let tangent = 0;
      let height = EARTH_BEAM_HEIGHT;
      let energy = 0.035 + pulse * 0.045;
      if (lightProfile === 'verse') {
        radial = Math.sin(beats * 0.22 + i * 1.13) * 7;
        tangent = Math.sin(beats * 0.15 + i * 0.71) * 3;
        energy = 0.025 + pulse * 0.032;
      } else if (lightProfile === 'chorus') {
        radial = i % 2 ? 17 : -5;
        tangent = i % 2 ? 5 : -5;
        height = 98;
        energy = 0.055 + pulse * 0.12;
      } else if (lightProfile === 'horn') {
        radial = 13;
        tangent = Math.sin(beats * TAU + i) * 10;
        const chasePhase = (phase + record.phase) % 1;
        const chase = chasePhase < 0.18 ? 1 - chasePhase / 0.18 : 0;
        energy = 0.035 + chase * 0.17;
      } else if (lightProfile === 'horn-sparse') {
        const sparseOn = i % 3 === 0;
        radial = sparseOn ? 8 : -4;
        tangent = Math.sin(beats * 0.18 + i) * 3;
        height = sparseOn ? 91 : 68;
        energy = sparseOn ? 0.04 + pulse * 0.075 : 0.0015;
      } else if (lightProfile === 'horn-rising') {
        const rise = (phase + record.phase * 0.72) % 1;
        radial = 5 + rise * 15;
        tangent = Math.sin(beats * 0.48 + i * 0.8) * 5;
        height = 72 + rise * 42;
        energy = 0.035 + rise * 0.055 + pulse * 0.055;
      } else if (lightProfile === 'bridge') {
        radial = i % 2 ? 12 : -12;
        tangent = Math.sin(beats * 0.34 + i * 1.4) * 8;
        height = 104;
        energy = 0.04 + pulse * 0.075;
      } else if (lightProfile === 'bridge-climax') {
        radial = 17 + (i % 2) * 7;
        tangent = Math.sin(beats * 0.31 + i * 1.23) * 10;
        height = 105 + (i % 3) * 5;
        energy = 0.06 + pulse * 0.115;
      } else if (lightProfile === 'finale') {
        radial = 20;
        tangent = (i - (beams.length - 1) / 2) * 1.6;
        height = 108;
        energy = 0.075 + pulse * 0.14;
      } else if (lightProfile === 'outro') {
        radial = Math.sin(i * 2.2) * 4;
        height = 86;
        energy = 0.03 + pulse * 0.05;
      }

      beamTarget.set(
        beam.position.x + Math.cos(angle) * radial + Math.cos(angle + Math.PI / 2) * tangent,
        height,
        beam.position.z + Math.sin(angle) * radial + Math.sin(angle + Math.PI / 2) * tangent,
      );
      setColumn(beam, beamTarget, 0.82 + (i % 3) * 0.06);
      if (lightProfile === 'bridge-climax') {
        beam.material.color.copy(EARTH_CLIMAX_COLORS[i % EARTH_CLIMAX_COLORS.length]);
      } else {
        beam.material.color.copy(i % 2 ? framePalette.beam : framePalette.accent);
      }
      beam.material.opacity = stageLevel * energy + flashLevel * 0.035;
    }

    const summitY = moundRoot.position.y + moundHeight;
    for (let i = 0; i < moundLights.length; i++) {
      const light = moundLights[i];
      // Aim through the performer's torso rather than only at the plateau;
      // the broad cones still spill enough warm light across the dirt tiers.
      light.target.position.set(0, summitY + (i === 0 ? 18 : 22), 0);
      const profileBoost = lightProfile === 'chorus' || lightProfile === 'finale' || lightProfile === 'bridge-climax'
        ? 1.22
        : lightProfile === 'bridge' || lightProfile === 'horn' || lightProfile === 'horn-rising'
          ? 1.08
          : lightProfile === 'horn-sparse' ? 0.72 : 0.86;
      light.intensity = light.userData.baseIntensity
        * stageLevel
        * profileBoost
        * (0.78 + pulse * 0.22 + flashLevel * 0.22);
      if (i === 0) light.color.copy(framePalette.accent);
      else if (i === 1) light.color.copy(framePalette.beam);
      else light.color.copy(framePalette.horizon).lerp(earthRed, 0.55);
    }
    performerFill.color.copy(framePalette.accent);
    performerFill.intensity = 170 * stageLevel * (0.72 + pulse * 0.28 + flashLevel * 0.18);

    if (flashLevel > 0.002) {
      flashDome.visible = true;
      flashMat.color.copy(flashColor);
      flashMat.opacity = flashLevel * 0.34;
      if (camera?.position) flashDome.position.copy(camera.position).sub(root.position);
    } else if (flashDome.visible) {
      flashDome.visible = false;
      flashMat.opacity = 0;
    }

    for (const wave of shockwaves) {
      if (wave.age > EARTH_SHOCKWAVE_LIFETIME) continue;
      wave.age += dt;
      const progress = clamp01(wave.age / EARTH_SHOCKWAVE_LIFETIME);
      wave.ring.scale.setScalar(2 + progress * 91);
      wave.ring.material.opacity = Math.sin(progress * Math.PI) * (1 - progress * 0.35) * stageLevel * 0.9;
      if (progress >= 1) wave.ring.visible = false;
    }

    // Same capped kick used by the sky venue.
    if (camera?.position?.sub) camera.position.sub(shakeOffset);
    if (Number.isFinite(camera?.fov)) camera.fov -= fovOffset;
    kick *= Math.exp(-dt * 8.5);
    if (kick < 0.0005) kick = 0;
    const shake = Math.min(MAX_CAMERA_SHAKE, kick * MAX_CAMERA_SHAKE);
    nextShake.set(
      Math.sin(now * 79.3) * shake,
      Math.sin(now * 101.7 + 0.7) * shake * 0.72,
      0,
    );
    shakeOffset.copy(nextShake);
    if (camera?.position?.add) camera.position.add(shakeOffset);
    fovOffset = Math.min(MAX_FOV_PUNCH, kick * MAX_FOV_PUNCH);
    if (Number.isFinite(camera?.fov)) {
      camera.fov += fovOffset;
      camera.updateProjectionMatrix?.();
    }
    return api;
  }

  function lightCue(cue) {
    const raw = typeof cue === 'object'
      ? [cue?.target, cue?.section, cue?.id].filter(Boolean).join(' ').toLowerCase()
      : String(cue ?? '').toLowerCase();
    const next = earthSectionKey(raw);
    if (next) lightProfile = next;
    paletteKey = '';
    if (active && (
      raw.includes('arrival')
      || raw.includes('strobe')
      || raw.includes('flash')
      || next === 'chorus'
      || next === 'horn'
      || next === 'horn-rising'
      || next === 'bridge-climax'
      || next === 'finale'
    )) {
      const strength = next === 'finale'
        ? 1
        : next === 'bridge-climax' ? 0.94 : next === 'horn' || next === 'horn-rising' ? 0.72 : 0.86;
      flash(strength, EARTH_PALETTES[next || lightProfile]?.accent ?? 0xffffff);
    }
    return api;
  }

  function beginTeardown() {
    if (!active || disposed) return api;
    // The director supplies normalized teardownProgress on subsequent frames.
    // Remember the transition so an omitted first progress sample cannot fall
    // back to the song-clock arming animation.
    teardownStarted = true;
    sawExternalArming = true;
    return api;
  }

  function flash(strength = 1, tint = null) {
    if (!active || disposed) return api;
    flashLevel = Math.min(1, flashLevel + clamp01(strength) * 0.85);
    if (tint && Number.isFinite(tint.r)) flashColor.setRGB(tint.r, tint.g, tint.b);
    else if (tint != null) flashColor.copy(color(tint, 0xffffff));
    else flashColor.copy(currentPalette?.accent ?? new THREE.Color(0xffffff));
    return api;
  }

  function shockwave() {
    if (!active || disposed) return api;
    const wave = shockwaves[shockwaveCursor];
    shockwaveCursor = (shockwaveCursor + 1) % shockwaves.length;
    wave.age = 0;
    wave.ring.visible = true;
    wave.ring.scale.setScalar(2);
    wave.ring.material.color.copy(currentPalette?.accent ?? new THREE.Color(0xffd28a));
    wave.ring.material.opacity = 0;
    kick = Math.min(1, kick + 1);
    flash(1);
    return api;
  }

  function stop() {
    if (!active) return api;
    restoreCamera();
    restoreAtmosphere(scene, atmosphere, atmosphereBaseline);
    streetlights?.update?.(finite(atmosphereBaseline?.nightFactor), camera?.position);
    postfx?.setNight?.(postfxBaseline);
    for (const wave of shockwaves) {
      wave.age = EARTH_SHOCKWAVE_LIFETIME + 1;
      wave.ring.visible = false;
      wave.ring.material.opacity = 0;
    }
    for (const { beam } of beams) beam.material.opacity = 0;
    for (const light of moundLights) light.intensity = 0;
    performerFill.intensity = 0;
    hazeUniforms.uOpacity.value = 0;
    flashLevel = 0;
    flashDome.visible = false;
    flashMat.opacity = 0;
    stageLevel = 0;
    teardownStarted = false;
    moundRoot.position.y = moundHiddenY;
    root.visible = false;
    active = false;
    atmosphereBaseline = null;
    return api;
  }

  function dispose() {
    if (disposed) return;
    stop();
    scene.remove(root);
    for (const resource of resources) resource.dispose?.();
    resources.clear();
    disposed = true;
  }

  function getStageTop(target = new THREE.Vector3()) {
    return target.set(
      root.position.x,
      root.position.y + moundRoot.position.y + moundHeight,
      root.position.z,
    );
  }

  function debugState() {
    return {
      active,
      lightProfile,
      stageLevel,
      visibleBeamCount: beams.reduce((count, { beam }) => (
        count + (beam.material.opacity > 0.01 ? 1 : 0)
      ), 0),
      center: { x: root.position.x, y: root.position.y, z: root.position.z },
    };
  }

  const api = {
    start,
    update,
    shockwave,
    flash,
    lightCue,
    beginTeardown,
    stop,
    dispose,
    debugState,
    performerAnchor,
    get stageTop() {
      return root.position.y + moundRoot.position.y + moundHeight;
    },
    get performerY() {
      return root.position.y + moundRoot.position.y + moundHeight;
    },
    getStageTop,
  };
  return api;
}
