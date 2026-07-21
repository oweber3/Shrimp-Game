import * as THREE from 'three';
import { buildWorld, POI } from './map/terrain.js';
import { Player } from './player.js';
import { NPCManager } from './npc.js';
import { Missions } from './missions.js';
import { UI } from './ui.js';
import { Minimap } from './minimap.js';
import { ZoneSystem } from './zones.js';
import { GolfCart } from './mechanics/vehicle.js';
import { PunchSystem } from './mechanics/combat.js';
import { LoadingScreen } from './ui/loadingScreen.js';
import { MissionLog } from './ui/missionLog.js';
import { AudioManager } from './audio/audioManager.js';
import { Atmosphere } from './world/sky.js';
import { createPostFX } from './world/postfx.js';
import { addStreetlights } from './world/streetlights.js';
import { Collectibles } from './mechanics/collectibles.js';
import { Stunts } from './mechanics/stunts.js';
import { StuntHud } from './ui/stuntHud.js';
import { MobileControls } from './ui/mobileControls.js';
import { initQuality, getQuality, onQualityChange, startBootProbe, sampleFrame } from './world/quality.js';
import { createConcertShow } from './concert/concertShow.js';

// Shrimp Shift: Laitram Town
// Low-poly third-person walking game set on an industrial campus
// inspired by the Laitram/Intralox property in Harahan/Elmwood, LA.

const app = document.getElementById('app');

initQuality();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// ACES filmic tone mapping + sRGB output: the single biggest visual upgrade
// for PBR materials. Exposure is tuned against the atmospheric-scattering sky.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaed8e6);
scene.fog = new THREE.Fog(0xaed8e6, 160, 420);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 700);
camera.position.set(0, 6, 62);

// Humid Louisiana afternoon light: warm low-ish sun, soft sky bounce.
// The zone system retunes these when the player goes indoors.
const ambient = new THREE.AmbientLight(0xcfe5ec, 0.5);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0xbfe3f0, 0x5a7a4a, 0.4);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe7c2, 1.35);
sun.position.set(70, 100, 80);
sun.castShadow = true;
// Phase 11: the frustum shrank from a fixed ±200 (covering the whole static
// campus at low resolution) to ±90 following the player (see the
// SHADOW_SNAP loop below and Atmosphere's followPoint) - much sharper
// shadows near the player, at the cost of shadows for buildings far away.
// Map size and bias scale with the quality tier; low keeps the old 1024
// budget for software renderers and low-end devices.
const SHADOW_HALF_EXTENT = 90;
sun.shadow.camera.left = -SHADOW_HALF_EXTENT;
sun.shadow.camera.right = SHADOW_HALF_EXTENT;
sun.shadow.camera.top = SHADOW_HALF_EXTENT;
sun.shadow.camera.bottom = -SHADOW_HALF_EXTENT;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 400;
sun.shadow.bias = -0.00015;
sun.shadow.normalBias = 0.03;
applyShadowMapSize(getQuality());
scene.add(sun);

function applyShadowMapSize(tier) {
  const size = tier === 'high' ? 2048 : 1024;
  if (sun.shadow.mapSize.width === size) return;
  sun.shadow.mapSize.set(size, size);
  if (sun.shadow.map) {
    sun.shadow.map.dispose();
    sun.shadow.map = null;
  }
}
onQualityChange(applyShadowMapSize);

// World, player, NPCs, missions, UI.
const loading = new LoadingScreen();
const { colliders, bounds, update: updateWorld } = buildWorld(scene, loading.manager);
// Atmosphere drives the day/night cycle, sky, clouds and the campus lighting
// rig; streetlamps glow at dusk via the bloom pass.
const atmosphere = new Atmosphere(scene, renderer, { sun, ambient, hemi });
const streetlights = addStreetlights(scene, colliders);
const ui = new UI();
const minimap = new Minimap();
const missionLog = new MissionLog();
const audio = new AudioManager();
const player = new Player(scene, camera, POI.spawn);
const npcs = new NPCManager(scene);
const missions = new Missions(scene, ui, npcs, player, missionLog);
const zones = new ZoneSystem(camera, scene, { ambient, hemi, sun }, atmosphere);
const cart = new GolfCart(scene, colliders);
const stuntHud = new StuntHud();
const stunts = new Stunts(stuntHud);
cart.onLanding = (evt) => stunts.onLanding(evt);
const punch = new PunchSystem(player, npcs);
const collectibles = new Collectibles(scene, audio, ui);
const postfx = createPostFX(renderer, scene, camera);
const concert = createConcertShow({
  scene,
  camera,
  atmosphere,
  streetlights,
  postfx,
  audioManager: audio,
  colliders,
  quality: getQuality(),
});

