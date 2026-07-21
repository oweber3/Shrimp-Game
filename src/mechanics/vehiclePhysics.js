import { resolveCollisions, clampToBounds } from '../collision.js';
import { groundHeightAt } from '../map/ramps.js';

// Golf cart drive model, now with a vertical axis for the stunt ramps.
//
// Grounded: the same cheap Euler drive as before (accelerate along the
// facing, steer with speed, exponential friction), with the cart glued to
// groundHeightAt(). Riding a slope gives the cart real vertical velocity;
// when the ballistic arc leaves the ground (a ramp lip, a mound crest, any
// ledge) the cart goes airborne.
//
// Airborne: gravity plus air control — the horizontal velocity is frozen at
// launch, while steering inputs rotate the body for tricks (spin / flip /
// barrel roll). Rotation totals and air time accumulate for the stunt
// scorer.
//
// Landing compares the body orientation against the ground: near-flat is
// clean, moderately off is sketchy (speed penalty), landing on the nose or
// the roof is a crash — the cart spins out, dumps its speed and rights
// itself instead of clipping through the terrain.

const ACCEL = 16; // forward acceleration (units/s^2)
const BRAKE = 22; // deceleration when holding the opposite direction
const MAX_FORWARD = 12; // docs budget: ~12 units/s top speed
const MAX_REVERSE = 5;
const FRICTION = 0.92; // per-60Hz-frame velocity retention
const STEER_RATE = 2.1; // rad/s at full speed
export const VEHICLE_BODY_RADIUS = 1.2; // collision circle, larger than the player's 0.55

const GRAVITY = 20; // gamey: a touch floaty for readable jumps
const MAX_CLIMB = 0.9; // per-step ground rise treated as a wall, not a slope
const LEDGE_DROP = 0.45; // instant ground drop that always launches
const AIR_CONTROL_DELAY = 0.25; // s before trick inputs engage (no accidental flips)
const SPIN_RATE = 3.6; // rad/s yaw spin in the air
const FLIP_RATE = 3.4; // rad/s pitch flips
const ROLL_RATE = 4.0; // rad/s barrel rolls
const CLEAN_TILT = 0.6; // rad residual pitch/roll for a clean landing
const SKETCHY_TILT = 1.25; // beyond this it's a crash
const CRASH_TIME = 1.3; // s of spin-out after a bad landing
const MIN_SCORE_AIR = 0.35; // hops shorter than this never crash or score

// Fresh vertical/trick state, merged into the cart's state object.
export function initVerticalState(state) {
  Object.assign(state, {
    y: 0, vy: 0, airborne: false, crashTimer: 0,
    pitch: 0, roll: 0, // body orientation (pitch > 0 = nose up)
    velX: 0, velZ: 0, // frozen horizontal velocity while airborne
    airTime: 0, spinTotal: 0, flipTotal: 0, rollTotal: 0,
    landing: null // set for one step on touchdown; consumed by the cart
  });
}

// state: { yaw, speed, + vertical state }, pos: Vector3 mutated in place.
// input: { forward, back, left, right, trick } booleans.
export function stepVehicle(state, pos, input, dt, colliders, bounds) {
  if (state.crashTimer > 0) {
    stepCrash(state, pos, dt);
    return;
  }
  if (state.airborne) {
    stepAirborne(state, pos, input, dt, colliders, bounds);
    return;
  }

  if (input.forward) {
    state.speed += (state.speed < 0 ? BRAKE : ACCEL) * dt;
  } else if (input.back) {
    state.speed -= (state.speed > 0 ? BRAKE : ACCEL * 0.7) * dt;
  } else {
    // Frame-independent exponential friction, only while coasting —
    // applying it under throttle would cap the cart at ~3 units/s.
    state.speed *= Math.pow(FRICTION, dt * 60);
    if (Math.abs(state.speed) < 0.05) state.speed = 0;
  }
  state.speed = Math.max(-MAX_REVERSE, Math.min(MAX_FORWARD, state.speed));

  // Steering scales with speed (and flips in reverse, like a real cart).
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  state.yaw += steer * STEER_RATE * dt * (state.speed / MAX_FORWARD);

  const prevX = pos.x;
  const prevZ = pos.z;
  pos.x += Math.sin(state.yaw) * state.speed * dt;
  pos.z += Math.cos(state.yaw) * state.speed * dt;

  // Ramp side walls: a ground rise too steep to be a slope blocks the cart.
  if (groundHeightAt(pos.x, pos.z) - state.y > MAX_CLIMB) {
    pos.x = prevX;
    pos.z = prevZ;
    state.speed *= 0.3;
  }

  // Reuse the campus AABB system with the cart's larger radius;
  // scrub off speed when we scrape something.
  const px = pos.x;
  const pz = pos.z;
  resolveCollisions(pos, VEHICLE_BODY_RADIUS, colliders);
  clampToBounds(pos, bounds, VEHICLE_BODY_RADIUS + 0.2);
  if (Math.hypot(pos.x - px, pos.z - pz) > 0.001) state.speed *= 0.5;

  // Vertical: follow the ground unless momentum carries us off it. The
  // ground-follow rate doubles as launch velocity (riding up a ramp at speed
  // means real upward velocity at the lip).
  const ground = groundHeightAt(pos.x, pos.z);
  const ballistic = state.y + state.vy * dt - 0.5 * GRAVITY * dt * dt;
  const crest = ballistic > ground + 0.04 && state.vy > 1.2 && Math.abs(state.speed) > 2;
  const ledge = state.y - ground > LEDGE_DROP; // drove off a lip at any speed
  if (crest || ledge) {
    state.airborne = true;
    state.velX = Math.sin(state.yaw) * state.speed;
    state.velZ = Math.cos(state.yaw) * state.speed;
    state.vy = Math.max(0, state.vy);
    state.y = Math.max(ballistic, ground);
    state.airTime = 0;
    state.spinTotal = 0;
    state.flipTotal = 0;
    state.rollTotal = 0;
  } else {
    state.vy = (ground - state.y) / dt;
    state.y = ground;
    // Tilt the body to the local slope (nose up climbing a ramp).
    settleToGround(state, pos, dt, 10);
  }
}

