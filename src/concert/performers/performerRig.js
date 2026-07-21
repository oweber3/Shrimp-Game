import * as THREE from 'three';
import { EXTERIOR_LAYER } from '../../zones.js';

// ============================================================================
// Shared performer rig — Phase 3 lifecycle wrapper for the sky-concert acts.
//
// Each performer module (travisFish.js, drakeDrake.js, swaeEel.js,
// bigSeahawk.js) authors a *body spec*: a THREE.Group built at ~1 unit tall
// plus a `pose(parts, dt, t, beatPhase)` function that runs its performance
// loop. This file owns everything the acts share and must not each reinvent:
//
//   * Materialize-in effect  — scale-up-from-a-point pop (easeOutBack), a
//     one-shot light flash, and an expanding ground shockwave ring.
//   * Dissolve-out effect    — shader-less trick: scale down slightly while
//     fading material opacity and flaring an additive glow sprite.
//   * Hover bob              — nobody reads as static in the sky.
//   * Housekeeping           — force every child onto EXTERIOR_LAYER, disable
//     shadows (the acts sit at y 60+, out of the shadow frustum), and expose a
//     tiny state machine (hidden → spawning → performing → dissolving → done).
//
// Deliberately self-contained: this module owns no game state and is driven
// only by update(dt, t, beatPhase). The director/main wiring is a later pass.
// The standalone harness (performers.html, ?performer=) exercises it directly.
// ============================================================================

const TWO_PI = Math.PI * 2;

// --- Shared, allocation-free scratch + baked assets -------------------------

// One radial-gradient glow texture, baked once and shared by every flare
// sprite. Additive-blended, so the white core blooms and the edge fades out.
let _glowTexture = null;
function glowTexture() {
  if (_glowTexture) return _glowTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  _glowTexture = new THREE.CanvasTexture(canvas);
  _glowTexture.colorSpace = THREE.SRGBColorSpace;
  return _glowTexture;
}

// --- Small shared material helpers so the acts stay cheap -------------------

/** Cheap matte body material (no maps): the concert must not tax low tiers. */
export function bodyMaterial(color, { roughness = 0.55, metalness = 0.1 } = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

/**
 * Emissive accent material — grills, bioluminescent stripes, eye dots. These
 * bloom hard once Phase 4 forces night; here they just read as self-lit.
 * Poses drive `emissiveIntensity` off beatPhase to pulse with the track.
 */
export function emissiveMaterial(color, intensity = 1.4, { roughness = 0.4 } = {}) {
  return new THREE.MeshStandardMaterial({
    color: 0x050505,
    emissive: color,
    emissiveIntensity: intensity,
    roughness,
    metalness: 0.0,
  });
}

// --- Beat shaping ----------------------------------------------------------

/**
 * Shape a linear beatPhase (0..1 sawtooth, one cycle per beat) into a punchy
 * attack-then-decay 0..1 pulse. Poses use it for nods, sways and emissive
 * throbs so the whole roster breathes on the same clock.
 */
export function beatPulse(beatPhase) {
  const p = ((beatPhase % 1) + 1) % 1;
  // Fast attack over the first ~18% of the beat, exponential decay after.
  if (p < 0.18) return p / 0.18;
  return Math.max(0, Math.exp(-(p - 0.18) * 3.4));
}

// easeOutBack: overshoots then settles — the "pop" of a Fortnite spawn-in.
function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const t = x - 1;
  return 1 + c3 * t * t * t + c1 * t * t;
}

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// --- Material bookkeeping for the dissolve fade -----------------------------

function collectMaterials(object) {
  const seen = new Set();
  const records = [];
  object.traverse((child) => {
    const mat = child.material;
    if (!mat) return;
    const list = Array.isArray(mat) ? mat : [mat];
    for (const m of list) {
      if (!m || seen.has(m)) continue;
      seen.add(m);
      records.push({ material: m, baseTransparent: m.transparent, baseOpacity: m.opacity });
    }
  });
  return records;
}

