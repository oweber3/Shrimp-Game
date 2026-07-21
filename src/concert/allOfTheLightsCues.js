// Generated from docs/reference/concert/ye-cues.md.
//
// Times are locked to public/concert/allofthelights.mp4 (duration 04:59.6).
// Keep this module free of lyrics and presentation logic: every event is
// identified by a section label and dispatched through the shared director.

const cue = (id, time, type, target, section) => Object.freeze({
  id,
  time,
  type,
  target,
  section,
});

export const YE_CUES = Object.freeze([
  cue('intro-sky', 0, 'skyShift', 'intro-near-black', 'intro'),
  cue('intro-lights', 0, 'lightCue', 'intro-amber-columns', 'intro'),
  cue('intro-performer-in', 0.4, 'performerIn', 'ye', 'intro'),
  cue('horn-break-1-lights', 12.4, 'lightCue', 'horn-break-amber-strobe', 'horn-break-1'),
  cue('horn-break-1-fireworks', 12.4, 'fireworks', 'horn-break-amber-north', 'horn-break-1'),
  cue('chorus-1-lights', 27.4, 'lightCue', 'chorus-white-gold-strobe', 'chorus-1'),
  cue('chorus-1-fireworks', 27.4, 'fireworks', 'chorus-white-gold-fans', 'chorus-1'),
  cue('chorus-1-shockwave', 27.5, 'shockwave', 'earth-stage', 'chorus-1'),
  cue('verse-1-lights', 60.3, 'lightCue', 'verse-deep-red-cross', 'verse-1'),
  cue('horn-break-2-lights', 85.8, 'lightCue', 'horn-break-amber-strobe', 'horn-break-2'),
  cue('horn-break-2-fireworks', 85.8, 'fireworks', 'horn-break-amber-left', 'horn-break-2'),
  cue('chorus-2-lights', 115.9, 'lightCue', 'chorus-white-gold-strobe', 'chorus-2'),
  cue('verse-2-lights', 132.6, 'lightCue', 'verse-deep-red-fan', 'verse-2'),
  cue('horn-break-3-lights', 141.1, 'lightCue', 'horn-break-amber-strobe', 'horn-break-3'),
  cue('horn-break-3-fireworks', 141.1, 'fireworks', 'horn-break-amber-right', 'horn-break-3'),
  cue('bridge-lights', 163, 'lightCue', 'bridge-low-ember', 'bridge'),
  cue('bridge-climax-lights', 189.7, 'lightCue', 'bridge-climax-multicolor', 'bridge-climax'),
  cue('bridge-climax-fireworks', 189.7, 'fireworks', 'bridge-climax-multicolor-volley', 'bridge-climax'),
  cue('chorus-3-lights', 194.9, 'lightCue', 'chorus-white-gold-strobe', 'chorus-3'),
  cue('horn-break-4-lights', 217.5, 'lightCue', 'horn-break-sparse-amber', 'horn-break-4'),
  cue('horn-break-4-fireworks', 221, 'fireworks', 'horn-break-amber-arc', 'horn-break-4'),
  cue('horn-break-5-lights', 247.1, 'lightCue', 'horn-break-rising-white', 'horn-break-5'),
  cue('horn-break-5-fireworks', 247.1, 'fireworks', 'horn-break-rising-amber-cluster', 'horn-break-5'),
  cue('chorus-final-lights', 257.4, 'lightCue', 'chorus-final-white-gold', 'chorus-final'),
  cue('chorus-final-fireworks', 257.4, 'fireworks', 'chorus-final-barrage', 'chorus-final'),
  cue('outro-lights', 284.7, 'lightCue', 'outro-warm-ember', 'outro'),
  cue('outro-fireworks', 284.7, 'fireworks', 'outro-final-barrage', 'outro'),
  cue('outro-performer-out', 296.8, 'performerOut', 'ye', 'outro'),
  cue('outro-show-end', 299.2, 'showEnd', 'earth-stage', 'outro'),
]);

export const YE_SHOW_DURATION = YE_CUES[YE_CUES.length - 1].time;
export const YE_BPM = 142;
