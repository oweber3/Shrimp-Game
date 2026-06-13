import { resolveCollisions, clampToBounds } from '../collision.js';

// Simple Euler drive model for the golf cart: accelerate along the cart's
// local forward axis, steer proportional to speed, exponential friction.
// No physics engine — this is < 0.1 ms per frame.

const ACCEL = 16; // forward acceleration (units/s^2)
const BRAKE = 22; // deceleration when holding the opposite direction
const MAX_FORWARD = 12; // docs budget: ~12 units/s top speed
const MAX_REVERSE = 5;
const FRICTION = 0.92; // per-60Hz-frame velocity retention
const STEER_RATE = 2.1; // rad/s at full speed
const BODY_RADIUS = 1.2; // collision circle, larger than the player's 0.55

// state: { yaw, speed }, pos: Vector3 mutated in place.
// input: { forward, back, left, right } booleans.
export function stepVehicle(state, pos, input, dt, colliders, bounds) {
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

  pos.x += Math.sin(state.yaw) * state.speed * dt;
  pos.z += Math.cos(state.yaw) * state.speed * dt;

  // Reuse the campus AABB system with the cart's larger radius;
  // scrub off speed when we scrape something.
  const px = pos.x;
  const pz = pos.z;
  resolveCollisions(pos, BODY_RADIUS, colliders);
  clampToBounds(pos, bounds, BODY_RADIUS + 0.2);
  if (Math.hypot(pos.x - px, pos.z - pz) > 0.001) state.speed *= 0.5;
}
