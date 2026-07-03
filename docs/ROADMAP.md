# Shrimp Shift: Laitram Town — Roadmap

A low-poly 3D shrimp worker game set on the Laitram/Intralox campus in Harahan, Louisiana.
Built with Three.js + Vite, deployed to GitHub Pages.

The goal is to evolve the game incrementally toward a richer, more realistic open-world experience
without breaking browser performance or requiring a full rewrite.

---

## Phases

| # | Phase | Goal | Complexity | Status |
|---|-------|------|------------|--------|
| 1 | Stabilize & Organize | Split large files into sub-modules, fix known perf issue (3 MB PNG) | S | Done |
| 2 | Outdoor Map Realism | More accurate campus layout, better landscaping, improved building detail | M | Done |
| 3 | Shrimp Model Improvements | More organic characters, Group-based hierarchy for future animation | M | Done |
| 4 | Indoor Building Interior | Walkable interior with offices, cubicles, breakroom, zone transitions | L | Done |
| 5 | NPC & Workplace Interactions | More NPCs, sitting behaviors, intern dialogue | M | Done |
| 6 | GTA-Like Mechanics | Basic melee punch + driveable golf cart | M | Done |
| 7 | Polish & Deploy | Loading screen, audio, mission log, minimap indoor floors, performance audit | M | Done |
| 8 | Campus Accuracy | Match the real campus map: road names, north strip (5307 Toler + 301 row), south block (5211 Storey), real addresses | S | Done |
| 9 | Surface Materials Everywhere | Procedural PBR texture set (albedo+normal+roughness) for all buildings and ground; grime/weathering; per-surface tiling textures (atlases dropped — see IMPLEMENTATION_PHASES) | M | Done |
| 10 | Architectural Detail & Glass | Parapets, mullioned window assemblies, dock hardware, downspouts; instanced/merged geometry; night-lit interiors | M–L | Planned |
| 11 | Lighting, Shadows & Post | Shadow rig fix (1024→2048, tight follow frustum), SSAO, upgraded night lighting, quality auto-toggle | M | Planned |
| 12 | Water, Vegetation & Weather | Real canal water, alpha-cutout foliage, rain/haze/overcast weather states, billboard cloud deck | M–L | Planned |
| 13 | Character Animation & Faces | Planted-foot gait, secondary motion, blinks/eye tracking/talk flap (Tier 1) or original skinned .glb characters (Tier 2) | L | Planned |
| 14 | Campus Geography & Signage Accuracy | Fix flagged addresses (220 vs 301 Plantation), levee berm, street/wayfinding signs, fan-project disclaimer | S | Done |
| 15 | Company Heritage & Product Grounding | 1949 peeler / 1971 belt / 1981 stair heritage exhibit, division-true props and signage, Heritage Tour collectibles | M | Planned |
| 16 | Workplace Realism: PPE, Safety & Org | PPE zones, ANSI-style generic signage, forklift/pedestrian striping, plausible org roles, make-and-ship mission | M | Planned |

Phases 9–13 are Track A (visual realism, two tiers) — see
[../REALISM_PLAN.md](../REALISM_PLAN.md). Phases 14–16 are Track B (accuracy
to the real company) — see [LAITRAM_ACCURACY.md](./LAITRAM_ACCURACY.md).
Recommended build order across tracks: **14 → 9 → 11 → 10 → 15 → 12 → 16 → 13**
(rationale + open questions at the end of REALISM_PLAN.md).

---

## Guiding Constraints

Constraints marked **[Tier 2: renegotiable]** are the ones the Track A Tier 2
option would relax — each individually, only with explicit approval (see
REALISM_PLAN.md "two tiers" table). Everything else stays locked.

- Do not rewrite the game from scratch.
- Keep everything deployable on GitHub Pages (static, no server). *(Stays
  locked even in Tier 2 — no proposed phase needs a server.)*
- No copyrighted content (no GTA names, music, logos, or directly copied
  mechanics). *(Stays locked in both tiers; Tier 2 assets must be original
  or CC0.)*
- No heavy asset files — keep total page load fast on a browser tab.
  **[Tier 2: renegotiable — R2 allows small compressed photo textures
  (+2–6 MB) and R3 raises the JS bundle cap from 500 KB to ~700 KB gz.]**
- Keep the game playable on desktop browsers; mobile is a stretch goal.
- All geometry stays procedural (Three.js primitives) unless a specific
  asset is critical and tiny. **[Tier 2: renegotiable — R1 allows small
  original .glb models (≤ 300 KB each, ≤ 2 MB total) for skinned characters
  and hero props.]**
- No physics engine. **[Tier 2 lists this as R4 but recommends keeping it
  locked — worst realism-per-byte on the table.]**

---

## Key Files

| File | Role |
|------|------|
| `src/main.js` | Scene init, game loop, interaction |
| `src/player.js` | Third-person controls, camera |
| `src/map/terrain.js` | Ground, roads, bounds, POI, `buildWorld()` orchestrator |
| `src/map/buildings.js` | Building geometry and signage |
| `src/map/props.js` | Vehicles, trees, pallets, parking lots |
| `src/utils/geometry.js` | Shared `box()`/`flat()` builders, material palette, decal batching |
| `src/utils/surfaceTextures.js` | Procedural PBR maps (albedo/normal/roughness), weathering decals, quality gate |
| `src/npc.js` | Shrimp character builder, NPC manager |
| `src/missions.js` | Mission state machine, dialogue, items |
| `src/collision.js` | 2D circle-AABB collision resolver |
| `src/ui.js` | DOM-based HUD |
| `src/minimap.js` | Canvas 2D minimap |

---

## Build & Deploy

```bash
npm run dev       # local dev server (Vite)
npm run build     # production build → dist/
npm run preview   # preview production build locally
node scripts/verify.mjs  # headless E2E smoke test
```

GitHub Actions auto-deploys `dist/` to GitHub Pages on push to `main`.

---

## See Also

- [GAME_DESIGN.md](./GAME_DESIGN.md) — characters, tone, what to keep
- [TECH_PLAN.md](./TECH_PLAN.md) — engineering decisions and performance budgets
- [IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md) — detailed per-phase breakdown
- [../REALISM_PLAN.md](../REALISM_PLAN.md) — Track A visual realism (Phases 9–13, Tier 1/Tier 2)
- [LAITRAM_ACCURACY.md](./LAITRAM_ACCURACY.md) — Track B company accuracy (Phases 14–16)
