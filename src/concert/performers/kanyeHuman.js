import * as THREE from 'three';
import { makePerformer, bodyMaterial, beatPulse } from './performerRig.js';

// ============================================================================
// Ye — Earth Stage headliner.
//
// This act deliberately breaks the aquatic-parody roster: a normally
// proportioned human silhouette in an oversized, monochrome black stage outfit.
// A full face covering and smoked visor avoid attempting a facial likeness.
// The figure is authored from y=0 (boot soles) to y=1 and the shared rig scales
// it to 50 world units. Unlike the sky acts, its lifecycle hover is effectively
// zero so the boots remain planted on the mound.
//
// `parts.section` is the section hook used by the integrated show. The harness
// does not set it, so the pose resolver rotates through verse, chorus, peak and
// stillness blocks in 16-beat phrases at the track's 142 BPM.
// ============================================================================

const HEIGHT = 50;
const BPM = 142;
const BEATS_PER_SECOND = BPM / 60;
const TWO_PI = Math.PI * 2;

// These are intentionally lifted blacks rather than literal zero. The show
// pulls the sky almost to black, so low charcoal values preserve the all-black
// read while still allowing the warm key lights to describe the outfit.
const JACKET_BLACK = 0x454950;
const PANEL_BLACK = 0x60656e;
const PANTS_BLACK = 0x30343a;
const BOOT_BLACK = 0x1a1d22;
const MASK_BLACK = 0x393d43;
const VISOR_SMOKE = 0x9aa2ad;

const REST_ARM_ANGLE = 0.08;
const RAISED_ARM_ANGLE = 2.72;

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (value) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};
const lerp = (a, b, amount) => a + (b - a) * amount;

