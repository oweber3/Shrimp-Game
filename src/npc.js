import { createShrimpWorker } from './characters/shrimpWorker.js';
import { initBehavior, updateNPC } from './characters/npcBehaviors.js';
import { createShrimplyGigantic, initGiant, updateGiant, SHRIMPLY } from './characters/giantShrimp.js';
import { createFishPerson, GERALD } from './characters/fishPerson.js';
import { createDogPerson, DOUGLAS } from './characters/dogPerson.js';
import { createRoboHead, updateRoboHead } from './characters/roboHead.js';
import {
  EXTERIOR_NPC_BY_ID,
  INTERIOR_NPC_BY_ID,
} from './map/placementData.js';

// NPC definitions and the per-frame NPC manager. The shrimp builder lives
// in src/characters/shrimpWorker.js, per-frame behavior in
// src/characters/npcBehaviors.js, dialogue in src/dialogue/dialogueData.js.
export { createShrimpWorker };

const placed = (id, interior = false) => {
  const placement = (interior ? INTERIOR_NPC_BY_ID : EXTERIOR_NPC_BY_ID)[id];
  return {
    pos: [placement.x, placement.z],
    ...(placement.path ? { path: placement.path } : {}),
    ...(interior ? { behavior: placement.behavior } : {}),
  };
};

