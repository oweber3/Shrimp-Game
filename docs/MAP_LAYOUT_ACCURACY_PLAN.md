# Map Layout Accuracy Plan

Goal: rework the Shrimp Game campus so its street grid and building placement
match the real Laitram campus map (the site plan reference image), phase by
phase, without breaking missions, collision, the LM interior, or the minimap.

## Where the game diverges from the real map

Comparing the in-game campus map (`src/minimap.js`, built from
`src/map/terrain.js` + `src/map/buildings.js`) against the real site plan:

| Feature | In game today | Real campus map |
| --- | --- | --- |
| Plantation Road | North–south road through the middle of campus | East–west road along the **north** edge |
| River Road | East–west along the south edge | North–south along the **west** edge |
| Storey Street | East–west through the south block | **North–south** spine through the middle of campus |
| Laitram Street | Does not exist | East–west along the **south** edge |
| Toler Street | Major east–west road across the north | Minor address street (5200A/5200B Toler) east of the Machine Shop; not a big cross-campus road |
| Laitram Lane | North–south along the east edge | Addresses cluster in the center/east (220, 220R, 200, 116 Laitram Ln); the east-edge N–S street serves the 301 Plantation Rd row |
| Intralox / 301 Plantation | One giant building on the **west** side | The 301FO/301A/301B/301C row runs down the **east** edge along Plantation Rd |
| Laitram Machinery (220 Laitram Ln) | Center, just north of Storey St | Center-**east**, south of the Machine Shop, west of the 301 row |
| Machine Shop (5211 Storey / 220R Laitram Ln) | 5211 Storey placed in the far south block | Large building in the **center-north**, immediately east of Storey St |
| 5115–5140 Storey cluster (Wet Test, Corporate Facilities, 5118/5120/5129/5135/5140) | Missing (only fictional 5040/5210 Storey stand-ins) | Small-building cluster straddling Storey St mid-campus |
| 221 Plantation Rd (Tuna Building) | Missing | Top-center, on Plantation Rd |
| 200 Laitram Ln (Human Resources) | Placed at the far southwest corner as "200 Plantation" | Bottom-center, just north of Laitram Street |
| 116 Laitram Ln | Small block on the east side | Southwest quadrant |
| 5307/5306 Toler, Lapeyre Stair north strip | Whole district north of Toler St | Not on this map sheet (off-sheet or fictional placement) |
| Mississippi River levee | Along the south edge | River Road is the west edge, so the levee belongs on the **west** |

Orientation convention stays the same: north = −Z (top of minimap), east = +X.

## Phase 0 — Canonical layout table (no code changes)

**Status: done.** Deliverable:
[reference/laitram-maps/layout.md](reference/laitram-maps/layout.md) —
normalization anchors, street table, per-building coordinate table, and
keep/cut decisions for every off-sheet building. Later phases implement
that table verbatim. Notable Phase 0 decisions: Toler Street and the
"east-edge street fronting the 301 row" are the same street on the sheet
(N–S at x ≈ +100); the Laitram Machinery shell keeps its 76 × 60 game
footprint (translation (+16, +65), Laitram Lane moves to its south face);
the mission-critical Distribution Warehouse relocates into the sheet's
unlabeled NW building.

Derive one authoritative coordinate table from the reference image and record
it in `docs/reference/laitram-maps/` next to the source images.

- Normalize the real site plan to the game world bounds
  (`WORLD_BOUNDS = x −180..180, z −140..145`): west edge x≈−170 (River Road),
  north edge z≈−130 (Plantation Road), south edge z≈130 (Laitram Street),
  Storey Street spine at x≈−30 running north–south.
- For every named building on the sheet, record: real label, target center
  (x, z), footprint (sx, sz), and which street it fronts.
- Decide the fate of buildings the game has but the sheet doesn't (5307/5306
  Toler, Lapeyre Stair, guard shack, distribution warehouse): keep them in
  plausible off-sheet positions (north of Plantation Rd) or cut them. Record
  the decision per building.
- Deliverable: a table in this doc (or `docs/reference/laitram-maps/layout.md`)
  that every later phase implements verbatim.

## Phase 1 — Single source of truth for layout data

