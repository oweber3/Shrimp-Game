import * as THREE from 'three';
import { detectSoftwareRenderer } from '../world/quality.js';

// ============================================================================
// Procedural PBR surface textures (Phase 9 realism upgrade)
//
// Canvas-generated, tileable albedo + normal + roughness map sets for every
// large surface on campus: concrete tilt-up, brick, ribbed metal panel,
// asphalt, sidewalk slab, VCT floor tile, painted drywall, roof membrane,
// grass and bark. Each surface is built once (cached singleton) and shared by
// every material that uses it — tint variation comes from the material color,
// which multiplies the near-neutral albedo.
//
// Design decision vs the REALISM_PLAN sketch: the plan suggested packing the
// tiles into 2–3 shared atlases, but tiling textures need RepeatWrapping,
// which cannot wrap a sub-rect of an atlas without custom shader work.
// Separate per-surface textures at 256² (512² for the asphalt hero surface)
// land at ~12 MB of GPU memory — inside the phase's 14 MB budget — so the
// atlas indirection isn't worth it.
//
// UV mapping: these textures tile in *world units* (`scale` = world units per
// tile). applyWorldUVs() below projects world-space planar UVs onto any
// geometry so adjacent meshes line up seamlessly.
// ============================================================================

// ---------------------------------------------------------------------------
// Quality gate: software renderers (SwiftShader in headless CI, llvmpipe)
// rasterize full-screen multi-map PBR at seconds per frame. On those, fall
// back to flat materials that match the textured look's average color —
// exactly what the campus shipped with before Phase 9. Overridable for
// testing with ?surfaces=full / ?surfaces=flat.
// ---------------------------------------------------------------------------
let lowQuality = null;

export function isLowQualitySurfaces() {
  if (lowQuality !== null) return lowQuality;
  try {
    const forced = new URLSearchParams(window.location.search).get('surfaces');
    if (forced === 'flat') return (lowQuality = true);
    if (forced === 'full') return (lowQuality = false);
  } catch (err) {
    // no window (headless-style harness) - fall through to renderer detection
  }
  return (lowQuality = detectSoftwareRenderer());
}

// Average albedo (0–1 per channel) and representative roughness per surface,
// used for the flat-material fallback so both paths read the same from afar.
const FLAT_LOOK = {
  concrete: { albedo: [0.93, 0.93, 0.93], rough: 0.88 },
  sidewalk: { albedo: [0.92, 0.92, 0.92], rough: 0.9 },
  asphalt: { albedo: [0.66, 0.66, 0.67], rough: 0.93 },
  brick: { albedo: [0.75, 0.5, 0.42], rough: 0.89 },
  metalRib: { albedo: [0.8, 0.8, 0.8], rough: 0.45 },
  grass: { albedo: [0.42, 0.62, 0.33], rough: 0.97 },
  bark: { albedo: [0.55, 0.4, 0.29], rough: 0.96 },
  roofMembrane: { albedo: [0.9, 0.9, 0.9], rough: 0.75 },
  floorTile: { albedo: [0.82, 0.82, 0.82], rough: 0.45 },
  paint: { albedo: [0.93, 0.93, 0.93], rough: 0.63 }
};

