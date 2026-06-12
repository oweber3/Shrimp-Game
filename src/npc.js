import * as THREE from 'three';

// Humanoid shrimp workers built entirely from primitives: a curved,
// segmented shell torso with a long fanned tail, eye stalks, long swept
// antennae, claw hands, plus PPE (hard hat, safety vest, boots) and either
// a tool belt or a clipboard.

function mat(color) {
  return new THREE.MeshLambertMaterial({ color });
}

export function createShrimpWorker(opts = {}) {
  const {
    shellColor = 0xe8744f,
    vestColor = 0xf2c12e,
    hatColor = 0xf5f0e6,
    bootColor = 0x4a3826,
    accessory = 'toolbelt' // 'toolbelt' | 'clipboard' | 'none'
  } = opts;

  const g = new THREE.Group();
  const shell = mat(shellColor);
  const shellDark = mat(new THREE.Color(shellColor).multiplyScalar(0.72).getHex());
  const black = mat(0x101418);
  const silver = mat(0xc9d4d9);

  const add = (mesh) => {
    mesh.castShadow = true;
    g.add(mesh);
    return mesh;
  };

  // ---- Legs and work boots ----
  for (const side of [-1, 1]) {
    const thigh = add(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.32, 7), mat(0x3a5a8c)));
    thigh.position.set(side * 0.15, 0.64, 0.01);
    thigh.rotation.x = 0.08;
    const shin = add(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.34, 7), mat(0x3a5a8c)));
    shin.position.set(side * 0.16, 0.36, 0);
    const boot = add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.17, 0.4), mat(bootColor)));
    boot.position.set(side * 0.16, 0.085, 0.06);
    const toe = add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.12), mat(bootColor)));
    toe.position.set(side * 0.16, 0.05, 0.27);
  }

  // ---- Curved, segmented shrimp torso ----
  // Stacked overlapping shell segments lean forward into the classic curl,
  // with darker bands peeking out between segments.
  const segs = [
    { y: 0.86, z: 0.03, r: 0.3, tilt: 0.1 },
    { y: 1.06, z: 0.07, r: 0.325, tilt: 0.24 },
    { y: 1.26, z: 0.08, r: 0.325, tilt: 0.38 },
    { y: 1.45, z: 0.04, r: 0.295, tilt: 0.54 },
    { y: 1.6, z: -0.03, r: 0.25, tilt: 0.68 }
  ];
  for (const s of segs) {
    const seg = add(new THREE.Mesh(new THREE.SphereGeometry(s.r, 12, 9), shell));
    seg.scale.set(1, 0.78, 1.06);
    seg.position.set(0, s.y, s.z);
    seg.rotation.x = s.tilt;
    const band = add(new THREE.Mesh(new THREE.TorusGeometry(s.r * 0.92, 0.022, 6, 14), shellDark));
    band.position.set(0, s.y - 0.09, s.z + 0.03);
    band.rotation.x = Math.PI / 2 + s.tilt;
  }

  // ---- Long curled tail with telson fan ----
  const tailSegs = [
    { y: 0.76, z: -0.27, r: 0.2, tilt: 1.7 },
    { y: 0.6, z: -0.45, r: 0.16, tilt: 2.1 },
    { y: 0.45, z: -0.58, r: 0.125, tilt: 2.5 },
    { y: 0.32, z: -0.67, r: 0.095, tilt: 2.9 }
  ];
  for (const t of tailSegs) {
    const seg = add(new THREE.Mesh(new THREE.SphereGeometry(t.r, 9, 7), shell));
    seg.scale.set(0.85, 0.7, 1.1);
    seg.position.set(0, t.y, t.z);
    seg.rotation.x = t.tilt;
  }
  for (const a of [-0.6, 0, 0.6]) {
    const blade = add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), shellDark));
    blade.scale.set(0.55, 0.08, 1.15);
    blade.position.set(Math.sin(a) * 0.12, 0.2, -0.74 - Math.cos(a) * 0.05);
    blade.rotation.y = a;
    blade.rotation.x = 0.3;
  }

  // ---- Safety vest with reflective stripes ----
  const vest = add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.41, 0.62, 10), mat(vestColor)));
  vest.position.set(0, 1.15, 0.05);
  vest.rotation.x = 0.2;
  const stripe = add(new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.4, 0.09, 10), silver));
  stripe.position.set(0, 1.12, 0.05);
  stripe.rotation.x = 0.2;
  for (const side of [-1, 1]) {
    const strip = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.015), silver));
    strip.position.set(side * 0.1, 1.18, 0.41);
    strip.rotation.x = 0.2;
  }

  // ---- Arms with claw hands ----
  for (const side of [-1, 1]) {
    const shoulder = add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat(vestColor)));
    shoulder.position.set(side * 0.34, 1.42, 0.06);
    const upper = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.32, 7), shell));
    upper.position.set(side * 0.45, 1.28, 0.1);
    upper.rotation.z = side * 0.55;
    upper.rotation.x = -0.15;
    const fore = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.3, 7), shell));
    fore.position.set(side * 0.55, 1.02, 0.22);
    fore.rotation.z = side * 0.25;
    fore.rotation.x = -0.5;
    // Pincer: one large and one small finger, slightly apart.
    const palmJoint = add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 7, 6), shellDark));
    palmJoint.position.set(side * 0.58, 0.9, 0.34);
    const bigPincer = add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), shellDark));
    bigPincer.position.set(side * 0.55, 0.87, 0.46);
    bigPincer.rotation.x = 1.45;
    bigPincer.rotation.z = side * -0.15;
    const smallPincer = add(new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 6), shellDark));
    smallPincer.position.set(side * 0.63, 0.92, 0.43);
    smallPincer.rotation.x = 1.3;
    smallPincer.rotation.z = side * 0.3;
  }

  // ---- Small swimmeret legs under the belly ----
  for (const side of [-1, 1]) {
    for (const [py, pz] of [[0.74, 0.24], [0.66, 0.16]]) {
      const pleo = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.18, 4), shellDark));
      pleo.position.set(side * 0.14, py, pz);
      pleo.rotation.x = 0.7;
      pleo.rotation.z = side * 0.35;
    }
  }

  // ---- Head with eye stalks, rostrum and antennae ----
  const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 9), shell));
  head.scale.set(0.85, 0.95, 1.2);
  head.position.set(0, 1.8, 0.12);
  const rostrum = add(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 6), shellDark));
  rostrum.position.set(0, 1.83, 0.44);
  rostrum.rotation.x = Math.PI / 2 + 0.15;
  for (const side of [-1, 1]) {
    // Eyes on short stalks, peeking out from under the hat brim.
    const stalk = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.14, 5), shellDark));
    stalk.position.set(side * 0.12, 1.88, 0.28);
    stalk.rotation.x = 0.8;
    stalk.rotation.z = side * 0.35;
    const eye = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), black));
    eye.position.set(side * 0.155, 1.92, 0.33);
    // Long antennae sweeping up, out and back in three segments.
    const a1 = add(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.3, 4), shellDark));
    a1.position.set(side * 0.24, 1.96, 0.2);
    a1.rotation.z = side * 0.9;
    a1.rotation.x = -0.3;
    const a2 = add(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.38, 4), shellDark));
    a2.position.set(side * 0.36, 2.06, 0);
    a2.rotation.z = side * 0.5;
    a2.rotation.x = -0.9;
    const a3 = add(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.4, 4), shellDark));
    a3.position.set(side * 0.42, 2.08, -0.3);
    a3.rotation.z = side * 0.3;
    a3.rotation.x = -1.4;
    // Short antennules pointing forward.
    const ule = add(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.2, 4), shellDark));
    ule.position.set(side * 0.06, 1.86, 0.44);
    ule.rotation.x = 1.0;
    ule.rotation.z = side * 0.2;
  }

  // ---- Hard hat ----
  const hat = add(new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(hatColor)
  ));
  hat.position.set(0, 1.95, 0.1);
  const brim = add(new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.345, 0.05, 12), mat(hatColor)));
  brim.position.set(0, 1.96, 0.1);
  const ridge = add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.42), mat(hatColor)));
  ridge.position.set(0, 2.18, 0.1);

  // ---- Accessory: tool belt or clipboard ----
  if (accessory === 'toolbelt') {
    const belt = add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.09, 10), mat(0x5a4632)));
    belt.position.set(0, 0.84, 0.02);
    const buckle = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.02), silver));
    buckle.position.set(0, 0.84, 0.32);
    for (const side of [-1, 1]) {
      const pouch = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.07), mat(0x7a5c3a)));
      pouch.position.set(side * 0.24, 0.74, 0.14);
      pouch.rotation.y = side * 0.4;
    }
    const wrench = add(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.18, 0.02), silver));
    wrench.position.set(0.3, 0.72, -0.04);
    wrench.rotation.z = 0.2;
  } else if (accessory === 'clipboard') {
    const board = add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.36, 0.02), mat(0xd9cfa8)));
    board.position.set(0.32, 1.02, 0.38);
    board.rotation.x = -0.5;
    board.rotation.y = -0.2;
    const paper = add(new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.3, 0.005), mat(0xf2f0e8)));
    paper.position.set(0.318, 1.025, 0.395);
    paper.rotation.x = -0.5;
    paper.rotation.y = -0.2;
    const clip = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.03), silver));
    clip.position.set(0.36, 1.18, 0.31);
    clip.rotation.x = -0.5;
    clip.rotation.y = -0.2;
  }

  return g;
}

