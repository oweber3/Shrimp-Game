// Headless end-to-end verification: loads the built game, checks movement,
// collision, NPC interaction, and completes all three missions.
import puppeteer from 'puppeteer';
import { preview } from 'vite';
import {
  BUILDINGS,
  BUILDING_BY_ID,
  findLayoutOverlaps,
  footprintsOverlap,
  LAITRAM_MACHINERY_OFFSET,
  ROAD_LANES,
  ROADS,
} from '../src/map/layoutData.js';
import {
  BUILDING_MOUNTED_SIGN_EXCEPTIONS,
  CARGO_PLACEMENTS,
  EXTERIOR_NPC_PLACEMENTS,
  EXTERIOR_SIGN_PLACEMENTS,
  GOLF_CART_PARK,
  INTERIOR_NPC_PLACEMENTS,
  MISSION_ITEM_PLACEMENTS,
  PARKED_CARS,
  PARKED_VEHICLES,
  PARKING_LOTS,
  RAMP_PLACEMENTS,
  SHRIMPLY_PLACEMENT,
} from '../src/map/placementData.js';
import {
  EARTH_STAGE_BASE_RADIUS,
  EARTH_STAGE_CENTER,
  EARTH_STAGE_FOOTPRINT,
  EARTH_STAGE_FOOTPRINT_RADIUS,
  EARTH_STAGE_TOP,
} from '../src/concert/earthStagePlacement.js';
import { YE_FIREWORK_SITES } from '../src/concert/concertShow.js';

