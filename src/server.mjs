// @ts-check
/*
 * The local app: one HTTP server on 127.0.0.1 that serves the wizard and the
 * comparison view, a small JSON API, and a server-sent event stream that
 * keeps the page current while agents work.
 *
 * It only ever listens on loopback, and it refuses requests that a web page
 * on another site could forge: the Host header must be loopback (no DNS
 * rebinding), and every POST must carry the X-Variantly header, which a
 * cross-origin page can't set without a CORS preflight this server never
 * approves.
 */
import http from 'node:http';
import { createReadStream, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from './checks.mjs';
import { detectAgents, impeccableInstallCommand, AGENTS } from './agents.mjs';
import { EXTRAS, defaultDirections } from './brief.mjs';
import { detectRoutes } from './routes.mjs';
import * as git from './git.mjs';
import { LineBuffer, isUp, run, runOk, spawnShell } from './proc.mjs';
import { ADAPTERS, detect, packageRunner, projectInfo as projectInfoFor } from './stacks.mjs';
import { Session, appFileFor } from './session.mjs';
import { createSiteRunner, openFolder } from './open-site.mjs';

const UI_DIR = fileURLToPath(new URL('../ui/', import.meta.url));
// The Next.js UI, built by `npm run build:ui` into ui-next/out. Without a
// build (a fresh clone) or with VARIANTLY_LEGACY_UI=1, the plain ui/ app runs.
const APP_DIR = fileURLToPath(new URL('../ui-next/out/', import.meta.url));
const useApp = () => !process.env.VARIANTLY_LEGACY_UI && existsSync(path.join(APP_DIR, 'index.html'));
const VERSION = JSON.parse(
  (await import('node:fs')).readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
).version;

const TYPES = /** @type {Record<string, string>} */ ({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
});

/**
 * Serve a file from ui/ under /__variantly/. Shared by the app server and
 * every preview proxy (frame.js is loaded inside the previews).
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
export const serveUi = (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (!url.pathname.startsWith('/__variantly/')) return false;
  const rel = decodeURIComponent(url.pathname.slice('/__variantly/'.length));
  /** @param {string} dir */
  const inside = (dir) => {
    const f = path.resolve(dir, rel);
    return f.startsWith(dir) && existsSync(f) && statSync(f).isFile() ? f : '';
  };
  const file = (useApp() && inside(APP_DIR)) || inside(UI_DIR);
  if (!file) {
    res.writeHead(404).end();
    return true;
  }
  res.writeHead(200, {
    'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  });
  createReadStream(file).on('error', () => res.destroy()).pipe(res);
  return true;
};

/**
 * @param {{ repo: string, port: number, maxLive?: number, defaults?: Partial<import('./session.mjs').Config> }} opts
 */
export const startApp = async (opts) => {
  const session = new Session({ repo: opts.repo, maxLive: opts.maxLive, local: serveUi, shared: true });
  await session.load();
  /** @type {Set<http.ServerResponse>} */
  const clients = new Set();
  const installLog = new LineBuffer(300);
  const site = createSiteRunner(opts.repo, () => session.state.config ?? undefined);

  const send = (/** @type {string} */ event, /** @type {unknown} */ data) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) res.write(payload);
  };
  // A problem from before any page was open (a `--yes` run that failed to
  // start): live events would reach no one, so it is held and replayed to
  // each page that connects until a run starts.
  /** @type {string | null} */
  let pending = null;
  session.on('state', (s) => {
    if (s.phase !== 'setup') pending = null;
    send('state', s);
  });
  session.on('server', (s) => send('server', s));
  session.on('log', (l) => send('log', l));
  session.on('chat', (c) => send('chat', c));
  session.on('error', (e) => send('problem', { message: String(e?.message ?? e) }));
  // Kept or cleaned from the terminal: every open page says so and moves on.
  session.on('external', (c) => send('notice', c));

  let port = opts.port;
  const allowedHost = (/** @type {string | undefined} */ host) =>
    !!host && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);

  const server = http.createServer(async (req, res) => {
    try {
      if (!allowedHost(req.headers.host)) {
        res.writeHead(421, { 'content-type': 'text/plain' }).end('variantly only answers on localhost.');
        return;
      }
      const url = new URL(req.url ?? '/', 'http://x');
      if (req.method === 'POST' && req.headers['x-variantly'] !== '1') {
        res.writeHead(403, { 'content-type': 'text/plain' }).end('Missing X-Variantly header.');
        return;
      }
      if (url.pathname === '/' || url.pathname === '/index.html') {
        req.url = '/__variantly/index.html';
        serveUi(req, res);
        return;
      }
      if (serveUi(req, res)) return;
      if (url.pathname === '/api/events') return events(req, res);
      if (!url.pathname.startsWith('/api/')) {
        res.writeHead(404).end();
        return;
      }
      const body = req.method === 'POST' ? await readJson(req) : {};
      const result = await route(req.method ?? 'GET', url.pathname.slice(5).split('/'), body);
      json(res, 200, result ?? { ok: true });
    } catch (err) {
      json(res, 400, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  /** @param {http.IncomingMessage} req @param {http.ServerResponse} res */
  const events = (req, res) => {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    });
    res.write(`event: state\ndata: ${JSON.stringify(session.snapshot())}\n\n`);
    if (pending) res.write(`event: problem\ndata: ${JSON.stringify({ message: pending })}\n\n`);
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 20_000);
    req.on('close', () => {
      clearInterval(ping);
      clients.delete(res);
    });
  };

  /**
   * @param {string} method
   * @param {string[]} parts
   * @param {any} body
   */
  const route = async (method, [name, arg], body) => {
    const n = Number(arg);
    switch (`${method} ${name}`) {
      case 'GET state':
        return session.snapshot();
      case 'POST sync': {
        // The page re-reads the run when it regains focus and before Keep or
        // Clean: the CLI may have kept or cleaned it in the meantime.
        const change = await session.refresh();
        return { change, state: session.snapshot() };
      }
      case 'GET detect':
        return detectProject(opts.repo, opts.defaults);
      case 'GET log':
        return { lines: session.logFor(n) };
      case 'GET rollout-log':
        return { lines: session.rolloutLog() };
      case 'POST release':
        // `variantly clean` / `keep` in a terminal: let go of the worktrees.
        await session.release();
        return { ok: true };
      case 'POST cancel-rollout':
        await session.cancelRollout();
        return { ok: true };
      case 'GET server':
        return session.pool.status(arg);
      case 'POST generate': {
        const config = normalizeConfig(body);
        await assertAgentsReady(config, opts.repo);
        return session.generate(config);
      }
      case 'POST retry':
        return session.retry(n);
      case 'POST cancel':
        return session.cancel(n);
      case 'POST chat':
        return session.chat(n, String(body.message ?? '').slice(0, 4000));
      case 'POST ensure':
        session.pool.ensure(arg).catch(() => {});
        return session.pool.status(arg);
      case 'POST audit':
        session.audit(arg).catch(() => {});
        return { ok: true };
      case 'POST finalize':
        // finalize re-reads the state file first and refuses a run kept or cleaned elsewhere.
        return session.finalize(n, { sitewide: body.sitewide !== false });
      case 'POST discard': {
        // Already kept or cleaned from the terminal: that answer stands, the page catches up.
        const change = await session.refresh();
        if (change) return { change, state: session.snapshot() };
        await session.discard();
        return { ok: true };
      }
      case 'POST install-impeccable':
        return installImpeccable(String(body.agent ?? 'claude'));
      case 'POST install-agent':
        return installAgent(String(body.agent ?? ''));
      case 'POST commit':
        return firstCommit();
      case 'POST login':
        return openLogin(String(body.agent ?? ''));
      case 'GET install-log':
        return { lines: installLog.tail(100) };
      case 'POST open-site':
        return site.open();
      case 'POST open-folder':
        return openFolder(opts.repo);
      case 'POST shutdown':
        setTimeout(() => app.close().then(() => process.exit(0)), 50);
        return { ok: true };
      default:
        throw new Error(`No route ${method} /api/${name}`);
    }
  };

  /**
   * Run a setup command the person asked for with a click, streaming its
   * output to the page; 'installed' fires with the exit code.
   * @param {string} command @param {string} agent
   */
  const runSetup = (command, agent) => {
    installLog.push(`$ ${command}
`);
    const child = spawnShell(command, { cwd: opts.repo });
    const relay = (/** @type {Buffer} */ d) => send('log', { target: 'install', lines: installLog.push(d) });
    child.stdout?.on('data', relay);
    child.stderr?.on('data', relay);
    child.on('exit', (code) => send('installed', { agent, code, what: command, tail: installLog.tail(4) }));
    return { command };
  };

  /** @param {string} agent */
  const installAgent = (agent) => {
    const a = AGENTS.find((x) => x.id === agent);
    if (!a) throw new Error('Unknown agent.');
    return runSetup(a.install, a.name);
  };

  /**
   * Open the agent's own sign-in in a new terminal window: these logins are
   * interactive (a browser device code), so they need a real console.
   * @param {string} agent
   */
  const openLogin = async (agent) => {
    const info = (await detectAgents(opts.repo)).find((a) => a.id === agent);
    if (!info?.login) throw new Error('No sign-in command for this agent.');
    const cmd = info.login;
    if (process.platform === 'win32') spawnShell(`start "Sign in" cmd /k ${cmd}`, { cwd: opts.repo });
    else if (process.platform === 'darwin') spawnShell(`osascript -e 'tell app "Terminal" to do script "${cmd}"'`, { cwd: opts.repo });
    else spawnShell(`x-terminal-emulator -e ${cmd} || gnome-terminal -- ${cmd}`, { cwd: opts.repo });
    return { command: cmd };
  };

  /** The first commit, for a repository that has none. */
  const firstCommit = async () => {
    if (await git.hasCommits(opts.repo)) return { ok: true };
    await runOk('git', ['add', '-A'], { cwd: opts.repo });
    await runOk('git', ['commit', '-q', '-m', 'Before variantly'], { cwd: opts.repo });
    return { ok: true };
  };

  /** @param {string} agent */
  const installImpeccable = (agent) => {
    if (!AGENTS.some((a) => a.id === agent)) throw new Error('Unknown agent.');
    const command = impeccableInstallCommand(agent);
    installLog.push(`$ ${command}\n`);
    const child = spawnShell(command, { cwd: opts.repo });
    const relay = (/** @type {Buffer} */ d) => send('log', { target: 'install', lines: installLog.push(d) });
    child.stdout?.on('data', relay);
    child.stderr?.on('data', relay);
    child.on('exit', (code) => send('installed', { agent, code, what: command, tail: installLog.tail(4) }));
    return { command };
  };

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(undefined));
  });
  const address = server.address();
  port = typeof address === 'object' && address ? address.port : port;

  // Announce this app, so `variantly clean` / `keep` in a terminal can ask it
  // to let go of the worktrees first (see session.release).
  const appFile = appFileFor(opts.repo);
  try {
    mkdirSync(path.dirname(appFile), { recursive: true });
    writeFileSync(appFile, JSON.stringify({ url: `http://127.0.0.1:${port}`, pid: process.pid }));
  } catch {}

  const app = {
    url: `http://localhost:${port}`,
    port,
    session,
    /** Report a problem to the page now and to any page opened later, until a run starts. */
    problem: (/** @type {string} */ message) => {
      pending = message;
      send('problem', { message });
    },
    close: async () => {
      try {
        rmSync(appFile, { force: true });
      } catch {}
      for (const c of clients) c.end();
      await site.close().catch(() => {});
      await session.close();
      await new Promise((r) => server.close(() => r(undefined)));
    },
  };
  return app;
};

