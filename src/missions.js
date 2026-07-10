import * as THREE from 'three';
import { POI } from './map/terrain.js';
import { FLAVOR, MISSION_LINES as L } from './dialogue/dialogueData.js';

// Mission state machine plus all interactable objects. Dialogue lives in
// src/dialogue/dialogueData.js. Mission 1: Missing Wrench. Mission 2:
// Conveyor Part Delivery. Mission 3: Coffee Run (indoors).

const STATES = [
  'M1_TALK',
  'M1_FIND',
  'M1_RETURN',
  'M2_TALK',
  'M2_PICKUP',
  'M2_DELIVER',
  'M3_TALK',
  'M3_FETCH',
  'M3_RETURN',
  'DONE'
];

export class Missions {
  constructor(scene, ui, npcManager, player, missionLog = null) {
    this.scene = scene;
    this.ui = ui;
    this.npcs = npcManager;
    this.player = player;
    this.log = missionLog;
    this.state = 'M1_TALK';
    this.flavorIndex = {};

    // Wrench prop near the west dock pallets.
    this.wrench = buildWrench();
    this.wrench.position.set(POI.wrench.x, 1.45, POI.wrench.z);
    scene.add(this.wrench);

    // Conveyor parts box at the receiving dock.
    this.partsBox = buildPartsBox();
    this.partsBox.position.set(POI.partsBox.x, 0.5, POI.partsBox.z);
    scene.add(this.partsBox);

    // Fresh coffee pot on the kitchen counter (Mission 3).
    this.coffeePot = buildCoffeePot();
    this.coffeePot.position.set(POI.coffeePot.x, 1.16, POI.coffeePot.z);
    scene.add(this.coffeePot);

    // Pulsing ground markers for mission items.
    this.wrenchMarker = buildMarker(0xffc04d);
    this.wrenchMarker.position.set(POI.wrench.x, 0.1, POI.wrench.z);
    this.wrenchMarker.visible = false;
    scene.add(this.wrenchMarker);

    this.boxMarker = buildMarker(0x6fd3ff);
    this.boxMarker.position.set(POI.partsBox.x, 0.1, POI.partsBox.z);
    this.boxMarker.visible = false;
    scene.add(this.boxMarker);

    // Pot marker sits in front of the counter so the ring is reachable.
    this.potMarker = buildMarker(0xd9a05b);
    this.potMarker.position.set(POI.coffeePot.x, 0.1, POI.coffeePot.z + 1.4);
    this.potMarker.visible = false;
    scene.add(this.potMarker);

    this.interactables = this.buildInteractables();
    this.applyState('M1_TALK', true);
  }

