// Axis-aligned box collision on the XZ plane.
// Colliders are { minX, maxX, minZ, maxZ } rectangles.

export function makeCollider(centerX, centerZ, sizeX, sizeZ) {
  return {
    minX: centerX - sizeX / 2,
    maxX: centerX + sizeX / 2,
    minZ: centerZ - sizeZ / 2,
    maxZ: centerZ + sizeZ / 2
  };
}

// Push a circle (pos {x,z}, radius) out of every collider it overlaps.
// Mutates and returns pos.
export function resolveCollisions(pos, radius, colliders) {
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    const nearestX = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nearestZ = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nearestX;
    const dz = pos.z - nearestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq >= radius * radius) continue;

    if (distSq > 1e-8) {
      const dist = Math.sqrt(distSq);
      const push = radius - dist;
      pos.x += (dx / dist) * push;
      pos.z += (dz / dist) * push;
    } else {
      // Center is inside the box: push out along the shallowest axis.
      const left = pos.x - c.minX;
      const right = c.maxX - pos.x;
      const top = pos.z - c.minZ;
      const bottom = c.maxZ - pos.z;
      const m = Math.min(left, right, top, bottom);
      if (m === left) pos.x = c.minX - radius;
      else if (m === right) pos.x = c.maxX + radius;
      else if (m === top) pos.z = c.minZ - radius;
      else pos.z = c.maxZ + radius;
    }
  }
  return pos;
}

// Keep the player inside the playable area.
export function clampToBounds(pos, bounds, margin) {
  pos.x = Math.max(bounds.minX + margin, Math.min(pos.x, bounds.maxX - margin));
  pos.z = Math.max(bounds.minZ + margin, Math.min(pos.z, bounds.maxZ - margin));
  return pos;
}
