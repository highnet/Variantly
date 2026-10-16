#!/usr/bin/env node
// @ts-check
import { parseArgs } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));

const USAGE = `variantly ${pkg.version} — N redesigns of your site, side by side. Keep one.

Usage
  variantly [dir]            open the wizard for the project in dir (default: .)
  variantly doctor [dir]     check git, agents, Impeccable and the detected stack
  variantly status [dir]     print the current run as JSON (for agents and scripts)
  variantly keep <n> [dir]   apply variant n to your working tree, discard the rest
  variantly clean [dir]      remove variantly's worktrees, branches and state
  variantly install-skill [dir]
                             teach your agent to drive variantly: writes the
                             variantly skill where each agent reads skills

Options
  -p, --port <n>             port for the variantly app (default 4477)
      --agent <id>           claude | codex | copilot | demo
      --count <n>            how many variants, 1–10
      --brief <text>         what you want, in your words
      --yes                  skip the wizard: generate with detected defaults
      --demo                 use the built-in demo agent (no AI, no account)
      --no-open              don't open the browser
      --no-browser           don't give the agent a browser (Playwright MCP)
      --no-review            skip the Impeccable critique and audit pass
      --no-audit             skip the axe-core and Lighthouse scores
      --providers <ids>      install-skill: claude,codex,copilot (default: the
                             agents on your PATH)
      --scope <s>            install-skill: global (default, your user) or
                             project (dir, for everyone who clones it)
  -h, --help
  -v, --version

Your agent does the design work with your own subscription or API key;
variantly brings no model. Docs: https://variantly.tools · agents: https://variantly.tools/SKILLS.md`;

const main = async () => {
  /** @type {ReturnType<typeof parseArgs>} */
  let parsed;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      options: {
        port: { type: 'string', short: 'p' },
        agent: { type: 'string' },
        count: { type: 'string' },
        brief: { type: 'string' },
        yes: { type: 'boolean' },
        demo: { type: 'boolean' },
        open: { type: 'boolean', default: true },
        'no-open': { type: 'boolean' },
        'no-browser': { type: 'boolean' },
        'no-review': { type: 'boolean' },
        'no-audit': { type: 'boolean' },
        providers: { type: 'string' },
        scope: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    });
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
    return;
  }
  const { values, positionals } = parsed;
  if (values.help) return console.log(USAGE);
  if (values.version) return console.log(pkg.version);

  const [first, second, third] = positionals;
  if (first === 'install-skill') {
    const str = (/** @type {unknown} */ v) => (typeof v === 'string' ? v : undefined);
    return installSkillCommand({ providers: str(values.providers), scope: str(values.scope), dir: second });
  }
  const command = ['doctor', 'clean', 'status', 'keep'].includes(String(first)) ? String(first) : 'start';
  const dirArg = command === 'start' ? first : command === 'keep' ? third : second;
  const target = path.resolve(String(dirArg ?? '.'));
  if (!existsSync(target)) return fail(`No such folder: ${target}`);

  const git = await import('../src/git.mjs');
  const repo = await git.repoRoot(target);
  if (!repo) {
    return fail(
      `${target} is not inside a git repository.\nvariantly gives every variant its own git worktree, so it needs one:\n\n  git init && git add -A && git commit -m "Before variantly"`,
    );
  }

  if (command === 'doctor') return doctor(repo);
  if (command === 'clean') return clean(repo);
  if (command === 'status') return status(repo);
  if (command === 'keep') return keep(repo, Number(second));

  const [{ startApp, detectProject, normalizeConfig }, { openBrowser, freePort }] = await Promise.all([
    import('../src/server.mjs'),
    import('../src/proc.mjs'),
  ]);

  /** @type {Partial<import('../src/session.mjs').Config>} */
  const defaults = {};
  if (values.demo) defaults.agent = 'demo';
  if (typeof values.agent === 'string') defaults.agent = values.agent;
  if (typeof values.count === 'string') defaults.count = Number(values.count);
  if (typeof values.brief === 'string') defaults.brief = values.brief;
  if (values['no-browser']) defaults.browser = false;
  if (values['no-review']) defaults.review = false;
  if (values['no-audit']) defaults.audit = false;

  const wanted = Number(values.port ?? 4477);
  if (!Number.isInteger(wanted) || wanted < 1 || wanted > 65535) return fail(`--port must be a whole number from 1 to 65535, got "${values.port}".`);
  const port = await freePort(wanted);
  const app = await startApp({ repo, port, defaults });
  const rel = path.relative(process.cwd(), repo) || '.';
  console.log(`\n  variantly ${pkg.version}  ·  ${rel}\n\n  ➜  ${app.url}\n`);
  if (port !== wanted) console.log(`  (port ${wanted} was busy)\n`);

  let closing = false;
  const shutdown = async () => {
    if (closing) process.exit(1);
    closing = true;
    console.log('\n  Stopping dev servers and agents…');
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  if (values.yes && app.session.state.phase === 'setup') {
    try {
      const detected = await detectProject(repo, defaults);
      const chosen = detected.agents.find((/** @type {any} */ a) => a.id === detected.suggested.agent);
      if (chosen && chosen.installed && !chosen.impeccable) {
        const { impeccableInstallCommand } = await import('../src/agents.mjs');
        const { spawnShell } = await import('../src/proc.mjs');
        const cmd = impeccableInstallCommand(chosen.id);
        console.log(`  Installing Impeccable for ${chosen.name}: ${cmd}\n`);
        await new Promise((resolve) => {
          const child = spawnShell(cmd, { cwd: repo });
          // Piped and unread, a chatty installer fills the pipe and hangs.
          child.stdout?.pipe(process.stdout);
          child.stderr?.pipe(process.stderr);
          child.on('error', resolve).on('close', resolve);
        });
      }
      const config = normalizeConfig(detected.suggested);
      await app.session.generate(config);
      console.log(`  Generating ${config.count} variants with ${config.agent}…\n`);
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
    }
  }
  if (values.open && !values['no-open']) openBrowser(app.url);
  console.log('  Press Ctrl+C to stop. Your variants are kept until you pick one or run `variantly clean`.\n');

  app.session.on('log', ({ target, lines }) => {
    if (process.env.VARIANTLY_VERBOSE) for (const line of lines) console.log(`  [${target}] ${line}`);
  });
};

