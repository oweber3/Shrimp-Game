import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EXTERIOR_LAYER } from '../zones.js';

// Cinematic atmosphere + day/night cycle (Director's Cut).
//
// Drives the campus lighting rig (sun / ambient / hemisphere), the fog,
// a drifting cloud deck, and a star field + moon for night.
//
// Performance note: the atmospheric-scattering Sky shader is far too
// expensive to render every frame on a CPU/software renderer, so instead
// we bake it into a cube texture only when the sun has moved enough, use
// that cheap cube as scene.background, and derive the PMREM environment
// map (image-based lighting for all PBR materials) from the same bake.
//
// Sun path model (north = -Z, east = +X, south = +Z):
//   t in [0,1):  0=midnight, 0.25=sunrise(E), 0.5=noon(S), 0.75=sunset(W)
//
// main.js drives this with update(dt); zones.js reads `outdoor` as the live
// lighting baseline and `skyTexture` as the outdoor background.

const MAX_ELEV = 1.18;        // ~68° peak sun elevation
const DAY_LENGTH = 210;       // seconds for one full in-game day
const START_TIME = 0.70;      // start in warm late-afternoon golden hour
const ENV_STEP = 0.05;        // re-bake when the sun moves ~2.9°

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;

export class Atmosphere {
  constructor(scene, renderer, lights) {
    this.scene = scene;
    this.renderer = renderer;
    this.sun = lights.sun;
    this.ambient = lights.ambient;
    this.hemi = lights.hemi;

    this.time = START_TIME;
    this.autoRun = true;
    this.nightFactor = 0;
    this.timeLabel = '';
    this.skyTexture = null;   // baked cube; zones uses it as outdoor background
    this._lastEnvElev = 999;
    this._sunDir = new THREE.Vector3();
    this._skyParams = { turbidity: 4, rayleigh: 1.5, sunPos: new THREE.Vector3() };

    // Live outdoor lighting state, read by ZoneSystem each frame.
    this.outdoor = {
      ambientColor: new THREE.Color(0xbcd9e8),
      ambientIntensity: 0.32,
      hemiIntensity: 0.4,
      sunIntensity: 2.6,
      background: new THREE.Color(0xaed8e6)
    };

    // ---- Cloud deck: chunky low-poly puffs drifting east ----
    this.clouds = new THREE.Group();
    this.clouds.layers.set(EXTERIOR_LAYER);
    scene.add(this.clouds);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 1, metalness: 0, flatShading: true,
      transparent: true, opacity: 0.92
    });
    for (let i = 0; i < 11; i++) {
      const puff = new THREE.Group();
      const blobs = 3 + Math.floor(hash(i, 3) * 3);
      for (let b = 0; b < blobs; b++) {
        const r = 18 + hash(i, b) * 22;
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), cloudMat);
        m.position.set((b - blobs / 2) * 22, hash(i, b + 9) * 8, hash(i, b + 5) * 16);
        m.scale.y = 0.5;
        puff.add(m);
      }
      puff.position.set(-650 + hash(i, 1) * 1300, 270 + hash(i, 2) * 120, -650 + hash(i, 4) * 1300);
      puff.userData.speed = 4 + hash(i, 7) * 6;
      this.clouds.add(puff);
    }

    // ---- Star field (fades in at night) ----
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    for (let i = 0; i < 460; i++) {
      const theta = hash(i, 11) * Math.PI * 2;
      const phi = hash(i, 13) * Math.PI * 0.46;
      const r = 4000;
      starPos.push(
        Math.sin(phi) * Math.cos(theta) * r,
        Math.cos(phi) * r * 0.9 + 200,
        Math.sin(phi) * Math.sin(theta) * r
      );
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xeaf2ff, size: 11, sizeAttenuation: true,
      transparent: true, opacity: 0, depthWrite: false
    });
    this.stars = new THREE.Points(starGeo, this.starMat);
    this.stars.layers.set(EXTERIOR_LAYER);
    scene.add(this.stars);

    // ---- Moon (emissive disc; bloom gives it a halo) ----
    this.moonMat = new THREE.MeshBasicMaterial({ color: 0xeef2ff, transparent: true, opacity: 0 });
    this.moon = new THREE.Mesh(new THREE.CircleGeometry(70, 24), this.moonMat);
    this.moon.layers.set(EXTERIOR_LAYER);
    scene.add(this.moon);

    // ---- Sky baker: a Sky mesh in its own scene, captured to a cube ----
    try {
      this.envScene = new THREE.Scene();
      this.envSky = new Sky();
      this.envSky.scale.setScalar(12000);
      this.envSky.material.uniforms.mieCoefficient.value = 0.005;
      this.envSky.material.uniforms.mieDirectionalG.value = 0.85;
      this.envScene.add(this.envSky);
      // HalfFloat so the bright sun survives in HDR for the bloom pass.
      this.cubeRT = new THREE.WebGLCubeRenderTarget(512, { type: THREE.HalfFloatType });
      this.cubeCam = new THREE.CubeCamera(1, 20000, this.cubeRT);
      this.pmrem = new THREE.PMREMGenerator(renderer);
      this.skyTexture = this.cubeRT.texture;
    } catch (err) {
      this.pmrem = null; // headless fallback: flat-color background, lit by the rig
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'BracketRight') this.time = (this.time + 0.04) % 1;
      else if (e.code === 'BracketLeft') this.time = (this.time + 0.96) % 1;
      else if (e.code === 'KeyO') this.autoRun = !this.autoRun;
    });

    this._apply(true);
    if (this.skyTexture) scene.background = this.skyTexture;
  }

  update(dt) {
    if (this.autoRun) this.time = (this.time + dt / DAY_LENGTH) % 1;
    for (const puff of this.clouds.children) {
      puff.position.x += puff.userData.speed * dt;
      if (puff.position.x > 720) puff.position.x = -720;
    }
    this._apply(false);
  }

  _apply(force) {
    // ---- Sun elevation / azimuth across the day ----
    const dayAngle = (this.time - 0.25) * Math.PI * 2;
    const elev = Math.asin(Math.max(-1, Math.min(1, Math.sin(dayAngle))) * Math.sin(MAX_ELEV));
    const frac = clamp01((this.time - 0.25) / 0.5);
    const azimuth = Math.PI / 2 - frac * Math.PI; // E -> S -> W
    const ce = Math.cos(elev);
    this._sunDir.set(Math.sin(azimuth) * ce, Math.sin(elev), Math.cos(azimuth) * ce);

    const elevDeg = (elev * 180) / Math.PI;
    const above = clamp01((elevDeg + 1) / 10);
    const dusk = clamp01(1 - Math.abs(elevDeg) / 11);
    const night = clamp01(1 - (elevDeg + 6) / 12);
    this.nightFactor = night;

    // ---- Sky parameters (used at bake time) ----
    this._skyParams.turbidity = 2.5 + dusk * 7;
    this._skyParams.rayleigh = 0.8 + dusk * 2.6 + night * 0.5;
    this._skyParams.sunPos.copy(this._sunDir);

    // ---- Sun light ----
    this.sun.position.copy(this._sunDir).multiplyScalar(180);
    this.sun.position.y = Math.max(8, this.sun.position.y);
    this.sun.color.copy(new THREE.Color(0xfff1d6)).lerp(new THREE.Color(0xff7a2e), dusk * 0.85);
    this.outdoor.sunIntensity = (0.05 + 2.7 * above) * (1 - night * 0.7);
    this.sun.intensity = this.outdoor.sunIntensity;

    // ---- Ambient / hemisphere ----
    const ambDay = new THREE.Color(0xbcd9e8);
    this.outdoor.ambientColor.copy(ambDay).lerp(new THREE.Color(0x223a5e), night);
    this.outdoor.ambientColor.lerp(new THREE.Color(0x6a5170), dusk * 0.45 * (1 - night));
    this.outdoor.ambientIntensity = lerp(0.32, 0.26, night);
    this.outdoor.hemiIntensity = lerp(0.4, 0.17, night);
    this.ambient.color.copy(this.outdoor.ambientColor);
    this.ambient.intensity = this.outdoor.ambientIntensity;
    this.hemi.intensity = this.outdoor.hemiIntensity;
    this.hemi.color.copy(ambDay).lerp(new THREE.Color(0x33507a), night);

    // ---- Fog / outdoor background tint ----
    this.outdoor.background.copy(new THREE.Color(0xb4dae8)).lerp(new THREE.Color(0x0e1726), night);
    this.outdoor.background.lerp(new THREE.Color(0xe8a878), dusk * 0.6 * (1 - night));
    if (this.scene.fog) this.scene.fog.color.copy(this.outdoor.background);

    // ---- Stars + moon ----
    this.starMat.opacity = night * 0.9;
    this.moonMat.opacity = clamp01(night * 1.1) * 0.9;
    this.moon.position.set(-this._sunDir.x * 1600, 600 + Math.abs(this._sunDir.y) * 400, -this._sunDir.z * 1600);
    this.moon.lookAt(0, 60, 0);

    // ---- Throttled sky bake (cube background + env map) ----
    if (this.cubeCam && (force || Math.abs(elev - this._lastEnvElev) > ENV_STEP)) {
      this._lastEnvElev = elev;
      this._bake();
    }

    this.timeLabel = formatClock(this.time);
  }

  _bake() {
    const u = this.envSky.material.uniforms;
    u.turbidity.value = this._skyParams.turbidity;
    u.rayleigh.value = this._skyParams.rayleigh;
    u.sunPosition.value.copy(this._skyParams.sunPos);
    // Capture the sky to the cube (the visible background). Reuse one cube
    // RT so skyTexture stays a stable reference across bakes.
    try {
      this.cubeCam.update(this.renderer, this.envScene);
    } catch (err) {
      this.cubeCam = null; // stop trying; flat-color background remains
      return;
    }
    // PMREM-filter the same sky into the environment map (image-based
    // lighting). Independent of the cube so a failure here doesn't freeze
    // the day/night background.
    if (!this.pmrem) return;
    try {
      const rt = this.pmrem.fromCubemap(this.cubeRT.texture);
      if (this._envRT) this._envRT.dispose();
      this._envRT = rt;
      this.scene.environment = rt.texture;
      this.scene.environmentIntensity = lerp(0.45, 0.16, this.nightFactor);
    } catch (err) {
      this.pmrem = null;
    }
  }
}

function hash(a, b) {
  return Math.abs(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1;
}

function formatClock(t) {
  const mins = Math.floor(t * 24 * 60);
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h < 12 ? 'AM' : 'PM';
  h = h % 12; if (h === 0) h = 12;
  const icon = (t > 0.27 && t < 0.73) ? '☀' : '☽';
  return `${h}:${String(m).padStart(2, '0')} ${ampm} ${icon}`;
}
