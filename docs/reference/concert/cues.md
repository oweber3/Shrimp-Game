# Sicko Mode Sky Concert — Show Bible and Cue Sheet

**Status:** Timing locked in Phase 2 against
`public/concert/sickomode.mp4` (media duration `05:14.4`; audible tail ends at
`05:13.6`). Later phases must implement the event IDs, ordering, placement,
performer sheets, toggle contract, and interruption rules in this document
verbatim. No lyrics are represented here.

## Timing convention

- `timestamp` is elapsed media time in `mm:ss.t`.
- When multiple events share a timestamp, fire them in the order shown.
- `performerIn` starts a materialize transition; `performerOut` starts a
  dissolve transition.  The associated performer remains present during its
  transition so the clock never needs a separate visual-only cue.
- `beatSwitch` is an instantaneous world-reactivity marker, not a performer
  transition. `showEnd` begins teardown after the final visual tails finish.
- Timestamps are locked to the checked-in media. The two beat-switch rows use
  the detected section-transition boundaries; `showEnd` begins at the audible
  tail rather than after the file's final silence.

## Authoritative cue table

| Cue ID | Timestamp | Event type | Target / implementation note | Timing status |
| --- | --- | --- | --- | --- |
| `show-arm` | 00:00.0 | `skyShift` | Ease from normal sky into movement 1's midnight-indigo palette; do not pause gameplay. | Locked |
| `drake-in` | 00:00.8 | `performerIn` | Drake the Drake materializes at `mainSkyAnchor`. | Locked |
| `drake-intro-fireworks` | 00:21.8 | `fireworks` | Two low, gold fan bursts behind the anchor; keep the player-facing sky clear. | Locked |
| `switch-1` | 00:48.1 | `beatSwitch` | First hard switch: snap the stage lighting to acid green / electric violet. | **Locked** |
| `drake-out-1` | 00:48.1 | `performerOut` | Drake the Drake dissolves as the first switch lands. | Locked |
| `travis-in` | 00:48.1 | `performerIn` | The Travis Fish materializes at `mainSkyAnchor`. | Locked |
| `switch-1-shockwave` | 00:48.2 | `shockwave` | One outward ground/sky shockwave centered below the anchor. | Locked |
| `travis-fireworks-a` | 01:34.0 | `fireworks` | Violet-and-green aerial burst cluster, offset north of the anchor. | Locked |
| `swae-in` | 02:18.6 | `performerIn` | Swae Eel appears at `supportSkyAnchor`; Travis Fish remains as the headliner. | Locked |
| `swae-sky-shift` | 02:18.6 | `skyShift` | Blend into cyan / magenta bioluminescent sky accents. | Locked |
| `swae-out` | 02:55.8 | `performerOut` | Swae Eel dissolves; restore movement 2 palette. | Locked |
| `switch-2` | 03:07.8 | `beatSwitch` | Second hard switch: change palette to red / ember and reset the beat-reactive pulse. | **Locked** |
| `travis-out` | 03:07.8 | `performerOut` | The Travis Fish dissolves on the second switch. | Locked |
| `drake-in-2` | 03:07.8 | `performerIn` | Drake the Drake returns at `mainSkyAnchor`, red-backlit. | Locked |
| `switch-2-shockwave` | 03:07.9 | `shockwave` | Larger red shockwave centered below the anchor. | Locked |
| `drake-fireworks-final` | 04:18.2 | `fireworks` | Red, amber, and white finale fans; no sustained screen-obscuring smoke. | Locked |
| `drake-out-2` | 04:42.0 | `performerOut` | Drake the Drake dissolves into the red sky. | Locked |
| `seahawk-in` | 04:46.0 | `performerIn` | Big (Sea)Hawk flickers in above the levee at `outroSkyAnchor`. | Locked |
| `outro-sky-shift` | 04:46.0 | `skyShift` | Dim to deep indigo with sparse red residual glow. | Locked |
| `seahawk-out` | 05:09.1 | `performerOut` | Big (Sea)Hawk flickers out over the levee. | Locked |
| `show-end` | 05:13.6 | `showEnd` | Fade concert overrides and return normal atmosphere/audio gains. | **Locked** |

## Performer roster

