import * as THREE from 'three';
import { EXTERIOR_LAYER } from '../zones.js';
import { BREAK_AREA_CENTER } from '../map/layoutData.js';

// Golden Shrimp hunt: collectible tokens scattered across the campus. Walk
// into one to bag it — no key press. A HUD badge tracks the count and the
// audio manager plays a chime. Tokens are emissive gold so the bloom pass
// makes them glint; they spin and bob to draw the eye.
//
// All positions are fixed (deterministic), reachable on foot, and spread to
// reward exploration of corners the missions never send you to.

const SPOTS = [
  [BREAK_AREA_CENTER.x, BREAK_AREA_CENTER.z], // LM break pavilion
  [161, -2],     // by the drainage canal
  [-145, -94],   // River Road side of the Distribution yard
  [-33, 41],     // Storey Street cluster courtyard
  [-26, 119],    // main gate / guard shack
  [105, -66],    // Toler Street verge
  [30, 20],      // LM north service strip
  [12, 95],      // oaks on the main drive
  [86, 88],      // Laitram Machinery office lawn
  [-24, -32],    // 5211 Storey / Machine Shop frontage
  [-165, 42],    // River Road verge
  [96, -30]      // Toler Street / Machine Shop gap
];

const PICKUP_RADIUS = 2.0;

export class Collectibles {
  constructor(scene, audio, ui) {
    this.audio = audio;
    this.ui = ui;
    this.collected = 0;
    this.total = SPOTS.length;

    this.group = new THREE.Group();
    this.group.layers.set(EXTERIOR_LAYER);
    scene.add(this.group);
    // Children inherit the parent layer only for culling decisions made on
    // the group; set each token explicitly so it is culled indoors too.
    this.tokens = SPOTS.map(([x, z]) => {
      const t = buildToken();
      t.position.set(x, 1.3, z);
      t.traverse((o) => o.layers.set(EXTERIOR_LAYER));
      this.group.add(t);
      return { mesh: t, x, z, taken: false };
    });

    this._buildHud();
    this._t = 0;
  }

  _buildHud() {
    this.el = document.createElement('div');
    this.el.id = 'collectibles-hud';
    this.el.className = 'panel';
    this.el.innerHTML = `<span class="cg-icon">🦐</span><span id="cg-count">0</span> / ${this.total}`;
    (document.getElementById('hud') || document.body).appendChild(this.el);
    this.countEl = this.el.querySelector('#cg-count');
  }

  update(dt, playerPos) {
    this._t += dt;
    for (const tok of this.tokens) {
      if (tok.taken) continue;
      tok.mesh.rotation.y = this._t * 1.6;
      tok.mesh.position.y = 1.3 + Math.sin(this._t * 2.4 + tok.x) * 0.18;
      const d = Math.hypot(tok.x - playerPos.x, tok.z - playerPos.z);
      if (d < PICKUP_RADIUS) this._collect(tok);
    }
  }

  _collect(tok) {
    tok.taken = true;
    tok.mesh.visible = false;
    this.collected += 1;
    this.countEl.textContent = String(this.collected);
    this.el.classList.add('pulse');
    setTimeout(() => this.el.classList.remove('pulse'), 400);
    if (this.audio && this.audio.collect) this.audio.collect();
    if (this.ui) {
      if (this.collected === this.total) {
        this.ui.showToast('Golden Shrimp hunt complete - all 12 found!', 5000);
      } else {
        this.ui.showToast(`Golden Shrimp ${this.collected}/${this.total}`, 1800);
      }
    }
  }
}

// A small stylised golden shrimp: a curled body of tapering spheres with a
// fan tail. Emissive so it glows under bloom.
function buildToken() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({
    color: 0xffd24d, emissive: 0xffae00, emissiveIntensity: 0.55,
    metalness: 0.9, roughness: 0.28
  });
  const curl = [
    [0, 0.0, 0.0, 0.26],
    [0.16, 0.06, 0.0, 0.22],
    [0.28, 0.18, 0.0, 0.17],
    [0.32, 0.33, 0.0, 0.12]
  ];
  for (const [x, y, z, r] of curl) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), gold);
    seg.position.set(x, y, z);
    g.add(seg);
  }
  // Tail fan.
  for (const a of [-0.4, 0, 0.4]) {
    const blade = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), gold);
    blade.scale.set(0.5, 0.08, 1.1);
    blade.position.set(0.32 + Math.sin(a) * 0.08, 0.46, Math.cos(a) * 0.02);
    blade.rotation.y = a;
    g.add(blade);
  }
  g.scale.setScalar(0.95);
  return g;
}
