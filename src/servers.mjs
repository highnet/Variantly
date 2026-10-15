// @ts-check
/*
 * Dev servers, one per variant, started on demand. Ten Next.js dev servers
 * would take most of a laptop's memory, so only the original plus the few
 * most recently viewed variants run at once (`maxLive`); switching to a
 * sleeping one starts it and the picker shows it booting.
 *
 * Every server sits behind its own preview proxy whose port never changes,
 * so the browser keeps one URL per variant across restarts.
 */
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createProxy } from './proxy.mjs';
import { LineBuffer, freePort, isUp, killTree, spawnShell } from './proc.mjs';

/**
 * @typedef {object} TargetSpec
 * @property {string} id          "original" | "v1" ...
 * @property {string} cwd
 * @property {string} command     template with {port} / {port2}
 * @property {NodeJS.ProcessEnv} [env]
 * @property {string} [external]  an already-running URL; never spawned
 * @property {number} bootTimeout
 * @property {boolean} [fixedPort] the stack ignores {port}; serves on defaultPort
 * @property {number} [defaultPort]
 */

/**
 * @typedef {'sleeping' | 'starting' | 'ready' | 'failed'} ServerState
 */

export class ServerPool extends EventEmitter {
  /**
   * @param {{ inject: (id: string) => string, local?: import('./proxy.mjs').ProxyOptions['local'], maxLive?: number }} opts
   */
  constructor(opts) {
    super();
    this.inject = opts.inject;
    this.local = opts.local;
    this.maxLive = opts.maxLive ?? 3;
    /** While true (a run is being torn down) nothing may start. */
    this.locked = false;
    /** @type {Map<string, { spec: TargetSpec, state: ServerState, proxyPort: number, proxy: Awaited<ReturnType<typeof createProxy>>, child?: import('node:child_process').ChildProcess, log: LineBuffer, lastUsed: number, port?: number, upstream?: string, error?: string, boot?: Promise<void> }>} */
    this.targets = new Map();
  }

  /** @param {TargetSpec} spec */
  async add(spec) {
    this.locked = false;
    const existing = this.targets.get(spec.id);
    if (existing) {
      await this.stop(spec.id);
      existing.spec = spec;
      return existing.proxyPort;
    }
    // Upstream is unknown until the server starts; the proxy shows a
    // "starting" page until then.
    const proxy = await createProxy({ target: 'http://127.0.0.1:9', inject: this.inject(spec.id), local: this.local });
    this.targets.set(spec.id, {
      spec,
      state: 'sleeping',
      proxyPort: proxy.port,
      proxy,
      log: new LineBuffer(),
      lastUsed: 0,
    });
    return proxy.port;
  }

  /**
   * The stable preview URL (through the proxy) and, once it is running, the
   * dev server itself, which audits use so the proxy's script isn't scored.
   * @param {string} id
   */
  urls(id) {
    const t = this.targets.get(id);
    if (!t) return null;
    return { preview: `http://localhost:${t.proxyPort}`, upstream: t.state === 'ready' ? t.upstream : undefined };
  }

  /** @param {string} id */
  status(id) {
    const t = this.targets.get(id);
    if (!t) return null;
    return { id, state: t.state, proxyPort: t.proxyPort, error: t.error, log: t.log.tail(30) };
  }

  all() {
    return [...this.targets.keys()].map((id) => this.status(id));
  }

