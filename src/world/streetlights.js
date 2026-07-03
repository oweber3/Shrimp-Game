import * as THREE from 'three';
import { makeCollider } from '../collision.js';
import { EXTERIOR_LAYER } from '../zones.js';

// Campus streetlamps. Poles/arms/heads/glows are one InstancedMesh each (was
// four separate meshes per lamp) - the heads stay emissive-only for bloom,
// but the nearest few fixtures to the player additionally get a real,
// non-shadow-casting SpotLight from a small pool so the ground actually
// lights up under them at night (Phase 11; the pre-Phase-11 v1 Phase 4B
// mistake was a live PointLight per fixture, which doesn't scale).

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

const H = 7.5;
const MAX_LIVE_LIGHTS = 6;
const LIGHT_RANGE = 26;

export function addStreetlights(scene, colliders) {
  const group = new THREE.Group();
  group.layers.set(EXTERIOR_LAYER);
  scene.add(group);

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b3137, roughness: 0.6, metalness: 0.7 });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfff0c8, emissive: 0xffb347, emissiveIntensity: 0, roughness: 0.5
  });
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffd98a, transparent: true, opacity: 0, depthWrite: false
  });

  const n = POSITIONS.length;
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.22, H, 8), poleMat, n);
  const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.16, 0.16), poleMat, n);
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.3, 0.5), headMat, n);
  const glows = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 8, 6), glowMat, n);
  poles.castShadow = true;

  const m = new THREE.Matrix4();
  const fixtures = [];

  POSITIONS.forEach(([x, z], i) => {
    m.makeTranslation(x, H / 2, z);
    poles.setMatrixAt(i, m);
    m.makeTranslation(x + 0.7, H - 0.2, z);
    arms.setMatrixAt(i, m);
    m.makeTranslation(x + 1.4, H - 0.35, z);
    heads.setMatrixAt(i, m);
    m.makeTranslation(x + 1.4, H - 0.45, z);
    glows.setMatrixAt(i, m);

    fixtures.push(new THREE.Vector3(x + 1.4, H - 0.35, z));
    colliders.push(makeCollider(x, z, 0.7, 0.7));
  });
  poles.instanceMatrix.needsUpdate = true;
  arms.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  glows.instanceMatrix.needsUpdate = true;

  group.add(poles, arms, heads, glows);

  // Live SpotLight pool: assigned to the nearest fixtures each frame.
  const pool = [];
  for (let i = 0; i < MAX_LIVE_LIGHTS; i++) {
    const light = new THREE.SpotLight(0xffc27a, 0, LIGHT_RANGE, Math.PI / 3.2, 0.6, 1.4);
    light.castShadow = false;
    light.layers.set(EXTERIOR_LAYER);
    group.add(light);
    group.add(light.target);
    pool.push(light);
  }

  const ranked = fixtures.map((pos, i) => ({ i, pos, d: 0 }));

  return {
    update(nightFactor, playerPosition) {
      const e = nightFactor * nightFactor; // ramp on late, sharply
      headMat.emissiveIntensity = e * 2.4;
      glowMat.opacity = Math.min(1, e * 1.2) * 0.85;

      if (e <= 0.001 || !playerPosition) {
        for (const light of pool) light.intensity = 0;
        return;
      }

      for (const f of ranked) f.d = f.pos.distanceToSquared(playerPosition);
      ranked.sort((a, b) => a.d - b.d);

      for (let k = 0; k < MAX_LIVE_LIGHTS; k++) {
        const light = pool[k];
        const nearest = ranked[k];
        if (!nearest) { light.intensity = 0; continue; }
        light.position.copy(nearest.pos);
        light.target.position.set(nearest.pos.x, 0, nearest.pos.z);
        light.intensity = e * 6;
      }
    }
  };
}
