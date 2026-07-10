# Laitram Machinery Interior — Real 1st-Floor Layout (Owen / Kearney / Douglas corner)

**Status: Phases A–B DONE (reference assets + interior rework); Phases
C–D remaining.** Plan to make the inside of the Laitram Machinery
building (220 Laitram Lane, `src/map/interior.js`) accurate to the real
B220L 1st-floor plan — at minimum the corner where Owen Weber, Kearney
Nieset and Douglas Katz sit — and to add the three of them as special NPCs.

Reference images and full transcriptions:
[reference/laitram-maps/README.md](./reference/laitram-maps/README.md).

**Guardrail note:** [LAITRAM_ACCURACY.md](./LAITRAM_ACCURACY.md) §3 says "no
real employee names / no real floor plans." This plan is a deliberate,
repo-owner-requested exception for three named colleagues (self-insert +
friends) and the public-ish office corner they sit in. When implementing,
add an "Exceptions" line to that guardrails section pointing here.

---

## 1. What the real floor looks like (vs. what the game has)

Real B220L 1st floor (from the reference maps):

- **North ~2/3: production floor** — Shop, Welding, Subassembly, Final
  Assembly, Insert (rooms 1040.xx), Compressor Porch 1048, storage along
  the west edge, Break/Elec 1079 and Stairwell ST1003 mid-building.
- **South strip: office block**, roughly L-shaped, Toler Street on the east:
  - West: open **cubicle field** (Greco, Smith, Boquet, Hatty, Abbott,
    Beckemeyer, Brasher, McDonough, Champagne — rooms 1024/1026/1030.xx),
    with Restroom RR1039 and Kitchen 1078A at its north edge.
  - Center: storage closets CL1007 / CL1013C and a large windowless core
    room; Copy 1093; Stairwell ST1001; Cubicle 1088.C.
  - Center-east: **Machinery Eng Conference Room 1019** with the
    **Owen/Kearney/Douglas workstation strip (1025.01–.03) against its
    west wall**, Electrical closet CL1023 at the strip's south end.
  - East/south edge: private offices — Sclafini 1012, Office 1014, Hill
    1022, Manger 1020, Ledet 1018 — plus USNO-220 Video Conference 1090
    in the SE corner.

Current game interior (`src/map/interior.js`): fictional lobby + one open
office with a 2×3 cubicle grid + manager office + breakroom. Nothing matches
the real plan. NPCs Rita/Nina/Theo/Marge/Benny sit in the fictional rooms.

## 2. Coordinate mapping

