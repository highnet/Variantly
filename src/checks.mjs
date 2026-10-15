// @ts-check
/*
 * The checks that sit around Impeccable: a browser the agent can drive
 * (Playwright MCP), and machine scores for every variant (axe-core and
 * Lighthouse). All of them run through npx at pinned versions, so they work
 * for any stack and variantly itself keeps no runtime dependencies.
 */
import { existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { killTree, spawnArgs } from './proc.mjs';

export const PLAYWRIGHT_MCP = '@playwright/mcp@0.0.83';
export const AUDIT_PACKAGES = ['lighthouse@13.5.0', 'axe-core@4.14.0', 'playwright-core@1.64.1'];
const RUNNER = fileURLToPath(new URL('./audit-runner.mjs', import.meta.url));

/**
 * @typedef {object} AuditResult
 * @property {string} url
 * @property {number} at
 * @property {{ performance: number | null, accessibility: number | null, bestPractices: number | null, seo: number | null, weak: { id: string, title: string, score: number, value: string }[] }} lighthouse
 * @property {{ critical: number, serious: number, moderate: number, minor: number, total: number, violations: { id: string, impact: string, help: string, nodes: number, targets: string[] }[] }} axe
 */

/**
 * A Chromium or Chrome on this machine: $CHROME_PATH, then Playwright's
 * browser cache, then the usual install locations. Undefined if none.
 * @param {NodeJS.ProcessEnv} [env] @param {string} [home]
 */
export const findChrome = (env = process.env, home = os.homedir()) => {
  if (env.CHROME_PATH && existsSync(env.CHROME_PATH)) return env.CHROME_PATH;
  const caches = [
    env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(home, '.cache', 'ms-playwright'),
    path.join(home, 'Library', 'Caches', 'ms-playwright'),
    env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'ms-playwright'),
  ].filter(/** @returns {d is string} */ (d) => Boolean(d) && existsSync(/** @type {string} */ (d)));
  for (const cache of caches) {
    const dirs = readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
    for (const d of dirs) {
      for (const rel of [
        'chrome-linux/chrome',
        'chrome-linux64/chrome',
        'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
        'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium',
        'chrome-win/chrome.exe',
        'chrome-win64/chrome.exe',
      ]) {
        const p = path.join(cache, d, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  return [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ].find((p) => existsSync(p));
};

/**
 * The Playwright MCP server an agent gets when the browser check is on.
 * Headless and isolated, so parallel variants never share a profile.
 * @param {string} [chrome]
 * @returns {{ command: string, args: string[] }}
 */
export const playwrightMcp = (chrome = findChrome()) => ({
  command: 'npx',
  args: ['--yes', PLAYWRIGHT_MCP, '--headless', '--isolated', ...(chrome ? ['--executable-path', chrome] : [])],
});

/** Audits run one at a time: concurrent `npx --yes` installs race on npm's cache, and parallel Lighthouse runs skew each other's performance scores. */
let auditQueue = Promise.resolve();

/**
 * Score one page with axe-core and Lighthouse.
 * @param {string} url
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<AuditResult>}
 */
export const runAudit = (url, opts = {}) => {
  const run = auditQueue.then(() => auditOnce(url, opts));
  auditQueue = run.then(() => {}, () => {});
  return run;
};

/** @param {string} url @param {{ timeoutMs?: number }} opts @returns {Promise<AuditResult>} */
const auditOnce = (url, opts) =>
  new Promise((resolve, reject) => {
    const chrome = findChrome();
    const cmd = ['node', JSON.stringify(RUNNER), JSON.stringify(url), ...(chrome ? [JSON.stringify(chrome)] : [])].join(' ');
    const child = spawnArgs('npx', ['--yes', ...AUDIT_PACKAGES.flatMap((p) => ['-p', p]), '-c', cmd], { cwd: process.cwd(), env: process.env });
    let out = '';
    let err = '';
    child.stdout?.on('data', (d) => (out += d));
    child.stderr?.on('data', (d) => (err = (err + d).slice(-2000)));
    const timer = setTimeout(() => killTree(child), opts.timeoutMs ?? 180_000);
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error(`Could not start the audit: ${e.message}`));
    });
    // 'close', not 'exit': exit can fire before stdout has drained.
    child.on('close', () => {
      clearTimeout(timer);
      const last = out.trim().split('\n').at(-1) ?? '';
      try {
        const r = JSON.parse(last);
        if (r.error) return reject(new Error(r.error));
        resolve(r);
      } catch {
        reject(new Error(`The audit printed no result. ${err.trim().split('\n').at(-1) ?? ''}`.trim()));
      }
    });
  });

/**
 * The audit as Markdown, for the review pass to work from.
 * @param {AuditResult} a
 */
export const auditMarkdown = (a) => {
  const l = a.lighthouse;
  const lines = [
    `Scored at ${a.url}.`,
    '',
    `- Lighthouse: performance ${l.performance ?? '–'}, accessibility ${l.accessibility ?? '–'}, best practices ${l.bestPractices ?? '–'}, SEO ${l.seo ?? '–'}.`,
    `- axe-core: ${a.axe.total} violating elements (${a.axe.critical} critical, ${a.axe.serious} serious, ${a.axe.moderate} moderate, ${a.axe.minor} minor).`,
  ];
  if (a.axe.violations.length) {
    lines.push('', '### axe-core violations', '');
    for (const v of a.axe.violations) lines.push(`- **${v.impact}** \`${v.id}\`: ${v.help} (${v.nodes}×, e.g. \`${v.targets.join('`, `')}\`)`);
  }
  if (l.weak.length) {
    lines.push('', '### Weakest Lighthouse audits', '');
    for (const w of l.weak) lines.push(`- \`${w.id}\` (${w.score}): ${w.title}${w.value ? ` — ${w.value}` : ''}`);
  }
  return lines.join('\n');
};