// NPC definitions: id, name, spawn, behavior, optional patrol path, dialogue.
export const NPC_DEFS = [
  {
    id: 'gus', name: 'Gus (Maintenance)', pos: [-52, -4], rotY: Math.PI / 2,
    colors: { shellColor: 0xd95f3b, vestColor: 0xf2741f },
    accessory: 'toolbelt',
    role: 'mission'
  },
  {
    id: 'dot', name: 'Dot (Warehouse)', pos: [-100, 70], rotY: Math.PI,
    colors: { shellColor: 0xe8744f, vestColor: 0xf2c12e },
    accessory: 'clipboard',
    role: 'mission'
  },
  {
    id: 'sal', name: 'Sal (Receiving)', pos: [81, -13], rotY: -1.0,
    colors: { shellColor: 0xc94f4f, vestColor: 0xf2c12e },
    accessory: 'clipboard',
    dialogue: ['Parts delivery is backed up by the west dock.', 'If a box says FRAGILE, that is a suggestion we take very seriously around here.']
  },
  {
    id: 'bea', name: 'Bea (Front Office)', pos: [130, 2], rotY: 0,
    colors: { shellColor: 0xf08a8a, vestColor: 0x6fb3e0, hatColor: 0xffffff },
    accessory: 'clipboard',
    dialogue: ['Welcome to Laitram Town. Visitor badges are a formality. The handshake is mandatory.', 'Corporate says we are one big family. A very crunchy family.']
  },
  {
    id: 'ray', name: 'Ray (Security)', pos: [3, 108], rotY: 0.6,
    colors: { shellColor: 0xb5552f, vestColor: 0x3a5a8c, hatColor: 0x2f3338 },
    accessory: 'none',
    dialogue: ['Gate is open for the day shift. Try not to molt in the parking lot.', 'I have watched this gate for nine years. The gate has never once tried anything.']
  },
  {
    id: 'lou', name: 'Lou (Break Area)', pos: [82, 27], rotY: 0.8,
    colors: { shellColor: 0xe89a4f, vestColor: 0xf2741f },
    accessory: 'toolbelt',
    dialogue: ['The break room coffee has industrial torque.', 'I have been on break for ten minutes. Emotionally, I never left the line.']
  },
  {
    id: 'cleo', name: 'Cleo (Break Area)', pos: [88, 33], rotY: -2.4,
    colors: { shellColor: 0xf0a0b4, vestColor: 0xf2c12e },
    accessory: 'none',
    dialogue: ['The bayou humidity is undefeated.', 'My shell frizzes up every single afternoon. Every. Single. Afternoon.']
  },
  {
    id: 'mo', name: 'Mo (Logistics)', pos: [2, 15], rotY: 0,
    colors: { shellColor: 0xd97b3b, vestColor: 0xf2c12e },
    accessory: 'clipboard',
    path: [[2, 15], [2, 105]],
    dialogue: ['Walking the lane keeps the claws loose.', 'Forklift right of way is not a debate. It is physics.']
  },
  {
    id: 'pearl', name: 'Pearl (Office)', pos: [16, 58], rotY: 0,
    colors: { shellColor: 0xf08a6a, vestColor: 0x6fb3e0 },
    accessory: 'clipboard',
    path: [[16, 58], [64, 58]],
    dialogue: ['I park in the far lot for the steps. My watch says I am thriving.', 'Quarterly numbers are up. Morale is shellfish-adjacent.']
  },
  {
    id: 'hank', name: 'Hank (West Dock)', pos: [-150, 80], rotY: -0.6,
    colors: { shellColor: 0xc96a3b, vestColor: 0xf2741f },
    accessory: 'toolbelt',
    dialogue: ['Somebody misplaced the 10 mm wrench again.', 'Every toolbox in Louisiana is missing the same 10 mm wrench. Statistically, that is a conspiracy.']
  },
  {
    id: 'juno', name: 'Juno (Quality)', pos: [103, -32], rotY: 0,
    colors: { shellColor: 0xe8744f, vestColor: 0xf2c12e },
    accessory: 'clipboard',
    path: [[103, -32], [103, 2]],
    dialogue: ['Conveyor line three is making that sound again.', 'Not the bad sound. The other sound. The one that becomes the bad sound.']
  },
  {
    id: 'skip', name: 'Skip (Grounds)', pos: [150, 55], rotY: -1.2,
    colors: { shellColor: 0xb5704f, vestColor: 0x7bc47f },
    accessory: 'toolbelt',
    dialogue: ['That canal is for drainage, not for swimming. I checked. Once.', 'The grass grows faster than I can mow it. This is Louisiana. The grass is winning.']
  }
];

