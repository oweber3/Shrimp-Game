import {
  BREAK_AREA_CENTER,
  translateLaitramMachineryPoint,
} from './layoutData.js';

// Fixed world dressing and gameplay anchors live here so builders, missions,
// and verification all consume the same coordinates and footprints.

const freezePath = (path) => path?.map((point) => Object.freeze([...point]));
const exteriorNpc = (id, x, z, options = {}) => Object.freeze({
  id,
  x,
  z,
  sx: options.sx ?? 1.2,
  sz: options.sz ?? 1.2,
  ...(options.path ? { path: Object.freeze(freezePath(options.path)) } : {}),
});

const exteriorNpcList = [
  exteriorNpc('gus', 107.2, 59), // on the 301B dock, between its shell and Toler St
  exteriorNpc('dot', -76, -121), // Distribution north loading face
  exteriorNpc('sal', 80, 16), // LM north receiving apron
  exteriorNpc('bea', 107.5, -80), // 301FO west entrance verge
  exteriorNpc('ray', -41, 116), // west gate verge, in sight of the guard shack
  exteriorNpc('lou', BREAK_AREA_CENTER.x - 4, BREAK_AREA_CENTER.z - 4.5),
  exteriorNpc('cleo', BREAK_AREA_CENTER.x + 4, BREAK_AREA_CENTER.z - 4.5),
  exteriorNpc('mo', -146, -108, { path: [[-146, -108], [-146, -80]] }),
  exteriorNpc('pearl', 52, 94.5, { path: [[52, 94.5], [78, 94.5]] }),
  exteriorNpc('hank', -111, -102),
  exteriorNpc('juno', 92, -42, { path: [[92, -42], [92, -20]] }),
  exteriorNpc('skip', 82, 112),
  exteriorNpc('gerald', 163, -110), // canal-side north verge, clear of 301FO
];

export const EXTERIOR_NPC_PLACEMENTS = Object.freeze(exteriorNpcList);
export const EXTERIOR_NPC_BY_ID = Object.freeze(Object.fromEntries(
  EXTERIOR_NPC_PLACEMENTS.map((placement) => [placement.id, placement])
));

const interiorPlacement = (id, localX, localZ, furnitureId, options = {}) => {
  const point = translateLaitramMachineryPoint(localX, localZ);
  return Object.freeze({
    id,
    x: point.x,
    z: point.z,
    behavior: options.behavior ?? 'sit',
    exceptionId: `interior-furniture:${id}`,
    furnitureId,
    reason: options.reason ?? `anchored to ${furnitureId}`,
  });
};

// These are the only NPC building-overlap exceptions. Each one names the
// exact modeled furniture that makes the indoor placement intentional.
export const INTERIOR_NPC_PLACEMENTS = Object.freeze([
  interiorPlacement('rita', 27, 12.2, 'lobby-reception-chair'),
  interiorPlacement('nina', 22.5, -6.5, 'cubicle-1024-center-chair'),
  interiorPlacement('theo', 28.5, 3.5, 'cubicle-1030-east-chair'),
  interiorPlacement('marge', 67.7, -4, 'manager-office-1022-chair'),
  interiorPlacement('owen', 46.3, -14, 'workstation-1025.03-chair'),
  interiorPlacement('kearney', 46.3, -10, 'workstation-1025.02-chair'),
  interiorPlacement('benny', 14, -15, 'kitchen-1078a-west-table-chair'),
  interiorPlacement('douglas', 46.3, -6, 'workstation-1025.01-chair'),
  interiorPlacement('owenRoboHead', 45.5, -14.8, 'workstation-1025.03-desk', {
    behavior: 'hover',
    reason: 'hover anchor is directly over Owen\'s modeled workstation desk',
  }),
]);
export const INTERIOR_NPC_BY_ID = Object.freeze(Object.fromEntries(
  INTERIOR_NPC_PLACEMENTS.map((placement) => [placement.id, placement])
));

export const SHRIMPLY_PLACEMENT = Object.freeze({
  id: 'shrimply',
  x: 28,
  z: 89,
  sx: 8,
  sz: 8,
  rotY: Math.PI / 2,
  path: Object.freeze(freezePath([
    [84, 89],
    [84, 92],
    [28, 92],
    [28, 89],
  ])),
  clearance: 8,
});

const cargo = (id, type, x, z, sx, sz, options = {}) => Object.freeze({
  id, type, x, z, sx, sz, ...options,
});

