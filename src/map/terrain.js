import * as THREE from 'three';
import { makeCollider } from '../collision.js';
import { createMaterials, createBuilders, createDecalBatch } from '../utils/geometry.js';
import { applyWorldUVs } from '../utils/surfaceTextures.js';
import { addBuildings } from './buildings.js';
import { addCampusDetail } from './campusDetail.js';
import { addProps } from './props.js';
import { addLandscaping } from './landscaping.js';
import { addInterior } from './interior.js';
import { addRamps } from './ramps.js';
import { EXTERIOR_LAYER, INTERIOR_LAYER } from '../zones.js';
import {
  WORLD_BOUNDS,
  ROADS,
  ROAD_BY_ID,
} from './layoutData.js';
import { MISSION_ITEM_PLACEMENTS } from './placementData.js';

// Low-poly approximation of the Laitram campus in Harahan/Elmwood, Louisiana.
// The street grid follows the real site plan (see
// docs/reference/laitram-maps/layout.md): Plantation Road runs east-west
// along the north edge, River Road north-south along the west edge with the
// Mississippi River levee just beyond it, Laitram Street east-west along the
// south edge with the main gate, Storey Street is the north-south central
// spine, and Toler Street runs north-south between the campus block and the
// 301 row on the east edge. Building placement implements the canonical
// layout table. North is -Z (top of the minimap), south is +Z, west is -X,
// and east is +X. Intentional adaptations are limited to the game-sized
// Laitram Machinery envelope, the Distribution label assigned to the sheet's
// unlabeled northwest shell, and the guard shack retained at the main gate.

export { WORLD_BOUNDS } from './layoutData.js';

export const POI = {
  // Laitram Lane directly in front of the Machinery office entrance. The
  // player's default north-facing heading looks toward the front doors.
  spawn: new THREE.Vector3(51, 0, 100),
  // Relocated Distribution Warehouse west dock.
  wrench: new THREE.Vector3(MISSION_ITEM_PLACEMENTS.wrench.x, 0, MISSION_ITEM_PLACEMENTS.wrench.z),
  // Receiving pallet on the clear north service apron.
  partsBox: new THREE.Vector3(MISSION_ITEM_PLACEMENTS.partsBox.x, 0, MISSION_ITEM_PLACEMENTS.partsBox.z),
  // Kitchen 1078A counter inside Laitram Machinery (Mission 3).
  coffeePot: new THREE.Vector3(MISSION_ITEM_PLACEMENTS.coffeePot.x, 0, MISSION_ITEM_PLACEMENTS.coffeePot.z)
};

export function buildWorld(scene, loadingManager) {
  const colliders = [];
  const world = new THREE.Group();
  scene.add(world);

  const M = createMaterials();
  const { box, flat } = createBuilders(world, colliders);
  // updaters: per-frame callbacks (dt, time) for animated map elements
  // (currently just the canal water drift).
  const updaters = [];
  const ctx = { world, colliders, M, box, flat, updaters, loadingManager };

  addTerrain(ctx);
  addRamps(ctx); // stunt ramps & dirt jumps for the golf cart
  addBuildings(ctx);
  addCampusDetail(ctx);
  addProps(ctx);
  addLandscaping(ctx);

  // Interior in its own group; layer split lets the zone system cull the
  // exterior when indoors and the interior when outdoors. Player, NPCs and
  // mission items stay on the default layer 0, always visible.
  const interior = addInterior(scene, colliders);
  world.traverse((o) => o.layers.set(EXTERIOR_LAYER));
  interior.traverse((o) => o.layers.set(INTERIOR_LAYER));

  const update = (dt, time) => {
    for (const u of updaters) u(dt, time);
  };
  return { colliders, bounds: WORLD_BOUNDS, update };
}

