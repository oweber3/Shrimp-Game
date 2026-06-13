// One-off visual check: screenshots of the LM interior rooms. Not part of CI.
import puppeteer from 'puppeteer';
import { preview } from 'vite';

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

const shot = async (x, z, yaw, pitch, file) => {
  await page.evaluate(([px, pz, pyaw, ppitch]) => {
    const p = window.__game.player;
    p.position.set(px, 0, pz);
    p.yaw = pyaw;
    p.pitch = ppitch;
  }, [x, z, yaw, pitch]);
  await new Promise((r) => setTimeout(r, 1400));
  await page.screenshot({ path: file });
  console.log('Saved', file);
};

// Office floor, looking north up the cubicle aisle toward the production wall.
await shot(28, 2, Math.PI, 0.35, 'scripts/interior-office.png');
// Breakroom, looking east at the counter/fridge/vending wall.
await shot(56, 3.5, -Math.PI / 2, 0.3, 'scripts/interior-breakroom.png');

await browser.close();
await server.close();
