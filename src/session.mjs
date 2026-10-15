// @ts-check
/*
 * One variantly session: a project, a configuration from the wizard, and the
 * variants generated from it. The session owns the worktrees, the agent runs,
 * and the server pool, and persists its state so that running `variantly`
 * again in the same project picks up where the last run left off.
 */
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createParser } from './agent-output.mjs';
import { agentById, agentFile } from './agents.mjs';
import { productFromCode } from './product.mjs';
import { defaultDirections, extractReview, extractSummary, hasAnswers, productMarkdown, writeBrief, writeReviewBrief } from './brief.mjs';
import { auditMarkdown, playwrightMcp, runAudit } from './checks.mjs';
import { stepFrom } from './steps.mjs';
import * as git from './git.mjs';
import { LineBuffer, killTree, run, spawnArgs } from './proc.mjs';
import { ServerPool } from './servers.mjs';
import { adapterById, fill, installFailed, packageRunner, pythonFor } from './stacks.mjs';

const LOCKFILES = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock'];
const VARIANTLY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @typedef {object} Config
 * @property {string} appRel
 * @property {string} stackId
 * @property {string} command          dev command template, {port} unresolved
 * @property {string} originalUrl      '' = variantly starts the original too
 * @property {string} agent
 * @property {string} model
 * @property {'safe' | 'full'} permissions
 * @property {'redesign' | 'refine'} approach
 * @property {number} count
 * @property {string[]} directions   the owner's words per variant; '' = Impeccable decides
 * @property {import('./brief.mjs').ProductAnswers} [product]  answers to Impeccable's init questions
 * @property {string} brief
 * @property {string[]} routes
 * @property {string[]} [extras]     ids from EXTRAS: Impeccable passes beyond the redesign
 * @property {number} concurrency
 * @property {number} maxLive
 * @property {'link' | 'install'} deps
 * @property {number} agentTimeoutMin
 * @property {boolean} browser   give the agent a browser (Playwright MCP) on its live variant
 * @property {boolean} review    a second pass: Impeccable critique and audit, then fixes
 * @property {boolean} audit     score the original and every variant with axe-core and Lighthouse
 */

/**
 * @typedef {'queued' | 'preparing' | 'running' | 'reviewing' | 'committing' | 'done' | 'failed' | 'cancelled'} VariantStatus
 * @typedef {object} Variant
 * @property {number} n
 * @property {string} direction
 * @property {VariantStatus} status
 * @property {string} summary
 * @property {string[]} files
 * @property {string} [error]
 * @property {number} [startedAt]
 * @property {number} [finishedAt]
 * @property {number} [costUsd]   what the agent reported the session cost (Claude Code only)
 * @property {import('./agent-output.mjs').Usage} [usage]  tokens, as the agent reported them
 * @property {string} [picked]    the world Impeccable picked, as the agent named it
 * @property {number} [step]      index into STEPS: where the run is
 * @property {number} [credits]   AI credits / premium requests, when the agent reports them (Copilot)
 * @property {string} [review]    what the review pass found and fixed
 * @property {import('./checks.mjs').AuditResult} [audit]  axe-core and Lighthouse scores
 * @property {'running' | 'failed'} [auditState]
 * @property {string} [auditError]
 */

/**
 * @typedef {object} State
 * @property {number} version
 * @property {'setup' | 'generating' | 'ready' | 'finalized'} phase
 * @property {string} runId
 * @property {string} base
 * @property {Config | null} config
 * @property {Variant[]} variants
 * @property {number | null} chosen
 * @property {{ files: string[], conflicts: string[], depsChanged: boolean } | null} result
 * @property {import('./checks.mjs').AuditResult} [baseline]  the original's scores
 * @property {string} [baselineError]
 */

/** @param {string} repo */
export const stateDirFor = (repo) => {
  const hash = createHash('sha1').update(path.resolve(repo).toLowerCase()).digest('hex').slice(0, 8);
  const slug = path.basename(repo).replace(/[^\w.-]+/g, '-').slice(0, 24);
  return path.join(process.env.VARIANTLY_HOME ?? path.join(os.homedir(), '.variantly'), `${slug}-${hash}`);
};

