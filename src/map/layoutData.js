// Authoritative live layout for the accuracy-plan campus. Roads, buildings,
// labels, and dependent gameplay systems consume this module instead of
// duplicating world coordinates.

export const WORLD_BOUNDS = Object.freeze({
  minX: -180,
  maxX: 180,
  minZ: -140,
  maxZ: 145,
});

// Every part of the walkable Laitram Machinery cluster keeps its original
// local coordinates and receives this one translation in Phase 3. That
// includes the exterior detail, interior group, colliders, zones, NPCs, and
// indoor minimap. Keeping the transform explicit prevents those systems from
// drifting independently.
export const LAITRAM_MACHINERY_OFFSET = Object.freeze({ x: 16, z: 65 });

// Gameplay pavilion retained near Laitram Machinery. Its translated legacy
// position landed on the Toler St / Laitram Ln intersection, so Phase 6 gives
// it a canonical clear pad between Laitram Lane and Laitram Street.
export const BREAK_AREA_CENTER = Object.freeze({ x: 24, z: 113 });

export function translateLaitramMachineryPoint(x, z) {
  return Object.freeze({
    x: x + LAITRAM_MACHINERY_OFFSET.x,
    z: z + LAITRAM_MACHINERY_OFFSET.z,
  });
}

export function translateLaitramMachineryRect(rect) {
  return Object.freeze({
    ...rect,
    minX: rect.minX + LAITRAM_MACHINERY_OFFSET.x,
    maxX: rect.maxX + LAITRAM_MACHINERY_OFFSET.x,
    minZ: rect.minZ + LAITRAM_MACHINERY_OFFSET.z,
    maxZ: rect.maxZ + LAITRAM_MACHINERY_OFFSET.z,
  });
}

// Road and paved-area rectangles. `material` names a terrain material and
// `minimap: false` keeps small service slabs out of the campus overview.
// Street grid implements the Phase 0 table in
// docs/reference/laitram-maps/layout.md verbatim (Phase 2).
export const ROADS = Object.freeze([
  { id: 'plantation-road', cx: 2, cz: -130, sx: 356, sz: 10, material: 'asphalt', role: 'street' },
  { id: 'river-road', cx: -170, cz: 0, sx: 9, sz: 272, material: 'asphalt', role: 'street' },
  { id: 'laitram-street', cx: 2, cz: 130, sx: 356, sz: 10, material: 'asphalt', role: 'street' },
  { id: 'storey-street', cx: -30, cz: 0, sx: 10, sz: 250, material: 'asphalt', role: 'street' },
  { id: 'toler-street', cx: 100, cz: 0, sx: 9, sz: 250, material: 'asphalt', role: 'street' },
  { id: 'laitram-lane', cx: 55, cz: 100, sx: 90, sz: 7, material: 'asphalt', role: 'street' },
  // Stub from Laitram St to the perimeter-fence gate gap on the Storey St axis.
  { id: 'main-gate-drive', cx: -30, cz: 140, sx: 10, sz: 10, material: 'asphalt', role: 'travel-lane' },
  // Service pavement is not a travel lane. The invalid east truck court was
  // removed: there is no legal 36-unit court between Toler St and the 301
  // row. Its dressing is staged on these two clear, existing dock aprons.
  { id: 'lm-north-service-strip', cx: 54, cz: 14.5, sx: 56, sz: 9, material: 'asphalt', elevation: 0.035, minimap: false, role: 'service' },
  { id: 'warehouse-west-dock-apron', cx: -123, cz: -94, sx: 38, sz: 40, material: 'asphalt', elevation: 0.035, minimap: false, role: 'service' },
  { id: 'lm-office-entry-crossing', cx: 51, cz: 89, sx: 8, sz: 10, material: 'concrete', elevation: 0.045, minimap: false, role: 'service' },
]);

export const ROAD_BY_ID = Object.freeze(Object.fromEntries(
  ROADS.map((road) => [road.id, road])
));

export const CANONICAL_STREET_IDS = Object.freeze([
  'plantation-road',
  'river-road',
  'laitram-street',
  'storey-street',
  'toler-street',
  'laitram-lane',
]);

// Includes the short gate continuation because it is also a live travel
// lane, even though only the six streets above belong to the canonical grid.
export const ROAD_LANES = Object.freeze(
  ROADS.filter((road) => road.role === 'street' || road.role === 'travel-lane')
);

