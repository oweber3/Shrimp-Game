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

// Low-poly approximation of the Laitram campus in Harahan/Elmwood, Louisiana,
// laid out to match the aerial view: the long white Intralox plant runs
// north-south on the west side, the Laitram Machinery complex sits in the
// center on Laitram Lane with its truck court to the east, the Laitram
// office is east of that, Lapeyre Stair is northeast across Laitram Lane,
// and the distribution warehouse and pharmacy fill the southwest corner.
// Storey St runs along the east side, Plantation St along the south.
// North is -Z, east is +X.

export const WORLD_BOUNDS = { minX: -180, maxX: 180, minZ: -140, maxZ: 145 };

export const POI = {
  // Main drive beside the Laitram Machinery front parking lot.
  spawn: new THREE.Vector3(0, 0, 50),
  // Warehouse west dock, by the pallet backlog.
  wrench: new THREE.Vector3(-146, 0, 90),
  // Receiving pad on the east side of Laitram Machinery.
  partsBox: new THREE.Vector3(78, 0, -20),
  // Kitchen 1078A counter inside Laitram Machinery (Mission 3).
  coffeePot: new THREE.Vector3(14.5, 0, -18.55)
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
  // Extra grass apron south of the fence so the levee doesn't float in void.
  // Starts exactly where the main ground plane ends (z = 152.5) to avoid
  // coplanar overlap.
  flat(380, 45, M.grass, 0, 175, 0);

  // ---- Mississippi River levee (Phase 14) ----
  // The real campus sits just north of the river levee that River Road runs
  // along — its strongest geographic feature. A long grass berm south of
  // River Road, outside the perimeter fence and world bounds, so it is
  // purely cosmetic (no colliders, no pathing changes).
  addLevee(world, M, flat);

  // ---- Roads (named per the real campus map) ----
  // River Road along the south edge.
  flat(345, 12, M.asphalt, -7.5, 125, 0.04);
  // Toler Street: east-west along the north side of the main block.
  flat(205, 12, M.asphalt, 62.5, -55, 0.04);
  // Plantation Road: north-south through the middle of campus.
  flat(10, 180, M.asphalt, 0, 35, 0.04);
  // Plantation Road north extension, up through the 301/5307 district.
  flat(10, 78, M.asphalt, 0, -97, 0.04);
  // Storey Street: east-west through the middle of the south block.
  flat(320, 10, M.asphalt, 2, 66, 0.04);
  // Laitram Lane along the east side.
  flat(10, 185, M.asphalt, 158, 37.5, 0.04);
  // Plantation Drive along the west edge, down to the 200 Plantation corner.
  flat(9, 232, M.asphalt, -160, 9, 0.04);

  // Truck aprons and drive lanes (concrete-toned asphalt pads).
  flat(48, 40, M.asphalt, -32, -2, 0.035); // Intralox shipping apron
  flat(36, 44, M.asphalt, 94, -14, 0.035); // Laitram Machinery east truck court
  flat(56, 9, M.asphalt, 38, -44.5, 0.035); // LM north service strip off Laitram Ln
  flat(10, 40, M.asphalt, -150.5, 90, 0.035); // warehouse west dock apron
  flat(8, 10, M.concrete, 9, 40, 0.045); // front lot entry crossing

  // Road center lines.
  for (let z = 118; z > -48; z -= 14) flat(0.5, 6, M.roadLine, 0, z, 0.06);
  for (let z = -64; z > -134; z -= 14) flat(0.5, 6, M.roadLine, 0, z, 0.06);
  for (let x = -30; x < 160; x += 14) flat(6, 0.5, M.roadLine, x, -55, 0.06);
  for (let x = -150; x < 160; x += 14) flat(6, 0.5, M.roadLine, x, 66, 0.06);
  for (let x = -172; x < 160; x += 14) flat(6, 0.5, M.roadLine, x, 125, 0.06);
  for (let z = -46; z < 122; z += 14) flat(0.5, 6, M.roadLine, 158, z, 0.06);

  // ---- Tire wear along the drive lanes (Phase 9 weathering) ----
  // Soft wheel-path darkening on each lane of the busiest roads and the
  // truck aprons; one merged mesh, one draw call.
  for (const laneX of [-2.6, 2.6]) {
    wear.addGround(laneX, 35, 4.6, 176, 0, 0.052, 12); // Plantation Rd lanes
  }
  for (const laneZ of [122.4, 127.6]) {
    wear.addGround(-7.5, laneZ, 4.6, 330, Math.PI / 2, 0.052, 22); // River Road
  }
  for (const laneZ of [-52.5, -57.5]) {
    wear.addGround(62.5, laneZ, 4.4, 195, Math.PI / 2, 0.052, 13); // Toler St
  }
  for (const laneZ of [63.8, 68.2]) {
    wear.addGround(2, laneZ, 4, 305, Math.PI / 2, 0.052, 20); // Storey St
  }
  wear.addGround(-32, -2, 6, 38, 0, 0.052, 3); // Intralox shipping apron
  wear.addGround(94, -14, 6, 40, 0, 0.052, 3); // LM east truck court
  wear.addGround(-150.5, 90, 5, 36, 0, 0.052, 2.5); // warehouse west dock
  wear.commit();

  // ---- Sidewalks ----
  flat(3, 180, M.sidewalk, -7, 35, 0.05); // main drive west side
  flat(3, 180, M.sidewalk, 7, 35, 0.05); // main drive east side
  flat(180, 3, M.sidewalk, 60, -46.5, 0.05); // Laitram Ln south side
  flat(56, 3, M.sidewalk, 40, 58, 0.05); // LM front lot walk
  flat(4, 6, M.sidewalk, 35, 22.5, 0.05); // LM office entry walk
  flat(60, 3, M.sidewalk, -100, 70.5, 0.05); // warehouse front walk

  // ---- Perimeter fence ----
  const fenceRun = (x, z, sx, sz) => {
    box(sx, 2.6, sz, M.fence, x, 1.3, z, { castShadow: false });
    colliders.push(makeCollider(x, z, Math.max(sx, 1), Math.max(sz, 1)));
  };
  const B = WORLD_BOUNDS;
  fenceRun((B.minX + B.maxX) / 2, B.minZ, B.maxX - B.minX, 0.4); // north
  fenceRun(B.minX, 0, 0.4, B.maxZ - B.minZ); // west
  fenceRun(B.maxX, 0, 0.4, B.maxZ - B.minZ); // east
  // South fence with an entrance gap at the gate.
  fenceRun((B.minX - 10) / 2, B.maxZ, -10 - B.minX, 0.4);
  fenceRun((B.maxX + 22) / 2, B.maxZ, B.maxX - 22, 0.4);
}

// Triangular grass berm running east-west beyond the south fence, with a
// gravel crown path along the crest.
function addLevee(world, M, flat) {
  const length = 380; // full map width along X
  const halfW = 13; // berm half-width in Z
  const crest = 6; // crest height
  const zC = 161; // crest line (fence is at z=145)

  const geo = new THREE.BufferGeometry();
  // Cross-section: north toe -> crest -> south toe, extruded along X.
  const x0 = -length / 2;
  const x1 = length / 2;
  const verts = new Float32Array([
    // north slope
    x0, 0, zC - halfW, x1, 0, zC - halfW, x1, crest, zC,
    x0, 0, zC - halfW, x1, crest, zC, x0, crest, zC,
    // south slope
    x0, crest, zC, x1, crest, zC, x1, 0, zC + halfW,
    x0, crest, zC, x1, 0, zC + halfW, x0, 0, zC + halfW
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
  flat(length, 2.6, M.sidewalk, 0, zC, crest + 0.02);
}