// ============================================================================
// Performer — wraps a body spec with the shared lifecycle.
//
//   const perf = new Performer({ id, group, parts, pose, height });
//   scene.add(perf.root);
//   perf.spawnIn();
//   // each frame:
//   perf.update(dt, songTime, beatPhase);
//   // later:
//   perf.dissolveOut();
//
// Coordinate contract: `root` sits on the ground at the act's XZ. The body is
// authored ~1 unit tall and lives under `bodyPivot`, which is scaled to
// `height` and lifted to `anchorY` (default 0, so the act stands on the ground
// in the harness; the director lifts it into the sky by positioning `root`).
// The shockwave ring and glow flare are world-space children of `root`.
// ============================================================================

export class Performer {
  constructor({
    id,
    group,
    parts,
    pose,
    height = 50,
    anchorY = 0,
    hoverAmp = null,
    hoverFreq = 0.42,
    spawnDuration = 1.15,
    dissolveDuration = 1.25,
    flashColor = 0xffffff,
    ringColor = 0xffffff,
  }) {
    this.id = id;
    this.parts = parts;
    this._pose = typeof pose === 'function' ? pose : () => {};
    this.height = height;
    this.anchorY = anchorY;
    this.hoverAmp = hoverAmp == null ? height * 0.02 : hoverAmp;
    this.hoverFreq = hoverFreq;
    this.spawnDuration = spawnDuration;
    this.dissolveDuration = dissolveDuration;

    this.state = 'hidden'; // hidden | spawning | performing | dissolving | done
    this._transT = 0;
    this._growth = 0; // 0..1 spawn growth (also the body scale factor)
    this._opacity = 1;
    this._hoverPhase = Math.random() * TWO_PI;

    // --- Scene graph ------------------------------------------------------
    this.root = new THREE.Group();
    this.root.name = `performer:${id}`;

    this.bodyPivot = new THREE.Group();
    this.bodyPivot.position.y = anchorY;
    this.bodyPivot.add(group);
    this.root.add(this.bodyPivot);

    // Shockwave ring — flat on the ground under the act, hidden until spawn.
    const ringGeo = new THREE.RingGeometry(0.86, 1.0, 48);
    this._ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this._ring = new THREE.Mesh(ringGeo, this._ringMat);
    this._ring.rotation.x = -Math.PI / 2;
    this._ring.position.y = 0.15;
    this._ring.visible = false;
    this.root.add(this._ring);

    // Additive glow flare at the body's centre — punches on spawn, flares on
    // dissolve. Sized in world units off `height`.
    this._glowMat = new THREE.SpriteMaterial({
      map: glowTexture(),
      color: flashColor,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this._glow = new THREE.Sprite(this._glowMat);
    this._glow.position.y = anchorY + height * 0.5;
    this._glow.scale.setScalar(height * 0.9);
    this._glow.visible = false;
    this.root.add(this._glow);

    // One-shot point flash so nearby world geometry catches the pop. Cheap:
    // disabled except during the first ~0.5 s of a spawn.
    this._flash = new THREE.PointLight(flashColor, 0, height * 3.2, 2);
    this._flash.position.y = anchorY + height * 0.5;
    this._flash.visible = false;
    this.root.add(this._flash);

    // --- Housekeeping: layer + shadow policy for every descendant ---------
    this.root.traverse((o) => {
      o.layers.set(EXTERIOR_LAYER);
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });

    this._materials = collectMaterials(group);

    // Start invisible; spawnIn() reveals it.
    this._growth = 0;
    this.bodyPivot.scale.setScalar(0.0001);
    this.root.visible = false;
  }

  /** Begin the materialize-in. Restarts cleanly if already visible. */
  spawnIn() {
    this._restoreOpacity();
    this.state = 'spawning';
    this._transT = 0;
    this._growth = 0;
    this.bodyPivot.scale.setScalar(0.0001);
    this.root.visible = true;
    this._ring.visible = true;
    this._glow.visible = true;
    this._flash.visible = true;
    this._ringMat.opacity = 0;
    return this;
  }

  /** Begin the dissolve-out. No-op once already leaving. */
  dissolveOut() {
    if (this.state === 'dissolving' || this.state === 'done' || this.state === 'hidden') {
      return this;
    }
    this.state = 'dissolving';
    this._transT = 0;
    this._glow.visible = true;
    return this;
  }

  /** True once the dissolve has fully retired the act (safe to remove/dispose). */
  get finished() {
    return this.state === 'done';
  }

  update(dt, t, beatPhase = 0) {
    const delta = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    if (this.state === 'hidden' || this.state === 'done') return;

    // --- Transition bookkeeping ------------------------------------------
    if (this.state === 'spawning') {
      this._transT += delta;
      const p = clamp01(this._transT / this.spawnDuration);
      this._growth = easeOutBack(p);

      // Flash: sharp on, quick decay over the first third of the spawn.
      const flashK = Math.max(0, 1 - p / 0.34);
      this._flash.intensity = flashK * flashK * 6.0 * (this.height / 50);
      this._flash.visible = flashK > 0.001;
      this._glowMat.opacity = flashK * 0.9;

      // Ground shockwave ring: expand outward and fade.
      const ringK = clamp01(this._transT / (this.spawnDuration * 1.3));
      this._ring.scale.setScalar(1 + ringK * this.height * 0.9);
      this._ringMat.opacity = (1 - ringK) * 0.85;
      if (ringK >= 1) this._ring.visible = false;

      if (p >= 1) {
        this._growth = 1;
        this.state = 'performing';
        this._flash.visible = false;
        this._glow.visible = false;
        this._ring.visible = false;
      }
    } else if (this.state === 'dissolving') {
      this._transT += delta;
      const p = clamp01(this._transT / this.dissolveDuration);
      this._opacity = 1 - p;
      this._applyOpacity(this._opacity);
      // Shrink slightly and let the glow flare up then out.
      this._growth = 1 - 0.18 * p;
      const flare = Math.sin(clamp01(p / 0.6) * Math.PI); // 0 → 1 → 0
      this._glowMat.opacity = flare * 0.8;
      this._glow.scale.setScalar(this.height * (0.9 + p * 0.6));
      if (p >= 1) {
        this.state = 'done';
        this.root.visible = false;
        this._glow.visible = false;
        this._restoreOpacity();
        return;
      }
    }

    // --- Body scale: authored ~1 unit tall, scaled to `height` × growth --
    this.bodyPivot.scale.setScalar(Math.max(0.0001, this._growth) * this.height);

    // --- Hover bob (always, so nobody reads as static) -------------------
    const bob = Math.sin(t * TWO_PI * this.hoverFreq + this._hoverPhase);
    this.bodyPivot.position.y = this.anchorY + bob * this.hoverAmp;

    // --- Performance loop -------------------------------------------------
    this._pose(this.parts, delta, t, beatPhase);
  }

  _applyOpacity(opacity) {
    for (const rec of this._materials) {
      rec.material.transparent = true;
      rec.material.opacity = rec.baseOpacity * opacity;
      rec.material.depthWrite = opacity > 0.5;
    }
  }

  _restoreOpacity() {
    this._opacity = 1;
    for (const rec of this._materials) {
      rec.material.transparent = rec.baseTransparent;
      rec.material.opacity = rec.baseOpacity;
      rec.material.depthWrite = true;
    }
  }

  /** Release GPU resources. Call after `finished` when tearing the show down. */
  dispose() {
    this.root.traverse((o) => {
      if (o.isMesh || o.isSprite) {
        o.geometry?.dispose?.();
        const mat = o.material;
        const list = Array.isArray(mat) ? mat : [mat];
        for (const m of list) m?.dispose?.();
      }
    });
  }
}

/**
 * Convenience: turn a body-spec factory into a ready Performer. A body spec is
 *   { group, parts, pose, height, ...performerOptions }.
 * Every performer module exports a `create*()` that calls this.
 */
export function makePerformer(spec) {
  return new Performer(spec);
}