// Deterministic hash in [0, 1) — same sin-hash trick as landscaping.js, so
// the campus texture set is identical on every load.
function rnd(x, y, seed = 0) {
  return Math.abs(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453) % 1;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Adds one octave of periodic (tileable) value noise into dst. fx/fy are the
// lattice cell counts across the tile, so the pattern wraps exactly. The
// lattice randoms are precomputed — the boot budget (< 200 ms for the whole
// set) can't afford four sin-hashes per pixel per octave.
function addNoiseOctave(dst, size, fx, fy, amp, seed) {
  const lattice = new Float32Array(fx * fy);
  for (let j = 0; j < fy; j++) {
    for (let i = 0; i < fx; i++) lattice[j * fx + i] = rnd(i, j, seed);
  }
  const inv = 1 / size;
  for (let y = 0; y < size; y++) {
    const gy = y * inv * fy;
    const y0 = Math.floor(gy);
    let ty = gy - y0;
    ty = ty * ty * (3 - 2 * ty); // smoothstep
    const row0 = (y0 % fy) * fx;
    const row1 = ((y0 + 1) % fy) * fx;
    for (let x = 0; x < size; x++) {
      const gx = x * inv * fx;
      const x0 = Math.floor(gx);
      let tx = gx - x0;
      tx = tx * tx * (3 - 2 * tx);
      const xx0 = x0 % fx;
      const x1 = (x0 + 1) % fx;
      const a = lattice[row0 + xx0];
      const b = lattice[row0 + x1];
      const c = lattice[row1 + xx0];
      const d = lattice[row1 + x1];
      const v = a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
      dst[y * size + x] += (v - 0.5) * amp;
    }
  }
}

// Fractal noise field centred on 0. freqX/freqY let a surface stretch its
// grain (bark ridges run vertically, for instance) while staying tileable.
function fractal(size, { octaves = 4, freqX = 4, freqY = 4, gain = 0.5, seed = 1 } = {}) {
  const field = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  let fx = freqX;
  let fy = freqY;
  for (let o = 0; o < octaves; o++) {
    addNoiseOctave(field, size, fx, fy, amp, seed + o * 13);
    total += amp * 0.5;
    amp *= gain;
    fx *= 2;
    fy *= 2;
  }
  const norm = 1 / total;
  for (let i = 0; i < field.length; i++) field[i] *= norm; // roughly [-1, 1]
  return field;
}

// Random-walk crack mask for asphalt/concrete. Cracks start away from the
// edges and stay short so the tile still wraps cleanly.
function crackMask(size, count, seed) {
  const mask = new Float32Array(size * size);
  const margin = size * 0.18;
  for (let c = 0; c < count; c++) {
    let x = margin + rnd(c, 1, seed) * (size - margin * 2);
    let y = margin + rnd(c, 2, seed) * (size - margin * 2);
    let a = rnd(c, 3, seed) * Math.PI * 2;
    const len = size * (0.12 + rnd(c, 4, seed) * 0.2);
    for (let s = 0; s < len; s++) {
      const xi = Math.round(x);
      const yi = Math.round(y);
      if (xi < 1 || yi < 1 || xi >= size - 1 || yi >= size - 1) break;
      mask[yi * size + xi] = 1;
      mask[yi * size + xi + 1] = Math.max(mask[yi * size + xi + 1], 0.5);
      x += Math.cos(a);
      y += Math.sin(a);
      a += (rnd(c, s + 5, seed) - 0.5) * 0.7;
    }
  }
  return mask;
}

function canvasTexture(pixels, size, { srgb = false, aniso = 1 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(new ImageData(pixels, size, size), 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = aniso;
  return tex;
}

// Tangent-space normal map from a height field (central differences, wrapped
// so the map tiles like its height source).
function normalMapFrom(height, size, strength, aniso) {
  const px = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    const yp = (y + 1) % size;
    const ym = (y + size - 1) % size;
    for (let x = 0; x < size; x++) {
      const xp = (x + 1) % size;
      const xm = (x + size - 1) % size;
      const dx = (height[y * size + xp] - height[y * size + xm]) * strength;
      const dy = (height[yp * size + x] - height[ym * size + x]) * strength;
      const invLen = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * size + x) * 4;
      px[i] = Math.round((-dx * invLen * 0.5 + 0.5) * 255);
      px[i + 1] = Math.round((dy * invLen * 0.5 + 0.5) * 255); // +Y up (OpenGL convention)
      px[i + 2] = Math.round((invLen * 0.5 + 0.5) * 255);
      px[i + 3] = 255;
    }
  }
  return canvasTexture(px, size, { aniso });
}

// Shared skeleton: run pixel(x, y, out) over the tile, split the results into
// albedo / roughness / height buffers, derive the normal map from the height.
function buildMaps({ size, pixel, normalStrength = 8, aniso = 1 }) {
  const alb = new Uint8ClampedArray(size * size * 4);
  const rgh = new Uint8ClampedArray(size * size * 4);
  const hgt = new Float32Array(size * size);
  const out = { r: 128, g: 128, b: 128, rough: 0.9, h: 0 };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      pixel(x, y, out);
      const i = y * size + x;
      alb[i * 4] = out.r;
      alb[i * 4 + 1] = out.g;
      alb[i * 4 + 2] = out.b;
      alb[i * 4 + 3] = 255;
      const rv = Math.round(clamp01(out.rough) * 255);
      rgh[i * 4] = rv;
      rgh[i * 4 + 1] = rv;
      rgh[i * 4 + 2] = rv;
      rgh[i * 4 + 3] = 255;
      hgt[i] = out.h;
    }
  }
  return {
    map: canvasTexture(alb, size, { srgb: true, aniso }),
    roughnessMap: canvasTexture(rgh, size, { aniso: 1 }),
    normalMap: normalMapFrom(hgt, size, normalStrength, aniso)
  };
}

