// Checks that every concept's background art loops seamlessly: pins all of
// the art's CSS animations at t=0 and t=LOOP via the Web Animations API,
// screenshots the backdrop each time and requires the two frames to match.
// Usage: node scripts/check-bg-loop.mjs [baseUrl]   (needs `playwright`)
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const LOOP_MS = 24000;
const browser = await chromium.launch();
let failed = false;
for (const variant of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript((v) => {
    localStorage.setItem(
      'variantly:site',
      JSON.stringify({ state: { variant: v, runner: 'npm' }, version: 0 }),
    );
  }, variant);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForSelector('.vy-art');
  // Only the art layer is under test: hide the WebGL scene, grain and content.
  await page.addStyleTag({
    content:
      '.vy-scene,.vy-grain,header,main,footer,.vy-switcher,.vy-loadbar{visibility:hidden!important}',
  });
  const shot = async (t) => {
    await page.evaluate((ms) => {
      document
        .querySelector('.vy-art')
        .getAnimations({ subtree: true })
        .filter((a) => a instanceof CSSAnimation)
        .forEach((a) => {
          a.pause();
          a.currentTime = ms;
        });
    }, t);
    await page.waitForTimeout(200);
    return page.screenshot();
  };
  const count = await page.evaluate(
    () =>
      document
        .querySelector('.vy-art')
        .getAnimations({ subtree: true })
        .filter((a) => a instanceof CSSAnimation).length,
  );
  const a = await shot(0);
  const b = await shot(LOOP_MS);
  const same = Buffer.compare(a, b) === 0;
  if (!same || count === 0) failed = true;
  console.log(
    `${variant}: ${count} animations, loop ${LOOP_MS / 1000}s, t=0 vs t=L ${same ? 'identical' : 'DIFFERENT'}`,
  );
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
