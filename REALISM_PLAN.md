# Shrimp Shift: Realism Plan v2 — Track A (Visual/Technical)

**Status: PLANNING — supersedes the original REALISM_PLAN.md (v1).**

This document is the design home for Track A (visual/technical realism). Its
sibling, [docs/LAITRAM_ACCURACY.md](./docs/LAITRAM_ACCURACY.md), covers Track B
(accuracy to the real Laitram/Intralox company). Per-phase implementation
breakdowns in the standard format live in
[docs/IMPLEMENTATION_PHASES.md](./docs/IMPLEMENTATION_PHASES.md) (Phases 9–16),
and the roadmap table in [docs/ROADMAP.md](./docs/ROADMAP.md) is the index.

The combined **Implementation Order** across both tracks and the **Open
Questions** you need to decide are at the bottom of this file.

---

## What happened to Realism Plan v1

The v1 plan had four phases. Status check against the actual codebase:

| v1 Phase | Content | Status |
|----------|---------|--------|
| 1 (Characters) | Shell/skin canvas textures, normal maps, clearcoat, layered eyes, fabric/leather maps | **Shipped** (commit `2eea18c`, PR #21) — do not redo |
| 2 (Buildings/Ground) | Concrete/brick/metal canvas textures, architectural detail, multi-pane windows, landscaping | Not started — folded into new **Phases 9, 10, 12** |
| 3 (Environment) | Shadow quality, SSAO, clouds, road markings | Not started — folded into new **Phases 9, 11, 12** |
| 4 (Rendering polish) | Interior IBL probe, night emissives, texture atlas | Not started — folded into new **Phases 9, 10, 11** |

### Critique of v1 (why this rewrite goes further)

- **It was albedo+normal only.** Real PBR surfaces need per-texel *roughness*
  variation (oil stains on asphalt, rain streaks on metal panel, polished
  vs. scuffed concrete). v1 never touched `roughnessMap`/`aoMap` — that is
  where most of the "realism per byte" lives, and canvas can generate it.
- **It didn't offer a tiered choice.** Everything assumed the locked
  constraints (procedural-only, no deps). This rewrite makes the constraint
  relaxations explicit (Tier 2) so each one can be approved or rejected.
- **It undercounted GPU texture memory.** ~20 canvas textures at 512² RGBA
  with mipmaps is ~27 MB of GPU memory — near the 32 MB budget. The new plan
  budgets GPU bytes per phase, standardizes on 256²/512² with a shared atlas,
  and uses single-channel textures for roughness/AO where possible.
- **Some v1 items are already shipped elsewhere.** The "Director's Cut" work
  (ACES, baked scattering sky + PMREM IBL, bloom, day/night, streetlamps,
  stars/moon) landed after ROADMAP Phase 8. v1's cloud/shadow sections were
  written against the older sky. Also note **docs drift**: TECH_PLAN claims a
  2048 shadow map but `src/main.js` currently uses **1024** with a loose
  ±200-unit frustum — Phase 11 fixes both the code and the doc.
- **It ignored animation entirely.** Characters got better *materials* in
  Phase 1 but still slide-walk with sine-bob limbs. Believable motion (foot
  plant, secondary motion, blinking) moves the realism needle more than any
  additional texture — that is new Phase 13.
- **It ignored weather.** A Louisiana campus with no rain, haze, or heat
  shimmer reads as a diorama — new Phase 12.

---

## The two tiers — choose one (or approve Tier 2 à la carte)

Every Track A phase below has a **Tier 1** scope and a **Tier 2** upgrade.

### Tier 1 — "Stylized-realistic, constraints preserved"

- 100% procedural geometry (Three.js primitives + custom BufferGeometry)
- All textures canvas- or shader-generated at runtime (plus the existing
  two WebP signs); no downloaded texture packs
- No external `.glb`/`.gltf` model files
- No physics engine, no new npm dependencies (three/addons only — they
  tree-shake into the existing bundle)
- Stays inside every TECH_PLAN budget: <100k triangles, <200 draw calls,
  <32 MB texture memory, <500 KB gz bundle, 60 fps on integrated GPU

Realistic ceiling: a coherent, filmic, *miniature-model* look — think
"architectural visualization of a toy campus," not photoreal. Everything
reads as real materials under real light, but silhouettes stay simple.

### Tier 2 — "True realism, constraints relaxed"

Each relaxation is independent. What each one buys:

| # | Constraint to renegotiate (ROADMAP/TECH_PLAN) | Relaxed to | Realism gain | Cost |
|---|---|---|---|---|
| R1 | "All geometry stays procedural / no external 3D model files" | Allow **original, self-made** `.glb` files (≤ 300 KB each, ≤ 2 MB total; skinned characters + hero props) | Biggest single jump: organic shrimp silhouettes, real skinned walk/idle/facial animation instead of rigid-part bobbing | Asset pipeline (Blender), GLTFLoader (+~25 KB), loading latency, rig API migration |
| R2 | "No heavy asset files" (texture side) | Allow small **CC0/self-made photo textures**, ideally KTX2/basis compressed (+~60 KB transcoder) | Photographic material grain (concrete, asphalt, bark) that canvas noise can't fake | +2–6 MB download, GPU memory toward ~24 MB, attribution bookkeeping |
| R3 | JS bundle < 500 KB gz | Raise to **~700 KB gz** | Room for `postprocessing`/N8AO (better AO than three's SSAOPass), CSM shadows, spring/IK helpers | Slower first load on 4G (~+1 s); still fine on GitHub Pages |
| R4 | "No physics engine" | Allow **Rapier (WASM ~1.5 MB)** | Ragdoll punch reactions, cart suspension, tumbling props | Large download, sim complexity, collision-system rewrite. **Recommended: reject** — worst realism-per-byte in this table |
| R5 | GitHub Pages static hosting | Move to a host with server features | Nothing Track A needs. Streaming assets/multiplayer only | **Recommended: reject** — every phase below deploys fine as static files |

Tier 2 still honors the "no copyrighted assets" rule — external files must be
original or CC0, never ripped.

**Recommendation:** ship Tier 1 for Phases 9–12 first (it is most of the
visible win), then decide Tier 2 only for Phase 13 (characters), where R1 is
the difference in kind rather than degree.

---

## Track A phases (summary — full breakdowns in docs/IMPLEMENTATION_PHASES.md)

### Phase 9 — Surface Materials Everywhere (buildings + ground)

The single highest-impact phase. A shared procedural PBR texture factory
(`src/utils/surfaceTextures.js`): tilable canvas albedo + normal + roughness
(+AO where cheap) for concrete tilt-up, brick, corrugated/ribbed metal panel,
asphalt, painted concrete floor, grass, bark. Applied across `buildings.js`,
`terrain.js`, `interior.js`, `campusDetail.js` with world-scale UV repeats,
per-building hue jitter, and grime/weathering passes (drip streaks under roof
edges, tire wear on drive lanes, oil spots at parking stalls).

- **Tier 1:** all canvas-generated; packed into 2–3 atlases (roughness in a
  single channel); budget ≤ 14 MB GPU texture memory, +0 deps, draw calls flat
  (materials swap in place).
- **Tier 2 (R2):** replace the 4–5 hero surfaces (asphalt, concrete, metal
  panel) with compressed photo textures for photographic grain. +2–4 MB
  download.
- **Tradeoff:** canvas textures upload once at boot (~100–200 ms hit on the
  loading screen); atlasing constrains per-surface repeat settings, so ground
  planes get real UVs sized in world units.

### Phase 10 — Architectural Detail & Glass

Silhouette realism for the buildings: parapet caps, cornices, pilasters,
recessed multi-pane window assemblies with mullions, dock levelers + rubber
bumpers + guide curbs, downspouts, wall-pack light fixtures, bollard rows,
roof-edge flashing. Windows become framed assemblies with a dark
"interior-depth" backing plane that turns emissive at night.

- **Tier 1:** all primitives, heavy use of `InstancedMesh` (one instanced
  mullion/window/bollard mesh each) and `BufferGeometryUtils.mergeGeometries`
  per material. Budget: +18–25k triangles (to ~60k total), draw calls +≤15.
- **Tier 2 (R1):** a few original hero-prop `.glb`s (rooftop HVAC unit, dock
  leveler, wall-pack fixture) modeled once in Blender with beveled edges and
  baked AO — crisper than primitive assemblies for the same triangle count.
- **Tradeoff:** true refractive glass (`transmission`) forces a transparent
  render pass per window; use it only on the lobby/clerestory glass and keep
  plain low-roughness reflective glass elsewhere, or the draw-call budget dies.

### Phase 11 — Lighting, Shadows & Post-Processing

Fix the shadow rig (1024 → 2048, frustum tightened from ±200 to ~±90 following
the camera in ~30-unit snaps to avoid shimmer, bias retuned), add ambient
occlusion, and upgrade night lighting (instanced pole/wall fixtures with a
small pool of real `SpotLight`s assigned to the nearest N fixtures; emissive
window grids after dusk; baked AO darkening under canopies/eaves).

- **Tier 1:** three/addons `SSAOPass` at half resolution, gated by a quality
  toggle and auto-disabled on the software-renderer fallback path (postfx.js
  already has the try/catch pattern). Budget: +2–4 ms GPU on integrated
  graphics — the tightest budget item in Track A; ship with a perf switch.
- **Tier 2 (R3):** `postprocessing` + N8AO (better quality/perf than SSAOPass)
  and three/addons CSM (2–3 cascades) for sharp near shadows *and* full-campus
  coverage. Bundle +~80–120 KB gz; CSM multiplies shadow draw calls by cascade
  count.
- **Tradeoff:** every effect here is a frame-time tax, not a byte tax. The
  phase ships a `quality` setting (auto-detected, user-overridable) or the
  60 fps budget on integrated GPUs is at risk.

### Phase 12 — Water, Vegetation & Weather

The canal gets a real water material (scrolling dual normal maps, fresnel
reflection of the baked sky cube, banked edges with a scum line). Vegetation
goes from lollipop icosahedra to alpha-cutout foliage: live oaks as clusters
of camera-facing leaf-cluster cards (canvas leaf-silhouette alphaMap,
`alphaTest`), palms with drooping frond cards, instanced grass tufts near
sidewalks. Weather states (clear / hazy / overcast / rain shower) blend into
the existing day/night atmosphere: instanced rain streaks, wet-ground
roughness drop + puddle decals, distance haze, drifting cloud-billboard deck
replacing the icosahedron puffs. Louisiana heat shimmer (subtle screen-space
distortion above asphalt) as a stretch item.

- **Tier 1:** all shader/canvas driven; rain is one `InstancedMesh` (~400
  streaks in a cylinder around the camera). Budget: +6–10k triangles, +1–2 ms
  GPU in rain, texture +~3 MB.
- **Tier 2 (R3):** three/addons `Water` (planar reflection at half res) for
  the canal — real reflections of buildings, ~+1.5 ms GPU; optional raymarched
  low-res volumetric cloud layer (expensive, desktop-only).
- **Tradeoff:** alpha-tested foliage causes overdraw; cap oak card counts and
  fade cards to billboards past ~80 units. Weather must also modulate audio
  (rain on the existing procedural Web Audio bed) or it reads as a screensaver.

### Phase 13 — Character Realism II: Animation & Faces

Phase 1 (v1) made characters *look* better standing still; this makes them
move believably. Applies to shrimp workers, Gerald (`fishPerson.js`), and
Shrimply Gigantic (`giantShrimp.js`).

- **Tier 1 (procedural, rig API preserved):** a gait engine on the existing
  Group hierarchy — planted-foot stepping (two-bone analytic knee solve on
  the leg Groups, feet stop sliding), weight shift + hip sway, speed-matched
  cadence walk↔jog, antenna/tail spring-damper secondary motion, breathing
  idle, blink cycles (eyelid scale), pupils/head tracking with saccade
  timing, mouth-plate flap while dialogue advances, hand-poses for carry.
  Budget: pure CPU, ~0.1 ms for 13 characters; 0 bytes.
- **Tier 2 (R1 — the flagship relaxation):** original Blender-built skinned
  shrimp (~5–8k triangles), exported `.glb` with baked idle/walk/jog/wave/
  talk clips and morph-target blinks, driven by `AnimationMixer`. The rig
  ships an adapter that still exposes `root.userData.parts` +
  `carryAnchor` so `player.js`/`missions.js`/`combat.js` don't change.
  ~250–400 KB per unique character (workers share one mesh with color
  variants), +GLTFLoader. This is the visible difference between "nice toy"
  and "creature" — and also the biggest risk to the game's charm; see open
  questions.
- **Tradeoff:** Tier 1 keeps the exact current silhouette (charm preserved,
  realism capped); Tier 2 buys organic deformation but adds an asset
  pipeline, load time, and a one-way art-style door.

---

## Combined Implementation Order (Track A + Track B)

Track B phases (14–16) are defined in
[docs/LAITRAM_ACCURACY.md](./docs/LAITRAM_ACCURACY.md). Order chosen so the
cheap, high-grounding accuracy work lands early, materials/lighting (biggest
visual payoff) land before detail work that depends on them, and the riskiest
phase (13) goes last, after the tier decision.

| Order | Phase | Track | Name | Size | Depends on | Gate |
|-------|-------|-------|------|------|------------|------|
| 1 | 14 | B | Campus Geography & Signage Accuracy | S | — | none |
| 2 | 9 | A | Surface Materials Everywhere | M | — | Tier choice affects scope only (R2) |
| 3 | 11 | A | Lighting, Shadows & Post | M | 9 (materials respond to light/AO) | R3 if Tier 2 |
| 4 | 10 | A | Architectural Detail & Glass | M–L | 9 (shares textures) | R1 optional |
| 5 | 15 | B | Company Heritage & Product Grounding | M | 14 (signage system), 9 (sign textures) | none |
| 6 | 12 | A | Water, Vegetation & Weather | M–L | 11 (postfx hooks) | R3 optional |
| 7 | 16 | B | Workplace Realism: PPE, Safety & Org | M | 15 (roles/flavor), 9 (striping/decals) | none |
| 8 | 13 | A | Character Animation & Faces | L | none hard; benefits from all above | **Tier 1 vs Tier 2 (R1) decision required** |

Each phase independently shippable; `node scripts/verify.mjs` must stay green
after every one.

---

## Open Questions (decide before implementation starts)

1. **Tier 1 or Tier 2 — and global or à la carte?** Recommendation: Tier 1
   for Phases 9–12 now; decide R1 (external `.glb`) only when Phase 13 starts.
2. **If any Tier 2: which relaxations exactly?** R1 (small original `.glb`s)?
   R2 (compressed photo textures)? R3 (bundle to ~700 KB gz for
   `postprocessing`/N8AO/CSM)? R4 physics and R5 hosting are recommended
   rejections — confirm.
3. **Art-style ceiling for characters (Phase 13):** keep the charming rigid-
   part shrimp and make them *move* like creatures (Tier 1), or rebuild as
   skinned organic models (Tier 2/R1)? This is a one-way aesthetic door.
4. **Founder naming (Track B):** the in-game heritage exhibit can tell the
   true 1949 story with the founder unnamed ("a 16-year-old inventor from
   Houma") — recommended — or use the real historical name. See
   LAITRAM_ACCURACY.md §Guardrails.
5. **Real division names on buildings:** the game already writes "Intralox" /
   "Laitram" as plain text signage (no logos). Keep that, or fictionalize
   (e.g. "Intershrimp")? Recommendation: keep plain-text real names + add a
   fan-game disclaimer to the README and title screen.
6. **"220 Plantation" label** for the Intralox plant is not publicly
   corroborated (public sources put Intralox/Laitram HQ at 301 Plantation
   Rd). Relabel the big plant as part of the 301 complex, or keep the
   current label as internal-style numbering? (LAITRAM_ACCURACY.md §Audit.)
7. **Weather scope (Phase 12):** rain-only, or the full clear/hazy/overcast/
   rain state machine (+~30% of that phase's effort)?
8. **Performance floor:** must Tier 2 effects hold 30 fps on mobile/touch
   devices, or is mobile allowed to auto-drop to Tier 1 quality? (Plan
   assumes a `quality` auto-toggle either way.)
9. **Docs drift cleanup:** OK to fold small corrections into Phase 9 (TECH
   _PLAN's stale 2048-shadow claim, missing `src/world/`, `fishPerson.js`,
   `giantShrimp.js`, `collectibles.js`, `campusDetail.js`, `mobileControls.js`
   entries in its module map)?

---

## Key Files Reference (verified against the current tree)

| File | Role |
|------|------|
| `src/utils/geometry.js` | Material palette + character texture factories (v1 Phase 1 lives here) |
| `src/characters/shrimpWorker.js` | Worker rig (parts API, carryAnchor) — **already textured** |
| `src/characters/fishPerson.js` / `giantShrimp.js` | Gerald / Shrimply Gigantic |
| `src/map/buildings.js`, `terrain.js`, `props.js`, `landscaping.js`, `campusDetail.js`, `interior.js`, `vehicles.js` | Campus geometry |
| `src/world/sky.js` | Baked scattering sky, day/night, clouds, PMREM IBL |
| `src/world/postfx.js` | EffectComposer: bloom + ACES output (has software-renderer fallback) |
| `src/world/streetlights.js` | Night fixtures |
| `src/main.js` | Renderer, lighting rig, shadow config (currently 1024 map) |
| `src/mechanics/collectibles.js` | Collectible system (Track B heritage tour hooks in here) |
