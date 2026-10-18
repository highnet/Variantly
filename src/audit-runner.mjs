// @ts-check
/*
 * Runs inside `npx -p lighthouse -p axe-core -p playwright-core`, so those
 * packages come from npx's cache and variantly keeps no dependencies of its
 * own. Opens one headless Chromium, runs axe-core on the page and Lighthouse
 * through the same browser, and prints one JSON object on stdout.
 *
 *   node audit-runner.mjs <url> [chromePath]
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [url, chromePath] = process.argv.slice(2);

/** npx puts each package's node_modules/.bin on PATH; resolve from there. */
const roots = (process.env.PATH ?? '')
  .split(path.delimiter)
  .filter((p) => /node_modules[\\/]\.bin$/.test(p))
  .map((p) => path.dirname(p));

/** @param {string} name */
const resolve = (name) => {
  for (const root of roots) {
    try {
      return createRequire(path.join(root, 'noop.js')).resolve(name);
    } catch {}
  }
  throw new Error(`${name} is not available; run through npx -p ${name}.`);
};

const main = async () => {
  if (!url) throw new Error('usage: audit-runner.mjs <url> [chromePath]');
  const pw = await import(pathToFileURL(resolve('playwright-core')).href);
  const chromium = pw.chromium ?? pw.default.chromium;
  const axePath = resolve('axe-core/axe.min.js');
  const port = 9300 + Math.floor(Math.random() * 600);
  const browser = await chromium.launch({
    headless: true,
    ...(chromePath ? { executablePath: chromePath } : { channel: 'chrome' }),
    args: [`--remote-debugging-port=${port}`, '--no-sandbox'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
    // Let web fonts and entrance animations finish before axe looks: a
    // fade-in caught halfway reads as low contrast, and how far it got
    // depends on the machine, so the score would not be repeatable.
    // Endless animations are skipped, and the wait is capped at 3 s.
    await page.evaluate(() =>
      Promise.race([
        Promise.all([
          document.fonts.ready,
          ...document
            .getAnimations()
            .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
            .map((a) => a.finished.catch(() => {})),
        ]),
        new Promise((r) => setTimeout(r, 3000)),
      ]),
    );
    await page.addScriptTag({ path: axePath });
    /** @type {any} */
    const axe = await page.evaluate(() =>
      // @ts-ignore axe is the injected global
      window.axe.run(document, { resultTypes: ['violations'] }),
    );
    await page.close();

    const { default: lighthouse } = await import(pathToFileURL(resolve('lighthouse')).href);
    const lh = await lighthouse(url, {
      port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });
    const cats = lh?.lhr.categories ?? {};
    const score = (/** @type {string} */ id) => (typeof cats[id]?.score === 'number' ? Math.round(cats[id].score * 100) : null);
    const weak = Object.values(lh?.lhr.audits ?? {})
      .filter((a) => typeof a.score === 'number' && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual')
      .sort((a, b) => a.score - b.score)
      .slice(0, 10)
      .map((a) => ({ id: a.id, title: a.title, score: Math.round(a.score * 100), value: a.displayValue ?? '' }));

    const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    for (const v of axe.violations) if (v.impact in counts) counts[/** @type {keyof typeof counts} */ (v.impact)] += v.nodes.length;
    const order = ['critical', 'serious', 'moderate', 'minor'];
    const violations = axe.violations
      .sort((/** @type {any} */ a, /** @type {any} */ b) => order.indexOf(a.impact) - order.indexOf(b.impact))
      .slice(0, 15)
      .map((/** @type {any} */ v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
        targets: v.nodes.slice(0, 3).map((/** @type {any} */ n) => String(n.target.join(' '))),
      }));

    return {
      url,
      at: Date.now(),
      lighthouse: {
        performance: score('performance'),
        accessibility: score('accessibility'),
        bestPractices: score('best-practices'),
        seo: score('seo'),
        weak,
      },
      axe: { ...counts, total: counts.critical + counts.serious + counts.moderate + counts.minor, violations },
    };
  } finally {
    await browser.close();
  }
};

main().then(
  (r) => process.stdout.write(JSON.stringify(r) + '\n'),
  (err) => {
    process.stdout.write(JSON.stringify({ error: String(err?.message ?? err).split('\n')[0] }) + '\n');
    process.exitCode = 1;
  },
);
