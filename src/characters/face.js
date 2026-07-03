// Face controller (Phase 13 Tier 1 — animation & faces).
//
// Adds the small involuntary motions that make a static face read as alive:
//   * blink cycles — irregular 2–6 s eyelid squash (eye group scale.y)
//   * gaze — pupils/eyes track a world target with lazy easing and occasional
//     quick saccade flicks
//   * talk — mouth-plate flap while dialogue is advancing
//
// Consumes the `rig.face` hooks published by the character builders. Every
// node is optional, so a character that only has pupils (Gerald) or no mouth
// still animates whatever it does expose. Pure CPU, allocation-free per frame.

import * as THREE from 'three';

const _local = new THREE.Vector3();

function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function createFace(faceRig) {
  if (!faceRig) return null;
  return {
    rig: faceRig,
    blinkTimer: rand(1.5, 5),
    blinkT: -1, // >=0 while a blink is playing
    open: 1,
    look: { x: 0, y: 0 }, // current eased gaze (yaw, pitch)
    saccadeTimer: rand(0.6, 2.2),
    saccade: { x: 0, y: 0 },
    talkFlap: 0,
  };
}

// dt in seconds. opts:
//   target   — THREE.Vector3 world point to look at, or null to gaze forward
//   headNode — the head Group (for world->local gaze transform); optional
//   talking  — boolean, drives the mouth flap
export function updateFace(f, dt, opts = {}) {
  if (!f) return;
  const rig = f.rig;

  // ---- Blink scheduler ----
  if (f.blinkT >= 0) {
    f.blinkT += dt;
    const dur = 0.15;
    // Fast close then open: 1 -> ~0.08 -> 1 over `dur`.
    const p = Math.min(1, f.blinkT / dur);
    f.open = 1 - Math.sin(p * Math.PI) * 0.92;
    if (f.blinkT >= dur) {
      f.blinkT = -1;
      f.open = 1;
      f.blinkTimer = rand(2, 6);
    }
  } else {
    f.blinkTimer -= dt;
    if (f.blinkTimer <= 0) f.blinkT = 0;
  }

  // ---- Gaze target in head-local yaw/pitch ----
  let tYaw = 0;
  let tPitch = 0;
  if (opts.target && opts.headNode) {
    const head = opts.headNode;
    // Direction to the target expressed in the head's local frame.
    const dir = head.worldToLocal(_local.copy(opts.target));
    tYaw = Math.atan2(dir.x, dir.z);
    tPitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
    // Clamp so eyes stay in their sockets.
    tYaw = Math.max(-0.5, Math.min(0.5, tYaw));
    tPitch = Math.max(-0.35, Math.min(0.35, tPitch));
  }

  // Occasional saccade: a brief small offset that flicks and decays.
  f.saccadeTimer -= dt;
  if (f.saccadeTimer <= 0) {
    f.saccade.x = rand(-0.12, 0.12);
    f.saccade.y = rand(-0.06, 0.06);
    f.saccadeTimer = rand(0.7, 2.6);
  }
  f.saccade.x *= Math.max(0, 1 - dt * 6);
  f.saccade.y *= Math.max(0, 1 - dt * 6);

  const kLook = Math.min(1, dt * 6);
  f.look.x += (tYaw + f.saccade.x - f.look.x) * kLook;
  f.look.y += (tPitch + f.saccade.y - f.look.y) * kLook;

  // ---- Apply to eyes ----
  const eyes = rig.eyes || [];
  for (const eye of eyes) {
    if (eye.ball) {
      // Blink squashes the eyeball vertically; gaze rotates it.
      eye.ball.scale.y = f.open;
      eye.ball.rotation.y = f.look.x;
      eye.ball.rotation.x = -f.look.y;
    } else if (eye.pupil && eye.pupilBase) {
      // No eyelid rig (fish): slide the pupil within the eye instead.
      eye.pupil.position.x = eye.pupilBase.x + f.look.x * 0.06;
      eye.pupil.position.y = eye.pupilBase.y + f.look.y * 0.05;
    }
  }

  // ---- Talk flap ----
  const talkTarget = opts.talking ? 1 : 0;
  f.talkFlap += (talkTarget - f.talkFlap) * Math.min(1, dt * 12);
  if (rig.mouth) {
    const flap = opts.talking
      ? (0.5 + 0.5 * Math.sin(performance.now() * 0.018)) * f.talkFlap
      : 0;
    // Drive whichever channel the mouth node uses: a jaw group rotates open,
    // a simple plate scales.
    rig.mouth.rotation.x = (rig.mouthRestX || 0) + flap * 0.5;
  }
}
