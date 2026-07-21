# Sicko Mode Sky Concert Plan

Goal: a secret toggle that launches a Fortnite-style in-game concert set to
SICKO MODE. Colossal aquatic-animal versions of the performers materialize in
the sky one at a time as their sections arrive, the world reacts to the beat
switches, and fireworks/pyro sell the drama. The song audio is the user's own
parody recording of SICKO MODE (same structure and flow), committed to the
repo at `public/concert/sickomode.mp4`. Timeline cues are named by section,
not by words.

## What exists today that we build on

| Need | Existing precedent |
| --- | --- |
| Giant character in the world | `createShrimplyGigantic` / `updateGiant` in `src/characters/giantShrimp.js` — build-at-scale + idle animation pattern |
| Character construction kit | `src/characters/fishPerson.js` (Gerald — direct base for the Travis Scott meme fish), `dogPerson.js`, `shrimpWorker.js`, shared `face.js`/`accessories.js`/`springs.js` |
| Sky/lighting takeover | `Atmosphere` in `src/world/sky.js` owns sun, sky color, night factor; `postfx.setNight` already drives bloom at night |
| Audio plumbing | `AudioManager` (`src/audio/audioManager.js`) — unlock-gated context, master gain; concert playback hangs off the same context |
| Frame hooks & debug handles | `window.__game` and `runGameFrame` in `src/main.js`; `stepFrame` keeps the headless verifier able to test the show |
| Bloom-friendly emissives | Streetlights (`src/world/streetlights.js`) glow through the bloom pass — fireworks and stage lights use the same trick |

Orientation convention unchanged: north = −Z, east = +X. The concert stages
over the open ground west of Storey Street so performers read against the sky
from most of campus.

## The show, at a glance

