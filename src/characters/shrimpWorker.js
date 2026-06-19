import * as THREE from 'three';
import { addHardHat, addToolbelt, addClipboard } from './accessories.js';
import {
  createShellTexture,
  createShellNormalMap,
  createFabricTexture,
  createLeatherNormalMap
} from '../utils/geometry.js';

// Humanoid shrimp worker built entirely from primitives, organized as a
// Group hierarchy so limbs can be animated without skeletal rigging:
//
//   root Group
//     ├─ legL / legR   (pivot at the hip)
//     ├─ torso         (shell segments, vest, swimmerets, accessory)
//     │    ├─ armL / armR  (pivot at the shoulder)
//     │    ├─ head         (pivot at head center; includes hat + antennae)
//     │    └─ tail         (pivot at the tail base)
//     └─ carryAnchor   (named attachment point for carried items)
//
// Stable API (used by player.js, npc.js and missions.js):
//   root.userData.parts = { torso, head, armL, armR, legL, legR, tail, carryAnchor }

// Plain dielectric helper for the non-shell odds and ends (pant fabric, etc.).
function mat(color, roughness = 0.5, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

// Wet exoskeleton: a procedurally drawn shell albedo + a shared ridged normal
// map under a thin clearcoat lacquer layer. color stays white so the canvas
// texture fully drives the hue; stronger envMapIntensity makes the sky sit
// wetly on the shell. A MeshPhysicalMaterial is what unlocks the clearcoat.
function shellMaterial(color) {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: createShellTexture(color),
    normalMap: createShellNormalMap(),
    roughness: 0.35,
    metalness: 0.08,
    clearcoat: 0.4,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.2
  });
  m.normalScale = new THREE.Vector2(0.6, 0.6);
  return m;
}

// Glass-like wet eye: a deep, near-black dome under a mirror-smooth clearcoat
// that picks up the sky. This reads as a wet refractive shrimp eye without the
// expensive full-scene transmission render pass — important on the software-GL
// / low-end path this game deliberately supports.
function eyeMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0e0a07,
    roughness: 0.2,
    metalness: 0.0,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.5 // keep it a dark wet orb, not a full sky mirror
  });
}

// Layered stalk eye: glassy sclera dome, iris + pupil discs, a tiny emissive
// catch-light, and a thin shell brow ridge for a bit of expression. Built as a
// self-contained group so it can be dropped onto the head at the stalk tip.
function makeEye(side, shell) {
  const eye = new THREE.Group();
  const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 12), eyeMaterial());
  sclera.castShadow = true;
  eye.add(sclera);
  const iris = new THREE.Mesh(
    new THREE.CircleGeometry(0.034, 16),
    new THREE.MeshStandardMaterial({ color: 0x3a1d12, roughness: 0.3, metalness: 0.0 })
  );
  iris.position.set(0, 0, 0.052);
  eye.add(iris);
  const pupil = new THREE.Mesh(
    new THREE.CircleGeometry(0.016, 12),
    new THREE.MeshStandardMaterial({ color: 0x05060a, roughness: 0.2, metalness: 0.0 })
  );
  pupil.position.set(0, 0, 0.055);
  eye.add(pupil);
  const spec = new THREE.Mesh(
    new THREE.CircleGeometry(0.011, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.7, roughness: 0.1 })
  );
  spec.position.set(-0.018, 0.018, 0.058);
  eye.add(spec);
  // Brow ridge: a flattened shell dome arching over the eye.
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 6), shell);
  lid.scale.set(1.35, 0.4, 0.85);
  lid.position.set(0, 0.045, 0.0);
  lid.castShadow = true;
  eye.add(lid);
  eye.userData.side = side;
  return eye;
}

// Outfit palettes for variety when a color is not explicitly specified.
const HAT_PALETTE = [0xf5f0e6, 0xffffff, 0xffd34d, 0xe8e6df];
const BOOT_PALETTE = [0x4a3826, 0x3a3a3a, 0x5a4632];

