import * as THREE from 'three';
import { makePerformer, bodyMaterial, emissiveMaterial, beatPulse } from './performerRig.js';

// ============================================================================
// The Travis Fish — the anchor act (Movement 2 headliner).
//
// A triggerfish with dreadlocks. Not a fish-person: one laterally compressed
// trunk with the head as its front third, eyes set high and far back, mirrored
// soft dorsal/anal fins, small pectorals, a fan tail — and the meme face:
// heavy pale human lips held open over uneven off-white teeth, braids draped
// across the brow. Authored ~1 unit tall (anal-fin tip y ≈ 0, dorsal tip
// y ≈ 1); the shared Performer scales it to `HEIGHT` and drives the lifecycle.
//
// SYMMETRY POLICY — every left/right pair is emitted by a
// `for (const side of [-1, 1])` loop with `x` scaled and yaw/roll negated by
// `side`; centerline parts sit at literally x = 0; every placement derives
// from the constant block below (tune a constant, never a mesh literal). The
// only intentional asymmetries are the braid drape table, the tooth jitter
// table, and the mic gripped in the right pectoral fin.
// ============================================================================

const HEIGHT = 58;

const SKIN = 0x667d69; // murky gray / olive fish skin
const SKIN_DARK = 0x3f5147; // gill + eyelid accent
const MUZZLE = 0x4a5148; // blunt darker snout
const LIP = 0x778675; // washed-out lower lip
const BRAID = 0x141417; // near-black braids
const TOOTH = 0xe5dfc8; // uneven, old off-white teeth
const CHAIN = 0xd9c78d; // pale-gold chain links
const BEAD = 0xcbd1d4; // occasional silver braid beads

const DOWN = new THREE.Vector3(0, -1, 0);

// ---- Anatomy constants (authored units; y up, snout at +Z) -----------------
const BODY_LEN = 0.85; // trunk ellipsoid length (Z)
const BODY_HEIGHT = 0.62; // trunk ellipsoid height (Y)
const BODY_THICK = 0.26; // trunk ellipsoid thickness (X) — laterally compressed
const BODY_Y = 0.5; // trunk centre height (fins reach y = 0 and y = 1)
const SNOUT_Z = 0.5; // front face of the lips
const GILL_Z = 0.08; // gill slit plane — the head is everything forward of it
const MOUTH_Y = 0.42; // small terminal mouth, low at the very front
const EYE_X = 0.105; // eyes sit just proud of the skull flank
const EYE_Y = 0.7; // high on the skull…
const EYE_Z = 0.21; // …and far back: ~2/3 of the way from mouth to gill
const PECTORAL_Z = 0.0; // pectoral pivot, just behind the gill line
const PECTORAL_Y = 0.42;
const TAIL_Z = -0.38; // caudal peduncle root (tail group pivot)
const HEAD_PIVOT_Y = 0.6; // nod pivot near the gill top so the face swings
const HEAD_PIVOT_Z = 0.06;
const MOUTH_SCALE = 0.45; // the meme mouth kit, shrunk onto the little snout
const BRAID_FRONT = 0.75; // uniform squeeze of the drape's forward push
const FIN2_Y = 0.325; // second-dorsal / anal centre offset from trunk centre
const FIN2_RAKE = 0.5; // long-axis rake so both plates slope into the peduncle
const FIN_BASE_YAW = 0.5; // pectoral resting sweep away from the flank

// Three-quarter turn on one wrapper group: face toward the crowd (+Z), tall
// flank catching the stage light. concertShow.js applies no yaw at the anchor.
const BODY_YAW = 0.38;
const LUNGE_DIR_X = Math.sin(BODY_YAW);
const LUNGE_DIR_Z = Math.cos(BODY_YAW);
const SWIM_W = Math.PI * 2 * 0.8; // swim-idle yaw sine, ~0.8 Hz