export class Session extends EventEmitter {
  /**
   * @param {{ repo: string, maxLive?: number, local?: import('./proxy.mjs').ProxyOptions['local'] }} opts
   */
  constructor(opts) {
    super();
    this.repo = opts.repo;
    this.dir = stateDirFor(opts.repo);
    /** @type {State} */
    this.state = { version: 1, phase: 'setup', runId: '', base: '', config: null, variants: [], chosen: null, result: null };
    /** @type {Map<number, { child?: import('node:child_process').ChildProcess, log: LineBuffer, cancelled?: boolean }>} */
    this.runs = new Map();
    /** @type {Promise<unknown> | undefined} */
    this.gitQueue = undefined;
    /** PRODUCT.md answers read from the code, once per run, shared by every variant. @type {import('./brief.mjs').ProductAnswers | undefined} */
    this.codeProduct = undefined;
    /** @type {Promise<void> | undefined} */
    this.auditQueue = undefined;
    this.pool = new ServerPool({
      inject: (id) => frameScriptTag(id),
      local: opts.local,
      maxLive: opts.maxLive ?? 3,
    });
    this.pool.on('state', (s) => this.emit('server', s));
    this.pool.on('log', (id, lines) => lines.length && this.emit('log', { target: id, lines }));
  }

  async load() {
    try {
      const saved = JSON.parse(await readFile(path.join(this.dir, 'state.json'), 'utf8'));
      if (saved.version === 1) this.state = saved;
    } catch {}
    // A run that was interrupted mid-generation can't be resumed: those
    // agents are gone. Mark what didn't finish so the user can retry it.
    // Nothing runs right after a start, in any phase: a queued variant left
    // behind in a finished run is just as stuck as a running one.
    for (const v of this.state.variants) {
      if (!['done', 'failed', 'cancelled'].includes(v.status)) {
        v.status = 'failed';
        v.error = 'variantly stopped while this variant was being generated.';
      }
    }
    if (this.state.phase === 'generating') {
      // Back to the board, not the wizard: interrupted designs can be retried there.
      this.state.phase = this.state.variants.length ? 'ready' : 'setup';
    }
    // A saved run with designs belongs on the board (discard empties the list).
    if (this.state.phase === 'setup' && this.state.variants.length) this.state.phase = 'ready';
    // An audit that was running when variantly stopped never finishes.
    for (const v of this.state.variants) if (v.auditState === 'running') v.auditState = undefined;
    if (this.state.config) this.pool.maxLive = this.state.config.maxLive;
    if (this.state.phase === 'ready' && this.state.config) await this.#registerTargets();
    return this.state;
  }

  async save() {
    await mkdir(this.dir, { recursive: true });
    await writeFile(path.join(this.dir, 'state.json'), JSON.stringify(this.state, null, 2));
    this.emit('state', this.snapshot());
  }

  snapshot() {
    return {
      ...this.state,
      repo: this.repo,
      servers: this.pool.all(),
      // Where each variant lives, for the UI's handoff prompt.
      stateDir: this.dir,
      places: this.state.variants.map((v) => ({
        n: v.n,
        worktree: this.worktreeFor(v.n),
        branch: this.branchFor(v.n),
        brief: path.join(this.dir, 'briefs', `v${v.n}.md`),
      })),
    };
  }

  /**
   * Git keeps one lock per repository for worktree bookkeeping; parallel
   * `worktree add/remove/prune` calls race on it. Run them one at a time.
   * @template T @param {() => Promise<T>} fn @returns {Promise<T>}
   */
  gitLock(fn) {
    const next = (this.gitQueue ?? Promise.resolve()).then(fn, fn);
    this.gitQueue = next.catch(() => {});
    return next;
  }

  /** @param {number} n */
  worktreeFor(n) {
    return path.join(this.dir, `v${n}`);
  }

  /** @param {number} n */
  branchFor(n) {
    return `variantly/${this.state.runId}/v${n}`;
  }

  /** @param {number} n */
  logFor(n) {
    return this.runs.get(n)?.log.tail(200) ?? [];
  }