export const CARGO_PLACEMENTS = Object.freeze([
  cargo('lm-north-pallet-a', 'pallet', 50, 17, 2.4, 2.4, { layers: 3 }),
  cargo('lm-north-pallet-b', 'pallet', 54, 17, 2.4, 2.4, { layers: 2 }),
  cargo('lm-parts-pallet', 'pallet', 76, 17, 2.4, 2.4, { layers: 1 }),
  // Former 301A cargo: now on the legal LM north receiving apron.
  cargo('relocated-301a-crate-large', 'crate', 58, 17, 2, 2, { height: 2 }),
  cargo('relocated-301a-crate-small', 'crate', 61, 17, 1.6, 1.6, { height: 1.6 }),
  cargo('relocated-301a-barrel-blue', 'barrelBlue', 64, 17, 1.4, 1.4),
  cargo('relocated-301a-barrel-orange', 'barrelOrange', 66, 17, 1.4, 1.4),
  // Truck-court and Distribution backlog: grouped on the expanded west apron.
  cargo('relocated-east-pallet-a', 'pallet', -138, -110, 2.4, 2.4, { layers: 4 }),
  cargo('relocated-east-pallet-b', 'pallet', -134, -110, 2.4, 2.4, { layers: 2 }),
  cargo('relocated-east-pallet-c', 'pallet', -138, -106, 2.4, 2.4, { layers: 3 }),
  cargo('warehouse-pallet-a', 'pallet', -134, -106, 2.4, 2.4, { layers: 4 }),
  cargo('warehouse-pallet-b', 'pallet', -138, -102, 2.4, 2.4, { layers: 2 }),
  cargo('warehouse-pallet-c', 'pallet', -134, -102, 2.4, 2.4, { layers: 6 }),
  cargo('warehouse-crate-large', 'crate', -138, -78, 2, 2, { height: 2 }),
  cargo('warehouse-crate-small', 'crate', -134, -78, 1.6, 1.6, { height: 1.6 }),
  cargo('warehouse-barrel-blue', 'barrelBlue', -138, -82, 1.4, 1.4),
  cargo('warehouse-wrench-pallet', 'pallet', -107, -108, 2.4, 2.4, { layers: 2 }),
]);

export const MISSION_ITEM_PLACEMENTS = Object.freeze({
  wrench: Object.freeze({ id: 'wrench', x: -107, z: -108, sx: 0.8, sz: 0.8 }),
  partsBox: Object.freeze({ id: 'partsBox', x: 76, z: 17, sx: 1, sz: 1 }),
  coffeePot: Object.freeze({
    id: 'coffeePot',
    ...translateLaitramMachineryPoint(14.5, -18.55),
    furnitureId: 'kitchen-1078a-north-counter',
    exceptionId: 'interior-furniture:coffeePot',
  }),
});

const vehicle = (id, type, x, z, rotY, sx, sz, options = {}) => Object.freeze({
  id, type, x, z, rotY, sx, sz, ...options,
});

export const PARKED_VEHICLES = Object.freeze([
  vehicle('west-dock-truck-a', 'truck', -109, -92, 0, 3.2, 16, { color: 0xc23b3b }),
  vehicle('relocated-court-truck', 'truck', -119, -92, 0, 3.2, 16),
  vehicle('relocated-north-strip-truck', 'truck', -129, -92, 0, 3.2, 16, { color: 0xdedede }),
  vehicle('plantation-front-truck', 'truck', 120, -109, 0, 3.2, 16, { color: 0x3b6a9a }),
  vehicle('west-yard-forklift', 'forklift', -138, -90, -0.5, 3, 3.4),
]);

export const GOLF_CART_PARK = Object.freeze(
  vehicle('golf-cart', 'golfCart', 90, 10, Math.PI / 2, 3, 3)
);

export const PARKING_LOTS = Object.freeze([
  // Keep the Machinery front row open so Shrimply Gigantic can circle the
  // striped lot without walking through parked cars.
  Object.freeze({ id: 'lm-front-lot', x: 56, z: 90, sx: 56, sz: 10, rows: 1, cols: 14, carChance: 0 }),
  Object.freeze({ id: 'employee-lot', x: 70, z: 2, sx: 50, sz: 22, rows: 2, cols: 13, carChance: 0.5 }),
  Object.freeze({ id: 'overflow-lot', x: 56, z: 115, sx: 36, sz: 18, rows: 1, cols: 9, carChance: 0.5 }),
  Object.freeze({ id: 'tuna-lot', x: 15, z: -105, sx: 44, sz: 14, rows: 1, cols: 12, carChance: 0.4 }),
]);