export class NPCManager {
  constructor(scene) {
    this.npcs = [];
    for (const def of NPC_DEFS) {
      const group = createShrimpWorker({ ...def.colors, accessory: def.accessory });
      group.position.set(def.pos[0], 0, def.pos[1]);
      group.rotation.y = def.rotY || 0;
      scene.add(group);
      this.npcs.push({
        def,
        group,
        baseRotY: def.rotY || 0,
        pathIndex: 0,
        bobPhase: Math.random() * Math.PI * 2,
        facingPlayer: false
      });
    }
  }

  get(id) {
    return this.npcs.find((n) => n.def.id === id);
  }

  update(dt, time, playerPos) {
    const SPEED = 1.6;
    for (const npc of this.npcs) {
      const p = npc.group.position;
      const distToPlayer = p.distanceTo(playerPos);

      // Idle bob so everyone feels alive.
      npc.group.position.y = Math.sin(time * 2 + npc.bobPhase) * 0.03;

      // Face the player when they are close enough to chat.
      if (distToPlayer < 5) {
        const target = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
        npc.group.rotation.y = lerpAngle(npc.group.rotation.y, target, dt * 6);
        continue;
      }

      if (npc.def.path) {
        const wp = npc.def.path[npc.pathIndex];
        const dx = wp[0] - p.x;
        const dz = wp[1] - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.5) {
          npc.pathIndex = (npc.pathIndex + 1) % npc.def.path.length;
        } else {
          p.x += (dx / dist) * SPEED * dt;
          p.z += (dz / dist) * SPEED * dt;
          const target = Math.atan2(dx, dz);
          npc.group.rotation.y = lerpAngle(npc.group.rotation.y, target, dt * 8);
          // Little waddle while walking.
          npc.group.rotation.z = Math.sin(time * 8 + npc.bobPhase) * 0.05;
        }
      } else {
        npc.group.rotation.z = 0;
        npc.group.rotation.y = lerpAngle(npc.group.rotation.y, npc.baseRotY, dt * 2);
      }
    }
  }
}

function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, t);
}
