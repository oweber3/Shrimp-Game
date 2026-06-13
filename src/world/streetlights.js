import * as THREE from 'three';
import { makeCollider } from '../collision.js';
import { EXTERIOR_LAYER } from '../zones.js';

// Campus streetlamps. The heads are emissive and ramp up at dusk so the
// bloom pass turns them into warm pools of light — no real PointLights, so
// they cost nothing per frame beyond a single emissive-intensity write.

const POSITIONS = [
  // Main drive, both sides (sidewalks sit at x = +/-7).
  [-9, 42], [9, 42], [-9, 18], [9, 18], [-9, -6], [9, -6], [-9, -30], [9, -30],
  // LM front parking lot.
  [22, 30], [58, 30],
  // Toler St / north service strip.
  [-12, -48], [30, -48], [70, -48],
  // Warehouse front + east office.
  [-100, 74], [148, 6], [148, 55],
  // River Road gate approach.
  [16, 100]
];

export function addStreetlights(scene, colliders) {
  const group = new THREE.Group();
  group.layers.set(EXTERIOR_LAYER);
  scene.add(group);

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b3137, roughness: 0.6, metalness: 0.7 });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfff0c8, emissive: 0xffb347, emissiveIntensity: 0, roughness: 0.5
  });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0 });
  const heads = [headMat];
  const glows = [];

  const H = 7.5;
  for (const [x, z] of POSITIONS) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, H, 8), poleMat);
    pole.position.set(x, H / 2, z);
    pole.castShadow = true;
    group.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.16), poleMat);
    arm.position.set(x + 0.7, H - 0.2, z);
    group.add(arm);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.5), headMat);
    head.position.set(x + 1.4, H - 0.35, z);
    group.add(head);

    // Soft glow billboard under the lamp; bloom amplifies it at night.
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), glowMat.clone());
    glow.position.set(x + 1.4, H - 0.45, z);
    group.add(glow);
    glows.push(glow.material);

    colliders.push(makeCollider(x, z, 0.7, 0.7));
  }

  return {
    update(nightFactor) {
      const e = nightFactor * nightFactor; // ramp on late, sharply
      headMat.emissiveIntensity = e * 2.4;
      const o = Math.min(1, e * 1.2) * 0.85;
      for (const g of glows) g.opacity = o;
    }
  };
}
