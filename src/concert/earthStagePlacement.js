// Shared Earth Stage geometry contract. The visible base is lightly roughened
// in staging.js; the larger footprint radius is the conservative world-space
// envelope consumed by placement verification.
export const EARTH_STAGE_CENTER = Object.freeze({ x: -123.8, z: -43.64 });
export const EARTH_STAGE_TOP = 34;
export const EARTH_STAGE_BASE_RADIUS = 33.25;
export const EARTH_STAGE_FOOTPRINT_RADIUS = 34;

export const EARTH_STAGE_FOOTPRINT = Object.freeze({
  id: 'concert-earth-stage',
  x: EARTH_STAGE_CENTER.x,
  z: EARTH_STAGE_CENTER.z,
  radius: EARTH_STAGE_FOOTPRINT_RADIUS,
});
