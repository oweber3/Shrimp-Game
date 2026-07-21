import * as THREE from 'three';
import { makePerformer, bodyMaterial, emissiveMaterial, beatPulse } from './performerRig.js';

// ============================================================================
// Drake the Drake — Movement 1 & 3 headliner: a colossal upright mallard.
//
// Iridescent green head (an emissive sheen sells the mallard gloss), charcoal
// body, warm-brown breast, a curled tail feather, and an oversized OVO-gold
// chain. One wing is raised to the crowd. Authored ~1 unit tall; the shared
// Performer scales it to `HEIGHT` (roster target: 52u).
//
// Performance loop: side-to-side sway, raised-wing crowd point, slow head bob.
// The Movement 3 return re-lights him red; pass { redRim: true } for that look
// (a faint red edge glow here; the real rim spotlight arrives in Phase 4).
// ============================================================================

const HEIGHT = 52;

const HEAD_GREEN = 0x0f6b3a; // mallard iridescent green
const BODY_CHARCOAL = 0x2b2f36;
const BREAST_BROWN = 0x7a4a2a;
const BILL_YELLOW = 0xd8b12a;
const FOOT_ORANGE = 0xd8791f;
const OVO_GOLD = 0xf2c94c;

export function createDrakeDrake({ redRim = false } = {}) {
  const group = new THREE.Group();

  const headMat = emissiveMaterial(HEAD_GREEN, 0.55, { roughness: 0.3 });
  headMat.color.setHex(HEAD_GREEN); // keep the base green readable in daylight too
  const bodyMat = bodyMaterial(BODY_CHARCOAL, { roughness: 0.6 });
  const breastMat = bodyMaterial(BREAST_BROWN, { roughness: 0.6 });
  const billMat = bodyMaterial(BILL_YELLOW, { roughness: 0.4 });
  const footMat = bodyMaterial(FOOT_ORANGE, { roughness: 0.5 });
  const goldMat = bodyMaterial(OVO_GOLD, { roughness: 0.25, metalness: 0.9 });
  const eyeMat = bodyMaterial(0x0a0a0a, 0.2);
  const rimMat = emissiveMaterial(redRim ? 0xff2a2a : 0x2a6bff, redRim ? 1.4 : 0.0);

  const add = (parent, mesh) => { parent.add(mesh); return mesh; };

  const core = new THREE.Group();
  group.add(core);

  // ---- Feet: stubby orange legs + webbed paddle feet ---------------------
  for (const side of [-1, 1]) {
    const leg = add(core, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.18, 10), footMat));
    leg.position.set(side * 0.12, 0.11, 0);
    const web = add(core, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.13, 0.05, 3), footMat));
    web.position.set(side * 0.12, 0.02, 0.08);
    web.rotation.x = Math.PI; // flat triangular paddle pointing forward
  }

  // ---- Body: an upright charcoal egg, warm-brown breast on the front -----
  const body = new THREE.Group();
  body.position.y = 0.42;
  core.add(body);
  const belly = add(body, new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 16), bodyMat));
  belly.scale.set(1.0, 1.35, 0.95);
  const breast = add(body, new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), breastMat));
  breast.scale.set(1.0, 1.15, 0.7);
  breast.position.set(0, 0.02, 0.16);
  // Faint rim-light edge feathers along the back (red in Movement 3).
  const rim = add(body, new THREE.Mesh(new THREE.SphereGeometry(0.29, 16, 12), rimMat));
  rim.scale.set(0.9, 1.3, 0.5);
  rim.position.set(0, 0.02, -0.12);

  // ---- Curled tail feather off the lower back ----------------------------
  const tail = new THREE.Group();
  tail.position.set(0, -0.16, -0.24);
  body.add(tail);
  const tailBase = add(tail, new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.34, 8), bodyMat));
  tailBase.rotation.x = -1.9;
  tailBase.position.set(0, 0.02, -0.1);
  const curl = add(tail, new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 10, Math.PI * 1.4), bodyMat));
  curl.position.set(0, 0.16, -0.22);
  curl.rotation.x = 0.4;

  // ---- OVO-gold chain around the neck base -------------------------------
  const chain = new THREE.Group();
  chain.position.set(0, 0.28, 0.1);
  body.add(chain);
  const links = 10;
  for (let i = 0; i < links; i++) {
    const a = (i / (links - 1) - 0.5) * Math.PI * 1.1;
    const link = add(chain, new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), goldMat));
    link.position.set(Math.sin(a) * 0.2, -Math.abs(Math.cos(a)) * 0.05, 0.12 - Math.abs(Math.sin(a)) * 0.05);
  }
  // Owl-ish OVO pendant (a rounded diamond).
  const pendant = add(chain, new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), goldMat));
  pendant.position.set(0, -0.13, 0.12);
  pendant.scale.set(1, 1.3, 0.5);

  // ---- Neck + iridescent green head --------------------------------------
  const neck = new THREE.Group();
  neck.position.set(0, 0.32, 0.04);
  body.add(neck);
  const neckMesh = add(neck, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.22, 12), headMat));
  neckMesh.position.y = 0.11;
  // The white mallard neck-ring.
  const ring = add(neck, new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 16), bodyMaterial(0xf0f0f0, 0.5)));
  ring.position.y = 0.2;
  ring.rotation.x = Math.PI / 2;

  const head = new THREE.Group();
  head.position.y = 0.24;
  neck.add(head);
  const skull = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 14), headMat));
  skull.scale.set(1.0, 1.1, 1.05);
  for (const side of [-1, 1]) {
    const eye = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), eyeMat));
    eye.position.set(side * 0.11, 0.04, 0.08);
  }
  // Flat mallard bill.
  const bill = add(head, new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.22), billMat));
  bill.position.set(0, -0.03, 0.2);
  const billTip = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 6), billMat));
  billTip.scale.set(1, 0.4, 0.6);
  billTip.position.set(0, -0.03, 0.31);

  // ---- Wings: right wing raised to the crowd, left folded ----------------
  const wings = {};
  for (const side of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(side * 0.24, 0.5, 0);
    body.add(wing);
    const feather = add(wing, new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.06), bodyMat));
    feather.position.set(side * 0.05, -0.22, -0.02);
    // Blue speculum flash near the wing root.
    const spec = add(wing, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), bodyMaterial(0x2a4bd8, 0.4, 0.3)));
    spec.position.set(side * 0.05, -0.02, 0);
    wing.userData.tip = feather;
    wings[side] = wing;
  }
  // Rest pose: left folded down, right lifted up and out (crowd point).
  wings[-1].rotation.z = 0.35;
  wings[1].rotation.z = -1.9;

  const parts = { core, body, neck, head, wingRaised: wings[1], wingFolded: wings[-1], rim, redRim };

  return makePerformer({
    id: 'drake',
    group,
    parts,
    pose: poseDrake,
    height: HEIGHT,
    flashColor: redRim ? 0xff5a3a : OVO_GOLD,
    ringColor: redRim ? 0xff3a2a : OVO_GOLD,
    hoverFreq: 0.3,
  });
}

function poseDrake(parts, dt, t, beatPhase) {
  const pulse = beatPulse(beatPhase);
  const { core, body, neck, head, wingRaised, wingFolded, rim, redRim } = parts;

  // Slow, wide side-to-side sway of the whole bird.
  core.rotation.z = Math.sin(t * 1.1) * 0.1;
  body.position.x = Math.sin(t * 1.1) * 0.03;

  // Slow head bob, with a small extra dip on the beat.
  head.rotation.x = Math.sin(t * 1.6) * 0.12 + pulse * 0.15;
  neck.rotation.z = Math.sin(t * 1.1 + 0.4) * 0.06;

  // Raised wing points and flaps to the crowd on the beat.
  wingRaised.rotation.z = -1.9 - pulse * 0.35;
  wingRaised.rotation.x = Math.sin(t * 2.2) * 0.12;
  wingFolded.rotation.z = 0.35 + pulse * 0.12;

  // Movement 3: the red rim edge breathes with the track.
  if (redRim) rim.material.emissiveIntensity = 1.0 + pulse * 1.4;
}