// Building rectangles copied from the canonical Phase 0 table. Detail meshes,
// signage, minimap labels, and gameplay placements share these anchors.
export const BUILDINGS = Object.freeze([
  { id: 'plantation-221', cx: 66, cz: -104, sx: 50, sz: 28, height: 10, label: 'Tuna Building', address: '221 Plantation Rd', mapLabel: '221 PLANTATION\nTUNA BUILDING', color: '#4a5f72' },
  { id: 'toler-5200b', cx: 71, cz: -75, sx: 45, sz: 25, height: 11, label: '5200B Toler', address: '5200B Toler St', mapLabel: '5200B\nTOLER', color: '#4a5f72' },
  { id: 'toler-5200a', cx: 80, cz: -39, sx: 18, sz: 22, height: 10, label: '5200A Toler', address: '5200A Toler St', mapLabel: '5200A\nTOLER', color: '#3d5465' },
  { id: 'storey-5211', cx: 12, cz: -32, sx: 65, sz: 50, height: 14, label: 'Machine Shop', address: '5211 Storey St / 220R Laitram Ln', mapLabel: '5211 / 220R\nMACHINE SHOP', color: '#4a5f72' },
  // Compact map callouts keep this dense cluster legible; the Storey Street
  // road label supplies the shared street name for the numbered shells.
  { id: 'storey-5140', cx: -85, cz: -2, sx: 70, sz: 14, height: 9, label: '5140 Storey', address: '5140 Storey St', mapLabel: '5140', color: '#3d5465' },
  { id: 'storey-5135', cx: -5, cz: 13, sx: 32, sz: 12, height: 9, label: '5135 Storey', address: '5135 Storey St', mapLabel: '5135', color: '#3d5465' },
  { id: 'storey-5129', cx: -5, cz: 28, sx: 30, sz: 12, height: 9, label: '5129 Storey', address: '5129 Storey St', mapLabel: '5129', color: '#3d5465' },
  { id: 'storey-5123', cx: -2, cz: 47, sx: 30, sz: 14, height: 10, label: 'Corporate Facilities', address: '5123 Storey St', mapLabel: '5123\nCORP.', color: '#4a5f72' },
  { id: 'storey-5120', cx: -76, cz: 50, sx: 54, sz: 16, height: 9, label: '5120 Storey', address: '5120 Storey St', mapLabel: '5120', color: '#3d5465' },
  { id: 'storey-5118', cx: -77, cz: 64, sx: 50, sz: 13, height: 9, label: '5118 Storey', address: '5118 Storey St', mapLabel: '5118', color: '#3d5465' },
  { id: 'storey-5115', cx: -5, cz: 75, sx: 35, sz: 32, height: 10, label: 'Wet Test', address: '5115 Storey St', mapLabel: '5115\nWET TEST', color: '#4a5f72' },
  // The canonical 76 x 60 rectangle is the overall cluster envelope. The
  // detailed 3D production shell remains 60 x 50 plus its office annex, all
  // translated together, so the walkable interior and doorway are unchanged.
  { id: 'laitram-machinery', cx: 56, cz: 50, sx: 76, sz: 60, shellSx: 60, shellSz: 50, height: 14, label: 'Laitram Machinery', address: '220 Laitram Ln', mapLabel: '220\nLAITRAM MACHINERY', mapLabelCx: 64, color: '#4a5f72' },
  { id: 'laitram-200', cx: -5, cz: 110, sx: 34, sz: 28, height: 8, label: 'Human Resources', address: '200 Laitram Ln', mapLabel: '200\nHUMAN RES.', color: '#3d5465' },
  { id: 'laitram-116', cx: -120, cz: 97, sx: 90, sz: 46, height: 10, label: '116 Laitram', address: '116 Laitram Ln', mapLabel: '116\nLAITRAM LN', color: '#4a5f72' },
  { id: 'plantation-301fo', cx: 136, cz: -80, sx: 50, sz: 40, height: 10, label: '301 FO', address: '301 Plantation Rd', mapLabel: '301FO\nPLANTATION', color: '#4a5f72' },
  { id: 'plantation-301a', cx: 136, cz: -9, sx: 50, sz: 100, height: 13, label: '301A Assembly', address: '301 Plantation Rd', mapLabel: '301A\nASSEMBLY', color: '#4a5f72' },
  { id: 'plantation-301b', cx: 136, cz: 59, sx: 50, sz: 34, height: 10, label: '301B Shipping', address: '301 Plantation Rd', mapLabel: '301B\nSHIPPING', color: '#4a5f72' },
  { id: 'plantation-301c', cx: 136, cz: 100, sx: 50, sz: 48, height: 10, label: '301C ILOX VNA', address: '301 Plantation Rd', mapLabel: '301C\nILOX VNA', color: '#4a5f72' },
  { id: 'distribution', cx: -76, cz: -94, sx: 50, sz: 48, height: 13, label: 'Distribution Warehouse', address: '5000 River Rd', mapLabel: 'DISTRIBUTION\n5000 RIVER RD', color: '#4a5f72' },
  { id: 'guard-shack', cx: -20, cz: 120, sx: 5, sz: 5, height: 3.6, label: 'Guard Shack', address: 'Laitram St main gate', mapLabel: 'GUARD', color: '#3d5465' },
]);

