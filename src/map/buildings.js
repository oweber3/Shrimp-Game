import * as THREE from 'three';
import { makeCollider } from '../collision.js';
import { mat, textTexture, createDecalBatch } from '../utils/geometry.js';
import {
  BREAK_AREA_CENTER,
  BUILDING_BY_ID,
  translateLaitramMachineryPoint,
  warnIfOverlapping,
} from './layoutData.js';
import {
  IMAGE_SIGNS,
  MONUMENT_SIGNS,
  STREET_SIGNS,
} from './placementData.js';

// All campus building geometry: shells, docks, doors, rooftop/exterior
// equipment, the break pavilion, and every sign on campus.

export function addBuildings(ctx) {
  const { world, colliders, M, box } = ctx;

  // ---- 301 Plantation Road row (east edge, north to south) ----
  const wallVariants = [M.whiteWall, M.whiteWallB, M.whiteWallC];
  const n301 = ['plantation-301fo', 'plantation-301a', 'plantation-301b', 'plantation-301c']
    .map((id) => BUILDING_BY_ID[id]);
  n301.forEach((b, i) => {
    box(b.sx, b.height, b.sz, wallVariants[i % 3], b.cx, b.height / 2, b.cz, { collide: true });
    box(b.sx + 1, 1.1, b.sz + 1, M.roof, b.cx, b.height + 0.55, b.cz, { castShadow: false });
    box(b.sx + 0.3, 1.6, b.sz + 0.3, M.blueTrim, b.cx, b.height - 1.6, b.cz, { castShadow: false });
  });
  const n301a = BUILDING_BY_ID['plantation-301a'];
  const n301b = BUILDING_BY_ID['plantation-301b'];
  for (const dz of [-25, 0, 25]) box(7, 2.4, 6, M.roof, n301a.cx, n301a.height + 1.7, n301a.cz + dz);
  // 301B shipping dock and roll-up door face west toward Toler Street.
  box(6, 1.3, 18, M.dock, n301b.cx - n301b.sx / 2 - 3, 0.65, n301b.cz, { collide: true });
  box(0.4, 5, 7, M.dockDoor, n301b.cx - n301b.sx / 2 - 0.2, 2.7, n301b.cz, { castShadow: false });

  // ---- 5211 Storey / 220R Laitram Ln — Machine Shop ----
  const machine = BUILDING_BY_ID['storey-5211'];
  box(machine.sx, machine.height, machine.sz, M.whiteWallC, machine.cx, machine.height / 2, machine.cz, { collide: true });
  box(machine.sx + 1, 1.3, machine.sz + 1, M.roof, machine.cx, machine.height + 0.65, machine.cz, { castShadow: false });
  box(machine.sx + 0.3, 2, machine.sz + 0.3, M.blueTrim, machine.cx, machine.height - 2, machine.cz, { castShadow: false });
  for (const dz of [-11, 11]) {
    box(0.4, 6, 8, M.dockDoor, machine.cx - machine.sx / 2 - 0.2, 3.2, machine.cz + dz, { castShadow: false });
  }
  for (const dx of [-18, 0, 18]) box(7, 2.6, 6, M.hvac, machine.cx + dx, machine.height + 1.8, machine.cz);

  // ---- Laitram Machinery complex (single +16,+65 translation) ----
  // The shell mesh has no blanket collider: the interior (src/map/interior.js)
  // is walkable. `sx/sz` is the canonical overall map envelope; the detailed
  // production shell remains its original 60 x 50, with the office annex and
  // all detail retaining their exact local offsets.
  const lm = BUILDING_BY_ID['laitram-machinery'];
  const at = (x, z) => translateLaitramMachineryPoint(x, z);
  const lmBox = (sx, sy, sz, material, x, y, z, opts) => {
    const p = at(x, z);
    return box(sx, sy, sz, material, p.x, y, p.z, opts);
  };
  box(lm.shellSx, lm.height, lm.shellSz, M.whiteWall, lm.cx, lm.height / 2, lm.cz);
  for (const [x, z, sx, sz] of [
    [10, -15, 1.4, 50.8], [70, -15, 1.4, 50.8], [40, -40, 60.8, 1.4],
    [20, 10, 20.4, 1.4], [55, 10, 30.4, 1.4],
  ]) {
    const p = at(x, z);
    colliders.push(makeCollider(p.x, p.z, sx, sz));
  }
  box(lm.shellSx + 1, 1.3, lm.shellSz + 1, M.roof, lm.cx, 14.65, lm.cz, { castShadow: false });
  box(lm.shellSx + 0.3, 2, lm.shellSz + 0.3, M.blueTrim, lm.cx, 11.4, lm.cz, { castShadow: false });
  box(lm.shellSx + 0.3, 1.3, lm.shellSz + 0.3, M.glass, lm.cx, 9, lm.cz, { castShadow: false });
  for (const [rx, rz] of [[24, -28], [40, -12], [56, -28]]) {
    lmBox(7, 2.8, 5, M.roof, rx, 16.7, rz);
  }
  // Office front section on the south face — wall slabs with a real doorway
  // (x 32.5..37.5) so the lobby behind it is walkable. The lintel has no
  // collider: collision is 2D, so a collider there would block the door.
  lmBox(17.5, 8, 0.9, M.officeWall, 23.75, 4, 19, { collide: true });
  lmBox(17.5, 8, 0.9, M.officeWall, 46.25, 4, 19, { collide: true });
  lmBox(5.4, 4.8, 0.9, M.officeWall, 35, 5.6, 19);
  lmBox(0.9, 8, 9, M.officeWall, 15.45, 4, 14.5, { collide: true });
  lmBox(0.9, 8, 9, M.officeWall, 54.55, 4, 14.5, { collide: true });
  // Dark doorway backdrop: reads as an open entrance from outside, and is
  // culled with the rest of the exterior once the player steps in.
  lmBox(4.6, 3.1, 0.12, mat(0x1b2126), 35, 1.6, 18.6);
  lmBox(41, 0.8, 10, M.roof, 35, 8.4, 14.5, { castShadow: false });
  for (const wy of [2.5, 5.5]) {
    lmBox(17.9, 1.5, 9.3, M.glass, 23.8, wy, 14.5, { castShadow: false });
    lmBox(17.9, 1.5, 9.3, M.glass, 46.2, wy, 14.5, { castShadow: false });
  }
  lmBox(12, 0.6, 5, M.blueTrim, 35, 4.4, 21.5);
  lmBox(0.5, 4.1, 0.5, M.concrete, 30, 2.05, 23.2);
  lmBox(0.5, 4.1, 0.5, M.concrete, 40, 2.05, 23.2);
  // Window mullions across the office front glass (skip the entry doors).
  for (let mx = 18; mx <= 52; mx += 4) {
    if (Math.abs(mx - 35) < 2) continue;
    lmBox(0.3, 4.5, 0.3, M.metal, mx, 4, 19.35, { castShadow: false });
  }

  // Receiving dock on the east face, into the truck court.
  lmBox(6, 1.3, 24, M.dock, 73, 0.65, -20, { collide: true });
  for (const dz of [-28, -20, -12]) {
    lmBox(0.4, 5, 6, M.dockDoor, 70.2, 3.2, dz, { castShadow: false });
    lmBox(0.3, 0.5, 1, M.fence, 76.2, 1.05, dz);
  }
  // Grade-level roll-up doors on the north face, off Laitram Ln.
  lmBox(8, 6, 0.4, M.dockDoor, 26, 3.2, -39.7, { castShadow: false });
  lmBox(8, 6, 0.4, M.dockDoor, 44, 3.2, -39.7, { castShadow: false });

  // Exterior industrial equipment along the northeast corner of LM.
  const hvacUnit = (x, z) => {
    lmBox(3.4, 1.6, 2, M.hvac, x, 0.8, z, { collide: true });
    const p = at(x, z);
    for (const fx of [-0.8, 0.8]) {
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.2, 10), M.metal);
      fan.position.set(p.x + fx, 1.7, p.z);
      world.add(fan);
    }
  };
  hvacUnit(55, -42.6);
  hvacUnit(60.5, -42.6);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 5, 12), M.tankWhite);
  const tankPos = at(66, -43);
  tank.position.set(tankPos.x, 2.5, tankPos.z);
  tank.castShadow = true;
  world.add(tank);
  const tankCap = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.tankWhite);
  tankCap.position.set(tankPos.x, 5, tankPos.z);
  world.add(tankCap);
  colliders.push(makeCollider(tankPos.x, tankPos.z, 2.6, 2.6));
  lmBox(1.8, 1.8, 1.8, M.metal, 50.5, 0.9, -42.5, { collide: true });
  // Dumpster at the west end of the service strip.
  lmBox(4, 2, 2.5, M.dumpster, 16, 1, -44, { collide: true });
  lmBox(4.1, 0.25, 2.6, M.fence, 16, 2.1, -44, { castShadow: false });

  // The gameplay break pavilion occupies a canonical clear pad south of LM;
  // its translated legacy position blocked Toler St at Laitram Lane.
  const pav = BREAK_AREA_CENTER;
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

  // ---- Distribution Warehouse (canonical NW footprint) ----
  const wh = BUILDING_BY_ID.distribution;
  box(wh.sx, wh.height, wh.sz, M.whiteWallB, wh.cx, wh.height / 2, wh.cz, { collide: true });
  box(wh.sx + 1, 1.2, wh.sz + 1, M.roof, wh.cx, wh.height + 0.6, wh.cz, { castShadow: false });
  box(wh.sx + 0.3, 2, wh.sz + 0.3, M.yellow, wh.cx, wh.height - 2.2, wh.cz, { castShadow: false });
  // West dock platform and doors.
  const whWest = wh.cx - wh.sx / 2;
  const whNorth = wh.cz - wh.sz / 2;
  box(6, 1.3, 26, M.dock, whWest - 3, 0.65, wh.cz, { collide: true });
  for (const dz of [-6, 6]) box(0.4, 5, 6, M.dockDoor, whWest - 0.2, 3.2, wh.cz + dz, { castShadow: false });
  // Front roll-up doors face Plantation Road.
  for (const dx of [-12, 12]) box(8, 6, 0.4, M.dockDoor, wh.cx + dx, 3.2, whNorth - 0.2, { castShadow: false });
  // Rooftop HVAC units.
  for (const [dx, dz] of [[-13, -8], [0, 6], [13, -5]]) {
    box(5, 1.8, 4, M.hvac, wh.cx + dx, wh.height + 2.1, wh.cz + dz);
  }

  // ---- Guard shack at the Laitram Street main gate ----
  const guard = BUILDING_BY_ID['guard-shack'];
  box(guard.sx, guard.height, guard.sz, M.officeWall, guard.cx, guard.height / 2, guard.cz, { collide: true });
  box(guard.sx + 1.5, 0.5, guard.sz + 1.5, M.roof, guard.cx, 3.85, guard.cz, { castShadow: false });
  box(0.3, 1.2, 2.2, M.glass, guard.cx + guard.sx / 2 + 0.1, 2.2, guard.cz, { castShadow: false });

  addWeathering(ctx, { lm, machine, wh, n301 });
  addSigns(ctx, {
    lm, machine, wh, n301,
    hr: BUILDING_BY_ID['laitram-200'],
    wetTest: BUILDING_BY_ID['storey-5115'],
    corp: BUILDING_BY_ID['storey-5123'],
    tuna: BUILDING_BY_ID['plantation-221']
  });
}

