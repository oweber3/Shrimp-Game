import * as THREE from 'three';
import { EXTERIOR_LAYER } from '../../zones.js';
import { PERFORMERS, PERFORMER_ORDER, createPerformer } from './index.js';

// ============================================================================
// Standalone performer test harness (performers.html, ?performer=<id>).
//
// Deliberately independent of main.js and the concert director: it builds its
// own minimal scene so the Phase 3 acts can be authored, spawned, dissolved and
// beat-checked in isolation before the integration pass wires them into the
// show. Query params:
//   ?performer=travis|drake|drake-red-rim|swae|seahawk|ye (default: travis)
//   ?performer=all    lay the whole roster out in a row
//   ?bpm=142          beat-clock tempo driving beatPhase (Ye; default 155)
//
// Controls: S = spawn, D = dissolve, R = respawn, ←/→ = cycle performer.
// Debug handle: window.__performerHarness.
// ============================================================================

const params = new URLSearchParams(window.location.search);
const BPM = Number(params.get('bpm')) || 155;
let currentId = params.get('performer') || 'travis';
const showAll = currentId === 'all';

// --- Renderer / scene / camera ---------------------------------------------
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.78;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020); // dusk sky so emissives read
scene.fog = new THREE.Fog(0x0b1020, 220, 620);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 2000);
// Performers live on EXTERIOR_LAYER; the harness camera must opt into it just
// like the in-game camera does (see zones.js).
camera.layers.enable(EXTERIOR_LAYER);

// Lighting roughly mirrors the game's night profile so the acts read the same.
const ambient = new THREE.AmbientLight(0x8090b0, 1.05);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0x3d5685, 0x111722, 0.8);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff0dd, 2.0);
key.position.set(60, 120, 90);
scene.add(key);
const fill = new THREE.DirectionalLight(0x6688cc, 0.9);
fill.position.set(-80, 40, -60);
scene.add(fill);
[ambient, hemi, key, fill].forEach((l) => l.layers.enable(EXTERIOR_LAYER));

// Ground grid so scale and the spawn shockwave ring read against something.
const grid = new THREE.GridHelper(600, 40, 0x2a3a5a, 0x18243c);
grid.layers.set(EXTERIOR_LAYER);
scene.add(grid);

// --- Performer(s) -----------------------------------------------------------
let performers = [];
let framedHeight = 50;
let framedWidth = 50;

function clearPerformers() {
  for (const p of performers) {
    scene.remove(p.root);
    p.dispose();
  }
  performers = [];
}

function spawnRoster() {
  clearPerformers();
  if (showAll) {
    const ids = PERFORMER_ORDER;
    const spacing = 70;
    framedHeight = 0;
    ids.forEach((id, i) => {
      const perf = createPerformer(id);
      perf.root.position.x = (i - (ids.length - 1) / 2) * spacing;
      scene.add(perf.root);
      perf.spawnIn();
      performers.push(perf);
      framedHeight = Math.max(framedHeight, perf.height);
    });
    framedWidth = spacing * ids.length;
  } else {
    const perf = createPerformer(currentId);
    scene.add(perf.root);
    perf.spawnIn();
    performers.push(perf);
    framedHeight = perf.height;
    framedWidth = perf.height;
  }
  frameCamera();
  updateHud();
}

function frameCamera() {
  const span = Math.max(framedHeight, framedWidth);
  cameraTarget.set(0, framedHeight * 0.5, 0);
  cameraRadius = span * 1.7;
}

// Simple auto-orbit; drag with the mouse to look around.
const cameraTarget = new THREE.Vector3(0, 25, 0);
let cameraRadius = 100;
let orbitAngle = 0.4;
let orbitPitch = 0.12;
let autoOrbit = true;

function updateCamera() {
  const y = cameraTarget.y + Math.sin(orbitPitch) * cameraRadius;
  const r = Math.cos(orbitPitch) * cameraRadius;
  camera.position.set(
    cameraTarget.x + Math.sin(orbitAngle) * r,
    y,
    cameraTarget.z + Math.cos(orbitAngle) * r,
  );
  camera.lookAt(cameraTarget);
}

// --- Beat clock -------------------------------------------------------------
let elapsed = 0;
function beatPhaseNow() {
  return (elapsed * (BPM / 60)) % 1;
}

// --- HUD --------------------------------------------------------------------
const hud = document.createElement('div');
hud.id = 'performer-hud';
document.body.appendChild(hud);
const beatDot = document.createElement('div');
beatDot.id = 'performer-beat';
document.body.appendChild(beatDot);

function performerButtons() {
  return PERFORMER_ORDER.map((id) => {
    const active = !showAll && id === currentId;
    return `<button data-perf="${id}" class="${active ? 'on' : ''}">${PERFORMERS[id].label}</button>`;
  }).join('');
}

