// Procedural gait engine (Phase 13 Tier 1 — animation & faces).
//
// Drives believable locomotion on the existing rigid-part rig without any
// skinning: planted-foot stepping via an analytic two-bone knee solve, a
// weight-shifting hip sway, cadence matched to ground speed (so stance feet
// stop sliding), a walk<->jog transition, subtle vertical bob and breathing,
// and spring-driven secondary motion on antennae and tail.
//
// The engine reads the `userData.rig` hooks published by the character
// builders (see shrimpWorker.js / fishPerson.js) and never touches the
// stable `userData.parts` contract that missions/combat depend on. All CPU,
// ~0 bytes, safe to skip on distance-culled characters.
//
//   const gait = createGait(root.userData.rig);
//   updateGait(rig, gait, dt, { speed, moving, jogging, turnRate });

import { Spring } from './springs.js';

const DEFAULTS = {
  // Bone lengths (hip->knee, knee->foot) in the character's LOCAL space; the
  // builder overrides these. Foot planting is solved in this same local frame,
  // so a scaled character (e.g. Shrimply Gigantic) needs no special handling.
  L1: 0.34,
  L2: 0.36,
  // Distance the body travels per full two-step cycle, chosen to give a
  // believable cadence at each character's ground speed. At slow (NPC) speeds
  // the stance foot travel matches body travel closely, so feet barely slide;
  // at the game's fast arcade player speed some glide is unavoidable for a
  // 0.7-unit leg, so the knee bend + foot lift carry the "walk" read instead.
  walkStride: 0.9,
  jogStride: 1.2,
  stepHeight: 0.14, // peak foot lift during swing
  duty: 0.62, // fraction of the cycle a foot spends planted (>0.5 = overlap)
  footReach: 0.26, // max forward/back foot offset before the leg would over-extend
  armSwing: 0.5, // shoulder swing amplitude (rad) at full jog
  hipSway: 0.05, // torso roll toward the stance leg (rad)
  bob: 0.045, // vertical torso bob amplitude (world units, pre-scale)
  lean: 0.12, // forward torso lean added at full jog (rad)
  breathe: 0.02, // idle breathing rise (units)
  kneeLimit: 2.2, // clamp knee bend so it can never hyperextend / fold through
};

// Analytic two-bone IK in the sagittal plane. Given a foot target expressed as
// (forward offset `u` = +z, vertical offset `v` = +y, with the hip at origin)
// and the two bone lengths, return the hip and knee bend angles as three.js
// rotation.x values for a leg whose rest pose points straight down.
function solveLeg(u, v, L1, L2) {
  let len = Math.hypot(u, v) || 1e-4;
  const maxLen = L1 + L2 - 1e-3;
  const minLen = Math.abs(L1 - L2) + 1e-3;
  const clamped = Math.max(minLen, Math.min(maxLen, len));
  const s = clamped / len; // rescale target onto the reachable circle
  const su = u * s;
  const sv = v * s;
  const d = clamped;
  // Thigh angle from straight-down toward +u (forward).
  const base = Math.atan2(su, -sv);
  const cosA = (d * d + L1 * L1 - L2 * L2) / (2 * d * L1);
  const alpha = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const theta1 = base - alpha; // absolute thigh angle
  // Knee (elbow) world position, then the shin's absolute angle.
  const kneeU = L1 * Math.sin(theta1);
  const kneeV = -L1 * Math.cos(theta1);
  const theta2 = Math.atan2(su - kneeU, -(sv - kneeV)); // absolute shin angle
  // Map to rotation.x: the rig's rest bone points to -y, and a positive
  // rotation.x sends the foot to -z, so forward angles are negated. The knee
  // group is a child of the hip, so its rotation is relative (shin - thigh).
  return {
    hip: -theta1,
    knee: -(theta2 - theta1),
  };
}

