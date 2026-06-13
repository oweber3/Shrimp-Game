// NPC behavior state machine (Phase 5): idle | patrol | sit | talk | react.
// 'talk' is implicit (idle/patrol NPCs face the player when close);
// 'react' is the Phase 6 punch-flinch hook, driven by reactToHit().

const SPEED = 1.6;
const ACTIVE_RADIUS = 40; // NPCs farther than this from the player are not updated
const TALK_RADIUS = 5;
const SIT_Y = 0.12; // group lift so the seated pose lines up with chair seats

export function initBehavior(npc) {
  npc.state = npc.def.behavior === 'sit' ? 'sit' : npc.def.path ? 'patrol' : 'idle';
  npc.prevState = npc.state;
  npc.reactTime = 0;
  npc.reactDir = null;
  if (npc.state === 'sit') applySeatedPose(npc);
}

// Static limb offsets that read as "seated" without a knee joint:
// legs swing forward under the desk/table, arms rest slightly forward.
function applySeatedPose(npc) {
  const { legL, legR, armL, armR } = npc.parts;
  legL.rotation.x = -1.35;
  legR.rotation.x = -1.35;
  armL.rotation.x = -0.4;
  armR.rotation.x = -0.4;
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

export function updateNPC(npc, dt, time, playerPos) {
  const p = npc.group.position;
  const dist = Math.hypot(playerPos.x - p.x, playerPos.z - p.z);
  if (dist > ACTIVE_RADIUS) return; // distance-culled

  if (npc.state === 'sit') return updateSit(npc, dt, time, playerPos, dist);
  if (npc.state === 'react') return updateReact(npc, dt);

  // Idle bob so everyone feels alive (per-NPC frequency and phase).
  p.y = Math.sin(time * npc.bobFreq + npc.bobPhase) * 0.03;

  // Face the player when they are close enough to chat.
  if (dist < TALK_RADIUS) {
    const target = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
    npc.group.rotation.y = lerpAngle(npc.group.rotation.y, target, dt * 6);
    npc.parts.head.rotation.y = lerpAngle(npc.parts.head.rotation.y, 0, dt * 6);
    relaxLimbs(npc.parts, dt);
    return;
  }

  let walking = false;
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
    // Occasional idle glance: a slow wave that only crests now and then.
    const w = Math.sin(time * 0.35 + npc.bobPhase * 3);
    npc.parts.head.rotation.y = Math.sign(w) * Math.max(0, Math.abs(w) - 0.9) * 5;
  }
}

// Seated: fixed at the chair, gentle breathing, head (not body) tracks the
// player so the pose stays planted in the chair.
function updateSit(npc, dt, time, playerPos, dist) {
  const p = npc.group.position;
  p.y = SIT_Y + Math.sin(time * 1.2 + npc.bobPhase) * 0.012;
  let targetHead = 0;
  if (dist < 4.5) {
    const toPlayer = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
    targetHead = clampAngle(toPlayer - npc.group.rotation.y, 0.85);
  }
  npc.parts.head.rotation.y = lerpAngle(npc.parts.head.rotation.y, targetHead, dt * 5);
}

// Brief backward stumble (~0.5 units over 0.2s), then resume.
function updateReact(npc, dt) {
  npc.reactTime += dt;
  if (npc.reactTime < 0.2) {
    npc.group.position.x += npc.reactDir[0] * 2.5 * dt;
    npc.group.position.z += npc.reactDir[1] * 2.5 * dt;
    npc.group.rotation.z = Math.sin(npc.reactTime * 40) * 0.12; // wobble
  } else {
    npc.group.rotation.z = 0;
    npc.state = npc.prevState;
  }
}

function swingLimbs(parts, phase) {
  const arm = Math.sin(phase) * 0.45;
  const leg = Math.sin(phase) * 0.55;
  parts.armL.rotation.x = arm;
  parts.armR.rotation.x = -arm;
  parts.legL.rotation.x = -leg;
  parts.legR.rotation.x = leg;
}

function relaxLimbs(parts, dt) {
  const k = Math.min(1, dt * 8);
  for (const limb of [parts.armL, parts.armR, parts.legL, parts.legR]) {
    limb.rotation.x += (0 - limb.rotation.x) * k;
  }
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
