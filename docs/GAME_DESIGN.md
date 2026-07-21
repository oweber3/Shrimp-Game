# Shrimp Shift: Laitram Town — Game Design Document

## Overview

Shrimp Shift: Laitram Town is a browser-based third-person 3D game where the player controls a shrimp worker
navigating the Laitram/Intralox industrial campus in Harahan, Louisiana. The tone is playful but grounded —
shrimp doing real workplace things, in a real-ish place, with light comedy and workplace flavor.

---

## Setting

The map is loosely based on the public exterior of the Laitram LLC / Intralox campus on
Plantation Road, Harahan, Louisiana. It is **not survey-accurate**: building shapes, sizes and
placement are simplified, and only some addresses are publicly verifiable. Each landmark below is
marked **verified** (matches a published address) or **stylized** (plausible internal-style
numbering invented for the game). See `docs/LAITRAM_ACCURACY.md` for the full audit.

Key landmarks modeled in-game:

| Landmark | Description | Accuracy |
|---|---|---|
| **Intralox Plant (301 Plantation Rd complex)** | large manufacturing building on the west side, shipping dock | verified (301 Plantation Rd is the published HQ address; relabeled from "220 Plantation" in Phase 14) |
| **5307 Toler** | Intralox building in the north strip, west of Plantation Road | stylized |
| **301 complex** | 301 FO / 301A Assembly / 301B Shipping / 301C ILOX VNA, north strip row | verified (301 Plantation Rd); sub-building letters stylized |
| **Laitram Machinery (220 Laitram Ln)** | center building with receiving bay and walkable interior | verified |
| **201 Laitram Ln** | office building on the east side | stylized |
| **Lapeyre Stair (5117 Toler)** | northeast building, east end of the north strip | verified |
| **5211 Storey** | production building in the south block | stylized |
| **5123 River Rd** | small building, southeast block | stylized |
| **Distribution Warehouse (5000 River Road)** | southwest warehouse with roll-up doors | stylized |
| **200 Plantation** | small building, far southwest corner | stylized |
| **Guard shack** | campus entrance gate | stylized |
| **Break pavilion** | outdoor break area with benches and vending | stylized |
| **Drainage canal** | east side, impassable | plausible (area canals exist; unnamed) |
| **Mississippi River levee** | grass berm south of River Road, outside the fence (cosmetic) | verified (River Road runs along the river levee) |

Roads: Toler Street (north E-W), Plantation Road (N-S through campus), Laitram Lane (east N-S)
and River Road (south) are real Harahan streets (verified); Storey Street (center E-W) and
Plantation Drive (west edge) are stylized. Street-name blades and campus wayfinding arrows
(Shipping / Receiving / Visitor Parking) mark the intersections in-game.

Note: Hammond West / East Expansion / ASRS on the reference map are the separate Hammond, LA
site (20157 Intralox Drive) and are intentionally not part of this campus.

Future: The Laitram Machinery building will have a walkable interior with an office floor, cubicles, a
breakroom, and hallways.

---

## Player Character

The player controls a shrimp worker — a low-poly anthropomorphic shrimp wearing:
- Safety vest (yellow by default)
- Hard hat
- Work boots
- Toolbelt or other accessories depending on context

The character is assembled entirely from Three.js primitives (no external models). The shrimp aesthetic
should be readable and charming without being cartoonishly over-designed.

---

## NPC Roster

| Name | Role | Location | Personality |
|------|------|----------|-------------|
| Gus | Maintenance Tech | Intralox shipping dock | Gruff, practical, always has a task |
| Dot | Warehouse Lead | Distribution warehouse | Efficient, no-nonsense |
| Sal | Receiving | Laitram Machinery E dock | Busy, slightly harried |
| Bea | Front Office | Laitram office | Friendly, organized |
| Ray | Security | Guard shack | Watchful, polite |
| Lou | Break Area | Break pavilion | Relaxed, chatty |
| Cleo | Break Area | Break pavilion | Upbeat, food-focused |
| Mo | Logistics | Main drive (patrols) | Always walking somewhere |
| Pearl | Office Staff | Employee lot (patrols) | Professional, curious |
| Hank | West Dock | Warehouse west dock | Loud, helpful |
| Juno | Quality | E dock area (patrols) | Detail-oriented, methodical |
| Skip | Grounds | East side (patrols) | Outdoorsy, quiet |

