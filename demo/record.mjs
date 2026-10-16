// Drive variantly for real and record the screen.
//
//   node record.mjs                 real run with the agent named in script.json
//   node record.mjs --dry           dry run with variantly's built-in demo agent
//   node record.mjs --single        record the light theme only (rehearsals)
//
// 1. Copies the example site into .work/tallyboard as a fresh git repo.
// 2. Starts variantly on it (its own VARIANTLY_HOME in .work/home, so your
//    real runs are untouched) and drives the wizard with Playwright.
// 3. Films one take in two themes at once: a light page (primary) and a dark
//    page (mirror) in the same browser, driven in lockstep with the same
//    cursor path and timing. Only the light page talks to variantly; the
//    mirror's POSTs are answered locally, and it follows the real run through
//    the same state and events.
// 4. Holds each scene until its narration has finished, and writes
//    video/light/raw.webm, video/dark/raw.webm and one shared
//    video/raw-timeline.json (scene and click times in seconds from the light
//    page's start; offsets.<theme> is when that page started, relative to it).
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { checkVariantly } from './lib/freshness.mjs';
import { at, HEIGHT, log, PAD_MS, readJson, REPO, run, script, WIDTH, writeJson } from './lib/common.mjs';

const film = script();
const IN_PAGE_CURSOR = Boolean(process.env.IN_PAGE_CURSOR);
const agent = process.argv.includes('--dry') ? 'demo' : process.env.DEMO_AGENT || film.agent;
const single = process.argv.includes('--single');
const THEMES = single ? ['light'] : ['light', 'dark'];
const port = Number(process.env.DEMO_PORT || 4499);
const durations = readJson(at('audio', 'durations.json'), {});
const WORK = at('.work');
// The folder name is the project title variantly shows.
const SITE = path.join(WORK, 'tallyboard');
const HOME = path.join(WORK, 'home');

/** Narration length for a scene; an estimate at 150 wpm until voice.mjs has run. */
function lineSeconds(scene) {
  if (durations[scene.id]) return durations[scene.id];
  const words = scene.text.split(/\s+/).length;
  return (words / 150) * 60;
}

// ---------------------------------------------------------------- setup

async function prepareSite() {
  rmSync(WORK, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  mkdirSync(HOME, { recursive: true });
  cpSync(path.resolve(at(), film.site), SITE, { recursive: true });
  const git = (...args) => run('git', args, { cwd: SITE, quiet: true });
  await git('init', '-q');
  await git('add', '-A');
  await git('-c', 'user.name=Demo', '-c', 'user.email=demo@example.com', 'commit', '-qm', 'before');
}

/** `variantly doctor` before a real run: no point recording a broken setup. */
async function preflight() {
  if (agent === 'demo' || process.env.SKIP_DOCTOR) return;
  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(REPO, 'bin', 'variantly.mjs'), 'doctor', SITE], { cwd: SITE, env: { ...process.env, VARIANTLY_HOME: HOME } });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('error', (e) => resolve({ code: 1, out: out + String(e) }));
    child.on('exit', (code) => resolve({ code, out }));
  });
  process.stdout.write(result.out.replace(/^/gm, '  [doctor] ') + '\n');
  if (result.code !== 0) {
    log('record', `variantly doctor failed (exit ${result.code}); fix the setup above, or set SKIP_DOCTOR=1 to record anyway.`);
    process.exit(1);
  }
}

