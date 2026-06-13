// Headless screenshot helper for visual checks. Not part of CI.
// Usage: node scripts/snap.mjs <x> <z> <yaw> <pitch> <outfile> [--map]
// --map opens the expanded campus map (M) before the screenshot.
import puppeteer from 'puppeteer';
import { preview } from 'vite';

const [x, z, yaw, pitch] = process.argv.slice(2, 6).map(Number);
const outfile = process.argv[6] || 'scripts/snap.png';

const server = await preview({ preview: { port: 4174, strictPort: true } });
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://localhost:4174/Shrimp-Game/preview.html', { waitUntil: 'networkidle0' });
await page.waitForFunction(() => window.__game !== undefined, { timeout: 15000 });
await page.click('#start-overlay');
const timeArg = process.argv.find((a) => a.startsWith('--time='));
const timeOfDay = timeArg ? Number(timeArg.split('=')[1]) : null;
await page.evaluate(([px, pz, pyaw, ppitch, tod]) => {
  const p = window.__game.player;
  p.position.set(px, 0, pz);
  p.yaw = pyaw;
  p.pitch = ppitch;
  if (tod !== null && window.__game.atmosphere) {
    window.__game.atmosphere.autoRun = false;
    window.__game.atmosphere.time = tod;
  }
}, [x, z, yaw, pitch, timeOfDay]);
await new Promise((r) => setTimeout(r, 1400));
if (process.argv.includes('--map')) {
  await page.keyboard.press('KeyM');
  await new Promise((r) => setTimeout(r, 400));
}
await page.screenshot({ path: outfile });
console.log('Saved', outfile);
await browser.close();
await server.close();
