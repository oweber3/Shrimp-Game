import * as THREE from 'three';

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
  const scales = mat(0x7EB8C9, 0.4, 0.08);   // pale silver/gray-blue fish skin
  const scaleD = mat(0x5A96A8, 0.45, 0.08);  // slightly darker accent
  const eyeM   = mat(0x101418, 0.2);
  const white  = mat(0xEEEEEE, 0.5);
  const tie    = mat(0x1A1A2A, 0.6);

  const add = (parent, mesh) => { mesh.castShadow = true; parent.add(mesh); return mesh; };

  // ---- Legs: dress-pant cylinders + dress shoes ----
  const legs = {};
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.15, 0.7, 0);

    const thigh = add(leg, new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.095, 0.33, 7), suit));
    thigh.position.y = -0.06;

    const shin = add(leg, new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.082, 0.33, 7), suit));
    shin.position.y = -0.37;

    // Dress shoe: low flat box with a rounded toe cap
    const shoe = add(leg, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.11, 0.38), suit));
    shoe.position.set(side * 0.01, -0.615, 0.05);

    const toe = add(leg, new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 5), suit));
    toe.scale.set(1.0, 0.55, 1.1);
    toe.position.set(side * 0.01, -0.635, 0.22);

    root.add(leg);
    legs[side] = leg;
  }

  // ---- Torso: suit jacket body ----
  const torso = new THREE.Group();
  root.add(torso);

  const jacket = add(torso, new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.37, 0.64, 10), suit));
  jacket.position.set(0, 1.17, 0.01);
  jacket.rotation.x = 0.08;

  // Jacket lapels: two angled flat boxes on the chest
  for (const side of [-1, 1]) {
    const lp = add(torso, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.05), lapel));
    lp.position.set(side * 0.085, 1.22, 0.31);
    lp.rotation.z = side * 0.25;
    lp.rotation.x = 0.12;
  }

  // White shirt collar peeking above the jacket
  const collar = add(torso, new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.05), white));
  collar.position.set(0, 1.4, 0.31);

  // Dark tie
  const tieM = add(torso, new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.025), tie));
  tieM.position.set(0, 1.18, 0.33);

  // ---- Fish tail fin: two triangular lobes protruding from the back of the torso ----
  // ConeGeometry with 3 radial segments gives a triangular cross-section.
  const tail = new THREE.Group();
  tail.position.set(0, 1.1, -0.28);
  torso.add(tail);

  const finMat = new THREE.MeshStandardMaterial({ color: 0x7EB8C9, roughness: 0.4, metalness: 0.08, side: THREE.DoubleSide });

  // Upper lobe: tip points backward and slightly upward
  const lobeU = add(tail, new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.28, 3), finMat));
  lobeU.position.set(0, 0.1, -0.1);
  lobeU.rotation.x = -(Math.PI / 2) + 0.38; // mostly -Z, fanned up

  // Lower lobe: tip points backward and slightly downward
  const lobeL = add(tail, new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.28, 3), finMat));
  lobeL.position.set(0, -0.08, -0.1);
  lobeL.rotation.x = -(Math.PI / 2) - 0.38; // mostly -Z, fanned down

  // ---- Arms: suit sleeves ending in scaly fish hands ----
  const arms = {};
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.35, 1.42, 0.01);

    const upper = add(arm, new THREE.Mesh(new THREE.CylinderGeometry(0.063, 0.068, 0.3, 7), suit));
    upper.position.set(side * 0.1, -0.13, 0.02);
    upper.rotation.z = side * 0.52;
    upper.rotation.x = -0.1;

    const fore = add(arm, new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.063, 0.28, 7), suit));
    fore.position.set(side * 0.2, -0.38, 0.11);
    fore.rotation.z = side * 0.24;
    fore.rotation.x = -0.44;

    // Fish hand: a slightly flattened sphere in fish-skin color
    const hand = add(arm, new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 6), scales));
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
  const skull = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 9), scales));
  skull.scale.set(1.18, 0.65, 1.02);

  // Side-facing eye bumps (fish eyes sit on the sides, not the front)
  for (const side of [-1, 1]) {
    const eyeBump = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), scales));
    eyeBump.scale.set(0.55, 1.0, 0.55);
    eyeBump.position.set(side * 0.265, 0.04, 0.0);

    const pupil = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 6), eyeM));
    pupil.position.set(side * 0.305, 0.04, 0.0);
  }

  // Subtle down-turned mouth (he is not happy)
  const mouthL = add(head, new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.022, 0.035), scaleD));
  mouthL.position.set(0, -0.1, 0.22);
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

  return root;
}
