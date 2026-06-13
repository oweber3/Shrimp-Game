import * as THREE from 'three';
import { createShrimpWorker } from './shrimpWorker.js';
import { lerpAngle } from './npcBehaviors.js';

// ============================================================================
// Shrimply Gigantic — a single oversized, angry, roaming "inspector" shrimp.
//
// Builder:  createShrimplyGigantic()  (this file)
// Behavior: initGiant() / updateGiant() (this file)
// Wiring:   src/npc.js builds him after the normal crowd and routes his
//           per-frame update here; his dialogue rides the existing missions
//           flavor loop via FLAVOR.shrimply in src/dialogue/dialogueData.js.
//
// Design goals (kept deliberately small and reviewable):
//   * Reuse the standard worker rig so the limb/animation wiring is identical
//     and the patrol animation "just works" — we only bolt on extra detail.
//   * Stand out: ~3.2x scale, darker/redder shell, hi-vis vest, angry face.
//   * Roam safely on open pavement only, with idle pauses and a stomping gait.
//   * Stay purely cosmetic in his anger: no chasing, no damage, no mission
//     logic — he just patrols and grumbles when you walk up to him.
// ============================================================================

// ~3.2x a normal worker. Tuned to read as "noticeably larger than everyone
// else" while still clearing the truck-court lane and the buildings around it.
const SCALE = 3.2;

function mat(color, roughness = 0.5) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.08 });
}

// ---- Patrol definition --------------------------------------------------
// Rectangular loop confined to the open east truck-court lane. Every segment
// (and the body sweep around it) is clear of the receiving dock, the parked
// truck, the forklift, the pallet/crate clutter, and the Laitram office wall,
// so he never clips a building. To move/resize/re-route him, edit START and
// PATH below (and SCALE above for his size).
export const SHRIMPLY = {
  id: 'shrimply',
  name: 'Shrimply Gigantic',
  title: 'Angry Giant Shrimp Inspector', // optional subtitle for future use
  start: [104, -10],
  rotY: Math.PI,
  path: [
    [101, -22],
    [107, -22],
    [107, 2],
    [101, 2]
  ]
};

export function createShrimplyGigantic() {
  // Base rig: reuse the worker builder so userData.parts (torso/head/armL/
  // armR/legL/legR/tail/carryAnchor) and its animation contract are identical.
  // Angry-red shell + oversized hi-vis orange vest make him pop in the crowd.
  const root = createShrimpWorker({
    shellColor: 0x9c2b1e, // deep, angry red shell
    vestColor: 0xff6a1a,  // oversized hi-vis orange safety vest
    hatColor: 0xffd21a,   // bright safety hard hat (still a worker)
    bootColor: 0x2a2a2a,
    accessory: 'toolbelt' // wrench-on-belt fits the "WHO MOVED MY WRENCH?" gag
  });
  const { torso, head, armL, armR } = root.userData.parts;

  const shellDark = mat(0x5e160e, 0.55); // near-black-red accents for menace
  const add = (parent, mesh) => { mesh.castShadow = true; parent.add(mesh); return mesh; };

  // --- Aggressive hunched posture -------------------------------------
  // Lean the upper body forward. Legs are root children (not under torso),
  // so they stay vertical and he reads as a hulking, hunched brawler.
  torso.rotation.x = 0.16;

  // --- Angry furrowed brow plates -------------------------------------
  // Angled wedges sitting just above/in front of each eye, tilted inward so
  // they form a permanent scowl and narrow the eyes peeking out beneath.
  for (const side of [-1, 1]) {
    const brow = add(head, new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.11), shellDark));
    brow.position.set(side * 0.15, 0.13, 0.25);
    brow.rotation.z = side * 0.55; // inner end dips toward the nose = furrow
    brow.rotation.x = -0.2;
  }

  // --- Carapace ridge spikes ------------------------------------------
  // A short row of back spikes for a meaner silhouette.
  for (const [y, z, r] of [[1.0, -0.22, 0.1], [1.22, -0.21, 0.11], [1.42, -0.26, 0.09]]) {
    const spike = add(torso, new THREE.Mesh(new THREE.ConeGeometry(r, 0.22, 6), shellDark));
    spike.position.set(0, y, z);
    spike.rotation.x = -0.6;
  }

  // --- Oversized menacing claws ---------------------------------------
  // Bolted onto each arm group so they swing with the walk cycle and flex
  // during the angry idle. A thick knuckle plus two big pincer cones.
  for (const side of [-1, 1]) {
    const arm = side < 0 ? armL : armR;
    const knuckle = add(arm, new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), shellDark));
    knuckle.position.set(side * 0.24, -0.62, 0.34);
    const bigClaw = add(arm, new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.44, 7), shellDark));
    bigClaw.position.set(side * 0.22, -0.76, 0.5);
    bigClaw.rotation.x = 1.5;
    const lowClaw = add(arm, new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 7), shellDark));
    lowClaw.position.set(side * 0.31, -0.66, 0.46);
    lowClaw.rotation.x = 1.2;
    lowClaw.rotation.z = side * 0.35;
  }

  // Scale the whole rig up about its origin. Feet sit at local y=0, so he
  // still stands on the ground when the group's position.y is 0.
  root.scale.setScalar(SCALE);
  return root;
}

