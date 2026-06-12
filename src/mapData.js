import * as THREE from 'three';
import { makeCollider } from './collision.js';

// Low-poly approximation of the Laitram/Intralox campus area in
// Harahan/Elmwood, Louisiana: large white manufacturing buildings, an
// office headquarters, parking lots, loading docks, a drainage canal,
// live oaks and palms, all inside a fenced industrial property.

export const WORLD_BOUNDS = { minX: -180, maxX: 180, minZ: -140, maxZ: 145 };

export const POI = {
  spawn: new THREE.Vector3(0, 0, 118),
  hq: new THREE.Vector3(-60, 0, 32),
  plantDock: new THREE.Vector3(45, 0, -36),
  plantEastDock: new THREE.Vector3(118, 0, -36),
  warehouseFront: new THREE.Vector3(-100, 0, -44),
  westDock: new THREE.Vector3(-140, 0, -60),
  breakArea: new THREE.Vector3(-18, 0, -42),
  guardShack: new THREE.Vector3(9, 0, 120),
  machineryFront: new THREE.Vector3(110, 0, 26),
  wrench: new THREE.Vector3(-146, 0, -64),
  partsBox: new THREE.Vector3(112, 0, -34)
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
  ctx.fillText(text, w / 2, h / 2 + 4);
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
    truckCab: mat(0xc23b3b),
    trailer: mat(0xdedede),
    forkliftBody: mat(0xe8a020),
    forkliftMast: mat(0x444a4f),
    tableWood: mat(0x9c6b3f),
    signPost: mat(0x55595d),
    concrete: mat(0xc4c2ba),
    yellow: mat(0xd9b13b)
  };

  // ---- Ground ----
  flat(380, 305, M.grass, 0, 0, 0);

  // ---- Roads ----
  // Laitram Lane: main north-south road from the entrance.
  flat(12, 250, M.asphalt, 0, 15, 0.04);
  // East-west campus road.
  flat(340, 12, M.asphalt, 0, -16, 0.04);
  // South lot access road.
  flat(150, 10, M.asphalt, -75, 70, 0.04);
  // East access to machinery building and east lot.
  flat(10, 90, M.asphalt, 110, 0, 0.04);
  // Concrete truck aprons at the loading docks.
  flat(120, 20, M.asphalt, 75, -33, 0.035);
  flat(92, 18, M.asphalt, -101, -37, 0.035);
  flat(32, 44, M.asphalt, -154, -68, 0.035);

  // Road center lines.
  for (let z = 130; z > -105; z -= 14) flat(0.5, 6, M.roadLine, 0, z, 0.06);
  for (let x = -160; x < 165; x += 14) {
    if (Math.abs(x) > 8) flat(6, 0.5, M.roadLine, x, -16, 0.06);
  }

  // ---- Sidewalks ----
  flat(4, 250, M.sidewalk, -9, 15, 0.05);
  flat(4, 250, M.sidewalk, 9, 15, 0.05);
  flat(70, 4, M.sidewalk, -60, 50, 0.05);
  flat(50, 4, M.sidewalk, 110, 38, 0.05);
  flat(80, 4, M.sidewalk, -100, -42, 0.05);

  // ---- Buildings ----

  // Headquarters office (Laitram LLC) - southwest of center crossing.
  const hq = { x: -60, z: 20, sx: 60, sz: 30 };
  box(hq.sx, 14, hq.sz, M.officeWall, hq.x, 7, hq.z, { collide: true });
  box(hq.sx + 1, 1.2, hq.sz + 1, M.roof, hq.x, 14.6, hq.z, { castShadow: false });
  // Window bands.
  for (const wy of [4, 8, 12]) {
    box(hq.sx + 0.3, 1.6, hq.sz + 0.3, M.glass, hq.x, wy, hq.z, { castShadow: false });
  }
  // Entry canopy facing south.
  box(14, 0.8, 6, M.blueTrim, hq.x, 4.6, hq.z + hq.sz / 2 + 3);
  box(0.6, 4.2, 0.6, M.concrete, hq.x - 6, 2.1, hq.z + hq.sz / 2 + 5.4);
  box(0.6, 4.2, 0.6, M.concrete, hq.x + 6, 2.1, hq.z + hq.sz / 2 + 5.4);

  // Intralox manufacturing plant - large white building, northeast.
  const plant = { x: 70, z: -75, sx: 130, sz: 60 };
  box(plant.sx, 16, plant.sz, M.whiteWall, plant.x, 8, plant.z, { collide: true });
  box(plant.sx + 1, 1.4, plant.sz + 1, M.roof, plant.x, 16.7, plant.z, { castShadow: false });
  box(plant.sx + 0.3, 2.2, plant.sz + 0.3, M.blueTrim, plant.x, 13.5, plant.z, { castShadow: false });
  // Rooftop units.
  for (const rx of [30, 60, 95, 120]) {
    box(8, 3, 6, M.roof, plant.x - plant.sx / 2 + rx, 18.9, plant.z - 8);
  }

  // Loading docks on the plant's south face (shipping) and east end (receiving).
  const dockZ = plant.z + plant.sz / 2; // -45
  box(50, 1.3, 6, M.dock, 45, 0.65, dockZ + 3, { collide: true });
  for (const dx of [25, 40, 55, 65]) {
    box(6, 5, 0.4, M.dockDoor, dx, 3.2, dockZ + 0.3, { castShadow: false });
  }
  box(20, 1.3, 6, M.dock, 118, 0.65, dockZ + 3, { collide: true });
  box(6, 5, 0.4, M.dockDoor, 114, 3.2, dockZ + 0.3, { castShadow: false });
  box(6, 5, 0.4, M.dockDoor, 122, 3.2, dockZ + 0.3, { castShadow: false });

  // Warehouse / distribution (west side) with the west dock.
  const wh = { x: -100, z: -75, sx: 70, sz: 44 };
  box(wh.sx, 13, wh.sz, M.whiteWall, wh.x, 6.5, wh.z, { collide: true });
  box(wh.sx + 1, 1.2, wh.sz + 1, M.roof, wh.x, 13.6, wh.z, { castShadow: false });
  box(wh.sx + 0.3, 2, wh.sz + 0.3, M.yellow, wh.x, 10.8, wh.z, { castShadow: false });
  // West dock platform on the warehouse's west face.
  box(6, 1.3, 26, M.dock, wh.x - wh.sx / 2 - 3, 0.65, wh.z + 8, { collide: true });
  box(0.4, 5, 6, M.dockDoor, wh.x - wh.sx / 2 - 0.3, 3.2, wh.z + 4, { castShadow: false });
  box(0.4, 5, 6, M.dockDoor, wh.x - wh.sx / 2 - 0.3, 3.2, wh.z + 14, { castShadow: false });
  // Front roll-up doors facing south.
  box(8, 6, 0.4, M.dockDoor, wh.x - 14, 3.2, wh.z + wh.sz / 2 + 0.3, { castShadow: false });
  box(8, 6, 0.4, M.dockDoor, wh.x + 14, 3.2, wh.z + wh.sz / 2 + 0.3, { castShadow: false });

  // Laitram Machinery building (southeast).
  const lm = { x: 110, z: 60, sx: 56, sz: 40 };
  box(lm.sx, 11, lm.sz, M.officeWall, lm.x, 5.5, lm.z, { collide: true });
  box(lm.sx + 1, 1.2, lm.sz + 1, M.roof, lm.x, 11.6, lm.z, { castShadow: false });
  box(lm.sx + 0.3, 1.8, lm.sz + 0.3, M.blueTrim, lm.x, 9, lm.z, { castShadow: false });

  // Guard shack at the entrance.
  box(5, 3.6, 5, M.officeWall, 9, 1.8, 120, { collide: true });
  box(6.5, 0.5, 6.5, M.roof, 9, 3.85, 120, { castShadow: false });
  box(2.2, 1.2, 0.3, M.glass, 9, 2.2, 117.4, { castShadow: false });

  // Break pavilion between buildings.
  const pav = { x: -18, z: -48 };
  box(16, 0.4, 12, M.concrete, pav.x, 0.2, pav.z, { castShadow: false });
  for (const [px, pz] of [[-7, -5], [7, -5], [-7, 5], [7, 5]]) {
    box(0.5, 4, 0.5, M.signPost, pav.x + px, 2, pav.z + pz, { collide: true });
  }
  box(18, 0.5, 14, M.blueTrim, pav.x, 4.2, pav.z, { castShadow: false });
  // Picnic tables.
  for (const tx of [-4, 4]) {
    box(4, 0.3, 2, M.tableWood, pav.x + tx, 1.1, pav.z, { collide: true });
    box(4, 0.2, 0.8, M.tableWood, pav.x + tx, 0.65, pav.z - 1.6);
    box(4, 0.2, 0.8, M.tableWood, pav.x + tx, 0.65, pav.z + 1.6);
  }
  // Coffee drum prop.
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.4, 10), M.barrelOrange);
  coffee.position.set(pav.x - 7, 0.9, pav.z + 4);
  coffee.castShadow = true;
  world.add(coffee);

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
  paintLot(-75, 100, 110, 36, 2, 30, 0.55);
  paintLot(145, -5, 60, 50, 3, 16, 0.4);

  // ---- Trucks at docks ----
  addTruck(world, colliders, 32, -32, Math.PI);
  addTruck(world, colliders, 58, -32, Math.PI);
  addTruck(world, colliders, -148, -84, Math.PI / 2);

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

  // Oaks along Laitram Lane and around HQ.
  for (const z of [95, 60, 25]) {
    oak(-16, z, 1.1);
    oak(16, z, 1);
  }
  oak(-105, 45, 1.3);
  oak(-30, 45, 1.1);
  oak(-160, 20, 1.2);
  oak(-160, -20, 1);
  oak(60, 55, 1.1);
  oak(40, 90, 1.2);
  oak(-40, -28, 0.9);
  // Palms at the entrance and HQ.
  palm(-14, 128);
  palm(14, 128);
  palm(-88, 42);
  palm(-32, 42);

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

  // ---- Props: pallets, crates, barrels, forklift ----
  const palletStack = (x, z, layers) => {
    for (let i = 0; i < layers; i++) {
      box(2.4, 0.3, 2.4, M.pallet, x, 0.15 + i * 0.32, z, { collide: i === 0 });
    }
  };
  palletStack(-140, -56, 4);
  palletStack(-140, -66, 2);
  palletStack(-137, -61, 6);
  palletStack(38, -34, 3);
  palletStack(122, -30, 2);
  box(2, 2, 2, M.crate, -134, 1, -68, { collide: true });
  box(1.6, 1.6, 1.6, M.crate, -132, 0.8, -64, { collide: true });
  box(2, 2, 2, M.crate, 50, 1, -34, { collide: true });

  const barrel = (x, z, material) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.6, 10), material);
    b.position.set(x, 0.8, z);
    b.castShadow = true;
    world.add(b);
    colliders.push(makeCollider(x, z, 1.4, 1.4));
  };
  barrel(28, -33, M.barrelBlue);
  barrel(29.4, -33.6, M.barrelOrange);
  barrel(-130, -90, M.barrelBlue);
  barrel(120, 42, M.barrelOrange);

  addForklift(world, colliders, 70, -34);

  // ---- Signs ----
  // Monument sign at the entrance.
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
  monument(-12, 134, 'LAITRAM');

  // Wall signs.
  const wallSign = (text, x, y, z, rotY, w = 24, h = 3, bg = '#1f5fa8') => {
    const s = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: textTexture(text, { bg }) })
    );
    s.position.set(x, y, z);
    s.rotation.y = rotY;
    world.add(s);
  };
  wallSign('INTRALOX', 60, 12, dockZ + 0.45, 0, 30, 4);
  wallSign('SHIPPING', 45, 7.5, dockZ + 0.4, 0, 12, 1.6, '#b8651f');
  wallSign('RECEIVING', 118, 7.5, dockZ + 0.4, 0, 12, 1.6, '#b8651f');
  wallSign('LAITRAM DISTRIBUTION', wh.x, 9, wh.z + wh.sz / 2 + 0.4, 0, 26, 2.4);
  wallSign('WEST DOCK', wh.x - wh.sx / 2 - 0.4, 7, wh.z + 8, -Math.PI / 2, 12, 1.8, '#b8651f');
  wallSign('LAITRAM MACHINERY', lm.x, 8, lm.z - lm.sz / 2 - 0.4, Math.PI, 26, 2.4);
  wallSign('LAITRAM LLC', hq.x, 11.5, hq.z + hq.sz / 2 + 0.4, 0, 18, 2.2);
  wallSign('SAFETY FIRST: 412 DAYS SINCE A SHELL INCIDENT', 95, 5, dockZ + 0.4, 0, 26, 1.6, '#2e7d32');

  // Street sign for Laitram Lane.
  box(0.25, 3.4, 0.25, M.signPost, 7, 1.7, 100);
  wallSign('LAITRAM LN', 7, 3.2, 100, Math.PI / 4, 4, 0.8, '#2e7d32');

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

function addTruck(world, colliders, x, z, rotY) {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 2.4), mat(0xc23b3b));
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