export function parkedCarsForLot(lot) {
  const cars = [];
  const spotW = 3;
  const spotD = 6;
  for (let row = 0; row < lot.rows; row++) {
    const rowZ = lot.z - lot.sz / 2 + 4 + row * (spotD + 6);
    const firstX = lot.x - lot.sx / 2 + 6;
    for (let col = 0; col < lot.cols; col++) {
      const px = firstX + col * spotW;
      const occupied = Math.sin(px * 12.9 + rowZ * 7.7) * 0.5 + 0.5 < lot.carChance && col % 2 === 0;
      if (!occupied) continue;
      cars.push(Object.freeze({
        id: `${lot.id}-car-r${row}-c${col}`,
        type: 'car',
        x: px + spotW / 2,
        z: rowZ + spotD / 2,
        rotY: 0,
        sx: 2.6,
        sz: 4.8,
      }));
    }
  }
  return Object.freeze(cars);
}

export const PARKED_CARS = Object.freeze(PARKING_LOTS.flatMap(parkedCarsForLot));

export const RAMP_PLACEMENTS = Object.freeze([
  Object.freeze({
    id: 'distribution-approach-kicker', type: 'wedge', x: -44, z: -93,
    yaw: 0, rotY: 0, w: 4.5, l: 6, h: 2.2, sx: 4.5, sz: 6,
    clearance: Object.freeze({ id: 'distribution-approach-kicker-clearance', x: -44, z: -90, sx: 8, sz: 60 }),
  }),
  Object.freeze({
    id: 'west-yard-kicker', type: 'wedge', x: -154, z: -94,
    yaw: 0, rotY: 0, w: 4.5, l: 6, h: 2, sx: 4.5, sz: 6,
    clearance: Object.freeze({ id: 'west-yard-kicker-clearance', x: -154, z: -94, sx: 8, sz: 60 }),
  }),
  Object.freeze({
    id: 'west-field-speed-kicker', type: 'wedge', x: -155, z: 35,
    yaw: 0, rotY: 0, w: 5, l: 8, h: 2.4, sx: 5, sz: 8,
    clearance: Object.freeze({ id: 'west-field-speed-kicker-clearance', x: -155, z: 35, sx: 8, sz: 62 }),
  }),
  Object.freeze({ id: 'break-lawn-mound', type: 'mound', x: -55, z: 96, r: 8, h: 3, sx: 16, sz: 16 }),
  Object.freeze({ id: 'west-field-mound', type: 'mound', x: -80, z: 25, r: 10, h: 3.2, sx: 20, sz: 20 }),
]);

export const MONUMENT_SIGNS = Object.freeze([
  Object.freeze({ id: 'monument-laitram', kind: 'monument', text: 'LAITRAM', x: -58, z: 121, sx: 8, sz: 1.2 }),
  Object.freeze({ id: 'monument-machinery', kind: 'monument', text: 'LAITRAM MACHINERY', x: 20, z: 91, sx: 8, sz: 1.2 }),
]);

export const STREET_SIGNS = Object.freeze([
  Object.freeze({ id: 'street-plantation', kind: 'street', text: 'PLANTATION RD', x: -20, z: -120, rotY: Math.PI / 4, sx: 4.5, sz: 0.3 }),
  Object.freeze({ id: 'street-storey', kind: 'street', text: 'STOREY ST', x: -48, z: 120, rotY: -Math.PI / 4, sx: 4.5, sz: 0.3 }),
  Object.freeze({ id: 'street-laitram', kind: 'street', text: 'LAITRAM ST', x: 90, z: 120, rotY: -Math.PI / 4, sx: 4.5, sz: 0.3 }),
  Object.freeze({ id: 'street-toler', kind: 'street', text: 'TOLER ST', x: 90, z: -121, rotY: Math.PI / 4, sx: 4.5, sz: 0.3 }),
  Object.freeze({ id: 'street-river', kind: 'street', text: 'RIVER ROAD', x: -162, z: -120, rotY: Math.PI / 4, sx: 4.5, sz: 0.3 }),
  Object.freeze({ id: 'street-laitram-lane', kind: 'street', text: 'LAITRAM LN', x: 92, z: 92, rotY: Math.PI / 4, sx: 4.5, sz: 0.3 }),
]);

