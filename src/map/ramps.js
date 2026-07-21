import * as THREE from 'three';
import { mat } from '../utils/geometry.js';
import { RAMP_PLACEMENTS } from './placementData.js';

// Stunt ramps & dirt mounds (golf cart jump upgrade).
//
// Every ramp registers an analytic height function alongside its mesh, so
// the cart physics and the player's feet ride the exact same surface the
// renderer draws — no raycasts, no clipping. `groundHeightAt(x, z)` is the
// single terrain query the rest of the game uses; flat campus ground is 0.
//
// Two shapes:
//  - wedge: wooden kicker, rises 0 -> h along its facing direction and ends
//    in a sheer lip (the launch edge).
//  - mound: paraboloid dirt hump, drive up one side and get thrown off the
//    crest at speed.

const ramps = [];

// World-space ground height under (x, z): max over all ramp surfaces, 0 on
// open ground. Called per-substep by the cart and player, so it stays cheap
// (a handful of ramps, early bbox reject each).
export function groundHeightAt(x, z) {
  let h = 0;
  for (let i = 0; i < ramps.length; i++) {
    const r = ramps[i];
    if (x < r.minX || x > r.maxX || z < r.minZ || z > r.maxZ) continue;
    const rh = r.heightAt(x, z);
    if (rh > h) h = rh;
  }
  return h;
}

export function addRamps({ world }) {
  const wood = mat(0x8a5a33, { roughness: 0.85 });
  const woodSide = mat(0x6e4526, { roughness: 0.9 });
  const dirt = mat(0x7d5f40, { roughness: 1.0, flatShading: true });
  // The kicker faces are hand-wound single quads/tris; double-side them so a
  // winding slip can never cull a visible face (it's 5 faces per ramp).
  wood.side = THREE.DoubleSide;
  woodSide.side = THREE.DoubleSide;

  // Three former road/building kickers now use long, validator-checked open
  // approach corridors. The two dirt mounds keep their already-clear lawns.
  for (const def of RAMP_PLACEMENTS) {
    if (def.type === 'wedge') addWedge(world, wood, woodSide, def);
    else addMound(world, dirt, def);
  }
}

// ---------------------------------------------------------------------------

// Wedge kicker: local +Z is the drive-up direction (matches the cart's yaw
// convention: forward = (sin yaw, cos yaw)). Height ramps 0 at the tail
// (z' = -l/2) to h at the lip (z' = +l/2), constant across the width.
function addWedge(world, topMat, sideMat, def) {
  const { x, z, yaw, w, l, h } = def;
  const sinY = Math.sin(yaw);
  const cosY = Math.cos(yaw);
  const half = Math.hypot(w, l) / 2 + 0.5;
  ramps.push({
    minX: x - half, maxX: x + half, minZ: z - half, maxZ: z + half,
    heightAt(px, pz) {
      const dx = px - x;
      const dz = pz - z;
      const lx = dx * cosY - dz * sinY; // local right
      const lz = dx * sinY + dz * cosY; // local forward
      if (Math.abs(lx) > w / 2 || Math.abs(lz) > l / 2) return 0;
      return ((lz / l) + 0.5) * h;
    }
  });

  const g = new THREE.Group();
  const hw = w / 2;
  const hl = l / 2;
  // Sloped deck.
  const deck = new THREE.Mesh(boxlessQuad(
    [-hw, 0, -hl], [hw, 0, -hl], [hw, h, hl], [-hw, h, hl]
  ), topMat);
  deck.castShadow = true;
  deck.receiveShadow = true;
  g.add(deck);
  // Vertical back face under the lip.
  const back = new THREE.Mesh(boxlessQuad(
    [hw, h, hl], [hw, 0, hl], [-hw, 0, hl], [-hw, h, hl]
  ), sideMat);
  back.castShadow = true;
  g.add(back);
  // Triangular side walls.
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(boxlessTri(
      [s * hw, 0, -hl], [s * hw, 0, hl], [s * hw, h, hl], s > 0
    ), sideMat);
    side.castShadow = true;
    g.add(side);
  }
  // Support struts under the lip.
  for (const sx of [-hw + 0.35, hw - 0.35]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.25, h, 0.25), sideMat);
    strut.position.set(sx, h / 2, hl - 0.35);
    g.add(strut);
  }
  g.position.set(x, 0, z);
  // rotation.y = yaw maps local +Z onto the world facing (sin yaw, cos yaw),
  // the inverse of the world->local transform in heightAt above.
  g.rotation.y = yaw;
  world.add(g);
}

// Dirt mound: a cone, h at the center falling linearly to 0 at radius r.
// Deliberately conical rather than dome-shaped: the slope discontinuity at
// the crest is what throws a fast cart into the air (a smooth dome this size
// never out-curves gravity, so the cart would just track the surface).
function addMound(world, material, def) {
  const { x, z, r, h } = def;
  const coneHeight = (px, pz) => {
    const d = Math.hypot(px - x, pz - z) / r;
    return d >= 1 ? 0 : h * (1 - d);
  };
  ramps.push({
    minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r,
    heightAt: coneHeight
  });

  // Displace a plane grid with the same cone so mesh == physics.
  const seg = 20;
  const geo = new THREE.PlaneGeometry(r * 2, r * 2, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, coneHeight(pos.getX(i) + x, pos.getZ(i) + z));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, 0.015, z); // hair above the grass plane to avoid z-fighting
  m.castShadow = true;
  m.receiveShadow = true;
  world.add(m);
}

// Single-quad / single-tri BufferGeometry helpers (flat-shaded ramp faces).
function boxlessQuad(a, b, c, d) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(
    [...a, ...b, ...c, ...a, ...c, ...d], 3
  ));
  geo.computeVertexNormals();
  return geo;
}

function boxlessTri(a, b, c, flip) {
  const geo = new THREE.BufferGeometry();
  const verts = flip ? [...a, ...b, ...c] : [...a, ...c, ...b];
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}
