# Shrimp Game: Realism Upgrade Plan

## Context

Shrimp Shift is currently a low-poly Three.js web game built entirely from primitive geometry (boxes, cylinders, spheres, cones). Characters are procedural rigs with flat-colored PBR materials and no textures. Buildings are primitive boxes with solid-color walls.

The goal is to progressively upgrade the game toward realism — starting with character visuals, then the map/environment — while keeping the game running in the browser (Three.js + Vite, no backend). The existing animation rig structure and collision system must remain intact throughout.

---

## Phased Plan

---

## Phase 1: Realistic Characters

**Goal:** Make shrimp workers, Gerald, and Shrimply Gigantic look organic and textured rather than low-poly toy figures.

### 1A — Higher-Quality Body Geometry

**File:** `src/characters/shrimpWorker.js`

- Increase `radialSegments` on shell cylinders from default 8 → 16–20 for smoother curves
- Replace the 5-segment stacked-box torso with a single smooth tapered `CylinderGeometry` with more height segments and a slight bend via vertex shader or morph
- Increase `taperedTube()` path points from ~6 → 12–16 for a smoother tail curve
- Add proper carapace edge geometry: thin flat rings extruded at each shell segment boundary (gives segmented "crease" look)
- Make claws more detailed: two asymmetric lobes with sharper tips using `ConeGeometry` vs flat box

**File:** `src/characters/fishPerson.js`

- Give Gerald a proper torso that tapers at the waist/hips (tapered cylinders, not a uniform box)
- Add detailed collar, cuffs on jacket sleeves
- Fish tail: fan out 3–4 cone lobes with a slight concave negative space between them

### 1B — Shell & Skin Textures via Canvas

**File:** `src/utils/geometry.js` (add new texture factory functions)

Add `createShellTexture(color)` — procedurally drawn canvas texture (~256×256):
- Base shell color tinted with subtle gradient (lighter at center, darker at edges)
- Fine horizontal lines suggesting chitin segmentation
- Small specular highlight smear for wet-shell look
- Convert to `THREE.CanvasTexture`

Add `createSkinTexture(color)` — for belly/underside segments:
- Softer color, slightly translucent-looking gradient
- Very fine horizontal lines at lower opacity than shell

Apply these as `map` on the relevant shell and belly materials.

### 1C — Normal Maps for Surface Depth

**File:** `src/utils/geometry.js`

Add `createShellNormalMap()` — canvas-drawn normal map (~256×256):
- Encode per-pixel surface normals as RGB (128,128,255 = flat)
- Draw subtle horizontal ridges (sine-wave luminance → encoded normals)
- Subtle dimple cluster near segment seams

Apply as `.normalMap` + `.normalScale = new THREE.Vector2(0.6, 0.6)` on shell material.

### 1D — Improved Shell Material Properties

**File:** `src/utils/geometry.js` (material palette) and `src/characters/shrimpWorker.js`

- Shell: roughness 0.35 (shinier, wet), metalness 0.08, add `envMapIntensity: 1.2` for stronger IBL
- Add `clearcoat: 0.4, clearcoatRoughness: 0.15` using `MeshPhysicalMaterial` — simulates wet exoskeleton lacquer layer
- Antenna: thin `TubeGeometry` along a slight curve (instead of straight cylinder) with semi-matte finish
- Eyes: `MeshPhysicalMaterial` with `transmission: 0.6, ior: 1.45` for glass-like wet eye look

### 1E — Facial & Detail Upgrades

**File:** `src/characters/shrimpWorker.js`

- Eyes: replace flat spheres with proper "eyeball" — white sclera sphere + smaller iris disc + tiny pupil disc, layered
- Add subtle eyelid ridge above eye (thin half-ellipse geometry)
- Antennae: replace cylinders with `TubeGeometry` following a gentle outward-curving `CatmullRomCurve3`
- Add rostrum (pointed nose spike between antennae base) — a small `ConeGeometry` jutting forward

### 1F — Clothing Texture Detail

**File:** `src/characters/shrimpWorker.js`

- Safety vest: canvas texture with subtle fabric weave grid (~128×128, very fine crosshatch lines)
- Hi-vis stripes: actual texture band with reflective silver shimmer (emissive: 0xaaaaaa, emissiveIntensity: 0.1)
- Hard hat: switch from flat hemisphere to `MeshPhysicalMaterial` with clearcoat (helmets have glossy polycarbonate finish)
- Boots: subtle leather texture via canvas normal map (horizontal stress lines)

---

