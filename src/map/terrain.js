import * as THREE from 'three';
import { makeCollider } from '../collision.js';
import { createMaterials, createBuilders } from '../utils/geometry.js';
import { addBuildings } from './buildings.js';
import { addProps } from './props.js';
import { addLandscaping } from './landscaping.js';

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
  partsBox: new THREE.Vector3(78, 0, -20)
};

export function buildWorld(scene) {
  const colliders = [];
  const world = new THREE.Group();
  scene.add(world);

  const M = createMaterials();
  const { box, flat } = createBuilders(world, colliders);
  // updaters: per-frame callbacks (dt, time) for animated map elements
  // (currently just the canal water drift).
  const updaters = [];
  const ctx = { world, colliders, M, box, flat, updaters };

  addTerrain(ctx);
  addBuildings(ctx);
  addProps(ctx);
  addLandscaping(ctx);

  const update = (dt, time) => {
    for (const u of updaters) u(dt, time);
  };
  return { colliders, bounds: WORLD_BOUNDS, update };
}

function addTerrain({ colliders, M, box, flat }) {
  // ---- Ground ----
  flat(380, 305, M.grass, 0, 0, 0);

  // ---- Roads ----
  // Plantation St along the south edge.
  flat(345, 12, M.asphalt, -7.5, 125, 0.04);
  // Laitram Lane: east-west, north of the Laitram Machinery building.
  flat(205, 12, M.asphalt, 62.5, -55, 0.04);
  // Main campus drive: north-south between Intralox and Laitram Machinery.
  flat(10, 180, M.asphalt, 0, 35, 0.04);
  // Storey St along the east side.
  flat(10, 185, M.asphalt, 158, 37.5, 0.04);
  // West street alongside Intralox, down to the pharmacy corner.
  flat(9, 232, M.asphalt, -160, 9, 0.04);

  // Truck aprons and drive lanes (concrete-toned asphalt pads).
  flat(48, 40, M.asphalt, -32, -2, 0.035); // Intralox shipping apron
  flat(36, 44, M.asphalt, 94, -14, 0.035); // Laitram Machinery east truck court
  flat(56, 9, M.asphalt, 38, -44.5, 0.035); // LM north service strip off Laitram Ln
  flat(10, 40, M.asphalt, -150.5, 90, 0.035); // warehouse west dock apron
  flat(8, 10, M.concrete, 9, 40, 0.045); // front lot entry crossing

  // Road center lines.
  for (let z = 118; z > -48; z -= 14) flat(0.5, 6, M.roadLine, 0, z, 0.06);
  for (let x = -30; x < 160; x += 14) flat(6, 0.5, M.roadLine, x, -55, 0.06);
  for (let x = -172; x < 160; x += 14) flat(6, 0.5, M.roadLine, x, 125, 0.06);
  for (let z = -46; z < 122; z += 14) flat(0.5, 6, M.roadLine, 158, z, 0.06);

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
