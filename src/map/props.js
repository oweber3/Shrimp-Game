import * as THREE from 'three';
import { makeCollider } from '../collision.js';
import { mat } from '../utils/geometry.js';

// Movable-looking campus dressing: vehicles, parking lots, trees,
// pallets, crates, barrels, and bollards.

export function addProps(ctx) {
  const { world, colliders, M, box, flat } = ctx;

  // ---- Bollards guarding the LM north roll-up doors ----
  for (const bx of [21, 31, 39, 49]) {
    const bol = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1, 8), M.yellow);
    bol.position.set(bx, 0.5, -41.2);
    bol.castShadow = true;
    world.add(bol);
    colliders.push(makeCollider(bx, -41.2, 0.6, 0.6));
  }

  // ---- Pallets, crates and barrels ----
  const palletStack = (x, z, layers) => {
    for (let i = 0; i < layers; i++) {
      box(2.4, 0.3, 2.4, M.pallet, x, 0.15 + i * 0.32, z, { collide: i === 0 });
    }
  };
  const barrel = (x, z, material) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.6, 10), material);
    b.position.set(x, 0.8, z);
    b.castShadow = true;
    world.add(b);
    colliders.push(makeCollider(x, z, 1.4, 1.4));
  };

  // Around the LM docks.
  palletStack(21, -43.5, 3);
  palletStack(24, -43.5, 2);
  palletStack(88, -10, 4);
  palletStack(88, -6.5, 2);
  palletStack(91, -8, 3);
  box(2, 2, 2, M.crate, 96, 1, -30, { collide: true });
  box(1.6, 1.6, 1.6, M.crate, 99, 0.8, -27.5, { collide: true });
  barrel(96, -33.2, M.barrelBlue);
  barrel(97.4, -33.8, M.barrelOrange);

  // Backlog at the warehouse west dock.
  palletStack(-149, 84, 4);
  palletStack(-149, 87.5, 2);
  palletStack(-151, 96, 6);
  box(2, 2, 2, M.crate, -152, 1, 100, { collide: true });
  box(1.6, 1.6, 1.6, M.crate, -149.5, 0.8, 102.5, { collide: true });
  barrel(-153, 79, M.barrelBlue);

  // ---- Trucks and the forklift ----
  // Backed up to the Intralox shipping dock.
  addTruck(world, colliders, -48, -8, Math.PI / 2);
  addTruck(world, colliders, -48, 8, Math.PI / 2, 0x3b6a9a);
  // Box truck parallel-parked on the LM north service strip.
  addTruck(world, colliders, 36, -46.5, Math.PI / 2, 0xdedede);
  // Backed up to the LM east receiving dock.
  addTruck(world, colliders, 84, -25, Math.PI / 2);
  // At the warehouse west dock.
  addTruck(world, colliders, -160, 70, 0, 0xc23b3b);
  addForklift(world, colliders, 94, -2);

  // ---- Parking lots (paving, stripes, parked cars) ----
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