Future NPCs (indoor): interns at desks, a manager in a corner office, a coworker in the breakroom.

---

## Current Missions

### Mission 1: Missing Wrench
- Talk to Gus at the Intralox shipping dock
- Find the 10mm wrench at the warehouse west dock
- Return the wrench to Gus

### Mission 2: Conveyor Part Delivery
- Talk to Sal at the Laitram Machinery receiving dock
- Pick up the blue parts box at the receiving pad
- Deliver the parts box to Dot at the warehouse

---

## Gameplay Loop (Current)

1. Player spawns near Laitram Machinery entrance
2. Explore the campus on foot (WASD + mouse)
3. Approach NPCs to trigger E-key interaction prompt
4. Talk to NPCs to advance mission objectives
5. Pick up and carry mission items
6. Deliver items to complete missions
7. End screen after both missions complete

---

## Planned Mechanics (Future Phases)

### Indoor Exploration
- Enter buildings through doorways; scene transitions to interior geometry
- Office interior: lobby, cubicles, hallways, breakroom, manager's office

### Melee (Phase 6)
- Press F to throw a punch
- Short arm-swing animation (~0.3s)
- NPCs in range flinch/stumble briefly
- 0.8s cooldown — no health/damage system initially

### Vehicle Driving (Phase 6)
- Golf cart or small utility vehicle parked near maintenance area
- Press E near cart to mount
- W/S = accelerate/brake, A/D = steer
- Simple friction-based physics (no physics engine)
- Press E again to dismount

### Missions (Future)
- Additional missions with indoor objectives
- NPC dialogue expanding on the workplace setting
- Optional flavor interactions (no fail states — keep it low-stress)

---

## Tone and Constraints

- **Keep it original.** No GTA names, logos, music, or directly lifted mechanics.
- **Workplace comedy, not violence.** Punch mechanic is slapstick, not a combat system.
- **Laitram theme.** The setting, characters, and humor should feel grounded in the actual campus vibe.
- **No copyrighted assets.** All geometry is procedural; any textures are canvas-generated or original PNGs.
- **No jump scares, gore, or offensive content.**

---

## Secret Features

### Sicko Mode sky concert

Typing `S-I-C-K-O` outside dialogue starts a hidden, non-blocking concert over
the open ground west of Storey Street. Seven rapid taps on the HUD clock is the
touch equivalent. Drake the Drake, The Travis Fish, Swae Eel, and Big
(Sea)Hawk appear from a locked cue sheet while venue lights, sky palettes,
shockwaves, and pooled fireworks react to each movement.

The concert continues through indoor transitions, dialogue, mission play, the
expanded minimap, and cart mount/dismount. Indoor blending muffles its audio;
re-entering the code restarts it cleanly. The media at
`public/concert/sickomode.mp4` is the project owner's own parody recording, not
the original commercial track, and cue data contains section names rather than
lyrics.

---

## Controls Reference

| Key | Action |
|-----|--------|
| W / ↑ | Walk forward |
| S / ↓ | Walk backward |
| A / ← | Strafe left |
| D / → | Strafe right |
| Shift | Jog |
| Mouse | Look / orbit camera |
| E | Interact / advance dialogue |
| R | Reset to spawn |
| M | Toggle minimap |
| F | Punch (Phase 6) |
| E (near vehicle) | Mount / dismount (Phase 6) |
| S-I-C-K-O | Start / restart secret concert |
| 7 rapid clock taps | Start / restart secret concert on touch devices |