export const BUILDING_BY_ID = Object.freeze(Object.fromEntries(
  BUILDINGS.map((building) => [building.id, building])
));

export const ZONES = Object.freeze([
  ...BUILDINGS.filter((building) => building.mapLabel).map((building) => ({
    wx: building.mapLabelCx ?? building.cx,
    wz: building.mapLabelCz ?? building.cz,
    text: building.mapLabel,
  })),
  { wx: BREAK_AREA_CENTER.x + 14, wz: BREAK_AREA_CENTER.z, text: 'BREAK\nAREA' },
]);

// Reusable canonical placement guard. Candidate footprints may be rotated;
// buildings and road lanes remain the authoritative axis-aligned rectangles.
// Merely touching an edge is legal, but any positive-area intrusion is not.
const PLACEMENT_EPSILON = 1e-7;

function normalizedFootprint(footprint) {
  const cx = footprint.cx ?? footprint.x;
  const cz = footprint.cz ?? footprint.z;
  const sx = footprint.sx;
  const sz = footprint.sz;
  if (![cx, cz, sx, sz].every(Number.isFinite) || sx <= 0 || sz <= 0) {
    throw new TypeError('placement footprint requires finite cx/cz/sx/sz values');
  }
  return { cx, cz, sx, sz, rotY: footprint.rotY ?? 0 };
}

export function footprintsOverlap(candidate, target) {
  const a = normalizedFootprint(candidate);
  const b = normalizedFootprint(target);
  const angle = a.rotY;
  const u = { x: Math.cos(angle), z: -Math.sin(angle) };
  const v = { x: Math.sin(angle), z: Math.cos(angle) };
  const delta = { x: b.cx - a.cx, z: b.cz - a.cz };
  const ahx = a.sx / 2;
  const ahz = a.sz / 2;
  const bhx = b.sx / 2;
  const bhz = b.sz / 2;
  const axes = [u, v, { x: 1, z: 0 }, { x: 0, z: 1 }];

  for (const axis of axes) {
    const distance = Math.abs(delta.x * axis.x + delta.z * axis.z);
    const radiusA = ahx * Math.abs(u.x * axis.x + u.z * axis.z) +
      ahz * Math.abs(v.x * axis.x + v.z * axis.z);
    const radiusB = bhx * Math.abs(axis.x) + bhz * Math.abs(axis.z);
    if (distance >= radiusA + radiusB - PLACEMENT_EPSILON) return false;
  }
  return true;
}

export function findLayoutOverlaps(footprint, { includeBuildings = true, includeRoads = true } = {}) {
  const candidate = normalizedFootprint(footprint);
  const overlaps = [];
  if (includeBuildings) {
    for (const building of BUILDINGS) {
      if (footprintsOverlap(candidate, building)) {
        overlaps.push({ type: 'building', id: building.id });
      }
    }
  }
  if (includeRoads) {
    for (const road of ROAD_LANES) {
      if (footprintsOverlap(candidate, road)) {
        overlaps.push({ type: 'road', id: road.id });
      }
    }
  }
  return overlaps;
}

// Backward-compatible single-hit form used by lightweight dev warnings.
export function findLayoutOverlap(cx, cz, sx, sz, { includeRoads = true, rotY = 0 } = {}) {
  return findLayoutOverlaps({ cx, cz, sx, sz, rotY }, { includeRoads })[0]?.id ?? null;
}

// Dev-time tripwire so future placements cannot silently drift into a moved
// building or travel lane. Automated verification uses findLayoutOverlaps().
export function warnIfOverlapping(label, cx, cz, sx, sz, opts = {}) {
  const hits = findLayoutOverlaps(
    { cx, cz, sx, sz, rotY: opts.rotY ?? 0 },
    { includeRoads: opts.includeRoads ?? true }
  );
  if (hits.length) {
    console.warn(`[layout] ${label} at (${cx}, ${cz}) overlaps ${hits.map((hit) => hit.id).join(', ')}`);
  }
  return hits[0]?.id ?? null;
}

export const STREET_LABELS = Object.freeze([
  { wx: -80, wz: -130, text: 'PLANTATION RD', rot: 0 },
  { wx: -170, wz: -60, text: 'RIVER ROAD', rot: -Math.PI / 2 },
  { wx: -80, wz: 130, text: 'LAITRAM ST', rot: 0 },
  { wx: -30, wz: -60, text: 'STOREY ST', rot: -Math.PI / 2 },
  { wx: -30, wz: 60, text: 'STOREY ST', rot: -Math.PI / 2 },
  { wx: 100, wz: -68, text: 'TOLER ST', rot: -Math.PI / 2 },
  { wx: 30, wz: 100, text: 'LAITRAM LN', rot: 0 },
]);
