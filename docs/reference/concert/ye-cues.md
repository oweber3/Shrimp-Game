# All of the Lights Parody — Earth Stage Show Bible and Cue Sheet

**Status:** Timing locked against `public/concert/allofthelights.mp4` (media
duration `04:59.6`; teardown begins at `04:59.2`). The recording is the
user's own parody. This sheet deliberately contains section labels only and
no lyrics.

## Timing convention

- `timestamp` is elapsed media time in `mm:ss.t` after the earth-stage arming
  transition finishes.
- When events share a timestamp, they fire in table order.
- `lightCue` snaps the mound beam color/angle program and may add a brief
  full-stage flash. `skyShift`, `fireworks`, and `shockwave` reuse the shared
  concert systems.
- Boundaries were locked to the checked-in recording's large arrangement and
  energy transitions. The 142 BPM beat clock remains continuous across them.
- `showEnd` starts a four-second sink-and-restore teardown; it does not remove
  or rewrite the normal terrain.

## Authoritative cue table

| Cue ID | Timestamp | Event type | Target / implementation note | Timing status |
| --- | --- | --- | --- | --- |
| `intro-sky` | 00:00.0 | `skyShift` | Pull the sky toward near-black with a deep red horizon. | **Locked** |
| `intro-lights` | 00:00.0 | `lightCue` | Low amber columns stand nearly vertical around the mound. | Locked |
| `intro-performer-in` | 00:00.4 | `performerIn` | Ye materializes on the mound's top plateau. | Locked |
| `horn-break-1-lights` | 00:12.4 | `lightCue` | Amber beam chase with a warm-white stab flash. | **Locked** |
| `horn-break-1-fireworks` | 00:12.4 | `fireworks` | Rapid amber cluster behind the north edge of the mound. | Locked |
| `chorus-1-lights` | 00:27.4 | `lightCue` | Snap to white-gold columns and a chorus arrival strobe. | **Locked** |
| `chorus-1-fireworks` | 00:27.4 | `fireworks` | Large white-gold fans from both sides of the mound. | Locked |
| `chorus-1-shockwave` | 00:27.5 | `shockwave` | First-drop ground ring centered on the earth stage. | Locked |
| `verse-1-lights` | 01:00.3 | `lightCue` | Settle into restrained deep-red and amber cross-light. | **Locked** |
| `horn-break-2-lights` | 01:25.8 | `lightCue` | Tight amber chase and brief stab flash. | Locked |
| `horn-break-2-fireworks` | 01:25.8 | `fireworks` | Rapid amber cluster above the rear-left launch point. | Locked |
| `chorus-2-lights` | 01:55.9 | `lightCue` | White-gold chorus arrival strobe; beams tilt inward. | **Locked** |
| `verse-2-lights` | 02:12.6 | `lightCue` | Return to deep red with a slow side-to-side beam fan. | **Locked** |
| `horn-break-3-lights` | 02:21.1 | `lightCue` | Amber stab chase across alternating columns. | Locked |
| `horn-break-3-fireworks` | 02:21.1 | `fireworks` | Rapid amber cluster above the rear-right launch point. | Locked |
| `bridge-lights` | 02:43.0 | `lightCue` | Dim to low ember columns and warm-white top light. | **Locked** |
| `bridge-climax-lights` | 03:09.7 | `lightCue` | Both-arm hold moment: multicolor columns open toward the sky. | **Locked** |
| `bridge-climax-fireworks` | 03:09.7 | `fireworks` | Show's largest multicolor volley, filling the sky behind the mound. | Locked |
| `chorus-3-lights` | 03:14.9 | `lightCue` | White-gold arrival strobe with wide crossed columns. | **Locked** |
| `horn-break-4-lights` | 03:37.5 | `lightCue` | Drop to sparse amber columns for the extended break. | **Locked** |
| `horn-break-4-fireworks` | 03:41.0 | `fireworks` | Rapid amber clusters ripple along the mound's rear arc. | Locked |
| `horn-break-5-lights` | 04:07.1 | `lightCue` | Rising warm-white chase that leads into the finale. | Locked |
| `horn-break-5-fireworks` | 04:07.1 | `fireworks` | Rapid amber and ember clusters rise from both rear launch points. | Locked |
| `chorus-final-lights` | 04:17.4 | `lightCue` | Maximum white-gold strobe; every beam points skyward. | **Locked** |
| `chorus-final-fireworks` | 04:17.4 | `fireworks` | Finale barrage from every earth-stage launch point. | Locked |
| `outro-lights` | 04:44.7 | `lightCue` | Hold warm white over Ye while the outer columns return to ember. | **Locked** |
| `outro-fireworks` | 04:44.7 | `fireworks` | Final white, gold, red, and amber fan barrage. | Locked |
| `outro-performer-out` | 04:56.8 | `performerOut` | Ye dissolves while the last visual tails remain. | Locked |
| `outro-show-end` | 04:59.2 | `showEnd` | Sink the mound, fade all overrides, and restore the normal world. | **Locked** |

## Performer sheet

| Performer | Silhouette and scale | Palette / outfit | Loopable performance poses |
| --- | --- | --- | --- |
| **Ye** | Normal human proportions at 50 world units tall, grounded on the top plateau; broad oversized-jacket silhouette and heavy boots. | Monochrome black jacket, pants, gloves, and boots; full black face covering with a narrow reflective visor so no facial likeness is modeled. | Restrained beat head-nod; slow verse sway; alternating chorus arm raises; both-arms-up hold for bridge and finale peaks. |

The pose clock is fixed at 142 BPM. Stillness is the default; motions ease
between deliberate accents rather than looping constantly.

## Earth stage placement

North is `-Z` and east is `+X`. The live map now places the 5140 Storey
building across the plan's old `x: -100, z: 0` sketch anchor, so the prop uses
the nearest clear west-side pocket at `x: -123.8, z: -43.64`. Its roughened
base stays inside a verified 34-unit-radius envelope (approximately 68 units
across) and is 34 units tall. This slight width adaptation clears the 5140 and
Distribution buildings, River Road, and fixed map dressing; the top plateau
remains wide enough for the performer and his spawn ring.

The mound begins fully below grade, rises over four seconds while the show is
`arming`, remains a non-terrain concert prop for the song, then sinks during
the four-second `teardown`. Forced stops restore it immediately. Beam columns,
warm practical lights, and haze belong to the prop and leave with it.

## Activation and coexistence contract

- Type `Y-E`, case-insensitive, outside dialogue and text-entry controls.
- `?concert=ye` arms the show after the start overlay is dismissed.
- `window.__game.concert.startYe()` and
  `window.__game.concert.start('ye')` are equivalent debug paths.
- The existing show remains available through `S-I-C-K-O`, `?concert=1`, and
  `window.__game.concert.start()`.
- Starting a different show while one is active is a no-op. Re-entering the
  active show's own secret keeps the existing clean-restart behavior.

All normal interruption rules remain unchanged: gameplay continues, dialogue
only suppresses secret input, indoor audio blending stays active, and missing
media falls back to the deterministic silent clock.
