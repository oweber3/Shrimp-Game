import * as THREE from 'three';
import { makeCollider } from './collision.js';

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

function mat(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function textTexture(text, opts = {}) {
  const { bg = '#1f5fa8', fg = '#ffffff', w = 512, h = 128, font = 'bold 72px Arial' } = opts;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 4, w - 24);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

export function buildWorld(scene) {
  const colliders = [];
  const world = new THREE.Group();
  scene.add(world);

  const box = (sx, sy, sz, material, x, y, z, opts = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    m.position.set(x, y, z);
    if (opts.rotY) m.rotation.y = opts.rotY;
    m.castShadow = opts.castShadow !== false;
    m.receiveShadow = true;
    world.add(m);
    if (opts.collide) colliders.push(makeCollider(x, z, sx + 0.4, sz + 0.4));
    return m;
  };

  const flat = (sx, sz, material, x, z, y = 0.02) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), material);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    world.add(m);
    return m;
  };

  // ---- Materials ----
  const M = {
    grass: mat(0x6f9e58),
    asphalt: mat(0x3c4146),
    roadLine: mat(0xd8d2b8),
    sidewalk: mat(0xb9b9b0),
    whiteWall: mat(0xe8e6df),
    blueTrim: mat(0x1f5fa8),
    officeWall: mat(0xd9d4c8),
    glass: mat(0x7fb6cf),
    roof: mat(0x9ba0a3),
    dock: mat(0x8a8d90),
    dockDoor: mat(0x5a6a72),
    fence: mat(0x7d8489),
    trunk: mat(0x6b4a2f),
    oakLeaf: mat(0x4d7a3a),
    palmLeaf: mat(0x4f8f46),
    water: mat(0x4a7d8c),
    pallet: mat(0xa9824f),
    crate: mat(0xb08d57),
    barrelBlue: mat(0x2b6cb0),
    barrelOrange: mat(0xd96c2c),
    tableWood: mat(0x9c6b3f),
    signPost: mat(0x55595d),
    concrete: mat(0xc4c2ba),
    yellow: mat(0xd9b13b),
    metal: mat(0x9aa4ab),
    hvac: mat(0xb6bcc1),
    tankWhite: mat(0xdfe3e6),
    dumpster: mat(0x3d6b46),
    vending: mat(0xb03a2e)
  };

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

  // ---- Intralox plant (long building, west side) ----
  const plant = { x: -100, z: -27, sx: 75, sz: 160 };
  box(plant.sx, 16, plant.sz, M.whiteWall, plant.x, 8, plant.z, { collide: true });
  box(plant.sx + 1, 1.4, plant.sz + 1, M.roof, plant.x, 16.7, plant.z, { castShadow: false });
  box(plant.sx + 0.3, 2.2, plant.sz + 0.3, M.blueTrim, plant.x, 13.5, plant.z, { castShadow: false });
  for (let rz = -95; rz <= 35; rz += 26) {
    box(8, 3, 6, M.roof, plant.x - 12, 18.9, rz);
    box(6, 2.4, 5, M.roof, plant.x + 14, 18.6, rz + 12);
  }
  // Shipping dock on the east face, facing the main drive.
  box(6, 1.3, 30, M.dock, -59, 0.65, -5, { collide: true });
  for (const dz of [-16, -8, 0, 8]) {
    box(0.4, 5, 6, M.dockDoor, -62.2, 3.2, dz, { castShadow: false });
  }
  addTruck(world, colliders, -48, -8, Math.PI / 2);
  addTruck(world, colliders, -48, 8, Math.PI / 2, 0x3b6a9a);

  // ---- Laitram Machinery complex (center, most detail) ----
  const lm = { x: 40, z: -15, sx: 60, sz: 50 };
  box(lm.sx, 14, lm.sz, M.whiteWall, lm.x, 7, lm.z, { collide: true });
  box(lm.sx + 1, 1.3, lm.sz + 1, M.roof, lm.x, 14.65, lm.z, { castShadow: false });
  box(lm.sx + 0.3, 2, lm.sz + 0.3, M.blueTrim, lm.x, 11.4, lm.z, { castShadow: false });
  box(lm.sx + 0.3, 1.3, lm.sz + 0.3, M.glass, lm.x, 9, lm.z, { castShadow: false });
  for (const [rx, rz] of [[24, -28], [40, -12], [56, -28]]) {
    box(7, 2.8, 5, M.roof, rx, 16.7, rz);
  }
  // Office front section on the south face, with glass and an entry canopy.
  box(40, 8, 9, M.officeWall, 35, 4, 14.5, { collide: true });
  box(41, 0.8, 10, M.roof, 35, 8.4, 14.5, { castShadow: false });
  for (const wy of [2.5, 5.5]) {
    box(40.3, 1.5, 9.3, M.glass, 35, wy, 14.5, { castShadow: false });
  }
  box(12, 0.6, 5, M.blueTrim, 35, 4.4, 21.5);
  box(0.5, 4.1, 0.5, M.concrete, 30, 2.05, 23.2);
  box(0.5, 4.1, 0.5, M.concrete, 40, 2.05, 23.2);

  // Receiving dock on the east face, into the truck court.
  box(6, 1.3, 24, M.dock, 73, 0.65, -20, { collide: true });
  for (const dz of [-28, -20, -12]) {
    box(0.4, 5, 6, M.dockDoor, 70.2, 3.2, dz, { castShadow: false });
    box(0.3, 0.5, 1, M.fence, 76.2, 1.05, dz); // dock bumpers
  }
  // Grade-level roll-up doors on the north face, off Laitram Ln.
  box(8, 6, 0.4, M.dockDoor, 26, 3.2, -39.7, { castShadow: false });
  box(8, 6, 0.4, M.dockDoor, 44, 3.2, -39.7, { castShadow: false });
  for (const bx of [21, 31, 39, 49]) {
    const bol = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1, 8), M.yellow);
    bol.position.set(bx, 0.5, -41.2);
    bol.castShadow = true;
    world.add(bol);
    colliders.push(makeCollider(bx, -41.2, 0.6, 0.6));
  }

  // Exterior industrial equipment along the northeast corner of LM.
  const hvacUnit = (x, z) => {
    box(3.4, 1.6, 2, M.hvac, x, 0.8, z, { collide: true });
    for (const fx of [-0.8, 0.8]) {
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.2, 10), M.metal);
      fan.position.set(x + fx, 1.7, z);
      world.add(fan);
    }
  };
  hvacUnit(55, -42.6);
  hvacUnit(60.5, -42.6);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 5, 12), M.tankWhite);
  tank.position.set(66, 2.5, -43);
  tank.castShadow = true;
  world.add(tank);
  const tankCap = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.tankWhite);
  tankCap.position.set(66, 5, -43);
  world.add(tankCap);
  colliders.push(makeCollider(66, -43, 2.6, 2.6));
  box(1.8, 1.8, 1.8, M.metal, 50.5, 0.9, -42.5, { collide: true }); // transformer
  // Dumpster at the west end of the service strip.
  box(4, 2, 2.5, M.dumpster, 16, 1, -44, { collide: true });
  box(4.1, 0.25, 2.6, M.fence, 16, 2.1, -44, { castShadow: false });

  // Box truck parallel-parked on the north service strip.
  addTruck(world, colliders, 36, -46.5, Math.PI / 2, 0xdedede);

  // Truck backed up to the east receiving dock.
  addTruck(world, colliders, 84, -25, Math.PI / 2);

  // Pallets, crates and barrels around the LM docks.
  const palletStack = (x, z, layers) => {
    for (let i = 0; i < layers; i++) {
      box(2.4, 0.3, 2.4, M.pallet, x, 0.15 + i * 0.32, z, { collide: i === 0 });
    }
  };
  palletStack(21, -43.5, 3);
  palletStack(24, -43.5, 2);
  palletStack(88, -10, 4);
  palletStack(88, -6.5, 2);
  palletStack(91, -8, 3);
  box(2, 2, 2, M.crate, 96, 1, -30, { collide: true });
  box(1.6, 1.6, 1.6, M.crate, 99, 0.8, -27.5, { collide: true });
  const barrel = (x, z, material) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.6, 10), material);
    b.position.set(x, 0.8, z);
    b.castShadow = true;
    world.add(b);
    colliders.push(makeCollider(x, z, 1.4, 1.4));
  };
  barrel(96, -33.2, M.barrelBlue);
  barrel(97.4, -33.8, M.barrelOrange);
  addForklift(world, colliders, 94, -2);

  // Break area southeast of LM, by the front lot.
  const pav = { x: 85, z: 30 };
  box(16, 0.4, 12, M.concrete, pav.x, 0.2, pav.z, { castShadow: false });
  for (const [px, pz] of [[-7, -5], [7, -5], [-7, 5], [7, 5]]) {
    box(0.5, 4, 0.5, M.signPost, pav.x + px, 2, pav.z + pz, { collide: true });
  }
  box(18, 0.5, 14, M.blueTrim, pav.x, 4.2, pav.z, { castShadow: false });
  for (const tx of [-4, 4]) {
    box(4, 0.3, 2, M.tableWood, pav.x + tx, 1.1, pav.z, { collide: true });
    box(4, 0.2, 0.8, M.tableWood, pav.x + tx, 0.65, pav.z - 1.6);
    box(4, 0.2, 0.8, M.tableWood, pav.x + tx, 0.65, pav.z + 1.6);
  }
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.4, 10), M.barrelOrange);
  coffee.position.set(pav.x - 5, 0.9, pav.z + 4);
  coffee.castShadow = true;
  world.add(coffee);
  box(1.2, 2.2, 1, M.vending, pav.x, 1.1, pav.z + 4.2, { collide: true });
  box(0.8, 1.4, 0.1, M.glass, pav.x, 1.3, pav.z + 3.65, { castShadow: false });

  // ---- Laitram office (east of the truck court) ----
  const hqB = { x: 130, z: -20, sx: 36, sz: 36 };
  box(hqB.sx, 10, hqB.sz, M.officeWall, hqB.x, 5, hqB.z, { collide: true });
  box(hqB.sx + 1, 1.1, hqB.sz + 1, M.roof, hqB.x, 10.55, hqB.z, { castShadow: false });
  for (const wy of [3, 6.5]) {
    box(hqB.sx + 0.3, 1.5, hqB.sz + 0.3, M.glass, hqB.x, wy, hqB.z, { castShadow: false });
  }
  box(10, 0.6, 4, M.blueTrim, hqB.x, 3.4, 0);
  box(0.5, 3.4, 0.5, M.concrete, hqB.x - 4, 1.7, 1.6);
  box(0.5, 3.4, 0.5, M.concrete, hqB.x + 4, 1.7, 1.6);

  // ---- Lapeyre Stair (northeast, across Laitram Ln) ----
  box(70, 12, 45, M.whiteWall, 105, 6, -100, { collide: true });
  box(71, 1.2, 46, M.roof, 105, 12.6, -100, { castShadow: false });
  box(70.3, 1.8, 45.3, M.blueTrim, 105, 10, -100, { castShadow: false });
  // Display staircase by the entrance.
  for (let i = 0; i < 4; i++) {
    box(3, 0.45, 1, M.metal, 74, 0.25 + i * 0.45, -71 - i);
  }
  colliders.push(makeCollider(74, -72.5, 3.4, 4.4));

  // ---- Distribution warehouse (southwest) ----
  const wh = { x: -100, z: 95, sx: 80, sz: 44 };
  box(wh.sx, 13, wh.sz, M.whiteWall, wh.x, 6.5, wh.z, { collide: true });
  box(wh.sx + 1, 1.2, wh.sz + 1, M.roof, wh.x, 13.6, wh.z, { castShadow: false });
  box(wh.sx + 0.3, 2, wh.sz + 0.3, M.yellow, wh.x, 10.8, wh.z, { castShadow: false });
  // West dock platform and doors.
  box(6, 1.3, 26, M.dock, -142.5, 0.65, 90, { collide: true });
  box(0.4, 5, 6, M.dockDoor, -140.2, 3.2, 84, { castShadow: false });
  box(0.4, 5, 6, M.dockDoor, -140.2, 3.2, 96, { castShadow: false });
  // Front roll-up doors facing north.
  box(8, 6, 0.4, M.dockDoor, -115, 3.2, 72.8, { castShadow: false });
  box(8, 6, 0.4, M.dockDoor, -85, 3.2, 72.8, { castShadow: false });
  // Backlog at the west dock.
  palletStack(-149, 84, 4);
  palletStack(-149, 87.5, 2);
  palletStack(-151, 96, 6);
  box(2, 2, 2, M.crate, -152, 1, 100, { collide: true });
  box(1.6, 1.6, 1.6, M.crate, -149.5, 0.8, 102.5, { collide: true });
  barrel(-153, 79, M.barrelBlue);
  addTruck(world, colliders, -160, 70, 0, 0xc23b3b);

  // ---- Laitram Pharmacy (far southwest corner) ----
  box(14, 5, 18, M.officeWall, -171, 2.5, 40, { collide: true });
  box(15, 0.7, 19, M.roof, -171, 5.35, 40, { castShadow: false });

  // ---- Guard shack at the Plantation St gate ----
  box(5, 3.6, 5, M.officeWall, 8, 1.8, 112, { collide: true });
  box(6.5, 0.5, 6.5, M.roof, 8, 3.85, 112, { castShadow: false });
  box(0.3, 1.2, 2.2, M.glass, 5.6, 2.2, 112, { castShadow: false });

  // ---- Parking lots ----
  const paintLot = (x, z, sx, sz, rows, cols, carChance) => {
    flat(sx, sz, M.asphalt, x, z, 0.04);
    const spotW = 3, spotD = 6;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = x - sx / 2 + 6 + c * spotW;
        const pz = z - sz / 2 + 4 + r * (spotD + 6);
        flat(0.3, spotD, M.roadLine, px, pz + spotD / 2, 0.06);
        if (Math.sin(px * 12.9 + pz * 7.7) * 0.5 + 0.5 < carChance && c % 2 === 0) {
          addCar(world, colliders, px + spotW / 2, pz + spotD / 2, 0);
        }
      }
    }
  };
  paintLot(40, 40, 56, 28, 2, 14, 0.6); // LM front lot
  paintLot(-33, 41, 50, 34, 2, 13, 0.5); // Intralox employee lot
  paintLot(130, 12, 36, 20, 1, 9, 0.5); // Laitram office lot
  paintLot(105, -68, 44, 14, 1, 12, 0.4); // Lapeyre Stair lot

  // ---- Trees ----
  const oak = (x, z, s = 1) => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * s, 0.7 * s, 4 * s, 7), M.trunk);
    trunk.position.y = 2 * s;
    trunk.castShadow = true;
    g.add(trunk);
    const blobs = [
      [0, 5.2, 0, 3.2],
      [2.2, 4.6, 1.2, 2.2],
      [-2, 4.4, -1, 2.4],
      [1, 4.8, -1.8, 2]
    ];
    for (const [bx, by, bz, br] of blobs) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(br * s, 0), M.oakLeaf);
      leaf.position.set(bx * s, by * s, bz * s);
      leaf.castShadow = true;
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    world.add(g);
    colliders.push(makeCollider(x, z, 1.6 * s, 1.6 * s));
  };

  const palm = (x, z) => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 6), M.trunk);
    trunk.position.y = 3.5;
    trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4, 4), M.palmLeaf);
      const a = (i / 6) * Math.PI * 2;
      frond.position.set(Math.cos(a) * 1.6, 7, Math.sin(a) * 1.6);
      frond.rotation.z = Math.cos(a) * 1.25;
      frond.rotation.x = -Math.sin(a) * 1.25;
      frond.castShadow = true;
      g.add(frond);
    }
    g.position.set(x, 0, z);
    world.add(g);
    colliders.push(makeCollider(x, z, 1, 1));
  };

  // Oaks along the main drive and streets.
  oak(-12, 70, 1.1);
  oak(12, 70, 1);
  oak(-12, 95, 1.2);
  oak(12, 95, 1.1);
  oak(-40, 112, 1.2);
  oak(60, 112, 1);
  oak(120, 112, 1.1);
  oak(-10, -66, 1);
  oak(30, -66, 1.1);
  oak(60, -66, 1);
  oak(-147, -40, 1.2);
  oak(-147, 20, 1);
  oak(135, 28, 1.1);
  oak(115, 32, 0.9);
  oak(-54, 78, 1.2);
  // Palms at the LM office entry, the east court, and the gate.
  palm(26, 23);
  palm(44, 23);
  palm(108, 4);
  palm(108, -32);
  palm(-14, 120);
  palm(14, 120);
  palm(150, 118);

  // ---- Drainage canal along the east fence (Louisiana essential) ----
  flat(10, 270, M.water, 172, 0, 0.03);
  flat(3, 270, M.grass, 166, 0, 0.05);
  colliders.push(makeCollider(172, 0, 12, 280)); // do not swim in the canal

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

  // ---- Signs ----
  const monument = (x, z, text) => {
    box(8, 2.4, 1.2, M.concrete, x, 1.2, z, { collide: true });
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(7.4, 1.8),
      new THREE.MeshBasicMaterial({ map: textTexture(text, { bg: '#1f5fa8' }) })
    );
    face.position.set(x, 1.3, z + 0.65);
    world.add(face);
    const face2 = face.clone();
    face2.position.z = z - 0.65;
    face2.rotation.y = Math.PI;
    world.add(face2);
  };
  monument(-10, 116, 'LAITRAM');
  monument(14, 62, 'LAITRAM MACHINERY');

  const wallSign = (text, x, y, z, rotY, w = 24, h = 3, bg = '#1f5fa8') => {
    const s = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: textTexture(text, { bg }) })
    );
    s.position.set(x, y, z);
    s.rotation.y = rotY;
    world.add(s);
  };
  wallSign('INTRALOX', -62.2, 12, -40, Math.PI / 2, 30, 4);
  wallSign('SHIPPING', -62.15, 7.2, -4, Math.PI / 2, 12, 1.6, '#b8651f');
  wallSign('LAITRAM MACHINERY', lm.x, 12.4, -40.45, Math.PI, 26, 2.6);
  wallSign('LAITRAM MACHINERY, INC', 35, 6.9, 19.5, 0, 20, 1.8);
  wallSign('RECEIVING', 70.3, 7.2, -20, Math.PI / 2, 12, 1.6, '#b8651f');
  wallSign('SAFETY FIRST: 412 DAYS SINCE A SHELL INCIDENT', 70.3, 9.6, -20, Math.PI / 2, 22, 1.4, '#2e7d32');
  wallSign('LAITRAM', 111.8, 7, hqB.z, -Math.PI / 2, 14, 2.4);
  wallSign('LAPEYRE STAIR', 105, 8.5, -77.0, 0, 22, 2.2);
  wallSign('LAITRAM DISTRIBUTION', wh.x, 9, 72.6, Math.PI, 26, 2.4);
  wallSign('WEST DOCK', -140.3, 7, 90, -Math.PI / 2, 12, 1.8, '#b8651f');
  wallSign('LAITRAM PHARMACY', -163.9, 3, 40, Math.PI / 2, 12, 1.4, '#a83a3a');

  // Street signs.
  const streetSign = (text, x, z, rotY) => {
    box(0.25, 3.4, 0.25, M.signPost, x, 1.7, z);
    wallSign(text, x, 3.2, z, rotY, 4.5, 0.8, '#2e7d32');
  };
  streetSign('LAITRAM LN', -10, -47, Math.PI / 4);
  streetSign('STOREY ST', 150, -47, -Math.PI / 4);
  streetSign('PLANTATION ST', 16, 117, Math.PI / 4);

  return { colliders, bounds: WORLD_BOUNDS };
}

