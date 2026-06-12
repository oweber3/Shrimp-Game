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

// Collision: teleport inside the plant building; should be ejected.
await teleport(70, -75);
await sleep(300);
const inPlant = await pos();
const insidePlant = inPlant.x > 5.2 && inPlant.x < 134.8 && inPlant.z > -104.8 && inPlant.z < -45.2;
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
check('R resets to spawn', Math.hypot(reset.x - 0, reset.z - 118) < 2, `at ${reset.x.toFixed(1)},${reset.z.toFixed(1)}`);

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

await teleport(45, -30); // near Gus
await interactAndFinishDialogue();
check('talking to Gus starts wrench hunt', (await state()) === 'M1_FIND', await state());

await teleport(-146, -62); // near wrench at west dock
await sleep(350);
const promptShown = await page.$eval('#prompt', (el) => el.style.display === 'block');
check('interaction prompt appears at wrench', promptShown);
await page.keyboard.press('KeyE');
await sleep(200);
check('wrench picked up', (await state()) === 'M1_RETURN', await state());

await teleport(45, -30); // back to Gus
await interactAndFinishDialogue();
check('mission 1 complete, mission 2 unlocked', (await state()) === 'M2_TALK', await state());

// --- Mission 2: Conveyor Part Delivery ---
await teleport(116, -29); // near Sal
await interactAndFinishDialogue();
check('talking to Sal starts delivery', (await state()) === 'M2_PICKUP', await state());

await teleport(112, -32.5); // near parts box
await sleep(350);
await page.keyboard.press('KeyE');
await sleep(200);
check('parts box picked up', (await state()) === 'M2_DELIVER', await state());

await teleport(-100, -47); // near Dot
await interactAndFinishDialogue();
check('mission 2 complete', (await state()) === 'DONE', await state());

const completionShown = await page.$eval('#completion', (el) => el.style.display === 'block');
check('completion message shown', completionShown);

// Flavor NPC interaction.
await teleport(-23, -43); // near Lou at break area
await interactAndFinishDialogue();
check('flavor NPC dialogue works', true);

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
