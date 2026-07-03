import * as THREE from 'three';
import { textTexture } from '../utils/geometry.js';

// Additional named campus buildings, placed to better match the real Laitram
// aerial without disturbing the central 220 Laitram Machinery building (which
// owns the walkable interior, zone AABBs, mission NPCs and collision).
//
// Every footprint here was checked against the existing buildings, NPC spawns,
// patrol paths, mission POIs, the road/sidewalk grid and the collectible
// positions to avoid overlaps. North = -Z, east = +X.

export function addCampusDetail(ctx) {
  const { world, M, box } = ctx;

  const wallSign = (text, x, y, z, rotY, w = 14, h = 1.8, bg = '#1f5fa8') => {
    const s = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: textTexture(text, { bg }) })
    );
    s.position.set(x, y, z);
    s.rotation.y = rotY;
    world.add(s);
  };

  // Generic low-poly industrial shell: walls, roof cap, trim band, rooftop unit.
  // Wall tint cycles the Phase 9 concrete variants (position-hashed) so the
  // in-fill buildings don't all share one identical panel tone.
  const wallVariants = [M.whiteWall, M.whiteWallB, M.whiteWallC];
  const building = (x, z, sx, sz, h) => {
    const wall = wallVariants[Math.abs(Math.round(x * 7 + z * 13)) % 3];
    box(sx, h, sz, wall, x, h / 2, z, { collide: true });
    box(sx + 1, 1.2, sz + 1, M.roof, x, h + 0.6, z, { castShadow: false });
    box(sx + 0.3, 1.8, sz + 0.3, M.blueTrim, x, h - 1.6, z, { castShadow: false });
    box(5, 2.2, 4, M.hvac, x + sx * 0.18, h + 1.3, z - sz * 0.18);
  };

  // ---- 5306 Toler (ILOX IMF) — north strip, west of the 301 row ----
  building(-30, -92, 30, 24, 12);
  wallSign('5306 TOLER', -30, 8.6, -79.7, 0, 16, 2);          // faces Toler St (south)
  wallSign('ILOX IMF', -30, 6.4, -79.7, 0, 11, 1.2, '#b8651f');

  // ---- 211 Laitram Ln — east row, south of the 201 office ----
  building(140, 46, 16, 16, 11);
  wallSign('211 LAITRAM LN', 131.7, 7, 46, -Math.PI / 2, 13, 1.8); // faces campus (west)

  // ---- 116 Laitram Ln — south-east corner, off River Road ----
  building(140, 88, 18, 22, 10);
  wallSign('116 LAITRAM LN', 130.7, 6.6, 88, -Math.PI / 2, 14, 1.8);

  // ---- 5040 Storey — central-south, east of 5211 Storey ----
  building(96, 80, 18, 16, 9);
  wallSign('5040 STOREY', 96, 6.4, 71.8, Math.PI, 13, 1.6);    // faces Storey St (north)

  // ---- 5210 Storey — small central building off the front lot ----
  building(76, 48, 14, 12, 8);
  wallSign('5210 STOREY', 76, 5.8, 41.8, Math.PI, 11, 1.4);    // faces the front lot (north)

  addStreetAndWayfinding(ctx);
}

// ---- Phase 14: intersection street blades + campus wayfinding ----
// Every sign here is cosmetic (thin posts, no colliders) and placed on grass
// or sidewalk verges checked against buildings, lots, patrol paths and POIs.
function addStreetAndWayfinding(ctx) {
  const { world, M, box } = ctx;

  const blade = (text, x, y, z, rotY, w = 5, h = 0.8, bg = '#2e7d32') => {
    const s = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: textTexture(text, { bg }), side: THREE.DoubleSide })
    );
    s.position.set(x, y, z);
    s.rotation.y = rotY;
    world.add(s);
  };

  // Crossed street blades on one post — the classic two-name corner sign.
  const crossSign = (x, z, textA, rotA, textB, rotB) => {
    box(0.25, 3.8, 0.25, M.signPost, x, 1.9, z);
    blade(textA, x, 3.5, z, rotA);
    blade(textB, x, 2.7, z, rotB);
  };

  // Corners not already covered by the Phase 8 single-blade signs.
  crossSign(9, -47, 'TOLER ST', 0, 'PLANTATION RD', Math.PI / 2); // Plantation Rd x Toler St
  crossSign(-16, 118, 'RIVER ROAD', 0, 'PLANTATION RD', Math.PI / 2); // gate corner
  crossSign(151, 73, 'STOREY ST', 0, 'LAITRAM LN', Math.PI / 2); // Laitram Ln x Storey St
  crossSign(166, -48, 'TOLER ST', 0, 'LAITRAM LN', Math.PI / 2); // Laitram Ln x Toler St
  crossSign(-153, 59, 'STOREY ST', 0, 'PLANTATION DR', Math.PI / 2); // west edge
  crossSign(-153, 118, 'RIVER ROAD', 0, 'PLANTATION DR', Math.PI / 2); // southwest corner

  // Wayfinding: stacked arrow blades on a twin-post board. Posts are offset
  // along the board's width axis (the plane's local X after yaw).
  const wayfinding = (x, z, rotY, entries) => {
    const topY = 3.2;
    const postH = topY + 0.6;
    const ox = Math.cos(rotY) * 2.2;
    const oz = -Math.sin(rotY) * 2.2;
    box(0.22, postH, 0.22, M.signPost, x - ox, postH / 2, z - oz);
    box(0.22, postH, 0.22, M.signPost, x + ox, postH / 2, z + oz);
    entries.forEach((e, i) => {
      blade(e, x, topY - i * 0.85, z, rotY, 5.6, 0.75, '#1f5fa8');
    });
  };

  // Main gate approach: faces south, read while walking north up
  // Plantation Rd (viewer faces north: left = west, right = east).
  wayfinding(9.5, 96, 0, [
    '← SHIPPING',
    'RECEIVING →',
    'VISITOR PARKING →'
  ]);
  // Plantation Rd x Storey St: faces east toward the road (viewer faces
  // west: left = south/ahead-left along Storey, right = north).
  wayfinding(-11, 79, Math.PI / 2, [
    '← WEST DOCK',
    '← DISTRIBUTION',
    'VISITOR PARKING →'
  ]);
  // Toler St by the 301 row: faces south toward the street (viewer faces
  // north: left = west, right = east).
  wayfinding(14, -63, 0, [
    '301B SHIPPING →',
    '← INTRALOX 5307'
  ]);
}