export const IMAGE_SIGNS = Object.freeze([
  Object.freeze({ id: 'image-sign-1', kind: 'image', asset: 'sign-image-1.webp', x: -14, z: 139, rotY: -Math.PI / 2, sx: 5.03, sz: 0.3 }),
  Object.freeze({ id: 'image-sign-2', kind: 'image', asset: 'sign-image-2.webp', x: 40, z: 105, rotY: 0, sx: 6, sz: 0.3 }),
  Object.freeze({ id: 'image-sign-3', kind: 'image', asset: 'sign-image-3.webp', x: 94, z: -50, rotY: -Math.PI / 2, sx: 4.5, sz: 0.3 }),
  Object.freeze({ id: 'image-sign-4', kind: 'image', asset: 'sign-image-4.webp', x: -164, z: -50, rotY: Math.PI / 2, sx: 4.8, sz: 0.3 }),
  Object.freeze({ id: 'image-sign-5', kind: 'image', asset: 'sign-image-5.webp', x: -38, z: 30, rotY: Math.PI / 2, sx: 10.66, sz: 0.3 }),
]);

export const CROSS_STREET_SIGNS = Object.freeze([
  Object.freeze({ id: 'cross-storey-laitram', kind: 'cross', x: -38, z: 122, textA: 'STOREY ST', rotA: Math.PI / 2, textB: 'LAITRAM ST', rotB: 0, w: 4, sx: 4, sz: 4 }),
  Object.freeze({ id: 'cross-river-laitram', kind: 'cross', x: -160, z: 122.5, textA: 'RIVER ROAD', rotA: Math.PI / 2, textB: 'LAITRAM ST', rotB: 0, w: 4, sx: 4, sz: 4 }),
  Object.freeze({ id: 'cross-storey-plantation', kind: 'cross', x: -37.5, z: -122.5, textA: 'STOREY ST', rotA: Math.PI / 2, textB: 'PLANTATION RD', rotB: 0, w: 5, sx: 5, sz: 5 }),
  Object.freeze({ id: 'cross-toler-plantation', kind: 'cross', x: 108, z: -122, textA: 'TOLER ST', rotA: Math.PI / 2, textB: 'PLANTATION RD', rotB: 0, w: 5, sx: 5, sz: 5 }),
  Object.freeze({ id: 'cross-toler-lane', kind: 'cross', x: 108, z: 93, textA: 'TOLER ST', rotA: Math.PI / 2, textB: 'LAITRAM LN', rotB: 0, w: 5, sx: 5, sz: 5 }),
]);

export const WAYFINDING_SIGNS = Object.freeze([
  Object.freeze({
    id: 'wayfinding-main-gate', kind: 'wayfinding', x: -40, z: 108, rotY: 0, sx: 6, sz: 6,
    entries: Object.freeze(['← DISTRIBUTION', 'SHIPPING →', 'VISITOR PARKING →']),
  }),
  Object.freeze({
    id: 'wayfinding-mid-campus', kind: 'wayfinding', x: -40, z: 72, rotY: Math.PI / 2, sx: 6, sz: 6,
    entries: Object.freeze(['WEST DOCK →', 'DISTRIBUTION →', '← VISITOR PARKING']),
  }),
  Object.freeze({
    id: 'wayfinding-machine-shop', kind: 'wayfinding', x: 14, z: -63, rotY: 0, sx: 6, sz: 6,
    entries: Object.freeze(['301B SHIPPING →', '← DISTRIBUTION']),
  }),
]);

export const EXTERIOR_SIGN_PLACEMENTS = Object.freeze([
  ...MONUMENT_SIGNS,
  ...STREET_SIGNS,
  ...IMAGE_SIGNS,
  ...CROSS_STREET_SIGNS,
  ...WAYFINDING_SIGNS,
]);

// Wall-mounted signs intentionally share only their named host building's
// facade. They are not ground obstacles and are kept separate from the
// freestanding-sign validation set above.
export const BUILDING_MOUNTED_SIGN_EXCEPTIONS = Object.freeze([
  ['lm-north-brand', 'laitram-machinery'],
  ['lm-front-brand', 'laitram-machinery'],
  ['lm-front-address', 'laitram-machinery'],
  ['lm-receiving', 'laitram-machinery'],
  ['lm-receiving-address', 'laitram-machinery'],
  ['lm-safety', 'laitram-machinery'],
  ['distribution-brand', 'distribution'],
  ['distribution-address', 'distribution'],
  ['distribution-west-dock', 'distribution'],
  ['human-resources-address', 'laitram-200'],
  ['301fo-label', 'plantation-301fo'],
  ['301a-label', 'plantation-301a'],
  ['301b-label', 'plantation-301b'],
  ['301c-label', 'plantation-301c'],
  ['machine-shop-label', 'storey-5211'],
  ['wet-test-label', 'storey-5115'],
  ['corporate-label', 'storey-5123'],
  ['tuna-label', 'plantation-221'],
].map(([id, buildingId]) => Object.freeze({
  id,
  buildingId,
  reason: `wall-mounted on ${buildingId}`,
})));
