import * as THREE from 'three';
import { makeCollider } from '../collision.js';
import { mat } from '../utils/geometry.js';

// Parked vehicle builders: sedans, semi trucks, and the forklift.

export function addCar(world, colliders, x, z, rotY) {
  const palette = [0x9a3b3b, 0x3b6a9a, 0x8a8d90, 0x42703d, 0xd9d9d9, 0x2f3338, 0xb8651f];
  const color = palette[Math.abs(Math.floor(x * 7 + z * 13)) % palette.length];
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 4.4), mat(color));
  body.position.y = 0.75;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 2.2), mat(0x222a30));
  cabin.position.set(0, 1.5, -0.2);
  cabin.castShadow = true;
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
  const wheelMat = mat(0x1a1a1a);
  for (const [wx, wz] of [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.4, wz);
    g.add(w);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  world.add(g);
  colliders.push(makeCollider(x, z, 2.6, 4.8));
}

export function addTruck(world, colliders, x, z, rotY, cabColor = 0xc23b3b) {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 2.4), mat(cabColor));
  cab.position.set(0, 1.6, 6.2);
  cab.castShadow = true;
  g.add(cab);
  const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.2, 10), mat(0xdedede));
  trailer.position.set(0, 2.1, 0);
  trailer.castShadow = true;
  g.add(trailer);
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 8);
  const wheelMat = mat(0x1a1a1a);
  for (const [wx, wz] of [[-1.2, 6.2], [1.2, 6.2], [-1.2, -3.5], [1.2, -3.5], [-1.2, -2], [1.2, -2]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.55, wz);
    g.add(w);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  world.add(g);
  const along = Math.abs(Math.sin(rotY)) > 0.5;
  colliders.push(makeCollider(x, z, along ? 16 : 3.2, along ? 3.2 : 16));
}

export function addForklift(world, colliders, x, z) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 2.6), mat(0xe8a020));
  body.position.y = 1;
  body.castShadow = true;
  g.add(body);
  const mast = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3, 0.3), mat(0x444a4f));
  mast.position.set(0, 1.8, 1.5);
  g.add(mast);
  const fork = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.4), mat(0x9ba0a3));
  fork.position.set(0, 0.25, 2.3);
  g.add(fork);
  const cage = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), mat(0x2f3338));
  cage.position.set(0, 2.2, -0.4);
  g.add(cage);
  g.position.set(x, 0, z);
  g.rotation.y = -0.5;
  world.add(g);
  colliders.push(makeCollider(x, z, 3, 3.4));
}