## Phase 2: Realistic Buildings & Architecture

**Goal:** Replace solid-color box buildings with textured, detailed structures that look like real industrial/office buildings.

### 2A — Building Texture System

**File:** `src/utils/geometry.js` (extend material factory)

Add a `createBuildingTextures()` factory that returns UV-mapped canvas textures:

- **`concreteTexture()`**: Medium gray base, random dark flecks, subtle weathering streaks, slight color variation tile (~512×512, repeating)
- **`brickTexture()`**: Classic staggered brick pattern, mortar lines (slightly recessed brightness), color variation per brick (~512×256)
- **`metalPanelTexture()`**: Horizontal panel lines with subtle seam shadows, brushed direction lines, rivet dots at corners (~256×512)
- **`asphaltTexture()`**: Dark base, aggregate specks, subtle crack hairlines

Apply all textures with `texture.wrapS = texture.wrapT = THREE.RepeatWrapping` and scale repeats to building dimensions.

### 2B — Normal Maps for Building Surfaces

Add corresponding normal maps for each surface type:

- **Concrete**: low-frequency bump noise (procedural sine superposition)
- **Brick**: mortar joints recessed (encoded as normals pointing inward at seams)
- **Metal panel**: panel seam edges (sharp normal breaks at lines)

Apply at `normalScale: new THREE.Vector2(0.5, 0.5)` for subtle relief without overwhelming the silhouette.

### 2C — Architectural Detail Geometry

**File:** `src/map/buildings.js`

For the **Intralox Plant** (main warehouse):
- Add parapet wall cap along roofline (thin flat BoxGeometry overhang)
- Add window frames: recessed BoxGeometry inset into wall, inner face as glass
- Add pilaster columns at corners (slight vertical wall projections)
- Loading dock: add dock leveler lip geometry, rubber bumper strip
- Clerestory: improve glass-to-wall transition with thin mullion strips

For the **Laitram Machinery** building:
- Add cornice detail at roofline (thin extruded ledge)
- Office front facade: window banding with horizontal spandrel panels between floors
- Entry: add awning geometry over front door (flat plane + support arms)
- Truck court: add wheel guide curbs on dock approach

For the **301 Complex** buildings:
- Add cross-brace X-pattern on visible gable ends (suggests steel structure)
- Downspout pipes on building corners (thin vertical cylinders)

### 2D — Window Realism

**File:** `src/map/buildings.js`

Replace single glass planes with multi-pane window assemblies:
- Outer frame: dark BoxGeometry border
- Horizontal and vertical mullion bars (thin BoxGeometry strips)
- Glass panes: `MeshPhysicalMaterial` with `transmission: 0.9, roughness: 0.05, ior: 1.5` for true glass refraction
- Interior backing: dark gray plane ~0.3 units behind glass (suggests interior depth)
- Optional: faint emissive on interior backing at night to suggest lit offices

### 2E — Ground Surface Textures

**File:** `src/map/terrain.js`

- Apply `asphaltTexture()` to parking lots and roads (repeat ~every 4 units)
- Apply `concreteTexture()` to sidewalks and dock aprons
- Add painted line texture overlay (yellow/white striping for parking spaces) — thin `PlaneGeometry` decals at z-offset +0.01 to avoid z-fighting
- Grass: canvas texture with fine blade stroke lines, slight color variation (not just flat green polygon)

### 2F — Landscaping Upgrade

**File:** `src/map/landscaping.js`

**Live Oaks (more realistic):**
- Replace single large icosahedron canopy with multi-lobe arrangement using `SphereGeometry(r, 8, 6)` at high subdivision
- Add canvas leaf texture (dark green, semi-transparent leaf silhouettes) as `alphaMap` for transparency cutout
- Apply billboard-style alpha-tested material: `alphaTest: 0.5, side: THREE.DoubleSide`
- Add secondary smaller canopy spheres for visual complexity
- Trunk: `CylinderGeometry` with canvas bark texture (vertical furrow lines, brown variation)

**Palms:**
- Fronds: replace cone geometry with `PlaneGeometry` alpha-tested with a palm frond texture (feather-like silhouette)
- Add slight droop via rotation + translate offset for hanging frond look

**Drainage Canal:**
- Add animated normal map on water surface (`clock.getElapsedTime()` drives UV offset each frame)
- Water material: `MeshPhysicalMaterial` with `transmission: 0.4, roughness: 0.1, color: 0x4a7d8c`

---

## Phase 3: Realistic Environment & Atmosphere

**Goal:** Upgrade ambient environment details — sky, clouds, lighting quality, shadows.