  buildInteractables() {
    const list = [];
    const gus = this.npcs.get('gus');
    const sal = this.npcs.get('sal');
    const dot = this.npcs.get('dot');
    const marge = this.npcs.get('marge');

    // --- Gus: Mission 1 giver ---
    list.push({
      id: 'gus',
      getPos: () => gus.group.position,
      radius: 3.2,
      prompt: () => 'Talk to Gus',
      available: () => true,
      action: () => {
        if (this.state === 'M1_TALK') {
          this.ui.showDialogue(gus.def.name, L.m1Start, () => this.applyState('M1_FIND'));
        } else if (this.state === 'M1_FIND') {
          this.ui.showDialogue(gus.def.name, L.m1Reminder);
        } else if (this.state === 'M1_RETURN') {
          this.ui.showDialogue(gus.def.name, L.m1Complete, () => {
            this.player.dropCarry();
            this.wrench.visible = false;
            this.ui.showToast('Mission 1 complete: Missing Wrench');
            this.applyState('M2_TALK');
          });
        } else {
          this.flavor(gus.def.name, FLAVOR.gus, 'gus');
        }
      }
    });

    // --- Wrench pickup ---
    list.push({
      id: 'wrench',
      getPos: () => this.wrench.position,
      radius: 2.4,
      prompt: () => 'Pick up the 10 mm wrench',
      available: () => this.state === 'M1_FIND' && this.wrench.visible,
      action: () => {
        this.player.carry(this.wrench);
        this.ui.showToast('Picked up the 10 mm wrench');
        this.applyState('M1_RETURN');
      }
    });

    // --- Sal: Mission 2 giver ---
    list.push({
      id: 'sal',
      getPos: () => sal.group.position,
      radius: 3.2,
      prompt: () => 'Talk to Sal',
      available: () => true,
      action: () => {
        if (this.state === 'M2_TALK') {
          this.ui.showDialogue(sal.def.name, L.m2Start, () => this.applyState('M2_PICKUP'));
        } else if (this.state === 'M2_PICKUP') {
          this.ui.showDialogue(sal.def.name, L.m2ReminderSal);
        } else if (this.state === 'M2_DELIVER') {
          this.ui.showDialogue(sal.def.name, L.m2WrongWay);
        } else {
          this.flavor(sal.def.name, FLAVOR.sal, 'sal');
        }
      }
    });

    // --- Parts box pickup ---
    list.push({
      id: 'partsBox',
      getPos: () => this.partsBox.position,
      radius: 2.4,
      prompt: () => 'Pick up the parts box',
      available: () => this.state === 'M2_PICKUP',
      action: () => {
        this.player.carry(this.partsBox);
        this.ui.showToast('Mission 2 progress: 2 of 3 - box collected');
        this.applyState('M2_DELIVER');
      }
    });

    // --- Dot: Mission 2 receiver ---
    list.push({
      id: 'dot',
      getPos: () => dot.group.position,
      radius: 3.2,
      prompt: () => (this.state === 'M2_DELIVER' ? 'Deliver the parts box to Dot' : 'Talk to Dot'),
      available: () => true,
      action: () => {
        if (this.state === 'M2_DELIVER') {
          this.ui.showDialogue(dot.def.name, L.m2Complete, () => {
            this.player.dropCarry();
            this.partsBox.visible = false;
            this.ui.showToast('Mission 2 complete: Conveyor Part Delivery');
            this.applyState('M3_TALK');
          });
        } else if (this.state === 'M2_PICKUP') {
          this.ui.showDialogue(dot.def.name, L.m2ReminderDot);
        } else {
          this.flavor(dot.def.name, FLAVOR.dot, 'dot');
        }
      }
    });

    // --- Marge: Mission 3 giver and receiver (manager's office) ---
    list.push({
      id: 'marge',
      getPos: () => marge.group.position,
      radius: 3.4,
      prompt: () => (this.state === 'M3_RETURN' ? 'Give Marge the coffee pot' : 'Talk to Marge'),
      available: () => true,
      action: () => {
        if (this.state === 'M3_TALK') {
          this.ui.showDialogue(marge.def.name, L.m3Start, () => this.applyState('M3_FETCH'));
        } else if (this.state === 'M3_FETCH') {
          this.ui.showDialogue(marge.def.name, L.m3Reminder);
        } else if (this.state === 'M3_RETURN') {
          this.ui.showDialogue(marge.def.name, L.m3Complete, () => {
            this.player.dropCarry();
            this.coffeePot.visible = false;
            this.applyState('DONE');
            this.ui.showToast('Mission 3 complete: Coffee Run');
            this.ui.showCompletion(
              'All three missions complete. The wrench is home, the conveyor parts arrived, ' +
              'and management is caffeinated. Laitram Town runs smooth tonight - the campus is yours.'
            );
          });
        } else {
          this.flavor(marge.def.name, FLAVOR.marge, 'marge');
        }
      }
    });

    // --- Coffee pot pickup (kitchen counter) ---
    list.push({
      id: 'coffeePot',
      getPos: () => this.coffeePot.position,
      radius: 2.4,
      prompt: () => 'Pick up the fresh coffee pot',
      available: () => this.state === 'M3_FETCH',
      action: () => {
        this.player.carry(this.coffeePot);
        this.ui.showToast('Mission 3 progress: 2 of 3 - pot secured');
        this.applyState('M3_RETURN');
      }
    });

    // --- Flavor NPCs ---
    for (const npc of this.npcs.npcs) {
      if (['gus', 'sal', 'dot', 'marge'].includes(npc.def.id) || !FLAVOR[npc.def.id]) continue;
      list.push({
        id: npc.def.id,
        getPos: () => npc.group.position,
        radius: 3.2,
        prompt: () => `Talk to ${npc.def.name.split(' ')[0]}`,
        available: () => true,
        action: () => this.flavor(npc.def.name, FLAVOR[npc.def.id], npc.def.id)
      });
    }

    return list;
  }

  flavor(name, lines, key) {
    const i = this.flavorIndex[key] || 0;
    this.ui.showDialogue(name, [lines[i % lines.length]]);
    this.flavorIndex[key] = i + 1;
  }