// Touch controls: a virtual joystick (writes player.moveAxis) plus Jump/Interact
// buttons (dispatch synthetic Space/E key events). Only built on touch devices;
// ?mobile=1 forces them on for testing in a desktop browser.
const mobileControls = new MobileControls(player, {
  force: new URLSearchParams(window.location.search).has('mobile'),
});
player.flightExclusions = concert.flightExclusions;

const FLIGHT_CONCERT_STATES = new Set(['arming', 'running', 'finale']);
function syncConcertFlight(forcedActive = null) {
  const concertActive = forcedActive == null
    ? FLIGHT_CONCERT_STATES.has(concert.state)
    : Boolean(forcedActive);
  player.setConcertFlightContext(concertActive, cart.mounted, colliders, bounds);
  mobileControls.setConcertFlightAvailable(concertActive);
  ui.setConcertFlightHint(concertActive, mobileControls.enabled, cart.mounted);
}

// Lifecycle events make teardown/restart/dispose synchronous. The per-frame
// sync below still handles cart mount/dismount and direct test-harness state.
concert.onLifecycle((event) => {
  if (event.type === 'start' && event.showId === 'ye') {
    cart.resolveOverlaps(colliders, bounds);
  }
  syncConcertFlight(event.type === 'start');
});

// Touch-only secret path: seven quick taps on the clock starts or restarts
// the show. Keep the rolling window short so ordinary HUD exploration cannot
// trigger it accidentally.
const concertTapTimes = [];
ui.clock?.addEventListener('pointerdown', (event) => {
  if (!mobileControls.enabled) return;
  const now = performance.now();
  concertTapTimes.push(now);
  while (concertTapTimes.length && now - concertTapTimes[0] > 2800) {
    concertTapTimes.shift();
  }
  if (concertTapTimes.length >= 7) {
    concertTapTimes.length = 0;
    event.preventDefault();
    event.stopPropagation();
    concert.start();
  }
});
if (mobileControls.enabled && ui.clock) {
  ui.clock.title = 'Tap seven times quickly for a surprise';
  ui.clock.setAttribute('aria-label', 'Shift clock; seven rapid taps reveal a secret');
}

// Procedural audio hooks (all gated behind the start-overlay click).
player.onStep = () => audio.footstep(player.isJogging());
punch.onSwing = () => audio.punch();

const concertParam = new URLSearchParams(window.location.search).get('concert');
let concertAutostartPending = concertParam === 'ye'
  ? 'ye'
  : (concertParam === '1' ? 'sicko' : null);
ui.onStart(() => {
  audio.unlock();
  try {
    const p = renderer.domElement.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  } catch (err) {
    // Pointer lock unsupported; keyboard still works.
  }
  if (concertAutostartPending) {
    const showId = concertAutostartPending;
    concertAutostartPending = false;
    concert.start(showId);
  }
});

// Debug/testing handle.
window.__game = {
  player, missions, npcs, ui, zones, cart, punch, audio, minimap, missionLog,
  renderer, atmosphere, postfx, streetlights, collectibles, mobileControls,
  stunts, stuntHud, concert, colliders, bounds,
  flight: player.concertFlight,
  getFlightState: () => player.concertFlight.debugState(player.position),
  // A deterministic frame hook keeps the headless verifier useful on browser
  // builds that suspend requestAnimationFrame in background/headless tabs.
  stepFrame: (dt = 1 / 60) => runGameFrame(dt)
};

// Interaction: E talks/picks up/advances dialogue, or mounts/dismounts the
// cart. F throws a punch (on foot only).
let currentInteractable = null;