// Trunk half-height at a given z along the ellipsoid — used to root the
// trigger spines on the back line instead of eyeballing their y literals.
function trunkTopAt(z) {
  return (BODY_HEIGHT / 2) * Math.sqrt(Math.max(0, 1 - (z / (BODY_LEN / 2)) ** 2));
}

// A deliberately blunt, low-poly frustum: broad where it joins the skull and
// only slightly narrower at the face. Its hard planes sell the pasted-on,
// photobashed muzzle better than another clean ellipsoid would.
function makeMuzzleGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.37, 0.13, -0.09, 0.37, 0.13, -0.09,
    0.35, -0.14, -0.09, -0.35, -0.14, -0.09,
    -0.32, 0.09, 0.09, 0.32, 0.09, 0.09,
    0.29, -0.11, 0.09, -0.29, -0.11, 0.09,
  ], 3));
  geometry.setIndex([
    4, 7, 6, 4, 6, 5, // blunt front
    0, 1, 2, 0, 2, 3, // skull-facing back
    0, 4, 5, 0, 5, 1, // top
    3, 2, 6, 3, 6, 7, // bottom
    0, 3, 7, 0, 7, 4, // left cheek
    1, 5, 6, 1, 6, 2, // right cheek
  ]);
  geometry.computeVertexNormals();
  return geometry;
}

// Thin rounded fin plate standing in the fish's centre plane (x = 0): an
// ellipse `rz` long (Z) by `ry` tall (Y), optionally raked in-plane so the
// long axis follows the back line. Pair with a DoubleSide material.
function makeFinGeometry(rz, ry, rake = 0) {
  const geometry = new THREE.CircleGeometry(1, 20);
  geometry.scale(rz, ry, 1);
  if (rake) geometry.rotateZ(rake);
  geometry.rotateY(Math.PI / 2);
  return geometry;
}

