// NPC behavior state machine (Phase 5): idle | patrol | sit | talk | react.
// 'talk' is implicit (idle/patrol NPCs face the player when close);
// 'react' is the Phase 6 punch-flinch hook, driven by reactToHit().
//
// Phase 13: locomotion, idle breathing and secondary motion are delegated to
// the shared gait engine (animation.js); blink/gaze/mouth to the face system
// (face.js). This module only decides *intent* — walk here, face the player,
// talk — and feeds it to those systems.

import * as THREE from 'three';
import { createGait, updateGait } from './animation.js';
import { createFace, updateFace } from './face.js';

const SPEED = 1.6;
const ACTIVE_RADIUS = 40; // NPCs farther than this from the player are not updated
const TALK_RADIUS = 5;
const GAZE_RADIUS = 9; // eyes start tracking the player within this range
const SIT_Y = 0.12; // group lift so the seated pose lines up with chair seats

const _gaze = new THREE.Vector3();

export function initBehavior(npc) {
  npc.state = npc.def.behavior === 'sit' ? 'sit' : npc.def.path ? 'patrol' : 'idle';
  npc.prevState = npc.state;
  npc.reactTime = 0;
  npc.reactDir = null;
  // Per-NPC gait + face controllers (seeded phases already vary via createGait).
  npc.gait = createGait(npc.group.userData.rig);
  npc.face = createFace(npc.group.userData.rig && npc.group.userData.rig.face);
  if (npc.state === 'sit') applySeatedPose(npc);
}

// World point the NPC's eyes track: the player's head height. Reused buffer.
function gazeTarget(playerPos) {
  return _gaze.set(playerPos.x, 1.6, playerPos.z);
}

// Run blink/gaze/mouth for an NPC. `talking` flaps the mouth; within
// GAZE_RADIUS the eyes follow the player, otherwise they drift forward.
function updateNpcFace(npc, dt, playerPos, dist, talking) {
  if (!npc.face) return;
  const target = dist < GAZE_RADIUS ? gazeTarget(playerPos) : null;
  updateFace(npc.face, dt, { target, headNode: npc.parts.head, talking });
}

// Static limb offsets that read as "seated": thighs swing forward under the
// desk/table (knees stay straight), arms rest slightly forward. Held every
// frame in updateSit so the gait's neutral-leg easing can't unfold the pose.
function applySeatedLegs(npc) {
  const { legL, legR, armL, armR } = npc.parts;
  legL.rotation.x = -1.35;
  legR.rotation.x = -1.35;
  armL.rotation.x = -0.4;
  armR.rotation.x = -0.4;
}

function applySeatedPose(npc) {
  applySeatedLegs(npc);
  npc.group.position.y = SIT_Y;
}

// Phase 6 hook: brief backward stumble away from (dirX, dirZ), then return
// to whatever the NPC was doing. Seated NPCs just flinch in place.
export function reactToHit(npc, dirX, dirZ) {
  if (npc.state === 'react' || npc.state === 'sit') return;
  npc.prevState = npc.state;
  npc.state = 'react';
  npc.reactTime = 0;
  npc.reactDir = [dirX, dirZ];
}

