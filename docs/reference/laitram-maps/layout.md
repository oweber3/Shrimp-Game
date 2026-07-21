# Canonical campus layout table (Phase 0)

Authoritative coordinate table for the map layout rework, derived from
`01-campus-overview.png`. Later phases of
[../../MAP_LAYOUT_ACCURACY_PLAN.md](../../MAP_LAYOUT_ACCURACY_PLAN.md)
implement this table verbatim — if a phase needs a different value, change
it here first.

Orientation: north = −Z (top of minimap), east = +X. Game world bounds:
`WORLD_BOUNDS = { minX: -180, maxX: 180, minZ: -140, maxZ: 145 }`.

## Normalization: sheet pixels → world units

Anchor points fixed by the plan, measured on `01-campus-overview.png`
(≈1157 × 932 px):

| Anchor | Sheet px | World |
| --- | --- | --- |
| River Road centerline (west edge) | x ≈ 25 | x = −170 |
| Storey Street centerline | x ≈ 388 | x = −30 |
| East sheet edge (past the 301 row) | x ≈ 1157 | x ≈ +178 |
| Plantation Road centerline (north edge) | y ≈ 45 | z = −130 |
| Laitram Street centerline (south edge) | y ≈ 870 | z = +130 |

Because the plan pins Storey Street at x = −30, the x-scale is piecewise:

- West of Storey St: `x = −170 + (px − 25) × 0.386`
- East of Storey St: `x = −30 + (px − 388) × 0.271`
- Everywhere: `z = −130 + (py − 45) × 0.315`

The east half is ~30 % more compressed than the west half. This is a
deliberate distortion so Storey St lands at the plan's x ≈ −30; relative
adjacency (gaps, frontages) is preserved, absolute proportions east of
Storey are not.

## Streets

Rectangles are `centerline axis, extent, width` in world units.

| Street | Orientation | Centerline | Extent | Width | Notes |
| --- | --- | --- | --- | --- | --- |
| Plantation Road | E–W | z = −130 | x −176 … +180 | 10 | North edge, full width |
| River Road | N–S | x = −170 | z −136 … +136 | 9 | West edge; levee berm + "Mississippi River" treatment moves to the west side of this road (band x −180 … −175) |
| Laitram Street | E–W | z = +130 | x −176 … +180 | 10 | South edge, full width; main gate near Storey St |
| Storey Street | N–S | x = −30 | z −125 … +125 | 10 | Central spine, Plantation Rd down to Laitram St |
| Toler Street | N–S | x = +100 | z −125 … +125 | 9 | Between the campus block and the 301 row. On the sheet this **is** the east N–S street: 5200A/5200B front its west side, the 301 row fronts its east side. The plan's "short local street east of the Machine Shop" and "east-edge street fronting the 301 row" bullets are one street |
| Laitram Lane | E–W | z = +100 | x +10 … +100 | 7 | Short internal lane south of Laitram Machinery, connecting to Toler St; serves the 220 / 220R / 200 addresses |

Streets removed relative to today's game (Phase 2 implements): the E–W
Toler St across the north, the N–S mid-campus Plantation Rd + its north
extension, the east-edge N–S Laitram Ln at x = 158, and Plantation Drive
at x = −160 (River Road takes over the west edge).

## Buildings on the sheet

`Center (x, z)` and `Footprint (sx × sz)` in world units.

| Building (sheet label) | Center (x, z) | Footprint | Fronts | Notes |
| --- | --- | --- | --- | --- |
| 221 Plantation Rd — Tuna Building | (66, −104) | 50 × 28 | Plantation Rd | Top-center; new shell |
| 5200B Toler St | (71, −75) | 45 × 25 | Toler St | New shell; nearly abuts Tuna Building to the north |
| 5200A Toler St | (80, −39) | 18 × 22 | Toler St | New shell |
| 5211 Storey St / 220R Laitram Ln — Machine Shop | (12, −32) | 65 × 50 | Storey St (west face) | Center-north; repurposes/renames today's "5211 Storey"; dual address |
| 5140 Storey St | (−85, −2) | 70 × 14 | Storey St (east face) | West of Storey; long thin building |
| 5135 Storey St | (−5, 13) | 32 × 12 | Storey St | East of Storey |
| 5129 Storey St | (−5, 28) | 30 × 12 | Storey St | East of Storey |
| 5123 Storey St — Corporate Facilities | (−2, 47) | 30 × 14 | Storey St | East of Storey |
| 5120 Storey St | (−76, 50) | 54 × 16 | Storey St | West of Storey; part of the SW complex |
| 5118 Storey St | (−77, 64) | 50 × 13 | Storey St | West of Storey; adjoins 5120 and the 116 complex |
| 5115 Storey St — Wet Test | (−5, 75) | 35 × 32 | Storey St | East of Storey |
| 220 Laitram Ln — Laitram Machinery | (56, 50) | 76 × 60 | Laitram Ln / Storey-side drive | **Game-adapted footprint** — see note below |
| 200 Laitram Ln — Human Resources | (−5, 110) | 34 × 28 | Laitram Ln / Laitram St | Bottom-center; today's "200 Plantation" moves + renames to this |
| 116 Laitram Ln | (−120, 97) | 90 × 46 | Laitram St / River Rd | SW quadrant; large multi-part complex, model as one shell |
| 301FO Plantation Rd | (136, −80) | 50 × 40 | Toler St (east side) | 301 row, north to south … |
| 301A Plantation Rd | (136, −9) | 50 × 100 | Toler St (east side) | … largest of the row (Assembly) … |
| 301B Plantation Rd | (136, 59) | 50 × 34 | Toler St (east side) | … |
| 301C Plantation Rd | (136, 100) | 50 × 48 | Toler St (east side) | … south end, edge stops ≈6 short of Laitram St |
| *(unlabeled NW building)* | (−76, −94) | 50 × 48 | Plantation Rd / Storey St | Large unlabeled footprint on the sheet; assigned to the Distribution Warehouse (see keepers below) |

