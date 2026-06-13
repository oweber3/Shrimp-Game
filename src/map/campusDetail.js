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
  const building = (x, z, sx, sz, h) => {
    box(sx, h, sz, M.whiteWall, x, h / 2, z, { collide: true });
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
}