function stepAirborne(state, pos, input, dt, colliders, bounds) {
  state.airTime += dt;
  state.vy -= GRAVITY * dt;
  state.y += state.vy * dt;

  pos.x += state.velX * dt;
  pos.z += state.velZ * dt;
  const px = pos.x;
  const pz = pos.z;
  resolveCollisions(pos, VEHICLE_BODY_RADIUS, colliders);
  clampToBounds(pos, bounds, VEHICLE_BODY_RADIUS + 0.2);
  if (Math.hypot(pos.x - px, pos.z - pz) > 0.001) {
    // Glanced off something mid-air: kill most of the horizontal carry.
    state.velX *= 0.3;
    state.velZ *= 0.3;
  }

  // Air control: steer to spin, throttle to flip, trick modifier (Shift /
  // jog) turns the spin axis into a barrel roll. Delayed slightly so the
  // throttle held through a takeoff doesn't instantly front-flip the cart.
  if (state.airTime > AIR_CONTROL_DELAY) {
    const turn = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const flip = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    if (input.trick && turn !== 0) {
      const d = turn * ROLL_RATE * dt;
      state.roll += d;
      state.rollTotal += Math.abs(d);
    } else if (turn !== 0) {
      const d = turn * SPIN_RATE * dt;
      state.yaw += d;
      state.spinTotal += Math.abs(d);
    }
    if (flip !== 0) {
      // forward = frontflip (nose down), back = backflip.
      const d = -flip * FLIP_RATE * dt;
      state.pitch += d;
      state.flipTotal += flip * FLIP_RATE * dt;
    }
  }

  const ground = groundHeightAt(pos.x, pos.z);
  if (state.y > ground) return;

  // ---- Touchdown ----
  state.y = ground;
  state.airborne = false;
  const residPitch = wrapPi(state.pitch);
  const residRoll = wrapPi(state.roll);
  const tilt = Math.max(Math.abs(residPitch), Math.abs(residRoll));
  const scoreable = state.airTime > MIN_SCORE_AIR;
  let quality;
  if (!scoreable || tilt < CLEAN_TILT) quality = 'clean';
  else if (tilt < SKETCHY_TILT) quality = 'sketchy';
  else quality = 'crash';

  // Wheels-down speed: horizontal velocity projected onto the facing, so a
  // sideways landing keeps little forward speed.
  const carried = Math.sin(state.yaw) * state.velX + Math.cos(state.yaw) * state.velZ;
  state.speed = Math.max(-MAX_REVERSE, Math.min(MAX_FORWARD, carried));
  // Fold the full turns out of the orientation; the residual settles to the
  // ground slope over the next few frames.
  state.pitch = residPitch;
  state.roll = residRoll;
  state.vy = 0;

  if (quality === 'crash') {
    state.crashTimer = CRASH_TIME;
    state.speed = 0;
  } else if (quality === 'sketchy') {
    state.speed *= 0.6;
  }

  if (scoreable) {
    state.landing = {
      quality,
      airTime: state.airTime,
      spinDeg: (state.spinTotal * 180) / Math.PI,
      flipDeg: (state.flipTotal * 180) / Math.PI,
      rollDeg: (state.rollTotal * 180) / Math.PI
    };
  }
}

// Spin-out after a bad landing: input is ignored, the cart shudders to a
// stop and rights itself (never left clipped into the terrain).
function stepCrash(state, pos, dt) {
  state.crashTimer -= dt;
  state.speed *= Math.pow(0.85, dt * 60);
  state.y = groundHeightAt(pos.x, pos.z);
  const wobble = state.crashTimer > 0 ? Math.sin(state.crashTimer * 30) * 0.06 : 0;
  state.pitch += (wobble - state.pitch) * Math.min(1, dt * 6);
  state.roll += (wobble - state.roll) * Math.min(1, dt * 6);
  if (state.crashTimer <= 0) {
    state.crashTimer = 0;
    state.pitch = 0;
    state.roll = 0;
  }
}

// Ease body pitch/roll toward the local ground slope (sampled fore/aft and
// side to side around the wheelbase).
function settleToGround(state, pos, dt, rate) {
  const sinY = Math.sin(state.yaw);
  const cosY = Math.cos(state.yaw);
  const hAhead = groundHeightAt(pos.x + sinY * 1.1, pos.z + cosY * 1.1);
  const hBack = groundHeightAt(pos.x - sinY * 1.1, pos.z - cosY * 1.1);
  const hRight = groundHeightAt(pos.x + cosY * 0.8, pos.z - sinY * 0.8);
  const hLeft = groundHeightAt(pos.x - cosY * 0.8, pos.z + sinY * 0.8);
  const targetPitch = Math.atan2(hAhead - hBack, 2.2);
  const targetRoll = Math.atan2(hRight - hLeft, 1.6);
  const t = Math.min(1, dt * rate);
  state.pitch += (targetPitch - state.pitch) * t;
  state.roll += (targetRoll - state.roll) * t;
}

function wrapPi(a) {
  return ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
}
