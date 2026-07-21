import * as THREE from 'three';
import { textTexture } from '../utils/geometry.js';
import { BUILDING_BY_ID, warnIfOverlapping } from './layoutData.js';
import { CROSS_STREET_SIGNS, WAYFINDING_SIGNS } from './placementData.js';

// Canonical infill shells around the detailed 220 Laitram Machinery building.
// North = -Z, east = +X.

export function addCampusDetail(ctx) {
  const { M, box } = ctx;

  // Generic low-poly industrial shell: walls, roof cap, trim band, rooftop unit.
  // Wall tint cycles the Phase 9 concrete variants (position-hashed) so the
  // in-fill buildings don't all share one identical panel tone.
  const wallVariants = [M.whiteWall, M.whiteWallB, M.whiteWallC];
  const building = ({ cx: x, cz: z, sx, sz, height: h }) => {
    const wall = wallVariants[Math.abs(Math.round(x * 7 + z * 13)) % 3];
    box(sx, h, sz, wall, x, h / 2, z, { collide: true });
    box(sx + 1, 1.2, sz + 1, M.roof, x, h + 0.6, z, { castShadow: false });
    box(sx + 0.3, 1.8, sz + 0.3, M.blueTrim, x, h - 1.6, z, { castShadow: false });
    box(5, 2.2, 4, M.hvac, x + sx * 0.18, h + 1.3, z - sz * 0.18);
  };

  // The canonical keeper location for the guard shack clips the southwest
  // corner of HR's rectangular envelope. Preserve both recorded envelopes but
  // notch the physical HR shell so the shack remains visible and walkable.
  const humanResources = BUILDING_BY_ID['laitram-200'];
  const hrWall = wallVariants[Math.abs(Math.round(
    humanResources.cx * 7 + humanResources.cz * 13
  )) % 3];
  const hrPiece = (x, z, sx, sz) => {
    const h = humanResources.height;
    box(sx, h, sz, hrWall, x, h / 2, z, { collide: true });
    box(sx + 1, 1.2, sz + 1, M.roof, x, h + 0.6, z, { castShadow: false });
    box(sx + 0.3, 1.8, sz + 0.3, M.blueTrim, x, h - 1.6, z, { castShadow: false });
  };

  // Canonical infill shells; building-specific signage is built separately.
  const detailIds = [
    'plantation-221',
    'toler-5200b',
    'toler-5200a',
    'storey-5140',
    'storey-5135',
    'storey-5129',
    'storey-5123',
    'storey-5120',
    'storey-5118',
    'storey-5115',
    'laitram-116',
  ];
  detailIds.forEach((id) => building(BUILDING_BY_ID[id]));
  // Full canonical envelope x -22..12, z 96..124 with a southwest notch.
  hrPiece(-1.5, 110, 27, 28);
  hrPiece(-18.5, 106, 7, 20);
  box(5, 2.2, 4, M.hvac, 2, humanResources.height + 1.3, 105);

  addStreetAndWayfinding(ctx);
}

// ---- Phase 14: intersection street blades + campus wayfinding ----
// Every sign here is cosmetic (thin posts, no colliders) and placed on grass
// or sidewalk verges checked against buildings, lots, patrol paths and POIs.
function addStreetAndWayfinding(ctx) {
  const { world, M, box } = ctx;

  // Front-side faces back to back: a single DoubleSide plane would mirror
  // the text when read from behind. Backface culling keeps exactly one
  // coplanar face visible per pixel, so no offset is needed. Directional
  // text (arrows) passes twoSided: false and draws its own plain back.
  const blade = (text, x, y, z, rotY, w = 5, h = 0.8, bg = '#2e7d32', twoSided = true) => {
    const tex = textTexture(text, { bg });
    for (const flip of twoSided ? [0, Math.PI] : [0]) {
      const s = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      s.position.set(x, y, z);
      s.rotation.y = rotY + flip;
      world.add(s);
    }
  };

  // Crossed street blades on one post — the classic two-name corner sign.
  // Each blade runs parallel to the street it names.
  const crossSign = ({ id, x, z, textA, rotA, textB, rotB, w, sx, sz }) => {
    warnIfOverlapping(id, x, z, sx, sz);
    box(0.25, 3.8, 0.25, M.signPost, x, 1.9, z);
    blade(textA, x, 3.5, z, rotA, w);
    blade(textB, x, 2.7, z, rotB, w);
  };

  // Corner verges of the Phase 2 street grid, opposite the Phase 8
  // single-blade signs so no corner doubles up.
  for (const signDef of CROSS_STREET_SIGNS) crossSign(signDef);

  // Wayfinding: stacked arrow blades on a twin-post board. Posts are offset
  // along the board's width axis (the plane's local X after yaw).
  const wayfinding = ({ id, x, z, rotY, entries, sx, sz }) => {
    warnIfOverlapping(id, x, z, sx, sz, { rotY });
    const topY = 3.2;
    const postH = topY + 0.6;
    const ox = Math.cos(rotY) * 2.2;
    const oz = -Math.sin(rotY) * 2.2;
    box(0.22, postH, 0.22, M.signPost, x - ox, postH / 2, z - oz);
    box(0.22, postH, 0.22, M.signPost, x + ox, postH / 2, z + oz);
    entries.forEach((e, i) => {
      blade(e, x, topY - i * 0.85, z, rotY, 5.6, 0.75, '#1f5fa8', false);
    });
    // Plain board back: the arrow entries only read correctly from the
    // front, so the reverse shows sign backing instead of wrong directions.
    const backH = (entries.length - 1) * 0.85 + 0.8;
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, backH),
      new THREE.MeshBasicMaterial({ color: 0x39434a })
    );
    back.position.set(x, topY - (entries.length - 1) * 0.85 / 2, z);
    back.rotation.y = rotY + Math.PI;
    world.add(back);
  };

  for (const signDef of WAYFINDING_SIGNS) wayfinding(signDef);
}