const FAILURES = [];
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}${extra ? ' (' + extra + ')' : ''}`);
  if (!ok) FAILURES.push(name);
};
const sameRect = (actual, expected) => actual &&
  ['cx', 'cz', 'sx', 'sz'].every((key) => actual[key] === expected[key]);

const expectedStreetGrid = [
  { id: 'plantation-road', cx: 2, cz: -130, sx: 356, sz: 10 },
  { id: 'river-road', cx: -170, cz: 0, sx: 9, sz: 272 },
  { id: 'laitram-street', cx: 2, cz: 130, sx: 356, sz: 10 },
  { id: 'storey-street', cx: -30, cz: 0, sx: 10, sz: 250 },
  { id: 'toler-street', cx: 100, cz: 0, sx: 9, sz: 250 },
  { id: 'laitram-lane', cx: 55, cz: 100, sx: 90, sz: 7 },
];
const streetMismatches = expectedStreetGrid.flatMap((expected) => {
  const actual = ROADS.find((road) => road.id === expected.id);
  return sameRect(actual, expected) ? [] : [expected.id];
});
check(
  'street directions and extents match the canonical layout',
  streetMismatches.length === 0,
  streetMismatches.join(', ')
);

// Phase 3's canonical rectangles are cheap to verify directly. The minimap
// and world shells both consume this module, so drift here catches both.
const expectedPhase3Buildings = [
  { id: 'plantation-221', address: '221 Plantation Rd', cx: 66, cz: -104, sx: 50, sz: 28 },
  { id: 'toler-5200b', address: '5200B Toler St', cx: 71, cz: -75, sx: 45, sz: 25 },
  { id: 'toler-5200a', address: '5200A Toler St', cx: 80, cz: -39, sx: 18, sz: 22 },
  { id: 'storey-5211', cx: 12, cz: -32, sx: 65, sz: 50 },
  { id: 'storey-5140', cx: -85, cz: -2, sx: 70, sz: 14 },
  { id: 'storey-5135', cx: -5, cz: 13, sx: 32, sz: 12 },
  { id: 'storey-5129', cx: -5, cz: 28, sx: 30, sz: 12 },
  { id: 'storey-5123', cx: -2, cz: 47, sx: 30, sz: 14 },
  { id: 'storey-5120', cx: -76, cz: 50, sx: 54, sz: 16 },
  { id: 'storey-5118', cx: -77, cz: 64, sx: 50, sz: 13 },
  { id: 'storey-5115', cx: -5, cz: 75, sx: 35, sz: 32 },
  { id: 'laitram-machinery', cx: 56, cz: 50, sx: 76, sz: 60 },
  { id: 'laitram-200', address: '200 Laitram Ln', cx: -5, cz: 110, sx: 34, sz: 28 },
  { id: 'laitram-116', cx: -120, cz: 97, sx: 90, sz: 46 },
  { id: 'plantation-301fo', cx: 136, cz: -80, sx: 50, sz: 40 },
  { id: 'plantation-301a', cx: 136, cz: -9, sx: 50, sz: 100 },
  { id: 'plantation-301b', cx: 136, cz: 59, sx: 50, sz: 34 },
  { id: 'plantation-301c', cx: 136, cz: 100, sx: 50, sz: 48 },
  { id: 'distribution', cx: -76, cz: -94, sx: 50, sz: 48 },
  { id: 'guard-shack', cx: -20, cz: 120, sx: 5, sz: 5 },
];
const layoutMismatches = expectedPhase3Buildings.flatMap((expected) => {
  const actual = BUILDING_BY_ID[expected.id] ??
    (expected.address ? BUILDINGS.find((b) => b.address === expected.address) : null);
  return sameRect(actual, expected) ? [] : [expected.id];
});
check(
  'Phase 3 building rectangles match the canonical layout',
  layoutMismatches.length === 0,
  layoutMismatches.slice(0, 6).join(', ')
);

const expectedBuildingIdentity = {
  'plantation-221': ['Tuna Building', '221 Plantation Rd'],
  'toler-5200b': ['5200B Toler', '5200B Toler St'],
  'toler-5200a': ['5200A Toler', '5200A Toler St'],
  'storey-5211': ['Machine Shop', '5211 Storey St / 220R Laitram Ln'],
  'storey-5140': ['5140 Storey', '5140 Storey St'],
  'storey-5135': ['5135 Storey', '5135 Storey St'],
  'storey-5129': ['5129 Storey', '5129 Storey St'],
  'storey-5123': ['Corporate Facilities', '5123 Storey St'],
  'storey-5120': ['5120 Storey', '5120 Storey St'],
  'storey-5118': ['5118 Storey', '5118 Storey St'],
  'storey-5115': ['Wet Test', '5115 Storey St'],
  'laitram-machinery': ['Laitram Machinery', '220 Laitram Ln'],
  'laitram-200': ['Human Resources', '200 Laitram Ln'],
  'laitram-116': ['116 Laitram', '116 Laitram Ln'],
  'plantation-301fo': ['301 FO', '301 Plantation Rd'],
  'plantation-301a': ['301A Assembly', '301 Plantation Rd'],
  'plantation-301b': ['301B Shipping', '301 Plantation Rd'],
  'plantation-301c': ['301C ILOX VNA', '301 Plantation Rd'],
  distribution: ['Distribution Warehouse', '5000 River Rd'],
  'guard-shack': ['Guard Shack', 'Laitram St main gate'],
};
const identityMismatches = Object.entries(expectedBuildingIdentity).flatMap(
  ([id, [label, address]]) => {
    const actual = BUILDING_BY_ID[id];
    return actual?.label === label && actual.address === address ? [] : [id];
  }
);
check(
  'named building labels and addresses match the canonical layout',
  identityMismatches.length === 0 && BUILDINGS.length === Object.keys(expectedBuildingIdentity).length,
  identityMismatches.slice(0, 6).join(', ')
);

const removedBuildingIds = [
  'intralox', 'toler-5307', 'toler-5306', 'lapeyre-stair', 'laitram-201',
  'laitram-211', 'storey-5040', 'storey-5210', 'river-5123'
];
const retainedRemovedIds = removedBuildingIds.filter((id) => BUILDING_BY_ID[id]);
check(
  'Phase 3 retired building shells are absent',
  retainedRemovedIds.length === 0,
  retainedRemovedIds.join(', ')
);

const campusRoadIds = new Set([
  'plantation-road', 'river-road', 'laitram-street',
  'storey-street', 'toler-street', 'laitram-lane'
]);
// The canonical table puts HR's northeast corner two units into the west end
// of Laitram Lane. Preserve that recorded target while rejecting other drift.
const canonicalRoadOverlapExceptions = new Set(['laitram-200/laitram-lane']);
const overlaps = [];
for (const building of BUILDINGS.filter((b) => !b.minimapOnly)) {
  for (const road of ROADS.filter((r) => campusRoadIds.has(r.id))) {
    const overlapX = Math.abs(building.cx - road.cx) < (building.sx + road.sx) / 2;
    const overlapZ = Math.abs(building.cz - road.cz) < (building.sz + road.sz) / 2;
    const pair = `${building.id}/${road.id}`;
    if (overlapX && overlapZ && !canonicalRoadOverlapExceptions.has(pair)) overlaps.push(pair);
  }
}
check('building footprints have no unexpected street overlaps', overlaps.length === 0, overlaps.slice(0, 4).join(', '));

check(
  'invalid LM east truck court is absent',
  !ROADS.some((road) => road.id === 'lm-east-truck-court')
);

// Unlike the rectangular map placements, the temporary Earth Stage has a
// circular roughened base. Measure its conservative 34-unit envelope against
// the live rectangles directly so diagonal corner clearance is not rejected
// by an over-conservative 68x68 square.
const circleRectClearance = (circle, obstacle) => {
  const x = obstacle.x ?? obstacle.cx;
  const z = obstacle.z ?? obstacle.cz;
  const angle = -(obstacle.rotY ?? obstacle.yaw ?? 0);
  const dx = circle.x - x;
  const dz = circle.z - z;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  const outsideX = Math.max(Math.abs(localX) - obstacle.sx / 2, 0);
  const outsideZ = Math.max(Math.abs(localZ) - obstacle.sz / 2, 0);
  return Math.hypot(outsideX, outsideZ) - circle.radius;
};
// The Ye set now headlines the same machinery-top stage the Sicko rappers use,
// so the mound deliberately occupies that venue instead of clearing a separate
// pocket. Verify the co-location holds: the stage center sits inside the
// Laitram Machinery footprint and the mound envelope overlaps the building it
// now performs on top of, with the mound's geometric proportions unchanged.
const machinery = BUILDING_BY_ID['laitram-machinery'];
const stageCenteredOnMachinery =
  Math.abs(EARTH_STAGE_CENTER.x - machinery.cx) <= machinery.sx / 2 &&
  Math.abs(EARTH_STAGE_CENTER.z - machinery.cz) <= machinery.sz / 2;
const stageOverlapsMachinery = circleRectClearance(EARTH_STAGE_FOOTPRINT, machinery) < 0;
check(
  'Earth Stage headlines the Laitram Machinery venue where the other rappers perform',
  EARTH_STAGE_BASE_RADIUS < EARTH_STAGE_FOOTPRINT_RADIUS &&
    EARTH_STAGE_TOP >= 30 && EARTH_STAGE_TOP <= 40 &&
    stageCenteredOnMachinery && stageOverlapsMachinery,
  `stage (${EARTH_STAGE_FOOTPRINT.x}, ${EARTH_STAGE_FOOTPRINT.z}) on machinery (${machinery.cx}, ${machinery.cz})`
);

// The firework launch ring travels with the stage: every site stays a short
// reach from the relocated mound center rather than clearing the machinery yard
// it now sits over. This guards against a site drifting off the moved venue.
const yeLaunchReach = EARTH_STAGE_FOOTPRINT_RADIUS + 8;
const yeLaunchFailures = Object.entries(YE_FIREWORK_SITES).flatMap(([site, [x, , z]]) => {
  const reach = Math.hypot(x - EARTH_STAGE_CENTER.x, z - EARTH_STAGE_CENTER.z);
  return reach <= yeLaunchReach ? [] : [`${site}=${reach.toFixed(1)}u`];
});
check(
  'Ye firework launch sites ring the relocated Earth Stage center',
  yeLaunchFailures.length === 0,
  yeLaunchFailures.length ? yeLaunchFailures.join(', ') : `all sites within ${yeLaunchReach}u of stage`
);

const placementFootprint = (placement, overrides = {}) => ({
  x: placement.x,
  z: placement.z,
  sx: placement.sx,
  sz: placement.sz,
  rotY: placement.rotY ?? placement.yaw ?? 0,
  ...overrides,
});
const placementFailures = (placements) => placements.flatMap((placement) => {
  const hits = findLayoutOverlaps(placementFootprint(placement));
  return hits.map((hit) => `${placement.id}/${hit.id}`);
});
const sweptPatrolFootprint = (placement, from, to, segmentIndex) => {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const width = Math.max(placement.sx, placement.sz);
  return {
    id: `${placement.id}-segment-${segmentIndex}`,
    x: (from[0] + to[0]) / 2,
    z: (from[1] + to[1]) / 2,
    sx: width,
    sz: Math.hypot(dx, dz) + width,
    rotY: Math.atan2(dx, dz),
  };
};
const patrolFailures = (placements) => placements.flatMap((placement) => {
  if (!placement.path?.length) return [];
  const points = [[placement.x, placement.z], ...placement.path];
  const failures = [];
  for (let i = 0; i < placement.path.length; i++) {
    const [x, z] = placement.path[i];
    for (const hit of findLayoutOverlaps({ x, z, sx: placement.sx, sz: placement.sz })) {
      failures.push(`${placement.id}-waypoint-${i}/${hit.id}`);
    }
  }
  for (let i = 0; i < points.length; i++) {
    const from = points[i];
    const to = points[(i + 1) % points.length];
    const sweep = sweptPatrolFootprint(placement, from, to, i);
    for (const hit of findLayoutOverlaps(sweep)) failures.push(`${sweep.id}/${hit.id}`);
  }
  return failures;
});

const exteriorNpcFailures = [
  ...placementFailures(EXTERIOR_NPC_PLACEMENTS),
  ...patrolFailures(EXTERIOR_NPC_PLACEMENTS),
];
check(
  'exterior NPC spawns and complete patrol sweeps clear buildings and road lanes',
  exteriorNpcFailures.length === 0,
  exteriorNpcFailures.slice(0, 8).join(', ')
);

const giantPoints = [[SHRIMPLY_PLACEMENT.x, SHRIMPLY_PLACEMENT.z], ...SHRIMPLY_PLACEMENT.path];
const machineryOfficeFacadeZ = LAITRAM_MACHINERY_OFFSET.z + 19.5;
const giantNorthSweepEdge = Math.min(...giantPoints.map(([, z]) => z)) - SHRIMPLY_PLACEMENT.sz / 2;
check(
  'Shrimply Gigantic patrol stays fully south of the modeled Machinery office facade',
  giantNorthSweepEdge > machineryOfficeFacadeZ,
  `patrol edge z=${giantNorthSweepEdge.toFixed(1)}, facade z=${machineryOfficeFacadeZ.toFixed(1)}`
);
const giantFailures = [
  ...placementFailures([SHRIMPLY_PLACEMENT]),
  ...SHRIMPLY_PLACEMENT.path.flatMap(([x, z], index) => (
    findLayoutOverlaps({ x, z, sx: SHRIMPLY_PLACEMENT.sx, sz: SHRIMPLY_PLACEMENT.sz })
      .map((hit) => `shrimply-waypoint-${index}/${hit.id}`)
  )),
];
for (let i = 0; i < giantPoints.length; i++) {
  const sweep = sweptPatrolFootprint(
    SHRIMPLY_PLACEMENT,
    giantPoints[i],
    giantPoints[(i + 1) % giantPoints.length],
    i
  );
  for (const hit of findLayoutOverlaps(sweep)) giantFailures.push(`${sweep.id}/${hit.id}`);
}
check(
  'Shrimply Gigantic circles the Laitram Machinery front lot with canonical clearance',
  giantFailures.length === 0,
  giantFailures.slice(0, 8).join(', ')
);

const cargoFailures = placementFailures([
  ...CARGO_PLACEMENTS,
  MISSION_ITEM_PLACEMENTS.partsBox,
]);
check(
  'cargo footprints clear buildings and road lanes',
  cargoFailures.length === 0,
  cargoFailures.slice(0, 8).join(', ')
);

const vehicleFailures = placementFailures([
  ...PARKED_VEHICLES,
  ...PARKED_CARS,
  GOLF_CART_PARK,
]);
check(
  'fixed vehicle footprints clear buildings and road lanes',
  vehicleFailures.length === 0,
  vehicleFailures.slice(0, 8).join(', ')
);

const rampFailures = placementFailures(RAMP_PLACEMENTS);
const rampClearanceFailures = placementFailures(
  RAMP_PLACEMENTS.flatMap((ramp) => ramp.clearance ? [ramp.clearance] : [])
);
check(
  'ramps and their cart approach/landing zones clear buildings and road lanes',
  rampFailures.length === 0 && rampClearanceFailures.length === 0,
  [...rampFailures, ...rampClearanceFailures].slice(0, 8).join(', ')
);

const exteriorNpcPatrolSweeps = EXTERIOR_NPC_PLACEMENTS.flatMap((placement) => {
  if (!placement.path?.length) return [];
  const points = [[placement.x, placement.z], ...placement.path];
  return points.map((from, index) => sweptPatrolFootprint(
    placement,
    from,
    points[(index + 1) % points.length],
    index
  ));
});
const rampLaneObstacles = [
  ...CARGO_PLACEMENTS,
  ...PARKED_VEHICLES,
  ...PARKED_CARS,
  GOLF_CART_PARK,
  ...EXTERIOR_SIGN_PLACEMENTS,
  ...EXTERIOR_NPC_PLACEMENTS,
  ...exteriorNpcPatrolSweeps,
];
const rampDressingFailures = RAMP_PLACEMENTS.flatMap((ramp) => {
  if (!ramp.clearance) return [];
  return rampLaneObstacles.flatMap((obstacle) => (
    footprintsOverlap(ramp.clearance, placementFootprint(obstacle))
      ? [`${ramp.clearance.id}/${obstacle.id}`]
      : []
  ));
});
check(
  'ramp approach and landing lanes clear fixed dressing and NPC patrols',
  rampDressingFailures.length === 0,
  rampDressingFailures.slice(0, 8).join(', ')
);

const giantPatrolBody = { ...SHRIMPLY_PLACEMENT };
const giantClearancePoints = [
  [giantPatrolBody.x, giantPatrolBody.z],
  ...giantPatrolBody.path,
];
const giantClearanceSweeps = giantClearancePoints.map((from, index) => sweptPatrolFootprint(
  giantPatrolBody,
  from,
  giantClearancePoints[(index + 1) % giantClearancePoints.length],
  index
));
const giantPropObstacles = [
  ...CARGO_PLACEMENTS,
  ...PARKED_VEHICLES,
  ...PARKED_CARS,
  GOLF_CART_PARK,
  ...EXTERIOR_SIGN_PLACEMENTS,
  ...RAMP_PLACEMENTS,
];
const giantPropFailures = giantClearanceSweeps.flatMap((sweep) => (
  giantPropObstacles.flatMap((obstacle) => (
    footprintsOverlap(sweep, placementFootprint(obstacle))
      ? [`${sweep.id}/${obstacle.id}`]
      : []
  ))
));
check(
  'Shrimply Gigantic front-lot patrol clears fixed props',
  giantPropFailures.length === 0,
  giantPropFailures.slice(0, 8).join(', ')
);

const signFailures = placementFailures(EXTERIOR_SIGN_PLACEMENTS);
check(
  'freestanding signs and wayfinding boards clear buildings and road lanes',
  signFailures.length === 0,
  signFailures.slice(0, 8).join(', ')
);

const lotFailures = placementFailures(PARKING_LOTS);
const serviceSurfaceFailures = placementFailures(
  ROADS.filter((road) => road.role === 'service').map((road) => ({
    id: road.id, x: road.cx, z: road.cz, sx: road.sx, sz: road.sz,
  }))
);
check(
  'parking lots and service aprons clear canonical buildings and road lanes',
  lotFailures.length === 0 && serviceSurfaceFailures.length === 0,
  [...lotFailures, ...serviceSurfaceFailures].slice(0, 8).join(', ')
);

const exceptionIds = new Set();
const invalidInteriorExceptions = INTERIOR_NPC_PLACEMENTS.flatMap((placement) => {
  const hits = findLayoutOverlaps({ x: placement.x, z: placement.z, sx: 1.2, sz: 1.2 });
  const named = placement.exceptionId === `interior-furniture:${placement.id}` &&
    placement.furnitureId && placement.reason;
  const narrow = hits.length === 1 && hits[0].type === 'building' && hits[0].id === 'laitram-machinery';
  const unique = !exceptionIds.has(placement.exceptionId);
  exceptionIds.add(placement.exceptionId);
  return named && narrow && unique ? [] : [placement.id];
});
check(
  'interior NPC exceptions are explicitly named and tied to modeled furniture',
  invalidInteriorExceptions.length === 0,
  invalidInteriorExceptions.join(', ')
);

const mountedSignIds = new Set();
const invalidMountedSigns = BUILDING_MOUNTED_SIGN_EXCEPTIONS.flatMap((exception) => {
  const valid = exception.id && exception.buildingId && BUILDING_BY_ID[exception.buildingId] &&
    exception.reason === `wall-mounted on ${exception.buildingId}` && !mountedSignIds.has(exception.id);
  mountedSignIds.add(exception.id);
  return valid ? [] : [exception.id];
});
check(
  'building-mounted sign exceptions are explicit and single-building scoped',
  invalidMountedSigns.length === 0,
  invalidMountedSigns.join(', ')
);

const coffeeException = MISSION_ITEM_PLACEMENTS.coffeePot;
check(
  'interior coffee prop exception names its kitchen counter',
  coffeeException.exceptionId === 'interior-furniture:coffeePot' &&
    coffeeException.furnitureId === 'kitchen-1078a-north-counter'
);

const server = await preview({ preview: { port: 4173, strictPort: true } });
const base = 'http://localhost:4173/Shrimp-Game/';

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});

await page.goto(base + 'preview.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game !== undefined, { timeout: 15000 });
check('game boots (preview.html)', true);

// Trigger the real overlay click handler through the DOM. Puppeteer's
// coordinate-based page.click can wait indefinitely for a WebGL-heavy page
// to finish a compositor hit-test under software rendering.
await page.$eval('#start-overlay', (el) => el.click());
const overlayHidden = await page.$eval('#start-overlay', (el) => el.style.display === 'none');
check('start overlay dismisses', overlayHidden);

await page.keyboard.press('KeyM');
await new Promise((r) => setTimeout(r, 150));
const expandedMap = await page.evaluate(() => {
  const minimap = window.__game.minimap;
  const overlay = document.getElementById('mm-overlay');
  return {
    expanded: minimap._expanded,
    visible: getComputedStyle(overlay).display !== 'none',
    width: minimap._bigCanvas.width,
    height: minimap._bigCanvas.height,
  };
});
check(
  'expanded campus minimap renders',
  expandedMap.expanded && expandedMap.visible && expandedMap.width > 0 && expandedMap.height > 0,
  `${expandedMap.width}x${expandedMap.height}`
);
await page.keyboard.press('KeyM');

// Some current headless Chromium builds suspend requestAnimationFrame even
// while the page reports itself visible. Detect that host-browser quirk and
// drive the game's explicit deterministic frame hook while polling. A normal
// browser continues to use its real animation loop unchanged.
const frameProbeStart = await page.evaluate(() => window.__game.renderer.info.render.frame);
await new Promise((r) => setTimeout(r, 250));
const frameProbeEnd = await page.evaluate(() => window.__game.renderer.info.render.frame);
const manualFramePump = frameProbeEnd <= frameProbeStart;
const hasManualFrameHook = await page.evaluate(() => typeof window.__game.stepFrame === 'function');
if (manualFramePump && hasManualFrameHook) {
  await page.evaluate(() => window.__game.stepFrame(1 / 60));
}
check(
  'animation advances or deterministic headless frame hook is available',
  frameProbeEnd > frameProbeStart || hasManualFrameHook,
  manualFramePump ? 'using deterministic headless frames' : 'requestAnimationFrame active'
);

// --- Polish (Phase 7) ---
const loadingHidden = await page.$eval(
  '#loading-screen',
  (el) => el.style.opacity === '0' || el.style.display === 'none'
);
check('loading screen completed and hidden', loadingHidden);
check('audio manager initialized', await page.evaluate(() => !!window.__game.audio));

const tris = await page.evaluate(() => window.__game.renderer.info.render.triangles);
check('triangle budget under 100k', tris > 0 && tris < 100000, `${tris} triangles`);

const pos = () => page.evaluate(() => {
  const p = window.__game.player.position;
  return { x: p.x, z: p.z };
});
const state = () => page.evaluate(() => window.__game.missions.state);
const teleport = (x, z) => page.evaluate(([tx, tz]) => {
  const p = window.__game.player;
  p.position.set(tx, 0, tz);
}, [x, z]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lmPoint = (x, z) => ({
  x: x + LAITRAM_MACHINERY_OFFSET.x,
  z: z + LAITRAM_MACHINERY_OFFSET.z,
});

async function waitUntil(probe, timeout = 15000, interval = 100) {
  const deadline = Date.now() + timeout;
  do {
    if (manualFramePump) {
      await page.evaluate(() => {
        for (let i = 0; i < 6; i++) window.__game.stepFrame(1 / 60);
      });
    }
    const value = await probe();
    if (value) return value;
    await sleep(interval);
  } while (Date.now() < deadline);
  return null;
}

async function waitForRenderFrames(count = 1, timeout = 15000) {
  const start = await page.evaluate(() => window.__game.renderer.info.render.frame);
  return Boolean(await waitUntil(async () => {
    const frame = await page.evaluate(() => window.__game.renderer.info.render.frame);
    return frame >= start + count;
  }, timeout));
}

// Movement: hold W, expect motion.
const before = await pos();
await page.keyboard.down('KeyW');
const movedEnough = await waitUntil(async () => {
  const current = await pos();
  return Math.hypot(current.x - before.x, current.z - before.z) > 0.5 ? current : null;
});
await page.keyboard.up('KeyW');
const after = movedEnough ?? await pos();
const moved = Math.hypot(after.x - before.x, after.z - before.z);
check('player movement (W)', moved > 0.5, `moved ${moved.toFixed(1)}m`);

// Compare one real Player.update step at each speed. This exercises the same
// movement code without tying the speed ratio to software-renderer cadence.
const speedStep = await page.evaluate(() => {
  const p = window.__game.player;
  const saved = {
    position: p.position.clone(),
    meshPosition: p.mesh.position.clone(),
    yaw: p.yaw,
    heading: p.heading,
    keys: p.keys,
    movementLocked: p.movementLocked,
  };
  const bounds = { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000 };
  const sample = (jogging) => {
    p.position.set(0, 0, 0);
    p.yaw = Math.PI;
    p.keys = { KeyW: true, ShiftLeft: jogging };
    p.movementLocked = false;
    p.update(1 / 60, [], bounds);
    return Math.hypot(p.position.x, p.position.z);
  };
  const walk = sample(false);
  const jog = sample(true);
  p.position.copy(saved.position);
  p.mesh.position.copy(saved.meshPosition);
  p.yaw = saved.yaw;
  p.heading = saved.heading;
  p.keys = saved.keys;
  p.movementLocked = saved.movementLocked;
  return { walk, jog };
});
check(
  'jog is faster than walk',
  speedStep.jog > speedStep.walk * 1.5,
  `${speedStep.walk.toFixed(2)}m vs ${speedStep.jog.toFixed(2)}m per step`
);

// Collision: teleport inside the new Machine Shop shell; should be ejected.
await teleport(12, -32);
const ejectedFromMachineShop = await waitUntil(async () => {
  const current = await pos();
  const inside = current.x > -20.5 && current.x < 44.5 && current.z > -57 && current.z < -7;
  return inside ? null : current;
});
const inMachineShop = ejectedFromMachineShop ?? await pos();
check(
  'Machine Shop collision ejects player',
  Boolean(ejectedFromMachineShop),
  `at ${inMachineShop.x.toFixed(1)},${inMachineShop.z.toFixed(1)}`
);

// Sample open ground inside several retired footprints. These points avoid
// the new shells that intentionally reuse some former building sites.
async function checkOpenGround(name, x, z) {
  await teleport(x, z);
  const advanced = await waitForRenderFrames(1);
  const actual = await pos();
  const displaced = Math.hypot(actual.x - x, actual.z - z);
  check(
    `${name} ghost collider removed`,
    advanced && displaced < 0.1,
    `frame=${advanced ? 'advanced' : 'stalled'}, moved ${displaced.toFixed(2)}m`
  );
}
await checkOpenGround('west Intralox', -125, -27);
await checkOpenGround('5307 Toler', -125, -115);
await checkOpenGround('5306 Toler', -30, -92);
await checkOpenGround('Lapeyre Stair', 105, -100);

// Fence perimeter: closed runs eject the player toward campus while the
// Storey-aligned south gate stays open. These probes exercise the live fence
// colliders, not just the documented rectangles.
async function probeFence(x, z) {
  await teleport(x, z);
  await waitForRenderFrames(2);
  return pos();
}
const northFence = await probeFence(0, -139.5);
check('north fence perimeter blocks passage', northFence.z > -139.1, `z=${northFence.z.toFixed(2)}`);
const westFence = await probeFence(-179.5, 0);
check('west fence perimeter blocks passage', westFence.x > -179.1, `x=${westFence.x.toFixed(2)}`);
const eastFence = await probeFence(179.5, 0);
check('east fence perimeter blocks passage', eastFence.x < 179.1, `x=${eastFence.x.toFixed(2)}`);
const southFence = await probeFence(0, 144);
check('south fence perimeter blocks passage', southFence.z < 143.99, `z=${southFence.z.toFixed(2)}`);
const mainGate = await probeFence(-30, 144);
check(
  'south fence gate stays open on the Storey Street axis',
  Math.abs(mainGate.x + 30) < 0.05 && Math.abs(mainGate.z - 144) < 0.05,
  `at ${mainGate.x.toFixed(2)},${mainGate.z.toFixed(2)}`
);

// Boundary clamp: teleport far outside; should be clamped inside bounds.
await teleport(5000, 5000);
const clampedResult = await waitUntil(async () => {
  const current = await pos();
  return current.x <= 180 && current.z <= 145 ? current : null;
});
const clamped = clampedResult ?? await pos();
check(
  'world boundary clamp',
  Boolean(clampedResult),
  `at ${clamped.x.toFixed(0)},${clamped.z.toFixed(0)}`
);

// R reset.
const configuredSpawn = await page.evaluate(() => {
  const p = window.__game.player.spawn;
  return { x: p.x, z: p.z };
});
check(
  'spawn is on Laitram Lane in front of the Machinery entrance',
  configuredSpawn.x === 51 && configuredSpawn.z === 100,
  `at ${configuredSpawn.x.toFixed(1)},${configuredSpawn.z.toFixed(1)}`
);
await page.keyboard.press('KeyR');
const resetResult = await waitUntil(async () => {
  const current = await pos();
  return Math.hypot(current.x - configuredSpawn.x, current.z - configuredSpawn.z) < 0.1
    ? current
    : null;
});
const reset = resetResult ?? await pos();
check(
  'R resets to configured spawn',
  Boolean(resetResult),
  `at ${reset.x.toFixed(1)},${reset.z.toFixed(1)}`
);

const liveNpcPosition = (id) => page.evaluate((npcId) => {
  const p = window.__game.npcs.get(npcId).group.position;
  return { x: p.x, z: p.z };
}, id);
const liveMissionItemPosition = (property) => page.evaluate((key) => {
  const p = window.__game.missions[key].position;
  return { x: p.x, z: p.z };
}, property);

async function waitForPrompt(text) {
  return Boolean(await waitUntil(() => page.$eval('#prompt', (el, wanted) => (
    el.style.display === 'block' && el.textContent.includes(wanted)
  ), text)));
}

async function approachNpc(id, promptText) {
  const target = await liveNpcPosition(id);
  await teleport(target.x, target.z);
  return waitForPrompt(promptText);
}

async function approachMissionItem(property, promptText) {
  const target = await liveMissionItemPosition(property);
  // Stand just south of the prop rather than on top of its supporting counter,
  // pallet, or dock geometry. Every mission-item radius is at least 2.4 units.
  await teleport(target.x, target.z + 1);
  return waitForPrompt(promptText);
}

// Interact through the real E-key path, then advance the already-open UI via
// its public method so renderer cadence cannot strand a dialogue mid-state.
async function interactAndFinishDialogue(promptText) {
  if (!await waitForPrompt(promptText)) return false;
  await page.keyboard.press('KeyE');
  const opened = await waitUntil(() => page.evaluate(() => window.__game.ui.isDialogueOpen()));
  if (!opened) return false;
  return page.evaluate(() => {
    const ui = window.__game.ui;
    let remaining = 16;
    while (ui.isDialogueOpen() && remaining-- > 0) ui.advanceDialogue();
    return !ui.isDialogueOpen();
  });
}

// --- Mission 1: Missing Wrench ---
check('initial state is M1_TALK', (await state()) === 'M1_TALK');

await approachNpc('gus', 'Talk to Gus');
await interactAndFinishDialogue('Talk to Gus');
const m1Find = await waitUntil(async () => (await state()) === 'M1_FIND');
check('talking to Gus starts wrench hunt', Boolean(m1Find), await state());

// Mission log (Phase 7): Tab opens it with the objective history.
await page.keyboard.press('Tab');
await sleep(150);
const logState = await page.$eval('#mission-log', (el) => ({
  open: el.style.display !== 'none',
  text: el.textContent
}));
check('Tab opens mission log with history', logState.open && logState.text.includes('Mission 1'));
await page.keyboard.press('Tab'); // close it again

const promptShown = await approachMissionItem('wrench', 'Pick up the 10 mm wrench');
check('interaction prompt appears at wrench', promptShown);
if (promptShown) await page.keyboard.press('KeyE');
const m1Return = await waitUntil(async () => (await state()) === 'M1_RETURN');
check('wrench picked up', Boolean(m1Return), await state());

await approachNpc('gus', 'Talk to Gus');
await interactAndFinishDialogue('Talk to Gus');
const m2Talk = await waitUntil(async () => (await state()) === 'M2_TALK');
check('mission 1 complete, mission 2 unlocked', Boolean(m2Talk), await state());

// --- Mission 2: Conveyor Part Delivery ---
await approachNpc('sal', 'Talk to Sal');
await interactAndFinishDialogue('Talk to Sal');
const m2Pickup = await waitUntil(async () => (await state()) === 'M2_PICKUP');
check('talking to Sal starts delivery', Boolean(m2Pickup), await state());

const partsPrompt = await approachMissionItem('partsBox', 'Pick up the parts box');
if (partsPrompt) await page.keyboard.press('KeyE');
const m2Deliver = await waitUntil(async () => (await state()) === 'M2_DELIVER');
check('parts box picked up', Boolean(m2Deliver), await state());

await approachNpc('dot', 'Deliver the parts box to Dot');
await interactAndFinishDialogue('Deliver the parts box to Dot');
const m3Talk = await waitUntil(async () => (await state()) === 'M3_TALK');
check('mission 2 complete, coffee run unlocked', Boolean(m3Talk), await state());

// --- Mission 3: Coffee Run (indoors) ---
await approachNpc('marge', 'Talk to Marge');
await interactAndFinishDialogue('Talk to Marge');
const m3Fetch = await waitUntil(async () => (await state()) === 'M3_FETCH');
check('talking to Marge starts coffee run', Boolean(m3Fetch), await state());

const coffeePrompt = await approachMissionItem('coffeePot', 'Pick up the fresh coffee pot');
if (coffeePrompt) await page.keyboard.press('KeyE');
const m3Return = await waitUntil(async () => (await state()) === 'M3_RETURN');
check('coffee pot picked up', Boolean(m3Return), await state());

await approachNpc('marge', 'Give Marge the coffee pot');
await interactAndFinishDialogue('Give Marge the coffee pot');
const done = await waitUntil(async () => (await state()) === 'DONE');
check('mission 3 complete', Boolean(done), await state());

const completionShown = await page.$eval('#completion', (el) => el.style.display === 'block');
check('completion message shown', completionShown);

// Flavor NPC interaction.
await approachNpc('lou', 'Talk to Lou');
const flavorWorked = await interactAndFinishDialogue('Talk to Lou');
check('flavor NPC dialogue works', flavorWorked);

// --- Interior zone transitions (Phase 4) ---
const zone = () => page.evaluate(() => window.__game.zones.zone);
// Zone detection runs in the sim loop, which ticks slowly under software
// rendering; poll for the expected zone instead of relying on one frame.
const waitZone = (want, ms = 15000) => waitUntil(async () => (
  (await zone()) === want
), ms);

const outsideDoor = lmPoint(35, 24);
await teleport(outsideDoor.x, outsideDoor.z);
const outdoorBeforeEntry = await waitZone('outdoor');
check('outdoor zone before entering', Boolean(outdoorBeforeEntry), await zone());

// Fix the camera heading, hold the real movement key, and wait for the zone
// transition itself. A misplaced doorway collider will still fail this test.
await page.evaluate(() => { window.__game.player.yaw = Math.PI; });
await page.keyboard.down('KeyW');
const enteredLobby = await waitZone('lobby');
await page.keyboard.up('KeyW');
check('walking through front door enters lobby', Boolean(enteredLobby), await zone());

const officeAisle = lmPoint(25, -1.5);
await teleport(officeAisle.x, officeAisle.z);
check('office floor zone detected', Boolean(await waitZone('office_floor')), await zone());

const conference = lmPoint(51, -13);
await teleport(conference.x, conference.z);
check('conference room zone detected', Boolean(await waitZone('conference')), await zone());

const kitchen = lmPoint(18.5, -15.5);
await teleport(kitchen.x, kitchen.z);
check('kitchen zone detected', Boolean(await waitZone('kitchen')), await zone());
check(
  'minimap switches to floor plan indoors',
  Boolean(await waitUntil(() => page.evaluate(() => window.__game.minimap.isIndoorMode())))
);

const lobby = lmPoint(35, 16);
await teleport(lobby.x, lobby.z);
await waitZone('lobby');
await page.evaluate(() => { window.__game.player.yaw = Math.PI; });
await page.keyboard.down('KeyS'); // walk south out the front door
const exitedLobby = await waitZone('outdoor');
await page.keyboard.up('KeyS');
check('walking out restores outdoor zone', Boolean(exitedLobby), await zone());

// --- Punch (Phase 6) ---
// Advance the real punch and NPC behavior APIs by deterministic timesteps.
// This still exercises tryPunch -> hitCheck -> reactToHit -> updateReact.
const punchResult = await page.evaluate(() => {
  const g = window.__game;
  const lou = g.npcs.get('lou');
  const before = lou.group.position.clone();
  g.player.position.set(before.x, 0, before.z - 1.2);
  g.player.mesh.rotation.y = 0;
  g.punch.cooldown = 0;
  g.punch.tryPunch();
  g.punch.update(0.11);
  const reacted = lou.state === 'react';
  g.npcs.update(0.1, performance.now() / 1000, g.player.position, false);
  return {
    reacted,
    moved: Math.hypot(lou.group.position.x - before.x, lou.group.position.z - before.z),
  };
});
check(
  'punch makes NPC flinch back',
  punchResult.reacted && punchResult.moved > 0.2,
  `moved ${punchResult.moved.toFixed(2)}m`
);

// --- Golf cart (Phase 6) ---
const cartDrive = await page.evaluate(() => {
  const g = window.__game;
  const cart = g.cart;
  const resetState = (yaw) => Object.assign(cart.state, {
    yaw, speed: 0, y: 0, vy: 0, airborne: false, crashTimer: 0,
    pitch: 0, roll: 0, velX: 0, velZ: 0, airTime: 0,
    spinTotal: 0, flipTotal: 0, rollTotal: 0, landing: null,
  });
  g.player.position.copy(cart.group.position);
  const canMount = cart.canMount(g.player.position);
  cart.mount();
  const mounted = cart.mounted;
  // Exercise acceleration on a flat, open stretch of Laitram Street.
  cart.group.position.set(-100, 0, 130);
  resetState(Math.PI / 2);
  const before = cart.group.position.clone();
  const input = { forward: true, back: false, left: false, right: false, trick: false };
  const bounds = { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000 };
  for (let i = 0; i < 120; i++) cart.update(1 / 60, input, [], bounds);
  const drove = Math.hypot(cart.group.position.x - before.x, cart.group.position.z - before.z);
  const canDismount = cart.canDismount();
  const spot = cart.dismount();
  g.player.position.copy(spot);
  return { canMount, mounted, drove, dismounted: canDismount && !cart.mounted };
});
check('cart mounts when player is in range', cartDrive.canMount && cartDrive.mounted);
check('cart drives forward', cartDrive.drove > 3, `drove ${cartDrive.drove.toFixed(1)}m`);
check('cart dismounts on the ground', cartDrive.dismounted);

// Drive the live cart from end to end on every named road using the real
// building, furniture, streetlight, and fence colliders. This is the Phase 6
// road-circuit regression check; a misplaced object will stop a run short.
const roadCircuit = await page.evaluate(() => {
  const g = window.__game;
  const cart = g.cart;
  const routes = [
    { id: 'Plantation Rd', from: [-160, -130], to: [160, -130] },
    { id: 'River Rd', from: [-170, -120], to: [-170, 120] },
    { id: 'Laitram St', from: [-160, 126.2], to: [160, 126.2] },
    { id: 'Storey St', from: [-30, -120], to: [-30, 120] },
    { id: 'Toler St', from: [100, -120], to: [100, 120] },
    { id: 'Laitram Ln', from: [15, 100], to: [95, 100] },
  ];
  const input = { forward: true, back: false, left: false, right: false, trick: false };
  const results = [];
  cart.mount();
  for (const route of routes) {
    const dx = route.to[0] - route.from[0];
    const dz = route.to[1] - route.from[1];
    const length = Math.hypot(dx, dz);
    const ux = dx / length;
    const uz = dz / length;
    cart.group.position.set(route.from[0], 0, route.from[1]);
    Object.assign(cart.state, {
      yaw: Math.atan2(dx, dz), speed: 0, y: 0, vy: 0, airborne: false,
      crashTimer: 0, pitch: 0, roll: 0, velX: 0, velZ: 0, airTime: 0,
      spinTotal: 0, flipTotal: 0, rollTotal: 0, landing: null,
    });
    let progress = 0;
    for (let step = 0; step < 3600 && progress < length - 4; step++) {
      cart.update(1 / 60, input, g.colliders, g.bounds);
      progress = (cart.group.position.x - route.from[0]) * ux +
        (cart.group.position.z - route.from[1]) * uz;
    }
    results.push({ id: route.id, progress, length });
  }
  return results;
});
const blockedRoads = roadCircuit.filter((route) => route.progress < route.length - 4);
check(
  'golf cart completes every named-road circuit',
  blockedRoads.length === 0,
  blockedRoads.map((route) => `${route.id} ${route.progress.toFixed(0)}/${route.length.toFixed(0)}m`).join(', ')
);

// --- Ramp jumps & stunt scoring ---
// Step the real cart physics at 60 Hz so software-render time cannot affect
// launch, landing, or scoring.
const wedgeRampRoutes = RAMP_PLACEMENTS
  .filter((ramp) => ramp.type === 'wedge')
  .map((ramp) => ({ id: ramp.id, x: ramp.x, z: ramp.z, yaw: ramp.yaw }));
const rampResult = await page.evaluate((routes) => {
  const g = window.__game;
  const cart = g.cart;
  const bounds = { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000 };
  const drive = { forward: true, back: false, left: false, right: false, trick: false };
  const coast = { forward: false, back: false, left: false, right: false, trick: false };
  const scoreBefore = g.stunts.score;
  const runs = [];
  cart.mount();
  for (const route of routes) {
    // Every wedge faces +Z, with a 30-metre run-up inside its validated lane.
    cart.group.position.set(route.x, 0, route.z - 30);
    Object.assign(cart.state, {
      yaw: route.yaw, speed: 0, y: 0, vy: 0, airborne: false, crashTimer: 0,
      pitch: 0, roll: 0, velX: 0, velZ: 0, airTime: 0,
      spinTotal: 0, flipTotal: 0, rollTotal: 0, landing: null,
    });
    g.player.position.set(route.x, 0, route.z - 30);
    let sawAir = false;
    for (let i = 0; i < 1200; i++) {
      cart.update(1 / 60, drive, g.colliders, bounds);
      if (cart.state.airborne) {
        sawAir = true;
        break;
      }
    }
    for (let i = 0; i < 1200 && cart.state.airborne; i++) {
      cart.update(1 / 60, coast, g.colliders, bounds);
    }
    runs.push({
      id: route.id,
      sawAir,
      landed: sawAir && !cart.state.airborne,
      y: cart.group.position.y,
    });
  }
  g.stuntHud.setDriving(cart.mounted);
  return {
    runs,
    scoreBefore,
    scoreAfter: g.stunts.score,
    hudVisible: document.getElementById('stunt-hud').style.display === 'block',
  };
}, wedgeRampRoutes);
const rampsThatDidNotLaunch = rampResult.runs.filter((run) => !run.sawAir);
const rampsThatDidNotLand = rampResult.runs.filter((run) => !run.landed || run.y >= 0.5);
check(
  'every wedge ramp launches through its live-collider approach lane',
  rampsThatDidNotLaunch.length === 0,
  rampsThatDidNotLaunch.map((run) => run.id).join(', ')
);
check(
  'cart lands beyond every wedge ramp with live world colliders',
  rampsThatDidNotLand.length === 0,
  rampsThatDidNotLand.map((run) => `${run.id} y=${run.y.toFixed(2)}`).join(', ')
);
check(
  'landing awards stunt points',
  rampResult.scoreAfter > rampResult.scoreBefore,
  `score ${rampResult.scoreBefore} -> ${rampResult.scoreAfter}`
);
check('stunt HUD shows while driving', rampResult.hudVisible);

await page.evaluate(() => {
  const g = window.__game;
  if (g.cart.canDismount()) g.player.position.copy(g.cart.dismount());
  g.stuntHud.setDriving(false);
});

// --- Golden Shrimp collectibles ---
// Teleport uses the normal simulation loop: collision resolves before the
// collectible update, so a token left inside a moved shell cannot pass.
const collectibleCount = await page.evaluate(() => window.__game.collectibles.tokens.length);
const unreachableCollectibles = [];
for (let i = 0; i < collectibleCount; i++) {
  const token = await page.evaluate((index) => {
    const t = window.__game.collectibles.tokens[index];
    return { x: t.x, z: t.z, taken: t.taken };
  }, i);
  await teleport(token.x, token.z);
  await waitForRenderFrames(2);
  const reachablePosition = await pos();
  const reachableDistance = Math.hypot(
    reachablePosition.x - token.x,
    reachablePosition.z - token.z
  );
  if (reachableDistance >= 2) {
    unreachableCollectibles.push(
      `#${i + 1} (${token.x},${token.z}) player@${reachablePosition.x.toFixed(1)},${reachablePosition.z.toFixed(1)}`
    );
    continue;
  }
  if (!token.taken) {
    const taken = await waitUntil(() => page.evaluate(
      (index) => window.__game.collectibles.tokens[index].taken,
      i
    ), 5000);
    if (!taken) {
      unreachableCollectibles.push(
        `#${i + 1} (${token.x},${token.z}) did not collect`
      );
    }
  }
}
const collectibleTotal = await page.evaluate(() => ({
  collected: window.__game.collectibles.collected,
  total: window.__game.collectibles.total,
}));
check(
  'all Golden Shrimp are reachable and collectible',
  unreachableCollectibles.length === 0 && collectibleTotal.collected === collectibleTotal.total,
  unreachableCollectibles.join(' | ') ||
    `${collectibleTotal.collected}/${collectibleTotal.total}`
);