/**
 * Everything the wizard pre-fills: where the app is, how it runs, which
 * agents exist, whether the original is already running.
 * @param {string} repo
 * @param {Partial<import('./session.mjs').Config>} [defaults]
 */
export const detectProject = async (repo, defaults = {}) => {
  const found = detect(repo);
  const best = found[0];
  const agents = await detectAgents(repo);
  const snap = (await git.hasCommits(repo)) ? await git.snapshotBase(repo) : null;
  const head = snap ? (await run('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo })).stdout.trim() : '';
  const branch = (await run('git', ['branch', '--show-current'], { cwd: repo })).stdout.trim();
  const candidates = await Promise.all(
    found.slice(0, 6).map(async (d) => {
      const url = `http://localhost:${d.adapter.defaultPort}`;
      return {
        rel: d.rel,
        stackId: d.adapter.id,
        name: d.adapter.name,
        stack: d.adapter.stack,
        command: d.adapter.command(projectInfoFor(d.appRoot)),
        note: d.adapter.note ?? '',
        needsInstall: Boolean(d.adapter.needsInstall),
        fixedPorts: Boolean(d.adapter.fixedPorts),
        defaultUrl: url,
        running: await isUp(url, 800),
        runner: packageRunner(d.appRoot, repo).run,
      };
    }),
  );
  const firstAgent = agents.find((a) => a.installed)?.id ?? 'claude';
  return {
    version: VERSION,
    repo,
    name: path.basename(repo),
    head,
    branch,
    hasCommits: Boolean(snap),
    dirty: snap?.dirty ?? false,
    untracked: snap?.untracked.length ?? 0,
    candidates,
    stacks: ADAPTERS.map((a) => ({ id: a.id, name: a.name, stack: a.stack, command: a.command(projectInfoFor(repo)) })),
    agents,
    chrome: Boolean(findChrome()),
    routes: detectRoutes(path.join(repo, best?.rel ?? '')),
    extras: EXTRAS.map(({ id, label, hint }) => ({ id, label, hint })),
    hasProduct: ['PRODUCT.md', path.join(best?.rel ?? '', 'PRODUCT.md')].some((p) => existsSync(path.join(repo, p))),
    hasDesign: ['DESIGN.md', path.join(best?.rel ?? '', 'DESIGN.md')].some((p) => existsSync(path.join(repo, p))),
    suggested: {
      appRel: best?.rel ?? '',
      stackId: best?.adapter.id ?? 'custom',
      command: candidates[0]?.command ?? '',
      originalUrl: candidates[0]?.running ? candidates[0].defaultUrl : '',
      agent: firstAgent,
      model: '',
      permissions: 'safe',
      approach: 'redesign',
      count: 4,
      directions: defaultDirections(10),
      product: { users: '', purpose: '', keep: '' },
      brief: '',
      routes: ['/'],
      extras: [],
      concurrency: 2,
      maxLive: 3,
      deps: best?.adapter.needsInstall ? 'install' : 'link',
      agentTimeoutMin: 40,
      browser: true,
      review: true,
      audit: true,
      ...defaults,
    },
  };
};


/**
 * A run starts only when its agents can run. Every agent in a mix must be
 * installed and not known to be signed out; one agent alone must be
 * installed (a sign-in it lacks still shows as the agent's own message on
 * each variant, since the sign-in check can't always tell).
 * @param {import('./session.mjs').Config} config @param {string} repo
 */
export const assertAgentsReady = async (config, repo) => {
  const ids = [...new Set(config.mix ? config.mix.map((r) => r.agent) : [config.agent])].filter((id) => id !== 'demo');
  if (!ids.length) return;
  const found = await detectAgents(repo);
  const problems = ids.flatMap((id) => {
    const a = found.find((x) => x.id === id);
    if (!a) return [`"${id}" is not an agent variantly knows.`];
    if (!a.installed) return [`${a.name} isn't installed (${a.install}).`];
    if (config.mix && a.signedIn === false) return [`${a.name} isn't signed in (run \`${a.login}\`).`];
    return [];
  });
  if (!problems.length) return;
  throw new Error(config.mix ? `Not started: every agent in the mix must be ready.\n${problems.join('\n')}` : `Not started: ${problems.join('\n')}`);
};

/**
 * `--agents claude:opus:2,gemini:2`: agent, optional model, count. Models
 * may hold colons (OpenRouter ids), so the first and last parts are fixed.
 * @param {string} spec
 * @returns {import('./session.mjs').AgentRow[]}
 */
export const parseMix = (spec) =>
  spec
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const bits = part.split(':');
      const last = bits.at(-1) ?? '';
      const count = bits.length > 1 && /^\d+$/.test(last) ? Number(bits.pop()) : 1;
      const [agent, ...model] = bits;
      if (!agent) throw new Error(`--agents: "${part}" names no agent.`);
      if (count < 1) throw new Error(`--agents: "${part}" asks for no variants.`);
      return { agent, model: model.join(':'), count };
    });

