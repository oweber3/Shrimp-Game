import * as THREE from 'three';
import { createSkinTexture } from '../utils/geometry.js';

// Gerald: a fish person in a business suit. He does not belong here and he
// knows it. Built from the same BoxGeometry/CylinderGeometry/SphereGeometry
// primitives as shrimpWorker.js; exports the same root.userData.parts shape
// so the standard npcBehaviors state machine drives him without modification.

export const GERALD = {
  id: 'gerald',
  name: 'Gerald',
  pos: [-30, 55],   // [x, z] → placed near the drainage canal / perimeter fence
  rotY: 2.4,        // facing slightly away from the main campus, toward the canal
  mapColor: '#4A90D9' // distinct blue dot on the minimap
};

function mat(color, roughness = 0.55, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function createFishPerson() {
  const root = new THREE.Group();

  const suit   = mat(0x2C2C3A, 0.65);
  const lapel  = mat(0x3D3D50, 0.65);
  // Fish skin gets a soft procedural texture (the map carries the hue, so the
  // base color stays white and lets it through).
  const scales = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.4, metalness: 0.08, map: createSkinTexture(0x7EB8C9)
  });
  const scaleD = mat(0x5A96A8, 0.45, 0.08);  // slightly darker accent
  const eyeM   = mat(0x101418, 0.2);
  const white  = mat(0xEEEEEE, 0.5);
  const tie    = mat(0x1A1A2A, 0.6);

  const add = (parent, mesh) => { mesh.castShadow = true; parent.add(mesh); return mesh; };

  // ---- Legs: dress-pant cylinders + dress shoes ----
  // Two-bone chains (hip -> knee -> shin/shoe) so the Phase 13 gait engine can
  // plant the feet. The hip Group stays exposed as legL/legR.
  const legs = {};
  const knees = {};
  const L1 = 0.34;
  const L2 = 0.36;
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.15, 0.7, 0);

    const thigh = add(leg, new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.095, 0.33, 14), suit));
    thigh.position.y = -0.06;

    const knee = new THREE.Group();
    knee.position.set(0, -L1, 0);
    leg.add(knee);

    const shin = add(knee, new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.082, 0.33, 14), suit));
    shin.position.y = -0.03;

    // Dress shoe: low flat box with a rounded toe cap
    const shoe = add(knee, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.11, 0.38), suit));
    shoe.position.set(side * 0.01, -0.275, 0.05);

    const toe = add(knee, new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), suit));
    toe.scale.set(1.0, 0.55, 1.1);
    toe.position.set(side * 0.01, -0.295, 0.22);

    root.add(leg);
    legs[side] = leg;
    knees[side] = knee;
  }

  // ---- Torso: suit jacket body ----
  // Two stacked tapered cylinders give a real suit silhouette — broader chest,
  // cinched waist, flared hips/peplum — instead of one uniform barrel.
  const torso = new THREE.Group();
  root.add(torso);

  const chest = add(torso, new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.27, 0.4, 16), suit));
  chest.position.set(0, 1.3, 0.01);
  chest.rotation.x = 0.08;

  const waist = add(torso, new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.36, 0.32, 16), suit));
  waist.position.set(0, 1.0, 0.02);
  waist.rotation.x = 0.05;

  // Jacket lapels: two angled flat boxes on the chest
  for (const side of [-1, 1]) {
    const lp = add(torso, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 0.05), lapel));
    lp.position.set(side * 0.085, 1.24, 0.29);
    lp.rotation.z = side * 0.25;
    lp.rotation.x = 0.12;
  }

  // White shirt collar: a small V of two angled panels framing the tie knot
  for (const side of [-1, 1]) {
    const col = add(torso, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.04), white));
    col.position.set(side * 0.04, 1.4, 0.305);
    col.rotation.z = side * -0.5;
  }

  // Dark tie: knot plus a tapering blade
  const knot = add(torso, new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.03), tie));
  knot.position.set(0, 1.36, 0.32);
  const tieM = add(torso, new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.025), tie));
  tieM.position.set(0, 1.18, 0.33);

  // ---- Fish tail fin: a fan of four triangular lobes from the back of the torso ----
  // ConeGeometry with 3 radial segments gives a flat triangular cross-section.
  // Four lobes at increasing fan angles, each flattened in Z, leave concave
  // negative space between them for a proper caudal-fin silhouette.
  const tail = new THREE.Group();
  tail.position.set(0, 1.1, -0.3);
  torso.add(tail);

  const finMat = new THREE.MeshStandardMaterial({ color: 0x7EB8C9, roughness: 0.4, metalness: 0.08, side: THREE.DoubleSide });

  // tilt: fan angle off straight-back, len: lobe length (outer lobes longest).
  const lobes = [
    { tilt: 0.62, len: 0.3 },
    { tilt: 0.2, len: 0.24 },
    { tilt: -0.2, len: 0.24 },
    { tilt: -0.62, len: 0.3 }
  ];
  for (const { tilt, len } of lobes) {
    const lobe = add(tail, new THREE.Mesh(new THREE.ConeGeometry(0.13, len, 3), finMat));
    lobe.scale.set(1, 1, 0.35); // flatten into a thin fin blade
    lobe.position.set(0, Math.sin(tilt) * 0.16, -0.1 - Math.cos(tilt) * 0.02);
    lobe.rotation.x = -(Math.PI / 2) + tilt; // mostly -Z, fanned up/down
  }

  // ---- Arms: suit sleeves ending in scaly fish hands ----
  const arms = {};
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.35, 1.42, 0.01);

    const upper = add(arm, new THREE.Mesh(new THREE.CylinderGeometry(0.063, 0.068, 0.3, 14), suit));
    upper.position.set(side * 0.1, -0.13, 0.02);
    upper.rotation.z = side * 0.52;
    upper.rotation.x = -0.1;

    const fore = add(arm, new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.063, 0.28, 14), suit));
    fore.position.set(side * 0.2, -0.38, 0.11);
    fore.rotation.z = side * 0.24;
    fore.rotation.x = -0.44;

    // Shirt cuff: a thin white ring peeking out of the jacket sleeve end
    const cuff = add(arm, new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.058, 0.05, 14), white));
    cuff.position.set(side * 0.245, -0.49, 0.19);
    cuff.rotation.z = side * 0.24;
    cuff.rotation.x = -0.44;

    // Fish hand: a slightly flattened sphere in fish-skin color
    const hand = add(arm, new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 8), scales));
    hand.scale.set(1.0, 0.7, 1.0);
    hand.position.set(side * 0.265, -0.52, 0.22);

    torso.add(arm);
    arms[side] = arm;
  }

  // ---- Head: flat, wide fish head with side-facing eyes ----
  // Pivot group at head center so head.rotation.y tracks the player correctly.
  const head = new THREE.Group();
  head.position.set(0, 1.82, 0.05);
  torso.add(head);

  // Skull: scaled wide and flat — fish head is wider than it is tall
  const skull = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), scales));
  skull.scale.set(1.18, 0.65, 1.02);

  // Side-facing eye bumps (fish eyes sit on the sides, not the front)
  const faceEyes = [];
  for (const side of [-1, 1]) {
    const eyeBump = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), scales));
    eyeBump.scale.set(0.55, 1.0, 0.55);
    eyeBump.position.set(side * 0.265, 0.04, 0.0);

    const pupil = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), eyeM));
    pupil.position.set(side * 0.305, 0.04, 0.0);
    // No eyelid rig on the fish, so the face system slides the pupil to gaze;
    // remember its rest offset.
    faceEyes.push({ pupil, pupilBase: pupil.position.clone(), side });
  }

  // Subtle down-turned mouth (he is not happy) — the face system flaps it
  // during dialogue.
  const mouth = new THREE.Group();
  mouth.position.set(0, -0.1, 0.22);
  head.add(mouth);
  const mouthL = add(mouth, new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.022, 0.035), scaleD));
  mouthL.rotation.z = 0.08; // very slight frown

  // Gill slits: thin dark marks on each side
  for (const side of [-1, 1]) {
    const gill = add(head, new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.1, 0.055), scaleD));
    gill.position.set(side * 0.205, -0.01, -0.06);
    gill.rotation.y = side * 0.28;
  }

  // ---- Carry anchor: where carried items attach ----
  const carryAnchor = new THREE.Group();
  carryAnchor.position.set(0, 1.2, 0.7);
  root.add(carryAnchor);

  root.userData.parts = {
    torso,
    head,
    tail,
    armL: arms[-1],
    armR: arms[1],
    legL: legs[-1],
    legR: legs[1],
    carryAnchor
  };

  // Phase 13 rig hooks (Gerald mostly idles, so no antennae; face flaps his
  // frown and slides the pupils when he tracks the player).
  root.userData.rig = {
    L1,
    L2,
    hip: { [-1]: legs[-1], [1]: legs[1] },
    knee: { [-1]: knees[-1], [1]: knees[1] },
    arm: { [-1]: arms[-1], [1]: arms[1] },
    torso,
    head,
    tail,
    baseTailX: tail.rotation.x,
    antennae: [],
    face: { eyes: faceEyes, mouth, mouthRestX: mouth.rotation.x }
  };

  return root;
}
