# Shrimp Shift: Laitram Town — Game Design Document

## Overview

Shrimp Shift: Laitram Town is a browser-based third-person 3D game where the player controls a shrimp worker
navigating the Laitram/Intralox industrial campus in Harahan, Louisiana. The tone is playful but grounded —
shrimp doing real workplace things, in a real-ish place, with light comedy and workplace flavor.

---

## Setting

The map is loosely based on the actual Laitram LLC / Intralox campus on Plantation Road, Harahan, Louisiana.

Key landmarks modeled in-game (addresses follow the real campus map):
- **Intralox Plant (220 Plantation)** — large manufacturing building on the west side, shipping dock
- **5307 Toler** — Intralox building in the north strip, west of Plantation Road
- **301 complex** — 301 FO / 301A Assembly / 301B Shipping / 301C ILOX VNA, north strip row
- **Laitram Machinery (220 Laitram Ln)** — center building with receiving bay and walkable interior
- **201 Laitram Ln** — office building on the east side
- **Lapeyre Stair (5117 Toler)** — northeast building, east end of the north strip
- **5211 Storey** — production building in the south block
- **5123 River Rd** — small building, southeast block
- **Distribution Warehouse (5000 River Road)** — southwest warehouse with roll-up doors
- **200 Plantation** — small building, far southwest corner
- **Guard shack** — campus entrance gate
- **Break pavilion** — outdoor break area with benches and vending
- **Drainage canal** — east side, impassable

Roads (per the real map): Toler Street (north E-W), Plantation Road (N-S through campus),
Storey Street (center E-W), Laitram Lane (east N-S), River Road (south), Plantation Drive (west edge).

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
