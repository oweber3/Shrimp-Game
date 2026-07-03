# Shrimp Shift: Laitram Town — Implementation Phases

Detailed breakdown of each development phase. Update the Status column as work progresses.

---

## Phase 1: Stabilize and Organize

**Status**: Done — `mapData.js` split into `src/map/{terrain,buildings,props}.js` + `src/utils/geometry.js`;
sign images converted to WebP (990 KB → 32 KB and 3 MB → 109 KB); all `verify.mjs` checks pass.
**Goal**: Clean up the codebase so future phases are easy to build on. No gameplay changes.

### What Changes
- `src/mapData.js` — split into sub-modules under `src/map/`
- `public/sign-image-2.png` — compress to WebP or replace with canvas-drawn equivalent (currently 3 MB)
- `src/main.js` — update imports to match new module paths

### New Files / Folders
```
src/map/terrain.js       — ground, roads, world bounds, buildWorld() export
src/map/buildings.js     — all building geometry
src/map/props.js         — vehicles, trees, barrels, bollards, crates
src/utils/geometry.js    — shared box(), flat(), material definitions
```

### Systems to Build
- None new. Pure reorganization.
- Extract shared geometry helpers (`box`, `flat`, material map) into `src/utils/geometry.js`
- Each map sub-module imports from utils

### Risks
- Refactoring import order can break collider registration (colliders array is passed by reference)
- Test after each file split, not just at the end

### Performance Concerns
- `sign-image-2.png` at 3 MB is the top priority fix in this phase
- Convert to WebP (target < 150 KB) using any image tool

### How to Test
```bash
npm run dev
# Walk full campus: all buildings visible, all roads passable, no collision gaps
# Talk to Gus: mission 1 starts correctly
node scripts/verify.mjs
npm run build && npm run preview
```

### Avoid
- Changing any game logic, NPC positions, mission coordinates, or controls
- Touching `src/player.js`, `src/npc.js`, `src/missions.js`, `src/collision.js`

---

## Phase 2: Outdoor Map Realism

**Status**: Done — added `src/map/landscaping.js` (tree variety, grass patches, canal banks +
animated water via UV drift) and `src/map/vehicles.js` (extracted builders); parking head
stripes + wheel stops, warehouse bollards, office window mullions, Intralox clerestory glass,
warehouse/pharmacy rooftop units, warmer afternoon lighting. Building footprints intentionally
unchanged to preserve NPC and mission coordinates; minimap therefore needed no updates.
**Goal**: Make the exterior campus more accurate and visually rich.

### What Changes
- `src/map/terrain.js` (or `src/mapData.js`) — road layout adjustments, ground detail
- `src/map/buildings.js` — improved building proportions, roof detail, window panels, HVAC
- `src/map/props.js` — more varied trees, better parking lot striping, bollard placement
- `src/main.js` — lighting tweaks (sky color, sun angle for Louisiana afternoon)
- `src/minimap.js` — update road/building rectangles to match any layout changes

### New Files / Folders
```
src/map/landscaping.js   — trees, grass patches, canal edge geometry
src/map/vehicles.js      — vehicle builders extracted from mapData.js
```

### Systems to Build
- Parking lot line geometry (thin flat quads, white material)
- Better building window geometry (inset box panels with glass material)
- Tree variety: live oaks (wide, low canopy) vs. palm (tall, frond cone cluster)
- Canal geometry improvement (raised concrete banks, animated water material via UV offset)

### Risks
- Changing building footprints breaks NPC spawn coordinates in `src/npc.js`
  and mission POI coordinates in `src/missions.js` — update together
- More geometry increases draw calls; stay under 100k triangle budget

### Performance Concerns
- Target: < 100k triangles total. Profile in Chrome DevTools after changes.
- Use `THREE.StaticDrawUsage` for all static geometry
- Consider merging props by material with `BufferGeometryUtils.mergeGeometries()`

### How to Test
- Visual inspection: walk all roads, verify building silhouettes match campus roughly
- Confirm NPC positions still align with their buildings
- `node scripts/verify.mjs` — ensure no regression in interaction/mission flow

### Avoid
- Adding texture image files (keep canvas textures and procedural materials)
- Moving building positions without updating NPC and mission coordinates simultaneously

---

## Phase 3: Shrimp Worker Model Improvements

**Status**: Done — character builder extracted to `src/characters/shrimpWorker.js` with a
Group hierarchy (root → torso → arms/head/tail, legs at hips) and a stable API:
`root.userData.parts = { torso, head, armL, armR, legL, legR, tail, carryAnchor }`.
Tail and antennae are smooth tapered tubes (custom BufferGeometry along Catmull-Rom curves).
PPE/accessories in `src/characters/accessories.js`. NPCs got per-NPC bob frequency/phase,
idle head glances, walk-cycle limb swing, and seeded hat/boot color variety; player swings
limbs while moving and carries items via the carryAnchor world position. Carried mission
items remain scene-level objects (missions.js reads their world position directly).
**Goal**: More organic, readable shrimp characters. Better hierarchy for future animation.

### What Changes
- `src/npc.js` — refactor `createShrimpWorker()` to use Group hierarchy
- `src/player.js` — re-attach player mesh after npc.js change

### New Files / Folders
```
src/characters/shrimpWorker.js   — extracted from npc.js
src/characters/accessories.js    — toolbelt, clipboard, hard hat builders
```

### Systems to Build
- Group-based character hierarchy: `root Group → torso Group → limbs`
  This makes future per-limb animation possible without full skeletal rigging
- Improved shell curvature: TubeGeometry or LatheGeometry instead of stacked spheres
- Better claw geometry: two tapered ConeGeometry pieces forming a convincing pincer
- Idle animation variation: different bob frequencies per NPC, occasional head-turn
- Work outfit color variety: randomized vest/hat combos within defined palette

### Risks
- Changing the character Group structure breaks how `player.js` attaches the mesh
  and how `missions.js` attaches carried items
- Define a stable API for the character root Group and attachment point before refactoring
  (e.g., character.mesh = root Group, character.carryAnchor = a named child Group)

### Performance Concerns
- Each shrimp is ~30 primitives × 13 characters = ~390 meshes currently
- After Phase 3, consider merging per-character geometry into single BufferGeometry per character
- Use `THREE.InstancedMesh` for identical repeated geometry (e.g., worker hard hats)

### How to Test
- Visual inspection of all 12 NPCs + player in dev mode
- Verify carry animation still works (wrench floats in front of player)
- Talk to all NPCs, complete both missions end-to-end

