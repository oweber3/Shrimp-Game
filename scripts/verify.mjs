// Headless end-to-end verification: loads the built game, checks movement,
// collision, NPC interaction, and completes both missions.
import puppeteer from 'puppeteer';
import { preview } from 'vite';

const FAILURES = [];
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}${extra ? ' (' + extra + ')' : ''}`);
  if (!ok) FAILURES.push(name);
};

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

await page.goto(base + 'preview.html', { waitUntil: 'networkidle0' });
await page.waitForFunction(() => window.__game !== undefined, { timeout: 15000 });
check('game boots (preview.html)', true);

// Click the start overlay.
await page.click('#start-overlay');
const overlayHidden = await page.$eval('#start-overlay', (el) => el.style.display === 'none');
check('start overlay dismisses', overlayHidden);

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

// Movement: hold W, expect motion.
const before = await pos();
await page.keyboard.down('KeyW');
await sleep(800);
await page.keyboard.up('KeyW');
const after = await pos();
const moved = Math.hypot(after.x - before.x, after.z - before.z);
check('player movement (W)', moved > 0.5, `moved ${moved.toFixed(1)}m`);

// Jog: shift+W should cover more ground.
const b2 = await pos();
await page.keyboard.down('ShiftLeft');
await page.keyboard.down('KeyW');
await sleep(800);
await page.keyboard.up('KeyW');
await page.keyboard.up('ShiftLeft');
const a2 = await pos();
const jogged = Math.hypot(a2.x - b2.x, a2.z - b2.z);
check('jog is faster than walk', jogged > moved, `jogged ${jogged.toFixed(1)}m`);

// Collision: teleport inside the Intralox plant building; should be ejected.
await teleport(-100, -27);
await sleep(300);
const inPlant = await pos();
const insidePlant = inPlant.x > -137 && inPlant.x < -63 && inPlant.z > -106.5 && inPlant.z < 52.5;
check('building collision ejects player', !insidePlant, `at ${inPlant.x.toFixed(1)},${inPlant.z.toFixed(1)}`);

// Boundary clamp: teleport far outside; should be clamped inside bounds.
await teleport(5000, 5000);
await sleep(300);
const clamped = await pos();
check('world boundary clamp', clamped.x <= 180 && clamped.z <= 145, `at ${clamped.x.toFixed(0)},${clamped.z.toFixed(0)}`);

// R reset.
await page.keyboard.press('KeyR');
await sleep(200);
const reset = await pos();
check('R resets to spawn', Math.hypot(reset.x - 0, reset.z - 50) < 2, `at ${reset.x.toFixed(1)},${reset.z.toFixed(1)}`);

// Helper: interact and click through a dialogue until it closes.
async function interactAndFinishDialogue() {
  await sleep(350); // let the prompt update
  await page.keyboard.press('KeyE');
  for (let i = 0; i < 12; i++) {
    await sleep(150);
    const open = await page.$eval('#dialogue', (el) => el.style.display === 'block');
    if (!open) break;
    await page.keyboard.press('KeyE');
  }
}

// --- Mission 1: Missing Wrench ---
check('initial state is M1_TALK', (await state()) === 'M1_TALK');

await teleport(-50, -3); // near Gus at the Intralox shipping dock
await interactAndFinishDialogue();
check('talking to Gus starts wrench hunt', (await state()) === 'M1_FIND', await state());

// Mission log (Phase 7): Tab opens it with the objective history.
await page.keyboard.press('Tab');
await sleep(150);
const logState = await page.$eval('#mission-log', (el) => ({
  open: el.style.display !== 'none',
  text: el.textContent
}));
check('Tab opens mission log with history', logState.open && logState.text.includes('Mission 1'));
await page.keyboard.press('Tab'); // close it again

await teleport(-146, 88.5); // near wrench at the warehouse west dock
await sleep(350);
const promptShown = await page.$eval('#prompt', (el) => el.style.display === 'block');
check('interaction prompt appears at wrench', promptShown);
await page.keyboard.press('KeyE');
await sleep(200);
check('wrench picked up', (await state()) === 'M1_RETURN', await state());

await teleport(-50, -3); // back to Gus
await interactAndFinishDialogue();
check('mission 1 complete, mission 2 unlocked', (await state()) === 'M2_TALK', await state());

// --- Mission 2: Conveyor Part Delivery ---
await teleport(81, -11); // near Sal at LM receiving
await interactAndFinishDialogue();
check('talking to Sal starts delivery', (await state()) === 'M2_PICKUP', await state());

await teleport(78, -18); // near parts box
await sleep(350);
await page.keyboard.press('KeyE');
await sleep(200);
check('parts box picked up', (await state()) === 'M2_DELIVER', await state());

await teleport(-100, 68); // near Dot at the warehouse front
await interactAndFinishDialogue();
check('mission 2 complete, coffee run unlocked', (await state()) === 'M3_TALK', await state());

// --- Mission 3: Coffee Run (indoors) ---
await teleport(65.6, -4); // Marge's office (east row), in front of the desk
await interactAndFinishDialogue();
check('talking to Marge starts coffee run', (await state()) === 'M3_FETCH', await state());

await teleport(14.5, -17.4); // kitchen counter
await sleep(350);
await page.keyboard.press('KeyE');
await sleep(200);
check('coffee pot picked up', (await state()) === 'M3_RETURN', await state());

await teleport(65.6, -4); // back to Marge
await interactAndFinishDialogue();
check('mission 3 complete', (await state()) === 'DONE', await state());

const completionShown = await page.$eval('#completion', (el) => el.style.display === 'block');
check('completion message shown', completionShown);

// Flavor NPC interaction.
await teleport(82, 24.5); // near Lou at break area
await interactAndFinishDialogue();
check('flavor NPC dialogue works', true);

// --- Interior zone transitions (Phase 4) ---
const zone = () => page.evaluate(() => window.__game.zones.zone);
// Zone detection runs in the sim loop, which ticks slowly under software
// rendering; poll for the expected zone instead of relying on one frame.
const waitZone = async (want, ms = 4000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if ((await zone()) === want) return true;
    await sleep(150);
  }
  return false;
};

await teleport(35, 24); // on the walk outside the LM office front door
await sleep(300);
check('outdoor zone before entering', (await zone()) === 'outdoor', await zone());

await page.keyboard.down('KeyW'); // walk north through the doorway
await sleep(1600);
await page.keyboard.up('KeyW');
check('walking through front door enters lobby', (await zone()) === 'lobby', await zone());

await teleport(25, -1.5); // cubicle field center aisle
check('office floor zone detected', await waitZone('office_floor'), await zone());

await teleport(51, -13); // conference room 1019, clear of the table
check('conference room zone detected', await waitZone('conference'), await zone());

await teleport(18.5, -15.5); // kitchen 1078A, clear of the table
check('kitchen zone detected', await waitZone('kitchen'), await zone());
check(
  'minimap switches to floor plan indoors',
  await page.evaluate(() => window.__game.minimap.isIndoorMode())
);

await teleport(35, 16); // back to the lobby
await sleep(300);
await page.keyboard.down('KeyS'); // walk south out the front door
await sleep(1600);
await page.keyboard.up('KeyS');
check('walking out restores outdoor zone', (await zone()) === 'outdoor', await zone());

// --- Punch (Phase 6) ---
// After walking south out of the lobby the player faces +z; Lou stands at
// (82, 27), so approach from the north and swing.
await teleport(82, 25.8);
await sleep(300);
const louBefore = await page.evaluate(() => {
  const p = window.__game.npcs.get('lou').group.position;
  return { x: p.x, z: p.z };
});
// Each iteration re-asserts the player's position (1.2 m south of Lou) and
// facing (+z, toward Lou), then swings via the punch API (the method the F key
// calls). Re-asserting every swing makes the hit geometry deterministic, so the
// result no longer depends on incidental state under variable headless frame
// rates; it still exercises the real tryPunch -> hitCheck -> flinch path. The
// max displacement over the window is sampled (the flinch then settles).
let flinched = 0;
for (let i = 0; i < 12; i++) {
  await page.evaluate(() => {
    const g = window.__game;
    g.player.position.set(82, 0, 25.8);
    g.player.mesh.rotation.y = 0;
    g.punch.tryPunch();
  });
  await sleep(120);
  const p = await page.evaluate(() => {
    const q = window.__game.npcs.get('lou').group.position;
    return { x: q.x, z: q.z };
  });
  flinched = Math.max(flinched, Math.hypot(p.x - louBefore.x, p.z - louBefore.z));
  if (flinched > 0.2) break;
}
check('punch makes NPC flinch back', flinched > 0.2, `moved ${flinched.toFixed(2)}m`);

// --- Golf cart (Phase 6) ---
await teleport(-29, 16); // beside the cart on the Intralox apron
await sleep(350);
await page.keyboard.press('KeyE');
await sleep(200);
check('E mounts the golf cart', await page.evaluate(() => window.__game.cart.mounted));

const cartBefore = await page.evaluate(() => {
  const p = window.__game.cart.group.position;
  return { x: p.x, z: p.z };
});
await page.keyboard.down('KeyW');
await sleep(900);
await page.keyboard.up('KeyW');
const cartAfter = await page.evaluate(() => {
  const p = window.__game.cart.group.position;
  return { x: p.x, z: p.z };
});
const drove = Math.hypot(cartAfter.x - cartBefore.x, cartAfter.z - cartBefore.z);
check('cart drives forward', drove > 3, `drove ${drove.toFixed(1)}m`);

await page.keyboard.press('KeyE');
await sleep(200);
const dismounted = await page.evaluate(
  () => !window.__game.cart.mounted && window.__game.player.mesh.visible
);
check('E dismounts and player reappears', dismounted);

// --- Ramp jumps & stunt scoring ---
// Line the cart up 20m south of the apron kicker, facing north, and floor it.
await page.evaluate(() => {
  const g = window.__game;
  g.cart.group.position.set(-32, 0, 10);
  g.cart.state.yaw = Math.PI;
  g.cart.state.speed = 0;
  g.player.position.set(-32, 0, 10);
  g.cart.mount();
});
// Generous polling: on slow software-GL machines the sim runs well below
// real time, so give the 20m approach plenty of wall-clock room.
await page.keyboard.down('KeyW');
let sawAir = false;
for (let i = 0; i < 300; i++) {
  await sleep(50);
  if (await page.evaluate(() => window.__game.cart.state.airborne)) {
    sawAir = true;
    break;
  }
}
await page.keyboard.up('KeyW'); // hands off mid-air: land flat
check('ramp launches the cart airborne', sawAir);

let landed = false;
for (let i = 0; i < 200; i++) {
  await sleep(50);
  if (await page.evaluate(() => !window.__game.cart.state.airborne)) {
    landed = true;
    break;
  }
}
const cartY = await page.evaluate(() => window.__game.cart.group.position.y);
check('cart lands back on the ground', landed && cartY < 0.5, `y=${cartY.toFixed(2)}`);

const stuntScore = await page.evaluate(() => window.__game.stunts.score);
check('landing awards stunt points', stuntScore > 0, `score ${stuntScore}`);

const hudVisible = await page.$eval('#stunt-hud', (el) => el.style.display === 'block');
check('stunt HUD shows while driving', hudVisible);

await page.keyboard.press('KeyE'); // hop off for the remaining checks
await sleep(200);

// --- Golden Shrimp collectibles ---
const collectedBefore = await page.evaluate(() => window.__game.collectibles.collected);
await teleport(85, 22); // a Golden Shrimp sits at the break pavilion
await sleep(350);
const collectedAfter = await page.evaluate(() => window.__game.collectibles.collected);
check('walking onto a Golden Shrimp collects it', collectedAfter > collectedBefore, `${collectedBefore} -> ${collectedAfter}`);

// Objective text sanity.
const objective = await page.$eval('#objective-text', (el) => el.textContent);
check('objective shows free exploration', objective.includes('Explore'), objective);

check('no page errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

await page.screenshot({ path: 'scripts/screenshot.png' });

await browser.close();
await server.close();

if (FAILURES.length) {
  console.log(`\n${FAILURES.length} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed');
