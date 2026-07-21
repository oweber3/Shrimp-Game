// Shared Earth Stage geometry contract. The visible base is lightly roughened
// in staging.js; the larger footprint radius is the conservative world-space
// envelope consumed by placement verification.
import { BUILDING_BY_ID, translateLaitramMachineryPoint } from '../map/layoutData.js';

// The Ye "All of the Lights" set now headlines the same stage the Sicko
// rappers use: the center of their formation on top of Laitram Machinery,
// rather than the old standalone west-side pocket. Deriving the center from the
// shared machinery layout keeps both shows locked to the exact same spot.
// MACHINERY_FRONT_CENTER.x is the X midpoint the Drake/Travis leads flank, and
// the -6 matches concertShow.js's RAPPER_DEPTH_OFFSET, so Ye lands dead center.
const MACHINERY = BUILDING_BY_ID['laitram-machinery'];
const MACHINERY_FRONT_CENTER = translateLaitramMachineryPoint(35, 19.5);
export const EARTH_STAGE_CENTER = Object.freeze({
  x: MACHINERY_FRONT_CENTER.x,
  z: MACHINERY.cz - 6,
});
export const EARTH_STAGE_TOP = 34;
export const EARTH_STAGE_BASE_RADIUS = 33.25;
export const EARTH_STAGE_FOOTPRINT_RADIUS = 34;

export const EARTH_STAGE_FOOTPRINT = Object.freeze({
  id: 'concert-earth-stage',
  x: EARTH_STAGE_CENTER.x,
  z: EARTH_STAGE_CENTER.z,
  radius: EARTH_STAGE_FOOTPRINT_RADIUS,
});
