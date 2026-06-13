import { createShrimpWorker } from './characters/shrimpWorker.js';

// NPC definitions and the per-frame NPC manager. The shrimp character
// builder lives in src/characters/shrimpWorker.js.
export { createShrimpWorker };

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
    NPC_DEFS.forEach((def, i) => {
      const group = createShrimpWorker({ ...def.colors, accessory: def.accessory, seed: i });
      group.position.set(def.pos[0], 0, def.pos[1]);
      group.rotation.y = def.rotY || 0;
      scene.add(group);
      this.npcs.push({
        def,
        group,
        parts: group.userData.parts,
        baseRotY: def.rotY || 0,
        pathIndex: 0,
        // Deterministic per-NPC idle variation: phase and bob frequency
        // differ so the crowd never bobs in unison.
        bobPhase: i * 1.7,
        bobFreq: 1.7 + ((i * 0.37) % 1) * 0.9,
        facingPlayer: false
      });
    });
  }

  get(id) {
    return this.npcs.find((n) => n.def.id === id);
  }

  update(dt, time, playerPos) {
    const SPEED = 1.6;
    for (const npc of this.npcs) {
      const p = npc.group.position;
      const distToPlayer = p.distanceTo(playerPos);

      // Idle bob so everyone feels alive (per-NPC frequency and phase).
      npc.group.position.y = Math.sin(time * npc.bobFreq + npc.bobPhase) * 0.03;

      // Face the player when they are close enough to chat.
      if (distToPlayer < 5) {
        const target = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
        npc.group.rotation.y = lerpAngle(npc.group.rotation.y, target, dt * 6);
        npc.parts.head.rotation.y = lerpAngle(npc.parts.head.rotation.y, 0, dt * 6);
        relaxLimbs(npc.parts, dt);
        continue;
      }

      let walking = false;
      if (npc.def.path) {
        const wp = npc.def.path[npc.pathIndex];
        const dx = wp[0] - p.x;
        const dz = wp[1] - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.5) {
          npc.pathIndex = (npc.pathIndex + 1) % npc.def.path.length;
        } else {
          walking = true;
          p.x += (dx / dist) * SPEED * dt;
          p.z += (dz / dist) * SPEED * dt;
          const target = Math.atan2(dx, dz);
          npc.group.rotation.y = lerpAngle(npc.group.rotation.y, target, dt * 8);
          // Little waddle plus alternating arm/leg swing while walking.
          npc.group.rotation.z = Math.sin(time * 8 + npc.bobPhase) * 0.05;
          swingLimbs(npc.parts, time * 7 + npc.bobPhase);
        }
      }
      if (!walking) {
        npc.group.rotation.z = 0;
        npc.group.rotation.y = lerpAngle(npc.group.rotation.y, npc.baseRotY, dt * 2);
        relaxLimbs(npc.parts, dt);
        // Occasional idle glance: a slow wave that only crests now and then,
        // so heads turn briefly every several seconds and ease back.
        const w = Math.sin(time * 0.35 + npc.bobPhase * 3);
        npc.parts.head.rotation.y = Math.sign(w) * Math.max(0, Math.abs(w) - 0.9) * 5;
      }
    }
  }
}

// Alternating arm/leg swing around their pivot Groups while walking.
function swingLimbs(parts, phase) {
  const arm = Math.sin(phase) * 0.45;
  const leg = Math.sin(phase) * 0.55;
  parts.armL.rotation.x = arm;
  parts.armR.rotation.x = -arm;
  parts.legL.rotation.x = -leg;
  parts.legR.rotation.x = leg;
}

// Ease limbs back to rest when not walking.
function relaxLimbs(parts, dt) {
  const k = Math.min(1, dt * 8);
  for (const limb of [parts.armL, parts.armR, parts.legL, parts.legR]) {
    limb.rotation.x += (0 - limb.rotation.x) * k;
  }
}

function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, t);
}
