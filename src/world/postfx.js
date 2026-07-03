import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { getQuality, onQualityChange } from './quality.js';

// Post-processing chain: scene -> SSAO -> subtle bloom -> ACES output.
//
// SSAO darkens contact points (wall/floor junctions, under trucks, inside
// cubicles) that ambient/hemisphere light alone flattens out. Bloom makes
// the sun, lit signs, glowing windows and night streetlamps bleed light the
// way real cameras do. OutputPass applies ACES tone mapping + sRGB at the
// very end of the chain (the modern three.js recipe), so intermediate
// passes work in linear HDR.
//
// Everything is wrapped so a renderer that can't allocate float targets
// (some headless GPUs) falls back to a plain renderer.render() — the game
// always runs, it just loses the glow/AO.

// Bloom runs at half resolution: it's a blur, so the lower res is visually
// indistinguishable but ~4x cheaper — which keeps the CPU test renderer
// (and low-end devices) comfortably above the movement-test frame rate.
const BLOOM_SCALE = 0.25;
// SSAO's internal normal/AO/blur buffers run at half resolution too - AO is
// low-frequency, so this is the single tightest budget item in Track A
// (Phase 11 doc) even at half res. Disabled outright on the 'low' quality
// tier (software renderers, low-end devices).
const SSAO_SCALE = 0.5;

export function createPostFX(renderer, scene, camera) {
  const size = new THREE.Vector2();
  renderer.getSize(size);

  let composer = null;
  let bloom = null;
  let ssao = null;
  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    ssao = new SSAOPass(scene, camera, size.x * SSAO_SCALE, size.y * SSAO_SCALE);
    ssao.kernelRadius = 5;
    ssao.minDistance = 0.002;
    ssao.maxDistance = 0.06;
    ssao.enabled = getQuality() === 'high';
    composer.addPass(ssao);

    bloom = new UnrealBloomPass(
      new THREE.Vector2(size.x * BLOOM_SCALE, size.y * BLOOM_SCALE),
      0.32, // strength — restrained, so daytime isn't hazy
      0.5,  // radius
      0.9   // threshold — only the sun / lamps / lit signs bloom
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    onQualityChange((tier) => { ssao.enabled = tier === 'high'; });
  } catch (err) {
    console.warn('[postfx] composer unavailable, using direct render', err);
    composer = null;
  }

  return {
    enabled: !!composer,
    render() {
      if (composer) composer.render();
      else renderer.render(scene, camera);
    },
    resize(w, h) {
      if (composer) composer.setSize(w, h);
      if (bloom) bloom.setSize(w * BLOOM_SCALE, h * BLOOM_SCALE);
      if (ssao) ssao.setSize(w * SSAO_SCALE, h * SSAO_SCALE);
    },
    // Night ramps the glow up so lamps and signs feel like the only light.
    setNight(nightFactor) {
      if (bloom) bloom.strength = 0.3 + nightFactor * 0.5;
    }
  };
}
