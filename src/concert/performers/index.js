import { createTravisFish } from './travisFish.js';
import { createDrakeDrake } from './drakeDrake.js';
import { createSwaeEel } from './swaeEel.js';
import { createBigSeahawk } from './bigSeahawk.js';
import { createKanyeHuman } from './kanyeHuman.js';

// ============================================================================
// Performer registry — the single lookup the standalone harness and (later) the
// concert director share. Keys match the `target` field of the performerIn /
// performerOut cues in src/concert/cueData.js, so the integration pass can wire
// `createPerformer(cue.target)` straight into the director without a mapping.
// ============================================================================

export const PERFORMERS = {
  travis: { label: 'The Travis Fish', create: () => createTravisFish() },
  drake: { label: 'Drake the Drake', create: () => createDrakeDrake() },
  'drake-red-rim': { label: 'Drake the Drake (Movement 3, red rim)', create: () => createDrakeDrake({ redRim: true }) },
  swae: { label: 'Swae Eel', create: () => createSwaeEel() },
  seahawk: { label: 'Big (Sea)Hawk', create: () => createBigSeahawk() },
  ye: { label: 'Ye', create: () => createKanyeHuman() },
};

/** The canonical show order, for the harness carousel and roster listings. */
export const PERFORMER_ORDER = ['travis', 'drake', 'drake-red-rim', 'swae', 'seahawk', 'ye'];

/** Build a ready `Performer` for a registry id. Unknown ids fall back to Travis. */
export function createPerformer(id) {
  const entry = PERFORMERS[id] ?? PERFORMERS.travis;
  return entry.create();
}
