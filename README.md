# Shrimp Shift: Laitram Town

A low-poly 3D third-person walking game built with Three.js and Vite.
You play a new-hire shrimp worker on an industrial campus inspired by the
exterior of the Laitram/Intralox property area in Harahan/Elmwood,
Louisiana. Walk the campus, talk to twelve shrimp coworkers, and complete
two missions.

Everything is static HTML/CSS/JS. No backend, no database, no login, no
runtime API calls, no API keys, no paid assets. Node.js is only needed to
develop and build, not to play the deployed game.

## Install

```bash
npm install
```

## Run locally (dev server)

```bash
npm run dev
```

Open the printed URL (default `http://localhost:5173/Shrimp-Game/`).
Both `/Shrimp-Game/index.html` and `/Shrimp-Game/preview.html` work.

## Build

```bash
npm run build
```

Static output goes to `dist/`. Preview the production build with:

```bash
npm run preview
```

Then open `http://localhost:4173/Shrimp-Game/` (or `/Shrimp-Game/preview.html`).

## GitHub Pages

The Vite base path is set to `/Shrimp-Game/` in `vite.config.js` to match
this repository's name. If you rename the repository, update that one line.

Deployment options:

1. **GitHub Actions (recommended, already included).** The workflow in
   `.github/workflows/deploy.yml` builds the game and publishes `dist/` to
   GitHub Pages on every push to the default branch. In the repository
   settings, set **Settings > Pages > Source** to **GitHub Actions**. The
   game will be served at:
   `https://<your-username>.github.io/Shrimp-Game/`
   (and `https://<your-username>.github.io/Shrimp-Game/preview.html`).

2. **Manual.** Run `npm run build`, then push the contents of `dist/` to a
   `gh-pages` branch and point **Settings > Pages** at that branch.

## Controls

- `WASD` or arrow keys: move
- Mouse: look (click the screen to capture the mouse)
- `Shift`: jog
- `E`: interact / advance dialogue / mount-dismount the golf cart
- `F`: punch
- `Tab`: shift log
- `M`: expand the campus map
- `[` / `]`: rewind / advance the time of day (`O` pauses the day/night cycle)
- `R`: reset position to the front gate if stuck
- `Esc`: release the mouse

### Touch controls (phones & tablets)

On touch devices the game automatically shows on-screen controls (hidden on
desktop):

- **Left joystick**: drag in any direction to move; analog, so a light push
  walks slowly and a full push walks at normal speed. Maps onto the same
  movement as `WASD`.
- **JUMP button** (lower-right, large): emulates `Space`.
- **E button** (lower-right, smaller): emulates `E` (interact / advance
  dialogue / mount-dismount the cart).

The controls are built on Pointer Events and support multi-touch, so you can
move and press the action buttons at the same time. Pinch-zoom and page
scrolling are suppressed during play. Add `?mobile=1` to the URL to force the
touch controls on in a desktop browser (useful for testing).

## Features implemented

- **Director's Cut visuals**: ACES-filmic tone mapping and PBR (physically
  based) materials, a real atmospheric-scattering sky baked to a cube for
  performance, image-based lighting/reflections, soft shadows, a bloom pass,
  and a cinematic vignette
- **Day/night cycle**: the sun arcs across the sky over a ~3.5-minute day,
  retinting the light, fog, and horizon; streetlamps and lit signs glow at
  dusk, with a drifting cloud deck, stars, and a moon at night. A HUD clock
  shows the time; `[` / `]` scrub it
- Frame-rate-independent movement via a fixed-timestep simulation, so the
  game stays accurate on slow/software renderers
- Low-poly industrial campus: headquarters office, large Intralox
  manufacturing plant, distribution warehouse with a west dock, machinery
  building, guard shack, break pavilion, roads, sidewalks, parking lots
  with cars, semi trucks at loading docks, forklift, pallets, crates,
  barrels, perimeter fence, drainage canal, live oaks and palms, and
  campus signage
- Third-person player character (shrimp worker) with walk/jog, mouse-orbit
  camera, and idle/walk animation bob
- Collision with buildings, props, fences, and map boundaries; the player
  cannot leave the property or fall through the world
- 12 shrimp-worker NPCs with hard hats, safety vests, and boots; some stand
  at posts, some patrol waypoint paths, all face you to chat
- Mission 1: Missing Wrench - talk to Gus at shipping, find the 10 mm
  wrench at the west dock, return it
- Mission 2: Conveyor Part Delivery - talk to Sal at receiving, carry the
  parts box across campus to Dot at the warehouse, with progress shown
- Completion message and free exploration after both missions
- HUD: objective tracker, compass with objective arrow and distance,
  interaction prompt, dialogue box, toast notifications, controls help
- Headless end-to-end test (`node scripts/verify.mjs` after a build)
  that boots the game and completes both missions

## Known limitations

- The campus is an approximation from public exterior knowledge, not a
  survey-accurate map; building shapes and placement are simplified
- Building interiors are intentionally not modeled
- No sound or music
- No save game; refresh restarts the shift
- Touch devices get an on-screen joystick and action buttons, but there is no
  on-screen camera-look control yet, so movement is relative to a fixed
  camera heading on phones/tablets
- NPC patrol paths do not avoid the player; NPCs are not collision solids