### 3A — Shadow Quality

**File:** `src/main.js`

- Increase sun shadow map from 1024×1024 → 2048×2048
- Tighten shadow camera frustum to reduce texel waste (±120 units instead of ±200)
- Lower shadow bias from `-0.0005` → `-0.0003` to reduce acne with better resolution

### 3B — Ambient Occlusion (SSAO)

**File:** `src/world/postfx.js`

Add `SSAOPass` from Three.js examples post-processing suite:
- Insert between RenderPass and BloomPass in the EffectComposer chain
- Settings: kernelRadius 8, minDistance 0.005, maxDistance 0.1
- Adds contact shadows and depth at junctions between walls/floors and props

### 3C — Realistic Clouds

**File:** `src/world/sky.js`

- Replace icosahedron puffs with layered disc-stack cloud sprites
- Each cloud: stack of `PlaneGeometry` billboards with canvas cloud texture (soft white → transparent edges via radial gradient alpha)
- 3–5 overlapping planes per cloud, slightly offset in Y and XZ for volumetric appearance
- Animate UV offset or rotation slightly each frame for subtle turbulence

### 3D — Improved Road Markings & Curbs

**File:** `src/map/terrain.js`

- Add curb geometry along all road edges: narrow `BoxGeometry` strips (height ~0.15 units)
- Road center lines and edge lines: thin plane decals with `roadLine` material, repeat every 6 units
- Crosswalk stripes: array of thin BoxGeometry strips at intersections

---

## Phase 4: Advanced Rendering Polish

**Goal:** Add final rendering fidelity touches that distinguish "realistic" from "high-quality low-poly."

### 4A — Reflection Probes (Local IBL)

- Bake separate environment cube for interior (when indoors, swap envMap to interior probe)
- Makes interior windows reflect the inside rather than outdoor sky

### 4B — Emissive Detail at Night

**File:** `src/world/streetlights.js`, `src/map/buildings.js`

- Office window backing planes become emissive at night (yellowish 0xffe8a0, intensity 0.4)
- Loading dock area floodlights: add `PointLight` (warm 0xffee88, distance 15, decay 2) above dock doors
- Parking lot poles: `SpotLight` pointing down (cool 0xd0e8ff, angle 0.5) for sodium vapor feel

### 4C — Texture Atlasing

**File:** `src/utils/geometry.js`

- Combine small canvas textures into a single atlas texture (4×4 grid of 128×128 tiles)
- Reference via UV offset — reduces texture bind calls per frame

---

## Implementation Order

| Phase | Files Changed | Complexity |
|-------|---------------|------------|
| 1A–1C | `shrimpWorker.js`, `geometry.js` | Medium |
| 1D–1F | `shrimpWorker.js`, `fishPerson.js`, `geometry.js` | Medium |
| 2A–2B | `geometry.js` (new texture factories) | Medium-High |
| 2C–2D | `buildings.js` | High |
| 2E–2F | `terrain.js`, `landscaping.js` | Medium |
| 3A–3B | `main.js`, `postfx.js` | Low-Medium |
| 3C–3D | `sky.js`, `terrain.js` | Medium |
| 4A–4C | `streetlights.js`, `buildings.js`, `geometry.js` | Medium |

---

## Verification Per Phase

- **Phase 1**: Run `npm run dev`, inspect characters close-up — shell should show texture/normal detail, eyes should look glassy, tail curve should be smooth
- **Phase 2**: Walk around campus — building walls should show surface texture relief, windows should appear multi-pane with glass depth, ground should show asphalt/concrete texture
- **Phase 3**: Check shadow sharpness at building bases, verify SSAO creates contact darkening at corners, verify cloud appearance at different times of day
- **Phase 4**: Check night-time building emission, verify dock area point lights, confirm interior IBL looks correct when indoors

---

## Key Files Reference

| File | Role |
|------|------|
| `src/characters/shrimpWorker.js` | Main character rig — geometry & materials |
| `src/characters/fishPerson.js` | Gerald character |
| `src/characters/giantShrimp.js` | Shrimply |
| `src/utils/geometry.js` | Material + texture factories (central) |
| `src/map/buildings.js` | Campus building geometry |
| `src/map/terrain.js` | Ground, roads, sidewalks |
| `src/map/landscaping.js` | Trees, canal, grass |
| `src/world/postfx.js` | Post-processing pipeline |
| `src/world/sky.js` | Atmosphere, clouds |
| `src/main.js` | Lighting rig, shadow config |
