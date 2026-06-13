import * as THREE from 'three';
import { makeCollider } from '../collision.js';

// Shared geometry/material helpers used by all map modules.

export function mat(color) {
  return new THREE.MeshLambertMaterial({ color });
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
    grass: mat(0x6f9e58),
    asphalt: mat(0x3c4146),
    roadLine: mat(0xd8d2b8),
    sidewalk: mat(0xb9b9b0),
    whiteWall: mat(0xe8e6df),
    blueTrim: mat(0x1f5fa8),
    officeWall: mat(0xd9d4c8),
    glass: mat(0x7fb6cf),
    roof: mat(0x9ba0a3),
    dock: mat(0x8a8d90),
    dockDoor: mat(0x5a6a72),
    fence: mat(0x7d8489),
    trunk: mat(0x6b4a2f),
    oakLeaf: mat(0x4d7a3a),
    oakLeafDark: mat(0x40682e),
    palmLeaf: mat(0x4f8f46),
    grassPatch: mat(0x7aa863),
    water: mat(0x4a7d8c),
    pallet: mat(0xa9824f),
    crate: mat(0xb08d57),
    barrelBlue: mat(0x2b6cb0),
    barrelOrange: mat(0xd96c2c),
    tableWood: mat(0x9c6b3f),
    signPost: mat(0x55595d),
    concrete: mat(0xc4c2ba),
    yellow: mat(0xd9b13b),
    metal: mat(0x9aa4ab),
    hvac: mat(0xb6bcc1),
    tankWhite: mat(0xdfe3e6),
    dumpster: mat(0x3d6b46),
    vending: mat(0xb03a2e)
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
