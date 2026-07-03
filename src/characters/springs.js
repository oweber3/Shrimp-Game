// Critically-damped spring utility (Phase 13 Tier 1 — secondary motion).
//
// A scalar spring that eases toward a moving target and, when disturbed,
// overshoots and settles instead of snapping. Used for the trailing sway of
// antennae, the tail, and vest flaps so limbs feel like they carry momentum
// when a character starts, stops or turns. Pure CPU, allocation-free per frame.
//
//   const s = new Spring({ freq: 9, damp: 0.6 });
//   s.update(dt, target);   // -> new eased value, also on s.value
//
// `freq` is roughly the natural frequency in Hz (higher = snappier), `damp`
// is the damping ratio (1 = critical / no overshoot, < 1 = springy bounce).

const MAX_DT = 1 / 30; // clamp so a long frame can never blow the integrator up

export class Spring {
  constructor({ freq = 8, damp = 1, value = 0 } = {}) {
    // `w` is the stiffness handle (higher = snappier); the tuning is kept
    // gentle so springs read as soft trailing motion, not vibration.
    this.w = freq;
    this.zeta = damp;
    this.value = value;
    this.vel = 0;
    this.target = value;
  }

  // Hard-set the value with no velocity (e.g. when snapping a pose on spawn).
  set(v) {
    this.value = v;
    this.vel = 0;
    this.target = v;
  }

  // Semi-implicit Euler step of a damped spring toward `target`. Returns the
  // updated value. Sub-steps internally if dt is large so stiff springs stay
  // stable on slow frames.
  update(dt, target = this.target) {
    this.target = target;
    let remaining = Math.max(0, dt);
    const k = this.w * this.w; // stiffness
    const c = 2 * this.zeta * this.w; // damping
    while (remaining > 1e-6) {
      const step = Math.min(remaining, MAX_DT);
      const accel = -k * (this.value - target) - c * this.vel;
      this.vel += accel * step;
      this.value += this.vel * step;
      remaining -= step;
    }
    if (!Number.isFinite(this.value)) this.set(target); // NaN guard
    return this.value;
  }
}
