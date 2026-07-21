import * as THREE from 'three';
import { makeCollider } from '../collision.js';
import { warnIfOverlapping } from './layoutData.js';

// Landscaping: live oaks, palms, grass patches, and the drainage canal
// with raised concrete banks and slowly drifting water.

// Conservative canopy footprint for the one tree close enough to constrain
// the Earth Stage pocket. Verification consumes the same placement as render.
export const WEST_TREE_LINE_OAK = Object.freeze({
  id: 'west-tree-line-oak',
  x: -147,
  z: -5,
  scale: 1.2,
  sx: 13.2,
  sz: 13.2,
});

// Deterministic per-position jitter in [0, 1) so the campus looks identical
// on every load (no Math.random — same trick the parking lots use).
function jitter(x, z, k = 1) {
  return Math.abs(Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453) % 1;
}

export function addLandscaping(ctx) {
  const { world, colliders, M, flat } = ctx;

  // ---- Grass patches (slightly different green, under tree clusters) ----
  const patch = (x, z, sx, sz) => flat(sx, sz, M.grassPatch, x, z, 0.012);
  patch(-55, 86, 20, 28); // lawn west of Storey St, under the dirt mound oaks
  patch(20, 114, 12, 20); // lawn between HR and the overflow lot
  patch(10, -66, 50, 10); // berm between the Machine Shop and Plantation Rd
  patch(15, -90, 30, 14); // lawn west of the Tuna Building
  patch(-54, 78, 14, 10); // 5118 front oak
  patch(-147, -10, 12, 70); // west street tree line

  // ---- Live oaks (varied canopy, rotation and tint per tree) ----
  const oakLeafMats = [M.oakLeaf, M.oakLeafDark];
  const oak = (x, z, s = 1) => {
    warnIfOverlapping('oak', x, z, 2, 2);
    const j = jitter(x, z);
    const scale = s * (0.9 + 0.25 * j);
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5 * scale, 0.7 * scale, 4 * scale, 7),
      M.trunk
    );
    trunk.position.y = 2 * scale;
    trunk.castShadow = true;
    g.add(trunk);
    const blobs = [
      [0, 5.2, 0, 3.2],
      [2.2, 4.6, 1.2, 2.2],
      [-2, 4.4, -1, 2.4],
      [1, 4.8, -1.8, 2]
    ];
    blobs.forEach(([bx, by, bz, br], i) => {
      const leafMat = oakLeafMats[Math.floor(jitter(x, z, i + 2) * 2)];
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(br * scale, 0), leafMat);
      leaf.position.set(bx * scale, by * scale, bz * scale);
      leaf.castShadow = true;
      g.add(leaf);
    });
    g.position.set(x, 0, z);
    g.rotation.y = j * Math.PI * 2;
    world.add(g);
    colliders.push(makeCollider(x, z, 1.6 * scale, 1.6 * scale));
  };

  // ---- Palms (varied height and frond spread) ----
  const palm = (x, z) => {
    warnIfOverlapping('palm', x, z, 1.2, 1.2);
    const j = jitter(x, z);
    const h = 6.2 + j * 2; // trunk height 6.2–8.2
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, h, 6), M.trunk);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4, 4), M.palmLeaf);
      const a = (i / 6) * Math.PI * 2 + j * Math.PI;
      frond.position.set(Math.cos(a) * 1.6, h, Math.sin(a) * 1.6);
      frond.rotation.z = Math.cos(a) * 1.25;
      frond.rotation.x = -Math.sin(a) * 1.25;
      frond.castShadow = true;
      g.add(frond);
    }
    g.position.set(x, 0, z);
    world.add(g);
    colliders.push(makeCollider(x, z, 1, 1));
  };

  // Oaks along the streets (clear of the Storey St and Toler St roadbeds).
  oak(-42, 78, 1.1);
  oak(16, 84, 1);
  oak(-42, 95, 1.2);
  oak(-70, 112, 1.2);
  // Keeper for the old (25, 112) street oak: the Phase 6 break pavilion pad
  // now occupies that spot, so this tree shades the overflow-lot corner
  // instead of growing through the pavilion roof.
  oak(80, 118, 1);
  oak(90, 112, 1.1);
  oak(-10, -66, 1);
  oak(30, -66, 1.1);
  oak(20, -66, 1);
  // Shifted within the same west tree-line patch so the temporary Earth
  // Stage can rise in the only building/road-safe pocket near its old anchor.
  oak(WEST_TREE_LINE_OAK.x, WEST_TREE_LINE_OAK.z, WEST_TREE_LINE_OAK.scale);
  oak(-147, 20, 1);
  oak(90, 88, 1.1);
  oak(90, -14, 0.9);
  oak(-54, 78, 1.2);
  // Fill out the open field and south edge.
  oak(-60, 25, 1);
  oak(-45, 20, 1.1);
  oak(-58, -64, 0.9); // clear of the Distribution-side ramp landing lane
  oak(107.5, 120, 1);
  // Palms at the LM office entry, the Toler St verge, and the gate.
  palm(26, 12.5);
  palm(44, 12.5);
  palm(108, 4);
  palm(108, -32);
  palm(-46, 120);
  palm(14, 120);
  palm(90, 118);
  palm(-164, 28);

  addCanal(ctx);
}

// Drainage canal along the east fence (Louisiana essential): raised
// concrete banks, a grass shoulder, and water that drifts slowly north.
function addCanal({ world, colliders, M, box, flat, updaters }) {
  flat(3, 270, M.grass, 164.2, 0, 0.05); // grass shoulder
  box(1.6, 1.1, 270, M.concrete, 166.2, 0.55, 0, { castShadow: false }); // west bank
  box(1.6, 1.1, 270, M.concrete, 177.8, 0.55, 0, { castShadow: false }); // east bank

  const tex = makeRippleTexture();
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 28);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 270),
    new THREE.MeshStandardMaterial({
      color: 0x3a6d80, map: tex, roughnessMap: tex,
      roughness: 0.18, metalness: 0.35
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(172, 0.06, 0);
  water.receiveShadow = true;
  world.add(water);

  colliders.push(makeCollider(172, 0, 12, 280)); // do not swim in the canal

  // UV drift sells "slow bayou water" for the cost of two float adds per frame.
  updaters.push((dt) => {
    tex.offset.y += dt * 0.045;
    tex.offset.x += dt * 0.011;
  });
}

// Grayscale ripple pattern; multiplies against the water color so streaks
// read as glints and shadowed wavelets.
function makeRippleTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e8eef0';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 46; i++) {
    const x = jitter(i, 3) * 128;
    const y = jitter(i, 7) * 128;
    const w = 8 + jitter(i, 11) * 26;
    const dark = jitter(i, 13) > 0.5;
    g.fillStyle = dark ? 'rgba(170,190,196,0.5)' : 'rgba(255,255,255,0.55)';
    g.beginPath();
    g.ellipse(x, y, w, 1.6 + jitter(i, 17) * 1.8, 0, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}