// ---------------------------------------------------------------------------
// Surface builders. Each returns { map, normalMap, roughnessMap, scale }
// where `scale` is the default tile size in world units.
// ---------------------------------------------------------------------------

const builders = {
  // Concrete tilt-up wall panel: soft mottling, a vertical panel joint on the
  // tile edge, form-tie holes, faint splash staining low on the panel.
  concrete(size = 256) {
    const noise = fractal(size, { octaves: 4, freqX: 5, freqY: 5, seed: 11 });
    const blotch = fractal(size, { octaves: 2, freqX: 2, freqY: 2, seed: 31 });
    const ties = [[0.28, 0.3], [0.72, 0.3], [0.28, 0.72], [0.72, 0.72]];
    return buildMaps({
      size,
      normalStrength: 5,
      pixel(x, y, out) {
        const i = y * size + x;
        let v = 0.93 + noise[i] * 0.07 + blotch[i] * 0.05;
        let h = noise[i] * 0.3;
        let rough = 0.86 + noise[i] * 0.08;
        // Vertical panel joint groove hugging the tile edge (wraps).
        const ex = Math.min(x, size - x);
        if (ex < 3) {
          v -= 0.16;
          h -= 1.2;
          rough += 0.06;
        }
        // Form-tie holes.
        for (const [tx, ty] of ties) {
          const dx = x - tx * size;
          const dy = y - ty * size;
          if (dx * dx + dy * dy < 9) {
            v -= 0.22;
            h -= 1;
          }
        }
        out.r = out.g = out.b = Math.round(clamp01(v) * 255);
        out.rough = rough;
        out.h = h;
      }
    });
  },

  // Broom-finished sidewalk slab: one slab per tile with an expansion joint
  // on the edges and faint brush striping.
  sidewalk(size = 256) {
    const noise = fractal(size, { octaves: 4, freqX: 6, freqY: 6, seed: 17 });
    const stain = fractal(size, { octaves: 2, freqX: 2, freqY: 2, seed: 41 });
    return buildMaps({
      size,
      normalStrength: 5,
      aniso: 4,
      pixel(x, y, out) {
        const i = y * size + x;
        const brush = Math.sin(y * 1.1 + noise[i] * 6) * 0.02;
        let v = 0.92 + noise[i] * 0.06 + stain[i] * 0.06 + brush;
        let h = noise[i] * 0.25 + brush * 4;
        let rough = 0.9 + noise[i] * 0.06;
        const e = Math.min(x, size - x, y, size - y);
        if (e < 3) {
          v -= 0.15;
          h -= 1.2;
        }
        out.r = out.g = out.b = Math.round(clamp01(v) * 255);
        out.rough = rough;
        out.h = h;
      }
    });
  },

  // Asphalt (hero surface, 512²): aggregate speckle, large tonal patches,
  // fine cracks; oil-darkened low spots get a touch shinier.
  asphalt(size = 512) {
    const speck = fractal(size, { octaves: 5, freqX: 24, freqY: 24, seed: 7 });
    const patch = fractal(size, { octaves: 3, freqX: 3, freqY: 3, seed: 23 });
    const cracks = crackMask(size, 10, 5);
    return buildMaps({
      size,
      normalStrength: 6,
      aniso: 4,
      pixel(x, y, out) {
        const i = y * size + x;
        let v = 0.66 + speck[i] * 0.1 + patch[i] * 0.06;
        let rough = 0.92 + speck[i] * 0.06;
        let h = speck[i] * 0.5;
        // Aggregate glints: sparse bright chips.
        if (rnd(x, y, 3) > 0.994) {
          v += 0.25;
          rough -= 0.15;
        }
        // Darker, slightly polished patches read as old oil/sealant.
        if (patch[i] < -0.25) {
          v -= 0.07;
          rough -= 0.12;
        }
        if (cracks[i] > 0) {
          v -= 0.22 * cracks[i];
          h -= cracks[i];
          rough += 0.05;
        }
        const g = Math.round(clamp01(v) * 255);
        out.r = g;
        out.g = g;
        out.b = Math.min(255, g + 4); // cold tar tint
        out.rough = rough;
        out.h = h;
      }
    });
  },

  // Running-bond brick with mortar grooves and per-brick tone jitter.
  brick(size = 256) {
    const rows = 8;
    const cols = 4;
    const noise = fractal(size, { octaves: 3, freqX: 10, freqY: 10, seed: 19 });
    const bh = size / rows;
    const bw = size / cols;
    const mortar = 3;
    return buildMaps({
      size,
      normalStrength: 7,
      pixel(x, y, out) {
        const i = y * size + x;
        const row = Math.floor(y / bh);
        const xo = row % 2 ? x + bw / 2 : x;
        const col = Math.floor(xo / bw);
        const lx = xo % bw;
        const ly = y % bh;
        const inMortar = ly < mortar || lx < mortar;
        if (inMortar) {
          const v = 0.72 + noise[i] * 0.05;
          out.r = out.g = out.b = Math.round(clamp01(v) * 255);
          out.rough = 0.95;
          out.h = -1;
        } else {
          const tone = 0.75 + (rnd(col, row, 29) - 0.5) * 0.25 + noise[i] * 0.08;
          out.r = Math.round(clamp01(tone) * 255);
          out.g = Math.round(clamp01(tone * 0.62) * 255);
          out.b = Math.round(clamp01(tone * 0.5) * 255);
          out.rough = 0.88 + noise[i] * 0.06;
          out.h = noise[i] * 0.4;
        }
      }
    });
  },

  // Ribbed metal panel (roll-up doors / siding): horizontal slats with a
  // rolled lip, plus faint vertical rain streaking.
  metalRib(size = 256) {
    const ribs = 8;
    const streak = fractal(size, { octaves: 3, freqX: 12, freqY: 2, seed: 37 });
    return buildMaps({
      size,
      normalStrength: 10,
      pixel(x, y, out) {
        const i = y * size + x;
        const t = ((y * ribs) / size) % 1;
        // Asymmetric slat profile: quick rise, slow fall, seam groove.
        const prof = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
        let v = 0.78 + prof * 0.06 + streak[i] * 0.05;
        let rough = 0.42 + streak[i] * 0.12 + (streak[i] < -0.2 ? 0.15 : 0);
        if (t > 0.96 || t < 0.03) {
          v -= 0.12; // slat seam shadow
        }
        out.r = out.g = out.b = Math.round(clamp01(v) * 255);
        out.rough = rough;
        out.h = prof * 1.6;
      }
    });
  },

  // Grass: layered green mottling with dry patches and blade-scale speckle.
  grass(size = 256) {
    const patch = fractal(size, { octaves: 3, freqX: 3, freqY: 3, seed: 3 });
    const blades = fractal(size, { octaves: 4, freqX: 30, freqY: 30, seed: 9 });
    return buildMaps({
      size,
      normalStrength: 4,
      aniso: 4,
      pixel(x, y, out) {
        const i = y * size + x;
        const dry = clamp01((patch[i] - 0.22) * 2.2); // sun-scorched patches
        let r = 0.42 + blades[i] * 0.1 + patch[i] * 0.06 + dry * 0.2;
        let g = 0.62 + blades[i] * 0.14 + patch[i] * 0.08 + dry * 0.08;
        let b = 0.33 + blades[i] * 0.06 + patch[i] * 0.04;
        out.r = Math.round(clamp01(r) * 255);
        out.g = Math.round(clamp01(g) * 255);
        out.b = Math.round(clamp01(b) * 255);
        out.rough = 0.97;
        out.h = blades[i] * 0.6;
      }
    });
  },

  // Tree bark: deep vertical ridges (anisotropic noise) with lichen flecks.
  bark(size = 128) {
    const ridge = fractal(size, { octaves: 4, freqX: 10, freqY: 3, seed: 13 });
    return buildMaps({
      size,
      normalStrength: 9,
      pixel(x, y, out) {
        const i = y * size + x;
        let v = 0.55 + ridge[i] * 0.3;
        out.r = Math.round(clamp01(v) * 255);
        out.g = Math.round(clamp01(v * 0.72) * 255);
        out.b = Math.round(clamp01(v * 0.52) * 255);
        if (rnd(x, y, 21) > 0.985) {
          out.g = Math.min(255, out.g + 40); // lichen
        }
        out.rough = 0.96;
        out.h = ridge[i] * 1.4;
      }
    });
  },

  // Single-ply roof membrane: pale grey sheet with seam lines and dirt wash.
  roofMembrane(size = 256) {
    const noise = fractal(size, { octaves: 4, freqX: 8, freqY: 8, seed: 27 });
    const wash = fractal(size, { octaves: 2, freqX: 2, freqY: 2, seed: 43 });
    return buildMaps({
      size,
      normalStrength: 3,
      pixel(x, y, out) {
        const i = y * size + x;
        let v = 0.9 + noise[i] * 0.05 + wash[i] * 0.07;
        let h = noise[i] * 0.2;
        // Membrane seams every half tile, both axes.
        const half = size / 2;
        if (x % half < 2 || y % half < 2) {
          v -= 0.06;
          h += 0.5;
        }
        out.r = out.g = out.b = Math.round(clamp01(v) * 255);
        out.rough = 0.72 + noise[i] * 0.1;
        out.h = h;
      }
    });
  },

  // Waxed VCT floor tile: 4×4 grid, per-tile tone shift, chip speckle, and
  // scuffed traffic patches breaking the polish.
  floorTile(size = 256) {
    const tiles = 4;
    const tw = size / tiles;
    const scuff = fractal(size, { octaves: 3, freqX: 3, freqY: 3, seed: 47 });
    return buildMaps({
      size,
      normalStrength: 2,
      aniso: 4,
      pixel(x, y, out) {
        const i = y * size + x;
        const tx = Math.floor(x / tw);
        const ty = Math.floor(y / tw);
        let v = 0.82 + (rnd(tx, ty, 51) - 0.5) * 0.07;
        if (rnd(x, y, 53) > 0.97) v -= 0.08; // vinyl chip speckle
        let h = 0;
        if (x % tw < 1.5 || y % tw < 1.5) {
          v -= 0.1;
          h = -0.8;
        }
        out.r = out.g = out.b = Math.round(clamp01(v) * 255);
        out.rough = 0.32 + clamp01(scuff[i] + 0.2) * 0.3;
        out.h = h;
      }
    });
  },

  // Painted drywall: near-flat with faint roller texture. Cheap 128².
  paint(size = 128) {
    const roller = fractal(size, { octaves: 3, freqX: 6, freqY: 6, seed: 57 });
    return buildMaps({
      size,
      normalStrength: 1.5,
      pixel(x, y, out) {
        const i = y * size + x;
        const v = 0.93 + roller[i] * 0.03;
        out.r = out.g = out.b = Math.round(clamp01(v) * 255);
        out.rough = 0.62 + roller[i] * 0.05;
        out.h = roller[i] * 0.2;
      }
    });
  }
};

