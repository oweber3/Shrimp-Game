import * as THREE from 'three';
import { makeCollider } from '../collision.js';
import { mat, textTexture, createBuilders } from '../utils/geometry.js';
import { surfaceMat } from '../utils/surfaceTextures.js';

// Laitram Machinery interior: lobby (inside the office front) plus an
// office block modeled on the real B220L 1st-floor plan (see
// docs/MACHINERY_INTERIOR_ACCURACY.md and docs/reference/laitram-maps/):
// kitchen 1078A, open cubicle field, closed storage core, stairwell/copy,
// the Machinery Eng Conference Room 1019 with the Owen/Kearney/Douglas
// workstation strip (1025.xx) against its west wall, and an east row of
// private offices + video conference 1090. The north half of the building
// is the (inaccessible) production floor.
//
// Everything here goes in its own Group so terrain.js can put it on the
// interior render layer. Ceilings and light panels are single-sided planes
// facing DOWN: visible from inside, back-face-culled from above, so the
// third-person camera can see into rooms from over the roofline.
//
// World-space layout (north is -Z):
//   lobby:            x 15..55,   z 10..19    (door to outside at x 32.5..37.5, z 19)
//   office block:     x 10.6..69.4, z -19.7..10  (doorway to lobby at x 30..40)
//     kitchen 1078A:  x 10.6..22, z -19.7..-12
//     cubicle field:  x 12..30,   z -10..7
//     storage core:   x 30..38,   z -15..-3   (closed)
//     conf room 1019: x 48..60,   z -16..-2   (workstation strip on x ~47)
//     office row:     x 63..69.4, z -19.7..10 (corridor x 60..63)

