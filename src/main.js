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
import { MobileControls } from './ui/mobileControls.js';

// Shrimp Shift: Laitram Town
// Low-poly third-person walking game set on an industrial campus
// inspired by the Laitram/Intralox property in Harahan/Elmwood, LA.

const app = document.getElementById('app');

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
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -200;
sun.shadow.camera.right = 200;
sun.shadow.camera.top = 200;
sun.shadow.camera.bottom = -200;
sun.shadow.camera.far = 400;
sun.shadow.bias = -0.0005;
scene.add(sun);

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
const punch = new PunchSystem(player, npcs);
const collectibles = new Collectibles(scene, audio, ui);
const postfx = createPostFX(renderer, scene, camera);

// Touch controls: a virtual joystick (writes player.moveAxis) plus Jump/Interact
// buttons (dispatch synthetic Space/E key events). Only built on touch devices;
// ?mobile=1 forces them on for testing in a desktop browser.
const mobileControls = new MobileControls(player, {
  force: new URLSearchParams(window.location.search).has('mobile'),
});

// Procedural audio hooks (all gated behind the start-overlay click).
player.onStep = () => audio.footstep(player.isJogging());
punch.onSwing = () => audio.punch();

ui.onStart(() => {
  audio.unlock();
  try {
    const p = renderer.domElement.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  } catch (err) {
    // Pointer lock unsupported; keyboard still works.
  }
});

// Debug/testing handle.
window.__game = {
  player, missions, npcs, ui, zones, cart, punch, audio, minimap, missionLog,
  renderer, atmosphere, postfx, streetlights, collectibles, mobileControls
};

// Interaction: E talks/picks up/advances dialogue, or mounts/dismounts the
// cart. F throws a punch (on foot only).
let currentInteractable = null;
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyF') {
    if (!ui.isDialogueOpen() && !cart.mounted) punch.tryPunch();
    return;
  }
  if (e.code !== 'KeyE') return;
  if (ui.isDialogueOpen()) {
    ui.advanceDialogue();
  } else if (cart.mounted) {
    const spot = cart.dismount();
    player.position.copy(spot);
  } else if (currentInteractable) {
    currentInteractable.action();
  } else if (cart.canMount(player.position)) {
    cart.mount();
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

renderer.setAnimationLoop(() => {
  const frameDelta = Math.min(clock.getDelta(), 0.25);
  const time = clock.elapsedTime;

  player.movementLocked = ui.isDialogueOpen() || minimap.isExpanded() || cart.mounted;

  physicsAcc += frameDelta;
  let steps = 0;
  while (physicsAcc >= FIXED_DT && steps < MAX_SUBSTEPS) {
    player.update(FIXED_DT, colliders, bounds);
    punch.update(FIXED_DT); // after player.update so the swing overrides arm pose
    cart.update(FIXED_DT, player.getMoveInput(), colliders, bounds);
    if (cart.mounted) player.position.copy(cart.group.position);
    physicsAcc -= FIXED_DT;
    steps++;
  }
  if (steps === MAX_SUBSTEPS) physicsAcc = 0; // shed backlog instead of spiralling

  if (cart.mounted) {
    // The shrimp stays visible, seated on the bench with legs forward and
    // claws on the wheel; pose follows the final cart state this frame.
    const cartYaw = cart.state.yaw;
    player.mesh.position.set(
      player.position.x - Math.sin(cartYaw) * 0.55,
      0.34,
      player.position.z - Math.cos(cartYaw) * 0.55
    );
    player.mesh.rotation.y = cartYaw;
    player.parts.legL.rotation.x = -1.35;
    player.parts.legR.rotation.x = -1.35;
    player.parts.armL.rotation.x = -0.9;
    player.parts.armR.rotation.x = -0.9;
  }

  npcs.update(frameDelta, time, player.position);
  missions.update(time);
  collectibles.update(frameDelta, player.position);
  updateWorld(frameDelta, time); // animated map elements (canal water drift)
  // Atmosphere first (sets the outdoor lighting baseline for this frame),
  // then zones overrides it toward the indoor profile when inside.
  atmosphere.update(frameDelta);
  streetlights.update(atmosphere.nightFactor);
  postfx.setNight(atmosphere.nightFactor);
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
    npcs.npcs.map((n) => ({ wx: n.group.position.x, wz: n.group.position.z }))
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
    ui.showPrompt('Hop off the cart');
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
});