// ---- Behavior -----------------------------------------------------------

const GIANT_SPEED = 1.05;      // slow, lumbering patrol (units/sec)
const GIANT_TURN = 4;          // how fast he swivels toward his heading
const GIANT_ACTIVE = 150;      // tall & visible: animate him from far away
const GIANT_TALK = 7.5;        // generous "face the player" range for his bulk
const WAYPOINT_EPS = 1.4;      // arrival distance (he is large)
const WAIT_MIN = 1.5;          // idle pause range at each waypoint (sec)
const WAIT_MAX = 3.5;

export function initGiant(npc) {
  // Own little state machine, separate from npc.state so nothing in the
  // normal NPC pipeline can perturb his patrol.
  npc.gstate = 'walk'; // 'walk' | 'wait'
  npc.pathIndex = 0;
  npc.waitTimer = 0;
}

export function updateGiant(npc, dt, time, playerPos) {
  const p = npc.group.position;
  const dist = Math.hypot(playerPos.x - p.x, playerPos.z - p.z);
  if (dist > GIANT_ACTIVE) return;

  // Heavy stomping bob: lifts on each footfall while walking (kept >= 0 so
  // the feet never sink), a slow heave while standing.
  p.y = npc.gstate === 'walk'
    ? Math.abs(Math.sin(time * 4 + npc.bobPhase)) * 0.12
    : Math.sin(time * 1.3 + npc.bobPhase) * 0.04;

  // Player is close: turn to face them and keep grumbling (angry idle).
  if (dist < GIANT_TALK) {
    const target = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
    npc.group.rotation.y = lerpAngle(npc.group.rotation.y, target, dt * 5);
    npc.group.rotation.z = 0;
    angryIdle(npc, time, dt);
    return;
  }

  const path = npc.def.path;

  // Idle pause at a waypoint: flex claws and sweep his head around angrily.
  if (npc.gstate === 'wait') {
    npc.group.rotation.y = lerpAngle(npc.group.rotation.y, npc.group.rotation.y, 1);
    npc.group.rotation.z = 0;
    angryIdle(npc, time, dt);
    npc.waitTimer -= dt;
    if (npc.waitTimer <= 0) npc.gstate = 'walk';
    return;
  }

  // Walking toward the current waypoint.
  const wp = path[npc.pathIndex];
  const dx = wp[0] - p.x;
  const dz = wp[1] - p.z;
  const d = Math.hypot(dx, dz);
  if (d < WAYPOINT_EPS) {
    // Arrived: advance to the next waypoint and take an idle pause.
    npc.pathIndex = (npc.pathIndex + 1) % path.length;
    npc.gstate = 'wait';
    npc.waitTimer = WAIT_MIN + Math.random() * (WAIT_MAX - WAIT_MIN);
    return;
  }
  p.x += (dx / d) * GIANT_SPEED * dt;
  p.z += (dz / d) * GIANT_SPEED * dt;
  const target = Math.atan2(dx, dz);
  npc.group.rotation.y = lerpAngle(npc.group.rotation.y, target, dt * GIANT_TURN);
  // Heavy waddle + big alternating limb swing = stomping gait.
  npc.group.rotation.z = Math.sin(time * 4 + npc.bobPhase) * 0.07;
  stompSwing(npc.parts, time * 4 + npc.bobPhase);
}

// Angry idle: claws flex menacingly, head sweeps as if hunting for whoever
// moved his wrench, legs relax back to neutral.
function angryIdle(npc, time, dt) {
  const { armL, armR, head, legL, legR } = npc.parts;
  const flex = (Math.sin(time * 2.2 + npc.bobPhase) * 0.5 + 0.5) * 0.5;
  armL.rotation.x = -0.3 - flex;
  armR.rotation.x = -0.3 - flex;
  head.rotation.y = Math.sin(time * 0.8 + npc.bobPhase) * 0.5;
  const k = Math.min(1, dt * 6);
  legL.rotation.x += (0 - legL.rotation.x) * k;
  legR.rotation.x += (0 - legR.rotation.x) * k;
}

// Heavier version of the worker walk swing, biased forward for an aggressive,
// hunched stomp.
function stompSwing(parts, phase) {
  const arm = Math.sin(phase) * 0.5;
  const leg = Math.sin(phase) * 0.7;
  parts.armL.rotation.x = arm - 0.2;
  parts.armR.rotation.x = -arm - 0.2;
  parts.legL.rotation.x = -leg;
  parts.legR.rotation.x = leg;
  parts.head.rotation.y *= 0.9; // settle his gaze forward while marching
}
