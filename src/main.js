import * as THREE from 'three';
import { buildWorld, POI } from './mapData.js';
import { Player } from './player.js';
import { NPCManager } from './npc.js';
import { Missions } from './missions.js';
import { UI } from './ui.js';

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
camera.position.set(0, 6, 130);

// Humid Louisiana afternoon light.
scene.add(new THREE.AmbientLight(0xcfe5ec, 0.55));
const hemi = new THREE.HemisphereLight(0xbfe3f0, 0x5a7a4a, 0.35);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d4, 1.25);
sun.position.set(90, 120, 60);
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
const { colliders, bounds } = buildWorld(scene);
const ui = new UI();
const player = new Player(scene, camera, POI.spawn);
const npcs = new NPCManager(scene);
const missions = new Missions(scene, ui, npcs, player);

ui.onStart(() => {
  renderer.domElement.requestPointerLock();
});

// Interaction: E talks/picks up, or advances open dialogue.
let currentInteractable = null;
window.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyE') return;
  if (ui.isDialogueOpen()) {
    ui.advanceDialogue();
  } else if (currentInteractable) {
    currentInteractable.action();
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

  player.movementLocked = ui.isDialogueOpen();
  player.update(dt, colliders, bounds);
  npcs.update(dt, time, player.position);
  missions.update(time);

  // Find the nearest available interactable in range.
  currentInteractable = null;
  if (!ui.isDialogueOpen()) {
    let best = Infinity;
    for (const it of missions.interactables) {
      if (!it.available()) continue;
      const d = it.getPos().distanceTo(player.position);
      if (d < it.radius && d < best) {
        best = d;
        currentInteractable = it;
      }
    }
  }
  if (currentInteractable) {
    ui.showPrompt(currentInteractable.prompt());
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