// --- Secret sky concert (Phase 6) ---
const concertFlight = await page.evaluate(() => {
  const g = window.__game;
  const p = g.player;
  const cart = g.cart;

  // Space has no vertical effect before a show.
  p.keys = { Space: true };
  p.position.set(-100, 12, 130);
  g.stepFrame(0.25);
  const idleState = g.getFlightState();
  const idleGrounded = Math.abs(p.position.y) < 1e-4;

  // Starting while mounted exposes the ability but defers activation until
  // the player gets back on foot.
  Object.assign(cart.state, {
    y: 0, vy: 0, airborne: false, speed: 0, pitch: 0, roll: 0, crashTimer: 0,
  });
  cart.group.position.set(-100, 0, 130);
  p.position.copy(cart.group.position);
  cart.mount();
  const preConcertWorldTime = g.atmosphere.time;
  g.concert.setTimeScale(1).start();
  const lockedWorldTime = g.atmosphere.time;
  const mountedState = g.getFlightState();
  const spot = cart.dismount();
  p.position.copy(spot);
  p.keys = {};
  g.stepFrame(1 / 60);
  const startedState = g.getFlightState();

  // Hold rise long enough to hit the local 52-unit ceiling.
  p.keys.Space = true;
  for (let i = 0; i < 32; i++) g.stepFrame(0.25);
  p.keys.Space = false;
  const cappedState = g.getFlightState();

  // Flight always retains the normal horizontal playable-area clamp.
  p.position.x = g.bounds.maxX + 100;
  p.position.z = g.bounds.maxZ + 100;
  g.stepFrame(1 / 60);
  const bounded = p.position.x <= g.bounds.maxX - 0.75 + 1e-4 &&
    p.position.z <= g.bounds.maxZ - 0.75 + 1e-4;

  // Restart tears down the old flight motion and gives the new run a fresh,
  // grounded flight state.
  g.concert.start();
  const restartedState = g.getFlightState();
  const restartGround = Math.abs(p.position.y) < 1e-4;

  // Ending above a building must land outside its collider and restore the
  // ordinary ground snap. Space remains inert afterward.
  p.position.set(12, 30, -32);
  p.concertFlight.velocity.y = 7;
  g.concert.stop();
  const restoredWorldTime = g.atmosphere.time;
  const stoppedState = g.getFlightState();
  const clearOfColliders = g.colliders.every((box) => {
    const nearestX = Math.max(box.minX, Math.min(p.position.x, box.maxX));
    const nearestZ = Math.max(box.minZ, Math.min(p.position.z, box.maxZ));
    return Math.hypot(p.position.x - nearestX, p.position.z - nearestZ) >= 0.55 - 1e-4;
  });
  const stoppedY = p.position.y;
  p.keys = { Space: true };
  g.stepFrame(0.25);
  p.keys = {};
  const remainedGrounded = Math.abs(p.position.y - stoppedY) < 1e-4;

  return {
    idleState,
    idleGrounded,
    mountedState,
    startedState,
    cappedState,
    bounded,
    restartedState,
    restartGround,
    stoppedState,
    clearOfColliders,
    remainedGrounded,
    daylightLocked: Math.abs(lockedWorldTime - 0.5) < 1e-6,
    worldTimeRestored: Math.abs(restoredWorldTime - preConcertWorldTime) < 1e-6,
    hint: document.getElementById('concert-flight-hint')?.textContent || '',
  };
});
check(
  'concert flight activates only during a show and waits for cart dismount',
  !concertFlight.idleState.available && !concertFlight.idleState.active && concertFlight.idleGrounded &&
    concertFlight.mountedState.available && !concertFlight.mountedState.active &&
    concertFlight.startedState.active
);
check(
  'concert flight ascent reaches and respects its local height cap',
  concertFlight.cappedState.altitude >= 45 &&
    concertFlight.cappedState.altitude <= concertFlight.cappedState.maxHeight + 1e-3,
  `${concertFlight.cappedState.altitude.toFixed(2)}/${concertFlight.cappedState.maxHeight} units`
);
check('concert flight preserves horizontal world bounds', concertFlight.bounded);
check(
  'concert restart clears flight velocity and starts from ground',
  concertFlight.restartedState.active && concertFlight.restartGround &&
    Math.abs(concertFlight.restartedState.verticalVelocity) < 1e-6
);
check(
  'ending concert safely restores grounded movement',
  !concertFlight.stoppedState.available && !concertFlight.stoppedState.active &&
    Math.abs(concertFlight.stoppedState.verticalVelocity) < 1e-6 &&
    concertFlight.clearOfColliders && concertFlight.remainedGrounded
);
check(
  'concert locks underlying world lighting to daytime and restores the prior clock',
  concertFlight.daylightLocked && concertFlight.worldTimeRestored
);

