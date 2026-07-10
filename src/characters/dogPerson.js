import * as THREE from 'three';
import { createFishPerson } from './fishPerson.js';

function mat(color, roughness = 0.55, metalness = 0.04) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export const DOUGLAS = { id: 'douglas', name: 'Douglas Katz', pos: [46.3, -6], rotY: Math.PI / 2, mapColor: '#9b6b3d' };

export function createDogPerson() {
  const root = createFishPerson();
  const rig = root.userData.rig;
  const oldHead = rig.head;
  const parent = oldHead.parent;
  parent.remove(oldHead);
  if (rig.tail && rig.tail.parent) rig.tail.parent.remove(rig.tail);

  const fur = mat(0x8b5a32, 0.62);
  const furDark = mat(0x5f351f, 0.66);
  const black = mat(0x111111, 0.35);
  const pink = mat(0xe88aa0, 0.5);
  const white = mat(0xf4efe5, 0.45);
  const add = (p, mesh) => { mesh.castShadow = true; p.add(mesh); return mesh; };

  const head = new THREE.Group();
  head.position.set(0, 1.82, 0.05);
  parent.add(head);
  const skull = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), fur));
  skull.scale.set(0.92, 1.08, 0.96);
  const muzzle = add(head, new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.28), furDark));
  muzzle.position.set(0, -0.04, 0.22);
  const nose = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), black));
  nose.position.set(0, 0.00, 0.38);
  const tongue = add(head, new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.018, 0.12), pink));
  tongue.position.set(0, -0.14, 0.36);
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), black));
    eye.position.set(side * 0.09, 0.08, 0.205);
    eyes.push({ pupil: eye, pupilBase: eye.position.clone(), side });
    const ear = add(head, new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.055), furDark));
    ear.position.set(side * 0.19, -0.03, -0.02);
    ear.rotation.z = side * 0.25;
  }
  rig.tail = null;
  root.userData.parts.tail = null;

  const shirtPatch = add(rig.torso, new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.028), white));
  shirtPatch.position.set(0, 1.29, 0.352);
  const tie = add(rig.torso, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.30, 0.03), mat(0x9d1f2d, 0.6)));
  tie.position.set(0, 1.18, 0.37);

  root.userData.parts.head = head;
  rig.head = head;
  rig.face = { eyes, mouth: tongue, mouthRestX: tongue.rotation.x };
  return root;
}