function updateHud() {
  const state = performers.map((p) => `${p.id}:${p.state}`).join('  ');
  hud.innerHTML = `
    <div class="title">Performer Harness · ${BPM} BPM</div>
    <div class="row">${performerButtons()}
      <button data-perf="all" class="${showAll ? 'on' : ''}">All</button></div>
    <div class="row">
      <button data-act="spawn">Spawn (S)</button>
      <button data-act="dissolve">Dissolve (D)</button>
      <button data-act="respawn">Respawn (R)</button>
      <button data-act="orbit">Auto-orbit: ${autoOrbit ? 'on' : 'off'}</button>
    </div>
    <div class="state">${state}</div>
    <div class="hint">←/→ cycle · drag to look · scroll to zoom</div>`;
}

hud.addEventListener('click', (e) => {
  const perf = e.target.getAttribute?.('data-perf');
  const act = e.target.getAttribute?.('data-act');
  if (perf) selectPerformer(perf);
  if (act === 'spawn') performers.forEach((p) => p.spawnIn());
  if (act === 'dissolve') performers.forEach((p) => p.dissolveOut());
  if (act === 'respawn') spawnRoster();
  if (act === 'orbit') { autoOrbit = !autoOrbit; updateHud(); }
});

function selectPerformer(id) {
  const url = new URL(window.location.href);
  url.searchParams.set('performer', id);
  window.history.replaceState({}, '', url);
  currentId = id;
  // showAll is derived from currentId; simplest is a full reload-free rebuild.
  window.location.reload();
}

// --- Input ------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.key === 's' || e.key === 'S') performers.forEach((p) => p.spawnIn());
  else if (e.key === 'd' || e.key === 'D') performers.forEach((p) => p.dissolveOut());
  else if (e.key === 'r' || e.key === 'R') spawnRoster();
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const list = [...PERFORMER_ORDER, 'all'];
    const idx = list.indexOf(showAll ? 'all' : currentId);
    const next = list[(idx + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
    selectPerformer(next);
  }
});

// Mouse orbit + zoom.
let dragging = false;
let lastX = 0;
let lastY = 0;
renderer.domElement.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; autoOrbit = false; updateHud(); });
window.addEventListener('mouseup', () => { dragging = false; });
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  orbitAngle -= (e.clientX - lastX) * 0.005;
  orbitPitch = Math.max(-0.6, Math.min(1.2, orbitPitch + (e.clientY - lastY) * 0.004));
  lastX = e.clientX;
  lastY = e.clientY;
});
renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  cameraRadius = Math.max(20, Math.min(1200, cameraRadius * (1 + Math.sign(e.deltaY) * 0.08)));
}, { passive: false });

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// --- Loop -------------------------------------------------------------------
// One simulation + render tick, shared by the rAF loop and the deterministic
// `step()` handle so headless capture (where rAF is suspended) renders too.
let hudTick = 0;
function tick(dt) {
  elapsed += dt;
  const beatPhase = beatPhaseNow();
  for (const p of performers) p.update(dt, elapsed, beatPhase);

  if (autoOrbit) orbitAngle += dt * 0.18;
  updateCamera();

  // Beat indicator dot.
  const pulse = 1 - ((elapsed * (BPM / 60)) % 1);
  beatDot.style.transform = `scale(${0.6 + pulse * 0.7})`;
  beatDot.style.opacity = String(0.3 + pulse * 0.7);

  hudTick += dt;
  if (hudTick > 0.2) { updateHud(); hudTick = 0; }

  renderer.render(scene, camera);
}

let last = performance.now();
function animate(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tick(dt);
  requestAnimationFrame(animate);
}

// --- Boot -------------------------------------------------------------------
spawnRoster();
requestAnimationFrame(animate);

window.__performerHarness = {
  get performers() { return performers; },
  spawn: () => performers.forEach((p) => p.spawnIn()),
  dissolve: () => performers.forEach((p) => p.dissolveOut()),
  respawn: spawnRoster,
  select: selectPerformer,
  // Deterministic frame pump for headless capture / CI (rAF is suspended in
  // headless Chromium — see scripts/verify.mjs). Advances the show by
  // `seconds` in fixed `dt` steps and renders the final frame.
  pump(seconds, dt = 1 / 60) {
    const steps = Math.max(1, Math.round(seconds / dt));
    for (let i = 0; i < steps; i++) tick(dt);
  },
  setView({ angle, pitch, radius } = {}) {
    autoOrbit = false;
    if (angle != null) orbitAngle = angle;
    if (pitch != null) orbitPitch = pitch;
    if (radius != null) cameraRadius = radius;
    updateCamera();
    renderer.render(scene, camera);
  },
  scene,
  camera,
  renderer,
};
