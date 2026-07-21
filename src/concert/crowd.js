import * as THREE from 'three';
import { createShrimpWorker } from '../characters/shrimpWorker.js';
import { EXTERIOR_LAYER } from '../zones.js';
import { BUILDING_BY_ID, translateLaitramMachineryPoint } from '../map/layoutData.js';

// ============================================================================
// Concert crowd — a field of shrimp people on the ground dancing to the show.
//
// Both concerts headline the same spot on Laitram Machinery, so a single
// grounded audience serves the sky (Sicko) and earth (Ye) sets alike. The
// dancers are built once, parented under one group added to the scene at
// construction, and only toggled visible on start()/stop(). That mirrors the
// staging modules so the concert wrapper's structural audit (which snapshots
// scene child/object counts) stays balanced across a show's lifecycle.
//
// Motion is fully procedural on the existing rigid-part rig — every dancer
// reads the stable `root.userData.parts` contract, so no skinning or gait
// engine is involved. The whole field is beat-driven, so it retimes itself to
// each section's BPM exactly like the beams and fireworks do.
// ============================================================================

const TAU = Math.PI * 2;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const finite = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);

const MACHINERY = BUILDING_BY_ID['laitram-machinery'];
// The front of the machinery footprint is the audience plaza both stages face.
const FRONT_CENTER = translateLaitramMachineryPoint(35, 19.5);
// Sit the crowd in the open plaza between the machinery front wall (z~80) and
// Laitram Lane (z~96.5) / the player spawn (z=100), facing back toward the
// stage on the roof at -z. The rows are centered on this point.
const DEFAULT_CENTER = Object.freeze({ x: FRONT_CENTER.x, z: FRONT_CENTER.z + 3.5 });

// A small set of shell/vest hues keeps the color-keyed texture caches warm:
// every dancer of a given color shares one rasterized canvas.
const SHELL_COLORS = [0xe8744f, 0xd85a3f, 0xf29a5e, 0xc65a34, 0xe86f8a, 0xcf6f45];
const VEST_COLORS = [0xf2c12e, 0xff8a3d, 0xffd34d];
const ACCESSORIES = ['none', 'toolbelt'];

// Deterministic per-run jitter so the field looks scattered but rebuilds the
// same way each session (no Math.random in the hot path or the layout).
function hashRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Build the grounded dancing-shrimp audience.
 *
 * The crowd is inert until start(); update() only animates while active, so it
 * costs nothing between shows beyond the (invisible) meshes it owns.
 */