**Status: done.** `src/map/layoutData.js` now owns the live world bounds,
road/paved-area rectangles, building centers and footprints, building labels
and addresses, minimap zones, and street labels. The minimap, terrain road
slabs, primary building shells, the 301 row, and campus-detail shells consume
that shared data. Phase 1 retains the pre-rework coordinates so the street and
building moves remain isolated to Phases 2 and 3.

Today the layout exists twice: 3D world (`terrain.js`/`buildings.js`) and
minimap (`ROADS`/`BUILDINGS`/`ZONES`/`STREETS` arrays in `minimap.js`). They
drift independently.

- Create `src/map/layoutData.js` exporting `ROADS`, `BUILDINGS` (center,
  footprint, label, address), and `STREET_LABELS`, using the Phase 0 table.
- Refactor `minimap.js` to import from it instead of its local arrays.
- Refactor `terrain.js` road slabs and the building anchor constants in
  `buildings.js` (`plant`, `lm`, `hqB`, `wh`, the `n301` row, etc.) to read
  positions/footprints from the same module. Detail geometry (docks, trim,
  signs) stays in `buildings.js` but offsets from the shared anchors.
- Verify: game renders identically to today (this phase moves data, not
  positions).

## Phase 2 — Street grid rework

**Status: done.** `layoutData.js` `ROADS` now carries the Phase 0 street table
verbatim (Plantation Rd north, River Rd west, Laitram St south, Storey St
spine at x = −30, Toler St at x = +100, Laitram Ln at z = +100, plus a
main-gate stub from Laitram St to the fence gap on the Storey axis). The
levee berm/apron moved to the west edge in `terrain.js` and the minimap band
+ label moved with it; center lines, tire wear, sidewalks, the south fence
gate gap, `STREET_LABELS`, and the streetlight runs all follow the new grid.
Service aprons, building shells, POIs, and 3D street signage are untouched —
several old shells (Lapeyre Stair, 5211 Storey, 200 Plantation, 5040 Storey,
5306 Toler) temporarily overlap the new roads until Phase 3 moves or cuts
them, and Phase 4/5 re-anchor signage and gameplay content.

Re-lay the roads in `layoutData.js` / `terrain.js` to the real grid:

- Plantation Road: east–west along the north edge, full width.
- River Road: north–south along the west edge; move the levee berm and
  "Mississippi River levee" treatment from the south edge to the west edge
  (`addLevee` in `terrain.js`, plus the levee band in `minimap.js`).
- Laitram Street: new east–west road along the south edge.
- Storey Street: rotate to north–south, running from Plantation Rd down to
  Laitram Street at x≈−30.
- Toler Street: shrink to a short local street east of the Machine Shop.
- Laitram Lane: short internal lane serving 220/220R/200 Laitram Ln.
- East-edge north–south street fronting the 301 row.
- Update dependent road furniture in the same pass: center-line loops, tire
  wear (`createDecalBatch` calls), sidewalks, perimeter fence + gate gap, and
  `src/world/streetlights.js` runs.
- Verify: drive the golf cart along each road; no floating lines/decals, fence
  gate still aligns with the entrance road.

## Phase 3 — Building repositioning

**Status: done.** `layoutData.js` now matches the Phase 0 building table:
the 301FO/A/B/C row occupies the east edge, 5211 Storey is the center-north
Machine Shop, the seven-building Storey cluster plus Tuna/5200A/5200B shells
are present, Human Resources and 116 Laitram Ln moved south, and Distribution
plus the guard shack occupy their agreed keeper locations. All nine cut shells
and their colliders are gone. Laitram Machinery's detailed 60 × 50 production
shell, office annex, interior, perimeter/furniture colliders, indoor zones,
minimap floor plan, interior NPCs, and mission anchors share the canonical
`(+16, +65)` translation; its authoritative campus-map envelope remains
76 × 60. Building-attached docks, rooftop gear, service pavement, sidewalks,
and weathering moved with their shells. Final signage and the broad outdoor
NPC/prop/collectible sweep remain isolated to Phases 4 and 5.

Move buildings to the Phase 0 targets, in dependency order:

1. **Laitram Machinery (220 Laitram Ln)** — move the shell to center-east.
   This is the risky one: the walkable interior (`src/map/interior.js`), its
   perimeter colliders, the office-front doorway, the `INDOOR_REGION` minimap
   rect, and interior mission anchors all assume the current footprint. Apply
   a single (dx, dz) translation to the whole cluster and keep interior
   coordinates relative to it.