  /**
   * Make sure a target is running, evicting the least recently viewed
   * variant if too many are up. Resolves when it answers HTTP.
   * @param {string} id
   */
  async ensure(id) {
    const t = this.targets.get(id);
    if (!t) throw new Error(`unknown target ${id}`);
    if (this.locked) return;
    t.lastUsed = Date.now();
    if (t.state === 'ready') return;
    if (t.boot) return t.boot;
    t.boot = this.#start(id).finally(() => {
      t.boot = undefined;
    });
    return t.boot;
  }

  /** @param {string} id */
  async #start(id) {
    const t = /** @type {NonNullable<ReturnType<typeof this.targets.get>>} */ (this.targets.get(id));
    t.error = undefined;
    this.#set(id, 'starting');

    if (t.spec.external) {
      t.proxy.setTarget(t.spec.external);
      t.upstream = t.spec.external;
      if (await waitUp(t.spec.external, 10_000)) this.#set(id, 'ready');
      else this.#fail(id, `Nothing is answering at ${t.spec.external}.`);
      return;
    }

    if (t.spec.fixedPort) {
      // Only one copy of a fixed-port stack can run: stop every other one.
      for (const [other, o] of this.targets) if (other !== id && o.child) await this.stop(other);
    } else {
      await this.#evict(id);
    }

    const port = t.spec.fixedPort ? (t.spec.defaultPort ?? 3000) : await freePort();
    const port2 = await freePort();
    const command = t.spec.command.replaceAll('{port}', String(port)).replaceAll('{port2}', String(port2));
    t.port = port;
    t.log.push(`$ ${command}\n`);
    if (!existsSync(t.spec.cwd)) {
      this.#fail(id, `The folder ${t.spec.cwd} is missing.`);
      return;
    }
    const child = spawnShell(command, {
      cwd: t.spec.cwd,
      env: {
        ...process.env,
        ...t.spec.env,
        PORT: String(port),
        BROWSER: 'none',
        FORCE_COLOR: '0',
        // Variant worktrees each build into their own cargo target dir.
        CARGO_TARGET_DIR: t.spec.env?.CARGO_TARGET_DIR ?? path.join(t.spec.cwd, 'target'),
      },
    });
    t.child = child;
    child.stdout?.on('data', (d) => this.emit('log', id, t.log.push(d)));
    child.stderr?.on('data', (d) => this.emit('log', id, t.log.push(d)));
    child.on('exit', (code) => {
      if (t.child !== child) return;
      t.child = undefined;
      if (t.state !== 'sleeping') this.#fail(id, `The dev server exited (code ${code}).`);
    });

    // Dev servers bind "localhost", which is ::1 on some machines and
    // 127.0.0.1 on others; whichever answers is the upstream.
    const candidates = [`http://127.0.0.1:${port}`, `http://[::1]:${port}`];
    const url = await waitUpAny(candidates, t.spec.bootTimeout, () => t.child === child);
    if (t.child !== child) return; // stopped or crashed while booting
    if (url) {
      t.proxy.setTarget(url);
      t.upstream = url;
      this.#set(id, 'ready');
    }
    else {
      await this.stop(id);
      this.#fail(id, `The dev server did not answer within ${Math.round(t.spec.bootTimeout / 1000)}s.`);
    }
  }

  /** @param {string} keep */
  async #evict(keep) {
    const running = [...this.targets.entries()].filter(
      ([id, t]) => id !== keep && id !== 'original' && t.child && !t.spec.external,
    );
    const budget = this.maxLive - 1; // the original always stays up
    if (running.length < budget) return;
    running.sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    for (const [id] of running.slice(0, running.length - budget + 1)) await this.stop(id);
  }

  /** @param {string} id */
  async stop(id) {
    const t = this.targets.get(id);
    if (!t) return;
    const child = t.child;
    t.child = undefined;
    this.#set(id, 'sleeping');
    if (child) await killTree(child);
  }

  async closeAll() {
    this.locked = true;
    await Promise.all([...this.targets.keys()].map((id) => this.stop(id)));
    await Promise.all([...this.targets.values()].map((t) => t.proxy.close()));
    this.targets.clear();
  }

  /** @param {string} id @param {ServerState} state */
  #set(id, state) {
    const t = this.targets.get(id);
    if (!t) return;
    t.state = state;
    this.emit('state', this.status(id));
  }

  /** @param {string} id @param {string} message */
  #fail(id, message) {
    const t = this.targets.get(id);
    if (!t) return;
    t.error = message;
    this.#set(id, 'failed');
  }
}

/**
 * @param {string[]} urls
 * @param {number} timeout
 * @param {() => boolean} alive
 * @returns {Promise<string | null>}
 */
const waitUpAny = async (urls, timeout, alive) => {
  const until = Date.now() + timeout;
  while (Date.now() < until && alive()) {
    for (const url of urls) if (await isUp(url, 1_000)) return url;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
};

/**
 * @param {string} url
 * @param {number} timeout
 * @param {() => boolean} [alive]
 */
const waitUp = async (url, timeout, alive = () => true) => {
  const until = Date.now() + timeout;
  while (Date.now() < until && alive()) {
    if (await isUp(url)) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
};