// NPC definitions: id, name, spawn, optional patrol path or 'sit' behavior.
// Seated NPCs are positioned on chairs built in src/map/interior.js.
export const NPC_DEFS = [
  {
    id: 'gus', name: 'Gus (Maintenance)', ...placed('gus'), rotY: Math.PI / 2,
    colors: { shellColor: 0xd95f3b, vestColor: 0xf2741f },
    accessory: 'toolbelt',
    role: 'mission'
  },
  {
    id: 'dot', name: 'Dot (Warehouse)', ...placed('dot'), rotY: Math.PI,
    colors: { shellColor: 0xe8744f, vestColor: 0xf2c12e },
    accessory: 'clipboard',
    role: 'mission'
  },
  {
    id: 'sal', name: 'Sal (Receiving)', ...placed('sal'), rotY: -1.0,
    colors: { shellColor: 0xc94f4f, vestColor: 0xf2c12e },
    accessory: 'clipboard'
  },
  {
    id: 'bea', name: 'Bea (Front Office)', ...placed('bea'), rotY: 0,
    colors: { shellColor: 0xf08a8a, vestColor: 0x6fb3e0, hatColor: 0xffffff },
    accessory: 'clipboard'
  },
  {
    id: 'ray', name: 'Ray (Security)', ...placed('ray'), rotY: 0.6,
    colors: { shellColor: 0xb5552f, vestColor: 0x3a5a8c, hatColor: 0x2f3338 },
    accessory: 'none'
  },
  {
    id: 'lou', name: 'Lou (Break Area)', ...placed('lou'), rotY: 0.8,
    colors: { shellColor: 0xe89a4f, vestColor: 0xf2741f },
    accessory: 'toolbelt'
  },
  {
    id: 'cleo', name: 'Cleo (Break Area)', ...placed('cleo'), rotY: -2.4,
    colors: { shellColor: 0xf0a0b4, vestColor: 0xf2c12e },
    accessory: 'none'
  },
  {
    id: 'mo', name: 'Mo (Logistics)', ...placed('mo'), rotY: 0,
    colors: { shellColor: 0xd97b3b, vestColor: 0xf2c12e },
    accessory: 'clipboard',
  },
  {
    id: 'pearl', name: 'Pearl (Office)', ...placed('pearl'), rotY: 0,
    colors: { shellColor: 0xf08a6a, vestColor: 0x6fb3e0 },
    accessory: 'clipboard',
  },
  {
    id: 'hank', name: 'Hank (West Dock)', ...placed('hank'), rotY: -0.6,
    colors: { shellColor: 0xc96a3b, vestColor: 0xf2741f },
    accessory: 'toolbelt'
  },
  {
    id: 'juno', name: 'Juno (Quality)', ...placed('juno'), rotY: 0,
    colors: { shellColor: 0xe8744f, vestColor: 0xf2c12e },
    accessory: 'clipboard',
  },
  {
    id: 'skip', name: 'Skip (Grounds)', ...placed('skip'), rotY: -1.2,
    colors: { shellColor: 0xb5704f, vestColor: 0x7bc47f },
    accessory: 'toolbelt'
  },
  // ---- Indoor NPCs (Laitram Machinery interior, Phase 5) ----
  {
    id: 'rita', name: 'Rita (Reception)', ...placed('rita', true), rotY: 0,
    colors: { shellColor: 0xf0907a, vestColor: 0x6fb3e0, hatColor: 0xffffff },
    accessory: 'none' // reception desk chair in the lobby
  },
  {
    id: 'nina', name: 'Nina (Intern)', ...placed('nina', true), rotY: Math.PI,
    colors: { shellColor: 0xf2a08a, vestColor: 0x7bc47f },
    accessory: 'clipboard' // cubicle field row A, center pod
  },
  {
    id: 'theo', name: 'Theo (Intern)', ...placed('theo', true), rotY: 0,
    colors: { shellColor: 0xd98a5f, vestColor: 0x7bc47f },
    accessory: 'none' // cubicle field row B, east pod
  },
  {
    id: 'marge', name: 'Marge (Manager)', ...placed('marge', true), rotY: -Math.PI / 2,
    colors: { shellColor: 0xc97a4f, vestColor: 0x3a5a8c, hatColor: 0x2f3338 },
    accessory: 'clipboard', // executive chair in her east-row office (1022-equivalent)
    role: 'mission'
  },
  {
    id: 'owen', name: 'Owen Weber (Shrimp Eng)', ...placed('owen', true), rotY: Math.PI / 2,
    colors: { shellColor: 0xd98754, vestColor: 0x2f75bb, hatColor: 0xffffff },
    accessory: 'clipboard',
    role: 'special',
    mapColor: '#5ee9ff'
  },
  {
    id: 'kearney', name: 'Kearney Nieset (Shrimp Eng)', ...placed('kearney', true), rotY: Math.PI / 2,
    colors: { shellColor: 0xe0905f, vestColor: 0x2f75bb, hatColor: 0xffffff },
    accessory: 'toolbelt',
    role: 'special',
    mapColor: '#d6a04b'
  },
  {
    id: 'benny', name: 'Benny (Kitchen)', ...placed('benny', true), rotY: Math.PI / 2,
    colors: { shellColor: 0xe8a05f, vestColor: 0xf2c12e },
    accessory: 'toolbelt' // seated at the modeled kitchen 1078A table
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

    // Phase C interior specials: Douglas is a dog in a suit, while Owen's
    // hovering robotic-head pet is tracked as a non-dialogue minimap special.
    this.addDouglas(scene);
    this.addOwenRoboHead(scene);
  }

  // Shrimply Gigantic: one large, angry, detail-rich shrimp that patrols the
  // parking lot in front of Laitram Machinery. See
  // src/characters/giantShrimp.js for his builder, patrol path and behavior.
  // He is flagged `special` so update() routes him to his own state machine
  // instead of the standard NPC behavior.
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


  addDouglas(scene) {
    const group = createDogPerson();
    group.position.set(DOUGLAS.pos[0], 0, DOUGLAS.pos[1]);
    group.rotation.y = DOUGLAS.rotY;
    scene.add(group);
    const i = this.npcs.length;
    const npc = {
      def: { id: DOUGLAS.id, name: DOUGLAS.name, behavior: 'sit', mapColor: DOUGLAS.mapColor, role: 'special' },
      group,
      parts: group.userData.parts,
      baseRotY: DOUGLAS.rotY,
      pathIndex: 0,
      bobPhase: i * 1.7,
      bobFreq: 1.7 + ((i * 0.37) % 1) * 0.9
    };
    initBehavior(npc);
    this.npcs.push(npc);
  }

  addOwenRoboHead(scene) {
    const group = createRoboHead();
    const anchor = INTERIOR_NPC_BY_ID.owenRoboHead;
    group.userData.anchor.set(anchor.x, 0, anchor.z);
    group.position.copy(group.userData.anchor);
    scene.add(group);
    this.npcs.push({
      def: { id: 'owenRoboHead', name: 'Owen\'s Robo-Head', mapColor: '#7ff7ff' },
      group,
      parts: {},
      roboHead: true,
      special: true
    });
  }

  get(id) {
    return this.npcs.find((n) => n.def.id === id);
  }

  update(dt, time, playerPos, dialogueOpen = false) {
    for (const npc of this.npcs) {
      if (npc.roboHead) updateRoboHead(npc.group, dt, time, playerPos);
      else if (npc.special) updateGiant(npc, dt, time, playerPos, dialogueOpen);
      else updateNPC(npc, dt, time, playerPos, dialogueOpen);
    }
  }
}
