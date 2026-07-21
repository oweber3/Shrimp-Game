# Shrimp Shift — Track B: Accuracy to the Real Laitram / Intralox

**Status: PLANNING.** Research findings plus the phased content changes
(Phases 14–16) that ground the game in the real company and campus. Sibling
to [../REALISM_PLAN.md](../REALISM_PLAN.md) (Track A); per-phase breakdowns in
the standard format are in
[IMPLEMENTATION_PHASES.md](./IMPLEMENTATION_PHASES.md).

This is a **fan-inspired setting, not a documentary**. Everything below that
goes *into the game* must pass the Guardrails section.

---

## 1. Company research findings (with sources)

### 1.1 The 1949 shrimp-peeling machine and the founding

- In **1949**, sixteen-year-old **James Martial "J.M." Lapeyre** of Houma,
  Louisiana — challenged by his father, a shrimp-plant owner — designed the
  first **automatic shrimp-peeling machine**. He founded **Peelers, Inc.**
  with his father and uncle to build and lease it.
- **"Laitram" is "Martial" — J.M.'s middle name — spelled backwards.** (Not
  "Jacques 'Jac' Laitram Lapeyre" as sometimes retold; that name is
  incorrect and must not appear in game content or docs.)
- The **Model A Peeler** peels roughly **1,000 lb of shrimp per hour** —
  work that would take up to **150 experienced hand-peelers** — and the
  machine sold today is virtually identical to the 1949 original. It is an
  **ASME Historic Mechanical Engineering Landmark**.
- J.M. Lapeyre held **more than 190 patents** in his lifetime.

### 1.2 Intralox (1971) — now the dominant business

- To move shrimp to his peelers without the hygiene and maintenance problems
  of fabric/metal belting, J.M. Lapeyre invented the **modular plastic
  conveyor belt** in **1971** (patented **1975**), and **Intralox** was
  founded to sell it.
- Intralox is today **Laitram's largest division**: modular plastic belting,
  conveyor equipment and services — thousands of employees, customers in
  100+ countries, headquartered in **Harahan, Louisiana**.

### 1.3 The four divisions of Laitram, L.L.C.