  applyState(state, silent = false) {
    this.state = state;
    const O = {
      M1_TALK: 'Mission 1: Missing Wrench - Talk to Gus, the maintenance shrimp, at the Intralox SHIPPING dock.',
      M1_FIND: 'Mission 1 (1/3): Find the missing 10 mm wrench near the warehouse WEST DOCK.',
      M1_RETURN: 'Mission 1 (2/3): Return the wrench to Gus at the SHIPPING dock.',
      M2_TALK: 'Mission 2: Conveyor Part Delivery - Talk to Sal at the RECEIVING dock, east side of Laitram Machinery.',
      M2_PICKUP: 'Mission 2 (1/3): Pick up the conveyor parts box at the RECEIVING dock.',
      M2_DELIVER: 'Mission 2 (2/3): Deliver the parts box to Dot at the WAREHOUSE.',
      M3_TALK: 'Mission 3: Coffee Run - Find Marge, the manager, inside LAITRAM MACHINERY. Enter through the front LOBBY.',
      M3_FETCH: 'Mission 3 (1/3): Pick up the fresh coffee pot in the KITCHEN.',
      M3_RETURN: 'Mission 3 (2/3): Bring the pot back to Marge in her office.',
      DONE: 'Shift complete. Explore Laitram Town freely. Press R if you get stuck.'
    };
    this.ui.setObjective(O[state]);
    if (this.log) this.log.push(O[state]);
    this.wrenchMarker.visible = state === 'M1_FIND';
    this.boxMarker.visible = state === 'M2_PICKUP';
    this.potMarker.visible = state === 'M3_FETCH';
    if (!silent && state !== 'DONE') this.ui.showToast('Objective updated');
  }

  // Where the compass arrow should point right now.
  getTarget() {
    const gus = this.npcs.get('gus').group.position;
    const sal = this.npcs.get('sal').group.position;
    const dot = this.npcs.get('dot').group.position;
    const marge = this.npcs.get('marge').group.position;
    switch (this.state) {
      case 'M1_TALK': return { pos: gus, label: 'Gus / Shipping' };
      case 'M1_FIND': return { pos: this.wrench.position, label: 'Wrench / West Dock' };
      case 'M1_RETURN': return { pos: gus, label: 'Gus / Shipping' };
      case 'M2_TALK': return { pos: sal, label: 'Sal / Receiving' };
      case 'M2_PICKUP': return { pos: this.partsBox.position, label: 'Parts Box' };
      case 'M2_DELIVER': return { pos: dot, label: 'Dot / Warehouse' };
      case 'M3_TALK': return { pos: marge, label: 'Marge / LM Office' };
      case 'M3_FETCH': return { pos: this.coffeePot.position, label: 'Coffee Pot / Kitchen' };
      case 'M3_RETURN': return { pos: marge, label: 'Marge / Office' };
      default: return null;
    }
  }

  update(time) {
    const pulse = 1 + Math.sin(time * 3) * 0.15;
    for (const m of [this.wrenchMarker, this.boxMarker, this.potMarker]) {
      if (m.visible) {
        m.scale.set(pulse, 1, pulse);
        m.rotation.y = time * 0.8;
      }
    }
    if (this.state === 'M1_FIND') {
      this.wrench.rotation.y = time * 1.2;
      this.wrench.position.y = 1.45 + Math.sin(time * 2) * 0.08;
    }
  }
}

function buildWrench() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xb9c4c9, roughness: 0.3, metalness: 0.9 });
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.7), metal);
  g.add(handle);
  const head1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 8), metal);
  head1.position.set(0, 0, 0.38);
  g.add(head1);
  const head2 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8), metal);
  head2.position.set(0, 0, -0.38);
  g.add(head2);
  return g;
}

function buildPartsBox() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.8, 1),
    new THREE.MeshStandardMaterial({ color: 0x2b6cb0, roughness: 0.6, metalness: 0.15 })
  );
  body.castShadow = true;
  g.add(body);
  const tape = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 0.12, 1.02),
    new THREE.MeshStandardMaterial({ color: 0xe8e6df, roughness: 0.8 })
  );
  tape.position.y = 0.3;
  g.add(tape);
  return g;
}

function buildCoffeePot() {
  const g = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: 0x8fc4d8, roughness: 0.1, metalness: 0.2 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.26, 10), glass);
  g.add(body);
  const coffee = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.16, 0.14, 10),
    new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.4 })
  );
  coffee.position.y = -0.05;
  g.add(coffee);
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.04, 10),
    new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.5 })
  );
  lid.position.y = 0.15;
  g.add(lid);
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.2, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.5 })
  );
  handle.position.set(0.2, 0, 0);
  g.add(handle);
  return g;
}

function buildMarker(color) {
  return new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.08, 6, 24),
    new THREE.MeshBasicMaterial({ color })
  ).rotateX(-Math.PI / 2);
}
