import * as THREE from 'three';

// Humanoid shrimp workers: curved shrimp body, hard hat, safety vest,
// work boots. Built entirely from primitives.

function mat(color) {
  return new THREE.MeshLambertMaterial({ color });
}

export function createShrimpWorker(opts = {}) {
  const {
    shellColor = 0xe8744f,
    vestColor = 0xf2c12e,
    hatColor = 0xf5f0e6,
    bootColor = 0x4a3826
  } = opts;

  const g = new THREE.Group();
  const shell = mat(shellColor);
  const shellDark = mat(new THREE.Color(shellColor).multiplyScalar(0.8).getHex());

  // Legs and boots.
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.5, 6), mat(0x3a5a8c));
    leg.position.set(side * 0.16, 0.45, 0);
    leg.castShadow = true;
    g.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.42), mat(bootColor));
    boot.position.set(side * 0.16, 0.1, 0.06);
    boot.castShadow = true;
    g.add(boot);
  }

  // Curved shrimp torso: stacked, tilted segments leaning forward.
  const segs = [
    { y: 0.85, z: 0.02, r: 0.3, tilt: 0.15 },
    { y: 1.1, z: 0.06, r: 0.33, tilt: 0.3 },
    { y: 1.35, z: 0.04, r: 0.3, tilt: 0.45 },
    { y: 1.56, z: -0.04, r: 0.26, tilt: 0.6 }
  ];
  for (const s of segs) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(s.r, 8, 6), shell);
    seg.scale.set(1, 0.8, 1.05);
    seg.position.set(0, s.y, s.z);
    seg.rotation.x = s.tilt;
    seg.castShadow = true;
    g.add(seg);
  }

  // Tail fan poking out the back, below the vest.
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 5), shellDark);
  tail.position.set(0, 0.72, -0.34);
  tail.rotation.x = 2.3;
  tail.castShadow = true;
  g.add(tail);
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.3, 0.26, 5), shellDark);
  fan.position.set(0, 0.6, -0.55);
  fan.rotation.x = 1.9;
  g.add(fan);

  // Safety vest wrapped around the middle segments.
  const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.62, 8), mat(vestColor));
  vest.position.set(0, 1.12, 0.04);
  vest.rotation.x = 0.18;
  vest.castShadow = true;
  g.add(vest);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.375, 0.385, 0.1, 8), mat(0xb9c4c9));
  stripe.position.set(0, 1.14, 0.04);
  stripe.rotation.x = 0.18;
  g.add(stripe);

  // Arms.
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.55, 6), shell);
    arm.position.set(side * 0.42, 1.15, 0.08);
    arm.rotation.z = side * 0.5;
    arm.rotation.x = -0.3;
    arm.castShadow = true;
    g.add(arm);
  }

  // Head: shrimp head cone with eyes on stalks and antennae.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), shell);
  head.scale.set(0.9, 1, 1.2);
  head.position.set(0, 1.82, 0.14);
  head.castShadow = true;
  g.add(head);
  const rostrum = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 5), shellDark);
  rostrum.position.set(0, 1.86, 0.42);
  rostrum.rotation.x = Math.PI / 2;
  g.add(rostrum);
  for (const side of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 5), shellDark);
    stalk.position.set(side * 0.12, 2.02, 0.22);
    stalk.rotation.z = side * -0.4;
    g.add(stalk);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), mat(0x14181c));
    eye.position.set(side * 0.15, 2.1, 0.24);
    g.add(eye);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 4), shellDark);
    ant.position.set(side * 0.08, 2.2, -0.06);
    ant.rotation.x = -0.7;
    ant.rotation.z = side * 0.25;
    g.add(ant);
  }

  // Hard hat.
  const hat = new THREE.Mesh(new THREE.SphereGeometry(0.27, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(hatColor));
  hat.position.set(0, 1.96, 0.1);
  hat.castShadow = true;
  g.add(hat);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.05, 10), mat(hatColor));
  brim.position.set(0, 1.97, 0.1);
  g.add(brim);

  return g;
}

