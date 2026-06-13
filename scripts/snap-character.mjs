// One-off visual check: teleport next to the break-area NPCs and screenshot
// the new character models up close. Not part of CI.
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
await page.evaluate(() => {
  const p = window.__game.player;
  p.position.set(84, 0, 25); // between Lou and Cleo at the break pavilion
  p.yaw = -2.4; // look southeast toward the NPCs
  p.pitch = 0.12;
});
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: 'scripts/character-check.png' });
await browser.close();
await server.close();
console.log('Saved scripts/character-check.png');
