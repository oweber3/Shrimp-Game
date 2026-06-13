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

---

## Guiding Constraints

- Do not rewrite the game from scratch.
- Keep everything deployable on GitHub Pages (static, no server).
- No copyrighted content (no GTA names, music, logos, or directly copied mechanics).
- No heavy asset files — keep total page load fast on a browser tab.
- Keep the game playable on desktop browsers; mobile is a stretch goal.
- All geometry stays procedural (Three.js primitives) unless a specific asset is critical and tiny.

---

## Key Files

| File | Role |
|------|------|
| `src/main.js` | Scene init, game loop, interaction |
| `src/player.js` | Third-person controls, camera |
| `src/map/terrain.js` | Ground, roads, bounds, POI, `buildWorld()` orchestrator |
| `src/map/buildings.js` | Building geometry and signage |
| `src/map/props.js` | Vehicles, trees, pallets, parking lots |
| `src/utils/geometry.js` | Shared `box()`/`flat()` builders and material palette |
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
