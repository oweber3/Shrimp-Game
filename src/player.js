import * as THREE from 'three';
import { createShrimpWorker } from './characters/shrimpWorker.js';
import { createGait, updateGait } from './characters/animation.js';
import { createFace, updateFace } from './characters/face.js';
import { resolveCollisions, clampToBounds } from './collision.js';

const _anchorWorld = new THREE.Vector3();

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
    // Analog movement axis, written by non-keyboard input sources (the mobile
    // virtual joystick). Same convention as the WASD contribution below:
    // +z is forward, +x is right, magnitude 0..1. Stays {0,0} on desktop so
    // keyboard behaviour is completely unchanged.
    this.moveAxis = { x: 0, z: 0 };
    this.movementLocked = false;
    this.carrying = null;
    this.onStep = null; // fired once per footfall (audio hook)

    this.mesh = createShrimpWorker({
      shellColor: 0xf2825a,
      vestColor: 0xf2c12e,
      hatColor: 0xffffff,
      accessory: 'toolbelt'
    });
    this.parts = this.mesh.userData.parts;
    this.rig = this.mesh.userData.rig;
    // Procedural gait + face (Phase 13). The gait's footfall hook drives the
    // existing footstep audio, replacing the old |sin| cycle counter.
    // The player moves fast; larger strides keep the cadence from looking
    // frantic, and a deeper foot reach gives visible, weighty steps.
    this.gait = createGait(this.rig, {
      walkStride: 2.0, jogStride: 2.5, footReach: 0.34, stepHeight: 0.16, armSwing: 0.55
    });
    this.gait.stepCb = () => { if (this.onStep) this.onStep(); };
    this.face = createFace(this.rig && this.rig.face);
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

  // Digital movement intent (forward/back/left/right) merged from the
  // keyboard and the analog joystick. Consumed by digital-input systems such
  // as the golf cart so they get a single, source-agnostic view of the input.
  getMoveInput() {
    const k = this.keys;
    const a = this.moveAxis;
    const T = 0.35; // analog threshold so a resting stick reads as "no input"
    return {
      forward: !!(k['KeyW'] || k['ArrowUp']) || a.z > T,
      back: !!(k['KeyS'] || k['ArrowDown']) || a.z < -T,
      left: !!(k['KeyA'] || k['ArrowLeft']) || a.x < -T,
      right: !!(k['KeyD'] || k['ArrowRight']) || a.x > T,
    };
  }

  update(dt, colliders, bounds) {
    let mx = 0;
    let mz = 0;
    if (!this.movementLocked) {
      if (this.keys['KeyW'] || this.keys['ArrowUp']) mz += 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) mz -= 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) mx -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) mx += 1;
      // Analog joystick contribution (mobile). Adds on top of the keyboard so
      // the two never fight; on desktop moveAxis is {0,0} and this is a no-op.
      mx += this.moveAxis.x;
      mz += this.moveAxis.z;
    }

    const moving = Math.hypot(mx, mz) > 1e-3;
    if (moving) {
      // Clamp the input vector to unit length instead of always normalising:
      // a full keyboard press (len >= 1) is unchanged, while a partly-pushed
      // joystick (len < 1) keeps its magnitude for smooth, analog speed.
      const len = Math.hypot(mx, mz);
      if (len > 1) {
        mx /= len;
        mz /= len;
      }
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

    // Mesh follows position (feet stay grounded; the gait bobs the torso) and
    // rotates toward the travel direction.
    this.mesh.position.set(this.position.x, 0, this.position.z);
    const prevYaw = this._prevMeshYaw ?? this.mesh.rotation.y;
    if (moving) {
      this.mesh.rotation.y = lerpAngle(this.mesh.rotation.y, this.heading, dt * 10);
    }
    const turnRate = dt > 0 ? shortestAngle(this.mesh.rotation.y - prevYaw) / dt : 0;
    this._prevMeshYaw = this.mesh.rotation.y;

    const speed = moving ? (this.isJogging() ? JOG_SPEED : WALK_SPEED) : 0;
    updateGait(this.rig, this.gait, dt, {
      speed, moving, jogging: this.isJogging(), turnRate
    });
    // Player face just blinks/breathes (no gaze target in third person).
    updateFace(this.face, dt, {});

    // Carried object floats at the character's carry anchor.
    if (this.carrying) {
      this.parts.carryAnchor.getWorldPosition(_anchorWorld);
      _anchorWorld.y += Math.sin(performance.now() * 0.003) * 0.05;
      this.carrying.position.copy(_anchorWorld);
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

// Wrap an angle delta into [-π, π] so turn rate stays sane across the seam.
function shortestAngle(d) {
  d %= Math.PI * 2;
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