function addCar(world, colliders, x, z, rotY) {
  const palette = [0x9a3b3b, 0x3b6a9a, 0x8a8d90, 0x42703d, 0xd9d9d9, 0x2f3338, 0xb8651f];
  const color = palette[Math.abs(Math.floor(x * 7 + z * 13)) % palette.length];
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 4.4), mat(color));
  body.position.y = 0.75;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 2.2), mat(0x222a30));
  cabin.position.set(0, 1.5, -0.2);
  cabin.castShadow = true;
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
  const wheelMat = mat(0x1a1a1a);
  for (const [wx, wz] of [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.4, wz);
    g.add(w);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  world.add(g);
  colliders.push(makeCollider(x, z, 2.6, 4.8));
}

function addTruck(world, colliders, x, z, rotY, cabColor = 0xc23b3b) {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 2.4), mat(cabColor));
  cab.position.set(0, 1.6, 6.2);
  cab.castShadow = true;
  g.add(cab);
  const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.2, 10), mat(0xdedede));
  trailer.position.set(0, 2.1, 0);
  trailer.castShadow = true;
  g.add(trailer);
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 8);
  const wheelMat = mat(0x1a1a1a);
  for (const [wx, wz] of [[-1.2, 6.2], [1.2, 6.2], [-1.2, -3.5], [1.2, -3.5], [-1.2, -2], [1.2, -2]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.55, wz);
    g.add(w);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  world.add(g);
  const along = Math.abs(Math.sin(rotY)) > 0.5;
  colliders.push(makeCollider(x, z, along ? 16 : 3.2, along ? 3.2 : 16));
}

function addForklift(world, colliders, x, z) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 2.6), mat(0xe8a020));
  body.position.y = 1;
  body.castShadow = true;
  g.add(body);
  const mast = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3, 0.3), mat(0x444a4f));
  mast.position.set(0, 1.8, 1.5);
  g.add(mast);
  const fork = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.4), mat(0x9ba0a3));
  fork.position.set(0, 0.25, 2.3);
  g.add(fork);
  const cage = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), mat(0x2f3338));
  cage.position.set(0, 2.2, -0.4);
  g.add(cage);
  g.position.set(x, 0, z);
  g.rotation.y = -0.5;
  world.add(g);
  colliders.push(makeCollider(x, z, 3, 3.4));
}