// Use the director's silent verification clock so all 05:13.6 of cue data can
// be exercised in a few deterministic frames without media-decoder timing.
const concertInterruptions = await page.evaluate(() => {
  const g = window.__game;
  const concert = g.concert;
  concert.setTimeScale(48).start();
  g.stepFrame(0.25);
  const started = concert.debugState();
  const crossShowBefore = concert.debugState();
  concert.startYe();
  const crossShowAfter = concert.debugState();

  // Dialogue continues to advance the show, while the keyboard secret is
  // deliberately ignored until the dialogue closes.
  g.ui.showDialogue('Concert verifier', ['Still running.']);
  const dialogueBefore = concert.time;
  for (const key of 'SICKO') {
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key,
      code: `Key${key}`,
      bubbles: true,
    }));
  }
  g.stepFrame(0.25);
  const dialogueAfter = concert.time;
  g.ui.advanceDialogue();

  // The expanded minimap locks movement, not the concert clock.
  g.minimap.open();
  const mapBefore = concert.time;
  g.stepFrame(0.25);
  const mapAfter = concert.time;
  const mapStayedOpen = g.minimap.isExpanded();
  g.minimap.close();

  // Interior lighting/audio blending and cart state are independent from the
  // director. Direct placement keeps this test focused on interruption.
  g.player.position.set(16 + 18.5, 0, 65 - 15.5);
  const interiorBefore = concert.time;
  g.stepFrame(0.25);
  const interiorAfter = concert.time;
  const interior = g.zones.zone !== 'outdoor';

  Object.assign(g.cart.state, {
    y: 0, vy: 0, airborne: false, speed: 0, pitch: 0, roll: 0,
  });
  g.cart.group.position.set(-100, 0, 130);
  g.player.position.copy(g.cart.group.position);
  const canMount = g.cart.canMount(g.player.position);
  g.cart.mount();
  const cartBefore = concert.time;
  g.stepFrame(0.25);
  const cartAfter = concert.time;
  const mounted = g.cart.mounted;
  const spot = g.cart.dismount();
  g.player.position.copy(spot);

  return {
    started: started.state === 'running' && started.activePerformers.length > 0,
    dialogueAdvanced: dialogueAfter > dialogueBefore,
    dialogueDidNotRestart: dialogueAfter >= dialogueBefore + 10,
    mapAdvanced: mapStayedOpen && mapAfter > mapBefore,
    interiorAdvanced: interior && interiorAfter > interiorBefore,
    cartAdvanced: canMount && mounted && !g.cart.mounted && cartAfter > cartBefore,
    crossShowNoop: crossShowBefore.showId === 'sicko' &&
      crossShowAfter.showId === 'sicko' &&
      crossShowAfter.runId === crossShowBefore.runId &&
      crossShowAfter.time === crossShowBefore.time,
    timeBeforeKeyboardRestart: concert.time,
  };
});
check('concert starts through window.__game', concertInterruptions.started);
check(
  'concert continues through dialogue and ignores secret input during dialogue',
  concertInterruptions.dialogueAdvanced && concertInterruptions.dialogueDidNotRestart
);
check('concert continues with expanded minimap open', concertInterruptions.mapAdvanced);
check('concert continues through LM interior transition', concertInterruptions.interiorAdvanced);
check('concert continues through cart mount/dismount', concertInterruptions.cartAdvanced);
check('starting Ye while the sky show runs is a no-op', concertInterruptions.crossShowNoop);