// One foot's local target over its gait phase (0..2π). During stance the foot
// slides linearly from front to back (matching body advance for no slip) and
// stays on the ground; during swing it lifts in an arc and returns to the
// front.
function footTarget(phase, cfg, amp) {
  const twoPi = Math.PI * 2;
  const p = ((phase % twoPi) + twoPi) % twoPi;
  const stanceEnd = twoPi * cfg.duty;
  if (p < stanceEnd) {
    const f = p / stanceEnd; // 0 front -> 1 back
    return { z: amp * (1 - 2 * f), y: 0 };
  }
  const f = (p - stanceEnd) / (twoPi - stanceEnd); // 0 back -> 1 front
  return { z: amp * (-1 + 2 * f), y: cfg.stepHeight * Math.sin(Math.PI * f) };
}

export function createGait(rig, overrides = {}) {
  const cfg = { ...DEFAULTS, ...(rig && rig.gaitCfg), ...overrides };
  const antennae = (rig && rig.antennae) || [];
  return {
    cfg,
    phase: Math.random() * Math.PI * 2,
    breathePhase: Math.random() * Math.PI * 2,
    speedS: 0, // smoothed speed for blend in/out
    jogBlend: 0, // 0 walk .. 1 jog
    // Secondary-motion springs. One per antenna (pitch + yaw share one for
    // cheapness), one for the tail, one for the weight-shift sway.
    antennaSpring: antennae.map(() => new Spring({ freq: 9, damp: 0.55 })),
    tailSpring: new Spring({ freq: 7, damp: 0.6 }),
    swaySpring: new Spring({ freq: 8, damp: 0.9 }),
    // Rest transforms captured so we add deltas instead of clobbering a
    // character's authored base pose (giant hunch, etc.).
    baseTorsoX: rig && rig.torso ? rig.torso.rotation.x : 0,
    baseTorsoZ: rig && rig.torso ? rig.torso.rotation.z : 0,
    _lastCyc: 0, // last footfall half-cycle index (for the step hook)
    stepCb: null, // fired on each footfall (audio hook)
  };
}