export function createKanyeHuman() {
  const group = new THREE.Group();
  group.name = 'ye-human';

  // Closely related blacks with different roughness keep the monochrome outfit
  // legible under the earth-stage top light without introducing a color accent.
  const jacketMat = bodyMaterial(JACKET_BLACK, { roughness: 0.88, metalness: 0.02 });
  const panelMat = bodyMaterial(PANEL_BLACK, { roughness: 0.68, metalness: 0.04 });
  const pantsMat = bodyMaterial(PANTS_BLACK, { roughness: 0.82, metalness: 0.01 });
  const bootMat = bodyMaterial(BOOT_BLACK, { roughness: 0.48, metalness: 0.08 });
  const maskMat = bodyMaterial(MASK_BLACK, { roughness: 0.62, metalness: 0.03 });
  const visorMat = bodyMaterial(VISOR_SMOKE, { roughness: 0.16, metalness: 0.35 });
  visorMat.emissive.setHex(0x161c24);
  visorMat.emissiveIntensity = 0.32;

  const add = (parent, mesh) => {
    parent.add(mesh);
    return mesh;
  };

  const figure = new THREE.Group();
  figure.name = 'ye-figure';
  group.add(figure);

  // ---- Heavy boots and loose straight-leg pants -------------------------
  // Soles sit exactly at authored y=0. The long +Z toe makes the facing clear
  // in silhouette and gives the otherwise dark costume a firm visual footing.
  for (const side of [-1, 1]) {
    const boot = add(figure, new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.085, 0.17), bootMat));
    boot.position.set(side * 0.066, 0.0425, 0.025);

    const sole = add(figure, new THREE.Mesh(new THREE.BoxGeometry(0.112, 0.018, 0.185), bootMat));
    sole.position.set(side * 0.066, 0.009, 0.03);

    const leg = add(figure, new THREE.Mesh(new THREE.BoxGeometry(0.112, 0.39, 0.125), pantsMat));
    leg.position.set(side * 0.066, 0.285, -0.005);

    // A nearly-black knee panel catches a narrow highlight as the torso sways.
    const knee = add(figure, new THREE.Mesh(new THREE.BoxGeometry(0.096, 0.095, 0.009), panelMat));
    knee.position.set(side * 0.066, 0.285, 0.061);
  }

  const hips = add(figure, new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.115, 0.155), pantsMat));
  hips.position.set(0, 0.475, -0.005);

  // `upperBody` pivots at the waist. Verse motion can therefore stay subtle
  // while the planted legs and boot soles never slide off the stage.
  const upperBody = new THREE.Group();
  upperBody.name = 'ye-upper-body';
  upperBody.position.y = 0.49;
  figure.add(upperBody);

  // ---- Oversized jacket --------------------------------------------------
  const jacket = add(upperBody, new THREE.Mesh(new THREE.BoxGeometry(0.355, 0.305, 0.19), jacketMat));
  jacket.position.set(0, 0.15, 0);

  const shoulders = add(upperBody, new THREE.Mesh(new THREE.BoxGeometry(0.425, 0.075, 0.205), jacketMat));
  shoulders.position.set(0, 0.268, -0.002);

  // Split front panels, a recessed zip, and a broad low hem sell layered cloth
  // using only boxes. All remain within the black/graphite palette.
  for (const side of [-1, 1]) {
    const front = add(upperBody, new THREE.Mesh(new THREE.BoxGeometry(0.132, 0.235, 0.018), panelMat));
    front.position.set(side * 0.077, 0.15, 0.101);
    front.rotation.y = side * -0.045;
  }
  const zipper = add(upperBody, new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.245, 0.012), bootMat));
  zipper.position.set(0, 0.15, 0.113);
  const hem = add(upperBody, new THREE.Mesh(new THREE.BoxGeometry(0.365, 0.055, 0.2), jacketMat));
  hem.position.set(0, 0.018, 0);

  // ---- Articulated oversized sleeves and covered hands ------------------
  const arms = {};
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.name = side < 0 ? 'ye-arm-left' : 'ye-arm-right';
    shoulder.position.set(side * 0.205, 0.272, 0);
    upperBody.add(shoulder);

    const upperSleeve = add(shoulder, new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.063, 0.19, 7),
      jacketMat,
    ));
    upperSleeve.position.y = -0.095;

    const forearm = new THREE.Group();
    forearm.position.y = -0.185;
    shoulder.add(forearm);

    const lowerSleeve = add(forearm, new THREE.Mesh(
      new THREE.CylinderGeometry(0.044, 0.054, 0.16, 7),
      jacketMat,
    ));
    lowerSleeve.position.y = -0.08;

    const glove = add(forearm, new THREE.Mesh(new THREE.SphereGeometry(0.047, 8, 6), maskMat));
    glove.scale.set(0.82, 1.08, 0.72);
    glove.position.y = -0.184;

    arms[side] = { shoulder, forearm, glove };
  }

  // ---- Covered head and smoked visor ------------------------------------
  const neck = add(upperBody, new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.052, 0.075, 8), maskMat));
  neck.position.y = 0.34;

  const collar = add(upperBody, new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.018, 6, 10), jacketMat));
  collar.position.y = 0.315;
  collar.rotation.x = Math.PI / 2;

  const head = new THREE.Group();
  head.name = 'ye-masked-head';
  head.position.y = 0.35;
  upperBody.add(head);

  const coveredHead = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.078, 12, 8), maskMat));
  coveredHead.scale.set(0.93, 1.18, 0.96);
  coveredHead.position.y = 0.065;

  const visor = add(head, new THREE.Mesh(new THREE.BoxGeometry(0.108, 0.025, 0.018), visorMat));
  visor.position.set(0, 0.083, 0.074);
  visor.rotation.x = -0.06;

  const parts = {
    figure,
    upperBody,
    head,
    armL: arms[-1],
    armR: arms[1],
    visor,
    section: null,
    activePose: 'idle',
    poseBlend: { verse: 0, chorus: 0, peak: 0 },
  };

  return makePerformer({
    id: 'ye',
    group,
    parts,
    pose: poseYe,
    height: HEIGHT,
    anchorY: 0,
    // Earth Stage is a grounded act: keep the shared lifecycle but disable the
    // sky-roster hover entirely so the boot soles stay locked to the plateau.
    hoverAmp: 0,
    hoverFreq: BEATS_PER_SECOND / 16,
    flashColor: 0xffd28a,
    ringColor: 0xffb45e,
  });
}