All scales are target visible heights measured from local ground plane to the
highest silhouette point.  Exact meshes can vary, but silhouette, palette,
signature accessory, and listed loop poses are the Phase 3 contract.

| Performer | Silhouette and scale | Palette | Signature accessory | Loopable performance poses |
| --- | --- | --- | --- | --- |
| **Drake the Drake** | Colossal upright mallard, 52 units tall; broad chest, rounded green head, readable raised-wing outline. | Iridescent green head; charcoal body; warm brown breast; OVO gold; movement 3 red rim light. | Oversized OVO-gold chain and curled tail feather. | Side-to-side sway; raised-wing crowd point; slow head bob. |
| **The Travis Fish** | Giant, wide-headed humanoid fish, 58 units tall; heavy-lidded eyes and a downturned mouth must read at distance. | Teal/olive skin; near-black braids; silver grill; acid-green/violet stage rim. | Braid tassels, chain necklace, emissive grill. | Aggressive head nod; fin held like a mic; full-body crouch then spring. |
| **Swae Eel** | Long upright moray eel, 46 units tall including arched neck; slim S-curve silhouette that contrasts the headliners. | Deep blue/black base; cyan and magenta bioluminescent stripes. | Animated, emissive stripe pattern. | Floating S-curve sway; fin flourish; slow coil-and-uncoil. |
| **Big (Sea)Hawk** | Osprey-like silhouette, 44-unit wingspan, seen farther away over the levee; intentionally less solid than the other acts. | Nearly black navy; desaturated white wing flashes; faint red edge light. | Chopped/flickering hologram treatment. | Slow bank; wingbeat hold; intermittent signal-flicker. |

## Stage placement and audience read

The anchor stays over the open west-of-Storey ground, clear of the road and
building canopy.  Coordinates use the campus convention: north is `-Z`, east
is `+X`.

| Name | World anchor | Use | Audience natural viewpoint |
| --- | --- | --- | --- |
| `mainSkyAnchor` | `x: -100, y: 72, z: 0` | Drake the Drake and The Travis Fish. | Spawn: look west-northwest after turning left from the initial north-facing view; the act clears the Storey cluster. LM lot: look west across Storey Street. Cart: southbound/northbound movement on Storey gives a broad side reveal. |
| `supportSkyAnchor` | `x: -82, y: 64, z: -12` | Swae Eel, offset so it supplements rather than covers Travis. | Same audience positions; the lower, north-shifted silhouette reads beside the main act. |
| `outroSkyAnchor` | `x: -146, y: 78, z: 26` | Big (Sea)Hawk over the River Road / levee horizon. | Spawn and LM lot: look west-southwest; the distant flicker sits beyond the campus instead of clipping buildings. |

All performer roots remain sky-only: no collision, navigation, mission, or
vehicle interaction.  The stage has no physical geometry.

## Activation contract

- Secret input: a rolling `S-I-C-K-O` keystroke sequence, case-insensitive,
  accepted anywhere except while dialogue is open or a text-entry control has
  focus.  Nonmatching keys reset the sequence, except a new `S` begins a new
  attempt.
- Test URL: `?concert=1` arms an automatic start after the start overlay has
  been dismissed and normal game initialization has completed.
- Debug API: `window.__game.concert.start()` starts (or cleanly restarts) the
  show.  This is a development handle, not a player-facing control.
- A second valid activation while the show is already running cleanly restarts
  from `00:00.0`; it must not layer performers, audio, or timers.

## Interruption rules

- The concert is non-blocking spectacle: player movement, missions, dialogue,
  NPCs, combat, cart use, and collectibles continue normally.
- Entering or leaving the Laitram Machinery interior never stops or restarts
  the show.  Existing indoor blend behavior ducks/muffles concert audio along
  with other world audio; visuals continue on the shared clock.
- Starting dialogue does not pause the clock or cues.  It only prevents the
  secret keystroke listener from accepting new activation input.
- Missing media is valid: run the same show silently from the placeholder
  clock.  The later media-backed clock replaces it when a user file exists.
- On `showEnd`, visual and audio overrides fade out, spawned concert effects
  are removed, and the regular atmosphere resumes without altering world or
  mission state.