2. **301 row** — move 301FO/301A/301B/301C from the north strip to the east
   edge, stacked north→south along Plantation-side street.
3. **Machine Shop** — repurpose/rename the 5211 Storey building, resize to
   the large footprint, place center-north east of Storey St; add the
   "5211 Storey / 220R Laitram Ln — Machine Shop" dual address.
4. **Storey Street cluster** — add 5140, 5135, 5129, 5123 (Corporate
   Facilities), 5120, 5118, 5115 (Wet Test) as simple shells straddling
   Storey St; retire the fictional 5040/5210 Storey stand-ins.
5. **221 Plantation Rd (Tuna Building)** and **5200A/5200B Toler St** — new
   shells top-center / center-east.
6. **200 Laitram Ln (Human Resources)** — move from the SW corner to
   bottom-center; rename from "200 Plantation".
7. **116 Laitram Ln** — move to the southwest quadrant.
8. **Off-sheet keepers** (per Phase 0 decision): Intralox plant, distribution
   warehouse, 5307/5306 Toler, Lapeyre Stair, guard shack — reposition to the
   agreed spots or remove.
- Each move includes its colliders, docks, rooftop gear, and weathering decal
  walls (`addWeathering`).
- Verify per building: walk the perimeter, confirm collision, no z-fighting.

## Phase 4 — Signage, labels, and minimap text

**Status: done.**

- Update `addSigns` in `buildings.js`: wall signs, monument signs, door
  numbers, and street signs to the new names/positions (e.g. "5211 STOREY —
  MACHINE SHOP", "5115 STOREY — WET TEST", "5123 STOREY — CORPORATE
  FACILITIES", "200 LAITRAM LN — HUMAN RESOURCES", "221 PLANTATION — TUNA
  BUILDING").
- Update minimap `ZONES` and `STREETS` labels (now sourced from
  `layoutData.js`), including rotation for the now-vertical Storey St and
  horizontal Plantation Rd labels, and move the levee band + label to the
  west edge.
- Reposition the five image billboards (`addImageSign` calls) onto the new
  street frontages.

## Phase 5 — Dependent gameplay systems

**Status: done.** Mission POIs and NPCs, all dialogue/patrol anchors, Golden
Shrimp, props, vehicles, landscaping, campus details, streetlights, and ramps
were swept against the canonical building/road rectangles. Dev-time overlap
guards cover movable dressing. The Phase 6 end-to-end run completes all three
missions and confirms the relocated mission items and characters are
reachable.

Sweep everything that hardcodes world positions against the new layout:

- `POI` in `terrain.js` (spawn, wrench, partsBox, coffeePot) and
  `src/missions.js` targets.
- NPC spawn/patrol points (`src/dialogue/dialogueData.js`), collectibles
  (`src/mechanics/collectibles.js`), props/vehicles/landscaping
  (`src/map/props.js`, `vehicles.js`, `landscaping.js`, `campusDetail.js`),
  and cart ramps (`ramps.js`) — nothing may end up inside a moved building
  or floating over a removed road.
- Verify: full mission playthrough start-to-finish; all collectibles
  reachable; NPCs not clipping.

## Phase 6 — Verification and docs

**Status: done.** The expanded campus map was checked side-by-side with
`reference/laitram-maps/01-campus-overview.png`; street directions, relative
building placement, names, and addresses match the canonical table. Dense
Storey-cluster minimap callouts were compacted after the visual check. The
same pass moved the break pavilion out of the Toler/Laitram intersection and
re-anchored five stale Golden Shrimp positions. The automated playtest now
validates the canonical street/building tables, all missions, LM entry/exit
and zone transitions, indoor/outdoor minimaps, live
collision cleanup, all six named-road cart traversals, four fence runs plus
the Storey-axis gate, collectibles, and browser console health. `npm run
build && node scripts/verify.mjs` passes.

- Side-by-side check: expanded in-game map vs. the reference site plan —
  every street direction and named building matches.
- Playtest checklist: spawn, all missions, interior enter/exit, minimap
  indoor/outdoor toggle, golf cart circuit of every road, fence perimeter.
- Update `docs/LAITRAM_ACCURACY.md` (§ map layout) and the orientation
  comment block at the top of `terrain.js`; note remaining intentional
  deviations (off-sheet buildings kept for gameplay).