The 301 row (x 111 … 161) is contiguous top-to-bottom and replaces both
today's north-strip 301FO/A/B/C shells **and** the giant west-side
"Intralox / 301 Plantation" complex.

### Laitram Machinery footprint note

The sheet footprint for 220 Laitram Ln is ≈55 × 88 (taller N–S than wide).
The detailed game structure is a 60 × 50 production shell plus its office
annex, interior, dock, and service equipment. Those pieces cannot be resized
independently because the walkable interior (`src/map/interior.js`), colliders,
doorway, and `INDOOR_REGION` all assume their current relationship, so Phase 3
moves the cluster by one (dx, dz) translation. The authoritative campus-map
envelope remains **76 × 60, centered at (56, 50)** → extents x 18 … 94,
z 20 … 80. The translated physical production shell remains 60 × 50 at the
same center, with its dock fitting immediately west of Toler St; Laitram Lane
runs along the **south** side. Recorded as an intentional deviation for Phase
6 docs.

Translation from today's shell (center (40, −15) per the minimap) is
**(dx, dz) = (+16, +65)**.

## Buildings in the game but not on the sheet

Per-building fate, as required by Phase 0. "Cut" = remove in Phase 3;
dependent gameplay content is re-anchored in Phase 5.

| Current building | Decision | Rationale / new position |
| --- | --- | --- |
| Distribution Warehouse (5000 River Rd), (−100, 95) | **Keep — relocate** | Mission-critical (M1 wrench at WEST DOCK, M2 delivery to Dot). Moves into the unlabeled NW sheet building at (−76, −94), 50 × 48. Still "west side of campus", so existing dialogue stays true. West dock faces River Rd |
| Guard shack, (8, 112) | **Keep — relocate** | Gameplay landmark + collectible. Moves to the Laitram St main gate: (−20, 120), 5 × 5, just east of Storey St |
| Intralox / 301 Plantation west complex, (−100, −27) | **Cut** | Identity and addresses continue in the east-edge 301 row; keeping both duplicates 301 Plantation Rd |
| 5307 Toler, (−95, −105) | **Cut** | Fictional north-district placement; no room off-sheet (only 10 world units north of Plantation Rd) |
| 5306 Toler / ILOX IMF, (−30, −92) | **Cut** | Same as 5307 |
| Lapeyre Stair / 5117 Toler, (105, −100) | **Cut** | Not on this sheet; collectible at (105, −66) re-anchors in Phase 5 |
| 201 Laitram Ln, (130, −20) | **Cut** | Fictional; site now inside the 301A footprint |
| 211 Laitram Ln, (140, 46) | **Cut** | Fictional; site now inside the 301B footprint |
| 5040 Storey, (96, 80) | **Cut** | Fictional stand-in, replaced by the real 5115–5140 Storey cluster (plan Phase 3.4) |
| 5210 Storey, (76, 48) | **Cut** | Same as 5040 |
| 5123 River Rd, (120, 95) | **Cut** | Address collides with the real 5123 Storey St (Corporate Facilities) |
| 200 Plantation, (−171, 40) | **Rename + move** | Becomes 200 Laitram Ln — Human Resources at (−5, 110) (row above) |

The retained guard-shack envelope clips the southwest corner of the Human
Resources rectangle by 4.5 × 5 units. Phase 3 preserves both canonical map
rectangles but notches the physical HR shell around the shack, keeping the
main-gate landmark visible and walkable without changing either map anchor.

## Sanity checks

- No building rectangle unexpectedly overlaps a street rectangle. The HR
  northeast corner clips the final 2 units of Laitram Lane's recorded west
  endpoint; this is the one canonical exception. Closest otherwise: Machinery
  east envelope 1.5 from Toler St edge; 301C and HR south faces ≈1 from
  Laitram St edge; 116 west face 0.5 from River Rd edge — all near-touching on
  the sheet too.
- Adjacent buildings that touch on the sheet (5120/5118/116 complex,
  Tuna/5200B, the 301 row) are recorded as touching or near-touching;
  everything else has ≥3 units of clearance.
- All footprints fit inside `WORLD_BOUNDS` with ≥4 units margin.
