import * as THREE from 'three';

// PPE and prop builders for shrimp workers. Each attaches meshes to the
// given parent Group: the hard hat to the head group (local coordinates
// relative to head center), toolbelt/clipboard to the torso group.

function mat(color) {
  return new THREE.MeshLambertMaterial({ color });
}

const SILVER = 0xc9d4d9;

function add(parent, mesh) {
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

export function addHardHat(head, hatColor) {
  const hat = add(head, new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(hatColor)
  ));
  hat.position.set(0, 0.15, -0.02);
  const brim = add(head, new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.345, 0.05, 12), mat(hatColor)));
  brim.position.set(0, 0.16, -0.02);
  const ridge = add(head, new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.42), mat(hatColor)));
  ridge.position.set(0, 0.38, -0.02);
}

export function addToolbelt(torso) {
  const belt = add(torso, new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.09, 10), mat(0x5a4632)));
  belt.position.set(0, 0.84, 0.02);
  const buckle = add(torso, new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.02), mat(SILVER)));
  buckle.position.set(0, 0.84, 0.32);
  for (const side of [-1, 1]) {
    const pouch = add(torso, new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.07), mat(0x7a5c3a)));
    pouch.position.set(side * 0.24, 0.74, 0.14);
    pouch.rotation.y = side * 0.4;
  }
  const wrench = add(torso, new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.18, 0.02), mat(SILVER)));
  wrench.position.set(0.3, 0.72, -0.04);
  wrench.rotation.z = 0.2;
}

export function addClipboard(torso) {
  const board = add(torso, new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.36, 0.02), mat(0xd9cfa8)));
  board.position.set(0.32, 1.02, 0.38);
  board.rotation.x = -0.5;
  board.rotation.y = -0.2;
  const paper = add(torso, new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.3, 0.005), mat(0xf2f0e8)));
  paper.position.set(0.318, 1.025, 0.395);
  paper.rotation.x = -0.5;
  paper.rotation.y = -0.2;
  const clip = add(torso, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.03), mat(SILVER)));
  clip.position.set(0.36, 1.18, 0.31);
  clip.rotation.x = -0.5;
  clip.rotation.y = -0.2;
}