// Default tile size in world units per surface.
const WORLD_SCALE = {
  concrete: 6,
  sidewalk: 4.6,
  asphalt: 16,
  brick: 3.2,
  metalRib: 2.6,
  grass: 20,
  bark: 2.4,
  roofMembrane: 12,
  floorTile: 3.2,
  paint: 3
};

const surfaceCache = new Map();
let totalGenMs = 0;
let loggedGenTime = false;

export function getSurface(name) {
  if (surfaceCache.has(name)) return surfaceCache.get(name);
  const builder = builders[name];
  if (!builder) throw new Error(`Unknown surface: ${name}`);
  const t0 = performance.now();
  const maps = builder();
  totalGenMs += performance.now() - t0;
  const surface = { ...maps, scale: WORLD_SCALE[name] };
  surfaceCache.set(name, surface);
  return surface;
}

// One-line boot diagnostic (the plan budgets < 200 ms of canvas generation).
export function logGenerationTime() {
  if (loggedGenTime || surfaceCache.size === 0) return;
  loggedGenTime = true;
  console.info(`[surfaceTextures] generated ${surfaceCache.size} PBR surfaces in ${totalGenMs.toFixed(0)} ms`);
}

// MeshStandardMaterial wired to a surface's map set. `color` tints the
// near-neutral albedo (per-building hue jitter comes from cheap tint
// variants sharing the same textures). `texScale` overrides the surface's
// default world-units-per-tile for the UV projection in geometry.js.
export function surfaceMat(name, opts = {}) {
  const {
    color = 0xffffff,
    metalness = 0,
    roughness = 1, // multiplies the roughness map
    normalScale = 1,
    texScale
  } = opts;
  if (isLowQualitySurfaces()) {
    // Flat fallback: tint × the surface's average albedo, no maps. The
    // albedo values are sRGB (they mirror what the canvas would hold), so
    // convert before multiplying in the linear working space.
    const look = FLAT_LOOK[name];
    const c = new THREE.Color(color);
    c.multiply(new THREE.Color().setRGB(look.albedo[0], look.albedo[1], look.albedo[2], THREE.SRGBColorSpace));
    return new THREE.MeshStandardMaterial({ color: c, metalness, roughness: look.rough });
  }
  const s = getSurface(name);
  const m = new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    map: s.map,
    normalMap: s.normalMap,
    roughnessMap: s.roughnessMap
  });
  m.normalScale.set(normalScale, normalScale);
  m.userData.texScale = texScale ?? s.scale;
  return m;
}

