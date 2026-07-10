import * as THREE from 'three';

function mat(color, roughness = 0.45, metalness = 0.1, emissive = 0x000000, emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
}

const metal = mat(0x46515a, 0.32, 0.72);
const dark = mat(0x1c252b, 0.45, 0.4);
const cyan = mat(0x5ee9ff, 0.18, 0.05, 0x1bdfff, 1.4);

export function createRoboHead() {
  const root = new THREE.Group();
  const add = (mesh) => { mesh.castShadow = true; root.add(mesh); return mesh; };

  const head = add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.34), metal));
  head.position.y = 1.42;
  const jaw = add(new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.08, 0.25), dark));
  jaw.position.set(0, 1.22, 0.02);
  const visor = add(new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.09, 0.025), cyan));
  visor.position.set(0, 1.46, 0.185);
  const antenna = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 8), dark));
  antenna.position.set(0.13, 1.72, -0.03);
  const tip = add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), cyan));
  tip.position.set(0.13, 1.88, -0.03);

  root.userData = { head, visor, baseY: 1.42, anchor: new THREE.Vector3() };
  return root;
}

export function updateRoboHead(root, dt, time, playerPos) {
  const anchor = root.userData.anchor;
  const drift = 0.34;
  root.position.x = anchor.x + Math.sin(time * 0.7) * drift;
  root.position.z = anchor.z + Math.cos(time * 0.55) * drift;
  root.position.y = Math.sin(time * 2.2) * 0.08;
  root.userData.head.rotation.z = Math.sin(time * 1.4) * 0.08;

  const dx = playerPos.x - root.position.x;
  const dz = playerPos.z - root.position.z;
  if (Math.hypot(dx, dz) < 4) root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, Math.atan2(dx, dz), dt * 5);
  else root.rotation.y += dt * 0.55;

  const visor = root.userData.visor.material;
  visor.emissiveIntensity = 1.0 + Math.max(0, Math.sin(time * 19.0)) * 0.8;
}