export function createTravisFish() {
  const group = new THREE.Group();

  const skin = bodyMaterial(SKIN, { roughness: 0.5, metalness: 0.1 });
  const skinDark = bodyMaterial(SKIN_DARK, { roughness: 0.5 });
  const muzzleMat = bodyMaterial(MUZZLE, { roughness: 0.72, metalness: 0.02 });
  const lipMat = bodyMaterial(LIP, { roughness: 0.66 });
  const mouthMat = bodyMaterial(0x090b09, { roughness: 0.9 });
  const toothMat = bodyMaterial(TOOTH, { roughness: 0.76 });
  const braidMat = bodyMaterial(BRAID, { roughness: 0.7 });
  const chainMat = bodyMaterial(CHAIN, { roughness: 0.25, metalness: 0.9 });
  const beadMat = bodyMaterial(BEAD, { roughness: 0.2, metalness: 0.92 });
  const eyeIris = bodyMaterial(0xb6c3a6, { roughness: 0.58, metalness: 0 });
  eyeIris.emissive.setHex(0x151c12);
  eyeIris.emissiveIntensity = 0.45;
  const eyeDark = bodyMaterial(0x080a08, { roughness: 0.3 });
  const lidMat = skinDark;
  const finMat = new THREE.MeshStandardMaterial({
    color: SKIN_DARK, roughness: 0.45, metalness: 0.05, side: THREE.DoubleSide,
  });

  const add = (parent, mesh) => { parent.add(mesh); return mesh; };

  // `wrapper` owns the fixed three-quarter facing and the rage-lunge
  // translation; `body` (origin at the trunk centre) owns the swim yaw and the
  // nod counter-pitch, so neither animation disturbs the other.
  const wrapper = new THREE.Group();
  wrapper.rotation.y = BODY_YAW;
  group.add(wrapper);

  const body = new THREE.Group();
  body.position.set(0, BODY_Y, 0);
  wrapper.add(body);

  // ---- Trunk: one laterally compressed ellipsoid, snout at +Z ------------
  const trunk = add(body, new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 18), skin));
  trunk.scale.set(BODY_THICK, BODY_HEIGHT, BODY_LEN);

  // Gill slit line: a thin dark panel per flank marks where the head "ends".
  for (const side of [-1, 1]) {
    const gill = add(body, new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.26, 0.045), skinDark));
    gill.position.set(side * BODY_THICK * 0.47, 0, GILL_Z);
    gill.rotation.y = side * 0.22;
  }

  // ---- First dorsal: the erect trigger, on the centerline -----------------
  // One stout spine and two followers rooted on the back line, raked back.
  for (const { z, h } of [{ z: 0.1, h: 0.22 }, { z: 0.16, h: 0.14 }, { z: 0.21, h: 0.09 }]) {
    const spine = add(body, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, h, 6), skinDark));
    spine.position.set(0, trunkTopAt(z) + h / 2 - 0.03, z);
    spine.rotation.x = -0.22;
  }

  // ---- Second dorsal (+1) and anal (-1): mirrored plates, rear half -------
  // Raked so each slopes from its tall front edge down into the peduncle;
  // their tips land exactly on y = 1 and y = 0.
  for (const vert of [-1, 1]) {
    const fin = add(body, new THREE.Mesh(makeFinGeometry(0.24, 0.15, vert * -FIN2_RAKE), finMat));
    fin.position.set(0, vert * FIN2_Y, -0.14);
  }

  // ---- Tail: narrow caudal peduncle into a thin fan plate -----------------
  const tail = new THREE.Group();
  tail.position.set(0, 0, TAIL_Z);
  body.add(tail);
  const peduncle = add(tail, new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), skin));
  peduncle.position.set(0, 0, -0.08);
  peduncle.scale.set(0.14, 0.18, 0.3);
  const fan = add(tail, new THREE.Mesh(makeFinGeometry(0.12, 0.2, 0), finMat));
  fan.position.set(0, 0, -0.24);

  // ---- Pectorals: small mirrored blades just behind the gill line ---------
  const fins = {};
  for (const side of [-1, 1]) {
    const fin = new THREE.Group();
    fin.position.set(side * BODY_THICK * 0.42, PECTORAL_Y - BODY_Y, PECTORAL_Z);
    fin.rotation.y = -side * FIN_BASE_YAW;
    fin.rotation.z = side * 0.3;
    body.add(fin);
    const blade = add(fin, new THREE.Mesh(makeFinGeometry(0.11, 0.065, 0), finMat));
    blade.position.set(0, 0, -0.09);
    fins[side] = fin;
  }

  // INTENTIONAL ASYMMETRY: the mic is gripped at the base of the RIGHT
  // pectoral fin only — stubby cylinder + emissive tip aimed at the mouth.
  const mic = new THREE.Group();
  mic.position.set(0.02, -0.02, 0);
  mic.rotation.x = 0.9;
  fins[1].add(mic);
  const micBody = add(mic, new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.16, 10), braidMat));
  micBody.position.y = 0.02;
  const micHead = add(mic, new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), emissiveMaterial(0xff5a2a, 1.1)));
  micHead.position.y = 0.12;

  // ---- Chain necklace: chunky overlapping links in a deep U ---------------
  // Draped across the throat just below the gape; the group squeeze fits the
  // Gerald-width U to the narrow trunk.
  const chain = new THREE.Group();
  chain.position.set(0, -0.1, 0.14);
  chain.scale.set(0.5, 0.8, 1);
  body.add(chain);
  const linkGeometry = new THREE.TorusGeometry(0.032, 0.012, 5, 8);
  const linkCount = 13;
  for (let i = 0; i < linkCount; i++) {
    const u = i / (linkCount - 1) * 2 - 1;
    const link = add(chain, new THREE.Mesh(linkGeometry, chainMat));
    link.position.set(u * 0.29, 0.015 - (1 - u * u) * 0.16, 0.22 - Math.abs(u) * 0.018);
    link.scale.set(1.14, 0.78, 1);
    link.rotation.z = (i % 2 ? 0.24 : -0.24) + u * 0.16;
  }

  // ---- Head: the front third of the trunk silhouette, one nod group -------
  // Holds skull, snout, mouth, eyes, and braid anchors so the beat nod moves
  // the whole face as a unit. Children are placed as (CONST - pivot).
  const head = new THREE.Group();
  head.position.set(0, HEAD_PIVOT_Y - BODY_Y, HEAD_PIVOT_Z);
  body.add(head);

  // Skull: continues the trunk taper forward; nests inside the trunk at the
  // back so the ≤0.25 rad nod never opens a seam.
  const skull = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), skin));
  skull.position.set(0, 0.52 - HEAD_PIVOT_Y, 0.16 - HEAD_PIVOT_Z);
  skull.scale.set(BODY_THICK * 0.96, 0.52, 0.52);

  // Snout: a smaller lobe carrying the taper down to the low terminal mouth.
  const snout = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), skin));
  snout.position.set(0, 0.46 - HEAD_PIVOT_Y, 0.33 - HEAD_PIVOT_Z);
  snout.scale.set(0.19, 0.26, 0.3);

  // ---- Eyes: small, high, far back — one per side via the mirror loop -----
  for (const side of [-1, 1]) {
    const socket = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), eyeDark));
    socket.position.set(side * EYE_X, EYE_Y - HEAD_PIVOT_Y, EYE_Z - HEAD_PIVOT_Z);
    socket.scale.set(0.55, 1, 1);
    const eye = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), eyeIris));
    eye.position.set(side * (EYE_X + 0.008), EYE_Y - HEAD_PIVOT_Y, EYE_Z - HEAD_PIVOT_Z);
    eye.scale.set(0.5, 0.9, 0.9);
    const pupil = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), eyeDark));
    pupil.position.set(side * (EYE_X + 0.022), EYE_Y - HEAD_PIVOT_Y - 0.004, EYE_Z - HEAD_PIVOT_Z + 0.006);
    const lid = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 6), lidMat));
    lid.position.set(side * (EYE_X + 0.002), EYE_Y - HEAD_PIVOT_Y + 0.02, EYE_Z - HEAD_PIVOT_Z);
    lid.scale.set(0.55, 0.5, 0.95);
    lid.rotation.z = side * -0.13;
  }

  // ---- Mouth: small, terminal, held open — where the meme lives -----------
  // The whole Gerald-scale mouth kit rides in one uniformly scaled rig so its
  // internal proportions stay verbatim; the lips still bulge past the snout.
  const mouthRig = new THREE.Group();
  mouthRig.position.set(0, MOUTH_Y - HEAD_PIVOT_Y, SNOUT_Z - 0.06 - HEAD_PIVOT_Z);
  mouthRig.scale.setScalar(MOUTH_SCALE);
  head.add(mouthRig);

  // Blunt hard-planed upper lip.
  const muzzle = add(mouthRig, new THREE.Mesh(makeMuzzleGeometry(), muzzleMat));
  muzzle.position.set(0, 0.055, 0.02);

  // Jaw group flaps on the beat: dark cavity, pale lower lip, six teeth.
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.065, -0.02);
  mouthRig.add(jaw);
  const mouth = add(jaw, new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.48, 4, 12), mouthMat));
  mouth.position.set(0, 0.012, 0.09);
  mouth.rotation.z = Math.PI / 2;
  mouth.scale.z = 0.56;
  const lowerLip = add(jaw, new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 8), lipMat));
  lowerLip.position.set(0, -0.071, 0.075);
  lowerLip.scale.set(1.25, 0.28, 0.45);

  // INTENTIONAL ASYMMETRY: per-tooth jitter (≤8% of tooth size) so the grin
  // reads as old and uneven rather than a pristine grill.
  const toothGeometry = new THREE.SphereGeometry(1, 8, 6);
  const teeth = [
    [-0.218, 0.036, 0.137, 0.026, 0.034, -0.1],
    [-0.132, 0.027, 0.141, 0.031, 0.042, 0.06],
    [-0.042, 0.034, 0.143, 0.025, 0.031, -0.04],
    [0.048, 0.026, 0.142, 0.029, 0.039, 0.08],
    [0.137, 0.037, 0.14, 0.024, 0.032, -0.08],
    [0.219, 0.025, 0.136, 0.027, 0.037, 0.04],
  ];
  for (const [x, y, z, width, height, tilt] of teeth) {
    const tooth = add(jaw, new THREE.Mesh(toothGeometry, toothMat));
    tooth.position.set(x, y, z);
    tooth.scale.set(width, height, 0.018);
    tooth.rotation.z = tilt;
  }

  // ---- Braids: thin jointed strands draped from the crown over the face ---
  // INTENTIONAL ASYMMETRY: the per-strand drape table (drift/bow/front/phase)
  // varies so the dreads read as hair, not extrusions. Anchors sweep the new
  // skull crown (in world units, converted to head-local below).
  const braids = [];
  const segmentLength = 0.085;
  const braidSegmentGeometries = [0, 1, 2, 3, 4, 5].map((i) => (
    new THREE.CylinderGeometry(0.0105 - i * 0.00085, 0.0092 - i * 0.00085, segmentLength, 6)
  ));
  const braidSpecs = [
    { anchor: [-0.105, 0.685, 0.24], drift: -0.055, bow: -0.018, front: 0.18, count: 5, phase: 0.3 },
    { anchor: [-0.08, 0.735, 0.255], drift: -0.035, bow: 0.018, front: 0.29, count: 6, phase: 1.2, bead: 5 },
    { anchor: [-0.045, 0.765, 0.25], drift: -0.035, bow: -0.018, front: 0.405, count: 6, phase: 2.1 },
    { anchor: [0, 0.775, 0.245], drift: -0.028, bow: -0.025, front: 0.42, count: 6, phase: 3.0, bead: 4 },
    { anchor: [0.045, 0.765, 0.25], drift: 0.035, bow: 0.02, front: 0.4, count: 6, phase: 4.1 },
    { anchor: [0.08, 0.735, 0.255], drift: 0.045, bow: -0.016, front: 0.28, count: 6, phase: 5.0, bead: 5 },
    { anchor: [0.105, 0.685, 0.24], drift: 0.06, bow: 0.018, front: 0.18, count: 5, phase: 5.9 },
  ];
  for (const spec of braidSpecs) {
    const braid = new THREE.Group();
    braid.position.set(spec.anchor[0], spec.anchor[1] - HEAD_PIVOT_Y, spec.anchor[2] - HEAD_PIVOT_Z);
    head.add(braid);

    const restPoints = [];
    const points = [];
    const segments = [];
    for (let i = 0; i <= spec.count; i++) {
      const p = i / spec.count;
      restPoints.push(new THREE.Vector3(
        spec.drift * p + spec.bow * Math.sin(p * Math.PI),
        -segmentLength * i,
        // Accelerate toward the camera immediately after the scalp anchor so
        // even the first link rides over the forehead instead of vanishing in
        // the skull before reappearing on the snout.
        spec.front * BRAID_FRONT * Math.sin(Math.sqrt(p) * Math.PI * 0.5),
      ));
      points.push(new THREE.Vector3());
      if (i < spec.count) {
        segments.push(add(braid, new THREE.Mesh(braidSegmentGeometries[i], braidMat)));
      }
    }

    const beads = [];
    if (spec.bead != null) {
      const bead = add(braid, new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), beadMat));
      bead.scale.y = 1.25;
      bead.userData.pointIndex = spec.bead;
      beads.push(bead);
    }
    braid.userData.restPoints = restPoints;
    braid.userData.points = points;
    braid.userData.segments = segments;
    braid.userData.beads = beads;
    braid.userData.phase = spec.phase;
    braid.userData.nodLag = 0;
    braid.userData.direction = new THREE.Vector3();
    braid.userData.midpoint = new THREE.Vector3();
    updateBraid(braid, 0, 0, 0);
    braids.push(braid);
  }

  const parts = { wrapper, body, head, jaw, tail, finL: fins[-1], finR: fins[1], braids };

  return makePerformer({
    id: 'travis',
    group,
    parts,
    pose: poseTravis,
    height: HEIGHT,
    flashColor: 0xb6ff5a, // acid-green stage rim
    ringColor: 0xb6ff5a,
    hoverFreq: 0.34,
  });
}