/** @param {any} body @returns {import('./session.mjs').Config} */
export const normalizeConfig = (body) => {
  const str = (/** @type {unknown} */ v, d = '') => (typeof v === 'string' ? v : d);
  const num = (/** @type {unknown} */ v, d = 0, lo = -Infinity, hi = Infinity) => {
    const x = Number(v);
    return Number.isFinite(x) ? Math.max(lo, Math.min(hi, Math.round(x))) : d;
  };
  const command = str(body.command).trim();
  if (!command && !str(body.originalUrl)) throw new Error('Set a dev command for your app.');
  if (command && !command.includes('{port}') && !/\b(next|vite|astro|nuxi|wasp|cargo run|go run|bun run)\b/.test(command)) {
    // Not fatal: some servers read PORT from the environment instead.
  }
  // A mix of agents: rows of agent, model and count, at most 10 variants in all.
  /** @type {import('./session.mjs').AgentRow[]} */
  const mix = [];
  for (const r of Array.isArray(body.mix) ? body.mix.slice(0, 10) : []) {
    const room = 10 - mix.reduce((t, x) => t + x.count, 0);
    const count = Math.min(room, num(r?.count, 1, 0, 10));
    if (count > 0 && str(r?.agent)) mix.push({ agent: str(r.agent), model: str(r.model).trim().slice(0, 200), count });
  }
  const mixed = mix.length > 1;
  return {
    appRel: str(body.appRel).replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''),
    stackId: str(body.stackId, 'custom'),
    command,
    originalUrl: str(body.originalUrl).trim(),
    agent: mix[0]?.agent ?? str(body.agent, 'claude'),
    model: mix[0]?.model ?? str(body.model).trim(),
    ...(mixed ? { mix } : {}),
    blind: body.blind === true,
    permissions: body.permissions === 'full' ? 'full' : 'safe',
    approach: body.approach === 'refine' ? 'refine' : 'redesign',
    count: num(body.count, 4, 1, 10),
    ...(mixed ? { count: mix.reduce((t, r) => t + r.count, 0) } : mix.length ? { count: mix[0].count } : {}),
    directions: Array.isArray(body.directions) ? body.directions.map((/** @type {unknown} */ d) => String(d).slice(0, 200)).slice(0, 10) : [],
    product: {
      users: str(body.product?.users).slice(0, 2000),
      purpose: str(body.product?.purpose).slice(0, 2000),
      keep: str(body.product?.keep).slice(0, 2000),
    },
    brief: str(body.brief).slice(0, 4000),
    routes: Array.isArray(body.routes) ? body.routes.map(String).filter(Boolean).slice(0, 40) : [],
    extras: Array.isArray(body.extras) ? EXTRAS.map((x) => x.id).filter((id) => body.extras.includes(id)) : [],
    concurrency: num(body.concurrency, 2, 1, 10),
    maxLive: num(body.maxLive, 3, 2, 11),
    deps: body.deps === 'install' ? 'install' : 'link',
    agentTimeoutMin: num(body.agentTimeoutMin, 40, 5, 240),
    browser: body.browser !== false,
    review: body.review !== false,
    audit: body.audit !== false,
  };
};

/** @param {http.IncomingMessage} req */
const readJson = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (c) => {
      data += c;
      if (data.length > 1_000_000) reject(new Error('Body too large.'));
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Body is not JSON.'));
      }
    });
  });

/** @param {http.ServerResponse} res @param {number} status @param {unknown} data */
const json = (res, status, data) => {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
};