// NPC definitions: id, name, spawn, behavior, optional patrol path, dialogue.
export const NPC_DEFS = [
  {
    id: 'gus', name: 'Gus (Maintenance)', pos: [45, -32], rotY: Math.PI,
    colors: { shellColor: 0xd95f3b, vestColor: 0xf2741f },
    role: 'mission'
  },
  {
    id: 'dot', name: 'Dot (Warehouse)', pos: [-100, -49], rotY: Math.PI,
    colors: { shellColor: 0xe8744f, vestColor: 0xf2c12e },
    role: 'mission'
  },
  {
    id: 'sal', name: 'Sal (Receiving)', pos: [116, -31], rotY: 0.4,
    colors: { shellColor: 0xc94f4f, vestColor: 0xf2c12e },
    dialogue: ['Parts delivery is backed up by the west dock.', 'If a box says FRAGILE, that is a suggestion we take very seriously around here.']
  },
  {
    id: 'bea', name: 'Bea (Front Office)', pos: [-60, 40], rotY: Math.PI,
    colors: { shellColor: 0xf08a8a, vestColor: 0x6fb3e0, hatColor: 0xffffff },
    dialogue: ['Welcome to Laitram Town. Visitor badges are a formality. The handshake is mandatory.', 'Corporate says we are one big family. A very crunchy family.']
  },
  {
    id: 'ray', name: 'Ray (Security)', pos: [12, 117], rotY: 0.6,
    colors: { shellColor: 0xb5552f, vestColor: 0x3a5a8c, hatColor: 0x2f3338 },
    dialogue: ['Gate is open for the day shift. Try not to molt in the parking lot.', 'I have watched this gate for nine years. The gate has never once tried anything.']
  },
  {
    id: 'lou', name: 'Lou (Break Area)', pos: [-23, -45], rotY: 0.9,
    colors: { shellColor: 0xe89a4f, vestColor: 0xf2741f },
    dialogue: ['The break room coffee has industrial torque.', 'I have been on break for ten minutes. Emotionally, I never left the line.']
  },
  {
    id: 'cleo', name: 'Cleo (Break Area)', pos: [-13, -45], rotY: -0.9,
    colors: { shellColor: 0xf0a0b4, vestColor: 0xf2c12e },
    dialogue: ['The bayou humidity is undefeated.', 'My shell frizzes up every single afternoon. Every. Single. Afternoon.']
  },
  {
    id: 'mo', name: 'Mo (Logistics)', pos: [0, 60], rotY: 0,
    colors: { shellColor: 0xd97b3b, vestColor: 0xf2c12e },
    path: [[0, 60], [0, 100], [-30, 100], [0, 100]],
    dialogue: ['Walking the lane keeps the claws loose.', 'Forklift right of way is not a debate. It is physics.']
  },
  {
    id: 'pearl', name: 'Pearl (Office)', pos: [-50, 70], rotY: 0,
    colors: { shellColor: 0xf08a6a, vestColor: 0x6fb3e0 },
    path: [[-50, 70], [-95, 70], [-95, 95], [-50, 95]],
    dialogue: ['I park in the far lot for the steps. My watch says I am thriving.', 'Quarterly numbers are up. Morale is shellfish-adjacent.']
  },
  {
    id: 'hank', name: 'Hank (West Dock)', pos: [-138, -72], rotY: -0.6,
    colors: { shellColor: 0xc96a3b, vestColor: 0xf2741f },
    dialogue: ['Somebody misplaced the 10 mm wrench again.', 'Every toolbox in Louisiana is missing the same 10 mm wrench. Statistically, that is a conspiracy.']
  },
  {
    id: 'juno', name: 'Juno (Quality)', pos: [20, -28], rotY: 0,
    colors: { shellColor: 0xe8744f, vestColor: 0xf2c12e },
    path: [[20, -28], [-30, -28], [-30, -40], [20, -40]],
    dialogue: ['Conveyor line three is making that sound again.', 'Not the bad sound. The other sound. The one that becomes the bad sound.']
  },
  {
    id: 'skip', name: 'Skip (Grounds)', pos: [150, 30], rotY: -1.2,
    colors: { shellColor: 0xb5704f, vestColor: 0x7bc47f },
    dialogue: ['That canal is for drainage, not for swimming. I checked. Once.', 'The grass grows faster than I can mow it. This is Louisiana. The grass is winning.']
  }
];

export class NPCManager {
  constructor(scene) {
    this.npcs = [];
    for (const def of NPC_DEFS) {
      const group = createShrimpWorker(def.colors);
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
