import * as THREE from 'three';
import { makeCollider } from '../collision.js';
import { mat } from '../utils/geometry.js';
import { stepVehicle } from './vehiclePhysics.js';

// Driveable golf cart (Phase 6). Parked on the Intralox shipping apron.
// Mount with E within range; W/S drive, A/D steer, E again to hop off.
// The cart owns one mutable collider rectangle that follows it while
// parked and is moved out of the world while driving (so the cart's own
// collision circle doesn't fight it).

const PARK = { x: -30, z: 14, yaw: Math.PI / 2 }; // facing the main drive
const MOUNT_RANGE = 2.5;
const FAR_AWAY = 1e6;

export class GolfCart {
  constructor(scene, colliders) {
    this.mounted = false;
    this.state = { yaw: PARK.yaw, speed: 0 };
    this.group = buildCartMesh();
    this.wheels = this.group.wheels;
    this.group.position.set(PARK.x, 0, PARK.z);
    this.group.rotation.y = PARK.yaw;
    scene.add(this.group);

    this.collider = makeCollider(PARK.x, PARK.z, 3, 3);
    colliders.push(this.collider);
  }

  canMount(playerPos) {
    return !this.mounted && playerPos.distanceTo(this.group.position) < MOUNT_RANGE;
  }

  mount() {
    this.mounted = true;
    setColliderBox(this.collider, FAR_AWAY, FAR_AWAY, 1, 1);
  }

  // Returns the spot the player should reappear at (beside the cart).
  dismount() {
    this.mounted = false;
    this.state.speed = 0;
    const p = this.group.position;
    setColliderBox(this.collider, p.x, p.z, 3, 3);
    // Step off to the cart's left side.
    return new THREE.Vector3(
      p.x + Math.sin(this.state.yaw + Math.PI / 2) * 2,
      0,
      p.z + Math.cos(this.state.yaw + Math.PI / 2) * 2
    );
  }

  // `input` is a { forward, back, left, right } booleans object (see
  // Player.getMoveInput), so the cart drives identically from the keyboard or
  // the mobile joystick without knowing which one is active.
  update(dt, input, colliders, bounds) {
    if (!this.mounted) return;
    stepVehicle(this.state, this.group.position, input, dt, colliders, bounds);
    this.group.rotation.y = this.state.yaw;
    // Spin the wheels with travel.
    const roll = this.state.speed * dt / 0.32;
    for (const w of this.wheels) w.rotation.x += roll;
  }
}

function buildCartMesh() {
  const g = new THREE.Group();
  const white = mat(0xe8e6df);
  const dark = mat(0x2f3338);
  const seatMat = mat(0x6b4a2f);

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 2.7), dark);
  chassis.position.y = 0.45;
  chassis.castShadow = true;
  g.add(chassis);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 1.1), white);
  body.position.set(0, 0.8, 0.7); // front cowl
  body.castShadow = true;
  g.add(body);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.9), seatMat);
  seat.position.set(0, 0.85, -0.55);
  seat.castShadow = true;
  g.add(seat);
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.15), seatMat);
  seatBack.position.set(0, 1.25, -1.0);
  seatBack.castShadow = true;
  g.add(seatBack);
  // Steering column.
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), dark);
  column.position.set(-0.35, 1.1, 0.45);
  column.rotation.x = 0.6;
  g.add(column);
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 12), dark);
  wheelRim.position.set(-0.35, 1.38, 0.28);
  wheelRim.rotation.x = -0.97;
  g.add(wheelRim);
  // Canopy on four posts.
  for (const [px, pz] of [[-0.7, 0.95], [0.7, 0.95], [-0.7, -1.05], [0.7, -1.05]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), white);
    post.position.set(px, 1.45, pz);
    g.add(post);
  }
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 2.5), white);
  canopy.position.set(0, 2.25, -0.05);
  canopy.castShadow = true;
  g.add(canopy);

  // Wheels (rotation.x spins them when driving).
  g.wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.25, 10);
  for (const [wx, wz] of [[-0.75, 0.95], [0.75, 0.95], [-0.75, -0.95], [0.75, -0.95]]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.32, wz);
    w.castShadow = true;
    g.add(w);
    g.wheels.push(w);
  }
  return g;
}

// Mutate a collider rectangle in place (the colliders array holds it by
// reference, so the campus collision loop sees the move immediately).
function setColliderBox(c, x, z, sx, sz) {
  c.minX = x - sx / 2;
  c.maxX = x + sx / 2;
  c.minZ = z - sz / 2;
  c.maxZ = z + sz / 2;
}