// Exercise the actual rolling keyboard code outside dialogue. The show clock
// must jump back to zero without layering another performer roster.
await page.keyboard.type('SICKO');
const concertRestart = await page.evaluate((priorTime) => {
  const g = window.__game;
  const immediately = g.concert.debugState();
  g.stepFrame(0.25);
  const afterFrame = g.concert.debugState();
  return {
    reset: immediately.time === 0 && immediately.activePerformers.length === 0,
    advancedFromStart: afterFrame.time > 0 && afterFrame.time < priorTime,
    oneHeadliner: afterFrame.activePerformers.filter((p) => p.id === 'drake').length === 1,
  };
}, concertInterruptions.timeBeforeKeyboardRestart);
check(
  'typing SICKO during a show cleanly restarts it',
  concertRestart.reset && concertRestart.advancedFromStart && concertRestart.oneHeadliner
);

const compressedConcert = await page.evaluate(() => {
  const g = window.__game;
  let guard = 80;
  while (g.concert.state !== 'teardown' && g.concert.state !== 'idle' && guard-- > 0) {
    g.stepFrame(0.25);
  }
  const ended = g.concert.debugState();
  g.stepFrame(1 / 60); // complete director teardown -> idle
  const idle = g.concert.debugState();
  const cueIds = ended.lastRunCueIds;
  return {
    endedState: ended.state,
    idleState: idle.state,
    cueCount: cueIds.length,
    expectedCueCount: ended.expectedCueCount,
    uniqueCueCount: new Set(cueIds).size,
    spawnedIds: ended.spawnedIds,
    activePerformers: ended.activePerformers.length,
    audit: ended.audit,
    flightActiveAtEnd: g.getFlightState().active,
  };
});
check(
  'compressed concert fires every cue exactly once',
  compressedConcert.cueCount === compressedConcert.expectedCueCount &&
    compressedConcert.uniqueCueCount === compressedConcert.expectedCueCount,
  `${compressedConcert.cueCount}/${compressedConcert.expectedCueCount} cues`
);
check(
  'all four concert performers spawned and despawned',
  ['drake', 'travis', 'swae', 'seahawk'].every((id) => compressedConcert.spawnedIds.includes(id)) &&
    compressedConcert.activePerformers === 0
);
check(
  'concert teardown restores scene, lights, and audio graph baseline',
  compressedConcert.audit?.passed === true,
  compressedConcert.audit ? JSON.stringify(compressedConcert.audit.after) : 'missing audit'
);
check(
  'concert returns to idle after showEnd',
  compressedConcert.endedState === 'teardown' && compressedConcert.idleState === 'idle' &&
    !compressedConcert.flightActiveAtEnd
);

