// Headless screenshot helper for visual checks. Not part of CI.
// Usage: node scripts/snap.mjs <x> <z> <yaw> <pitch> <outfile>
// Example: node scripts/snap.mjs 28 -8 3.14 0.35 scripts/office.png
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
await page.evaluate(([px, pz, pyaw, ppitch]) => {
  const p = window.__game.player;
  p.position.set(px, 0, pz);
  p.yaw = pyaw;
  p.pitch = ppitch;
}, [x, z, yaw, pitch]);
await new Promise((r) => setTimeout(r, 1400));
await page.screenshot({ path: outfile });
console.log('Saved', outfile);
await browser.close();
await server.close();