// Smooth tapered tube along a Catmull-Rom curve: rings of vertices with
// per-ring radius, stitched into a closed surface. Replaces the old
// stacked-sphere tail with one continuous curled shell.
function taperedTube(points, radii, segments = 28, radialSegments = 14) {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(segments, false);
  const pos = [];
  const norm = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const ri = t * (radii.length - 1);
    const r0 = Math.floor(ri);
    const r1 = Math.min(radii.length - 1, r0 + 1);
    const r = radii[r0] + (radii[r1] - radii[r0]) * (ri - r0);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    for (let j = 0; j <= radialSegments; j++) {
      const a = (j / radialSegments) * Math.PI * 2;
      const sin = Math.sin(a);
      const cos = Math.cos(a);
      const nx = cos * N.x + sin * B.x;
      const ny = cos * N.y + sin * B.y;
      const nz = cos * N.z + sin * B.z;
      pos.push(p.x + nx * r, p.y + ny * r, p.z + nz * r);
      norm.push(nx, ny, nz);
      // u wraps around the tube, v runs along it — lets the shell map and its
      // ridged normal map land correctly on the tail and antennae.
      uv.push(j / radialSegments, t);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = a + radialSegments + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

export function createShrimpWorker(opts = {}) {
  const {
    shellColor = 0xe8744f,
    vestColor = 0xf2c12e,
    seed = 0,
    hatColor = HAT_PALETTE[seed % HAT_PALETTE.length],
    bootColor = BOOT_PALETTE[seed % BOOT_PALETTE.length],
    accessory = 'toolbelt' // 'toolbelt' | 'clipboard' | 'none'
  } = opts;

  const root = new THREE.Group();
  const shell = shellMaterial(shellColor);
  const shellDark = shellMaterial(new THREE.Color(shellColor).multiplyScalar(0.72).getHex());
  // Hi-vis trim: a touch of emissive so the reflective tape shimmers, plus a
  // little metalness for the silvered look.
  const silver = new THREE.MeshStandardMaterial({
    color: 0xc9d4d9, roughness: 0.35, metalness: 0.45,
    emissive: new THREE.Color(0xaaaaaa), emissiveIntensity: 0.1
  });

  const add = (parent, mesh) => {
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ---- Legs with work boots (pivot at the hip) ----
  // Boots get a leather-grain normal map (horizontal stress creases) so the
  // light catches the worn rubber/leather rather than reading as a flat box.
  const pants = mat(0x3a5a8c, 0.75, 0.0);
  const bootMat = new THREE.MeshStandardMaterial({
    color: bootColor, roughness: 0.7, metalness: 0.05,
    normalMap: createLeatherNormalMap()
  });
  bootMat.normalScale = new THREE.Vector2(0.5, 0.5);
  const legs = {};
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.15, 0.7, 0);
    const thigh = add(leg, new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.32, 12), pants));
    thigh.position.set(0, -0.06, 0.01);
    thigh.rotation.x = 0.08;
    const shin = add(leg, new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.34, 12), pants));
    shin.position.set(side * 0.01, -0.34, 0);
    const boot = add(leg, new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.17, 0.4), bootMat));
    boot.position.set(side * 0.01, -0.615, 0.06);
    const toe = add(leg, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.12), bootMat));
    toe.position.set(side * 0.01, -0.65, 0.27);
    root.add(leg);
    legs[side] = leg;
  }

  // ---- Torso: curved, segmented shrimp shell ----
  const torso = new THREE.Group();
  root.add(torso);
  const segs = [
    { y: 0.86, z: 0.03, r: 0.3, tilt: 0.1 },
    { y: 1.06, z: 0.07, r: 0.325, tilt: 0.24 },
    { y: 1.26, z: 0.08, r: 0.325, tilt: 0.38 },
    { y: 1.45, z: 0.04, r: 0.295, tilt: 0.54 },
    { y: 1.6, z: -0.03, r: 0.25, tilt: 0.68 }
  ];
  for (const s of segs) {
    const seg = add(torso, new THREE.Mesh(new THREE.SphereGeometry(s.r, 18, 12), shell));
    seg.scale.set(1, 0.78, 1.06);
    seg.position.set(0, s.y, s.z);
    seg.rotation.x = s.tilt;
    // Carapace crease: a thin dark ring extruded at each shell boundary gives
    // the segmented exoskeleton "plate" look.
    const band = add(torso, new THREE.Mesh(new THREE.TorusGeometry(s.r * 0.92, 0.024, 8, 20), shellDark));
    band.position.set(0, s.y - 0.09, s.z + 0.03);
    band.rotation.x = Math.PI / 2 + s.tilt;
  }

  // ---- Tail: one smooth tapered curl with a telson fan (pivot at base) ----
  const tail = new THREE.Group();
  tail.position.set(0, 0.78, -0.2);
  torso.add(tail);
  // More control points than before for a smoother, continuous abdominal curl
  // (the curve is then resampled at the tube's higher segment count).
  const tailGeo = taperedTube(
    [
      new THREE.Vector3(0, 0.09, 0.18),
      new THREE.Vector3(0, 0.08, 0.15),
      new THREE.Vector3(0, 0.02, 0.03),
      new THREE.Vector3(0, -0.04, -0.1),
      new THREE.Vector3(0, -0.12, -0.2),
      new THREE.Vector3(0, -0.2, -0.28),
      new THREE.Vector3(0, -0.28, -0.35),
      new THREE.Vector3(0, -0.36, -0.41),
      new THREE.Vector3(0, -0.44, -0.46),
      new THREE.Vector3(0, -0.5, -0.5),
      new THREE.Vector3(0, -0.55, -0.52),
      new THREE.Vector3(0, -0.58, -0.53)
    ],
    [0.22, 0.215, 0.205, 0.2, 0.18, 0.16, 0.14, 0.12, 0.1, 0.085, 0.055, 0.03]
  );
  add(tail, new THREE.Mesh(tailGeo, shell));
  for (const a of [-0.6, 0, 0.6]) {
    const blade = add(tail, new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), shellDark));
    blade.scale.set(0.55, 0.08, 1.15);
    blade.position.set(Math.sin(a) * 0.12, -0.58, -0.54 - Math.cos(a) * 0.05);
    blade.rotation.y = a;
    blade.rotation.x = 0.3;
  }

  // ---- Safety vest with reflective stripes ----
  // Fabric weave map gives the hi-vis cloth a woven texture instead of flat
  // plastic; the silver tape is shared with the emissive `silver` material.
  const vestMat = new THREE.MeshStandardMaterial({
    color: vestColor, roughness: 0.85, metalness: 0.0,
    map: createFabricTexture(vestColor)
  });
  const vest = add(torso, new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.41, 0.62, 16), vestMat));
  vest.position.set(0, 1.15, 0.05);
  vest.rotation.x = 0.2;
  const stripe = add(torso, new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.4, 0.09, 16), silver));
  stripe.position.set(0, 1.12, 0.05);
  stripe.rotation.x = 0.2;
  for (const side of [-1, 1]) {
    const strip = add(torso, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.015), silver));
    strip.position.set(side * 0.1, 1.18, 0.41);
    strip.rotation.x = 0.2;
  }

  // ---- Arms with claw pincers (pivot at the shoulder) ----
  const arms = {};
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.34, 1.42, 0.06);
    const shoulder = add(arm, new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), vestMat));
    shoulder.position.set(0, 0, 0);
    const upper = add(arm, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.32, 14), shell));
    upper.position.set(side * 0.11, -0.14, 0.04);
    upper.rotation.z = side * 0.55;
    upper.rotation.x = -0.15;
    const fore = add(arm, new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.3, 14), shell));
    fore.position.set(side * 0.21, -0.4, 0.16);
    fore.rotation.z = side * 0.25;
    fore.rotation.x = -0.5;
    // Pincer: two asymmetric lobes — a long, sharp-tipped dactyl and a stouter
    // lower finger, set slightly apart so the claw reads as a working pincer.
    const palmJoint = add(arm, new THREE.Mesh(new THREE.SphereGeometry(0.07, 9, 7), shellDark));
    palmJoint.position.set(side * 0.24, -0.52, 0.28);
    const bigPincer = add(arm, new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.27, 10), shellDark));
    bigPincer.position.set(side * 0.2, -0.56, 0.42);
    bigPincer.rotation.x = 1.5;
    bigPincer.rotation.z = side * -0.18;
    const smallPincer = add(arm, new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.19, 10), shellDark));
    smallPincer.position.set(side * 0.29, -0.5, 0.38);
    smallPincer.rotation.x = 1.25;
    smallPincer.rotation.z = side * 0.34;
    torso.add(arm);
    arms[side] = arm;
  }

  // ---- Small swimmeret legs under the belly ----
  for (const side of [-1, 1]) {
    for (const [py, pz] of [[0.74, 0.24], [0.66, 0.16]]) {
      const pleo = add(torso, new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.18, 6), shellDark));
      pleo.position.set(side * 0.14, py, pz);
      pleo.rotation.x = 0.7;
      pleo.rotation.z = side * 0.35;
    }
  }

  // ---- Head (pivot at head center; turning the group turns hat and all) ----
  const head = new THREE.Group();
  head.position.set(0, 1.8, 0.12);
  torso.add(head);
  const skull = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 12), shell));
  skull.scale.set(0.85, 0.95, 1.2);
  const rostrum = add(head, new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 10), shellDark));
  rostrum.position.set(0, 0.03, 0.32);
  rostrum.rotation.x = Math.PI / 2 + 0.15;
  for (const side of [-1, 1]) {
    // Eyes on short stalks, peeking out from under the hat brim.
    const stalk = add(head, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.14, 8), shellDark));
    stalk.position.set(side * 0.12, 0.08, 0.16);
    stalk.rotation.x = 0.8;
    stalk.rotation.z = side * 0.35;
    // Layered glassy stalk eye (sclera/iris/pupil/catch-light + brow ridge).
    const eye = makeEye(side, shell);
    eye.position.set(side * 0.155, 0.12, 0.21);
    eye.rotation.y = side * 0.25;
    head.add(eye);
    // Long antenna: one smooth tapered curve sweeping up, out and back.
    const antennaGeo = taperedTube(
      [
        new THREE.Vector3(side * 0.16, 0.08, 0.1),
        new THREE.Vector3(side * 0.34, 0.3, -0.08),
        new THREE.Vector3(side * 0.44, 0.24, -0.45),
        new THREE.Vector3(side * 0.4, -0.04, -0.75)
      ],
      [0.016, 0.013, 0.01, 0.005],
      18, 8
    );
    add(head, new THREE.Mesh(antennaGeo, shellDark));
    // Short antennule pointing forward.
    const ule = add(head, new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.2, 6), shellDark));
    ule.position.set(side * 0.06, 0.06, 0.32);
    ule.rotation.x = 1.0;
    ule.rotation.z = side * 0.2;
  }
  addHardHat(head, hatColor);

  // ---- Accessory ----
  if (accessory === 'toolbelt') addToolbelt(torso);
  else if (accessory === 'clipboard') addClipboard(torso);

  // ---- Carry anchor: where carried items sit, in front at chest height ----
  const carryAnchor = new THREE.Group();
  carryAnchor.position.set(0, 1.2, 0.7);
  root.add(carryAnchor);

  root.userData.parts = {
    torso,
    head,
    tail,
    armL: arms[-1],
    armR: arms[1],
    legL: legs[-1],
    legR: legs[1],
    carryAnchor
  };
  return root;
}