/** @param {string} repo */
const doctor = async (repo) => {
  const { detectProject } = await import('../src/server.mjs');
  const { which, run } = await import('../src/proc.mjs');
  const { impeccableInstallCommand } = await import('../src/agents.mjs');
  const info = await detectProject(repo);
  const ok = (/** @type {boolean} */ b) => (b ? '✓' : '✗');
  const nodeOk = Number(process.versions.node.split('.')[0]) >= 20;
  const gitVersion = (await run('git', ['--version'])).stdout.trim();
  console.log(`variantly ${info.version}\n`);
  console.log(`${ok(nodeOk)} node ${process.versions.node}`);
  console.log(`${ok(Boolean(which('git')))} ${gitVersion || 'git not found'}`);
  console.log(`${ok(info.hasCommits)} repository ${repo}${info.hasCommits ? '' : ' (no commits yet)'}`);
  if (info.dirty) console.log('  · uncommitted changes will be included in every variant');
  if (info.untracked) console.log(`  · ${info.untracked} untracked file(s) will NOT be in the variants; commit or stage what matters`);
  console.log('\nAgents');
  for (const a of info.agents) {
    console.log(`${ok(a.installed)} ${a.name.padEnd(20)} ${a.installed ? a.version : `install: ${a.install}`}`);
    if (a.note) console.log('  · ' + a.note);
    if (a.installed && a.path) console.log('  · ' + a.path);
    if (!a.installed) continue;
    console.log(`  ${ok(a.impeccable)} Impeccable skill ${a.impeccable ? 'found' : `missing: ${impeccableInstallCommand(a.id)}`}`);
    console.log(`  ${a.variantlySkill ? '✓' : '·'} variantly skill ${a.variantlySkill ? 'found' : `not installed (optional): npx variantly install-skill --providers=${a.id}`}`);
  }
  console.log('\nApp');
  if (!info.candidates.length) console.log('✗ no known stack found; set a custom dev command in the wizard');
  for (const c of info.candidates) {
    console.log(`  ${c.name.padEnd(12)} ${c.rel || '.'}  →  ${c.command}${c.running ? `   (running at ${c.defaultUrl})` : ''}`);
  }
};

