// @ts-check
/*
 * The pages a site has, read from file-based routing where the stack has it
 * (Next.js app and pages routers, SvelteKit, Astro, Nuxt, plain HTML). Stacks
 * that route in code (Laravel, Rails, Django, Go...) just get "/". The home
 * page always comes first: by default only it is redesigned.
 */
import { readdirSync } from 'node:fs';
import path from 'node:path';

const SKIP = new Set(['node_modules', '.git', '.next', '.nuxt', '.svelte-kit', '.output', 'dist', 'build', 'out', 'vendor', 'target', '.venv', 'venv', '.impeccable', '.github', '.claude']);
const PAGE = /^(page|\+page)\.(tsx|jsx|ts|js|mdx|svelte)$/;
const PAGES_FILE = /\.(tsx|jsx|vue|astro|md|mdx)$/;

/** @param {string} dir @param {number} depth @returns {string[]} files relative to dir, forward slashes */
const walk = (dir, depth = 9) => {
  if (depth < 0) return [];
  /** @type {import('node:fs').Dirent[]} */
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((e) =>
    e.isDirectory() ? (SKIP.has(e.name) ? [] : walk(path.join(dir, e.name), depth - 1).map((f) => `${e.name}/${f}`)) : [e.name],
  );
};

/** Turn route segments into a URL path, dropping Next/SvelteKit (groups). */
const toPath = (/** @type {string[]} */ segs) => '/' + segs.filter((s) => s && !/^\(.*\)$/.test(s) && !s.startsWith('@')).join('/');

/**
 * @param {string} appDir
 * @returns {string[]} '/', then the other pages, at most 40
 */
export const detectRoutes = (appDir) => {
  const found = new Set(['/']);
  for (const file of walk(appDir)) {
    const parts = file.split('/');
    const name = /** @type {string} */ (parts.at(-1));
    const at = (/** @type {string} */ dir) => parts.lastIndexOf(dir);
    if (PAGE.test(name)) {
      const root = Math.max(at('app'), at('routes'));
      if (root >= 0) found.add(toPath(parts.slice(root + 1, -1)));
      continue;
    }
    const pages = at('pages');
    if (pages >= 0 && PAGES_FILE.test(name) && !name.startsWith('_') && parts[pages + 1] !== 'api') {
      const segs = parts.slice(pages + 1);
      segs[segs.length - 1] = name.replace(PAGES_FILE, '');
      if (segs.at(-1) === 'index') segs.pop();
      found.add(toPath(segs));
      continue;
    }
    if (/\.html?$/.test(name) && parts.length <= 2 && !/^(404|500)\./.test(name) && parts[0] !== 'node_modules') {
      const segs = parts.filter((p) => p !== 'public');
      found.add(/^index\.html?$/.test(name) ? toPath(segs.slice(0, -1)) : toPath(segs));
    }
  }
  return ['/', ...[...found].filter((r) => r !== '/').sort()].slice(0, 40);
};