// --- Ye earth-stage concert ---
// Exercise the real two-key capture path first, then the public API restart.
await page.evaluate(() => window.__game.concert.setTimeScale(1));
await page.evaluate(({ x, z }) => {
  const g = window.__game;
  Object.assign(g.cart.state, {
    y: 0, vy: 0, airborne: false, speed: 0, pitch: 0, roll: 0, crashTimer: 0,
  });
  g.cart.group.position.set(x, 0, z);
  // Refresh the cart's parked AABB at the future stage center.
  g.cart.dismount();
}, EARTH_STAGE_FOOTPRINT);
await page.keyboard.type('YE');
const yeConcert = await page.evaluate(() => {
  const g = window.__game;
  const concert = g.concert;
  const keyboardStart = concert.debugState();
  const apiAvailable = typeof concert.startYe === 'function';
  const foundStageCollider = g.colliders.find((collider) => (
    collider.id === 'concert-earth-stage-collider'
  ));
  const stageCollider = foundStageCollider || { id: 'missing-stage-collider', x: 0, z: 0, radius: 0 };
  const armingCollisionInstalled = Boolean(foundStageCollider) &&
    concert.flightExclusions.includes(stageCollider);
  const parkedCartDistance = Math.hypot(
    g.cart.group.position.x - stageCollider.x,
    g.cart.group.position.z - stageCollider.z,
  );

  g.player.keys = {};
  g.player.position.set(stageCollider.x, 0, stageCollider.z);
  g.stepFrame(1 / 60);
  const armingPlayerDistance = Math.hypot(
    g.player.position.x - stageCollider.x,
    g.player.position.z - stageCollider.z,
  );

  Object.assign(g.cart.state, {
    y: 0, vy: 0, airborne: false, speed: 0, pitch: 0, roll: 0, crashTimer: 0,
  });
  g.cart.group.position.set(stageCollider.x, 0, stageCollider.z);
  g.player.position.copy(g.cart.group.position);
  g.cart.mount();
  g.stepFrame(1 / 60);
  const armingCartDistance = Math.hypot(
    g.cart.group.position.x - stageCollider.x,
    g.cart.group.position.z - stageCollider.z,
  );
  g.player.position.copy(g.cart.dismount());

  for (let i = 0; i < 8; i++) g.stepFrame(0.25);
  const visualPreRoll = concert.debugState();

  // Same-show activation preserves the original clean-restart contract.
  concert.setTimeScale(48);
  concert.startYe();
  const apiRestart = concert.debugState();

  // The no-argument path selects Sicko, so it must not replace active Ye.
  const crossBefore = concert.debugState();
  concert.start();
  const crossAfter = concert.debugState();

  // Finish compressed pre-roll, then challenge the same stage exclusion once
  // more after the song clock and performer have begun.
  g.stepFrame(0.25);
  g.player.position.set(stageCollider.x, 0, stageCollider.z);
  g.stepFrame(1 / 60);
  const runningPlayerDistance = Math.hypot(
    g.player.position.x - stageCollider.x,
    g.player.position.z - stageCollider.z,
  );

  const lightSnapshots = {};
  let teardownCollisionRetained = false;
  let guard = 80;
  while (concert.state !== 'idle' && guard-- > 0) {
    g.stepFrame(0.25);
    const frame = concert.debugState();
    if (frame.state === 'teardown') {
      teardownCollisionRetained ||= g.colliders.includes(stageCollider) &&
        concert.flightExclusions.includes(stageCollider);
    }
    const profile = frame.staging?.lightProfile;
    if (profile && !lightSnapshots[profile]) {
      lightSnapshots[profile] = {
        visibleBeamCount: frame.staging.visibleBeamCount,
        time: frame.time,
      };
    }
  }
  const idle = concert.debugState();
  const cueIds = idle.lastRunCueIds;
  return {
    keyboardStart,
    visualPreRoll,
    stageCollision: {
      installed: armingCollisionInstalled,
      radius: stageCollider?.radius,
      armingPlayerDistance,
      parkedCartDistance,
      armingCartDistance,
      runningPlayerDistance,
      teardownCollisionRetained,
      removedAtIdle: !g.colliders.includes(stageCollider) &&
        !concert.flightExclusions.includes(stageCollider),
    },
    apiAvailable,
    apiRestarted: apiRestart.showId === 'ye' && apiRestart.runId === keyboardStart.runId + 1 &&
      apiRestart.time === 0,
    crossShowNoop: crossAfter.showId === 'ye' && crossAfter.runId === crossBefore.runId &&
      crossAfter.time === crossBefore.time,
    idle,
    cueCount: cueIds.length,
    expectedCueCount: idle.expectedCueCount,
    uniqueCueCount: new Set(cueIds).size,
    exactCueSet: idle.expectedCueIds.every((id) => cueIds.includes(id)),
    everyHornBreakHasPyro: [1, 2, 3, 4, 5].every((number) => (
      idle.expectedCueIds.includes(`horn-break-${number}-fireworks`)
    )),
    lightSnapshots,
    flightActive: g.getFlightState().active,
  };
});
check(
  'typing Y-E selects the Ye earth-stage show',
  yeConcert.keyboardStart.showId === 'ye' && yeConcert.keyboardStart.state === 'arming'
);
check(
  'Ye arming is a deterministic visual pre-roll before song time and cues',
  yeConcert.visualPreRoll.state === 'arming' &&
    yeConcert.visualPreRoll.time === 0 &&
    yeConcert.visualPreRoll.firedCueIds.length === 0 &&
    yeConcert.visualPreRoll.armingProgress > 0 &&
    yeConcert.visualPreRoll.armingProgress < 1 &&
    yeConcert.visualPreRoll.staging?.stageLevel > 0 &&
    yeConcert.visualPreRoll.staging.stageLevel < 1
);
check(
  'Earth mound collision protects flight, carts, running, and teardown lifecycle',
  yeConcert.stageCollision.installed &&
    yeConcert.stageCollision.armingPlayerDistance >= yeConcert.stageCollision.radius + 0.55 - 1e-3 &&
    yeConcert.stageCollision.parkedCartDistance >= yeConcert.stageCollision.radius + 1.2 - 1e-3 &&
    yeConcert.stageCollision.armingCartDistance >= yeConcert.stageCollision.radius + 1.2 - 1e-3 &&
    yeConcert.stageCollision.runningPlayerDistance >= yeConcert.stageCollision.radius + 0.55 - 1e-3 &&
    yeConcert.stageCollision.teardownCollisionRetained &&
    yeConcert.stageCollision.removedAtIdle,
  JSON.stringify(yeConcert.stageCollision)
);
check('window.__game.concert.startYe is available and restart-safe', yeConcert.apiAvailable && yeConcert.apiRestarted);
check('starting the sky show while Ye runs is a no-op', yeConcert.crossShowNoop);
check(
  'compressed Ye show fires every cue exactly once',
  yeConcert.cueCount === yeConcert.expectedCueCount &&
    yeConcert.uniqueCueCount === yeConcert.expectedCueCount && yeConcert.exactCueSet,
  `${yeConcert.cueCount}/${yeConcert.expectedCueCount} cues`
);
check('all five Ye horn breaks have authored fireworks', yeConcert.everyHornBreakHasPyro);
check(
  'Ye spawns and despawns on the earth stage',
  yeConcert.idle.spawnedIds.includes('ye') && yeConcert.idle.activePerformers.length === 0
);
check(
  'Ye teardown restores scene, lights, and audio graph baseline',
  yeConcert.idle.audit?.passed === true,
  yeConcert.idle.audit ? JSON.stringify(yeConcert.idle.audit.after) : 'missing audit'
);
check(
  'Ye four-second teardown returns to idle with flight off',
  yeConcert.idle.state === 'idle' && !yeConcert.flightActive
);
check(
  'Ye renders sparse, rising, multicolor-climax, and all-column finale programs',
  ['horn-sparse', 'horn-rising', 'bridge-climax', 'finale'].every((profile) => (
    yeConcert.lightSnapshots[profile]
  )) &&
    yeConcert.lightSnapshots['horn-sparse'].visibleBeamCount <
      yeConcert.lightSnapshots.finale.visibleBeamCount,
  JSON.stringify(yeConcert.lightSnapshots)
);

