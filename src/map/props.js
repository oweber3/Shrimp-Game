import * as THREE from 'three';
import { makeCollider } from '../collision.js';
import { createDecalBatch } from '../utils/geometry.js';
import { addCar, addTruck, addForklift } from './vehicles.js';
import {
  CARGO_PLACEMENTS,
  PARKED_VEHICLES,
  PARKING_LOTS,
  parkedCarsForLot,
} from './placementData.js';

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

  // Guarding the LM north roll-up doors from the clear side of the canonical
  // Machinery envelope (its north edge is z=20).
  for (const bx of [37, 47, 55, 65]) bollard(bx, 18.7);
  // Guarding the warehouse roll-up doors on the Plantation Rd face.
  for (const bx of [-95.5, -86.5, -65.5, -56.5]) bollard(bx, -119.5);

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

  // All cargo consumes the centralized, footprint-validated placement set.
  // Collision behavior is unchanged: the lowest pallet, every crate, and
  // every barrel still contributes a collider.
  for (const item of CARGO_PLACEMENTS) {
    if (item.type === 'pallet') {
      palletStack(item.x, item.z, item.layers);
    } else if (item.type === 'crate') {
      box(item.sx, item.height, item.sz, M.crate, item.x, item.height / 2, item.z, { collide: true });
    } else if (item.type === 'barrelBlue') {
      barrel(item.x, item.z, M.barrelBlue);
    } else if (item.type === 'barrelOrange') {
      barrel(item.x, item.z, M.barrelOrange);
    }
  }

  // ---- Trucks and the forklift ----
  // The former east-court and LM north-strip vehicles now join the existing
  // Distribution dock fleet. The 301-front truck remains in its legal verge.
  for (const vehicle of PARKED_VEHICLES) {
    if (vehicle.type === 'truck') {
      addTruck(world, colliders, vehicle.x, vehicle.z, vehicle.rotY, vehicle.color);
    } else if (vehicle.type === 'forklift') {
      addForklift(world, colliders, vehicle.x, vehicle.z);
    }
  }

  // ---- Parking lots (paving, stripes, wheel stops, parked cars) ----
  // Phase 9 weathering: deterministic oil-drip spots in a subset of stalls,
  // batched into a single transparent mesh.
  const oil = createDecalBatch(world, 'oil');
  const paintLot = (lot) => {
    const { x, z, sx, sz, rows, cols } = lot;
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
      }
    }
    for (const car of parkedCarsForLot(lot)) {
      addCar(world, colliders, car.x, car.z, car.rotY);
    }
  };
  // Lots keep a grass verge off the Laitram Ln roadbed (z 96.5..103.5) so the
  // street reads as a street rather than one continuous paved apron.
  for (const lot of PARKING_LOTS) paintLot(lot);

  // Forklift traffic stains at the two busiest docks.
  oil.addGround(60, 16.5, 2.2, 2.6, 0.8);
  oil.addGround(-123, -97, 2, 2.4, 2.1);
  oil.commit();
}