export function createConcertCrowd({ scene, quality = 'high', center = DEFAULT_CENTER } = {}) {
  if (!scene?.add || !scene?.remove) {
    throw new TypeError('createConcertCrowd requires a Three.js scene');
  }

  const lowQuality = quality === 'low';
  const cols = lowQuality ? 5 : 8;
  const rows = lowQuality ? 2 : 3;
  const colSpacing = 9.5;
  const rowSpacing = 4.6;

  const root = new THREE.Group();
  root.name = 'concert-crowd';
  root.visible = false;
  scene.add(root);

  const centerX = finite(center?.x, DEFAULT_CENTER.x);
  const centerZ = finite(center?.z, DEFAULT_CENTER.z);
  const halfSpan = (cols - 1) / 2;

  const dancers = [];
  let seed = 0;
  for (let r = 0; r < rows; r++) {
    // Stagger alternate rows by half a column so nobody hides directly behind
    // the dancer in front, and so the block reads as a packed crowd.
    const rowOffset = (r % 2) * 0.5;
    for (let c = 0; c < cols; c++) {
      const jx = (hashRandom(seed + 1) - 0.5) * 3.2;
      const jz = (hashRandom(seed + 2) - 0.5) * 2.4;
      const x = centerX + (c - halfSpan + rowOffset) * colSpacing + jx;
      // Rows are centered on the plaza point so the block stays clear of both
      // the machinery wall and the lane behind it.
      const z = centerZ + (r - (rows - 1) / 2) * rowSpacing + jz;

      const shellColor = SHELL_COLORS[seed % SHELL_COLORS.length];
      const vestColor = VEST_COLORS[(seed >> 1) % VEST_COLORS.length];
      const accessory = ACCESSORIES[seed % ACCESSORIES.length];
      const worker = createShrimpWorker({ shellColor, vestColor, accessory, seed });

      const dancer = new THREE.Group();
      dancer.name = `concert-crowd-dancer-${seed + 1}`;
      dancer.position.set(x, 0, z);
      const scale = 0.9 + hashRandom(seed + 3) * 0.28;
      dancer.scale.setScalar(scale);
      // Face the stage (shrimp forward is +z, the stage sits at -z), with a
      // little per-dancer yaw jitter so the rows aren't a rigid grid.
      const baseRotY = Math.PI + (hashRandom(seed + 4) - 0.5) * 0.5;
      dancer.rotation.y = baseRotY;
      dancer.add(worker);
      root.add(dancer);

      const parts = worker.userData.parts;
      dancers.push({
        group: dancer,
        parts,
        baseRotY,
        style: seed % 3,
        phase: hashRandom(seed + 5),
        bobAmp: 0.14 + hashRandom(seed + 6) * 0.12,
        armAmp: 1.0 + hashRandom(seed + 7) * 0.5,
        swayAmp: 0.1 + hashRandom(seed + 8) * 0.12,
        swaySpeed: 1.5 + hashRandom(seed + 9) * 1.2,
        // Rest angles the builder baked into each arm's internal geometry; the
        // dance adds onto these so the raised pose still looks like an arm.
        armRestX: parts.armL.rotation.x,
      });
      seed += 1;
    }
  }

  root.traverse((object) => {
    object.layers.set(EXTERIOR_LAYER);
    if (object.isMesh) object.receiveShadow = false;
  });

  let active = false;
  let disposed = false;

  function poseDancer(dancer, elapsed, beatPhase) {
    const { parts, style } = dancer;
    const beat = ((beatPhase + dancer.phase) % 1 + 1) % 1;
    // A single smooth 0->1->0 hump per beat drives the bounce and the pumps.
    const hop = Math.sin(Math.PI * beat);
    const offBeat = Math.sin(Math.PI * ((beat + 0.5) % 1));
    const sway = Math.sin(elapsed * dancer.swaySpeed + dancer.phase * TAU);

    dancer.group.position.y = dancer.bobAmp * hop;
    dancer.group.rotation.y = dancer.baseRotY + 0.12 * sway;

    if (parts.torso) parts.torso.rotation.z = dancer.swayAmp * sway;
    if (parts.head) parts.head.rotation.x = 0.16 * hop;

    const rest = dancer.armRestX;
    if (style === 0) {
      // Alternating fist pumps.
      parts.armL.rotation.x = rest - dancer.armAmp * hop;
      parts.armR.rotation.x = rest - dancer.armAmp * offBeat;
    } else if (style === 1) {
      // Both hands thrown up on the beat, swaying together.
      const raise = rest - dancer.armAmp * (0.5 + 0.5 * hop);
      parts.armL.rotation.x = raise;
      parts.armR.rotation.x = raise;
      parts.armL.rotation.z = -0.5 * sway;
      parts.armR.rotation.z = -0.5 * sway;
    } else {
      // Clap: arms swing in toward center in time.
      parts.armL.rotation.x = rest - 0.6 * dancer.armAmp * hop;
      parts.armR.rotation.x = rest - 0.6 * dancer.armAmp * hop;
      parts.armL.rotation.z = 0.6 * hop;
      parts.armR.rotation.z = -0.6 * hop;
    }
  }

  function start() {
    if (disposed) return api;
    active = true;
    root.visible = true;
    return api;
  }

  function update({ elapsed = 0, beatPhase = 0 } = {}) {
    if (!active || disposed) return api;
    const now = Math.max(0, finite(elapsed));
    const phase = finite(beatPhase);
    for (const dancer of dancers) poseDancer(dancer, now, phase);
    return api;
  }

  function stop() {
    if (!active) return api;
    active = false;
    root.visible = false;
    return api;
  }

  function dispose() {
    if (disposed) return;
    stop();
    scene.remove(root);
    root.traverse((object) => {
      if (object.isMesh) {
        object.geometry?.dispose?.();
        const material = object.material;
        if (Array.isArray(material)) material.forEach((m) => m?.dispose?.());
        else material?.dispose?.();
      }
    });
    disposed = true;
  }

  const api = { start, update, stop, dispose, get count() { return dancers.length; } };
  return api;
}