export function addInterior(scene, colliders) {
  const g = new THREE.Group();
  scene.add(g);
  const { box, flat } = createBuilders(g, colliders);

  const M = {
    // Phase 9: waxed VCT tile underfoot and painted drywall — both tile in
    // world units via the shared UV projection in createBuilders().
    floor: surfaceMat('floorTile', { color: 0xf4faf6 }),
    wall: surfaceMat('paint', { color: 0xf2efe6 }),
    partition: mat(0x9fb0bc),
    deskTop: mat(0xb58a55),
    chair: mat(0x44525c),
    dark: mat(0x2f3338),
    accent: mat(0x1f5fa8),
    counter: mat(0xd9d4c8),
    white: mat(0xf4f4f0),
    appliance: mat(0xdfe3e6),
    glass: mat(0x7fb6cf),
    frame: mat(0x263746)
  };
  const ceilMat = mat(0xf2f2ee);
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xfdfdf2 });

  // Single-sided ceiling plane facing down (see header comment).
  const ceiling = (sx, sz, x, z, y = 3.2) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), ceilMat);
    m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z);
    g.add(m);
  };
  // Fluorescent light panel: emissive-looking flat just under the ceiling.
  const lightPanel = (x, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.6), panelMat);
    m.rotation.x = Math.PI / 2;
    m.position.set(x, 3.17, z);
    g.add(m);
  };
  const sign = (text, x, y, z, rotY, w = 4, h = 0.7, bg = '#4a5560') => {
    const s = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: textTexture(text, { bg }) })
    );
    s.position.set(x, y, z);
    s.rotation.y = rotY;
    g.add(s);
  };
  const roomSign = (label, room, x, y, z, rotY, w = 2.6) => {
    sign(label, x, y + 0.18, z, rotY, w, 0.38, '#4a5560');
    sign(room, x, y - 0.18, z, rotY, Math.min(w, 2.2), 0.3, '#2f3a44');
  };
  const glassPanel = (x, z, sx, sz, rotY = 0) => {
    box(sx, 2.15, sz, M.glass, x, 1.42, z, { collide: true });
    box(sx + (rotY ? 0 : 0.12), 0.08, sz + (rotY ? 0.12 : 0), M.frame, x, 0.35, z);
    box(sx + (rotY ? 0 : 0.12), 0.08, sz + (rotY ? 0.12 : 0), M.frame, x, 2.5, z);
  };
  const chair = (x, z, rotY = 0) => {
    const c = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.6), M.chair);
    seat.position.y = 0.55;
    seat.castShadow = true;
    c.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.1), M.chair);
    back.position.set(0, 1.0, -0.27);
    back.castShadow = true;
    c.add(back);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.55, 6), M.dark);
    post.position.y = 0.28;
    c.add(post);
    c.position.set(x, 0, z);
    c.rotation.y = rotY;
    g.add(c);
  };

  const beerStack = (x, z) => {
    const labelMat = new THREE.MeshBasicMaterial({ map: textTexture('SOUTHERN PECAN', { bg: '#ead6a2', fg: '#4b2d18', size: 48 }) });
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4 - row; col++) {
        const can = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.22, 12), mat(0x6b3f22));
        can.position.set(x + (col - (3 - row) / 2) * 0.18, 0.9 + row * 0.22, z + row * 0.02);
        can.castShadow = true;
        g.add(can);
        const label = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.07), labelMat);
        label.position.set(can.position.x, can.position.y, can.position.z + 0.078);
        g.add(label);
      }
    }
    sign('FICTIONAL DESK SODA', x, 1.78, z + 0.25, 0, 1.5, 0.26, '#6b3f22');
  };

  const monitor = (x, z, rotY) => {
    const m = new THREE.Group();
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.06), M.dark);
    stand.position.y = 0.95;
    m.add(stand);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.06), M.dark);
    screen.position.y = 1.32;
    m.add(screen);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.42), mat(0x9fd4e8));
    glow.position.set(0, 1.32, 0.04);
    m.add(glow);
    m.position.set(x, 0, z);
    m.rotation.y = rotY;
    g.add(m);
  };

  // ================= Lobby (inside the office front) =================
  flat(39, 9.4, M.floor, 35, 14.75, 0.06);
  ceiling(39, 9.4, 35, 14.75);
  // North wall (shared with the main building) with a wide doorway x 30..40.
  box(15, 3.2, 0.5, M.wall, 22.5, 1.6, 10.2);
  box(15, 3.2, 0.5, M.wall, 47.5, 1.6, 10.2);
  box(10, 0.5, 0.5, M.wall, 35, 2.95, 10.2); // header over the doorway
  sign('LAITRAM MACHINERY', 35, 2.45, 10.5, 0, 6, 0.8, '#1f5fa8');
  // Reception desk, west of the entry axis.
  box(3.2, 1.05, 1.1, M.accent, 27, 0.52, 13.5, { collide: true });
  box(3.6, 0.08, 1.4, M.deskTop, 27, 1.13, 13.5);
  monitor(26.4, 13.3, 0.6);
  chair(27, 12.2, 0);
  // Waiting chairs along the south wall, east of the door.
  chair(44, 17.5, Math.PI);
  chair(46.5, 17.5, Math.PI);
  chair(49, 17.5, Math.PI);
  // Potted plants in the corners.
  for (const [px, pz] of [[17.5, 11.8], [52.5, 11.8]]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.5, 8), mat(0x6b4a2f));
    pot.position.set(px, 0.25, pz);
    pot.castShadow = true;
    g.add(pot);
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), mat(0x4d7a3a));
    leaves.position.set(px, 0.95, pz);
    leaves.castShadow = true;
    g.add(leaves);
  }
  lightPanel(28, 14.5);
  lightPanel(42, 14.5);

  // ================= Office block shell =================
  // The office block (everything north of the lobby) follows the real B220L
  // 1st-floor plan — see docs/MACHINERY_INTERIOR_ACCURACY.md §2 and the
  // reference maps in docs/reference/laitram-maps/.
  flat(58.6, 29.6, M.floor, 40, -4.9, 0.06);
  ceiling(58.6, 29.6, 40, -4.9);
  // Interior faces of the exterior walls (the shell is on the exterior layer).
  box(0.5, 3.2, 29.6, M.wall, 10.85, 1.6, -4.9);
  box(0.5, 3.2, 29.6, M.wall, 69.15, 1.6, -4.9);
  box(4.4, 3.2, 0.5, M.wall, 12.8, 1.6, 10.2);
  box(14.3, 3.2, 0.5, M.wall, 62.15, 1.6, 10.2);
  // North partition sealing off the production floor.
  box(58.8, 3.2, 0.5, M.wall, 40, 1.6, -19.65, { collide: true });
  box(4, 2.8, 0.15, M.dark, 30, 1.4, -19.35); // fake double door
  sign('PRODUCTION FLOOR', 30, 2.85, -19.3, 0, 5, 0.6, '#b8651f');
  // Whiteboard on the north partition, on the corridor stretch.
  box(3.2, 1.8, 0.06, M.dark, 26, 1.7, -19.39);
  box(3, 1.6, 0.1, M.white, 26, 1.7, -19.35);

  // Closed dark door prop (rooms that exist on the plan but aren't modeled).
  const doorProp = (x, z, rotY = 0, color = M.dark) => {
    const d = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.5, 0.12), color);
    d.position.set(x, 1.25, z);
    d.rotation.y = rotY;
    g.add(d);
  };

  // ================= Kitchen 1078A (NW corner of the office block) =================
  // South wall at z -12, door gap x 15.5..17.5; east wall at x 22.
  box(4.7, 3.2, 0.5, M.wall, 13.2, 1.6, -12, { collide: true });
  box(4.5, 3.2, 0.5, M.wall, 19.75, 1.6, -12, { collide: true });
  box(2, 0.5, 0.5, M.wall, 16.5, 2.95, -12); // header over the doorway
  box(0.5, 3.2, 7.7, M.wall, 22, 1.6, -15.85, { collide: true });
  roomSign('KITCHEN', 'B220L.1078A', 16.5, 2.5, -11.7, 0, 2.5);
  // Restroom RR1039 sits just west of the kitchen on the real plan —
  // door prop only, non-enterable.
  doorProp(12.6, -11.93);
  roomSign('RESTROOM', 'B220L.RR1039', 12.6, 2.5, -11.7, 0, 2.2);
  // Counter along the north wall with coffee machine and microwave.
  box(6, 0.95, 1.0, M.counter, 16, 0.48, -18.9, { collide: true });
  box(6.2, 0.06, 1.2, M.appliance, 16, 1.0, -18.9);
  box(0.65, 0.42, 0.5, M.dark, 18, 1.25, -18.9); // microwave
  box(0.3, 0.55, 0.35, M.dark, 13.8, 1.3, -18.9); // coffee machine
  // (The fresh pot itself is a Mission 3 item built in missions.js so it
  // can be carried — see POI.coffeePot.)
  // Fridge and vending machine along the east wall.
  box(1.05, 1.95, 1.1, M.appliance, 21.2, 0.98, -17.8, { collide: true });
  box(0.08, 0.7, 0.06, M.dark, 20.8, 1.2, -17.4); // fridge handle
  box(0.9, 2.1, 1.2, mat(0xb03a2e), 21.25, 1.05, -14.5, { collide: true });
  box(0.08, 1.3, 0.8, M.glass, 20.77, 1.2, -14.5); // vending front
  // Round table with chairs.
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.72, 8), M.dark);
  post.position.set(15.5, 0.36, -15);
  g.add(post);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.07, 12), M.deskTop);
  top.position.set(15.5, 0.76, -15);
  top.castShadow = true;
  g.add(top);
  colliders.push(makeCollider(15.5, -15, 1.7, 1.7));
  chair(14, -15, Math.PI / 2);
  chair(17, -15, -Math.PI / 2);
  chair(15.5, -16.5, 0);
  chair(15.5, -13.5, Math.PI);
  lightPanel(16, -16);

  // ================= Open cubicle field (1024/1026/1030 pods) =================
  // Two rows of three pods, openings facing the center aisle, west of the
  // storage core — matches the anonymous workstation field on the plan.
  // dir +1 opens toward +z (row A), dir -1 opens toward -z (row B).
  const cubicle = (cx, cz, dir) => {
    box(4.2, 1.5, 0.12, M.partition, cx, 0.75, cz - dir * 2, { collide: true });
    box(0.12, 1.5, 4, M.partition, cx - 2.1, 0.75, cz, { collide: true });
    box(0.12, 1.5, 4, M.partition, cx + 2.1, 0.75, cz, { collide: true });
    box(3.6, 0.08, 1.1, M.deskTop, cx, 0.76, cz - dir * 1.35);
    monitor(cx - 0.6, cz - dir * 1.5, dir > 0 ? 0 : Math.PI);
    chair(cx + 0.5, cz - dir * 0.5, dir > 0 ? Math.PI : 0);
    flat(0.35, 0.45, M.white, cx + 0.9, cz - dir * 1.3, 0.83); // loose paper
  };
  for (const cx of [16, 22, 28]) {
    cubicle(cx, -6, 1); // row A
    cubicle(cx, 3, -1); // row B
  }
  // Water cooler by the west wall.
  box(0.5, 1.0, 0.5, M.appliance, 13, 0.5, 7, { collide: true });
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.45, 8), M.glass);
  bottle.position.set(13, 1.25, 7);
  g.add(bottle);
  lightPanel(16, -1.5);
  lightPanel(22, -1.5);
  lightPanel(28, -1.5);

  // ================= Storage core (CL1007 / CL1013C, closed) =================
  // Windowless center block; door props + signs only, non-enterable.
  box(0.5, 3.2, 12.5, M.wall, 30, 1.6, -9, { collide: true });
  box(0.5, 3.2, 12.5, M.wall, 38, 1.6, -9, { collide: true });
  box(8.5, 3.2, 0.5, M.wall, 34, 1.6, -15, { collide: true });
  box(8.5, 3.2, 0.5, M.wall, 34, 1.6, -3, { collide: true });
  doorProp(33, -2.93);
  roomSign('STORAGE', 'B220L.CL1007', 33, 2.5, -2.7, 0, 2.2);
  doorProp(29.93, -8, Math.PI / 2);
  roomSign('STORAGE', 'B220L.CL1013C', 29.7, 2.5, -8, -Math.PI / 2, 2.2);

  // ================= Stairwell ST1001 + Copy 1093 (north side) =================
  // Stairwell is closed (no 2nd floor); the copy alcove is open.
  box(0.5, 3.2, 4.7, M.wall, 40, 1.6, -17.35, { collide: true });
  box(0.5, 3.2, 4.7, M.wall, 43, 1.6, -17.35, { collide: true });
  box(3.5, 3.2, 0.5, M.wall, 41.5, 1.6, -15, { collide: true });
  doorProp(41.5, -14.93);
  roomSign('STAIRWELL', 'B220L.ST1001', 41.5, 2.5, -14.7, 0, 2.4);
  // Copier in the open alcove east of the stairwell.
  box(1.0, 1.05, 0.75, M.appliance, 44.8, 0.53, -18.9, { collide: true });
  box(0.7, 0.06, 0.5, M.dark, 44.8, 1.09, -18.9); // control panel / lid
  roomSign('COPY', 'B220L.1093', 44.8, 2.5, -19.3, 0, 1.7);

  // ================= Machinery Eng Conference Room 1019 =================
  // Glass-front room; the Owen/Kearney/Douglas workstation strip backs onto
  // its west wall (the accuracy centerpiece of the real plan).
  box(0.5, 3.2, 14.5, M.wall, 48, 1.6, -9, { collide: true }); // west wall
  box(12.5, 3.2, 0.5, M.wall, 54, 1.6, -16, { collide: true }); // north wall
  box(12.5, 3.2, 0.5, M.wall, 54, 1.6, -2, { collide: true }); // south wall
  // East glass front on the corridor, door gap z -4.6..-3. Mullions and a
  // framed glass door make the conference room read as a real office room.
  glassPanel(60, -13.2, 0.15, 5.6);
  glassPanel(60, -7.4, 0.15, 4.6);
  glassPanel(60, -2.5, 0.15, 1.0);
  box(0.1, 2.4, 0.08, M.frame, 60, 1.35, -15.95);
  box(0.1, 2.4, 0.08, M.frame, 60, 1.35, -10.3);
  box(0.1, 2.4, 0.08, M.frame, 60, 1.35, -4.6);
  box(0.1, 2.4, 0.08, M.frame, 60, 1.35, -3.0);
  box(0.08, 2.2, 1.45, M.glass, 60.05, 1.28, -3.8);
  box(0.08, 2.3, 0.08, M.frame, 60.08, 1.3, -4.5);
  box(0.08, 2.3, 0.08, M.frame, 60.08, 1.3, -3.1);
  box(0.08, 0.08, 1.45, M.frame, 60.08, 2.42, -3.8);
  box(0.08, 0.08, 1.45, M.frame, 60.08, 0.18, -3.8);
  box(0.08, 0.12, 0.08, M.dark, 59.93, 1.2, -3.55);
  box(0.5, 0.6, 14.5, M.wall, 60, 2.9, -9); // header band above the glass
  sign('USNO-220 MACHINERY ENG CONFERENCE ROOM', 60.3, 2.45, -9, Math.PI / 2, 7, 0.6, '#1f5fa8');
  sign('B220L.1019', 60.3, 1.9, -3.8, Math.PI / 2, 1.4, 0.4, '#4a5560');
  // Long conference table with chairs.
  box(5.6, 0.1, 1.8, M.deskTop, 54, 0.78, -9);
  box(4.6, 0.72, 1.2, M.dark, 54, 0.36, -9, { collide: true });
  for (const cx of [52, 54, 56]) {
    chair(cx, -10.4, 0);
    chair(cx, -7.6, Math.PI);
  }
  // Wall screen on the north wall.
  box(2.6, 1.5, 0.08, M.dark, 54, 1.8, -15.7);
  box(2.4, 1.3, 0.06, mat(0x9fd4e8), 54, 1.8, -15.64);
  lightPanel(52, -9);
  lightPanel(56, -9);

  // ================= Workstation strip 1025.03 / .02 / .01 =================
  // Owen / Kearney / Douglas: open cubicles with desks flush against the
  // conference room's west wall, one low pop-up partition each side, no
  // front panel — exactly as on the real plan. North to south.
  const wallSeat = (cz, name, room) => {
    box(1.4, 1.2, 0.12, M.partition, 47.5, 0.6, cz - 1.7, { collide: true });
    box(1.4, 1.2, 0.12, M.partition, 47.5, 0.6, cz + 1.7, { collide: true });
    box(1.1, 0.08, 1.8, M.deskTop, 47.2, 0.76, cz); // desk flush to the wall
    monitor(47.3, cz, -Math.PI / 2);
    chair(46.3, cz, Math.PI / 2);
    flat(0.45, 0.35, M.white, 47.1, cz + 0.65, 0.83); // loose paper
    sign(name, 47.65, 1.75, cz, -Math.PI / 2, 1.7, 0.35, '#33475c'); // nameplate
    sign(room, 47.65, 1.4, cz, -Math.PI / 2, 1.5, 0.28, '#4a5560');
  };
  wallSeat(-14, 'OWEN WEBER', 'B220L.1025.03');
  wallSeat(-10, 'KEARNEY NIESET', 'B220L.1025.02');
  beerStack(47.05, -9.25);
  wallSeat(-6, 'DOUGLAS KATZ', 'B220L.1025.01');
  // Electrical closet CL1023, immediately south of Douglas's seat.
  box(1.3, 3.2, 1.4, M.wall, 47.6, 1.6, -3.2, { collide: true });
  doorProp(46.9, -3.2, Math.PI / 2, mat(0xd9b23a)); // yellow door
  roomSign('ELECTRICAL', 'B220L.CL1023', 46.86, 2.5, -3.2, -Math.PI / 2, 2.1);
  lightPanel(45, -10);
  lightPanel(45, -3);

  // ================= East office row (x 63..69.4) + Video Conf 1090 =================
  // Real drywall private offices off the Toler-side corridor. Nameless
  // "OFFICE" signs only — no real names on signage (see plan §5).
  // Dividers between rooms.
  for (const dz of [-13, -7, -1]) {
    box(6.4, 3.2, 0.5, M.wall, 66.2, 1.6, dz, { collide: true });
  }
  // West (corridor) wall segments with per-room door gaps.
  const zWall = (z0, z1) =>
    box(0.5, 3.2, z1 - z0, M.wall, 63, 1.6, (z0 + z1) / 2, { collide: true });
  zWall(-19.7, -17.2); zWall(-15.6, -13); // office (1012-equivalent)
  zWall(-13, -10.8); zWall(-9.2, -7); // office (1014-equivalent)
  zWall(-7, -4.8); zWall(-3.2, -1); // Marge's office (1022-equivalent)
  zWall(-1, 3.7); zWall(5.3, 10.2); // video conference 1090
  doorProp(63, -16.4, Math.PI / 2);
  roomSign('OFFICE', 'B220L.1012', 62.7, 2.5, -16.4, -Math.PI / 2, 1.7);
  doorProp(63, -10, Math.PI / 2);
  roomSign('OFFICE', 'B220L.1014', 62.7, 2.5, -10, -Math.PI / 2, 1.7);
  roomSign('MANAGER', 'B220L.1022', 62.7, 2.5, -4, -Math.PI / 2, 2.0); // Marge's door stays open
  doorProp(63, 4.5, Math.PI / 2);
  roomSign('USNO-220 VIDEO CONFERENCE', 'B220L.1090', 62.7, 2.5, 4.5, -Math.PI / 2, 4.0);
  // Marge's office furnishings (1022-equivalent, mission 3 giver).
  flat(2.2, 3.2, M.accent, 65.8, -4, 0.07); // rug
  box(1.3, 0.12, 2.8, M.deskTop, 66.5, 0.8, -4);
  box(1.1, 0.7, 2.4, M.dark, 66.5, 0.35, -4, { collide: true });
  monitor(66.7, -4, Math.PI / 2);
  chair(67.7, -4, -Math.PI / 2); // Marge, facing the door
  chair(65.2, -3.2, Math.PI / 2);
  chair(65.2, -4.8, Math.PI / 2);
  box(0.6, 1.4, 0.6, M.appliance, 68.9, 0.7, -6.4, { collide: true }); // filing cabinet
  lightPanel(66, -4);
  lightPanel(61.5, -12); // corridor
  lightPanel(61.5, 2);

  // ================= Indoor lights =================
  // PointLights live on the interior layer, so the renderer culls them
  // automatically whenever the camera is outdoors.
  const addRoomLight = (x, z, intensity, color = 0xeef6ff) => {
    const l = new THREE.PointLight(color, intensity, 30, 1.6);
    l.position.set(x, 2.9, z);
    g.add(l);
  };
  addRoomLight(22, -2, 13);
  addRoomLight(16, -15.5, 9);
  addRoomLight(54, -9, 10);
  addRoomLight(63, -4, 10);
  addRoomLight(35, 14.5, 10, 0xfff4e0);

  return g;
}