/**
 * @param {{ providers?: string, scope?: string, dir?: string }} o
 */
const installSkillCommand = async (o) => {
  const { installSkill, parseProviders } = await import('../src/install-skill.mjs');
  const { AGENTS } = await import('../src/agents.mjs');
  const { which } = await import('../src/proc.mjs');
  const scope = String(o.scope ?? 'global');
  if (scope !== 'global' && scope !== 'project') return fail('--scope is global or project.');
  let providers = parseProviders(o.providers);
  if (!providers.length) {
    providers = AGENTS.filter((a) => which(a.bin)).map((a) => a.id);
    if (!providers.length) {
      return fail(`No agent CLI found on PATH. Name the ones to install for:\n\n  npx variantly install-skill --providers=${AGENTS.map((a) => a.id).join(',')}`);
    }
  }
  /** @type {string | undefined} */
  let projectRoot;
  if (scope === 'project') {
    const target = path.resolve(o.dir ?? '.');
    if (!existsSync(target)) return fail(`No such folder: ${target}`);
    const git = await import('../src/git.mjs');
    projectRoot = (await git.repoRoot(target)) ?? target;
  }
  try {
    const results = await installSkill({ providers, scope, projectRoot });
    for (const r of results) {
      const name = AGENTS.find((a) => a.id === r.agent)?.name ?? r.agent;
      console.log(`${r.status === 'unchanged' ? '·' : '✓'} ${name.padEnd(20)} ${r.status.padEnd(9)} ${r.file}`);
    }
    console.log('\nRestart the agent (or start a new session) so it picks up the skill.');
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
};

/** @param {string} repo */
const clean = async (repo) => {
  const { Session, stateDirFor } = await import('../src/session.mjs');
  const git = await import('../src/git.mjs');
  const session = new Session({ repo });
  // A worktree a stray process still holds open (Windows) must not stop the
  // branches and the rest of the state from going.
  session.on('error', (err) => console.error(`  ${err.message}`));
  await session.load();
  await session.discard();
  await session.close();
  await git.deleteBranches(repo, 'variantly/');
  try {
    await rm(stateDirFor(repo), { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  } catch {
    console.error(`  Could not remove ${stateDirFor(repo)}: a process still has it open. Stop it and run \`variantly clean\` again.`);
    process.exitCode = 1;
    return;
  }
  console.log('Removed variantly worktrees, branches and state for this project.');
};

/** @param {string} repo */
const status = async (repo) => {
  const { Session } = await import('../src/session.mjs');
  const session = new Session({ repo });
  const state = await session.load();
  const { config, ...rest } = state;
  console.log(
    JSON.stringify(
      {
        ...rest,
        agent: config?.agent ?? null,
        approach: config?.approach ?? null,
        variants: state.variants.map((v) => ({ ...v, branch: state.runId ? session.branchFor(v.n) : null })),
      },
      null,
      2,
    ),
  );
  await session.close();
};

/** @param {string} repo @param {number} n */
const keep = async (repo, n) => {
  if (!Number.isInteger(n) || n < 1) return fail('Usage: variantly keep <n>   (n is the variant number)');
  const { Session } = await import('../src/session.mjs');
  const session = new Session({ repo });
  await session.load();
  try {
    const result = await session.finalize(n);
    console.log(`Applied variant ${n}: ${result.files.length} file(s) changed in your working tree.`);
    if (result.conflicts.length) console.log(`Resolve conflict markers in: ${result.conflicts.join(', ')}`);
    if (result.depsChanged) console.log('Dependencies changed: run your install command.');
    console.log('The other variants are kept as branches until `variantly clean`.');
  } finally {
    await session.close();
  }
};

/** @param {string} message */
const fail = (message) => {
  console.error(`\n  ${message.split('\n').join('\n  ')}\n`);
  process.exitCode = 1;
};

main().catch((err) => {
  fail(err instanceof Error ? (err.stack ?? err.message) : String(err));
});