function normalizeSection(value) {
  const raw = typeof value === 'object'
    ? value?.section ?? value?.id ?? value?.name
    : value;
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

function resolvePoseMode(sectionValue, t) {
  const section = normalizeSection(sectionValue);

  // The standalone harness has no show section. Advance in long musical
  // phrases so every authored pose can be inspected without debug controls.
  if (!section) {
    const phrase = Math.floor(Math.max(0, t) * BEATS_PER_SECOND / 16) % 4;
    return ['verse', 'chorus', 'peak', 'idle'][phrase];
  }

  if (
    section.startsWith('horn-break') ||
    section === 'bridge-climax' ||
    section === 'chorus-final' ||
    section.includes('finale')
  ) {
    return 'peak';
  }
  if (section.startsWith('chorus')) return 'chorus';
  if (section.startsWith('verse')) return 'verse';
  return 'idle';
}

function dampBlend(current, target, dt, speed = 5) {
  const amount = 1 - Math.exp(-Math.max(0, dt) * speed);
  return lerp(current, target, amount);
}

function poseArm(arm, side, lift, pulse, accent) {
  const raised = clamp01(lift);
  const angle = lerp(REST_ARM_ANGLE, RAISED_ARM_ANGLE, raised);

  // The beat adds only a small extension once an arm is already raised. The
  // performer holds shapes instead of constantly pumping his arms.
  arm.shoulder.rotation.z = side * (angle + pulse * accent * raised);
  arm.shoulder.rotation.x = -0.035 - raised * 0.08;
  arm.forearm.rotation.z = side * raised * 0.17;
  arm.forearm.rotation.x = -0.06 - raised * 0.11;
}

function poseYe(parts, dt, t, beatPhase) {
  const mode = resolvePoseMode(parts.section, t);
  const blend = parts.poseBlend;
  const pulse = beatPulse(beatPhase);

  blend.verse = dampBlend(blend.verse, mode === 'verse' ? 1 : 0, dt, 3.4);
  blend.chorus = dampBlend(blend.chorus, mode === 'chorus' ? 1 : 0, dt, 4.6);
  blend.peak = dampBlend(blend.peak, mode === 'peak' ? 1 : 0, dt, 5.4);
  parts.activePose = mode;

  // One slow sway per 16 beats. It is strongest in verses, present only as a
  // trace in choruses, and settles almost completely during peak holds.
  const phrasePhase = t * TWO_PI * BEATS_PER_SECOND / 16;
  const sway = Math.sin(phrasePhase);
  const swayWeight = blend.verse + blend.chorus * 0.22;
  parts.upperBody.rotation.z = sway * 0.052 * swayWeight;
  parts.upperBody.rotation.y = Math.sin(phrasePhase * 0.5 + 0.4) * 0.035 * blend.verse;
  parts.upperBody.position.x = sway * 0.011 * swayWeight;

  // A compact nod on each beat remains active in every section, including the
  // still intro/bridge/outro poses.
  parts.head.rotation.x = 0.025 + pulse * 0.105;
  parts.head.rotation.z = -parts.upperBody.rotation.z * 0.28;

  // Choruses alternate a full arm raise every four beats. Horn breaks, the
  // bridge climax and finale sections override this with a both-arms-up hold.
  const alternationRaw = 0.5 + 0.5 * Math.sin(t * TWO_PI * BEATS_PER_SECOND / 8);
  const alternation = smoothstep(alternationRaw);
  const chorusLeft = 0.34 + alternation * 0.66;
  const chorusRight = 0.34 + (1 - alternation) * 0.66;
  const leftLift = blend.peak + (1 - blend.peak) * blend.chorus * chorusLeft;
  const rightLift = blend.peak + (1 - blend.peak) * blend.chorus * chorusRight;

  poseArm(parts.armL, -1, leftLift, pulse, 0.055);
  poseArm(parts.armR, 1, rightLift, pulse, 0.055);
}
