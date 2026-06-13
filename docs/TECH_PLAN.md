# Shrimp Shift: Laitram Town — Technical Plan

## Stack Decisions

### Three.js (v0.165.0)
- Provides WebGL rendering without a heavyweight framework
- Tree-shakes well with Vite — only imported modules end up in the bundle
- Familiar API, extensive docs, large community
- Sufficient for this project's needs: primitives, lighting, shadows, materials, camera, basic animation
- No physics engine (Cannon.js, Rapier, Ammo.js) — the added complexity and bundle weight are not justified

### Vite (v5.3.1)
- Fast HMR for development iteration
- Produces optimized static output (`dist/`) with no server dependency
- `base: '/Shrimp-Game/'` in `vite.config.js` ensures correct paths on GitHub Pages
- ES module output aligns with modern browser support requirements

### Pure JavaScript (no TypeScript)
- Current codebase is plain ES6 modules
- Adding TypeScript is low priority — the codebase is small enough to reason about without types
- Can be added in a future phase if the team grows or the codebase complexity demands it

### Procedural Geometry Only
- No `.glb` / `.gltf` / `.fbx` model files are loaded
- All geometry is Three.js primitives: BoxGeometry, CylinderGeometry, SphereGeometry, etc.
- Eliminates an asset pipeline, removes loading latency for models, and keeps the repo lightweight
- Trade-off: more complex organic shapes require more code; acceptable for this art style
- Exception allowed: very small texture PNGs for signs (keep under 200 KB each)

---

## Architecture

### Module Structure

```
src/
  main.js          — scene init, game loop, interaction check
  player.js        — third-person camera, controls, movement
  map/
    terrain.js     — ground, roads, bounds, POI, buildWorld() orchestrator
    buildings.js   — building geometry and signage
    props.js       — vehicles, trees, pallets, parking lots
    interior.js    — LM interior: lobby, cubicles, manager office, breakroom
  zones.js         — indoor/outdoor zone detection, layer culling, light blend
  utils/
    geometry.js    — shared box()/flat() builders, materials, textTexture()
  characters/
    shrimpWorker.js — Group-hierarchy shrimp builder (parts API, carryAnchor)
    accessories.js  — hard hat, toolbelt, clipboard builders
    npcBehaviors.js — behavior state machine (idle/patrol/sit/talk/react)
  dialogue/
    dialogueData.js — all NPC flavor + mission dialogue strings
  npc.js           — NPC definitions and manager (re-exports createShrimpWorker)
  missions.js      — state machine, dialogue, items
  collision.js     — 2D circle-AABB collision resolver
  ui.js            — DOM-based HUD panels
  minimap.js       — canvas 2D minimap
  style.css        — HUD styling
```

Future additions (planned):
```
src/map/
  terrain.js       — ground, roads, world bounds
  buildings.js     — building geometry
  props.js         — vehicles, trees, barrels, bollards
  interior.js      — indoor geometry (Phase 4)
  landscaping.js   — trees, grass patches, canal edges

src/characters/
  shrimpWorker.js  — extracted from npc.js (Phase 3)
  accessories.js   — toolbelt, clipboard, hard hat

src/mechanics/
  combat.js        — punch hitbox, NPC reaction, cooldown (Phase 6)
  vehicle.js       — cart mesh, mount/dismount (Phase 6)
  vehiclePhysics.js — simple Euler forward/steer/friction (Phase 6)

src/zones.js       — indoor/outdoor zone detection (Phase 4)
src/audio/         — Web Audio API manager (Phase 7)
src/ui/
  loadingScreen.js — THREE.LoadingManager progress (Phase 7)
  missionLog.js    — scrollable mission history (Phase 7)

docs/              — planning documents (this folder)
```

### Game Loop

`renderer.setAnimationLoop()` drives everything. Each frame:
1. `dt = clock.getDelta()` capped at 50ms
2. `player.update(dt, colliders, bounds)`
3. `npcs.update(dt, time, playerPos)`
4. `missions.update(time)`
5. `minimap.update(playerPos, yaw)`
6. Interaction range check
7. `renderer.render(scene, camera)`

