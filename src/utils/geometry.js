import * as THREE from 'three';
import { makeCollider } from '../collision.js';

// Shared geometry/material helpers used by all map modules.

// PBR material factory. Defaults to a matte dielectric; pass roughness /
// metalness / emissive to tune. Standard materials (not Lambert) so the
// sky's environment map drives image-based lighting and reflections.
export function mat(color, opts = {}) {
  const {
    roughness = 0.9,
    metalness = 0.0,
    emissive,
    emissiveIntensity = 1,
    flatShading = false
  } = opts;
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading });
  if (emissive !== undefined) {
    m.emissive = new THREE.Color(emissive);
    m.emissiveIntensity = emissiveIntensity;
  }
  return m;
}

export function textTexture(text, opts = {}) {
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
  ctx.fillText(text, w / 2, h / 2 + 4, w - 24);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

// Campus-wide material palette. Created once per world build so materials
// are shared across every mesh that uses them.
export function createMaterials() {
  return {
    grass: mat(0x6f9e58, { roughness: 0.97 }),
    asphalt: mat(0x35393e, { roughness: 0.85 }),
    roadLine: mat(0xd8d2b8, { roughness: 0.8 }),
    sidewalk: mat(0xb9b9b0, { roughness: 0.92 }),
    whiteWall: mat(0xe8e6df, { roughness: 0.78 }),
    blueTrim: mat(0x1f5fa8, { roughness: 0.55, metalness: 0.2 }),
    officeWall: mat(0xd9d4c8, { roughness: 0.8 }),
    // Low roughness + a little metalness => the sky reflects in the glass.
    glass: mat(0x8fc0d8, { roughness: 0.08, metalness: 0.25 }),
    roof: mat(0x9ba0a3, { roughness: 0.7, metalness: 0.15 }),
    dock: mat(0x8a8d90, { roughness: 0.85 }),
    dockDoor: mat(0x5a6a72, { roughness: 0.6, metalness: 0.3 }),
    fence: mat(0x7d8489, { roughness: 0.55, metalness: 0.6 }),
    trunk: mat(0x6b4a2f, { roughness: 0.95 }),
    oakLeaf: mat(0x4d7a3a, { roughness: 0.9, flatShading: true }),
    oakLeafDark: mat(0x40682e, { roughness: 0.9, flatShading: true }),
    palmLeaf: mat(0x4f8f46, { roughness: 0.9, flatShading: true }),
    grassPatch: mat(0x7aa863, { roughness: 0.97 }),
    water: mat(0x4a7d8c, { roughness: 0.12, metalness: 0.1 }),
    pallet: mat(0xa9824f, { roughness: 0.95 }),
    crate: mat(0xb08d57, { roughness: 0.92 }),
    barrelBlue: mat(0x2b6cb0, { roughness: 0.5, metalness: 0.3 }),
    barrelOrange: mat(0xd96c2c, { roughness: 0.5, metalness: 0.3 }),
    tableWood: mat(0x9c6b3f, { roughness: 0.9 }),
    signPost: mat(0x55595d, { roughness: 0.6, metalness: 0.5 }),
    concrete: mat(0xc4c2ba, { roughness: 0.92 }),
    yellow: mat(0xd9b13b, { roughness: 0.7 }),
    metal: mat(0x9aa4ab, { roughness: 0.35, metalness: 0.85 }),
    hvac: mat(0xb6bcc1, { roughness: 0.5, metalness: 0.6 }),
    tankWhite: mat(0xdfe3e6, { roughness: 0.4, metalness: 0.4 }),
    dumpster: mat(0x3d6b46, { roughness: 0.7, metalness: 0.3 }),
    vending: mat(0xb03a2e, { roughness: 0.5, metalness: 0.2 })
  };
}

// box()/flat() factories bound to a world group and a shared collider list,
// so map modules can add geometry without re-threading scene plumbing.
// The colliders array is shared by reference — every module pushes into the
// same list that buildWorld() ultimately returns.
export function createBuilders(world, colliders) {
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

  return { box, flat };
}
