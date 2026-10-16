// Make sure the take films the variantly people will actually install: the
// released version or newer, level with origin/main, with a UI build that
// matches its sources and no local edits in the code that runs.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { REPO, run } from './common.mjs';

export const MIN_VERSION = '0.3.0';

const newer = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split(/[.-]/).slice(0, 3).map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

/** Newest modification time of any file under dir (0 if it does not exist). */
function newest(dir) {
  if (!existsSync(dir)) return 0;
  let latest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    latest = Math.max(latest, entry.isDirectory() ? newest(full) : statSync(full).mtimeMs);
  }
  return latest;
}

const git = (...args) => run('git', args, { cwd: REPO, quiet: true }).then((out) => out.trim());

/**
 * What is about to be filmed, and anything wrong with it.
 * @returns {Promise<{ version: string, commit: string, branch: string, problems: string[] }>}
 */
export async function checkVariantly() {
  const problems = [];
  const version = JSON.parse(readFileSync(path.join(REPO, 'package.json'), 'utf8')).version;
  const commit = await git('rev-parse', '--short', 'HEAD').catch(() => 'unknown');
  const branch = await git('rev-parse', '--abbrev-ref', 'HEAD').catch(() => 'unknown');

  if (newer(MIN_VERSION, version)) {
    problems.push(`variantly ${version} is older than ${MIN_VERSION}.\n    Fix: git pull && npm ci && npm run build:ui`);
  }

  try {
    await git('fetch', '--quiet', 'origin', 'main');
    const behind = Number(await git('rev-list', '--count', 'HEAD..origin/main'));
    if (behind > 0) {
      problems.push(`This clone is ${behind} commit(s) behind origin/main.\n    Fix: git checkout main && git pull && npm ci && npm run build:ui`);
    }
  } catch (error) {
    problems.push(`Could not compare with origin/main (${String(error.message).split('\n')[0]}).\n    Fix: check your network and that the clone has an "origin" remote.`);
  }

  const dirty = await git('status', '--porcelain', '--', 'src', 'ui-next', 'bin').catch(() => '');
  if (dirty) {
    problems.push(`Uncommitted changes in the code that runs:\n${dirty.replace(/^/gm, '      ')}\n    Fix: commit or stash them (git stash -u), or record from a clean clone.`);
  }

  const built = path.join(REPO, 'ui-next', 'out', 'index.html');
  const sources = Math.max(...['app', 'components', 'lib'].map((d) => newest(path.join(REPO, 'ui-next', d))));
  if (!existsSync(built)) {
    problems.push('The app UI is not built (ui-next/out is missing), so an old fallback UI would be filmed.\n    Fix: npm run build:ui');
  } else if (newest(path.join(REPO, 'ui-next', 'out')) < sources) {
    problems.push('The app UI build is older than its sources (pulled without rebuilding?).\n    Fix: npm run build:ui');
  }

  return { version, commit, branch, problems };
}