No fixed-timestep physics needed at this complexity level.

### Collision System

2D only (XZ plane). Circle-AABB resolution in `collision.js`:
- Each solid object registers an AABB `{ minX, maxX, minZ, maxZ }`
- Player is a circle of radius 0.55
- Every frame: check overlap, push out along shortest axis
- `clampToBounds()` keeps player in world bounds

This is sufficient for walkable 3D environments with no jumping or falling.
Do NOT replace with a 3D physics engine — overhead is not justified.

### Camera

PerspectiveCamera, FOV 60, near 0.1, far 700.
Third-person orbit: distance 7.5 units, pitch range limited.
Pointer lock for mouse look.
Camera lerps toward target position at `dt * 12` for smooth follow.

---

## Performance Budgets

| Metric | Target | Current |
|--------|--------|---------|
| Triangle count (scene) | < 100k | ~40–60k (estimated) |
| Draw calls | < 200 | ~100–150 (estimated) |
| Texture memory | < 32 MB | ~4 MB |
| JS bundle size (gzipped) | < 500 KB | ~250 KB |
| Initial page load | < 3s on 4G | ~2–3s (sign-image-2.png is 3 MB — known issue) |
| Target frame rate | 60 fps on mid-range laptop w/ integrated GPU | Meets on modern hardware |
| Shadow map resolution | 2048×2048 (may reduce to 1024 if needed) | 2048 |

### Known Performance Issue (resolved in Phase 1)
`public/sign-image-2.png` (~3 MB) and `sign-image-1.png` (~1 MB) were downscaled to 768px and
converted to WebP (`sign-image-2.webp` 109 KB, `sign-image-1.webp` 32 KB).
All future image assets must be under 200 KB each.

### Geometry Optimization Strategies
- Use `THREE.StaticDrawUsage` on geometry that never changes
- Merge static props per-material using `BufferGeometryUtils.mergeGeometries()` (Phase 1–2)
- Use `THREE.InstancedMesh` for repeated identical geometry (bollards, barrels, trees)
- Use `THREE.Layers` to cull interior geometry when player is outdoors (Phase 4)

---

## Lighting Setup

| Light | Type | Color | Notes |
|-------|------|-------|-------|
| Ambient | AmbientLight | 0xcfe5ec | Base fill |
| Sky dome | HemisphereLight | sky 0xbfe3f0 / ground 0x5a7a4a | Outdoor sky bounce |
| Sun | DirectionalLight | 0xfff0d4 | Soft shadows, 2048px map |

For indoor zones (Phase 4): Switch to cooler ambient (0xd0e8f0), reduce hemisphere intensity,
add point lights for overhead fluorescent panels. Transition on zone change.

---

## Deployment

- Vite builds to `dist/` with base path `/Shrimp-Game/`
- GitHub Actions workflow: push to `main` → `npm ci` → `npm run build` → deploy `dist/` to GitHub Pages
- Puppeteer skip-download flag set in CI to avoid headless Chrome download
- `scripts/verify.mjs` runs a headless Puppeteer E2E smoke test

### Adding New Branches to Auto-Deploy
Edit `.github/workflows/deploy.yml` and add to the `branches:` list under `on.push`.

---

## What to Avoid

- **No physics engine** (Cannon.js, Rapier, Ammo.js) — too heavy for this scope
- **No external 3D model files** unless absolutely necessary and tiny (< 100 KB each, .glb only)
- **No npm packages that aren't tree-shakeable** — they inflate the Vite bundle
- **No background music files > 500 KB** — use Web Audio API with procedural sound where possible
- **No TypeScript migration mid-phase** — only add if the whole team agrees
- **No multiplayer / WebSocket server** — GitHub Pages is static-only
- **No save-to-cloud** — use localStorage only if saving game state