// Allocation-free: only scalar math and the braids' own scratch vectors.
function poseTravis(parts, dt, t, beatPhase) {
  const pulse = beatPulse(beatPhase);
  const { wrapper, body, head, jaw, tail, finL, finR, braids } = parts;

  // Beat nod: the whole face dips as a unit; the trunk counter-pitches a
  // touch so the silhouette rocks instead of hinging at the gill.
  head.rotation.x = -0.04 + pulse * 0.2;

  // Jaw flaps a touch with the beat (spitting bars) over the held-open gape.
  jaw.rotation.x = pulse * 0.2;

  // Swim idle: a slow yaw sine through the trunk with the tail and both
  // pectorals trailing behind in phase.
  const swim = t * SWIM_W;
  body.rotation.y = Math.sin(swim) * 0.07;
  const lag = Math.sin(swim - 1.1);

  // Rage moment roughly every 4 s: whole-body forward lunge along the fixed
  // facing (wrapper translation only — nothing bends) plus a fast tail thrash.
  const cyc = t % 4.0;
  const lungeK = cyc < 0.55 ? Math.sin((cyc / 0.55) * Math.PI) : 0;
  wrapper.position.x = LUNGE_DIR_X * lungeK * 0.16;
  wrapper.position.z = LUNGE_DIR_Z * lungeK * 0.16;
  body.rotation.x = -pulse * 0.05 - lungeK * 0.1;

  tail.rotation.y = lag * 0.28 + lungeK * Math.sin(t * 26) * 0.5;
  finL.rotation.y = FIN_BASE_YAW + lag * 0.18;
  finR.rotation.y = -FIN_BASE_YAW + lag * 0.18;

  // Each point on each strand has a later phase and a larger tip excursion.
  // A damped copy of the beat makes the lower braid visibly follow the nod;
  // the rest curve keeps it just outside the face even on the backward swing.
  for (let i = 0; i < braids.length; i++) {
    updateBraid(braids[i], dt, t, pulse);
  }
}

