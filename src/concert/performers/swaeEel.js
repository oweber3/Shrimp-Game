import * as THREE from 'three';
import { makePerformer, bodyMaterial, emissiveMaterial, beatPulse } from './performerRig.js';

// ============================================================================
// Swae Eel — Movement 2 bridge cameo: a long, upright moray eel.
//
// A tapering chain of segments (each parented to the previous) lets a single
// travelling sine wave read as a smooth S-curve / coil-and-uncoil. Deep
// blue-black base with cyan and magenta bioluminescent stripes that pulse — and
// travel — with `beatPhase`. Authored ~1 unit tall; scaled to `HEIGHT` by the
// shared Performer (roster target: 46u, slimmer silhouette than the headliners).
//
// Performance loop: floating S-curve sway, pectoral-fin flourish, and a slow
// coil-and-uncoil driven by a low-frequency amplitude envelope.
// ============================================================================

const HEIGHT = 46;
const SEGMENTS = 14;
const SEG_LEN = 0.062;

const BASE = 0x101a2e; // deep blue-black
const CYAN = 0x2ad8ff;
const MAGENTA = 0xff3ad8;

export function createSwaeEel() {
  const group = new THREE.Group();

  const skinMat = bodyMaterial(BASE, { roughness: 0.4, metalness: 0.2 });
  const finMat = new THREE.MeshStandardMaterial({
    color: BASE, emissive: CYAN, emissiveIntensity: 0.3,
    roughness: 0.5, metalness: 0.1, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
  });

  const add = (parent, mesh) => { parent.add(mesh); return mesh; };

  const core = new THREE.Group();
  group.add(core);

  // ---- Segmented body: a nested chain from base (y≈0) to head -----------
  const segments = [];
  const stripeMats = [];
  let parent = core;
  for (let i = 0; i < SEGMENTS; i++) {
    const seg = new THREE.Group();
    seg.position.y = i === 0 ? 0.06 : SEG_LEN; // first segment lifts off the ground
    parent.add(seg);

    const rTop = 0.09 * (1 - i / SEGMENTS) + 0.035;
    const rBot = 0.09 * (1 - (i - 1) / SEGMENTS) + 0.035;
    const body = add(seg, new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, SEG_LEN * 1.05, 10), skinMat));
    body.position.y = SEG_LEN * 0.5;

    // Bioluminescent stripe ring: alternating cyan/magenta down the body.
    const stripeColor = i % 2 === 0 ? CYAN : MAGENTA;
    const stripeMat = emissiveMaterial(stripeColor, 0.8);
    const stripe = add(seg, new THREE.Mesh(new THREE.TorusGeometry(rTop * 0.98, 0.012, 6, 12), stripeMat));
    stripe.position.y = SEG_LEN * 0.5;
    stripe.rotation.x = Math.PI / 2;
    stripeMat.userData = { color: stripeColor };
    stripeMats.push(stripeMat);

    // Dorsal fin nub along the back of each segment.
    const fin = add(seg, new THREE.Mesh(new THREE.ConeGeometry(0.02, SEG_LEN * 0.9, 3), finMat));
    fin.scale.set(1, 1, 0.4);
    fin.position.set(0, SEG_LEN * 0.5, -rTop);
    fin.rotation.x = -Math.PI / 2;

    segments.push(seg);
    parent = seg;
  }

  // ---- Head: broad moray skull with an open jaw + glowing eyes -----------
  const head = new THREE.Group();
  head.position.y = SEG_LEN;
  parent.add(head);
  const skull = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 12), skinMat));
  skull.scale.set(1.0, 1.1, 1.3);
  skull.position.y = 0.03;
  const upperJaw = add(head, new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.14), skinMat));
  upperJaw.position.set(0, 0.02, 0.09);
  const jaw = new THREE.Group();
  jaw.position.set(0, 0.0, 0.03);
  head.add(jaw);
  const lowerJaw = add(jaw, new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.12), skinMat));
  lowerJaw.position.set(0, -0.01, 0.06);
  for (const side of [-1, 1]) {
    const eye = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), emissiveMaterial(CYAN, 1.6)));
    eye.position.set(side * 0.055, 0.06, 0.05);
  }

  // ---- Pectoral fins near the head for the flourish ----------------------
  const fins = {};
  for (const side of [-1, 1]) {
    const fin = new THREE.Group();
    fin.position.set(side * 0.06, -0.02, 0);
    head.add(fin);
    const blade = add(fin, new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 3), finMat));
    blade.scale.set(1, 1, 0.3);
    blade.rotation.z = side * Math.PI / 2;
    blade.position.x = side * 0.08;
    fins[side] = fin;
  }

  const parts = { core, segments, stripeMats, head, jaw, finL: fins[-1], finR: fins[1] };

  return makePerformer({
    id: 'swae',
    group,
    parts,
    pose: poseSwae,
    height: HEIGHT,
    flashColor: MAGENTA,
    ringColor: CYAN,
    hoverFreq: 0.5,
    hoverAmp: HEIGHT * 0.03,
  });
}

function poseSwae(parts, dt, t, beatPhase) {
  const pulse = beatPulse(beatPhase);
  const { segments, stripeMats, jaw, finL, finR } = parts;

  // Coil-and-uncoil: a slow envelope breathes the S-curve amplitude between
  // tight (coiled) and loose (uncoiled).
  const amp = 0.12 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.35));
  const waveSpeed = 2.2;
  const perSeg = 0.55; // phase step per segment = one travelling S-wave

  for (let i = 0; i < segments.length; i++) {
    const phase = t * waveSpeed - i * perSeg;
    segments[i].rotation.z = Math.sin(phase) * amp;
    segments[i].rotation.x = Math.cos(phase * 0.7) * amp * 0.4; // subtle depth weave
  }

  // Bioluminescent stripes: pulse on the beat, brightness travelling up the
  // body so the glow appears to chase toward the head.
  for (let i = 0; i < stripeMats.length; i++) {
    const travel = beatPulse(beatPhase - i * 0.06);
    stripeMats[i].emissiveIntensity = 0.5 + travel * 2.4;
  }

  // Jaw + pectoral-fin flourish.
  jaw.rotation.x = -0.15 - pulse * 0.35;
  finL.rotation.y = Math.sin(t * 3) * 0.4;
  finR.rotation.y = -Math.sin(t * 3) * 0.4;
}