  /**
   * Start a new run with this configuration. Previous variants (if any) are
   * thrown away first: a run is one decision.
   * @param {Config} config
   */
  async generate(config) {
    if (this.state.phase === 'generating') throw new Error('A run is already in progress.');
    await this.discard();
    if (!(await git.hasCommits(this.repo))) {
      throw new Error('This repository has no commits yet. Commit once so variantly has a base to branch from.');
    }
    const count = Math.max(1, Math.min(10, Math.round(config.count)));
    const directions = config.directions.length >= count ? config.directions.slice(0, count) : defaultDirections(count);
    const snap = await git.snapshotBase(this.repo);
    this.state = {
      version: 1,
      phase: 'generating',
      runId: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12),
      base: snap.base,
      config: { ...config, count, directions },
      variants: directions.map((direction, i) => ({ n: i + 1, direction, status: 'queued', summary: '', files: [] })),
      chosen: null,
      result: null,
    };
    this.pool.maxLive = this.state.config?.maxLive ?? this.pool.maxLive;
    await this.save();
    await this.#registerTargets();
    this.pool.ensure('original').catch(() => {});
    if (this.state.config?.audit) this.audit('original').catch(() => {});
    this.#runQueue().catch((err) => this.emit('error', err));
    return { untracked: snap.untracked.length, dirty: snap.dirty };
  }

  async #runQueue() {
    const config = /** @type {Config} */ (this.state.config);
    // Workers take the next queued variant live, not from a list made at the
    // start, so a retry that arrives while the run is going is picked up.
    /** @type {Set<number>} */
    const claimed = new Set();
    const next = () => {
      const v = this.state.variants.find((x) => x.status === 'queued' && !claimed.has(x.n));
      if (v) claimed.add(v.n);
      return v;
    };
    // Set when the agent itself can't run (missing, not signed in): the rest
    // of the queue would fail the same way, so it isn't started.
    /** @type {{ reason?: string }} */
    const halt = {};
    const workers = Array.from({ length: Math.max(1, config.concurrency) }, async () => {
      for (let v = next(); v; v = next()) {
        if (halt.reason) {
          Object.assign(v, { status: 'failed', error: `Not started: ${halt.reason}`, finishedAt: Date.now() });
          await this.save();
          continue;
        }
        await this.#generateOne(v, halt);
      }
    });
    await Promise.all(workers);
    if (this.state.phase === 'generating') {
      this.state.phase = this.state.variants.some((v) => v.status === 'done') ? 'ready' : 'setup';
      await this.save();
    }
  }

  /** @param {number} n */
  async retry(n) {
    const v = this.state.variants.find((x) => x.n === n);
    if (!v || this.state.phase === 'finalized') return;
    // A variant that is still queued or running must not be started twice:
    // the second run would delete the first one's worktree under it.
    if (!['failed', 'cancelled'].includes(v.status)) return;
    v.status = 'queued';
    v.error = undefined;
    v.step = undefined;
    v.picked = undefined;
    v.startedAt = undefined;
    v.finishedAt = undefined;
    v.summary = '';
    v.files = [];
    v.costUsd = undefined;
    v.usage = undefined;
    v.review = undefined;
    v.audit = undefined;
    v.auditState = undefined;
    v.auditError = undefined;
    const wasIdle = this.state.phase !== 'generating';
    this.state.phase = 'generating';
    await this.save();
    if (wasIdle) this.#runQueue().catch((err) => this.emit('error', err));
  }

  /** @param {number} n */
  async cancel(n) {
    const run = this.runs.get(n);
    const v = this.state.variants.find((x) => x.n === n);
    if (!v || ['done', 'failed', 'cancelled'].includes(v.status)) return;
    if (run) {
      run.cancelled = true;
      if (run.child) await killTree(run.child);
    }
    v.status = 'cancelled';
    await this.save();
  }

  /** @param {Variant} v @param {{ reason?: string }} [halt] */
  async #generateOne(v, halt = {}) {
    const config = /** @type {Config} */ (this.state.config);
    const adapter = adapterById(config.stackId);
    const agent = agentById(config.agent);
    const log = new LineBuffer(2000);
    /** @type {AgentRunState & { log: LineBuffer }} */
    const run = { log };
    /** @type {ReturnType<typeof setInterval> | undefined} */
    let liveUsage;
    this.runs.set(v.n, run);
    const say = (/** @type {string} */ line) => {
      log.push(line + '\n');
      const next = stepFrom(line, v.step ?? 0);
      if (next >= 0) {
        v.step = next;
        this.save().catch(() => {});
      }
      this.emit('log', { target: `v${v.n}`, lines: [line] });
    };
    const update = async (/** @type {Partial<Variant>} */ patch) => {
      Object.assign(v, patch);
      await this.save();
    };

    try {
      if (!agent) throw new Error(`Unknown agent "${config.agent}".`);
      await update({ status: 'preparing', startedAt: Date.now(), step: 0 });
      const wt = this.worktreeFor(v.n);
      say(`Creating worktree ${wt}`);
      await this.gitLock(() => git.addWorktree(this.repo, wt, this.branchFor(v.n), this.state.base));
      const { placed, lockfiles } = await this.#prepareWorktree(wt, config, adapter, say);
      if (run.cancelled) return;

      // With a browser, the agent can look at its own variant while it works.
      const browser = config.browser && agent.id !== 'demo';
      const mcp = browser ? { playwright: playwrightMcp() } : undefined;
      const previewUrl = browser ? this.pool.urls(`v${v.n}`)?.preview : undefined;
      if (browser) this.pool.ensure(`v${v.n}`).catch(() => {});

      const briefPath = path.join(this.dir, 'briefs', `v${v.n}.md`);
      await mkdir(path.dirname(briefPath), { recursive: true });
      const appDir = path.join(wt, config.appRel);
      await writeFile(
        briefPath,
        writeBrief({
          agent: agent.id,
          variant: v.n,
          count: config.count,
          approach: config.approach,
          direction: v.direction,
          brief: config.brief,
          routes: config.routes,
          extras: config.extras ?? [],
          appRel: config.appRel,
          stackName: adapter.name,
          stackId: adapter.id,
          styles: adapter.styles,
          hasProduct: existsSync(path.join(appDir, 'PRODUCT.md')) || existsSync(path.join(wt, 'PRODUCT.md')),
          hasDesign: existsSync(path.join(appDir, 'DESIGN.md')) || existsSync(path.join(wt, 'DESIGN.md')),
          previewUrl,
        }),
      );

      await update({ status: 'running' });
      // Copy the agent's running usage onto the variant every few seconds.
      let lastUsage = '';
      liveUsage = setInterval(() => {
        const now = JSON.stringify([run.usage, run.costUsd, run.credits, run.picked]);
        if (now === lastUsage) return;
        lastUsage = now;
        Object.assign(v, { usage: run.usage && { ...run.usage }, costUsd: run.costUsd, credits: run.credits, picked: run.picked });
        this.save().catch(() => {});
      }, 3000);
      const launch = async (/** @type {string} */ brief) => {
        const inv = agent.invocation({ cwd: wt, briefPath: brief, model: config.model || undefined, permissions: config.permissions, mcp });
        inv.file = await agentFile(agent);
        say(`$ ${inv.file === agent.bin ? agent.bin : JSON.stringify(inv.file)} ${inv.args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`);
        return this.#runAgent(run, inv, wt, config.agentTimeoutMin, say);
      };
      const { text: output, tail, unavailable } = await launch(briefPath);
      if (run.cancelled) return;

      // An agent that couldn't run or changed nothing has nothing to review.
      // A lockfile the install rewrote and the agent left alone is install
      // churn, not part of the redesign.
      for (const [rel, body] of lockfiles) {
        if ((await readFile(path.join(appDir, rel), 'utf8').catch(() => null)) === body) placed.push(rel);
      }
      const exclude = placed.map((p) => path.posix.join(config.appRel.replace(/\\/g, '/'), p));
      const nothingChanged = () =>
        unavailable
          ? new AgentUnavailable(`${agent.name} can't run: ${unavailable}`)
          : new Error(['The agent finished without changing any files.', ...tailLines(tail)].join('\n'));
      if (!(await git.hasChanges(wt, exclude))) throw nothingChanged();

      // The review pass: Impeccable's critique and audit, fed the machine
      // scores, fixing what they find. Its failure keeps the build.
      let review = '';
      if (config.review && agent.id !== 'demo') {
        await update({ status: 'reviewing' });
        say('Reviewing: Impeccable critique and audit.');
        const scores = config.audit ? await this.#score(`v${v.n}`, config, say) : undefined;
        const reviewPath = path.join(this.dir, 'briefs', `v${v.n}-review.md`);
        await writeFile(
          reviewPath,
          writeReviewBrief({ variant: v.n, agent: agent.id, routes: config.routes, previewUrl, audit: scores && auditMarkdown(scores) }),
        );
        run.carry = { costUsd: run.costUsd, usage: run.usage, credits: run.credits };
        try {
          review = extractReview((await launch(reviewPath)).text);
        } catch (err) {
          if (run.cancelled) return;
          say(`Review pass failed, keeping the design as built: ${err instanceof Error ? err.message.split('\n')[0] : err}`);
        }
        if (run.cancelled) return;
      }

      await update({ status: 'committing' });
      const files = await git.commitAll(wt, `variantly: variant ${v.n} (${v.direction})`, exclude);
      if (!files.length) throw nothingChanged();
      say(`Committed ${files.length} changed file${files.length === 1 ? '' : 's'}.`);
      await update({ status: 'done', files, summary: extractSummary(output), review: review || undefined, finishedAt: Date.now(), costUsd: run.costUsd, usage: run.usage, credits: run.credits, picked: run.picked });
      // Warm the first finished variant so there is something to compare.
      if (this.state.variants.filter((x) => x.status === 'done').length === 1) {
        this.pool.ensure(`v${v.n}`).catch(() => {});
      }
      if (config.audit) this.audit(`v${v.n}`).catch(() => {});
    } catch (err) {
      if (run.cancelled) return;
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof AgentUnavailable) halt.reason ??= message;
      say(`Failed: ${message}`);
      await update({ status: 'failed', error: message.split('\n').slice(0, 8).join('\n'), finishedAt: Date.now(), usage: run.usage, costUsd: run.costUsd, credits: run.credits });
    } finally {
      run.child = undefined;
      clearInterval(liveUsage);
    }
  }

  /**
   * Give a fresh worktree what it needs to run that git doesn't carry.
   * @param {string} wt
   * @param {Config} config
   * @param {import('./stacks.mjs').StackAdapter} adapter
   * @param {(line: string) => void} say
   * @returns {Promise<{ placed: string[], lockfiles: Map<string, string> }>} paths placed under
   *   the app root, and the lockfiles as the install left them
   */
  async #prepareWorktree(wt, config, adapter, say) {
    const appSrc = path.join(this.repo, config.appRel);
    const appDst = path.join(wt, config.appRel);
    const install = config.deps === 'install';
    const link = install ? adapter.link.filter((p) => p !== 'node_modules') : adapter.link;
    const placed = await git.placeShared(appSrc, appDst, { link, copy: adapter.copy });
    if (config.appRel && !install) {
      // Workspaces hoist dependencies to the repository root.
      await git.placeShared(this.repo, wt, { link: ['node_modules'], copy: [] });
    }
    // Agent skills and Impeccable's project context are often untracked.
    for (const rel of ['.claude/skills', '.agents/skills', '.codex/skills', '.github/skills', '.impeccable', 'PRODUCT.md', 'DESIGN.md']) {
      const src = path.join(this.repo, rel);
      const dst = path.join(wt, rel);
      if (existsSync(src) && !existsSync(dst)) {
        await cp(src, dst, { recursive: true });
        placed.push(path.posix.relative(config.appRel.replace(/\\/g, '/') || '.', rel));
      }
    }
    // Impeccable's global installs land in different home folders per agent
    // (and Copilot doesn't read every one of them). Put the skill where this
    // agent reads project skills, inside the worktree, so it is always found.
    const projectSkillDir = { claude: '.claude/skills', codex: '.agents/skills', copilot: '.github/skills' }[config.agent];
    if (projectSkillDir && !existsSync(path.join(wt, projectSkillDir, 'impeccable', 'SKILL.md'))) {
      const home = os.homedir();
      const source = ['.claude/skills', '.agents/skills', '.github/skills', '.copilot/skills', '.codex/skills']
        .map((d) => path.join(home, d, 'impeccable'))
        .find((d) => existsSync(path.join(d, 'SKILL.md')));
      if (source) {
        const rel = path.posix.join(projectSkillDir, 'impeccable');
        await cp(source, path.join(wt, rel), { recursive: true });
        placed.push(path.posix.relative(config.appRel.replace(/\\/g, '/') || '.', rel));
      }
    }
    if (placed.length) say(`Linked or copied: ${placed.join(', ')}`);
    // The owner's answers become PRODUCT.md in the variant itself (committed
    // with it), so the kept variant brings its design files home.
    const productPath = path.join(appDst, 'PRODUCT.md');
    if (hasAnswers(config.product) && !existsSync(productPath) && !existsSync(path.join(wt, 'PRODUCT.md'))) {
      await writeFile(productPath, productMarkdown(path.basename(this.repo), /** @type {import('./brief.mjs').ProductAnswers} */ (config.product)));
      say('Wrote PRODUCT.md from your answers.');
    } else if (!existsSync(productPath) && !existsSync(path.join(wt, 'PRODUCT.md'))) {
      // No answers and no PRODUCT.md: one, from the code, the same in every
      // variant, instead of each agent guessing on its own time.
      this.codeProduct ??= productFromCode(this.repo, config.appRel);
      if (this.codeProduct.purpose) {
        await writeFile(productPath, productMarkdown(path.basename(this.repo), this.codeProduct).replace("from the owner's answers", 'from what the code says about itself'));
        say('Wrote a shared PRODUCT.md from your code.');
      }
    }
    if (install) {
      const command = adapter.install ?? packageRunner(appSrc, this.repo).install;
      say(`$ ${command}`);
      const [file, ...args] = command.split(' ');
      const res = await run(file, args, { cwd: appDst, timeout: 600_000 });
      if (installFailed(res.code, res.stderr + res.stdout)) {
        const detail = (res.stderr || res.stdout).trim().split('\n').slice(-6).join('\n');
        throw new Error(`${command} failed (exit ${res.code})\n${detail}`);
      }
    }
    /** @type {Map<string, string>} */
    const lockfiles = new Map();
    if (install) {
      for (const rel of LOCKFILES) {
        const body = await readFile(path.join(appDst, rel), 'utf8').catch(() => null);
        if (body !== null) lockfiles.set(rel, body);
      }
    }
    return { placed, lockfiles };
  }

  /**
   * @param {AgentRunState} run
   * @param {import('./agents.mjs').AgentRun} inv
   * @param {string} cwd
   * @param {number} timeoutMin
   * @param {(line: string) => void} say
   * @returns {Promise<{ text: string, tail: string[], unavailable?: string }>} the agent's final
   *   text, its last output lines, and why it can't run at all if it said so
   */
  #runAgent(run, inv, cwd, timeoutMin, say) {
    return new Promise((resolve, reject) => {
      const child = spawnArgs(inv.file, inv.args, { cwd, env: { ...process.env, ...inv.env } });
      run.child = child;
      child.stdin?.end();
      const parser = createParser(inv.output, { cwd });
      let partial = '';
      const onLine = (/** @type {string} */ line) => {
        for (const msg of parser.push(line)) {
          say(msg);
          const named = msg.match(/DIRECTION:\s*\**([^*\n]{2,60})/);
          if (named) run.picked = named[1].trim().replace(/[.`]+$/, '');
        }
        // Live usage: the board shows spend while the agent works.
        tally(run, parser);
      };
      const onData = (/** @type {Buffer} */ chunk) => {
        const parts = (partial + chunk.toString()).split(/\r?\n/);
        partial = parts.pop() ?? '';
        parts.forEach(onLine);
      };
      child.stdout?.on('data', onData);
      child.stderr?.on('data', (d) => String(d).split(/\r?\n/).filter(Boolean).forEach((l) => {
        parser.note(l);
        say(l);
      }));
      const timer = setTimeout(() => {
        say(`Timed out after ${timeoutMin} minutes.`);
        killTree(child);
      }, timeoutMin * 60_000);
      child.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`Could not start ${inv.file}: ${err.message}`));
      });
      // 'close', not 'exit': exit can fire before stdout has drained, losing the tail.
      child.on('close', (code) => {
        clearTimeout(timer);
        if (partial) onLine(partial);
        tally(run, parser);
        const result = { text: parser.text(), tail: parser.tail(), unavailable: parser.unavailable() };
        if (run.cancelled || code === 0) return resolve(result);
        if (result.unavailable) return reject(new AgentUnavailable(`The agent exited with code ${code}: ${result.unavailable}`));
        const error = parser.error();
        reject(new Error(error ? `The agent exited with code ${code}: ${error}` : [`The agent exited with code ${code}.`, ...tailLines(result.tail)].join('\n')));
      });
    });
  }

  /**
   * Score one target (the original or a variant) with axe-core and
   * Lighthouse, one at a time so audits don't fight over servers.
   * @param {string} id  'original' | 'v1' ...
   */
  async audit(id) {
    const config = this.state.config;
    if (!config) return;
    const v = id === 'original' ? undefined : this.state.variants.find((x) => `v${x.n}` === id);
    if (id !== 'original' && !v) return;
    const mark = async (/** @type {Partial<Variant>} */ patch) => {
      if (v) Object.assign(v, patch);
      await this.save();
    };
    await mark({ auditState: 'running', auditError: undefined });
    /** @type {Promise<void>} */
    const next = (this.auditQueue ?? Promise.resolve()).then(async () => {
      try {
        const say = (/** @type {string} */ line) => this.emit('log', { target: id, lines: [line] });
        const result = await this.#score(id, config, say, true);
        if (v) await mark({ audit: result, auditState: undefined });
        else {
          this.state.baseline = result;
          this.state.baselineError = undefined;
          await this.save();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message.split('\n')[0] : String(err);
        if (v) await mark({ auditState: 'failed', auditError: message });
        else {
          this.state.baselineError = message;
          await this.save();
        }
      }
    });
    this.auditQueue = next.catch(() => {});
    return next;
  }

  /**
   * Start a target if needed and run the audit against its dev server.
   * @param {string} id @param {Config} config @param {(line: string) => void} say
   * @param {boolean} [rethrow]  throw on failure instead of returning undefined
   */
  async #score(id, config, say, rethrow = false) {
    try {
      await this.pool.ensure(id);
      const base = this.pool.urls(id)?.upstream;
      if (!base) throw new Error(this.pool.status(id)?.error ?? 'The server is not running.');
      const route = config.routes.find((r) => r.startsWith('/')) ?? '/';
      say(`Scoring ${id} with axe-core and Lighthouse…`);
      const result = await runAudit(new URL(route, base).href);
      say(`Scored ${id}: accessibility ${result.lighthouse.accessibility ?? '–'}, ${result.axe.total} axe violations.`);
      return result;
    } catch (err) {
      if (rethrow) throw err;
      say(`Could not score ${id}: ${err instanceof Error ? err.message.split('\n')[0] : err}`);
      return undefined;
    }
  }

  /** Register the original and every finished variant with the server pool. */
  async #registerTargets() {
    const config = /** @type {Config} */ (this.state.config);
    const adapter = adapterById(config.stackId);
    const values = (/** @type {string} */ appDir) => ({
      run: packageRunner(path.join(this.repo, config.appRel), this.repo).run,
      python: pythonFor(path.join(this.repo, config.appRel)),
      node: JSON.stringify(process.execPath),
      variantly: VARIANTLY_ROOT,
      app: appDir,
    });
    const common = {
      bootTimeout: adapter.bootTimeout ?? 120_000,
      fixedPort: adapter.fixedPorts,
      defaultPort: adapter.defaultPort,
      readyFile: adapter.readyFile?.(config.command),
    };
    const originalDir = path.join(this.repo, config.appRel);
    await this.pool.add({
      id: 'original',
      cwd: originalDir,
      command: fill(config.command, values(originalDir)),
      external: config.originalUrl || undefined,
      ...common,
    });
    for (const v of this.state.variants) {
      const appDir = path.join(this.worktreeFor(v.n), config.appRel);
      await this.pool.add({
        id: `v${v.n}`,
        cwd: appDir,
        command: fill(config.command, values(appDir)),
        env: { CARGO_TARGET_DIR: path.join(this.dir, 'cargo', `v${v.n}`) },
        ...common,
      });
    }
    this.emit('state', this.snapshot());
  }

  /**
   * Keep variant n: apply its changes to the user's working tree, then
   * tear everything else down. Variant branches are kept so nothing is lost.
   * @param {number} n
   */
  async finalize(n) {
    const v = this.state.variants.find((x) => x.n === n);
    if (!v || v.status !== 'done') throw new Error(`Variant ${n} isn't finished.`);
    if (this.state.phase === 'generating') {
      for (const other of this.state.variants) await this.cancel(other.n);
    }
    await this.pool.closeAll();
    const result = await git.applyBranch(this.repo, this.state.base, this.branchFor(n));
    const depsChanged = result.files.some((f) => /(^|\/)(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|composer\.(json|lock)|Gemfile(\.lock)?|go\.(mod|sum)|Cargo\.(toml|lock)|requirements.*\.txt|pyproject\.toml)$/.test(f));
    // The change is already applied: a worktree Windows won't release yet is
    // left for `variantly clean` rather than failing the keep.
    for (const other of this.state.variants) {
      await this.gitLock(() => git.removeWorktree(this.repo, this.worktreeFor(other.n))).catch(() => {});
    }
    this.state.phase = 'finalized';
    this.state.chosen = n;
    this.state.result = { files: result.files, conflicts: result.conflicts, depsChanged };
    await this.save();
    return this.state.result;
  }

  /**
   * Throw away the current run: servers, worktrees, branches, state. After a
   * variant was kept, the run's branches stay (they are the record of what
   * the other variants were) until `variantly clean`.
   */
  async discard() {
    const keepBranches = this.state.phase === 'finalized';
    for (const v of this.state.variants) await this.cancel(v.n);
    await this.pool.closeAll();
    /** @type {string[]} */
    const leftovers = [];
    for (const v of this.state.variants) {
      await this.gitLock(() => git.removeWorktree(this.repo, this.worktreeFor(v.n))).catch(() => leftovers.push(this.worktreeFor(v.n)));
    }
    if (leftovers.length) {
      this.emit('error', new Error(`Could not remove ${leftovers.join(', ')} yet; \`variantly clean\` will.`));
    }
    if (this.state.runId && !keepBranches) await git.deleteBranches(this.repo, `variantly/${this.state.runId}/`);
    this.runs.clear();
    const config = this.state.config;
    this.state = { version: 1, phase: 'setup', runId: '', base: '', config, variants: [], chosen: null, result: null };
    await rm(path.join(this.dir, 'briefs'), { recursive: true, force: true });
    await rm(path.join(this.dir, 'cargo'), { recursive: true, force: true });
    await this.save();
  }

  async close() {
    for (const [, run] of this.runs) if (run.child) await killTree(run.child);
    await this.pool.closeAll();
  }
}

/** The agent CLI can't do any work here (missing, a shim, not signed in). */
export class AgentUnavailable extends Error {}

/** The last few output lines, for an error that has to say why. @param {string[]} tail */
const tailLines = (tail) => (tail.length ? ['Last output:', ...tail.slice(-5).map((l) => `  ${l.slice(0, 200)}`)] : []);

/** @param {string} id */
const frameScriptTag = (id) => `<script src="/__variantly/frame.js" data-variantly="${id}" defer></script>`;

/**
 * @typedef {object} AgentRunState
 * @property {import('node:child_process').ChildProcess} [child]
 * @property {boolean} [cancelled]
 * @property {number} [costUsd]
 * @property {number} [credits]
 * @property {string} [picked]
 * @property {import('./agent-output.mjs').Usage} [usage]
 * @property {{ costUsd?: number, credits?: number, usage?: import('./agent-output.mjs').Usage }} [carry]  totals from earlier passes
 */

/** @param {number | undefined} a @param {number | undefined} b */
const plus = (a, b) => (a === undefined ? b : b === undefined ? a : a + b);

/**
 * Copy a parser's running totals onto the run, on top of earlier passes.
 * @param {AgentRunState} run @param {import('./agent-output.mjs').OutputParser} parser
 */
const tally = (run, parser) => {
  const c = run.carry ?? {};
  const u = parser.usage();
  run.costUsd = plus(c.costUsd, parser.costUsd());
  run.credits = plus(c.credits, parser.credits?.());
  run.usage =
    c.usage && u
      ? {
          inputTokens: c.usage.inputTokens + u.inputTokens,
          outputTokens: c.usage.outputTokens + u.outputTokens,
          cachedInputTokens: c.usage.cachedInputTokens + u.cachedInputTokens,
        }
      : (u ?? c.usage);
};