SICKO MODE is a three-movement song (~5:13) with two hard beat switches
(≈0:48 and ≈3:08 — exact times get locked against the user's file in Phase 0).
Each movement gets its own headliner, plus a cameo for the sampled outro:

| Section | Real performer | In-game performer |
| --- | --- | --- |
| Movement 1 (intro) | Drake | **Drake the Drake** — a colossal mallard duck (a drake, literally) in an OVO-gold chain |
| Movement 2 (beat switch 1) | Travis Scott | **The Travis Fish** — the meme fish, built off the `fishPerson.js` Gerald rig at giant scale, braids and grill included |
| Movement 2 (bridge) | Swae Lee | **Swae Eel** — a shimmering moray eel with auto-tuned bioluminescent stripes |
| Movement 3 (beat switch 2) | Drake again | Drake the Drake returns, now backlit in red |
| Outro sample | Big Hawk | **Big (Sea)Hawk** — an osprey silhouette that flickers in over the levee for the chopped-and-screwed outro |

Each performer pops into existence huge in the sky at their cue, performs
(bobbing, arm/fin raises, head nods synced to an approximate BPM), and
dissolves out when their section ends — Fortnite Astronomical style.

## Phase 0 — Show bible and cue sheet (no code changes)

Lock every creative and timing decision into data before writing systems.

- Create `docs/reference/concert/cues.md`: the authoritative cue table.
  Columns: cue id, timestamp (mm:ss.t), event type (`performerIn`,
  `performerOut`, `beatSwitch`, `fireworks`, `skyShift`, `shockwave`,
  `showEnd`). Timestamps are provisional until the user uploads the media
  file; the table notes which ones need re-timing against it.
- Performer sheets: for each of the four performers, sketch silhouette, scale
  (target ~40–60 units tall — Shrimply Gigantic is the yardstick), palette,
  signature accessory, and 2–3 loopable performance poses.
- Stage placement: pick the sky anchor point (proposed: above the open ground
  west of Storey St, ~x −100, z 0, hovering y 60–90) and the "audience
  natural viewpoint" so the show reads from spawn, from the LM lot, and from
  a moving cart.
- Secret toggle spec: decide the input (proposed: typing the letter sequence
  `S-I-C-K-O` anywhere outside dialogue), plus a `?concert=1` URL param for
  testing, and a `window.__game.concert.start()` debug handle.
- Decide interruption rules: what happens if the player enters the LM
  interior mid-show (proposed: show continues, audio ducks via the existing
  indoor blend), and whether missions/dialogue pause (proposed: no — the
  world keeps running, concert is pure spectacle).
- Deliverable: `cues.md` + a short performer-roster section; every later
  phase implements it verbatim.

## Phase 1 — Concert core: trigger, state machine, clock

Build the skeleton with a placeholder beat so everything after is data-driven.

- New `src/concert/concertDirector.js` exporting a `Concert` class:
  states `idle → arming → running(t) → finale → teardown`, driven by a
  song-clock `t` (seconds into the track).
- Cue engine: import a `CUES` array (new `src/concert/cueData.js`, generated
  from the Phase 0 table — section names only, no lyrics) and fire each cue
  callback exactly once as `t` crosses its timestamp. Must tolerate variable
  frame rates and the headless `stepFrame` path.
- Secret toggle: keystroke-sequence listener in `main.js` next to the
  existing `keydown` handler (ignored while dialogue is open or typing in
  future inputs); `?concert=1` autostart after the start overlay; register
  `concert` on `window.__game`.
- Wire `concert.update(dt, playerPos)` into `runGameFrame` after
  `atmosphere.update` so the show can override sky state.
- Placeholder clock source: with no media file present, the song-clock just
  advances in real time and a debug HUD line shows `t` + last fired cue.
- Verify: toggle on, watch cue log fire in order; toggle is inert during
  dialogue; second activation while running restarts cleanly.

## Phase 2 — Audio playback pipeline (user media, not repo media)

- Loader: `Concert` looks for the media file at its conventional path
  (`public/concert/sickomode.mp4`) and plays it through a hidden
  `<video>`/`<audio>` element routed into `AudioManager`'s context via
  `createMediaElementSource`, through its own `concertGain` under `master`.
- The media element's `currentTime` becomes the authoritative song-clock —
  cue timing can never drift from the audio, even after tab throttling.
- Autoplay policy: playback only ever starts from the secret-toggle keypress
  (a user gesture), after `audio.unlock()`.
- Duck the world: while running, lower footstep/punch/hum gains ~50%; the
  existing `setIndoorBlend` keeps working (indoors muffles the concert too:
  route `concertGain` through a lowpass whose cutoff follows the blend).
- Missing-file fallback: without the file, the show runs silent on the
  placeholder clock (so development and CI never depend on the media).
- Re-time pass: once the user drops in the real file, correct every Phase 0
  timestamp in `cueData.js` against it and mark `cues.md` as locked.
- Verify: cue log lines up with audible beat switches; pausing the tab and
  returning doesn't desync; no media file → no errors.

## Phase 3 — The performers

One module per act in `src/concert/performers/`, each following the
`giantShrimp.js` pattern: `create()` returns a group + named parts,
`update(dt, t, beatPhase)` runs the performance loop.

1. **Travis Fish** — start here; it's the anchor act. Clone the Gerald
   fish-person rig at giant scale, then push it toward the meme: wider head,
   heavy-lidded eyes, downturned mouth, braid tassels (cone chains), chain
   necklace, grill (emissive teeth strip). Performance loop: aggressive nod,
   fin-mic grip, occasional full-body "rage" crouch-and-spring.
2. **Drake the Drake** — mallard drake: iridescent green head (emissive
   sheen), curled tail feather, OVO-gold chain, one wing raised to the crowd.
   Performance loop: side-to-side sway, wing-point, slow head bob. Movement 3
   variant re-lights him with the red rim light (a spotlight, Phase 4).
3. **Swae Eel** — long segmented eel body (chained bones via the `springs.js`
   helpers if practical, else a sine-deformed segment stack) with pulsing
   bioluminescent stripes keyed to `beatPhase`; loops in a lazy figure-eight.
4. **Big (Sea)Hawk** — cheapest build: a near-black osprey silhouette with
   emissive eye dots, wings in a slow glide loop; fades in at low opacity for
   the chopped outro, over the levee to the west.
- Shared `performerRig.js`: spawn-in effect (scale-up from a point + light
  flash + shockwave ring), dissolve-out (shader-less trick: scale down while
  an additive glow sprite flares), and hover bob so nobody reads as static.
- All performer meshes go on `EXTERIOR_LAYER`, cast no shadows (they're at
  y 60+, the shadow frustum won't reach), and share cheap materials — this
  must not hurt the frame budget of low-tier devices.
- Verify: `window.__game.concert.debugSpawn('travis')` etc. for each act;
  walk and drive under each one; check silhouettes read at distance and at
  night.

## Phase 4 — Staging: sky takeover, lights, world reaction

Make the campus feel like a venue the moment the toggle fires.

- Sky takeover: `Atmosphere` gains a `concertOverride(strength, palette)`
  input — the director drives dusk-to-night in ~8 s at showstart regardless
  of game time, restores the real time-of-day on teardown. Movement palettes
  from the cue sheet (proposed: M1 deep purple, M2 blood orange/red — the
  beat-switch moment slams the sky in a single frame, M3 icy blue).
- Stage lighting: 4–6 spotlight cones (cheap additive-blended cone meshes +
  one real `SpotLight` aimed at the active performer) that sweep on idle and
  snap to the performer on cue; red rim variant for Movement 3 Drake.
- Beat pulse: director exposes `beatPhase` (from an approximate BPM per
  movement in `cueData.js`); streetlights, spotlight intensity, and
  performer emissives all breathe with it. Reuse the
  `streetlights.update(nightFactor, …)` hook — concert forces nightFactor
  toward 1 so the whole campus lighting rig participates.
- Shockwaves: at each beat switch, an expanding ground ring (the spawn-in
  ring, bigger) plus a camera kick (brief FOV punch + shake, respecting a
  cap so it never nauseates), and a bass thump from `AudioManager._burst`.
- Bloom: drive `postfx.setNight(1)` equivalent during the show so emissives
  and fireworks bloom hard; restore on teardown.
- Verify: full run on placeholder clock — sky transitions, per-movement
  palettes, spotlight handoffs between performers, clean restore of
  time-of-day, lighting, and bloom after `showEnd`.

### Phase 4 implementation note

Implemented in `src/concert/staging.js` as an independently driven venue
adapter. It owns the stage, pooled shockwaves, sweeping cone meshes, real key
spotlight, capped camera kick, sky/lighting takeover, streetlight forcing, and
bloom forcing; `stop()` and `dispose()` restore all captured external state.

## Phase 5 — Fireworks and pyro

New `src/concert/fireworks.js`, one pooled particle system (single
`THREE.Points` buffer, additive, size-attenuated) — no per-shell allocations.

- Shell types: peony burst (sphere), willow (gravity-draped trails), ring
  (matches the movement palette), strobe cluster, and a shrimp-pink finale
  shell that bursts into a crude shrimp glyph (pre-baked point offsets).
- Launch sites: four corners of the stage ground area + the levee crest;
  launches are cue-driven (`fireworks` cues carry type/count/site) with a
  continuous low-rate sparkle during choruses.
- Audio: procedural launch whistle + crackle bursts from `AudioManager`
  (new `firework()` method, same `_burst` toolkit), delayed from the visual
  by distance for a cheap speed-of-sound touch.
- Finale barrage at the last 20 s: all sites, all types, sky at max bloom —
  budgeted to the particle pool so the frame rate survives; low quality tier
  halves pool size and skips trails.
- Verify: sustained barrage on the low tier stays above target frame time;
  no allocations during steady state (check with the performance panel).

Implementation note (Phase 5): `createFireworks` now owns one fixed-size
`THREE.Points` pool, five cue-launchable shell shapes, named stage/levee
sites, and a low-tier budget that omits trails. Procedural whistle, boom, and
crackle audio lives in the optional `fireworkAudio.js` adapter.

## Phase 6 — Polish, resilience, verification

- Interruption matrix from Phase 0 implemented and tested: enter/exit LM
  interior mid-show, mount/dismount cart, start a mission dialogue, open the
  expanded minimap, toggle the secret code again (restart), refresh
  mid-show.
- Mobile: toggle needs a touch path (proposed: 7 rapid taps on the clock
  HUD); verify performance on the low tier with `?mobile=1`.
- Teardown audit: after `showEnd`, assert scene child count, light count,
  and audio node graph return to pre-show baseline (no leaked cones,
  sprites, or gains).
- Headless coverage: extend `scripts/verify.mjs` — start the concert via
  `window.__game.concert`, `stepFrame` through a compressed timeline
  (director supports a time-scale for tests), assert every cue fired once,
  all four performers spawned and despawned, world lighting restored, and
  the console stayed clean.
- Docs: short section in `docs/GAME_DESIGN.md` (secret features), note in
  `README`-adjacent docs that the track is the user's own parody recording
  committed at `public/concert/sickomode.mp4`; `cues.md` marked locked.
- `npm run build && node scripts/verify.mjs` passes.

Implementation note (Phase 6): the live game now composes the director,
performer roster, staging adapter, and pooled fireworks through
`src/concert/concertShow.js`. The public debug handle supports a silent
time-scale for compressed verification, reports spawned acts and teardown
metrics, and preserves the completed cue ledger. Seven rapid HUD-clock taps
provide the mobile trigger; automated coverage exercises interruption,
restart, refresh/autostart, low-tier mobile, cue uniqueness, performer cleanup,
lighting cleanup, and scene/audio graph baselines.

## Explicitly out of scope

- Shipping any of the original SICKO MODE recording or its lyrics — the
  committed track is the user's own parody version; cues reference sections,
  never words.
- Karaoke/lyric captions.
- Synced NPC crowd choreography (nice-to-have follow-up: NPCs face the stage
  and bob during the show — cheap add once `beatPhase` exists).
- Multiple songs / a general concert framework beyond what the cue engine
  already gives us.
