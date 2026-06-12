import * as THREE from 'three';
import { createShrimpWorker } from './npc.js';
import { resolveCollisions, clampToBounds } from './collision.js';

const WALK_SPEED = 6;
const JOG_SPEED = 11;
const PLAYER_RADIUS = 0.55;

// Third-person player: a shrimp worker with a white hard hat. Mouse orbits
// the camera, WASD/arrows move relative to the camera, Shift jogs, R resets.
export class Player {
  constructor(scene, camera, spawn) {
    this.camera = camera;
    this.spawn = spawn.clone();
    this.position = spawn.clone();
    this.yaw = Math.PI; // face north (toward -Z) at spawn
    this.pitch = 0.25;
    this.heading = Math.PI;
    this.keys = {};
    this.movementLocked = false;
    this.carrying = null;

    this.mesh = createShrimpWorker({
      shellColor: 0xf2825a,
      vestColor: 0xf2c12e,
      hatColor: 0xffffff
    });
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyR') this.reset();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement) {
        this.yaw -= e.movementX * 0.0025;
        this.pitch += e.movementY * 0.002;
        this.pitch = Math.max(-0.1, Math.min(1.1, this.pitch));
      }
    });
  }

  reset() {
    this.position.copy(this.spawn);
    this.yaw = Math.PI;
    this.pitch = 0.25;
  }

  carry(object3d) {
    this.carrying = object3d;
  }

  dropCarry() {
    this.carrying = null;
  }

  isJogging() {
    return !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
  }

  update(dt, colliders, bounds) {
    let mx = 0;
    let mz = 0;
    if (!this.movementLocked) {
      if (this.keys['KeyW'] || this.keys['ArrowUp']) mz += 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) mz -= 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) mx -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) mx += 1;
    }

    const moving = mx !== 0 || mz !== 0;
    if (moving) {
      const len = Math.hypot(mx, mz);
      mx /= len;
      mz /= len;
      const speed = this.isJogging() ? JOG_SPEED : WALK_SPEED;
      // Move relative to camera yaw. Forward is -Z when yaw is PI.
      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);
      const dx = (mz * sin - mx * cos) * speed * dt;
      const dz = (mz * cos + mx * sin) * speed * dt;
      this.position.x += dx;
      this.position.z += dz;
      this.heading = Math.atan2(dx, dz);
    }

    resolveCollisions(this.position, PLAYER_RADIUS, colliders);
    clampToBounds(this.position, bounds, PLAYER_RADIUS + 0.2);
    this.position.y = 0; // never fall through the world

    // Mesh follows position, rotates toward travel direction, bobs while moving.
    this.mesh.position.set(this.position.x, 0, this.position.z);
    if (moving) {
      const t = performance.now() * 0.001;
      this.mesh.position.y = Math.abs(Math.sin(t * (this.isJogging() ? 14 : 9))) * 0.08;
      this.mesh.rotation.y = lerpAngle(this.mesh.rotation.y, this.heading, dt * 10);
    }

    // Carried object floats in front of the player.
    if (this.carrying) {
      const fx = Math.sin(this.mesh.rotation.y);
      const fz = Math.cos(this.mesh.rotation.y);
      this.carrying.position.set(
        this.position.x + fx * 0.7,
        1.2 + Math.sin(performance.now() * 0.003) * 0.05,
        this.position.z + fz * 0.7
      );
      this.carrying.rotation.y = this.mesh.rotation.y;
    }

    // Third-person camera orbit.
    const camDist = 7.5;
    const camHeight = 2 + Math.sin(this.pitch) * camDist;
    const horiz = Math.cos(this.pitch) * camDist;
    const cx = this.position.x - Math.sin(this.yaw) * horiz;
    const cz = this.position.z - Math.cos(this.yaw) * horiz;
    this.camera.position.lerp(new THREE.Vector3(cx, camHeight, cz), Math.min(1, dt * 12));
    this.camera.lookAt(this.position.x, 1.8, this.position.z);
  }
}

function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, t);
}
