import * as THREE from 'three';
import { makeCollider } from '../collision.js';
import { mat, textTexture } from '../utils/geometry.js';

// All campus building geometry: shells, docks, doors, rooftop/exterior
// equipment, the break pavilion, and every sign on campus.

export function addBuildings(ctx) {
  const { world, colliders, M, box } = ctx;

  // ---- Intralox plant (long building, west side) ----
  const plant = { x: -100, z: -27, sx: 75, sz: 160 };
  box(plant.sx, 16, plant.sz, M.whiteWall, plant.x, 8, plant.z, { collide: true });
  box(plant.sx + 1, 1.4, plant.sz + 1, M.roof, plant.x, 16.7, plant.z, { castShadow: false });
  box(plant.sx + 0.3, 2.2, plant.sz + 0.3, M.blueTrim, plant.x, 13.5, plant.z, { castShadow: false });
  for (let rz = -95; rz <= 35; rz += 26) {
    box(8, 3, 6, M.roof, plant.x - 12, 18.9, rz);
    box(6, 2.4, 5, M.roof, plant.x + 14, 18.6, rz + 12);
  }
  // Clerestory glass strips high on the long east and west faces.
  box(0.3, 1.6, 140, M.glass, -62.5, 10.5, plant.z, { castShadow: false });
  box(0.3, 1.6, 140, M.glass, -137.5, 10.5, plant.z, { castShadow: false });
  // Shipping dock on the east face, facing the main drive.
  box(6, 1.3, 30, M.dock, -59, 0.65, -5, { collide: true });
  for (const dz of [-16, -8, 0, 8]) {
    box(0.4, 5, 6, M.dockDoor, -62.2, 3.2, dz, { castShadow: false });
  }

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
  // Window mullions across the office front glass (skip the entry doors).
  for (let mx = 18; mx <= 52; mx += 4) {
    if (Math.abs(mx - 35) < 2) continue;
    box(0.3, 4.5, 0.3, M.metal, mx, 4, 19.35, { castShadow: false });
  }

  // Receiving dock on the east face, into the truck court.
  box(6, 1.3, 24, M.dock, 73, 0.65, -20, { collide: true });
  for (const dz of [-28, -20, -12]) {
    box(0.4, 5, 6, M.dockDoor, 70.2, 3.2, dz, { castShadow: false });
    box(0.3, 0.5, 1, M.fence, 76.2, 1.05, dz); // dock bumpers
  }
  // Grade-level roll-up doors on the north face, off Laitram Ln.
  box(8, 6, 0.4, M.dockDoor, 26, 3.2, -39.7, { castShadow: false });
  box(8, 6, 0.4, M.dockDoor, 44, 3.2, -39.7, { castShadow: false });

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
  // Window mullions on all four faces, spanning both glass bands.
  for (let mx = 116; mx <= 144; mx += 4) {
    box(0.3, 5.5, 0.7, M.metal, mx, 4.75, -38.3, { castShadow: false }); // north
    if (Math.abs(mx - hqB.x) >= 6) {
      box(0.3, 5.5, 0.7, M.metal, mx, 4.75, -1.7, { castShadow: false }); // south (skip entry)
    }
  }
  for (let mz = -34; mz <= -6; mz += 4) {
    box(0.7, 5.5, 0.3, M.metal, 111.7, 4.75, mz, { castShadow: false }); // west
    box(0.7, 5.5, 0.3, M.metal, 148.3, 4.75, mz, { castShadow: false }); // east
  }

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
  // Rooftop HVAC units.
  box(5, 1.8, 4, M.hvac, -125, 15.1, 95);
  box(5, 1.8, 4, M.hvac, -100, 15.1, 90);
  box(5, 1.8, 4, M.hvac, -75, 15.1, 98);

  // ---- Laitram Pharmacy (far southwest corner) ----
  box(14, 5, 18, M.officeWall, -171, 2.5, 40, { collide: true });
  box(15, 0.7, 19, M.roof, -171, 5.35, 40, { castShadow: false });
  box(2, 1, 1.5, M.hvac, -174, 6.2, 44); // rooftop AC

  // ---- Guard shack at the Plantation St gate ----
  box(5, 3.6, 5, M.officeWall, 8, 1.8, 112, { collide: true });
  box(6.5, 0.5, 6.5, M.roof, 8, 3.85, 112, { castShadow: false });
  box(0.3, 1.2, 2.2, M.glass, 5.6, 2.2, 112, { castShadow: false });

  addSigns(ctx, { lm, hqB, wh });
}

