// Temporary, concert-scoped flight physics. Player owns one of these and
// keeps all camera-relative input in its normal movement path; this module
// only supplies smoothed airborne velocity, performer clearance, and a safe
// landing when the show goes away.

export const CONCERT_FLIGHT_MAX_HEIGHT = 52;

const ASCEND_SPEED = 12;
const DESCEND_SPEED = 14;
const PLANAR_RESPONSE = 6;
const PLANAR_BRAKE_RESPONSE = 9;
const VERTICAL_RESPONSE = 7;
const VERTICAL_BRAKE_RESPONSE = 10;

export class ConcertFlight {
  constructor() {
    this.available = false;
    this.active = false;
    this.maxHeight = CONCERT_FLIGHT_MAX_HEIGHT;
    this.velocity = { x: 0, y: 0, z: 0 };
    this.lastGroundHeight = 0;
    this.activationCount = 0;
  }

  setContext(concertActive, mounted, position, colliders, bounds, radius) {
    const available = Boolean(concertActive);
    const shouldFly = available && !mounted;
    this.available = available;

    if (shouldFly && !this.active) {
      this.active = true;
      this.resetMotion();
      this.activationCount += 1;
      return true;
    }
    if (!shouldFly && this.active) {
      this.active = false;
      this.resetMotion();
      safeLand(position, colliders, bounds, radius);
      return true;
    }
    if (!available) this.resetMotion();
    return false;
  }

  resetMotion() {
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.velocity.z = 0;
  }

  updatePlanar(dt, targetX, targetZ) {
    const braking = Math.hypot(targetX, targetZ) < 1e-4;
    const response = braking ? PLANAR_BRAKE_RESPONSE : PLANAR_RESPONSE;
    const blend = 1 - Math.exp(-response * Math.max(0, dt));
    this.velocity.x += (targetX - this.velocity.x) * blend;
    this.velocity.z += (targetZ - this.velocity.z) * blend;
    return this.velocity;
  }

  updateVertical(dt, position, groundHeight, axis) {
    this.lastGroundHeight = groundHeight;
    const input = Math.max(-1, Math.min(1, axis || 0));
    const target = input > 0
      ? input * ASCEND_SPEED
      : input < 0 ? input * DESCEND_SPEED : 0;
    const response = input === 0 ? VERTICAL_BRAKE_RESPONSE : VERTICAL_RESPONSE;
    const blend = 1 - Math.exp(-response * Math.max(0, dt));
    this.velocity.y += (target - this.velocity.y) * blend;
    position.y += this.velocity.y * dt;

    const ceiling = groundHeight + this.maxHeight;
    if (position.y >= ceiling) {
      position.y = ceiling;
      if (this.velocity.y > 0) this.velocity.y = 0;
    }
    if (position.y <= groundHeight) {
      position.y = groundHeight;
      if (this.velocity.y < 0) this.velocity.y = 0;
    }
  }

  debugState(position = null) {
    return {
      available: this.available,
      active: this.active,
      maxHeight: this.maxHeight,
      altitude: position ? position.y - this.lastGroundHeight : null,
      verticalVelocity: this.velocity.y,
      planarVelocity: { x: this.velocity.x, z: this.velocity.z },
      activationCount: this.activationCount,
    };
  }
}

// Giant performers remain solid flight landmarks even though ordinary world
// XZ collision is deliberately skipped in the air. Zones are circles in XZ.
export function resolveFlightExclusions(position, zones, radius) {
  if (!Array.isArray(zones)) return position;
  for (const zone of zones) {
    const minDistance = Math.max(0, zone.radius || 0) + radius;
    const dx = position.x - zone.x;
    const dz = position.z - zone.z;
    const distance = Math.hypot(dx, dz);
    if (distance >= minDistance) continue;
    if (distance > 1e-5) {
      position.x = zone.x + (dx / distance) * minDistance;
      position.z = zone.z + (dz / distance) * minDistance;
    } else {
      position.x = zone.x + minDistance;
    }
  }
  return position;
}

function safeLand(position, colliders = [], bounds, radius = 0.55) {
  if (!position) return;
  const originX = position.x;
  const originZ = position.z;
  const margin = radius + 0.2;

  clampXZ(position, bounds, margin);
  if (isClear(position.x, position.z, colliders, radius)) return;

  // Search nearest-first so teardown moves the player only as far as needed.
  // A 16-way ring is enough for axis-aligned campus geometry and avoids any
  // dependency on the normal collision resolver while the player is inside.
  for (let ring = 1; ring <= 64; ring++) {
    const distance = ring * 1.25;
    for (let step = 0; step < 16; step++) {
      const angle = (step / 16) * Math.PI * 2;
      const x = originX + Math.cos(angle) * distance;
      const z = originZ + Math.sin(angle) * distance;
      if (!insideBounds(x, z, bounds, margin)) continue;
      if (!isClear(x, z, colliders, radius)) continue;
      position.x = x;
      position.z = z;
      return;
    }
  }

  // Extremely dense/overlapping props are handled by a deterministic scan of
  // the playable area. This is a teardown-only fallback, never a frame cost.
  if (bounds) {
    for (let z = bounds.minZ + margin; z <= bounds.maxZ - margin; z += 2) {
      for (let x = bounds.minX + margin; x <= bounds.maxX - margin; x += 2) {
        if (!isClear(x, z, colliders, radius)) continue;
        position.x = x;
        position.z = z;
        return;
      }
    }
  }
}

function isClear(x, z, colliders, radius) {
  for (const box of colliders || []) {
    if (box?.type === 'circle' && Number.isFinite(box.x) && Number.isFinite(box.z) &&
        Number.isFinite(box.radius)) {
      if (Math.hypot(x - box.x, z - box.z) < box.radius + radius - 1e-8) return false;
      continue;
    }
    const nearestX = Math.max(box.minX, Math.min(x, box.maxX));
    const nearestZ = Math.max(box.minZ, Math.min(z, box.maxZ));
    const dx = x - nearestX;
    const dz = z - nearestZ;
    if (dx * dx + dz * dz < radius * radius - 1e-8) return false;
  }
  return true;
}

function clampXZ(position, bounds, margin) {
  if (!bounds) return;
  position.x = Math.max(bounds.minX + margin, Math.min(position.x, bounds.maxX - margin));
  position.z = Math.max(bounds.minZ + margin, Math.min(position.z, bounds.maxZ - margin));
}

function insideBounds(x, z, bounds, margin) {
  if (!bounds) return true;
  return x >= bounds.minX + margin && x <= bounds.maxX - margin &&
    z >= bounds.minZ + margin && z <= bounds.maxZ - margin;
}
