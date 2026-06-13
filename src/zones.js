import * as THREE from 'three';

// Indoor/outdoor zone detection for the Laitram Machinery interior.
// Toggles render-layer culling at the indoor/outdoor boundary and eases
// the lighting rig between outdoor and indoor profiles.

export const EXTERIOR_LAYER = 1; // campus world geometry
export const INTERIOR_LAYER = 2; // LM interior geometry + indoor lights
// Layer 0 (default) stays on always: player, NPCs, mission items.

// Indoor zone AABBs (world XZ). Together they cover every walkable square
// of the interior; everywhere else is 'outdoor'.
const INDOOR_ZONES = [
  { name: 'lobby', minX: 15, maxX: 55, minZ: 10, maxZ: 19 },
  { name: 'office_floor', minX: 10.6, maxX: 52, minZ: -19.7, maxZ: 10 },
  { name: 'manager_office', minX: 52, maxX: 69.4, minZ: -19.7, maxZ: -8.1 },
  { name: 'breakroom', minX: 52, maxX: 69.4, minZ: -8.1, maxZ: 10 }
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
  constructor(camera, scene, lights) {
    this.camera = camera;
    this.scene = scene;
    this.lights = lights; // { ambient, hemi, sun }
    this.zone = 'outdoor';
    this.blend = 0; // 0 = outdoor lighting, 1 = indoor lighting
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
        } else {
          this.camera.layers.enable(EXTERIOR_LAYER);
          this.camera.layers.disable(INTERIOR_LAYER);
        }
      }
    }

    // Ease the lighting rig between profiles over ~0.5s.
    const target = this.isIndoor ? 1 : 0;
    this.blend += (target - this.blend) * Math.min(1, dt * 5);
    const b = this.blend;
    const o = OUTDOOR_LIGHTING;
    const i = INDOOR_LIGHTING;
    const { ambient, hemi, sun } = this.lights;
    ambient.color.lerpColors(o.ambientColor, i.ambientColor, b);
    ambient.intensity = o.ambientIntensity + (i.ambientIntensity - o.ambientIntensity) * b;
    hemi.intensity = o.hemiIntensity + (i.hemiIntensity - o.hemiIntensity) * b;
    sun.intensity = o.sunIntensity + (i.sunIntensity - o.sunIntensity) * b;
    this.scene.background.lerpColors(o.background, i.background, b);
  }
}