function addSigns({ world, colliders, M, box }, { lm, hqB, wh }) {
  // ---- Monument signs ----
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

  // ---- Wall signs ----
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

  // ---- Street signs ----
  const streetSign = (text, x, z, rotY) => {
    box(0.25, 3.4, 0.25, M.signPost, x, 1.7, z);
    wallSign(text, x, 3.2, z, rotY, 4.5, 0.8, '#2e7d32');
  };
  streetSign('LAITRAM LN', -10, -47, Math.PI / 4);
  streetSign('STOREY ST', 150, -47, -Math.PI / 4);
  streetSign('PLANTATION ST', 16, 117, Math.PI / 4);

  // ---- Image signs ----
  // Each sign is a dark-framed billboard on two posts that loads a WebP texture.
  // The face plane is resized to the image's natural aspect ratio after load.
  const imgLoader = new THREE.TextureLoader();

  const addImageSign = (imgPath, x, z, rotY) => {
    const H = 6;              // sign height (world units)
    const signY = H / 2 + 2; // billboard centre height above ground

    // Posts are offset perpendicular to the sign face direction.
    // When face points ±X (rotY ≈ ±PI/2), width runs along Z → offset in Z.
    // When face points ±Z (rotY ≈ 0 or PI),  width runs along X → offset in X.
    const faceAlongZ = Math.abs(Math.cos(rotY)) < 0.01;
    const postH = signY + H / 2 + 0.5;
    const off = 2.5;
    if (faceAlongZ) {
      box(0.3, postH, 0.3, M.signPost, x, postH / 2, z - off);
      box(0.3, postH, 0.3, M.signPost, x, postH / 2, z + off);
      colliders.push(makeCollider(x, z, 0.7, off * 2 + 0.7));
    } else {
      box(0.3, postH, 0.3, M.signPost, x - off, postH / 2, z);
      box(0.3, postH, 0.3, M.signPost, x + off, postH / 2, z);
      colliders.push(makeCollider(x, z, off * 2 + 0.7, 0.7));
    }

    // Dark frame — thin slab slightly behind the image face.
    const frameMesh = new THREE.Mesh(
      new THREE.BoxGeometry(5.4, H + 0.4, 0.14),
      mat(0x1a1a1a)
    );
    frameMesh.position.set(x, signY, z);
    frameMesh.rotation.y = rotY;
    world.add(frameMesh);

    // Image face (placeholder grey until texture loads).
    const faceMat = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      side: THREE.DoubleSide
    });
    const faceMesh = new THREE.Mesh(new THREE.PlaneGeometry(5, H), faceMat);
    faceMesh.position.set(x, signY, z);
    faceMesh.rotation.y = rotY;
    faceMesh.translateZ(0.09);
    faceMesh.renderOrder = 1;
    world.add(faceMesh);

    imgLoader.load(
      imgPath,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const aspect = tex.image.width / tex.image.height;
        const W = H * aspect;
        faceMesh.geometry.dispose();
        faceMesh.geometry = new THREE.PlaneGeometry(W, H);
        frameMesh.geometry.dispose();
        frameMesh.geometry = new THREE.BoxGeometry(W + 0.4, H + 0.4, 0.14);
        faceMat.map = tex;
        faceMat.color.set(0xffffff);
        faceMat.needsUpdate = true;
      },
      undefined,
      () => { console.error('[ImageSign] Failed to load:', imgPath); }
    );
  };

  // Sign 1 – east of the entrance drive, near the guard shack.
  // Faces west so the player sees it while walking the main campus drive.
  addImageSign(import.meta.env.BASE_URL + 'sign-image-1.webp', 28, 108, -Math.PI / 2);

  // Sign 2 – south-east of the break pavilion / LM front lot.
  // Faces west toward the main campus interior.
  addImageSign(import.meta.env.BASE_URL + 'sign-image-2.webp', 95, 42, -Math.PI / 2);
}
