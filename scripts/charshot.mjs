// Character close-up screenshots for visual verification of the realism pass.
// Frames the player shrimp, an NPC worker, Gerald, and Shrimply Gigantic by
// taking over the camera directly (the in-game camera only ever shows backs).
// Not part of CI. Usage: node scripts/charshot.mjs
import puppeteer from 'puppeteer';
import { preview } from 'vite';

const server = await preview({ preview: { port: 4175, strictPort: true } });
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 1000 });
await page.goto('http://localhost:4175/Shrimp-Game/preview.html', { waitUntil: 'networkidle0' });
await page.waitForFunction(() => window.__game !== undefined, { timeout: 15000 });
await page.click('#start-overlay');

// Freeze the sim/camera/AI and set bright midday (time is a 0..1 fraction;
// 0.5 = noon) so surface detail reads well.
await page.evaluate(() => {
  const g = window.__game;
  g.player.update = () => {};
  g.npcs.update = () => {};
  g.player.mesh.position.set(0, 0, 9999);
  if (g.atmosphere) { g.atmosphere.autoRun = false; g.atmosphere.time = 0.5; }
});
await new Promise((r) => setTimeout(r, 300));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Turn a character to face +Z, then frame the camera in front of it.
async function shotNPC(name, id, headY, dist = 2.6, camY = 0.25) {
  const target = await page.evaluate(([nid]) => {
    const n = window.__game.npcs.npcs.find((x) => x.def.id === nid);
    n.group.rotation.y = 0;        // face +Z (toward the camera)
    n.group.rotation.z = 0;
    const p = n.group.position;
    return [p.x, p.z];
  }, [id]);
  await page.evaluate(([t, hy, d, cy]) => {
    const cam = window.__game.player.camera;
    cam.position.set(t[0], hy + cy, t[1] + d);
    cam.lookAt(t[0], hy, t[1]);
  }, [target, headY, dist, camY]);
  await sleep(600);
  await page.screenshot({ path: `scripts/${name}.png` });
  console.log('Saved scripts/' + name + '.png');
}

await shotNPC('char-worker', 'gus', 1.7, 2.4, 0.2);   // standard worker
await shotNPC('char-gerald', 'gerald', 1.75, 2.4, 0.2); // fish person
await shotNPC('char-giant', 'shrimply', 4.4, 9.0, 1.0); // ~3.2x giant

// Tight head-on of the player shrimp at the origin, facing the camera.
await page.evaluate(() => {
  const g = window.__game;
  g.player.mesh.position.set(0, 0, 0);
  g.player.mesh.rotation.y = 0;
  const cam = g.player.camera;
  cam.position.set(0, 1.85, 2.3);
  cam.lookAt(0, 1.7, 0);
});
await sleep(600);
await page.screenshot({ path: 'scripts/char-player.png' });
console.log('Saved scripts/char-player.png');

await browser.close();
await server.close();
console.log('done');