function addTerrain({ world, colliders, M, box, flat }) {
  const wear = createDecalBatch(world, 'tireWear');
  // ---- Ground ----
  flat(380, 305, M.grass, 0, 0, 0);
  // Extra grass apron west of the fence so the levee doesn't float in void.
  // Starts exactly where the main ground plane ends (x = -190) to avoid
  // coplanar overlap.
  flat(45, 305, M.grass, -212.5, 0, 0);

  // ---- Mississippi River levee ----
  // The real campus sits just east of the river levee that River Road runs
  // along — its strongest geographic feature. A long grass berm west of
  // River Road, outside the perimeter fence and world bounds, so it is
  // purely cosmetic (no colliders, no pathing changes).
  addLevee(world, M, flat);

  // ---- Roads (named per the real campus map) ----
  for (const road of ROADS) {
    flat(
      road.sx,
      road.sz,
      M[road.material],
      road.cx,
      road.cz,
      road.elevation ?? 0.04
    );
  }

  // Road center lines.
  for (let x = -170; x < 176; x += 14) flat(6, 0.5, M.roadLine, x, -130, 0.06); // Plantation Rd
  for (let x = -170; x < 176; x += 14) flat(6, 0.5, M.roadLine, x, 130, 0.06); // Laitram St
  for (let z = -130; z < 132; z += 14) flat(0.5, 6, M.roadLine, -170, z, 0.06); // River Road
  for (let z = -120; z < 122; z += 14) flat(0.5, 6, M.roadLine, -30, z, 0.06); // Storey St
  for (let z = -120; z < 122; z += 14) flat(0.5, 6, M.roadLine, 100, z, 0.06); // Toler St
  for (let x = 16; x < 96; x += 14) flat(6, 0.5, M.roadLine, x, 100, 0.06); // Laitram Ln

  // ---- Tire wear along the drive lanes (Phase 9 weathering) ----
  // Soft wheel-path darkening on each lane of the busiest roads and the
  // truck aprons; one merged mesh, one draw call.
  for (const laneZ of [-132.6, -127.4]) {
    wear.addGround(2, laneZ, 4.6, 350, Math.PI / 2, 0.052, 23); // Plantation Rd
  }
  for (const laneZ of [127.4, 132.6]) {
    wear.addGround(2, laneZ, 4.6, 350, Math.PI / 2, 0.052, 23); // Laitram St
  }
  for (const laneX of [-172.3, -167.7]) {
    wear.addGround(laneX, 0, 4, 266, 0, 0.052, 18); // River Road lanes
  }
  for (const laneX of [-32.6, -27.4]) {
    wear.addGround(laneX, 0, 4.6, 244, 0, 0.052, 16); // Storey St lanes
  }
  for (const laneX of [97.7, 102.3]) {
    wear.addGround(laneX, 0, 4, 244, 0, 0.052, 16); // Toler St lanes
  }
  const warehouseApron = ROAD_BY_ID['warehouse-west-dock-apron'];
  for (const laneX of [-129, -119, -109]) {
    wear.addGround(laneX, warehouseApron.cz, 4, warehouseApron.sz - 4, 0, 0.052, 2.5);
  }
  wear.commit();

  // ---- Sidewalks ----
  flat(3, 250, M.sidewalk, -37, 0, 0.05); // Storey St west side
  flat(3, 250, M.sidewalk, -23, 0, 0.05); // Storey St east side
  flat(350, 3, M.sidewalk, 2, -123.5, 0.05); // Plantation Rd south side
  flat(350, 3, M.sidewalk, 2, 123.5, 0.05); // Laitram St north side
  flat(3, 250, M.sidewalk, 94, 0, 0.05); // Toler St west side
  flat(56, 3, M.sidewalk, 56, 88, 0.05); // LM front walk
  flat(4, 8, M.sidewalk, 51, 88, 0.05); // LM office entry walk
  flat(46, 3, M.sidewalk, -76, -121.5, 0.05); // warehouse front walk

  // ---- Perimeter fence ----
  const fenceRun = (x, z, sx, sz) => {
    box(sx, 2.6, sz, M.fence, x, 1.3, z, { castShadow: false });
    colliders.push(makeCollider(x, z, Math.max(sx, 1), Math.max(sz, 1)));
  };
  const B = WORLD_BOUNDS;
  fenceRun((B.minX + B.maxX) / 2, B.minZ, B.maxX - B.minX, 0.4); // north
  fenceRun(B.minX, 0, 0.4, B.maxZ - B.minZ); // west
  fenceRun(B.maxX, 0, 0.4, B.maxZ - B.minZ); // east
  // South fence with an entrance gap at the Laitram St main gate, aligned
  // with the Storey St axis (gate drive x -35..-25).
  fenceRun((B.minX - 35) / 2, B.maxZ, -35 - B.minX, 0.4);
  fenceRun((B.maxX - 25) / 2, B.maxZ, B.maxX + 25, 0.4);
}

// Triangular grass berm running north-south beyond the west fence, with a
// gravel crown path along the crest.
function addLevee(world, M, flat) {
  const length = 305; // full map depth along Z
  const halfW = 13; // berm half-width in X
  const crest = 6; // crest height
  const xC = -196; // crest line (fence is at x=-180)

  const geo = new THREE.BufferGeometry();
  // Cross-section: east toe -> crest -> west toe, extruded along Z.
  const z0 = -length / 2;
  const z1 = length / 2;
  const verts = new Float32Array([
    // east slope
    xC + halfW, 0, z0, xC + halfW, 0, z1, xC, crest, z1,
    xC + halfW, 0, z0, xC, crest, z1, xC, crest, z0,
    // west slope
    xC, crest, z0, xC, crest, z1, xC - halfW, 0, z1,
    xC, crest, z0, xC - halfW, 0, z1, xC - halfW, 0, z0
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  // The grass material is textured (Phase 9): give the berm world-space UVs
  // (positions are already in world coordinates, so no offset). texScale is
  // absent on the flat-material fallback path — no UVs needed there.
  if (M.grass.userData.texScale) applyWorldUVs(geo, M.grass.userData.texScale);
  const berm = new THREE.Mesh(geo, M.grass);
  berm.receiveShadow = true;
  world.add(berm);

  // Crown path along the crest.
  flat(2.6, length, M.sidewalk, xC, 0, crest + 0.02);
}
