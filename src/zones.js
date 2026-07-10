import * as THREE from 'three';

// Indoor/outdoor zone detection for the Laitram Machinery interior.
// Toggles render-layer culling at the indoor/outdoor boundary and eases
// the lighting rig between outdoor and indoor profiles.

export const EXTERIOR_LAYER = 1; // campus world geometry
export const INTERIOR_LAYER = 2; // LM interior geometry + indoor lights
// Layer 0 (default) stays on always: player, NPCs, mission items.

// Indoor zone AABBs (world XZ). Together they cover every walkable square
// of the interior; everywhere else is 'outdoor'.
// Specific rooms come first; office_floor is the catch-all for the block.
const INDOOR_ZONES = [
  { name: 'lobby', minX: 15, maxX: 55, minZ: 10, maxZ: 19 },
  { name: 'kitchen', minX: 10.6, maxX: 22, minZ: -19.7, maxZ: -12 },
  { name: 'conference', minX: 48, maxX: 60, minZ: -16, maxZ: -2 },
  { name: 'office_floor', minX: 10.6, maxX: 69.4, minZ: -19.7, maxZ: 10 }
];

// Hysteresis: the player must be this far inside a zone to enter it and
// this far outside to leave it, so standing on a door threshold can never
// flicker between indoor and outdoor.
const HYSTERESIS = 0.5;

const OUTDOOR_LIGHTING = {
  ambientColor: new THREE.Color(0xcfe5ec),
  ambientIntensity: 0.5,
  hemiIntensity: 0.4,
  sunIntensity: 1.35,
  background: new THREE.Color(0xaed8e6)
};
const INDOOR_LIGHTING = {
  ambientColor: new THREE.Color(0xd0e8f0),
  ambientIntensity: 0.85,
  hemiIntensity: 0.12,
  sunIntensity: 0.15,
  background: new THREE.Color(0x7d878d) // neutral surround for the dollhouse view
};

export class ZoneSystem {
  constructor(camera, scene, lights, atmosphere) {
    this.camera = camera;
    this.scene = scene;
    this.lights = lights; // { ambient, hemi, sun }
    // The atmosphere recomputes outdoor lighting every frame for the
    // day/night cycle; we blend from its live values toward the indoor
    // profile. Falls back to a fixed daytime profile if absent.
    this.atmosphere = atmosphere || { outdoor: OUTDOOR_LIGHTING, skyTexture: null };
    this.zone = 'outdoor';
    this.blend = 0; // 0 = outdoor lighting, 1 = indoor lighting
    // Neutral surround for the indoor dollhouse view. Outdoors the
    // background is the atmosphere's baked sky cube.
    this._indoorBg = INDOOR_LIGHTING.background.clone();
    camera.layers.enable(EXTERIOR_LAYER);
  }

  get isIndoor() {
    return this.zone !== 'outdoor';
  }

  update(dt, pos) {
    // Entering shrinks the rects (pad > 0), leaving expands them (pad < 0).
    const pad = this.isIndoor ? -HYSTERESIS : HYSTERESIS;
    let next = 'outdoor';
    for (const z of INDOOR_ZONES) {
      if (
        pos.x >= z.minX + pad && pos.x <= z.maxX - pad &&
        pos.z >= z.minZ + pad && pos.z <= z.maxZ - pad
      ) {
        next = z.name;
        break;
      }
    }

    if (next !== this.zone) {
      const wasIndoor = this.isIndoor;
      this.zone = next;
      if (this.isIndoor !== wasIndoor) {
        // Swap layer culling only at the indoor/outdoor boundary;
        // room-to-room movement inside costs nothing.
        if (this.isIndoor) {
          this.camera.layers.disable(EXTERIOR_LAYER);
          this.camera.layers.enable(INTERIOR_LAYER);
          this.scene.background = this._indoorBg;
        } else {
          this.camera.layers.enable(EXTERIOR_LAYER);
          this.camera.layers.disable(INTERIOR_LAYER);
          this.scene.background = this.atmosphere.skyTexture || this._indoorBg;
        }
      }
    }

    // Ease the lighting rig between profiles over ~0.5s.
    const target = this.isIndoor ? 1 : 0;
    this.blend += (target - this.blend) * Math.min(1, dt * 5);
    const b = this.blend;
    const o = this.atmosphere.outdoor; // live outdoor lighting (day/night)
    const i = INDOOR_LIGHTING;
    const { ambient, hemi, sun } = this.lights;
    ambient.color.lerpColors(o.ambientColor, i.ambientColor, b);
    ambient.intensity = o.ambientIntensity + (i.ambientIntensity - o.ambientIntensity) * b;
    hemi.intensity = o.hemiIntensity + (i.hemiIntensity - o.hemiIntensity) * b;
    sun.intensity = o.sunIntensity + (i.sunIntensity - o.sunIntensity) * b;
    // Background is switched hard at the indoor/outdoor boundary above
    // (the sky cube can't be color-lerped), so nothing to do per frame here.
  }
}