export function updateNPC(npc, dt, time, playerPos, dialogueOpen = false) {
  const p = npc.group.position;
  const dist = Math.hypot(playerPos.x - p.x, playerPos.z - p.z);
  if (dist > ACTIVE_RADIUS) return; // distance-culled

  if (npc.state === 'sit') return updateSit(npc, dt, time, playerPos, dist, dialogueOpen);
  if (npc.state === 'react') return updateReact(npc, dt, playerPos, dist, dialogueOpen);

  const talking = dialogueOpen && dist < TALK_RADIUS;
  p.y = 0; // feet stay grounded; the gait bobs the torso instead

  // Face the player when they are close enough to chat.
  if (dist < TALK_RADIUS) {
    const target = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
    npc.group.rotation.y = lerpAngle(npc.group.rotation.y, target, dt * 6);
    npc.parts.head.rotation.y = lerpAngle(npc.parts.head.rotation.y, 0, dt * 6);
    npc.group.rotation.z = 0;
    updateGait(npc.group.userData.rig, npc.gait, dt, { speed: 0, moving: false });
    updateNpcFace(npc, dt, playerPos, dist, talking);
    return;
  }

  let walking = false;
  let turnRate = 0;
  if (npc.state === 'patrol' && npc.def.path) {
    const wp = npc.def.path[npc.pathIndex];
    const dx = wp[0] - p.x;
    const dz = wp[1] - p.z;
    const wpDist = Math.hypot(dx, dz);
    if (wpDist < 0.5) {
      npc.pathIndex = (npc.pathIndex + 1) % npc.def.path.length;
    } else {
      walking = true;
      p.x += (dx / wpDist) * SPEED * dt;
      p.z += (dz / wpDist) * SPEED * dt;
      const target = Math.atan2(dx, dz);
      const prev = npc.group.rotation.y;
      npc.group.rotation.y = lerpAngle(prev, target, dt * 8);
      turnRate = dt > 0 ? clampAngle(npc.group.rotation.y - prev, Math.PI) / dt : 0;
    }
  }
  npc.group.rotation.z = 0;
  if (!walking) {
    npc.group.rotation.y = lerpAngle(npc.group.rotation.y, npc.baseRotY, dt * 2);
    // Occasional idle glance: a slow wave that only crests now and then.
    const w = Math.sin(time * 0.35 + npc.bobPhase * 3);
    npc.parts.head.rotation.y = Math.sign(w) * Math.max(0, Math.abs(w) - 0.9) * 5;
  } else {
    npc.parts.head.rotation.y = lerpAngle(npc.parts.head.rotation.y, 0, dt * 4);
  }
  updateGait(npc.group.userData.rig, npc.gait, dt, {
    speed: walking ? SPEED : 0, moving: walking, jogging: false, turnRate
  });
  updateNpcFace(npc, dt, playerPos, dist, talking);
}

// Seated: fixed at the chair, gentle breathing (via the gait's idle path),
// head (not body) tracks the player so the pose stays planted in the chair.
function updateSit(npc, dt, time, playerPos, dist, dialogueOpen) {
  const p = npc.group.position;
  p.y = SIT_Y;
  let targetHead = 0;
  if (dist < 4.5) {
    const toPlayer = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
    targetHead = clampAngle(toPlayer - npc.group.rotation.y, 0.85);
  }
  npc.parts.head.rotation.y = lerpAngle(npc.parts.head.rotation.y, targetHead, dt * 5);
  // Idle-only gait: no stepping (legs are held in the seated pose), but the
  // torso breathes and antennae/tail settle. Feed speed 0 / not moving.
  updateGait(npc.group.userData.rig, npc.gait, dt, { speed: 0, moving: false });
  // The seated pose must win over the gait's neutral-leg easing.
  applySeatedLegs(npc);
  updateNpcFace(npc, dt, playerPos, dist, dialogueOpen && dist < TALK_RADIUS);
}

// Brief backward stumble (~0.5 units over 0.2s), then resume. The face keeps
// blinking through the flinch; the gait holds an idle pose.
function updateReact(npc, dt, playerPos, dist, dialogueOpen) {
  npc.reactTime += dt;
  if (npc.reactTime < 0.2) {
    npc.group.position.x += npc.reactDir[0] * 2.5 * dt;
    npc.group.position.z += npc.reactDir[1] * 2.5 * dt;
    npc.group.rotation.z = Math.sin(npc.reactTime * 40) * 0.12; // wobble
  } else {
    npc.group.rotation.z = 0;
    npc.state = npc.prevState;
  }
  updateGait(npc.group.userData.rig, npc.gait, dt, { speed: 0, moving: false });
  updateNpcFace(npc, dt, playerPos, dist, dialogueOpen && dist < TALK_RADIUS);
}

export function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, t);
}

function clampAngle(a, limit) {
  let d = a % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.max(-limit, Math.min(limit, d));
}
