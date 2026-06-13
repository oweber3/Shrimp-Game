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

// Shrimp Shift: Laitram Town
// Low-poly third-person walking game set on an industrial campus
// inspired by the Laitram/Intralox property in Harahan/Elmwood, LA.

const app = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
sun.shadow.mapSize.set(2048, 2048);
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
const ui = new UI();
const minimap = new Minimap();
const missionLog = new MissionLog();
const audio = new AudioManager();
const player = new Player(scene, camera, POI.spawn);
const npcs = new NPCManager(scene);
const missions = new Missions(scene, ui, npcs, player, missionLog);
const zones = new ZoneSystem(camera, scene, { ambient, hemi, sun });
const cart = new GolfCart(scene, colliders);
const punch = new PunchSystem(player, npcs);

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
window.__game = { player, missions, npcs, ui, zones, cart, punch, audio, minimap, missionLog, renderer };

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
    player.mesh.visible = true;
  } else if (currentInteractable) {
    currentInteractable.action();
  } else if (cart.canMount(player.position)) {
    cart.mount();
    player.mesh.visible = false;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  player.movementLocked = ui.isDialogueOpen() || minimap.isExpanded() || cart.mounted;
  player.update(dt, colliders, bounds);
  punch.update(dt); // after player.update so the swing overrides arm pose
  cart.update(dt, player.keys, colliders, bounds);
  if (cart.mounted) {
    // The player rides along invisibly so camera, minimap, compass and
    // zone detection all keep working off player.position.
    player.position.copy(cart.group.position);
    player.mesh.position.set(player.position.x, 0, player.position.z);
    player.mesh.rotation.y = cart.state.yaw;
  }
  npcs.update(dt, time, player.position);
  missions.update(time);
  updateWorld(dt, time); // animated map elements (canal water drift)
  zones.update(dt, player.position); // indoor/outdoor transitions
  audio.setIndoorBlend(zones.blend); // indoor hum fades with the lights

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

  renderer.render(scene, camera);
});
