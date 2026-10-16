// Drive variantly for real and record the screen.
//
//   node record.mjs                 real run with the agent named in script.json
//   node record.mjs --dry           dry run with variantly's built-in demo agent
//
// 1. Copies the example site into .work/tallyboard as a fresh git repo.
// 2. Starts variantly on it (its own VARIANTLY_HOME in .work/home, so your
//    real runs are untouched) and drives the wizard with Playwright.
// 3. Holds each scene until its narration has finished, and writes
//    video/raw.webm plus video/raw-timeline.json (scene and click times, in
//    seconds from the start of the recording).
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { at, HEIGHT, log, PAD_MS, readJson, REPO, run, script, WIDTH, writeJson } from './lib/common.mjs';

const film = script();
const agent = process.argv.includes('--dry') ? 'demo' : process.env.DEMO_AGENT || film.agent;
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
    env: { ...process.env, VARIANTLY_HOME: HOME, VARIANTLY_LEGACY_UI: '1' },
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
        return;
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Variants were not done after ${timeoutMin} minutes`);
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
  constructor(page, t0, vars) {
    this.page = page;
    this.t0 = t0;
    this.vars = vars;
    this.pos = { x: WIDTH * 0.62, y: HEIGHT * 0.6 };
    this.clicks = [];
    this.warnings = [];
  }

  now() {
    return (Date.now() - this.t0) / 1000;
  }

  fill(text) {
    return String(text).replace(/\{\{(\w+)\}\}/g, (_, k) => this.vars[k] ?? '');
  }

  async showCursor() {
    await this.page.evaluate(([x, y]) => window.__demoCursor?.(x, y), [this.pos.x, this.pos.y]).catch(() => {});
  }

  /** Ease the cursor to (x, y), drawing it on every step. */
  async moveTo(x, y, ms = 650) {
    const from = { ...this.pos };
    const steps = Math.max(8, Math.round(ms / 16));
    for (let i = 1; i <= steps; i++) {
      const k = i / steps;
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.pos = { x: from.x + (x - from.x) * e, y: from.y + (y - from.y) * e };
      await this.page.mouse.move(this.pos.x, this.pos.y);
      await this.page.evaluate(([px, py]) => window.__demoCursor?.(px, py), [this.pos.x, this.pos.y]).catch(() => {});
      await this.page.waitForTimeout(ms / steps);
    }
  }

  async box(selector) {
    const locator = this.page.locator(this.fill(selector)).first();
    await locator.waitFor({ state: 'visible', timeout: 30_000 });
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    return { locator, x: box.x + box.width / 2, y: box.y + box.height / 2, box };
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
    await this.page.evaluate(([x, y]) => window.__demoRipple?.(x, y), [target.x, target.y]);
    await this.page.mouse.click(target.x, target.y);
  }

  async type(step) {
    const target = await this.box(step.fill);
    await this.moveTo(target.x, target.y);
    this.clicks.push({ t: this.now(), x: target.x, y: target.y, zoom: false, sound: 'tick' });
    await this.page.mouse.click(target.x, target.y);
    await target.locator.fill('');
    await this.page.keyboard.type(this.fill(step.text), { delay: step.delay ?? 22 });
  }

  async drag(step) {
    const grip = await this.box(step.drag);
    const area = await this.page.locator('.compare').first().boundingBox();
    await this.moveTo(grip.x, grip.y);
    this.clicks.push({ t: this.now(), x: grip.x, y: grip.y, zoom: !!step.zoom, sound: 'tick' });
    await this.page.mouse.down();
    const per = (step.ms ?? 1200) / step.to.length;
    for (const percent of step.to) {
      const x = area.x + (area.width * percent) / 100;
      const from = { ...this.pos };
      const steps = Math.round(per / 16);
      for (let i = 1; i <= steps; i++) {
        const k = i / steps;
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        this.pos = { x: from.x + (x - from.x) * e, y: from.y };
        await this.page.mouse.move(this.pos.x, this.pos.y);
        await this.page.evaluate(([px, py]) => window.__demoCursor?.(px, py), [this.pos.x, this.pos.y]);
        await this.page.waitForTimeout(per / steps);
      }
      await this.page.waitForTimeout(250);
    }
    await this.page.mouse.up();
  }

  async scroll(y, ms = 1200) {
    await this.page.evaluate(
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
    );
  }

  /** Both compare panes have a live server and a loaded page. */
  async waitPanes() {
    await this.page.waitForFunction(
      () =>
        [...document.querySelectorAll('.pane')].every((pane) => {
          const wait = pane.querySelector('.pane-wait');
          return !wait || wait.hidden || getComputedStyle(wait).display === 'none';
        }),
      null,
      { timeout: 120_000 },
    );
    for (const frame of this.page.frames().slice(1)) {
      await frame.waitForLoadState('load', { timeout: 30_000 }).catch(() => {});
    }
    await this.page.waitForTimeout(900);
  }

  async act(step) {
    if (step.goto) {
      await this.page.goto(this.fill(step.goto));
      await this.showCursor();
    } else if (step.wait) await this.page.waitForTimeout(step.wait);
    else if (step.waitFor) await this.page.locator(this.fill(step.waitFor)).first().waitFor({ state: 'attached', timeout: 120_000 });
    else if (step.click) await this.click(step);
    else if (step.fill) await this.type(step);
    else if (step.hover) {
      const target = await this.box(step.hover).catch(() => null);
      if (target) await this.moveTo(target.x, target.y, 800);
    } else if (step.drag) await this.drag(step);
    else if (step.scroll !== undefined) await this.scroll(step.scroll, step.ms);
    else if (step.press) await this.page.keyboard.press(step.press);
    else if (step.waitPanes) await this.waitPanes();
    else if (step.waitApi === 'allDone') await waitAllDone(this.vars.app, step.timeoutMin ?? 60);
    else throw new Error(`Unknown action ${JSON.stringify(step)}`);
    // slowMo, applied between actions rather than to every mouse step.
    await this.page.waitForTimeout(250);
  }
}

// ---------------------------------------------------------------- main

log('record', `agent: ${agent}${agent === 'demo' ? ' (dry run, no AI)' : ''}`);
await prepareSite();
await preflight();
const { child, url: app } = await startVariantly();
log('record', `variantly at ${app}`);

mkdirSync(at('video'), { recursive: true });
process.on('exit', () => child.kill());
const browser = await chromium.launch({
  headless: !process.env.HEADED,
  // $CHROMIUM points at a browser Playwright did not download itself.
  executablePath: process.env.CHROMIUM || undefined,
});
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
  recordVideo: { dir: at('video', 'tmp'), size: { width: WIDTH, height: HEIGHT } },
  colorScheme: 'light',
  reducedMotion: 'no-preference',
});
await context.addInitScript(CURSOR);
// A clean wizard: no draft left over from an earlier take.
await context.addInitScript(() => {
  if (window.top === window && !sessionStorage.__demoClean) {
    for (const key of Object.keys(localStorage)) if (key.startsWith('variantly:')) localStorage.removeItem(key);
    sessionStorage.__demoClean = '1';
  }
});
const page = await context.newPage();
const t0 = Date.now();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

const director = new Director(page, t0, {
  app,
  site: pathToFileURL(path.join(SITE, 'index.html')).href,
  keep: String(film.keep ?? 1),
});
const scenes = [];

try {
  await page.goto('about:blank');
  for (const scene of film.scenes) {
    const start = director.now();
    log('record', `${scene.id} @ ${start.toFixed(1)}s`);
    for (const step of scene.actions) await director.act(step);
    // Hold until the line has been spoken, plus a breath.
    const hold = start + lineSeconds(scene) + PAD_MS / 1000 - director.now();
    if (hold > 0) await page.waitForTimeout(hold * 1000);
    else if (!scene.timelapse && hold < -1) {
      director.warnings.push(`${scene.id}: actions ran ${(-hold).toFixed(1)}s past the narration (dead air)`);
    }
    scenes.push({ id: scene.id, start, end: director.now(), timelapse: !!scene.timelapse });
  }
} finally {
  await context.close();
  await browser.close();
  await api(app, 'shutdown', 'POST').catch(() => {});
  setTimeout(() => child.kill(), 3000).unref();
}

const recorded = (await page.video()?.path()) ?? null;
if (!recorded || !existsSync(recorded)) throw new Error('Playwright did not write a video');
rmSync(at('video', 'raw.webm'), { force: true });
renameSync(recorded, at('video', 'raw.webm'));
rmSync(at('video', 'tmp'), { recursive: true, force: true });

writeJson(at('video', 'raw-timeline.json'), {
  agent,
  scenes,
  clicks: director.clicks,
  warnings: director.warnings,
  pageErrors: errors,
});
for (const w of director.warnings) log('record', `warning: ${w}`);
for (const e of errors) log('record', `page error: ${e}`);
log('record', `video/raw.webm, ${scenes.at(-1).end.toFixed(1)}s`);
