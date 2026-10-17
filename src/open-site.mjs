// @ts-check
/*
 * The Kept screen's "Open your site" and "Open folder". After a keep the
 * run's server pool is torn down, so the user's own site runs in a pool of
 * its own: the same confirmed dev command, placeholders and port allocation
 * as the original, on the repository's working tree (the kept result).
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ServerPool } from './servers.mjs';
import { adapterById, fill, packageRunner, pythonFor } from './stacks.mjs';

const VARIANTLY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string} repo
 * @param {() => import('./session.mjs').Config | undefined} getConfig
 */
export const createSiteRunner = (repo, getConfig) => {
  /** @type {ServerPool | null} */
  let pool = null;
  /** @type {string} */
  let key = '';

  /** @returns {Promise<{ url: string }>} */
  const open = async () => {
    const config = getConfig();
    if (!config) throw new Error('No run config yet, so variantly does not know how your site starts.');
    if (config.originalUrl) return { url: config.originalUrl };
    if (!config.command) throw new Error('Set a dev command for your app.');
    const appDir = path.join(repo, config.appRel);
    const adapter = adapterById(config.stackId);
    const command = fill(config.command, {
      run: packageRunner(appDir, repo).run,
      python: pythonFor(appDir),
      node: JSON.stringify(process.execPath),
      variantly: VARIANTLY_ROOT,
      app: appDir,
    });
    const nextKey = `${appDir}\n${command}`;
    if (pool && key !== nextKey) await close();
    if (!pool) {
      pool = new ServerPool({ inject: () => '' });
      key = nextKey;
      await pool.add({
        id: 'site',
        cwd: appDir,
        command,
        bootTimeout: adapter.bootTimeout ?? 120_000,
        fixedPort: adapter.fixedPorts,
        defaultPort: adapter.defaultPort,
        readyFile: adapter.readyFile?.(config.command),
      });
    }
    await pool.ensure('site');
    const url = pool.urls('site')?.upstream;
    if (!url) throw new Error(pool.status('site')?.error ?? 'Your dev server did not start.');
    return { url: url.replace('127.0.0.1', 'localhost') };
  };

  const close = async () => {
    const p = pool;
    pool = null;
    key = '';
    if (p) await p.closeAll();
  };

  return { open, close };
};

/** The OS file-manager command for a folder: only the path is passed, as one argument. */
export const folderOpener = (dir, platform = process.platform) => {
  if (platform === 'win32') return { cmd: 'explorer.exe', args: [dir] };
  if (platform === 'darwin') return { cmd: 'open', args: [dir] };
  return { cmd: 'xdg-open', args: [dir] };
};

/** @param {string} dir */
export const openFolder = (dir) =>
  new Promise((resolve, reject) => {
    const { cmd, args } = folderOpener(path.resolve(dir));
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true, shell: false, windowsHide: false });
    child.once('error', (err) => reject(new Error(`Could not open the folder: ${err.message}`)));
    // explorer.exe exits 1 even when it opened the window, so the exit code
    // is not checked; only a failure to spawn counts.
    child.once('spawn', () => {
      child.unref();
      resolve({ ok: true });
    });
  });