// ---------------------------------------------------------------------------
// World-space planar UV projection. Picks the dominant normal axis per vertex
// and projects the other two coordinates, offset by the mesh's world position
// so adjacent meshes tile continuously. Creates/overwrites the uv attribute
// (custom geometry like the levee has none).
// ---------------------------------------------------------------------------
export function applyWorldUVs(geometry, scale, ox = 0, oy = 0, oz = 0) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  const inv = 1 / scale;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    let u;
    let v;
    if (ny >= nx && ny >= nz) {
      u = pos.getX(i) + ox;
      v = pos.getZ(i) + oz;
    } else if (nx >= nz) {
      u = pos.getZ(i) + oz;
      v = pos.getY(i) + oy;
    } else {
      u = pos.getX(i) + ox;
      v = pos.getY(i) + oy;
    }
    uv[i * 2] = u * inv;
    uv[i * 2 + 1] = v * inv;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// ---------------------------------------------------------------------------
// Weathering decal textures (RGBA with alpha): drip streaks under roof edges,
// tire-wear bands on drive lanes, oil spots at parking stalls. Rendered as
// thin transparent overlay quads, merged into one mesh per texture by the
// DecalBatch in geometry.js.
// ---------------------------------------------------------------------------
const decalCache = new Map();

const decalBuilders = {
  // Vertical grime streaks hanging from the top edge (place under roofline).
  streaks(size = 256) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    // Faint band of grime right at the roof edge.
    const band = g.createLinearGradient(0, 0, 0, size * 0.18);
    band.addColorStop(0, 'rgba(38,36,32,0.34)');
    band.addColorStop(1, 'rgba(38,36,32,0)');
    g.fillStyle = band;
    g.fillRect(0, 0, size, size * 0.18);
    for (let i = 0; i < 26; i++) {
      const x = rnd(i, 1, 61) * size;
      const w = 1.5 + rnd(i, 2, 61) * 5;
      const len = size * (0.25 + rnd(i, 3, 61) * 0.6);
      const a = 0.14 + rnd(i, 4, 61) * 0.2;
      const grad = g.createLinearGradient(0, 0, 0, len);
      grad.addColorStop(0, `rgba(40,38,33,${a})`);
      grad.addColorStop(1, 'rgba(40,38,33,0)');
      g.fillStyle = grad;
      g.fillRect(x - w / 2, 0, w, len);
    }
    return c;
  },

  // Two soft dark wheel-path bands running along the texture's V axis.
  tireWear(size = 128) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    for (const u of [0.3, 0.7]) {
      const x = u * size;
      const grad = g.createLinearGradient(x - size * 0.12, 0, x + size * 0.12, 0);
      grad.addColorStop(0, 'rgba(20,20,22,0)');
      grad.addColorStop(0.5, 'rgba(20,20,22,0.3)');
      grad.addColorStop(1, 'rgba(20,20,22,0)');
      g.fillStyle = grad;
      g.fillRect(x - size * 0.12, 0, size * 0.24, size);
    }
    // Break the bands up so they don't read as painted stripes.
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgba(46,46,48,${0.05 + rnd(i, 1, 67) * 0.08})`;
      g.fillRect(rnd(i, 2, 67) * size, rnd(i, 3, 67) * size, 2 + rnd(i, 4, 67) * 6, 2 + rnd(i, 5, 67) * 10);
    }
    return c;
  },

  // Irregular oil stain: overlapping soft blobs, darkest at the middle.
  oil(size = 128) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    for (let i = 0; i < 7; i++) {
      const x = size * (0.5 + (rnd(i, 1, 71) - 0.5) * 0.5);
      const y = size * (0.5 + (rnd(i, 2, 71) - 0.5) * 0.5);
      const r = size * (0.12 + rnd(i, 3, 71) * 0.22);
      const a = i === 0 ? 0.4 : 0.14 + rnd(i, 4, 71) * 0.14;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(16,15,14,${a})`);
      grad.addColorStop(1, 'rgba(16,15,14,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    return c;
  }
};

export function getDecalTexture(name) {
  if (decalCache.has(name)) return decalCache.get(name);
  const builder = decalBuilders[name];
  if (!builder) throw new Error(`Unknown decal: ${name}`);
  const tex = new THREE.CanvasTexture(builder());
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; // long runs tile the decal
  decalCache.set(name, tex);
  return tex;
}
