import { createShrimpWorker } from './characters/shrimpWorker.js';
import { initBehavior, updateNPC } from './characters/npcBehaviors.js';
import { createShrimplyGigantic, initGiant, updateGiant, SHRIMPLY } from './characters/giantShrimp.js';
import { createFishPerson, GERALD } from './characters/fishPerson.js';

// NPC definitions and the per-frame NPC manager. The shrimp builder lives
// in src/characters/shrimpWorker.js, per-frame behavior in
// src/characters/npcBehaviors.js, dialogue in src/dialogue/dialogueData.js.
export { createShrimpWorker };

// NPC definitions: id, name, spawn, optional patrol path or 'sit' behavior.
// Seated NPCs are positioned on chairs built in src/map/interior.js.
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
    accessory: 'clipboard'
  },
  {
    id: 'bea', name: 'Bea (Front Office)', pos: [130, 2], rotY: 0,
    colors: { shellColor: 0xf08a8a, vestColor: 0x6fb3e0, hatColor: 0xffffff },
    accessory: 'clipboard'
  },
  {
    id: 'ray', name: 'Ray (Security)', pos: [3, 108], rotY: 0.6,
    colors: { shellColor: 0xb5552f, vestColor: 0x3a5a8c, hatColor: 0x2f3338 },
    accessory: 'none'
  },
  {
    id: 'lou', name: 'Lou (Break Area)', pos: [82, 27], rotY: 0.8,
    colors: { shellColor: 0xe89a4f, vestColor: 0xf2741f },
    accessory: 'toolbelt'
  },
  {
    id: 'cleo', name: 'Cleo (Break Area)', pos: [88, 33], rotY: -2.4,
    colors: { shellColor: 0xf0a0b4, vestColor: 0xf2c12e },
    accessory: 'none'
  },
  {
    id: 'mo', name: 'Mo (Logistics)', pos: [2, 15], rotY: 0,
    colors: { shellColor: 0xd97b3b, vestColor: 0xf2c12e },
    accessory: 'clipboard',
    path: [[2, 15], [2, 105]]
  },
  {
    id: 'pearl', name: 'Pearl (Office)', pos: [16, 58], rotY: 0,
    colors: { shellColor: 0xf08a6a, vestColor: 0x6fb3e0 },
    accessory: 'clipboard',
    path: [[16, 58], [64, 58]]
  },
  {
    id: 'hank', name: 'Hank (West Dock)', pos: [-150, 80], rotY: -0.6,
    colors: { shellColor: 0xc96a3b, vestColor: 0xf2741f },
    accessory: 'toolbelt'
  },
  {
    id: 'juno', name: 'Juno (Quality)', pos: [103, -32], rotY: 0,
    colors: { shellColor: 0xe8744f, vestColor: 0xf2c12e },
    accessory: 'clipboard',
    path: [[103, -32], [103, 2]]
  },
  {
    id: 'skip', name: 'Skip (Grounds)', pos: [150, 55], rotY: -1.2,
    colors: { shellColor: 0xb5704f, vestColor: 0x7bc47f },
    accessory: 'toolbelt'
  },
  // ---- Indoor NPCs (Laitram Machinery interior, Phase 5) ----
  {
    id: 'rita', name: 'Rita (Reception)', pos: [27, 12.2], rotY: 0,
    colors: { shellColor: 0xf0907a, vestColor: 0x6fb3e0, hatColor: 0xffffff },
    accessory: 'none',
    behavior: 'sit' // reception desk chair in the lobby
  },
  {
    id: 'nina', name: 'Nina (Intern)', pos: [28.5, -14.5], rotY: Math.PI,
    colors: { shellColor: 0xf2a08a, vestColor: 0x7bc47f },
    accessory: 'clipboard',
    behavior: 'sit' // cubicle row A, center pod
  },
  {
    id: 'theo', name: 'Theo (Intern)', pos: [36.5, -3.5], rotY: 0,
    colors: { shellColor: 0xd98a5f, vestColor: 0x7bc47f },
    accessory: 'none',
    behavior: 'sit' // cubicle row B, east pod
  },
  {
    id: 'marge', name: 'Marge (Manager)', pos: [61, -17], rotY: 0,
    colors: { shellColor: 0xc97a4f, vestColor: 0x3a5a8c, hatColor: 0x2f3338 },
    accessory: 'clipboard',
    behavior: 'sit', // executive chair behind the desk
    role: 'mission'
  },
  {
    id: 'benny', name: 'Benny (Breakroom)', pos: [66, 6.5], rotY: Math.PI / 2,
    colors: { shellColor: 0xe8a05f, vestColor: 0xf2c12e },
    accessory: 'toolbelt'
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
      const npc = {
        def,
        group,
        parts: group.userData.parts,
        baseRotY: def.rotY || 0,
        pathIndex: 0,
        // Deterministic per-NPC idle variation: phase and bob frequency
        // differ so the crowd never bobs in unison.
        bobPhase: i * 1.7,
        bobFreq: 1.7 + ((i * 0.37) % 1) * 0.9
      };
      initBehavior(npc);
      this.npcs.push(npc);
    });

    // Special oversized roaming NPC. Built and driven by its own module, but
    // pushed into this.npcs so the existing dialogue (the missions flavor
    // loop) and the minimap pick him up for free.
    this.addShrimplyGigantic(scene);

    // Gerald: a stationary fish person in a business suit who does not belong
    // here and is aware of it. Driven by the standard idle behavior.
    this.addGerald(scene);
  }

  // Shrimply Gigantic: one large, angry, detail-rich shrimp that patrols the
  // open east truck court. See src/characters/giantShrimp.js for his builder,
  // patrol path and behavior. He is flagged `special` so update() routes him
  // to his own state machine instead of the standard NPC behavior.
  addShrimplyGigantic(scene) {
    const group = createShrimplyGigantic();
    group.position.set(SHRIMPLY.start[0], 0, SHRIMPLY.start[1]);
    group.rotation.y = SHRIMPLY.rotY;
    scene.add(group);
    const npc = {
      def: { id: SHRIMPLY.id, name: SHRIMPLY.name, title: SHRIMPLY.title, path: SHRIMPLY.path },
      group,
      parts: group.userData.parts,
      special: true,
      bobPhase: 0.6,
      pathIndex: 0
    };
    initGiant(npc);
    this.npcs.push(npc);
  }

  addGerald(scene) {
    const group = createFishPerson();
    group.position.set(GERALD.pos[0], 0, GERALD.pos[1]);
    group.rotation.y = GERALD.rotY;
    scene.add(group);
    const i = this.npcs.length;
    const npc = {
      def: { id: GERALD.id, name: GERALD.name, mapColor: GERALD.mapColor },
      group,
      parts: group.userData.parts,
      baseRotY: GERALD.rotY,
      pathIndex: 0,
      bobPhase: i * 1.7,
      bobFreq: 1.7 + ((i * 0.37) % 1) * 0.9
    };
    initBehavior(npc);
    this.npcs.push(npc);
  }

  get(id) {
    return this.npcs.find((n) => n.def.id === id);
  }

  update(dt, time, playerPos) {
    for (const npc of this.npcs) {
      if (npc.special) updateGiant(npc, dt, time, playerPos);
      else updateNPC(npc, dt, time, playerPos);
    }
  }
}