// Phase 9 weathering: rain-drip grime streaks under the trim/roof edges of
// the big industrial faces. All quads merge into one transparent mesh (one
// draw call), placed just proud of the trim so drips read as running off it.
function addWeathering({ world }, { lm, machine, wh, n301 }) {
  const drips = createDecalBatch(world, 'streaks');
  const lmNorth = translateLaitramMachineryPoint(40, -40.5);
  drips.addWall(lmNorth.x, 8.6, lmNorth.z, Math.PI, lm.shellSx - 4, 3.6, 6);
  drips.addWall(machine.cx - machine.sx / 2 - 0.2, 9, machine.cz, -Math.PI / 2, machine.sz - 4, 3.6, 6);
  drips.addWall(wh.cx, 7.6, wh.cz - wh.sz / 2 - 0.2, Math.PI, wh.sx - 4, 3.4, 6);
  for (const b of n301) {
    drips.addWall(b.cx - b.sx / 2 - 0.2, b.height - 3.2, b.cz, -Math.PI / 2, b.sz - 4, 3, Math.max(3, Math.round(b.sz / 12)));
  }
  drips.commit();
}

function addSigns({ world, colliders, M, box, loadingManager }, { lm, machine, wh, n301, hr, wetTest, corp, tuna }) {
  // ---- Monument signs ----
  const monument = ({ id, x, z, text, sx, sz }) => {
    warnIfOverlapping(id, x, z, sx, sz);
    box(sx, 2.4, sz, M.concrete, x, 1.2, z, { collide: true });
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(sx - 0.6, 1.8),
      new THREE.MeshBasicMaterial({ map: textTexture(text, { bg: '#1f5fa8' }) })
    );
    face.position.set(x, 1.3, z + 0.65);
    world.add(face);
    const face2 = face.clone();
    face2.position.z = z - 0.65;
    face2.rotation.y = Math.PI;
    world.add(face2);
  };
  for (const signDef of MONUMENT_SIGNS) monument(signDef);

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
  const lmNorth = translateLaitramMachineryPoint(40, -40.45);
  const lmFront = translateLaitramMachineryPoint(35, 19.5);
  const lmReceiving = translateLaitramMachineryPoint(70.3, -20);
  wallSign('LAITRAM MACHINERY', lmNorth.x, 12.4, lmNorth.z, Math.PI, 26, 2.6);
  wallSign('LAITRAM MACHINERY, INC', lmFront.x, 6.9, lmFront.z, 0, 20, 1.8);
  // Door numbers over the main entrances (Phase 14 wayfinding).
  wallSign('220', lmFront.x, 5.3, lmFront.z + 0.05, 0, 2.2, 1, '#2b3a45');
  wallSign('RECEIVING', lmReceiving.x, 7.2, lmReceiving.z, Math.PI / 2, 12, 1.6, '#b8651f');
  wallSign('220 LAITRAM LN', lmReceiving.x, 5.4, lmReceiving.z, Math.PI / 2, 9, 1.1);
  wallSign('SAFETY FIRST: 412 DAYS SINCE A SHELL INCIDENT', lmReceiving.x, 9.6, lmReceiving.z, Math.PI / 2, 22, 1.4, '#2e7d32');
  wallSign('LAITRAM DISTRIBUTION', wh.cx, 9, wh.cz - wh.sz / 2 - 0.4, Math.PI, 26, 2.4);
  wallSign('5000 RIVER ROAD', wh.cx, 6.9, wh.cz - wh.sz / 2 - 0.4, Math.PI, 15, 1.4);
  wallSign('WEST DOCK', wh.cx - wh.sx / 2 - 0.3, 7, wh.cz, -Math.PI / 2, 12, 1.8, '#b8651f');
  // Phase 4 text updates.
  wallSign('200 LAITRAM LN — HUMAN RESOURCES', hr.cx, 5.4, hr.cz + hr.sz / 2 + 0.2, 0, 26, 1.4);
  const rowSigns = ['301 FO', '301A ASSEMBLY', '301B SHIPPING', '301C ILOX VNA'];
  n301.forEach((b, i) => wallSign(
    rowSigns[i], b.cx - b.sx / 2 - 0.2, Math.min(8.6, b.height - 2), b.cz,
    -Math.PI / 2, i === 1 ? 15 : 9, i === 2 ? 1.2 : 1.5, i === 2 ? '#b8651f' : '#1f5fa8'
  ));
  wallSign('5211 STOREY — MACHINE SHOP', machine.cx - machine.sx / 2 - 0.2, 8, machine.cz, -Math.PI / 2, 24, 1.8);
  wallSign('5115 STOREY — WET TEST', wetTest.cx - wetTest.sx / 2 - 0.2, 7, wetTest.cz, -Math.PI / 2, 20, 1.6);
  wallSign('5123 STOREY — CORPORATE FACILITIES', corp.cx - corp.sx / 2 - 0.2, 7, corp.cz, -Math.PI / 2, 26, 1.6);
  wallSign('221 PLANTATION — TUNA BUILDING', tuna.cx, 7, tuna.cz + tuna.sz / 2 + 0.2, 0, 26, 1.6);

  // ---- Street signs ----
  const streetSign = ({ id, text, x, z, rotY, sx, sz }) => {
    warnIfOverlapping(id, x, z, sx, sz, { rotY });
    box(0.25, 3.4, 0.25, M.signPost, x, 1.7, z);
    // Front and back faces so the blade reads correctly from both sides
    // (a single front-side plane vanishes from behind).
    wallSign(text, x, 3.2, z, rotY, 4.5, 0.8, '#2e7d32');
    wallSign(text, x, 3.2, z, rotY + Math.PI, 4.5, 0.8, '#2e7d32');
  };
  for (const signDef of STREET_SIGNS) streetSign(signDef);

  // ---- Image signs ----
  // Each sign is a dark-framed billboard on two posts that loads a WebP texture.
  // The face plane is resized to the image's natural aspect ratio after load.
  // Routed through the shared LoadingManager so the loading screen can
  // track texture progress.
  const imgLoader = new THREE.TextureLoader(loadingManager);

  const addImageSign = ({ id, asset, x, z, rotY, sx, sz }) => {
    const imgPath = import.meta.env.BASE_URL + asset;
    const H = 6;              // sign height (world units)
    const signY = H / 2 + 2; // billboard centre height above ground

    // Posts are offset perpendicular to the sign face direction.
    // When face points ±X (rotY ≈ ±PI/2), width runs along Z → offset in Z.
    // When face points ±Z (rotY ≈ 0 or PI),  width runs along X → offset in X.
    const faceAlongZ = Math.abs(Math.cos(rotY)) < 0.01;
    warnIfOverlapping(id, x, z, sx, sz, { rotY });
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

  for (const signDef of IMAGE_SIGNS) addImageSign(signDef);
}
