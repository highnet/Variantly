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
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectAgents, impeccableInstallCommand, AGENTS } from './agents.mjs';
import { defaultDirections } from './brief.mjs';
import * as git from './git.mjs';
import { LineBuffer, isUp, run, runOk, spawnShell } from './proc.mjs';
import { ADAPTERS, detect, packageRunner, projectInfo as projectInfoFor } from './stacks.mjs';
import { Session } from './session.mjs';

const UI_DIR = fileURLToPath(new URL('../ui/', import.meta.url));
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
  const rel = url.pathname.slice('/__variantly/'.length);
  const file = path.resolve(UI_DIR, rel);
  if (!file.startsWith(UI_DIR) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end();
    return true;
  }
  res.writeHead(200, {
    'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  });
  createReadStream(file).pipe(res);
  return true;
};

/**
 * @param {{ repo: string, port: number, maxLive?: number, defaults?: Partial<import('./session.mjs').Config> }} opts
 */
export const startApp = async (opts) => {
  const session = new Session({ repo: opts.repo, maxLive: opts.maxLive, local: serveUi });
  await session.load();
  /** @type {Set<http.ServerResponse>} */
  const clients = new Set();
  const installLog = new LineBuffer(300);

  const send = (/** @type {string} */ event, /** @type {unknown} */ data) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) res.write(payload);
  };
  session.on('state', (s) => send('state', s));
  session.on('server', (s) => send('server', s));
  session.on('log', (l) => send('log', l));
  session.on('error', (e) => send('problem', { message: String(e?.message ?? e) }));

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
      case 'GET detect':
        return detectProject(opts.repo, opts.defaults);
      case 'GET log':
        return { lines: session.logFor(n) };
      case 'GET server':
        return session.pool.status(arg);
      case 'POST generate':
        return session.generate(normalizeConfig(body));
      case 'POST retry':
        return session.retry(n);
      case 'POST cancel':
        return session.cancel(n);
      case 'POST ensure':
        session.pool.ensure(arg).catch(() => {});
        return session.pool.status(arg);
      case 'POST finalize':
        return session.finalize(n);
      case 'POST discard':
        return session.discard();
      case 'POST install-impeccable':
        return installImpeccable(String(body.agent ?? 'claude'));
      case 'POST install-agent':
        return installAgent(String(body.agent ?? ''));
      case 'POST commit':
        return firstCommit();
      case 'GET install-log':
        return { lines: installLog.tail(100) };
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
    child.on('exit', (code) => send('installed', { agent, code }));
    return { command };
  };

  /** @param {string} agent */
  const installAgent = (agent) => {
    const a = AGENTS.find((x) => x.id === agent);
    if (!a) throw new Error('Unknown agent.');
    return runSetup(a.install, a.name);
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
    child.on('exit', (code) => send('installed', { agent, code }));
    return { command };
  };

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(undefined));
  });
  const address = server.address();
  port = typeof address === 'object' && address ? address.port : port;

  const app = {
    url: `http://localhost:${port}`,
    port,
    session,
    close: async () => {
      for (const c of clients) c.end();
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
      routes: [],
      concurrency: 2,
      maxLive: 3,
      deps: best?.adapter.needsInstall ? 'install' : 'link',
      agentTimeoutMin: 40,
      ...defaults,
    },
  };
};


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
  return {
    appRel: str(body.appRel).replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''),
    stackId: str(body.stackId, 'custom'),
    command,
    originalUrl: str(body.originalUrl).trim(),
    agent: str(body.agent, 'claude'),
    model: str(body.model).trim(),
    permissions: body.permissions === 'full' ? 'full' : 'safe',
    approach: body.approach === 'refine' ? 'refine' : 'redesign',
    count: num(body.count, 4, 1, 10),
    directions: Array.isArray(body.directions) ? body.directions.map((/** @type {unknown} */ d) => String(d).slice(0, 200)).slice(0, 10) : [],
    product: {
      users: str(body.product?.users).slice(0, 2000),
      purpose: str(body.product?.purpose).slice(0, 2000),
      keep: str(body.product?.keep).slice(0, 2000),
    },
    brief: str(body.brief).slice(0, 4000),
    routes: Array.isArray(body.routes) ? body.routes.map(String).filter(Boolean).slice(0, 20) : [],
    concurrency: num(body.concurrency, 2, 1, 10),
    maxLive: num(body.maxLive, 3, 2, 11),
    deps: body.deps === 'install' ? 'install' : 'link',
    agentTimeoutMin: num(body.agentTimeoutMin, 40, 5, 240),
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