function updateBraid(braid, dt, t, pulse) {
  const data = braid.userData;
  const response = 1 - Math.exp(-Math.min(Math.max(dt, 0), 0.05) * 4.2);
  data.nodLag += (pulse - data.nodLag) * response;

  for (let i = 0; i < data.points.length; i++) {
    const p = i / (data.points.length - 1);
    const point = data.points[i];
    point.copy(data.restPoints[i]);
    if (i > 0) {
      const weightedTip = Math.pow(p, 1.35);
      const lateSway = Math.sin(t * 1.65 + data.phase - p * 2.15);
      const looseTwist = Math.sin(t * 2.35 + data.phase * 1.7 - p * 1.1);
      point.x += lateSway * (0.008 + weightedTip * 0.036);
      point.z += Math.max(-0.012, (data.nodLag - pulse) * 0.11) * weightedTip;
      point.z += (looseTwist + 1) * 0.004 * weightedTip;
    }
  }

  for (let i = 0; i < data.segments.length; i++) {
    const from = data.points[i];
    const to = data.points[i + 1];
    const segment = data.segments[i];
    data.midpoint.copy(from).add(to).multiplyScalar(0.5);
    data.direction.copy(to).sub(from);
    const length = data.direction.length();
    segment.position.copy(data.midpoint);
    segment.quaternion.setFromUnitVectors(DOWN, data.direction.multiplyScalar(1 / length));
    segment.scale.y = length / 0.085;
  }

  for (const bead of data.beads) {
    bead.position.copy(data.points[bead.userData.pointIndex]);
    bead.rotation.z = Math.sin(t * 1.8 + data.phase) * 0.2;
  }
}