| Division | Founded | Business |
|----------|---------|----------|
| **Intralox** | 1971 | Modular plastic conveyor belting, conveying equipment/services (largest division) |
| **Laitram Machinery** | 1949 lineage (Peelers, Inc.) | Shrimp peelers and seafood/food-processing equipment (steam cookers, graders, nut pasteurizers) |
| **Lapeyre Stair** | 1981 | Alternating-tread stairs (from J.M.'s talcum-powder gait experiment, originally for oil-rig safety), egress stairs, platforms — **40,000+ installed**. The game's Lapeyre Stair building (5117 Toler) is real |
| **Laitram Machine Shop (LMS)** | — | Precision contract machining |

Sources: [ASME landmark](https://www.asme.org/about-asme/engineering-history/landmarks/230-the-lapeyre-automatic-shrimp-peeling-machine),
[Laitram — History of Innovation](https://www.laitram.com/innovation/),
[Laitram Machinery — About](https://www.laitrammachinery.com/about),
[Intralox — Wikipedia](https://en.wikipedia.org/wiki/Intralox),
[Intralox 50 Years](https://www.intralox.com/media/news/intralox-celebrates-50-years-of-transforming-movement),
[Lapeyre Stair — Our Story](https://www.lapeyrestair.com/about/our-story/),
[Lapeyre Stair — A Division of Laitram](https://www.lapeyrestair.com/about/a-division-of-laitram/),
[Wild American Shrimp — history](https://americanshrimp.com/the-history-of-the-lapeyre-shrimp-peeling-machine/),
[MFG — Lapeyre Stair, 5117 Toler St](https://www.mfg.com/manufacturer/lapeyre-stair-inc-harahan-louisiana-1788682/).

### 1.4 The load-bearing nuance (already correct in the game — protect it)

The Harahan/Elmwood campus **manufactures equipment**. It is **not** a live
shrimp-processing line. Laitram *builds* the peelers, belting, conveyors and
stairs that food plants elsewhere use. The game's premise — anthropomorphic
shrimp who *work at the factory building the machines*, including the machine
that historically peeled shrimp — is the whole joke and it happens to match
reality. **Do not** add hoppers of shrimp being processed, seafood smells,
processing-line missions, etc. Ground everything in *making and shipping
equipment*: molding belt modules, assembling conveyors, machining parts,
crating, staging, loading trucks.

---

## 2. Campus geography and map-layout accuracy

**Map-layout rework status: verified.** The canonical normalization and
coordinate tables live in
[reference/laitram-maps/layout.md](./reference/laitram-maps/layout.md), derived
from the supplied campus overview. `src/map/layoutData.js` is the single live
source for the 3D campus and minimap.

| Reference-sheet feature | Implemented game layout | Result |
|---|---|---|
| Plantation Road runs east–west along the north edge | Full-width E–W road at z = −130 | ✅ Match |
| River Road runs north–south along the west edge | N–S road at x = −170; levee treatment is west of it | ✅ Match |
| Laitram Street runs east–west along the south edge | Full-width E–W road at z = +130 with the main gate on the Storey axis | ✅ Match |
| Storey Street is the central north–south spine | N–S road at x = −30 | ✅ Match |
| Toler Street separates 5200A/B from the 301 row | N–S road at x = +100 | ✅ Match |
| Laitram Lane is the short internal east–west lane | E–W road at z = +100 serving 220/220R/200 | ✅ Match |
| 301FO/A/B/C form the east-edge row | Four north-to-south shells east of Toler Street | ✅ Match |
| Machine Shop and the 5115–5140 cluster straddle Storey Street | 5211/220R plus all seven numbered shells are present | ✅ Match |
| Tuna Building, 5200A/B, 220 Machinery, 200 HR, and 116 Laitram occupy the center/south blocks | All named shells use the canonical centers and footprints | ✅ Match |

Phase 6 verification covers the expanded minimap, canonical road/building
tables, all three missions, LM interior entry/exit, indoor/outdoor minimap
switching, all collectibles' placement rules, a golf-cart traversal of every
named road, and every perimeter-fence run plus the main-gate opening.

### Intentional deviations from the reference sheet

- **Laitram Machinery** keeps a game-adapted 76 × 60 campus-map envelope and
  its established walkable 60 × 50 production shell/office cluster. The whole
  exterior, interior, colliders, NPCs, and mission content move together by
  the canonical (+16, +65) translation.
- The sheet's **unlabeled northwest building** carries the fictional
  **Distribution Warehouse / 5000 River Rd** identity because it is required
  by Missions 1 and 2.
- The small **guard shack** remains as a gameplay landmark at the Laitram
  Street main gate.
- Stunt ramps, Golden Shrimp, the break area, parked vehicles, and decorative
  campus furniture are fictional gameplay dressing rather than surveyed site
  features.
- Buildings absent from this sheet are not forced into the mapped area:
  Lapeyre Stair/5117 Toler, 5307/5306 Toler, 201/211 Laitram, the fictional
  5040/5210 Storey stand-ins, and 5123 River Road were removed. Their removal
  is not a claim that the real businesses or addresses do not exist elsewhere.

The setting remains described as Harahan/Elmwood with a Harahan mailing
address; neither the simplified footprints nor unverified internal-style
labels should be presented as survey-grade public data.

---

## 3. Guardrails (apply to ALL Track B content)

1. **No real employee names.** Historical founder story may be told with the
   founder **unnamed by default** ("a 16-year-old inventor from Houma, 1949")
   — using the real historical name is Open Question #4. NPCs keep fictional
   names (Gus, Dot, Sal…).
2. **No trademarked logos/wordmarks.** Building names stay plain-text
   lettering (current practice). No real logo shapes, colors-as-trade-dress,
   or slogan text. Signage uses generic ANSI-style safety layouts.
3. **No non-public internal details.** Nothing about real floor plans,
   security, processes, org charts, or finances beyond published history.
   In-game org structure is *plausible for the industry*, not claimed real.
4. **No factual claims about the real company's present-day operations** in
   game copy. Heritage text is phrased as in-world lore ("Our founder…")
   inside a clearly fictional shrimp world; README gets a one-line
   fan-project disclaimer.
5. **Products referenced generically:** "modular plastic belting," "Model A
   shrimp peeler," "alternating-tread stair" are fine (descriptive/historic);
   don't reproduce catalog part numbers, and never imply endorsement.

**Exception:** The Laitram Machinery interior accuracy work deliberately uses
one small, repo-owner-requested slice of a real B220L first-floor plan and the
three named colleague NPCs documented in
[MACHINERY_INTERIOR_ACCURACY.md](./MACHINERY_INTERIOR_ACCURACY.md). Treat that
document as the only approved exception to Guardrails 1 and 3; do not extend
the exception to any additional real employees, rooms, processes, or non-public
details.

---

## 4. Phased content changes

### Phase 14 — Campus Geography & Signage Accuracy (S)

Fix the flagged geography items and make the campus *legible*: resolve the
220-vs-301 Plantation label, add the Mississippi levee berm south of River
Road, real street-name signs at intersections, address numbers over building
doors, campus wayfinding (arrow signs to Shipping / Receiving / Visitor
Parking), doc updates that mark unverified addresses as stylized, and a
fan-project disclaimer in README + title screen.

### Phase 15 — Company Heritage & Product Grounding (M)

Put the real 75-year story *in the world*, premise intact:

- **Lobby heritage exhibit** (Laitram Machinery lobby already exists): a
  primitive-built **Model A peeler replica** on a plinth, a **timeline wall**
  (1949 peeler → 1971 modular belt → 1975 patent → 1981 alternating-tread
  stair), and a "name spelled backwards" plaque gag (the shrimp NPCs can't
  work out what "Laitram" is backwards).
- **Product props with the right owners:** blue modular belting samples and
  a small demo conveyor loop in the Intralox plant; crated peeler equipment
  at Laitram Machinery shipping; **alternating-tread stairs** as *functional*
  props (dock crossovers, mezzanine access) near the Lapeyre Stair building;
  machining props (lathe/mill blocks) for an LMS-flavored corner.
- **Four-divisions flavor:** NPC dialogue and building signage reflect who
  makes what (belting vs. peelers vs. stairs vs. machining).
- **Heritage Tour side mission** on the existing `collectibles.js` system:
  find the 6 heritage plaques around campus; completing it unlocks a
  commemorative gold hard hat.

### Phase 16 — Workplace Realism: PPE, Safety & Org Structure (M)

Industrial texture that makes the campus feel like a working plant:

- **PPE zones:** hard-hat/hi-vis/safety-glasses requirement signage at plant
  and dock entrances; NPCs' existing PPE finally *means* something — office
  NPCs (Bea, Rita, Marge) lose hard hats indoors, plant NPCs keep them; the
  player gets a toast if entering the plant floor without the hat (flavor
  only, no fail state).
- **ANSI-style generic safety signage** (canvas textures): DANGER/WARNING/
  CAUTION/NOTICE color-band signs, forklift-traffic and eyewash/extinguisher
  markers, an "___ days since last shell incident" board at the break
  pavilion.
- **Floor & yard logistics:** pedestrian walkway striping, forklift lane
  markings, staging-area grids at docks, dock-door numbers (visible from the
  yard), trailer chocks.
- **Plausible org structure for NPCs** (fictional, industry-generic): plant
  manager, shift supervisor, QA inspector, EHS coordinator, shipping clerk,
  machinist, maintenance tech, molding operator — mapped onto the existing
  roster (Dot → Shipping Lead, Juno → QA Inspector, new EHS NPC, etc.) with
  role-true dialogue.
- **Workflow mission:** "First Shift on the Line" — follow a work order:
  pick belt modules → assembly check with QA → crate → stage at dock door →
  sign the (fictional) bill of lading. Teaches the real make-and-ship flow
  without any live-shrimp processing.

---

## 5. What Track B explicitly avoids

- Turning the campus into a shrimp-processing plant (see §1.4)
- Real logos, wordmark typography, or brand trade dress
- Real employee/executive names (founder naming pending Open Question #4)
- Claimed-accurate interior layouts or security details
- Part numbers, pricing, or anything reading as a catalog/endorsement
- Safety-incident humor that punches at the real company (the "shell
  incident" board is shrimp-world slapstick, clearly fictional)