The game building interior spans roughly **x 10.6..69.4, z −19.7..19**
(north = −z; production floor sealed off behind z ≈ −19.7). Map the real
office block onto the existing south strip — same footprint, new internal
layout. Proposed mapping (west→east = real west→east, so Toler St side is
x ≈ 69, matching the real building's east frontage):

| Real space | Game placement (approx) |
|---|---|
| Kitchen 1078A + Restroom RR1039 (door only, non-enterable) | NW of office strip, x 12..22, z −19..−12 |
| Open cubicle field (1024/1026/1030 pods, 2 rows) | x 12..30, z −10..17 |
| Storage CL1007 / CL1013C + core room (closed, door props) | center, x 30..40 |
| Copy 1093 + Stairwell ST1001 (stairs = prop, roped) | x 40..46, north side |
| **Machinery Eng Conference Room 1019** | x 48..62, z −16..−2 (glass-front wall, long table, wall screen, sign "USNO-220 Machinery Eng Conference Room") |
| **Workstation strip 1025.03/.02/.01** | against the conference room's **west wall** (x ≈ 47), running north→south: Owen z ≈ −14, Kearney z ≈ −10, Douglas z ≈ −6 |
| Electrical CL1023 | small yellow-doored closet at z ≈ −3, south of Douglas |
| Private offices 1012/1014/1018/1020/1022 + Video Conf 1090 | east/south edge, x 62..69 — real drywall offices with doors and nameless "Office" signs (no other real names on signage) |

Keep the existing lobby (heritage exhibit target of Phase 15) as the entry;
its north doorway now opens into the office block above. Entry door position
and exterior shell are unchanged — this is interior-only.

### The workstation strip (the accuracy centerpiece)

Each of the three seats is an **open cubicle**: desk flush against the
conference-room wall, one **low pop-up side partition on each side** (the
`M.partition` half-height panels already used by `cubicle()`, ~1.2 m high,
~1.4 m deep), **no front panel, no back wall of its own** — the room wall is
the back. Monitor + chair + desk clutter per seat. Nameplates on the side
partitions: "Owen Weber", "Kearney Nieset", "Douglas Katz" (textTexture
signs, small).

## 3. Special NPCs

All three sit at their desks (`behavior: 'sit'`, facing the wall/monitor,
chair rotated like Rita's). Add to `NPC_DEFS` in `src/npc.js` with
`role: 'special'` flavor dialogue in `src/dialogue/dialogueData.js`.

### Owen Weber — shrimp engineer + robotic head pet
- Standard `createShrimpWorker` shrimp, engineer palette (blue vest,
  safety-glasses accessory if available), name "Owen Weber (Shrimp Eng)".
- **Pet: floating robotic head** — new builder
  `src/characters/roboHead.js`: a ~0.35 m boxy metal head (dark metal
  `mat`, cyan emissive eye visor plane, small antenna, no body), hovering
  ~1.4 m up beside his desk. Per-frame in `npcBehaviors.js` (or a tiny
  dedicated updater): sinusoidal bob + slow ~0.6 m radius drift next to the
  desk, eye visor flicker, faces the player when within 4 m.

### Kearney Nieset — shrimp engineer + beer stack
- Standard shrimp, engineer palette, name "Kearney Nieset (Shrimp Eng)".
- **Desk prop: Lazy Magnolia Southern Pecan stack** — pyramid of ~10 short
  brown cylinders (bottles or cans) on the desk corner, tan/cream label
  band, tiny textTexture label "SOUTHERN PECAN"; a fictional-brewery-safe
  sign nearby optional. Built inline in `interior.js` as a `beerStack(x,z)`
  helper.

### Douglas Katz — dog in a suit
- New builder `src/characters/dogPerson.js`, modeled on
  `fishPerson.js` (Gerald) which already does "animal in a business suit":
  reuse the suit body/arms/legs pattern, replace the head with a dog head —
  snout box, floppy ears, black nose sphere, tongue plane optional. Brown
  fur `mat`, charcoal suit, red tie. Name "Douglas Katz". Seated at
  1025.01. Dialogue acknowledges he is a dog and nobody minds (Gerald-style
  running gag; maybe Gerald and Douglas reference each other).

## 4. Implementation phases

### Phase A — Reference assets (XS)
Add the three screenshots to `docs/reference/laitram-maps/` (names in that
folder's README). Link from README.md docs index if one exists.

### Phase B — Interior rework (M)
Rebuild the office block in `interior.js` per §2: demolish the fictional
2×3 grid / manager office / breakroom; build kitchen, cubicle field,
storage core, copy/stairwell, conference room 1019, workstation strip
1025.xx, electrical closet, east office row. Keep lobby, ceilings,
light-panel and collider patterns as-is. Re-seat existing NPCs: Nina/Theo →
cubicle field, Marge → office 1022-equivalent, Benny → kitchen 1078A.

### Phase C — Special NPCs (M)
`roboHead.js`, `dogPerson.js`, `beerStack()` prop, three `NPC_DEFS`
entries + dialogue + minimap colors. Pet head registered like Shrimply
(`special: true`) or driven from Owen's NPC update.

### Phase D — Polish (S)
Room signs with real room numbers (B220L.xxxx), conference-room glass wall,
door props on closed rooms, guardrail-exception note in LAITRAM_ACCURACY.md.

## 5. Non-goals
- Production floor interior (stays sealed; Shop/Welding/etc. are signage
  on the north partition only).
- 2nd floor, stair traversal, Toler-side exterior changes.
- Any other real employee names beyond the three requested (labels from the
  map like Greco/Hatty/etc. stay OUT of the game; their cubicles are
  anonymous).
