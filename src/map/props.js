import * as THREE from 'three';
import { makeCollider } from '../collision.js';
import { createDecalBatch } from '../utils/geometry.js';
import { addCar, addTruck, addForklift } from './vehicles.js';

// Campus dressing: parked vehicles, parking lots, pallets, crates,
// barrels, and bollards. Trees and the canal live in landscaping.js.

export function addProps(ctx) {
  const { world, colliders, M, box, flat } = ctx;

  const bollard = (x, z) => {
    const bol = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1, 8), M.yellow);
    bol.position.set(x, 0.5, z);
    bol.castShadow = true;
    world.add(bol);
    colliders.push(makeCollider(x, z, 0.6, 0.6));
  };

  // Guarding the LM north roll-up doors.
  for (const bx of [21, 31, 39, 49]) bollard(bx, -41.2);
  // Guarding the warehouse front roll-up doors.
  for (const bx of [-119.5, -110.5, -89.5, -80.5]) bollard(bx, 71.3);

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
  // Backed up to the 301B shipping door on Toler St.
  addTruck(world, colliders, 52, -79.5, 0, 0x3b6a9a);
  addForklift(world, colliders, 94, -2);

  // ---- Parking lots (paving, stripes, wheel stops, parked cars) ----
  // Phase 9 weathering: deterministic oil-drip spots in a subset of stalls,
  // batched into a single transparent mesh.
  const oil = createDecalBatch(world, 'oil');
  const paintLot = (x, z, sx, sz, rows, cols, carChance) => {
    flat(sx, sz, M.asphalt, x, z, 0.04);
    const spotW = 3, spotD = 6;
    for (let r = 0; r < rows; r++) {
      // Head line across the top of the whole row of spots.
      const rowZ = z - sz / 2 + 4 + r * (spotD + 6);
      const firstX = x - sx / 2 + 6;
      const lastX = firstX + (cols - 1) * spotW;
      flat(lastX - firstX + 0.3, 0.3, M.roadLine, (firstX + lastX) / 2, rowZ, 0.06);
      for (let c = 0; c < cols; c++) {
        const px = firstX + c * spotW;
        const pz = rowZ;
        flat(0.3, spotD, M.roadLine, px, pz + spotD / 2, 0.06);
        if (c < cols - 1) {
          // Concrete wheel stop near the head of each spot.
          box(2, 0.18, 0.3, M.concrete, px + spotW / 2, 0.09, pz + 0.8, { castShadow: false });
        }
        const stallJitter = Math.sin(px * 9.7 + pz * 5.3) * 0.5 + 0.5;
        if (stallJitter > 0.62) {
          // Oil spot where the engine sits (rear half of the stall).
          oil.addGround(
            px + spotW / 2,
            pz + spotD * 0.6 + (stallJitter - 0.8),
            1 + stallJitter,
            1.2 + stallJitter,
            stallJitter * Math.PI
          );
        }
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

  // Forklift traffic stains at the two busiest docks.
  oil.addGround(92, -4, 2.2, 2.6, 0.8);
  oil.addGround(-148, 92, 2, 2.4, 2.1);
  oil.commit();
}
