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

// ============================================================================
// Procedural character textures (Phase 1 realism upgrade)
//
// Canvas-drawn albedo/normal maps shared across every character instance.
// Color-keyed caches mean the ~20 shrimp in the crowd reuse a single texture
// per distinct shell color instead of each re-rasterizing its own canvas; the
// color-independent maps (shell/leather normals) are built once as singletons.
// ============================================================================

const shellTexCache = new Map();
const skinTexCache = new Map();
const fabricTexCache = new Map();
let shellNormalMapTex = null;
let leatherNormalMapTex = null;

function hexKey(color) {
  return color instanceof THREE.Color ? color.getHex() : new THREE.Color(color).getHex();
}

// Wet exoskeleton albedo: a soft radial body tone (lighter at the crown,
// darker at the rim) overlaid with fine chitin segmentation lines and a damp
// specular smear. The full hue lives in the texture, so the shell material can
// keep color white and let the map drive it.
export function createShellTexture(color) {
  const key = hexKey(color);
  if (shellTexCache.has(key)) return shellTexCache.get(key);
  const c = new THREE.Color(key);
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  const light = c.clone().lerp(new THREE.Color(0xffffff), 0.14);
  const dark = c.clone().multiplyScalar(0.7);
  const base = ctx.createRadialGradient(size * 0.5, size * 0.4, size * 0.08, size * 0.5, size * 0.55, size * 0.72);
  base.addColorStop(0, '#' + light.getHexString());
  base.addColorStop(1, '#' + dark.getHexString());
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Chitin segmentation: a dark crease with a lighter lip just above it.
  for (let y = 6; y < size; y += 11) {
    const wobble = Math.sin(y * 0.6) * 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, y + wobble);
    ctx.lineTo(size, y - wobble);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y - 3 + wobble);
    ctx.lineTo(size, y - 3 - wobble);
    ctx.stroke();
  }

  // Damp specular smear near the upper-front of each shell piece.
  const smear = ctx.createRadialGradient(size * 0.42, size * 0.28, 4, size * 0.42, size * 0.28, size * 0.42);
  smear.addColorStop(0, 'rgba(255,255,255,0.12)');
  smear.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = smear;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  shellTexCache.set(key, tex);
  return tex;
}

// Softer underside/skin tone with a gentle top-down gradient and very faint
// horizontal lines — reads as translucent belly tissue rather than hard shell.
export function createSkinTexture(color) {
  const key = hexKey(color);
  if (skinTexCache.has(key)) return skinTexCache.get(key);
  const c = new THREE.Color(key);
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  const light = c.clone().lerp(new THREE.Color(0xffffff), 0.3);
  const dark = c.clone().multiplyScalar(0.86);
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, '#' + light.getHexString());
  g.addColorStop(1, '#' + dark.getHexString());
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 1;
  for (let y = 9; y < size; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  skinTexCache.set(key, tex);
  return tex;
}

// Tangent-space normal map for the shell: horizontal ridges (the green channel
// encodes the vertical slope of a sine height field) plus a scatter of dimples
// near the seams. Color-independent, so it is built once and shared.
export function createShellNormalMap() {
  if (shellNormalMapTex) return shellNormalMapTex;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  const freq = (Math.PI * 2 * 7) / size; // ~7 ridges down the texture
  const amp = 60;
  for (let y = 0; y < size; y++) {
    const slope = Math.cos(y * freq); // derivative of the sine height field
    const g = Math.max(0, Math.min(255, Math.round(128 - slope * amp)));
    ctx.fillStyle = `rgb(128,${g},255)`;
    ctx.fillRect(0, y, size, 1);
  }
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 3 + Math.random() * 5;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(168,168,255,0.5)');
    grd.addColorStop(1, 'rgba(128,128,255,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas); // linear data: leave colorSpace default
  tex.anisotropy = 4;
  shellNormalMapTex = tex;
  return tex;
}

// Fine crosshatch weave for hi-vis fabric: tinted base with thin light/dark
// threads in both directions. Tiled across the garment via RepeatWrapping.
export function createFabricTexture(color) {
  const key = hexKey(color);
  if (fabricTexCache.has(key)) return fabricTexCache.get(key);
  const c = new THREE.Color(key);
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#' + c.getHexString();
  ctx.fillRect(0, 0, size, size);
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i += 4) {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.beginPath(); ctx.moveTo(i + 2, 0); ctx.lineTo(i + 2, size); ctx.stroke();
  }
  for (let j = 0; j < size; j += 4) {
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(size, j); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.beginPath(); ctx.moveTo(0, j + 2); ctx.lineTo(size, j + 2); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.anisotropy = 4;
  fabricTexCache.set(key, tex);
  return tex;
}

// Leather grain normal map for work boots: a few irregular horizontal stress
// creases over a speckled grain. Color-independent singleton.
export function createLeatherNormalMap() {
  if (leatherNormalMapTex) return leatherNormalMapTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgb(128,128,255)';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 6; i++) {
    const y = (i + 0.5) * (size / 6) + (Math.random() - 0.5) * 6;
    const grd = ctx.createLinearGradient(0, y - 4, 0, y + 4);
    grd.addColorStop(0, 'rgb(128,92,255)');
    grd.addColorStop(0.5, 'rgb(128,128,255)');
    grd.addColorStop(1, 'rgb(128,164,255)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, y - 4, size, 8);
  }
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 110 + Math.random() * 36;
    ctx.fillStyle = `rgb(128,${Math.round(v)},255)`;
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas); // linear data: leave colorSpace default
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  leatherNormalMapTex = tex;
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
