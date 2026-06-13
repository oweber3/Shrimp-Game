import * as THREE from 'three';
import { makeCollider } from '../collision.js';
import { mat, textTexture, createBuilders } from '../utils/geometry.js';

// Laitram Machinery interior: lobby (inside the office front), an office
// floor with cubicles, a manager's office and a breakroom. The north half
// of the building is the (inaccessible) production floor.
//
// Everything here goes in its own Group so terrain.js can put it on the
// interior render layer. Ceilings and light panels are single-sided planes
// facing DOWN: visible from inside, back-face-culled from above, so the
// third-person camera can see into rooms from over the roofline.
//
// World-space layout (north is -Z):
//   lobby:          x 15..55,  z 10..19   (door to outside at x 32.5..37.5, z 19)
//   office floor:   x 10.6..52, z -19.7..10  (doorway to lobby at x 30..40)
//   manager office: x 52..69.4, z -19.7..-8
//   breakroom:      x 52..69.4, z -8..10

export function addInterior(scene, colliders) {
  const g = new THREE.Group();
  scene.add(g);
  const { box, flat } = createBuilders(g, colliders);

  const M = {
    floor: mat(0xcdd2cf),
    wall: mat(0xe6e3da),
    partition: mat(0x9fb0bc),
    deskTop: mat(0xb58a55),
    chair: mat(0x44525c),
    dark: mat(0x2f3338),
    accent: mat(0x1f5fa8),
    counter: mat(0xd9d4c8),
    white: mat(0xf4f4f0),
    appliance: mat(0xdfe3e6),
    glass: mat(0x7fb6cf)
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

  // ================= Office floor =================
  flat(58.6, 29.6, M.floor, 40, -4.9, 0.06);
  ceiling(58.6, 29.6, 40, -4.9);
  // Interior faces of the exterior walls (the shell is on the exterior layer).
  box(0.5, 3.2, 29.6, M.wall, 10.85, 1.6, -4.9);
  box(0.5, 3.2, 29.6, M.wall, 69.15, 1.6, -4.9);
  box(4.4, 3.2, 0.5, M.wall, 12.8, 1.6, 10.2);
  box(14.3, 3.2, 0.5, M.wall, 62.15, 1.6, 10.2);
  // North partition sealing off the production floor.
  box(58.8, 3.2, 0.5, M.wall, 40, 1.6, -19.65, { collide: true });
  box(4, 2.8, 0.15, M.dark, 40, 1.4, -19.35); // fake double door
  sign('PRODUCTION FLOOR', 40, 2.85, -19.3, 0, 5, 0.6, '#b8651f');
  // Whiteboard on the north partition.
  box(3.2, 1.8, 0.06, M.dark, 22, 1.7, -19.39);
  box(3, 1.6, 0.1, M.white, 22, 1.7, -19.35);

  // Cubicles: two rows of three, openings facing the center aisle.
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
  for (const cx of [20, 28, 36]) {
    cubicle(cx, -14, 1); // row A, backs to the production wall
    cubicle(cx, -4, -1); // row B, backs to the lobby side
  }
  // Water cooler by the west wall.
  box(0.5, 1.0, 0.5, M.appliance, 13, 0.5, 6, { collide: true });
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.45, 8), M.glass);
  bottle.position.set(13, 1.25, 6);
  g.add(bottle);

  lightPanel(20, -9);
  lightPanel(28, -9);
  lightPanel(36, -9);
  lightPanel(46, -9);
  lightPanel(25, 4);
  lightPanel(44, 4);

  // ================= Manager's office (x 52..69, against the production wall) =================
  box(0.5, 3.2, 9.4, M.wall, 52.25, 1.6, -15, { collide: true }); // west wall, door gap z -10.3..-8.5
  box(17.4, 3.2, 0.5, M.wall, 60.7, 1.6, -8.25, { collide: true }); // south wall
  sign('MANAGER', 51.97, 2.1, -11.5, -Math.PI / 2, 2.6, 0.55, '#1f5fa8');
  flat(3.4, 2.2, M.accent, 61, -13.5, 0.07); // rug
  box(2.8, 0.12, 1.3, M.deskTop, 61, 0.8, -15.5);
  box(2.4, 0.7, 1.1, M.dark, 61, 0.35, -15.5, { collide: true });
  monitor(61.4, -15.7, Math.PI);
  chair(61, -17, 0);
  chair(59.5, -13.2, Math.PI);
  chair(62.5, -13.2, Math.PI);
  box(0.6, 1.4, 0.6, M.appliance, 68.5, 0.7, -18.8, { collide: true }); // filing cabinet
  lightPanel(61, -14);

  // ================= Breakroom =================
  box(0.5, 3.2, 11.2, M.wall, 52.25, 1.6, 4.3, { collide: true }); // west wall, door gap z -4..-1.3
  box(17.4, 3.2, 0.5, M.wall, 60.7, 1.6, -4.25, { collide: true }); // north wall
  sign('BREAK ROOM', 51.97, 2.1, 2, -Math.PI / 2, 3.2, 0.55, '#2e7d32');
  // Round table with chairs.
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.72, 8), M.dark);
  post.position.set(60, 0.36, 3.4);
  g.add(post);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.07, 12), M.deskTop);
  top.position.set(60, 0.76, 3.4);
  top.castShadow = true;
  g.add(top);
  colliders.push(makeCollider(60, 3.4, 1.7, 1.7));
  chair(58.5, 3.4, Math.PI / 2);
  chair(61.5, 3.4, -Math.PI / 2);
  chair(60, 1.9, 0);
  chair(60, 4.9, Math.PI);
  // Counter along the east wall with microwave and coffee machine.
  box(1.1, 0.95, 6, M.counter, 68.5, 0.48, 5, { collide: true });
  box(1.3, 0.06, 6.2, M.appliance, 68.5, 1.0, 5);
  box(0.65, 0.42, 0.5, M.dark, 68.5, 1.25, 6.5); // microwave
  box(0.3, 0.55, 0.35, M.dark, 68.5, 1.3, 3.8); // coffee machine
  const pot2 = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.22, 8), M.glass);
  pot2.position.set(68.4, 1.14, 3.45);
  g.add(pot2);
  // Fridge and vending machine.
  box(1.1, 1.95, 1.05, M.appliance, 68.5, 0.98, -0.5, { collide: true });
  box(0.06, 0.7, 0.08, M.dark, 67.92, 1.2, -0.9); // fridge handle
  box(1.2, 2.1, 0.9, mat(0xb03a2e), 68.5, 1.05, -3.0, { collide: true });
  box(0.08, 1.3, 0.8, M.glass, 67.93, 1.2, -3.0); // vending front
  lightPanel(60, 4);

  // ================= Indoor lights =================
  // PointLights live on the interior layer, so the renderer culls them
  // automatically whenever the camera is outdoors.
  const addRoomLight = (x, z, intensity, color = 0xeef6ff) => {
    const l = new THREE.PointLight(color, intensity, 30, 1.6);
    l.position.set(x, 2.9, z);
    g.add(l);
  };
  addRoomLight(28, -6, 14);
  addRoomLight(60, -2, 11);
  addRoomLight(35, 14.5, 10, 0xfff4e0);

  return g;
}