// Advance the gait by dt. `opts.speed` is ground speed in units/s, `moving`
// whether the character is translating, `jogging` selects the faster gait,
// `turnRate` (rad/s) feeds antenna/tail lag. Writes only rig hooks.
export function updateGait(rig, g, dt, opts = {}) {
  if (!rig) return;
  const cfg = g.cfg;
  const speed = Math.max(0, opts.speed || 0);
  const moving = !!opts.moving && speed > 1e-3;
  const jogging = !!opts.jogging;
  const turnRate = opts.turnRate || 0;

  // Ease jog blend and a smoothed speed for stable amplitudes.
  const kBlend = Math.min(1, dt * 8);
  g.jogBlend += ((jogging ? 1 : 0) - g.jogBlend) * kBlend;
  g.speedS += (speed - g.speedS) * Math.min(1, dt * 10);

  const stride = cfg.walkStride + (cfg.jogStride - cfg.walkStride) * g.jogBlend;
  // Foot amplitude, capped so the leg never has to over-extend to reach ground.
  const amp = Math.min(cfg.footReach, stride * cfg.duty * 0.5);

  if (moving) {
    // Advance phase by DISTANCE, not time: one full 2π per `stride` travelled.
    // The stance foot then tracks the ground exactly and does not slide.
    g.phase += (speed * dt) / stride * (Math.PI * 2);
  }

  const twoPi = Math.PI * 2;
  const walkAmt = moving ? 1 : 0;

  // ---- Legs: plant both feet via IK (blended out to neutral when idle) ----
  const legAmp = amp;
  for (const side of [-1, 1]) {
    const hip = rig.hip && rig.hip[side];
    const knee = rig.knee && rig.knee[side];
    if (!hip) continue;
    // Left/right feet are half a cycle apart.
    const legPhase = g.phase + (side < 0 ? 0 : Math.PI);
    let hipTarget = 0;
    let kneeTarget = 0;
    if (moving) {
      const ft = footTarget(legPhase, cfg, legAmp);
      // Foot target relative to the hip: forward = ft.z, vertical = ground.
      // The rest reach is L1+L2; keep a little bend margin so IK never clamps
      // to a locked straight leg (which would read as stiff).
      const v = -(cfg.L1 + cfg.L2 - 0.03) + ft.y;
      const sol = solveLeg(ft.z, v, cfg.L1, cfg.L2);
      hipTarget = sol.hip;
      kneeTarget = Math.max(-cfg.kneeLimit, Math.min(0.1, sol.knee));
    }
    // Ease toward the solved pose (also glides legs back to neutral on stop).
    const k = Math.min(1, dt * (moving ? 18 : 9));
    hip.rotation.x += (hipTarget - hip.rotation.x) * k;
    if (knee) knee.rotation.x += (kneeTarget - knee.rotation.x) * k;
  }

  // Footfall hook: fire when either foot crosses from swing into stance.
  if (moving && g.stepCb) {
    const cyc = Math.floor(g.phase / Math.PI);
    if (cyc !== g._lastCyc) {
      g._lastCyc = cyc;
      g.stepCb();
    }
  }

  // ---- Arms: contralateral swing, scaled by gait speed ----
  const armAmt = cfg.armSwing * (0.6 + 0.4 * g.jogBlend) * walkAmt;
  const armPhase = Math.sin(g.phase);
  if (rig.arm) {
    const kArm = Math.min(1, dt * 12);
    const al = rig.arm[-1];
    const ar = rig.arm[1];
    if (al) al.rotation.x += (-armPhase * armAmt - al.rotation.x) * kArm;
    if (ar) ar.rotation.x += (armPhase * armAmt - ar.rotation.x) * kArm;
  }

  // ---- Torso: hip sway + vertical bob + jog lean + idle breathing ----
  if (rig.torso) {
    const t = rig.torso;
    // Weight shifts onto the planted leg → roll toward it. Spring adds a small
    // trailing lag so the sway feels weighted.
    const swayTarget = Math.sin(g.phase) * cfg.hipSway * walkAmt;
    const sway = g.swaySpring.update(dt, swayTarget);
    // Double-frequency bob dips on each footfall (kept downward-biased so the
    // body never floats above the planted feet).
    const bob = -Math.abs(Math.sin(g.phase)) * cfg.bob * walkAmt;
    // Idle breathing when not walking.
    g.breathePhase += dt * 1.6;
    const breathe = (1 - walkAmt) * Math.sin(g.breathePhase) * cfg.breathe;
    const lean = cfg.lean * g.jogBlend * walkAmt;
    const kT = Math.min(1, dt * 10);
    t.rotation.z += (g.baseTorsoZ + sway - t.rotation.z) * kT;
    t.rotation.x += (g.baseTorsoX + lean - t.rotation.x) * kT;
    t.position.y += (bob + breathe - t.position.y) * kT;
  }

  // ---- Secondary motion: antennae + tail trail the body ----
  // Target is driven by forward acceleration proxy (speed) and turn rate, plus
  // a gentle per-step jiggle, so they sweep back when moving and overshoot on
  // stops and turns.
  const accelProxy = Math.max(-1, Math.min(1, (speed - g.speedS) * 4));
  const jiggle = Math.sin(g.phase) * 0.08 * walkAmt;
  const antTarget = -0.12 * Math.min(1, speed / 4) - accelProxy * 0.25 + jiggle;
  const antYaw = -turnRate * 0.12;
  if (rig.antennae) {
    for (let i = 0; i < rig.antennae.length; i++) {
      const ant = rig.antennae[i];
      const spr = g.antennaSpring[i];
      if (!ant || !spr) continue;
      const v = spr.update(dt, antTarget);
      ant.rotation.x = v;
      ant.rotation.z = (ant.userData.side || 0) * 0.0 + antYaw;
    }
  }
  if (rig.tail) {
    const tailTarget = 0.05 * Math.min(1, speed / 4) + accelProxy * 0.12 + Math.sin(g.phase) * 0.04 * walkAmt;
    const v = g.tailSpring.update(dt, tailTarget);
    rig.tail.rotation.x = (rig.baseTailX || 0) + v;
  }
}
