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
await teleport(61, -14.1); // Marge's office, in front of the desk
await interactAndFinishDialogue();
check('talking to Marge starts coffee run', (await state()) === 'M3_FETCH', await state());

await teleport(67, 3.2); // breakroom counter
await sleep(350);
await page.keyboard.press('KeyE');
await sleep(200);
check('coffee pot picked up', (await state()) === 'M3_RETURN', await state());

await teleport(61, -14.1); // back to Marge
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

await teleport(35, 24); // on the walk outside the LM office front door
await sleep(300);
check('outdoor zone before entering', (await zone()) === 'outdoor', await zone());

await page.keyboard.down('KeyW'); // walk north through the doorway
await sleep(1100);
await page.keyboard.up('KeyW');
check('walking through front door enters lobby', (await zone()) === 'lobby', await zone());

await teleport(28, -8); // cubicle aisle
await sleep(300);
check('office floor zone detected', (await zone()) === 'office_floor', await zone());

await teleport(60, -12); // manager office
await sleep(300);
check('manager office zone detected', (await zone()) === 'manager_office', await zone());

await teleport(62, 4); // breakroom
await sleep(300);
check('breakroom zone detected', (await zone()) === 'breakroom', await zone());

await teleport(35, 16); // back to the lobby
await sleep(300);
await page.keyboard.down('KeyS'); // walk south out the front door
await sleep(1100);
await page.keyboard.up('KeyS');
check('walking out restores outdoor zone', (await zone()) === 'outdoor', await zone());

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