// An explicit stop is not the authored four-second sink. It must retire the
// visuals and director synchronously so the other concert can start at once.
const forcedYeStop = await page.evaluate(() => {
  const g = window.__game;
  const concert = g.concert;
  concert.startYe();
  g.stepFrame(0.1);
  concert.stop();
  const stopped = concert.debugState();
  concert.start();
  const skyStarted = concert.debugState();
  concert.stop();
  return {
    stopped,
    skyStarted,
    finalState: concert.debugState(),
  };
});
check(
  'forced Ye stop is synchronous and immediately releases the sky show',
  forcedYeStop.stopped.state === 'idle' &&
    forcedYeStop.stopped.activePerformers.length === 0 &&
    forcedYeStop.stopped.staging?.active === false &&
    forcedYeStop.skyStarted.showId === 'sicko' &&
    forcedYeStop.skyStarted.state === 'running' &&
    forcedYeStop.finalState.state === 'idle'
);

// The main page has finished all frame-driven checks. Stop its continuous
// software-WebGL loop so secondary-page navigation is not starved in CI.
await page.evaluate(() => window.__game.renderer.setAnimationLoop(null));

// The standalone carousel is registry-driven; a direct Ye load prevents an
// unknown-id fallback from silently rendering the Travis model instead.
const performerPage = await browser.newPage();
performerPage.setDefaultNavigationTimeout(90000);
performerPage.on('pageerror', (e) => consoleErrors.push(`performer: ${String(e)}`));
performerPage.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(`performer: ${m.text()}`);
});
await performerPage.goto(base + 'performers.html?performer=ye&bpm=142', { waitUntil: 'domcontentloaded' });
await performerPage.waitForFunction(() => window.__performerHarness !== undefined, { timeout: 15000 });
const yeHarness = await performerPage.evaluate(() => {
  window.__performerHarness.pump(2, 1 / 30);
  const performer = window.__performerHarness.performers[0];
  return {
    id: performer?.id,
    visible: Boolean(performer?.root?.visible),
    state: performer?.state,
  };
});
check(
  'standalone performer harness loads Ye at 142 BPM',
  yeHarness.id === 'ye' && yeHarness.visible && ['spawning', 'performing'].includes(yeHarness.state)
);
await performerPage.close();