function startVariantly() {
  const args = [path.join(REPO, 'bin', 'variantly.mjs'), SITE, '--agent', agent, '--no-open', '-p', String(port)];
  const child = spawn(process.execPath, args, {
    cwd: SITE,
    env: { ...process.env, VARIANTLY_HOME: HOME },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr.on('data', (d) => process.stderr.write(`  [variantly] ${d}`));
  return new Promise((resolve, reject) => {
    let out = '';
    const timer = setTimeout(() => reject(new Error(`variantly did not start:\n${out}`)), 60_000);
    child.stdout.on('data', (d) => {
      out += d;
      const url = /https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/?/.exec(out);
      if (url) {
        clearTimeout(timer);
        resolve({ child, url: url[0].replace(/\/$/, '') });
      }
    });
    child.on('exit', (code) => reject(new Error(`variantly exited ${code}:\n${out}`)));
  });
}

async function api(app, route, method = 'GET') {
  const response = await fetch(`${app}/api/${route}`, { method, headers: method === 'GET' ? {} : { 'X-Variantly': '1' } });
  return method === 'GET' ? response.json() : response.ok;
}

const TERMINAL = new Set(['done', 'failed', 'cancelled']);

/** Every variant finished and scored (or scoring gave up). */
async function waitAllDone(app, timeoutMin) {
  const deadline = Date.now() + timeoutMin * 60_000;
  let finishedAt = 0;
  let last = '';
  while (Date.now() < deadline) {
    const state = await api(app, 'state').catch(() => null);
    const variants = state?.variants ?? [];
    const summary = variants.map((v) => `${v.n}:${v.status}${v.auditState ? `/${v.auditState}` : ''}`).join(' ');
    if (summary !== last) log('record', `  ${summary}`);
    last = summary;
    const built = variants.length && variants.every((v) => TERMINAL.has(v.status));
    if (built) {
      finishedAt ||= Date.now();
      const scoring = variants.some((v) => v.auditState === 'running');
      const scored = state.baseline || state.baselineError;
      // Scores follow the builds; give them up to 10 minutes, then move on.
      if ((!scoring && scored) || Date.now() - finishedAt > 10 * 60_000) {
        const failed = variants.filter((v) => v.status !== 'done');
        if (failed.length) log('record', `  warning: ${failed.length} variant(s) did not finish`);
        await warmPreviews(app, ['original', ...variants.filter((v) => v.status === 'done').map((v) => `v${v.n}`)]);
        return;
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Variants were not done after ${timeoutMin} minutes`);
}

/**
 * Start every preview server while the timelapse is on screen, so compare and
 * switching between variants are instant on camera instead of waiting for a
 * dev server to boot.
 */
async function warmPreviews(app, targets) {
  for (const id of targets) await api(app, `ensure/${id}`, 'POST').catch(() => {});
  const deadline = Date.now() + 5 * 60_000;
  for (const id of targets) {
    while (Date.now() < deadline) {
      const status = await api(app, `server/${id}`).catch(() => null);
      if (status?.state === 'ready') break;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  log('record', `  previews ready: ${targets.join(', ')}`);
}

// ---------------------------------------------------------------- cursor

// A visible cursor and a click ripple, drawn in the top document. Playwright's
// own mouse is invisible in a recording, and events over the compare view's
// iframes never reach the top page, so the cursor is moved from here rather
// than by listening for mousemove.
const CURSOR = () => {
  if (window.top !== window) return;
  const install = () => {
    if (document.getElementById('__demo-cursor')) return;
    const style = document.createElement('style');
    style.textContent = `
      #__demo-cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;
        transform:translate(-100px,-100px);filter:drop-shadow(0 2px 3px rgb(0 0 0/.35))}
      .__demo-ripple{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;z-index:2147483646;
        pointer-events:none;border:3px solid #ffd400;background:rgb(255 212 0/.25);animation:__demo-r .55s ease-out forwards}
      @keyframes __demo-r{from{transform:scale(.3);opacity:1}to{transform:scale(1.6);opacity:0}}`;
    const cursor = document.createElement('div');
    cursor.id = '__demo-cursor';
    cursor.innerHTML =
      '<svg viewBox="0 0 26 26" width="26" height="26"><path d="M4 2l17 10.5-7.6 1.6 4.4 8.2-3.4 1.8-4.4-8.3L4 21z" fill="#0d0d10" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.append(style, cursor);
  };
  window.__demoCursor = (x, y) => {
    install();
    document.getElementById('__demo-cursor').style.transform = `translate(${x - 4}px,${y - 2}px)`;
  };
  window.__demoRipple = (x, y) => {
    install();
    const ring = document.createElement('div');
    ring.className = '__demo-ripple';
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    document.documentElement.append(ring);
    setTimeout(() => ring.remove(), 700);
  };
};

// ---------------------------------------------------------------- driver

class Director {
  /** @param {{ theme: string, page: import('playwright').Page, t0: number }[]} views  the first is the primary */
  constructor(views, vars) {
    this.views = views;
    this.page = views[0].page;
    this.t0 = views[0].t0;
    this.vars = vars;
    this.pos = { x: WIDTH * 0.62, y: HEIGHT * 0.6 };
    this.clicks = [];
    this.path = [];
    this.presses = [];
    this.warnings = [];
  }

  now() {
    return (Date.now() - this.t0) / 1000;
  }

  /** The same thing on every page at once. */
  all(fn) {
    return Promise.all(this.views.map((view) => fn(view.page, view)));
  }

  fill(text, theme = 'light') {
    return String(text).replace(/\{\{(\w+)\}\}/g, (_, k) => (k === 'app' ? `${this.vars.app}/?theme=${theme}&recording=1` : this.vars[k] ?? ''));
  }

  /*
   * The cursor is not filmed: its path and presses are logged here and the
   * SeekReel stage draws it, so it is crisp, large and smooth on every frame
   * whatever the recording's frame rate did. IN_PAGE_CURSOR=1 also draws the
   * old overlay in the page, for watching a headed rehearsal.
   */
  sample(x, y) {
    this.path.push([Number(this.now().toFixed(3)), Math.round(x), Math.round(y)]);
  }

  async showCursor() {
    this.sample(this.pos.x, this.pos.y);
    if (!IN_PAGE_CURSOR) return;
    await this.all((page) => page.evaluate(([x, y]) => window.__demoCursor?.(x, y), [this.pos.x, this.pos.y]).catch(() => {}));
  }

  async pointer(x, y) {
    this.sample(x, y);
    await this.all(async (page) => {
      await page.mouse.move(x, y);
      if (IN_PAGE_CURSOR) await page.evaluate(([px, py]) => window.__demoCursor?.(px, py), [x, y]).catch(() => {});
    });
  }

  /**
   * Run `frame(k)` from k = 0 to 1 over `ms` of wall-clock time. Progress
   * comes from the clock, not a step count: each step is a round trip to
   * every recording page, and on a busy machine a fixed number of steps
   * stretched a 650 ms move to four seconds of dead air.
   */
  async glide(ms, frame) {
    const start = Date.now();
    for (;;) {
      const k = Math.min(1, (Date.now() - start) / ms);
      await frame(k);
      if (k >= 1) return;
      await this.page.waitForTimeout(12);
    }
  }

  /** Ease the cursor to (x, y), drawing it on every step. */
  async moveTo(x, y, ms = 650) {
    const from = { ...this.pos };
    await this.glide(ms, async (k) => {
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.pos = { x: from.x + (x - from.x) * e, y: from.y + (y - from.y) * e };
      await this.pointer(this.pos.x, this.pos.y);
    });
  }

  /** Where a target is, measured on the primary page; the mirror must show it too. */
  async box(selector) {
    const locators = await this.all(async (page) => {
      const locator = page.locator(this.fill(selector)).first();
      await locator.waitFor({ state: 'visible', timeout: 30_000 });
      await locator.scrollIntoViewIfNeeded();
      return locator;
    });
    const box = await locators[0].boundingBox();
    return { locators, x: box.x + box.width / 2, y: box.y + box.height / 2, box };
  }

  async press(x, y) {
    if (IN_PAGE_CURSOR) await this.all((page) => page.evaluate(([px, py]) => window.__demoRipple?.(px, py), [x, y]).catch(() => {}));
    this.presses.push({ t: Number(this.now().toFixed(3)), x: Math.round(x), y: Math.round(y), hold: 0 });
    await this.all((page) => page.mouse.click(x, y));
  }

  async click(step) {
    let target;
    try {
      target = await this.box(step.click);
    } catch (error) {
      if (step.optional) return;
      throw error;
    }
    await this.moveTo(target.x, target.y);
    await this.page.waitForTimeout(120);
    this.clicks.push({ t: this.now(), x: target.x, y: target.y, zoom: !!step.zoom, sound: step.sound ?? 'tick' });
    await this.press(target.x, target.y);
  }

  async type(step) {
    const target = await this.box(step.fill);
    await this.moveTo(target.x, target.y);
    this.clicks.push({ t: this.now(), x: target.x, y: target.y, zoom: false, sound: 'tick' });
    await this.press(target.x, target.y);
    await Promise.all(target.locators.map((l) => l.fill('')));
    // Typed at a steady pace by the clock: however many characters are due
    // by now go in together, so slow round trips cannot stretch the line.
    const text = this.fill(step.text);
    let typed = 0;
    await this.glide(text.length * (step.delay ?? 22), async (k) => {
      const due = Math.round(text.length * k);
      if (due > typed) {
        const chunk = text.slice(typed, due);
        typed = due;
        await this.all((page) => page.keyboard.type(chunk));
      }
    });
  }

  async drag(step) {
    const grip = await this.box(step.drag);
    const area = await this.page.locator('.compare').first().boundingBox();
    await this.moveTo(grip.x, grip.y);
    this.clicks.push({ t: this.now(), x: grip.x, y: grip.y, zoom: !!step.zoom, sound: 'tick' });
    const down = { t: Number(this.now().toFixed(3)), x: Math.round(grip.x), y: Math.round(grip.y), hold: 0 };
    this.presses.push(down);
    await this.all((page) => page.mouse.down());
    const per = (step.ms ?? 1200) / step.to.length;
    for (const percent of step.to) {
      const x = area.x + (area.width * percent) / 100;
      const from = { ...this.pos };
      await this.glide(per, async (k) => {
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        this.pos = { x: from.x + (x - from.x) * e, y: from.y };
        await this.pointer(this.pos.x, this.pos.y);
      });
      await this.page.waitForTimeout(250);
    }
    down.hold = Number((this.now() - down.t).toFixed(3));
    await this.all((page) => page.mouse.up());
  }

  async scroll(y, ms = 1200) {
    await this.all((page) =>
      page.evaluate(
        ([to, duration]) =>
          new Promise((resolve) => {
            const from = window.scrollY;
            const start = performance.now();
            const tick = (now) => {
              const k = Math.min(1, (now - start) / duration);
              const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
              window.scrollTo(0, from + (to - from) * e);
              k < 1 ? requestAnimationFrame(tick) : resolve();
            };
            requestAnimationFrame(tick);
          }),
        [y, ms],
      ),
    );
  }

  /** Both compare panes, on every page, have a live server and a loaded page. */
  async waitPanes() {
    await this.all(async (page) => {
      await page.waitForFunction(
        () =>
          document.querySelector('.compare[data-panes-ready="true"]') ||
          (document.querySelectorAll('.compare .pane').length > 0 &&
          [...document.querySelectorAll('.compare .pane')].every((pane) => {
            const wait = pane.querySelector('.pane-wait');
            return !wait || wait.hidden || getComputedStyle(wait).display === 'none';
          })),
        null,
        { timeout: 120_000 },
      );
      for (const frame of page.frames().slice(1)) {
        await frame.waitForLoadState('load', { timeout: 30_000 }).catch(() => {});
      }
    });
    await this.page.waitForTimeout(900);
  }

  async act(step) {
    const began = Date.now();
    try {
      await this.actInner(step);
    } finally {
      const ms = Date.now() - began;
      if (ms > 1500 && !step.wait && !step.waitApi) log('record', `    slow: ${JSON.stringify(step).slice(0, 90)} took ${(ms / 1000).toFixed(1)}s`);
    }
  }

  async actInner(step) {
    if (step.goto) {
      await this.all((page, view) => page.goto(this.fill(step.goto, view.theme)));
      await this.showCursor();
    } else if (step.wait) await this.page.waitForTimeout(step.wait);
    else if (step.waitFor) await this.all((page) => page.locator(this.fill(step.waitFor)).first().waitFor({ state: 'attached', timeout: 120_000 }));
    else if (step.click) await this.click(step);
    else if (step.fill) await this.type(step);
    else if (step.hover) {
      const target = await this.box(step.hover).catch(() => null);
      if (target) await this.moveTo(target.x, target.y, 800);
    } else if (step.drag) await this.drag(step);
    else if (step.scroll !== undefined) await this.scroll(step.scroll, step.ms);
    else if (step.press) await this.all((page) => page.keyboard.press(step.press));
    else if (step.waitPanes) await this.waitPanes();
    else if (step.waitApi === 'allDone') await waitAllDone(this.vars.app, step.timeoutMin ?? 60);
    else throw new Error(`Unknown action ${JSON.stringify(step)}`);
    // slowMo, applied between actions rather than to every mouse step.
    await this.page.waitForTimeout(250);
  }
}

// ---------------------------------------------------------------- main

// Film the variantly people will install, never a stale or edited clone.
const filmed = await checkVariantly();
log('record', `variantly ${filmed.version} @ ${filmed.commit} (${filmed.branch})`);
if (filmed.problems.length) {
  for (const problem of filmed.problems) log('record', `NOT READY: ${problem}`);
  if (!process.env.ALLOW_STALE) {
    log('record', 'Fix the above and run again (ALLOW_STALE=1 records anyway, for testing only).');
    process.exit(1);
  }
  log('record', 'ALLOW_STALE is set: recording anyway. Do not publish this take.');
}
log('record', `agent: ${agent}${agent === 'demo' ? ' (dry run, no AI)' : ''}; themes: ${THEMES.join(', ')}`);
await prepareSite();
await preflight();
const { child, url: app } = await startVariantly();
log('record', `variantly at ${app}`);

process.on('exit', () => child.kill());
const browser = await chromium.launch({
  headless: !process.env.HEADED,
  // $CHROMIUM points at a browser Playwright did not download itself.
  executablePath: process.env.CHROMIUM || undefined,
});

/** One recording context per theme. The first drives variantly; the rest only watch. */
async function openView(theme, mirror) {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    recordVideo: { dir: at('video', theme, 'tmp'), size: { width: WIDTH, height: HEIGHT } },
    colorScheme: theme,
    reducedMotion: 'no-preference',
  });
  await context.addInitScript(CURSOR);
  // A clean wizard: no draft left over from an earlier take.
  await context.addInitScript(() => {
    try {
      if (window.top === window && !sessionStorage.__demoClean) {
        for (const key of Object.keys(localStorage)) if (key.startsWith('variantly:')) localStorage.removeItem(key);
        sessionStorage.__demoClean = '1';
      }
    } catch {} // about:blank and file:// pages have no storage
  });
  if (!mirror) {
    // Keep every preview live at once (the wizard's "live previews" setting,
    // default 3) so switching between four variants never waits for a server
    // to restart on camera. Set on the generate request, so the wizard on
    // screen is untouched.
    await context.addInitScript(() => {
      const real = window.fetch.bind(window);
      window.fetch = (input, init = {}) => {
        const url = new URL(typeof input === 'string' ? input : input.url, location.href);
        if (url.pathname === '/api/generate' && typeof init.body === 'string') {
          try {
            const body = JSON.parse(init.body);
            body.maxLive = Math.min(11, (body.count ?? 4) + 1);
            init = { ...init, body: JSON.stringify(body) };
          } catch {}
        }
        return real(input, init);
      };
    });
  }
  if (mirror) {
    // The mirror must not change the run: answer its POSTs here (the UI
    // ignores their bodies and follows /api/state and /api/events). Only
    // ensure/<target>, which just starts a preview server, goes through.
    // (In the page, not with context.route: request interception held back
    // the mirror's event stream for half a minute.)
    await context.addInitScript(() => {
      const real = window.fetch.bind(window);
      window.fetch = (input, init = {}) => {
        const url = new URL(typeof input === 'string' ? input : input.url, location.href);
        const method = (init.method ?? (typeof input === 'string' ? 'GET' : input.method) ?? 'GET').toUpperCase();
        if (url.origin === location.origin && url.pathname.startsWith('/api/') && method !== 'GET' && !url.pathname.startsWith('/api/ensure/')) {
          return Promise.resolve(new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }));
        }
        return real(input, init);
      };
    });
  }
  const page = await context.newPage();
  const view = { theme, context, page, t0: Date.now(), errors: [] };
  page.on('pageerror', (e) => view.errors.push(String(e)));
  return view;
}

const views = [];
for (const [i, theme] of THEMES.entries()) {
  rmSync(at('video', theme, 'tmp'), { recursive: true, force: true });
  mkdirSync(at('video', theme), { recursive: true });
  views.push(await openView(theme, i > 0));
}

const director = new Director(views, {
  app,
  site: pathToFileURL(path.join(SITE, 'index.html')).href,
  keep: String(film.keep ?? 1),
});
const scenes = [];
const schemes = {};

try {
  await director.all((page) => page.goto('about:blank'));
  for (const scene of film.scenes) {
    const start = director.now();
    log('record', `${scene.id} @ ${start.toFixed(1)}s`);
    for (const step of scene.actions) await director.act(step);
    if (scene.id === 'launch') {
      for (const view of views) schemes[view.theme] = await view.page.evaluate(() => ({ media: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', ui: document.documentElement.dataset.theme ?? null }));
    }
    // Hold until the line has been spoken, plus a breath.
    const hold = start + lineSeconds(scene) + PAD_MS / 1000 - director.now();
    if (hold > 0) await director.page.waitForTimeout(hold * 1000);
    else if (!scene.timelapse && hold < -1) {
      director.warnings.push(`${scene.id}: actions ran ${(-hold).toFixed(1)}s past the narration (dead air)`);
    }
    scenes.push({ id: scene.id, start, end: director.now(), timelapse: !!scene.timelapse });
  }
} finally {
  for (const view of views) await view.context.close();
  await browser.close();
  await api(app, 'shutdown', 'POST').catch(() => {});
  setTimeout(() => child.kill(), 3000).unref();
}

for (const view of views) {
  const recorded = (await view.page.video()?.path()) ?? null;
  if (!recorded || !existsSync(recorded)) throw new Error(`Playwright did not write the ${view.theme} video`);
  rmSync(at('video', view.theme, 'raw.webm'), { force: true });
  renameSync(recorded, at('video', view.theme, 'raw.webm'));
  rmSync(at('video', view.theme, 'tmp'), { recursive: true, force: true });
}

const pageErrors = views.flatMap((view) => view.errors.map((e) => `${view.theme}: ${e}`));
writeJson(at('video', 'raw-timeline.json'), {
  agent,
  variantly: { version: filmed.version, commit: filmed.commit, branch: filmed.branch, stale: filmed.problems.length > 0 },
  themes: THEMES,
  // Seconds from the light page's start to each page's start: subtract to
  // find a timeline moment in that theme's video.
  offsets: Object.fromEntries(views.map((view) => [view.theme, Number(((view.t0 - views[0].t0) / 1000).toFixed(3))])),
  colorSchemes: schemes,
  scenes,
  clicks: director.clicks,
  cursor: { path: director.path, presses: director.presses },
  warnings: director.warnings,
  pageErrors,
});
for (const w of director.warnings) log('record', `warning: ${w}`);
for (const e of pageErrors) log('record', `page error: ${e}`);
log('record', `video/{${THEMES.join(',')}}/raw.webm, ${scenes.at(-1).end.toFixed(1)}s; color schemes ${JSON.stringify(schemes)}`);
