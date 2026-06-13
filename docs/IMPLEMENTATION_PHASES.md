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

**Status**: Pending
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