// A separate low-tier mobile page covers the real seven-tap activation path
// and refresh behavior without disturbing the completed mission run above.
const mobilePage = await browser.newPage();
mobilePage.setDefaultNavigationTimeout(90000);
await mobilePage.setViewport({ width: 820, height: 680, isMobile: true, hasTouch: true });
mobilePage.on('pageerror', (e) => consoleErrors.push(`mobile: ${String(e)}`));
mobilePage.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(`mobile: ${m.text()}`);
});
await mobilePage.goto(base + 'preview.html?mobile=1&quality=low', { waitUntil: 'domcontentloaded' });
await mobilePage.waitForFunction(() => window.__game !== undefined, { timeout: 15000 });
await mobilePage.$eval('#start-overlay', (el) => el.click());
const mobileConcert = await mobilePage.evaluate(() => {
  const clock = document.getElementById('clock');
  for (let i = 0; i < 7; i++) {
    clock.dispatchEvent(new PointerEvent('pointerdown', {
      pointerId: i + 1,
      pointerType: 'touch',
      bubbles: true,
      cancelable: true,
    }));
  }
  const tappedState = window.__game.concert.state;
  window.__game.concert.setTimeScale(10);
  window.__game.stepFrame(0.1);
  const debug = window.__game.concert.debugState();
  const triangles = window.__game.renderer.info.render.triangles;
  const rise = document.querySelector('.flight-btn.rise');
  const down = document.querySelector('.flight-btn.descend');
  rise.dispatchEvent(new PointerEvent('pointerdown', {
    pointerId: 90, pointerType: 'touch', bubbles: true, cancelable: true,
  }));
  down.dispatchEvent(new PointerEvent('pointerdown', {
    pointerId: 91, pointerType: 'touch', bubbles: true, cancelable: true,
  }));
  const simultaneousFlightButtons = window.__game.player.keys.Space && window.__game.player.keys.KeyC;
  rise.dispatchEvent(new PointerEvent('pointerup', {
    pointerId: 90, pointerType: 'touch', bubbles: true, cancelable: true,
  }));
  down.dispatchEvent(new PointerEvent('pointerup', {
    pointerId: 91, pointerType: 'touch', bubbles: true, cancelable: true,
  }));
  return {
    tappedState,
    debug,
    triangles,
    touchClass: document.body.classList.contains('touch-device'),
    flightButtonsVisible: getComputedStyle(document.getElementById('flight-buttons')).display !== 'none',
    simultaneousFlightButtons,
    flightHint: document.getElementById('concert-flight-hint')?.textContent || '',
  };
});
check(
  'seven rapid clock taps start the mobile concert',
  mobileConcert.touchClass && ['arming', 'running'].includes(mobileConcert.tappedState) &&
    mobileConcert.debug.state === 'running'
);
check(
  'mobile concert uses the forced low tier within the render budget',
  mobileConcert.debug.quality === 'low' && mobileConcert.triangles > 0 && mobileConcert.triangles < 120000,
  `${mobileConcert.triangles} triangles`
);
check(
  'mobile concert exposes simultaneous RISE and DOWN flight controls',
  mobileConcert.flightButtonsVisible && mobileConcert.simultaneousFlightButtons &&
    mobileConcert.flightHint.includes('RISE / DOWN')
);

await mobilePage.evaluate(() => window.__game.renderer.setAnimationLoop(null));
await mobilePage.reload({ waitUntil: 'domcontentloaded' });
await mobilePage.waitForFunction(() => window.__game !== undefined, { timeout: 15000 });
const refreshedIdle = await mobilePage.evaluate(() => window.__game.concert.state === 'idle');
check('refreshing mid-show boots a clean idle concert', refreshedIdle);

await mobilePage.evaluate(() => window.__game.renderer.setAnimationLoop(null));
await mobilePage.goto(base + 'preview.html?mobile=1&quality=low&concert=1', { waitUntil: 'domcontentloaded' });
await mobilePage.waitForFunction(() => window.__game !== undefined, { timeout: 15000 });
await mobilePage.$eval('#start-overlay', (el) => el.click());
const autostarted = await mobilePage.evaluate(() => ['arming', 'running'].includes(window.__game.concert.state));
check('?concert=1 autostarts after the start overlay', autostarted);

await mobilePage.evaluate(() => window.__game.renderer.setAnimationLoop(null));
await mobilePage.goto(base + 'preview.html?mobile=1&quality=low&concert=ye', { waitUntil: 'domcontentloaded' });
await mobilePage.waitForFunction(() => window.__game !== undefined, { timeout: 15000 });
await mobilePage.$eval('#start-overlay', (el) => el.click());
const yeAutostarted = await mobilePage.evaluate(() => {
  const debug = window.__game.concert.debugState();
  return ['arming', 'running'].includes(debug.state) && debug.showId === 'ye';
});
check('?concert=ye autostarts the earth-stage show after the start overlay', yeAutostarted);

// This is a fresh document/audio graph. Complete visual pre-roll at normal
// speed, allow the persistent three-node media branch to connect, then prove
// the first-ever stop is treated as clean rather than as a structural leak.
await mobilePage.evaluate(() => {
  for (let i = 0; i < 16; i++) window.__game.stepFrame(0.25);
});
await mobilePage.waitForFunction(() => (
  window.__game.audio.concertSource || window.__game.concert.mediaStatus === 'unavailable'
), { timeout: 15000 });
const firstRunAudit = await mobilePage.evaluate(() => {
  const concert = window.__game.concert;
  concert.stop();
  return concert.debugState().audit;
});
check(
  'a fresh page first-run stop accepts only the persistent three-node media branch',
  firstRunAudit?.passed === true &&
    firstRunAudit.before.audio.connectedConcertNodes === 0 &&
    firstRunAudit.after.audio.connectedConcertNodes === 3 &&
    firstRunAudit.after.audio.active === false,
  firstRunAudit ? JSON.stringify(firstRunAudit) : 'missing audit'
);
await mobilePage.close();

// Objective text sanity.
const objective = await page.$eval('#objective-text', (el) => el.textContent);
check('objective shows free exploration', objective.includes('Explore'), objective);

const concertDispose = await page.evaluate(() => {
  const g = window.__game;
  const media = document.getElementById('concert-media');
  const hud = document.getElementById('concert-debug');
  g.concert.startYe();
  g.stepFrame(0.1);
  g.concert.dispose();
  const disposedState = g.concert.debugState();
  const restoredWorldTime = g.atmosphere.time;
  const restoredConcertTime = g.atmosphere._concertTime;
  const runId = disposedState.runId;
  const spawnResult = g.concert.debugSpawn('ye');
  g.concert.startYe();
  const afterReuseAttempts = g.concert.debugState();
  return {
    state: g.concert.state,
    mediaRemoved: !media?.isConnected,
    hudRemoved: !hud?.isConnected,
    audioReleased: g.audio.concertMediaElement == null &&
      g.audio.concertSource == null && g.audio.concertLowpass == null &&
      g.audio.concertGain == null,
    disposed: disposedState.disposed,
    reuseNoop: spawnResult == null && afterReuseAttempts.runId === runId &&
      afterReuseAttempts.state === 'idle' && afterReuseAttempts.activePerformers.length === 0,
    daylightRestored: restoredConcertTime == null &&
      g.atmosphere._concertTime == null && g.atmosphere.time === restoredWorldTime,
  };
});
check(
  'concert dispose releases owned DOM and Web Audio media nodes',
  concertDispose.state === 'idle' && concertDispose.mediaRemoved &&
    concertDispose.hudRemoved && concertDispose.audioReleased &&
    concertDispose.disposed && concertDispose.reuseNoop && concertDispose.daylightRestored,
  JSON.stringify(concertDispose)
);

check('no page errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

if (!manualFramePump) {
  await page.screenshot({ path: '/tmp/shrimp-game-verify.png' });
} else {
  console.log('INFO - skipped Puppeteer screenshot because this headless Chromium compositor is suspended');
}

await browser.close();
await server.close();

if (FAILURES.length) {
  console.log(`\n${FAILURES.length} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed');
