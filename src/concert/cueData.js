// Generated from docs/reference/concert/cues.md.
//
// Times are locked to public/concert/sickomode.mp4 (duration 05:14.4).
// Keep this module free of lyrics and presentation logic: the director
// consumes section-labelled data only.

const cue = (id, time, type, target, section) => Object.freeze({
  id,
  time,
  type,
  target,
  section,
});

export const CUES = Object.freeze([
  cue('show-arm', 0, 'skyShift', 'movement-1-midnight-indigo', 'movement-1'),
  cue('drake-in', 0.8, 'performerIn', 'drake', 'movement-1'),
  cue('drake-intro-fireworks', 21.8, 'fireworks', 'gold-fan-pair', 'movement-1'),
  cue('switch-1', 48.1, 'beatSwitch', 'movement-2', 'movement-2'),
  cue('drake-out-1', 48.1, 'performerOut', 'drake', 'movement-2'),
  cue('travis-in', 48.1, 'performerIn', 'travis', 'movement-2'),
  cue('switch-1-shockwave', 48.2, 'shockwave', 'main-sky-anchor', 'movement-2'),
  cue('travis-fireworks-a', 94, 'fireworks', 'violet-green-north-cluster', 'movement-2'),
  cue('swae-in', 138.6, 'performerIn', 'swae', 'bridge'),
  cue('swae-sky-shift', 138.6, 'skyShift', 'bridge-cyan-magenta', 'bridge'),
  cue('swae-out', 175.8, 'performerOut', 'swae', 'movement-2'),
  cue('switch-2', 187.8, 'beatSwitch', 'movement-3', 'movement-3'),
  cue('travis-out', 187.8, 'performerOut', 'travis', 'movement-3'),
  cue('drake-in-2', 187.8, 'performerIn', 'drake-red-rim', 'movement-3'),
  cue('switch-2-shockwave', 187.9, 'shockwave', 'main-sky-anchor-large-red', 'movement-3'),
  cue('drake-fireworks-final', 258.2, 'fireworks', 'red-amber-white-finale-fans', 'finale'),
  cue('drake-out-2', 282, 'performerOut', 'drake', 'finale'),
  cue('seahawk-in', 286, 'performerIn', 'seahawk', 'outro'),
  cue('outro-sky-shift', 286, 'skyShift', 'outro-deep-indigo', 'outro'),
  cue('seahawk-out', 309.1, 'performerOut', 'seahawk', 'outro'),
  cue('show-end', 313.6, 'showEnd', 'concert', 'outro'),
]);

export const SHOW_DURATION = CUES[CUES.length - 1].time;
