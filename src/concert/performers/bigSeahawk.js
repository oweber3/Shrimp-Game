import * as THREE from 'three';
import { makePerformer, bodyMaterial, emissiveMaterial, beatPulse } from './performerRig.js';

// ============================================================================
// Big (Sea)Hawk — the chopped-and-screwed outro cameo.
//
// The cheapest act by design: a near-black osprey silhouette seen far away over
// the levee, intentionally less solid than the headliners. Emissive eye dots,
// desaturated white wing-flashes, and a faint red edge light. It "flickers in"
// as a hologram — the body carries a low base opacity and the pose applies an
// intermittent signal-flicker rather than a clean presence.
//
// Authored so the wingspan ≈ 1 unit; the shared Performer scales it to `SPAN`
// (roster target: 44u wingspan). Loop: slow bank, wingbeat hold, signal flicker.
// ============================================================================

const SPAN = 44;

const SILHOUETTE = 0x0a0f1c; // nearly-black navy
const WING_FLASH = 0xb9c4d0; // desaturated white
const RED_EDGE = 0xd83a3a;

export function createBigSeahawk() {
  const group = new THREE.Group();

  // Body is a translucent silhouette — the hologram read.
  const bodyMat = new THREE.MeshStandardMaterial({
    color: SILHOUETTE, roughness: 0.7, metalness: 0.1,
    transparent: true, opacity: 0.6,
  });
  const flashMat = emissiveMaterial(WING_FLASH, 0.5);
  const redMat = emissiveMaterial(RED_EDGE, 0.9);
  const eyeMat = emissiveMaterial(0xffe08a, 1.8);

  const add = (parent, mesh) => { parent.add(mesh); return mesh; };

  // `core` sits at mid-height so the glider reads as airborne; flicker toggles
  // its visibility without touching the dissolve opacity of the materials.
  const core = new THREE.Group();
  core.position.y = 0.55;
  group.add(core);

  // ---- Fuselage body + head ----------------------------------------------
  const body = add(core, new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), bodyMat));
  body.scale.set(1, 1, 2.4); // stretched fore-aft

  const head = new THREE.Group();
  head.position.set(0, 0.01, 0.16);
  core.add(head);
  const skull = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), bodyMat));
  const beak = add(head, new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 6), bodyMat));
  beak.rotation.x = Math.PI / 2;
  beak.position.z = 0.06;
  for (const side of [-1, 1]) {
    const eye = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), eyeMat));
    eye.position.set(side * 0.03, 0.02, 0.04);
  }

  // ---- Swept wings: a root box + tip feather fan --------------------------
  function buildWing(side) {
    const wing = new THREE.Group();
    wing.position.set(side * 0.05, 0.01, 0.02);
    core.add(wing);

    const inner = add(wing, new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.16), bodyMat));
    inner.position.set(side * 0.14, 0, -0.02);
    inner.rotation.y = side * 0.25; // sweep back

    const outer = add(wing, new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.1), bodyMat));
    outer.position.set(side * 0.34, 0, -0.07);
    outer.rotation.y = side * 0.5;

    // Primary feather fan at the tip.
    for (let i = 0; i < 4; i++) {
      const feather = add(wing, new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.14, 3), bodyMat));
      feather.scale.set(1, 1, 0.4);
      feather.position.set(side * (0.44 + i * 0.015), 0, -0.11 - i * 0.02);
      feather.rotation.z = Math.PI / 2;
      feather.rotation.y = side * (0.6 + i * 0.08);
    }
    // Desaturated white leading-edge flash + faint red trailing edge.
    const flash = add(wing, new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.016, 0.02), flashMat));
    flash.position.set(side * 0.26, 0.005, 0.05);
    flash.rotation.y = side * 0.35;
    const redEdge = add(wing, new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.014, 0.015), redMat));
    redEdge.position.set(side * 0.24, -0.005, -0.1);
    redEdge.rotation.y = side * 0.4;

    return wing;
  }
  const wingL = buildWing(-1);
  const wingR = buildWing(1);

  // ---- Tail fan -----------------------------------------------------------
  const tail = add(core, new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 3), bodyMat));
  tail.scale.set(1, 1, 0.35);
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, 0, -0.22);

  const parts = { core, wingL, wingR, head, tail };

  return makePerformer({
    id: 'seahawk',
    group,
    parts,
    pose: poseSeahawk,
    height: SPAN,
    flashColor: RED_EDGE,
    ringColor: RED_EDGE,
    hoverFreq: 0.22,
    hoverAmp: SPAN * 0.015,
  });
}

function poseSeahawk(parts, dt, t, beatPhase) {
  const { core, wingL, wingR } = parts;

  // Slow glide: a lazy bank, a held wingbeat that dips and rises.
  core.rotation.z = Math.sin(t * 0.5) * 0.18;
  core.rotation.y = Math.sin(t * 0.22) * 0.35;
  const beat = Math.sin(t * 1.3);
  wingL.rotation.z = 0.1 + beat * 0.22;
  wingR.rotation.z = -0.1 - beat * 0.22;

  // Chopped/screwed signal flicker: mostly present, with brief deterministic
  // dropouts and a couple of fast stutters — the hologram losing sync.
  const f = (t * 9.0) % 1;
  const stutter = (t * 23.0) % 1;
  core.visible = !(f > 0.86 || (stutter > 0.93 && Math.sin(t * 40) > 0));
}