### Avoid
- Loading external `.glb` models — keep procedural
- Over-engineering the rig: no skeletal system, no morph targets yet

---

## Phase 4: Indoor Building / Interior Section

**Status**: Done — Laitram Machinery has a walkable interior (lobby, office floor with six
cubicles, manager's office, breakroom; north half sealed off as the production floor).
`src/zones.js` tracks `outdoor | lobby | office_floor | manager_office | breakroom` with
0.5-unit hysteresis, swaps THREE.Layers culling at the indoor/outdoor boundary (exterior =
layer 1, interior = layer 2, characters = layer 0), and eases lighting + scene background
over ~0.5s. Interior PointLights are culled automatically by camera layers when outdoors.
Ceilings are single-sided planes facing down so the chase camera can see in over the
roofline. Interior colliders are registered statically (collider count is small enough
that on-enter registration wasn't needed). verify.mjs gained 6 zone-transition checks.
**Goal**: Add a walkable interior to the Laitram Machinery building.

### What Changes
- `src/map/buildings.js` — mark Laitram Machinery as having an interior entrance
- `src/collision.js` — interior AABB colliders registered on zone enter
- `src/player.js` — doorway/transition trigger detection
- `src/main.js` — call zone system each frame

### New Files / Folders
```
src/map/interior.js   — floor, walls, ceiling, furniture, cubicles, breakroom
src/zones.js          — zone detection (isIndoor?, which zone?)
```

### Systems to Build
- **Zone/transition system** (`src/zones.js`):
  - Maintains current zone: `outdoor | lobby | office_floor | breakroom | hallway`
  - Zone triggers are AABB rectangles near doorways
  - On zone enter: toggle mesh visibility, swap lighting parameters
  - Use `THREE.Layers` to cull exterior when indoors

- **Interior geometry** (`src/map/interior.js`):
  - Floor tiles (repeating flat quads with light grey material)
  - Drop ceiling (inverted flat at y=3.2)
  - Fluorescent light panel geometry (flat white emissive strips)
  - Cubicle partitions (low box walls in a grid)
  - Desks (flat boxes with monitor geometry)
  - Whiteboards (flat vertical quads)
  - Breakroom: table with chairs, counter, microwave, coffee machine

- **Indoor lighting**:
  - Cooler ambient (0xd0e8f0), reduced hemisphere intensity
  - Point lights above fluorescent panel geometry
  - Transition on zone change (lerp light intensity/color over 0.5s)

### Risks
- Highest-complexity phase. Visibility toggling with `THREE.Layers` needs careful setup.
- Player moving quickly through doorway could trigger/untrigger zone repeatedly.
  Add a small hysteresis buffer (require player to be 0.5 units inside trigger before switching).
- Interior colliders must be added/removed carefully to avoid infinite-size collision lists.

### Performance Concerns
- Do NOT render full exterior at full detail while indoors.
- Use `mesh.layers.set(1)` for exterior, `camera.layers.enable(1)` only when outdoors.
- Keep interior polygon count under ~20k triangles.

### How to Test
- Walk up to the main entrance of Laitram Machinery
- Verify zone transition triggers at door threshold
- Walk all interior rooms without clipping
- Walk back outside and verify exterior re-appears correctly
- `node scripts/verify.mjs` for regression check

### Avoid
- Making the interior a separate HTML page — keep one unified Three.js scene
- Loading both full exterior and full interior geometry simultaneously without layer culling

---

## Phase 5: NPCs and Intern/Workplace Interactions

**Status**: Done — five indoor NPCs (Rita at reception, interns Nina and Theo in cubicles,
Marge seated in the manager's office, Benny in the breakroom). `src/characters/npcBehaviors.js`
implements the idle | patrol | sit | talk | react state machine: seated NPCs use static limb
offsets and head-only player tracking; react (backward stumble + wobble) is wired as the
Phase 6 punch hook via reactToHit(). All dialogue extracted to `src/dialogue/dialogueData.js`.
NPC updates are distance-culled at 40 units. New indoor Mission 3 (Coffee Run: Dot → Marge →
breakroom pot → Marge) chains after Mission 2; verify.mjs covers the full 3-mission run
(28 checks). Multi-choice dialogue buttons (optional in this phase) were deferred.
**Goal**: Populate the indoor area, expand NPC behaviors, add workplace flavor.

### What Changes
- `src/npc.js` — add indoor NPC definitions, sitting behavior state
- `src/missions.js` — add 1–2 indoor workplace missions
- `src/ui.js` — optional: multi-choice dialogue response buttons

### New Files / Folders
```
src/characters/npcBehaviors.js   — behavior state machine (idle/patrol/sit/talk/react)
src/dialogue/dialogueData.js     — all dialogue strings extracted to a data file
```

### Systems to Build
- **Sitting behavior**: NPC assigned to a chair position; applies static limb offset to simulate seated pose
- **NPC behavior states**: `idle | patrol | sit | talk | react`
  - `sit`: fixed position, chair-offset pose, face player when in range
  - `react`: brief backward translation (punch flinch, Phase 6 hook)
- **Workplace dialogue**: intern humor, task-related flavor lines, office small talk
- **Multi-choice dialogue** (optional): DOM buttons for player response options (1/2/3 key or click)
- **Distance-culled NPC updates**: only update NPCs within 40 units of player each frame

### Risks
- More NPCs = more per-frame update overhead. Cap active updates by distance.
- Dialogue data file must be structured consistently to avoid runtime errors when keys are missing.

### Performance Concerns
- 20+ NPCs is fine at 60fps for this complexity level.
- Beyond ~30 NPCs, add frustum + distance check before running per-NPC update logic.

### How to Test
- Talk to each NPC, verify dialogue advances and branches correctly
- Verify sitting NPCs don't clip through chairs
- Complete any new missions end-to-end
- `node scripts/verify.mjs` — regression check on existing missions

### Avoid
- Hardcoding more dialogue into `missions.js` — use `dialogueData.js`
- Branching dialogue trees more than 2 levels deep without the data file in place

---

## Phase 6: GTA-Like Mechanics — Melee and Vehicle

**Status**: Done — `src/mechanics/combat.js` (F-key punch: 0.3s claw swing on the shoulder
pivot, hit check 1.9 units forward in a ±60° cone, NPCs enter the Phase 5 react state and
stumble; 0.8s time-based cooldown). `src/mechanics/vehicle.js` + `vehiclePhysics.js`: golf
cart parked on the Intralox apron; E mounts/dismounts, W/S/A/D drive with Euler integration
(accel 16, max 12 u/s, friction 0.92/frame applied only while coasting — applying it under
throttle caps speed at ~3 u/s), speed-proportional steering, collision via the existing AABB
system at radius 1.2 with one mutable collider rectangle that follows the parked cart and
moves out of the world while driving. verify.mjs gained 4 punch/cart checks (32 total).
**Goal**: Basic punch action and driveable golf cart.

### What Changes
- `src/player.js` — add punch input (F key), vehicle mount state
- `src/npc.js` — add react-to-punch handler

### New Files / Folders
```
src/mechanics/combat.js          — punch hitbox check, flinch, cooldown
src/mechanics/vehicle.js         — golf cart mesh, mount/dismount
src/mechanics/vehiclePhysics.js  — Euler forward/steer/friction model
```

### Systems to Build
- **Melee punch** (`src/mechanics/combat.js`):
  - Input: F key
  - Arm-swing animation: lerp claw forward 0.5 units and back over ~0.3s
  - Hit detection: manual distance + angle check, ~1.5 units forward of player
  - On hit: NPC enters `react` state (brief backward push of ~0.5 units over 0.2s)
  - Cooldown: 0.8s between punches
  - No health/damage system initially — pure visual reaction

- **Golf cart** (`src/mechanics/vehicle.js` + `vehiclePhysics.js`):
  - Mesh: box body, cylinder wheels, simple seat geometry — all Three.js primitives
  - Parked near maintenance/Intralox area
  - Mount: press E within 2 units → player mesh becomes invisible, camera shifts to cart
  - Drive: W/S = velocity along cart forward axis, A/D = steer (yaw rotation per frame)
  - Physics: `velocity *= 0.92` friction per frame; max speed ~12 units/sec
  - Collision: use existing AABB system with larger bounding radius (1.2 units)
  - Dismount: press E → player reappears beside cart, normal control resumes

### Risks
- Vehicle steering: apply movement relative to vehicle's local forward axis (not world axes)
- Vehicle + wall collision: larger bounding radius may require collision tuning near narrow passages
- Punch cooldown must be frame-independent (use elapsed time, not frame count)

### Performance Concerns
- No physics engine needed. Manual Euler integration is < 1ms/frame.
- No changes to rendering performance expected.

### How to Test
- Punch an NPC: verify arm swing animation, NPC flinch, cooldown prevents spam
- Mount cart near maintenance area: verify camera shifts
- Drive cart around campus: verify steering feels right, no wall clipping
- Dismount: verify player reappears correctly, normal controls resume
- `node scripts/verify.mjs` — regression check

### Avoid
- Adding Cannon.js, Rapier, or Ammo.js physics engine
- Adding a health/death system in this phase (keep it light)

---

## Phase 7: Polish, UI, Audio, Performance, Deploy

**Status**: Done — `src/ui/loadingScreen.js` (THREE.LoadingManager progress bar, pointer-events
none so it can't block the start overlay, 8s stall fallback). `src/audio/audioManager.js`:
fully procedural Web Audio — footstep noise ticks fired from the player's bob half-cycles,
indoor machinery hum (3 detuned oscillators through a lowpass, gain driven by the zone blend),
punch noise burst; created on the start-overlay click for autoplay policy. `src/ui/missionLog.js`:
Tab-toggled shift log of all objectives. Minimap: indoor floor-plan mode (room rects + labels)
swaps in via zones, plus a golf cart marker on the campus view. deploy.yml branch list trimmed
to main. Performance audit (headless, swiftshader): 33,774 triangles rendered at spawn
(budget < 100k), 145 KB gzipped JS (budget < 500 KB), 144 KB textures (budget < 32 MB);
shadow map stays at 2048 and fog at 420 — no cuts needed. verify.mjs: 37 checks, all passing.
**Goal**: Final quality pass. Loading screen, audio, mission log, minimap indoor floors, performance audit.

### What Changes
- `src/minimap.js` — indoor floor plan rendering mode, vehicle marker
- `src/ui.js` — mission log panel, loading progress bar, keybind hints update
- `src/main.js` — THREE.LoadingManager integration, optional debug stats toggle
- `.github/workflows/deploy.yml` — ensure current feature branch is in deploy list

### New Files / Folders
```
src/audio/audioManager.js   — Web Audio API: footsteps, ambient hum, punch SFX
src/ui/loadingScreen.js     — LoadingManager progress bar DOM overlay
src/ui/missionLog.js        — scrollable past/current objective panel
```

### Systems to Build
- **LoadingManager** (`THREE.LoadingManager`): tracks PNG texture loads, shows progress bar overlay, removes overlay on complete
- **Web Audio API**:
  - Footstep sound: short procedural click triggered on movement bob peak
  - Ambient hum: indoor AC/machinery tone (OscillatorNode, very quiet)
  - Punch SFX: short white noise burst
  - All audio gated behind user click (start overlay already handles this)
- **Mission log**: DOM panel listing completed + active objectives; toggle with Tab key
- **Indoor minimap**: when player is indoors, show floor plan view instead of campus overhead
- **Performance audit**:
  - Run Chrome DevTools performance profiler
  - Target stable 60fps on integrated GPU laptop
  - If shadow budget is tight: reduce shadow map 2048 → 1024
  - If fog is expensive: reduce far from 420 → 300

### Risks
- Audio autoplay policy: must gate all audio behind user gesture — already handled by start overlay click
- `THREE.LoadingManager` only tracks loaders registered through it — ensure TextureLoader uses it

### Performance Concerns
- Audio files: keep `.ogg` files under 200 KB each; use procedural Web Audio where possible
- npm packages: only add tree-shakeable packages; run `npm run build` and check bundle size
- Run Lighthouse audit (target score > 70 performance)

### How to Test
- Fresh page load: loading bar appears, disappears when textures ready
- Play full game end-to-end: spawn → campus → talk to NPCs → complete both missions → drive cart → punch NPC → enter building → complete indoor mission
- Tab key: mission log shows correct history
- Check on mobile browser (note: mobile touch controls are a stretch goal, not required)
- `npm run build && npm run preview` — verify production build
- `node scripts/verify.mjs`

### Avoid
- Background music files > 500 KB
- npm packages that aren't tree-shakeable (check bundle analyzer)
- Adding TypeScript in this phase without full team agreement

---

## Phase 8: Campus Accuracy

**Status**: Done — real road names (Toler, Plantation, Storey, Laitram Ln, River Rd), north
strip (5307 Toler + 301 FO/A/B/C row), south block (5211 Storey, 5123 River Rd), Lapeyre
Stair (5117 Toler), real-style addresses throughout. See ROADMAP.md. (This entry is a stub
added retroactively; the phase shipped before this file was extended.)

---

# Realism Evolution — Phases 9–16

Phases 9–13 are **Track A** (visual realism; each has a Tier 1 scope that keeps every
current constraint, and a Tier 2 upgrade that relaxes named constraints — see
[../REALISM_PLAN.md](../REALISM_PLAN.md)). Phases 14–16 are **Track B** (accuracy to the
real Laitram/Intralox — see [LAITRAM_ACCURACY.md](./LAITRAM_ACCURACY.md)).
Recommended cross-track order: **14 → 9 → 11 → 10 → 15 → 12 → 16 → 13**.

Budget baseline (TECH_PLAN, measured Phase 7): ~34k triangles at spawn (budget < 100k),
~150 draw calls (< 200), < 1 MB texture download (< 32 MB GPU), 145 KB gz JS (< 500 KB).

---

## Phase 9: Surface Materials Everywhere

**Status**: Done (Tier 1) — `src/utils/surfaceTextures.js` generates tileable canvas PBR sets
(albedo + normal + roughness) for concrete tilt-up, brick, ribbed metal panel, asphalt,
sidewalk slab, VCT floor tile, painted drywall, roof membrane, grass and bark; the
`createMaterials()` palette swaps to them and `box()`/`flat()` project world-space planar
UVs (offset by mesh position) so adjacent meshes tile seamlessly — including the levee's
custom geometry. Per-building hue jitter ships as whiteWallB/C tint variants sharing the
same maps (301 row cycles them; campusDetail buildings pick by position hash); the
pharmacy and 5123 River Rd went brick. Weathering: drip-streak decals under six big roof
edges, tire-wear bands on the main roads/aprons, and deterministic oil spots in parking
stalls — each decal type merges into a single mesh (3 draw calls total). **Deviation from
plan**: no texture atlases — RepeatWrapping can't tile an atlas sub-rect without custom
shaders, and separate 256² tiles (512² asphalt) land at ~12 MB GPU, inside the 14 MB
budget anyway. A quality gate (`isLowQualitySurfaces()`, `?surfaces=full|flat` override)
detects software renderers (SwiftShader/llvmpipe) and falls back to flat materials tinted
to each surface's average albedo, so headless verify and low-end fallback paths keep
their old cost. Generation is ~250 ms on a slow container CPU (logged at boot), lattice
noise precomputed per octave. TECH_PLAN drift fixed: module map now lists `src/world/`,
`campusDetail.js`, `landscaping.js`, `vehicles.js`, `fishPerson.js`, `giantShrimp.js`,
`collectibles.js`, `mobileControls.js`, `surfaceTextures.js`; the shadow-map row now
states the real 1024 (Phase 11 raises it). Splash-zone wall-base darkening was skipped
(drip streaks + hue jitter already break up the walls).
**Goal**: Every large surface (building walls, roofs, roads, lots, sidewalks, interior
floors, grass) gets a full procedural PBR material — albedo + normal + **roughness**
(v1 REALISM_PLAN stopped at albedo+normal) — with weathering, so the campus reads as
real materials under the existing IBL/day-night lighting.

### What Changes
- `src/utils/geometry.js` — material palette entries swap to textured `MeshStandardMaterial`s
- `src/map/buildings.js` — walls/roofs get concrete tilt-up, brick, ribbed-metal materials with world-scale UV repeats and per-building hue jitter
- `src/map/terrain.js` — asphalt (with tire-wear lanes, oil spots), concrete sidewalk/apron materials, real UVs sized in world units
- `src/map/interior.js` — VCT floor tile, drop-ceiling, painted-drywall materials
- `src/map/landscaping.js` — grass and bark textures
- `docs/TECH_PLAN.md` — fix drift: shadow-map row says 2048 but `main.js` uses 1024; add `src/world/`, `fishPerson.js`, `giantShrimp.js`, `collectibles.js`, `campusDetail.js`, `mobileControls.js` to the module map

### New Files / Folders
```
src/utils/surfaceTextures.js  — canvas PBR factories: concrete, brick, metal panel,
                                asphalt, floor tile, grass, bark; grime/streak overlay
                                pass; 2–3 shared atlases; single-channel roughness maps
```

### Systems to Build
- Tilable canvas texture generator (value-noise + domain-specific detail per surface)
- Matching normal-map generator (height→normal from the same noise, encoded RGB)
- Roughness variation maps (stains, polish wear) packed into one-channel textures
- Weathering overlay pass: drip streaks under roof edges, splash-zone darkening at wall
  bases, tire wear along drive lanes
- Atlas manager: pack 128–512px tiles, hand out sub-rect UV transforms
- **Tier 2 (R2) option**: swap the 4–5 hero surfaces to small CC0/self-made photo
  textures (WebP or KTX2 + transcoder ~60 KB) for photographic grain

### Risks
- GPU texture memory, not download size, is the real budget: 512² RGBA + mips ≈ 1.3 MB
  *each*. Standardize 256² for most tiles, 512² for hero surfaces; keep total ≤ 14 MB
- Canvas generation happens at boot — keep total draw time under ~200 ms or the loading
  screen stalls (generate lazily per-atlas, measure with `performance.now()`)
- Repeating-texture tiling artifacts on big walls — break up with hue jitter + weathering

### Performance Concerns
- Budget impact: texture GPU memory <1 MB → ≤ 14 MB (cap 32 MB); draw calls flat
  (materials replaced in place); triangles flat; bundle +~3 KB (Tier 1) — all in budget
- Set `texture.anisotropy = 4` only on ground textures (biggest win, bounded cost)

### How to Test
- `npm run dev` — walk the campus at noon and dusk: walls show material + wear, no
  visible tiling seams at 10-unit viewing distance, roads show lane wear
- Console-check `renderer.info.memory.textures` and estimated bytes ≤ 14 MB
- Time texture generation at boot (< 200 ms), `node scripts/verify.mjs`,
  `npm run build && npm run preview`

### Avoid
- Per-mesh unique textures — everything comes from the shared atlases
- Touching building footprints, NPC coordinates, or collision data
- `MeshPhysicalMaterial` for walls (reserve the cost for glass/characters)

---

## Phase 10: Architectural Detail & Glass

**Status**: Planned
**Goal**: Building silhouettes stop being boxes: parapet caps, recessed multi-pane
windows, dock hardware, downspouts, wall fixtures — the v1 Phase 2C/2D scope, rebuilt
around instancing so it fits the draw-call budget.

### What Changes
- `src/map/buildings.js` — window assemblies, parapets/cornices, pilasters, roof flashing
- `src/map/campusDetail.js` — downspouts, wall-pack light fixtures, bollard rows, dock
  levelers + rubber bumpers + guide curbs, trailer chocks
- `src/map/interior.js` — window backing planes (dark "interior depth", emissive at night)
- `src/world/streetlights.js` — register the new wall-pack fixtures with the night cycle

### New Files / Folders
```
src/map/architecture.js  — reusable builders: windowAssembly(), parapet(), pilaster(),
                           downspout(), dockLeveler(); all emit into shared
                           InstancedMesh pools / merged BufferGeometries
```

### Systems to Build
- InstancedMesh pools: one instanced mesh each for mullion bars, window frames, glass
  panes, bollards, downspouts (position/rotation/scale per instance)
- `mergeGeometries()` pass for the remaining per-building trim, one mesh per material
- Night window system: per-window emissive intensity driven by the existing
  `Atmosphere.nightFactor`, seeded so a believable ~40% subset lights up
- **Tier 2 (R1) option**: 2–3 original Blender `.glb` hero props (rooftop HVAC, dock
  leveler, wall-pack) with beveled edges + baked AO, ≤ 100 KB each, via GLTFLoader

### Risks
- Draw calls are the constraint, not triangles — without instancing this phase would
  add 100+ calls; with it, ≤ 15
- True refractive glass (`transmission`) forces per-window transparent passes: use it
  ONLY on lobby + clerestory glass; all other windows use opaque low-roughness
  reflective glass (envMap does the work)
- New protruding geometry near docks/doors can snag the player: keep collision AABBs
  unchanged (details are cosmetic, inset or above head height)

### Performance Concerns
- Budget impact: +18–25k triangles (→ ~60k of 100k), +≤ 15 draw calls (→ ~165 of 200),
  bundle +~4 KB; Tier 2 adds GLTFLoader (+~25 KB gz) and ≤ 300 KB assets
- Verify with `renderer.info.render.calls` at spawn and at the Intralox dock

### How to Test
- Walk each building at 5 units: windows show frame/mullion/glass depth; parapet lines
  visible against sky; dock doors have levelers/bumpers
- Scrub to night with `]`: subset of windows glows, wall-packs light entry doors
- `renderer.info.render.calls` < 200 at the worst view (guard-shack corner, full campus)
- `node scripts/verify.mjs` (collision/mission regression)

### Avoid
- One mesh per window/mullion (defeats the phase)
- `transmission` glass anywhere but lobby/clerestory
- Moving any doorway trigger zones (`zones.js` AABBs stay put)

---

## Phase 11: Lighting, Shadows & Post-Processing

**Status**: Done (Tier 1) — `src/world/quality.js` auto-detects a `low`/`high` tier
(renderer-string check, reused from Phase 9's `isLowQualitySurfaces`, plus a 2s
boot FPS probe that can downgrade once), with a `?quality=` override, `Q` debug
toggle, and localStorage persistence; `postfx.js`/`main.js` read it. Shadow rig:
map size 1024→2048 (`high` tier only; `low` keeps 1024), frustum ±200→±90, and
it now **follows the player** — `Atmosphere` gained a `followPoint` (set from
`main.js`, snapped to a 30-unit grid to avoid shimmer) that the sun's position
tracks alongside its existing day-night direction, with `sun.target` added to
the scene so the shadow camera's look direction actually updates; bias retuned
(`-0.00015`) and `normalBias` (`0.03`) added for the tighter texel size.
`postfx.js` inserts `SSAOPass` (three/addons) between the render and bloom
passes at half resolution, gated by the quality tier (`enabled` toggles live on
quality change) — same try/catch pattern as the existing composer fallback, so
a construction failure on a headless GPU still degrades to plain rendering.
`streetlights.js` rebuilt on four `InstancedMesh`es (poles/arms/heads/glows,
one draw call each instead of one mesh per fixture) plus a pool of 6 real,
non-shadow-casting `SpotLight`s reassigned each frame to the fixtures nearest
the player — dark streets now actually light the ground at night, not just
bloom-glow. **Deviation from plan**: no Phase 10 emissive-window hook landed
(Phase 10 hasn't shipped yet and there are no windows to hook into); land that
in Phase 10 instead of stubbing dead code here. Verified: `npm run build`
(176 KB gz, in budget), manual puppeteer smoke test on the software-renderer
path (`quality: low (auto-detected)`, no console/page errors) and again with
`?quality=high` at night (SSAO + 2048 shadow map active, no errors, streetlamp
glow renders correctly). `node scripts/verify.mjs` is flaky in this sandbox on
both the pre-Phase-11 baseline and this branch (13–20 failures either way, same
tests, timing-dependent under swiftshader) — not a regression from this phase.
**Goal**: Fix the shadow rig, add ambient occlusion, upgrade night lighting — the
frame-time phase (everything here costs milliseconds, not bytes), shipped behind a
quality auto-toggle.

### What Changes
- `src/main.js` — shadow map 1024 → 2048; frustum ±200 → ~±90 following the camera in
  ~30-unit snaps (prevents shimmer); bias retune; expose a `quality` setting
- `src/world/postfx.js` — insert SSAO between RenderPass and bloom, reuse the existing
  try/catch software-renderer fallback; add quality tiers (off / half-res / full)
- `src/world/streetlights.js` — instanced fixture meshes + a pool of ≤ 6 real
  SpotLights assigned each frame to the nearest/most-visible fixtures
- `src/map/buildings.js` — hook Phase 10's emissive windows to nightFactor (if 10 not
  yet done, land the hook here)

### New Files / Folders
```
src/world/quality.js  — auto-detect (renderer caps + a 2s boot FPS probe), user
                        override, persists to localStorage; postfx/shadows/lights read it
```

### Systems to Build
- Camera-following shadow frustum with texel-snapped movement
- SSAO integration (three/addons `SSAOPass`) at half resolution, quality-gated
- SpotLight pool: fixtures are cheap instanced geometry + emissive; only the nearest N
  get a live light with shadows off
- **Tier 2 (R3) option**: `postprocessing` npm pkg + N8AO (better AO quality/perf) and
  three/addons CSM (2–3 cascades: sharp near shadows + full-campus coverage).
  Bundle +~80–120 KB gz; CSM multiplies shadow-pass draw calls by cascade count

### Risks
- SSAO on integrated GPUs can cost 2–4 ms — the single tightest item in Track A; the
  quality toggle is not optional, and verify.mjs's software renderer must take the
  fallback path automatically
- Tightened shadow frustum can clip shadows of tall objects behind the camera — extend
  the frustum's near plane backward along the sun axis
- Moving-frustum shimmer if snapping is skipped

### Performance Concerns
- Budget impact: shadow map 1024→2048 ≈ +12 MB render-target memory (separate from the
  32 MB texture budget but track it); SSAO +2–4 ms GPU at half res; SpotLight pool
  bounded at 6; bundle +~2 KB Tier 1 / +~120 KB Tier 2 (→ ~265 KB gz, still < 500 KB)
- Target: 60 fps desktop dGPU with SSAO on; integrated GPU auto-drops to SSAO-off and
  keeps 60

### How to Test
- Shadow edges at a building base: crisp at 2048 within ~90 units, no acne/peter-panning
- Toggle SSAO on/off (debug key): contact darkening appears under trucks, at wall-floor
  junctions, inside cubicles
- Night: exactly ≤ 6 live SpotLights (`scene` traversal count), fixtures beyond the pool
  still glow emissively
- FPS probe: ≥ 55 fps on integrated GPU with auto quality; `node scripts/verify.mjs`
  passes on the software renderer (fallback path taken, logged)

### Avoid
- Per-fixture live PointLights (the v1 Phase 4B mistake — pool them)
- Enabling SSAO unconditionally (headless/software renderers must skip it)
- Shadow-casting SpotLights in the pool

---

## Phase 12: Water, Vegetation & Weather

**Status**: Planned
**Goal**: The three "diorama tells" go away: dead canal water, lollipop trees, and a
permanently clear Louisiana sky.

### What Changes
- `src/map/landscaping.js` — oaks/palms rebuilt as alpha-cutout foliage cards; instanced
  grass tufts along sidewalks; canal water mesh handed to the new water module
- `src/world/sky.js` — cloud deck: icosahedron puffs → billboard cloud sprites (canvas
  radial-alpha textures, 3–5 layered planes per cloud); weather state modulates
  turbidity/fog/sun intensity through the existing `outdoor` lighting state
- `src/world/postfx.js` — optional heat-shimmer pass hook (stretch, quality-gated)
- `src/audio/audioManager.js` — rain layer on the procedural audio bed
- `src/main.js` — weather system update call

### New Files / Folders
```
src/world/water.js    — canal material: scrolling dual normal maps, fresnel toward the
                        baked sky cube, banked-edge scum line; update(dt)
src/world/weather.js  — state machine (clear | hazy | overcast | rain), timed drifts +
                        [ / ] debug hooks; instanced rain streaks (~400, cylinder around
                        camera); wet-ground roughness modulation + puddle decals
src/utils/foliage.js  — leaf-cluster card builder: canvas leaf-silhouette alphaMap,
                        alphaTest 0.5, DoubleSide; per-tree card layout; far-LOD swap
                        to single billboard past ~80 units
```

### Systems to Build
- Water shader via `onBeforeCompile` on MeshStandardMaterial (keeps IBL/fog integration)
- Foliage card system with two LODs (card cluster ↔ single billboard)
- Weather state machine blending fog density/color, sun/hemi intensity, cloud coverage,
  bloom strength, and audio over ~20 s transitions
- Rain: one InstancedMesh, camera-relative respawn, splash-fade decal ring on ground
- Wet ground: global roughness uniform lerp + a handful of puddle decal planes with
  envMap reflections at known low spots
- **Tier 2 (R3) option**: three/addons `Water` (planar reflection at half res) for the
  canal (+~1.5 ms GPU); low-res raymarched volumetric cloud layer, desktop-only

### Risks
- Alpha-tested foliage overdraw: cap oaks at ~12 cards each, palms ~8 fronds; LOD swap
  is mandatory, not polish
- Weather touching the day/night lighting rig risks fighting `Atmosphere` — weather
  writes *modifiers* onto the `outdoor` state object, never directly to lights
- Rain + SSAO + bloom together is the worst frame; quality system must be able to drop
  rain instance count

### Performance Concerns
- Budget impact: +6–10k triangles (→ ~70k), +~6 draw calls, +~3 MB texture (foliage/
  cloud/noise canvases; → ~17 MB), +1–2 ms GPU during rain, bundle +~6 KB
- Grass tufts only within ~40 units of walkways, instanced, no shadows cast

### How to Test
- Canal at noon and sunset: moving ripples, sky reflection changes with view angle
- Oak up close: leaf-silhouette edges, sky visible through canopy; walk 100 units away:
  billboard swap not visibly popping
- Debug-cycle weather: rain streaks fall relative to camera, ground darkens and
  reflects, rain audio fades in; overcast dims sun and flattens shadows
- FPS during rain at dock (worst case) ≥ 55 desktop; `node scripts/verify.mjs`

### Avoid
- Per-blade grass or per-leaf geometry
- Transparent (`transparent: true`) foliage — alphaTest cutout only, or sorting dies
- Weather writing directly to light objects (goes through `Atmosphere.outdoor`)

---

## Phase 13: Character Realism II — Animation & Faces

**Status**: Planned — **gated on the Tier 1 vs Tier 2 (R1) decision** (REALISM_PLAN.md
open question #1/#3). Do not start until decided.
**Goal**: Characters move believably. v1 Phase 1 (shipped) made them look right standing
still; feet still slide and faces are static.

### What Changes
- `src/characters/shrimpWorker.js` — expose leg segment lengths + foot pivots to the
  gait engine; eyelid/pupil nodes named for the face system
- `src/characters/fishPerson.js`, `src/characters/giantShrimp.js` — same hooks (Shrimply
  gets scaled cadence + ground-thump timing)
- `src/characters/npcBehaviors.js` — behaviors emit locomotion intent (speed, turn) and
  talk state instead of driving limbs directly
- `src/player.js` — player uses the same gait engine; carry pose refined
- `src/mechanics/combat.js` — punch reads new arm pose API (same swing contract)

### New Files / Folders
```
src/characters/animation.js  — gait engine: planted-foot stepping (analytic two-bone
                               knee solve on existing Groups), weight shift/hip sway,
                               cadence matched to velocity, jog transition
src/characters/face.js       — blink scheduler (eyelid scale), pupil/head player
                               tracking with saccades, mouth-plate talk flap driven by
                               dialogue advance events
src/characters/springs.js    — critically-damped spring util for antennae, tail, vest
                               flap secondary motion
```
Tier 2 (R1) instead/additionally:
```
assets/characters/*.glb          — original Blender-built skinned shrimp (~5–8k tris,
                                   idle/walk/jog/wave/talk clips, blink morphs),
                                   ≤ 400 KB each, workers share one mesh + color variants
src/characters/gltfCharacter.js  — GLTFLoader + AnimationMixer wrapper exposing the SAME
                                   root.userData.parts + carryAnchor API (adapter), so
                                   player.js / missions.js / combat.js are untouched
```

### Systems to Build
- Tier 1: gait engine + face system + secondary-motion springs (all CPU, existing rig)
- Tier 2: Blender pipeline doc (`docs/ASSET_PIPELINE.md`), loader with LoadingManager
  integration, clip crossfading, adapter that preserves the parts API contract
- Either tier: NPC LOD — full animation ≤ 25 units, bob-only ≤ 40 (existing cull), frozen
  beyond

### Risks
- The `root.userData.parts` / `carryAnchor` API is the load-bearing contract
  (missions carry, punch swing, sit poses). Tier 2's adapter must pass the full
  verify.mjs suite before any visual work
- Tier 2 is a one-way art-style door: skinned organic shrimp next to primitive
  buildings can clash — prototype ONE worker and screenshot-compare before batch work
- Tier 1 knee-solve on a rig never designed for IK: allow per-character tuning offsets

### Performance Concerns
- Tier 1: ~0.1 ms CPU for 13 characters (analytic, no iteration); 0 bytes
- Tier 2: +GLTFLoader ~25 KB gz; ≤ 2 MB assets total (relaxes the no-model-files
  constraint, R1); skinning cost trivial at 13 characters; loading screen now has real
  work to display
- Budget after either tier: bundle ≤ ~290 KB gz (Tier 2), still < 500 KB

### How to Test
- Walk beside an NPC at walking speed: feet plant without sliding (screen-record, step
  through frames); antennae lag and settle on stop
- Stand near an idle NPC 30 s: breathing visible, blinks at irregular 2–6 s intervals,
  pupils track player movement
- Talk to Gus: mouth flap only while dialogue advances; complete all missions
  (carry anchor regression); punch an NPC (react regression)
- Shrimply Gigantic: slow cadence reads as heavy, no foot pops
- `node scripts/verify.mjs` — all checks, both tiers; Tier 2 also: cold-load ≤ 3 s on
  throttled 4G in DevTools

### Avoid
- Full iterative IK solvers or a physics rig — analytic two-bone only (Tier 1)
- Tier 2 without the adapter (rewriting missions/combat/player attachment is out of scope)
- Downloaded/marketplace character models — Tier 2 assets must be original (copyright rule)

---

## Phase 14: Campus Geography & Signage Accuracy (Track B)

**Status**: Done — Intralox plant relabeled from "220 Plantation" to "301 Plantation Rd"
(the published address; open question #6 resolved toward the 301 complex) in the wall sign,
minimap and docs; door-number signs added over the LM lobby (220) and office (201) entrances;
Mississippi levee berm (triangular grass prism + gravel crown path) added south of River Road,
outside the fence, cosmetic-only; six cross-blade street signs added at previously unsigned
intersections and three stacked wayfinding boards (Shipping / Receiving / Visitor Parking /
West Dock / Distribution / 301B) placed at the gate approach, Storey corner and Toler St;
minimap expanded view gained street-name labels and a levee band; GAME_DESIGN landmark list
converted to a table with verified/stylized markers; fan-project disclaimer added to README
and the title overlay. No collider, NPC, POI or zone changes.
**Goal**: Fix the flagged geography items from LAITRAM_ACCURACY.md §2 and make the campus
legible: correct addresses, the missing Mississippi-levee anchor, street/wayfinding signs,
and honest docs.

### What Changes
- `src/map/buildings.js` — resolve the "220 Plantation" vs 301-complex label (open
  question #6); door-number signs over entrances
- `src/map/terrain.js` — levee berm: long grass ridge south of River Road (the real
  campus sits by the Mississippi River levee — its strongest geographic feature)
- `src/map/campusDetail.js` — street-name blades at intersections (Toler / Plantation /
  Storey / Laitram Ln / River Rd), wayfinding arrows (Shipping, Receiving, Visitor
  Parking)
- `src/minimap.js` — street labels; levee edge on the campus view
- `docs/GAME_DESIGN.md` — landmark table gains a "verified / stylized" column per the
  audit; setting paragraph stops implying survey accuracy
- `README.md`, `src/ui/loadingScreen.js` (or title overlay) — one-line fan-project
  disclaimer

### New Files / Folders
```
(none — signage uses the existing textTexture()/canvas sign path in utils/geometry.js)
```

### Systems to Build
- Street-sign and wayfinding builders (instanced posts + canvas text blades)
- Levee geometry (merged ridge strip + Phase 9 grass material if available, flat green
  if not) — cosmetic only, outside walkable bounds, no collider changes

### Risks
- Relabeling buildings must not touch mission POIs or NPC coordinates (labels are
  cosmetic; positions frozen)
- Keep the levee outside world bounds so no collision/pathing changes

### Performance Concerns
- Negligible: +~2k triangles, signs share one atlas texture, +2–3 draw calls
- Budget after: no measurable change to any TECH_PLAN row

### How to Test
- Walk every intersection: street blades match ROADMAP road names; wayfinding arrows
  actually point toward their targets
- South edge: levee ridge visible beyond River Road, not walkable
- Minimap `M`: street labels legible at both zoom levels
- README + title screen show the disclaimer; `node scripts/verify.mjs`

### Avoid
- Moving buildings/roads to chase exact real-world parcel shapes (Phase 8 froze the
  layout; this phase corrects *labels and dressing* only)
- Claiming verified accuracy for the unverifiable addresses (mark stylized instead)

---

## Phase 15: Company Heritage & Product Grounding (Track B)

**Status**: Planned
**Goal**: Put the real 75-year story in the world — 1949 shrimp peeler, 1971 modular
belt (patented 1975), 1981 alternating-tread stair, four divisions — while keeping the
premise: shrimp *build the machines*; nothing on campus processes shrimp.

### What Changes
- `src/map/interior.js` — lobby heritage exhibit: Model A peeler replica (primitives:
  cylindrical peeling rollers, hopper, frame) on a plinth; timeline wall (canvas
  textures: 1949 → 1971 → 1975 → 1981); "name spelled backwards" plaque gag
- `src/map/props.js` — division-true props: blue modular-belting samples + small demo
  conveyor loop (animated UV/link offset) in the Intralox plant yard; crated peeler
  equipment at Laitram Machinery shipping; machining blocks/lathe corner (LMS flavor)
- `src/map/campusDetail.js` — **functional alternating-tread stairs** (distinct
  steep-stair geometry) at dock crossovers and near the Lapeyre Stair building
- `src/dialogue/dialogueData.js` — division-aware flavor lines (who makes belting vs
  peelers vs stairs vs machined parts); heritage-plaque text
- `src/mechanics/collectibles.js`, `src/missions.js` — "Heritage Tour": find 6 plaques,
  reward: gold hard hat (accessory recolor)
- `src/characters/accessories.js` — gold hard hat variant

### New Files / Folders
```
src/map/heritage.js  — exhibit + plaque + demo-conveyor builders (kept out of
                       interior.js/props.js to avoid bloating them)
```

### Systems to Build
- Plaque interactable (reuses the E-prompt dialogue path) + collectible registration
- Demo conveyor loop: instanced belt-link modules stepping along a track (also a quiet
  Intralox-product showcase)
- Heritage copy pass, written under LAITRAM_ACCURACY.md §3 guardrails (founder unnamed
  by default — open question #4; no logos; no present-day factual claims)

### Risks
- Factual-tone creep: all copy reads as in-world lore, reviewed against §3 guardrails
- Alternating-tread stairs are steep and could trap the player — treat as cosmetic-solid
  (AABB blocks entry) unless simple step-up movement already works
- Lobby is small: exhibit must not break the existing zone triggers or Rita's position

### Performance Concerns
- +~6k triangles (exhibit + props + stairs), +4–6 draw calls, +~0.5 MB canvas textures;
  demo conveyor is one InstancedMesh update (~0.05 ms)
- Budget after: still ≤ ~80k triangles worst case with Phases 10/12 — inside 100k

### How to Test
- Lobby: read the full timeline wall; peeler replica identifiable as a machine, not a
  box; plaque gag dialogue plays
- Find all 6 plaques via the Heritage Tour; gold hard hat appears on completion; shift
  log (`Tab`) records it
- Cross the dock on an alternating-tread stair prop (or bounce off its collider, per
  decision); `node scripts/verify.mjs` extended with the new mission check
- Copy review against LAITRAM_ACCURACY.md §3 checklist (no real names/logos/claims)

### Avoid
- Live-shrimp processing imagery anywhere (the §1.4 nuance is the product)
- Real logo shapes/wordmarks/slogans — plain lettering and generic layouts only
- Catalog part numbers or anything reading as endorsement

---

## Phase 16: Workplace Realism — PPE, Safety & Org Structure (Track B)

**Status**: Planned
**Goal**: The campus behaves like a real manufacturing/shipping workplace: PPE zones,
ANSI-style generic safety signage, yard logistics, a plausible (fictional) org chart,
and a make-and-ship mission.

### What Changes
- `src/utils/geometry.js` (or `surfaceTextures.js` if Phase 9 landed) — ANSI-style
  generic sign textures: DANGER/WARNING/CAUTION/NOTICE color bands, PPE pictograms,
  forklift/pedestrian markers — original layouts, no real-brand trade dress
- `src/map/campusDetail.js` — signage placement (plant/dock entrances, eyewash/
  extinguisher stations), "___ days since last shell incident" board at the break
  pavilion
- `src/map/terrain.js` — pedestrian-walkway striping, forklift-lane markings,
  dock staging grids, dock-door numbers
- `src/npc.js` + `src/dialogue/dialogueData.js` — roster mapped to fictional
  industry-generic roles (Dot → Shipping Lead, Juno → QA Inspector, new EHS
  coordinator NPC, machinist, molding operator); role-true dialogue rewrite;
  indoor office NPCs lose hard hats, plant/dock NPCs keep full PPE
- `src/characters/accessories.js` — safety glasses accessory; hat removal support
- `src/zones.js` + `src/ui.js` — PPE-zone flavor toast on entering the plant floor
  (no fail state)
- `src/missions.js` — Mission: "First Shift on the Line" — work order: pick belt
  modules → QA check → crate → stage at dock door → sign the fictional BOL

### New Files / Folders
```
src/map/safety.js  — sign/striping/station placement (data-driven list, not scattered
                     one-off code)
```

### Systems to Build
- Sign-texture generator (color-band + pictogram compositor on canvas)
- Floor-striping decal layer (thin planes, z-offset, shared material — same technique
  as parking stripes)
- PPE state on characters (accessory add/remove by zone/role)
- Multi-step fetch-chain mission using existing carry + dialogue systems (no new
  mechanics needed)

### Risks
- Dialogue rewrite touches every NPC — keep old keys as fallbacks in dialogueData so
  missions can't dead-end on a missing key
- Sign clutter: cap density (signs at decision points, not every wall)
- The safety-board gag must stay clearly shrimp-world slapstick (guardrails §5 — no
  punching at the real company's safety record)

### Performance Concerns
- +~3k triangles, striping decals batched to 2–3 draw calls, signs share one atlas
  (+~1 MB); NPC count +1–2 stays inside the Phase 5 distance-cull design
- Budget after: all TECH_PLAN rows still green

### How to Test
- Enter the plant floor: PPE toast fires once (hysteresis, not every frame); office
  NPCs bare-headed indoors, dock NPCs in full PPE
- Read each sign type up close (legible at 3 units); walkway striping continuous from
  parking to entrances; dock doors numbered and visible from the yard
- Complete "First Shift on the Line" end-to-end; `Tab` log shows all steps;
  `node scripts/verify.mjs` extended to cover it
- Dialogue sweep: talk to every NPC in every mission state — no missing-key text

### Avoid
- Fail states/penalties for PPE (flavor only — GAME_DESIGN "low-stress" rule)
- Real OSHA logo or agency insignia (generic ANSI-style layouts only)
- Implying the org chart or practices describe the real company (fictional, generic)