// Secret concert triggers. Capture phase lets each completed sequence consume
// its final key before ordinary debug/interact handlers see it (especially the
// E that completes Y-E).
const CONCERT_CODES = Object.freeze([
  Object.freeze({ code: 'SICKO', showId: 'sicko' }),
  Object.freeze({ code: 'YE', showId: 'ye' }),
]);
const concertCodeIndexes = new Map(CONCERT_CODES.map(({ code }) => [code, 0]));
function resetConcertCodes() {
  for (const { code } of CONCERT_CODES) concertCodeIndexes.set(code, 0);
}
window.addEventListener('keydown', (e) => {
  const target = e.target;
  const isTextEntry = target instanceof Element && Boolean(target.closest(
    'input, textarea, select, [contenteditable]'
  ));
  if (ui.isDialogueOpen() || isTextEntry || e.ctrlKey || e.metaKey || e.altKey) {
    resetConcertCodes();
    return;
  }

  const rawKey = typeof e.key === 'string' && e.key.length === 1
    ? e.key
    : (e.code?.startsWith('Key') ? e.code.slice(3) : '');
  const key = rawKey.toUpperCase();
  for (const { code, showId } of CONCERT_CODES) {
    let index = concertCodeIndexes.get(code) || 0;
    if (key === code[index]) {
      index += 1;
      if (index === code.length) {
        resetConcertCodes();
        e.preventDefault();
        e.stopImmediatePropagation();
        concert.start(showId);
        return;
      }
    } else {
      index = key === code[0] ? 1 : 0;
    }
    concertCodeIndexes.set(code, index);
  }
}, { capture: true });

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyF') {
    if (!ui.isDialogueOpen() && !cart.mounted) punch.tryPunch();
    return;
  }
  if (e.code !== 'KeyE') return;
  if (ui.isDialogueOpen()) {
    ui.advanceDialogue();
  } else if (cart.mounted) {
    if (cart.canDismount()) {
      const spot = cart.dismount();
      player.position.copy(spot);
      // Clear any seat tilt copied from the cart's orientation.
      player.mesh.rotation.x = 0;
      player.mesh.rotation.z = 0;
      syncConcertFlight();
    }
  } else if (currentInteractable) {
    currentInteractable.action();
  } else if (cart.canMount(player.position)) {
    cart.mount();
    syncConcertFlight();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  postfx.resize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

// Fixed-timestep movement: the simulation is sub-stepped at a constant rate
// so travel distance stays correct no matter how slow the renderer is. The
// physics is cheap; only rendering is heavy, so decoupling them keeps the
// game playable on low-end / software-GL devices (and keeps the headless
// movement tests accurate).
const FIXED_DT = 1 / 60;
// Capacity (16/60 ≈ 0.27s) exceeds the frame-delta cap below (0.25s), so the
// accumulator never sheds backlog — the sim tracks real time at any frame
// rate, only slowing to a graceful slow-mo if a frame somehow exceeds 0.25s.
const MAX_SUBSTEPS = 16;
let physicsAcc = 0;

// Shadow frustum follow point snaps to a coarse grid so it only jumps (never
// shimmers) as the player walks the tightened ±90 frustum around.
const SHADOW_SNAP = 30;

startBootProbe();

function runGameFrame(forcedDelta) {
  const manuallyStepped = Number.isFinite(forcedDelta);
  const frameDelta = manuallyStepped
    ? Math.min(Math.max(forcedDelta, 0), 0.25)
    : Math.min(clock.getDelta(), 0.25);
  if (manuallyStepped) clock.elapsedTime += frameDelta;
  const time = clock.elapsedTime;
  sampleFrame(frameDelta);

  syncConcertFlight();
  player.movementLocked = ui.isDialogueOpen() || minimap.isExpanded() || cart.mounted;

  physicsAcc += frameDelta;
  let steps = 0;
  const cartInput = player.getMoveInput();
  cartInput.trick = player.isJogging(); // Shift + steer = barrel roll in the air
  while (physicsAcc >= FIXED_DT && steps < MAX_SUBSTEPS) {
    player.update(FIXED_DT, colliders, bounds);
    punch.update(FIXED_DT); // after player.update so the swing overrides arm pose
    cart.update(FIXED_DT, cartInput, colliders, bounds);
    if (cart.mounted) player.position.copy(cart.group.position);
    physicsAcc -= FIXED_DT;
    steps++;
  }
  if (steps === MAX_SUBSTEPS) physicsAcc = 0; // shed backlog instead of spiralling

  stuntHud.setDriving(cart.mounted);

  if (cart.mounted) {
    // The shrimp stays visible, seated on the bench with legs forward and
    // claws on the wheel. The seat offset goes through the cart's full
    // orientation so the rider stays glued to the bench through flips and
    // barrel rolls.
    player.mesh.position
      .set(0, 0.34, -0.55)
      .applyQuaternion(cart.group.quaternion)
      .add(cart.group.position);
    player.mesh.quaternion.copy(cart.group.quaternion);
    player.parts.legL.rotation.x = -1.35;
    player.parts.legR.rotation.x = -1.35;
    player.parts.armL.rotation.x = -0.9;
    player.parts.armR.rotation.x = -0.9;
  }

  npcs.update(frameDelta, time, player.position, ui.isDialogueOpen());
  missions.update(time);
  collectibles.update(frameDelta, player.position);
  updateWorld(frameDelta, time); // animated map elements (canal water drift)
  // Atmosphere first (sets the outdoor lighting baseline for this frame),
  // then zones overrides it toward the indoor profile when inside. The
  // shadow frustum follows the player, snapped to a coarse grid so it jumps
  // instead of shimmering.
  const shadowFollowX = Math.round(player.position.x / SHADOW_SNAP) * SHADOW_SNAP;
  const shadowFollowZ = Math.round(player.position.z / SHADOW_SNAP) * SHADOW_SNAP;
  atmosphere.update(frameDelta, shadowFollowX, shadowFollowZ);
  concert.update(frameDelta, player.position);
  // showEnd changes state during update; land before any other system observes
  // an airborne player after the concert has torn down.
  syncConcertFlight();
  streetlights.update(atmosphere.nightFactor, player.position);
  postfx.setNight(concert.isActive ? 1 : atmosphere.nightFactor);
  zones.update(frameDelta, player.position); // indoor/outdoor transitions
  audio.setIndoorBlend(zones.blend); // indoor hum fades with the lights
  ui.setClock(atmosphere.timeLabel);

  // Update minimap markers and NPC positions each frame.
  const mState = missions.state;
  minimap.setMarkers([
    {
      wx: POI.wrench.x, wz: POI.wrench.z,
      color: '#ffc04d', label: 'Wrench',
      visible: mState === 'M1_FIND' || mState === 'M1_RETURN',
    },
    {
      wx: POI.partsBox.x, wz: POI.partsBox.z,
      color: '#6fd3ff', label: 'Parts Box',
      visible: mState === 'M2_PICKUP' || mState === 'M2_DELIVER',
    },
    {
      wx: POI.coffeePot.x, wz: POI.coffeePot.z,
      color: '#d9a05b', label: 'Coffee Pot',
      visible: mState === 'M3_FETCH',
    },
  ]);
  minimap.setNPCPositions(
    npcs.npcs.map((n) => ({ wx: n.group.position.x, wz: n.group.position.z, color: n.def.mapColor }))
  );
  minimap.setVehicle({ wx: cart.group.position.x, wz: cart.group.position.z });
  minimap.setIndoor(zones.isIndoor);
  minimap.update(player.position, player.yaw);

  // Find the nearest available interactable in range (on foot only).
  currentInteractable = null;
  if (!ui.isDialogueOpen() && !cart.mounted) {
    let best = Infinity;
    for (const it of missions.interactables) {
      if (!it.available()) continue;
      const ip = it.getPos();
      const d = Math.hypot(ip.x - player.position.x, ip.z - player.position.z);
      if (d < it.radius && d < best) {
        best = d;
        currentInteractable = it;
      }
    }
  }
  if (currentInteractable) {
    ui.showPrompt(currentInteractable.prompt());
  } else if (cart.mounted) {
    if (cart.canDismount()) ui.showPrompt('Hop off the cart');
    else ui.hidePrompt(); // mid-air / spinning out
  } else if (!ui.isDialogueOpen() && cart.canMount(player.position)) {
    ui.showPrompt('Drive the cart');
  } else {
    ui.hidePrompt();
  }

  // Compass and objective arrow.
  const target = missions.getTarget();
  ui.updateCompass(
    player.yaw,
    player.position,
    target ? target.pos : null,
    target ? target.label : 'Free roam'
  );

  postfx.render();
}

renderer.setAnimationLoop(() => runGameFrame());
