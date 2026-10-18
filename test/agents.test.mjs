import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AGENTS, agentById, binCandidates, codexProvider, hasSkill, impeccableSources, skillLocations } from '../src/agents.mjs';
import { writeBrief } from '../src/brief.mjs';
import { installSkill, parseProviders, SKILL_SOURCE } from '../src/install-skill.mjs';

const tmp = () => mkdtempSync(path.join(os.tmpdir(), 'variantly-agents-'));
const agent = (/** @type {string} */ id) => /** @type {import('../src/agents.mjs').AgentAdapter} */ (agentById(id));

const CWD = path.join('W', 'wt', 'v1');
const BRIEF = path.join('W', 'state', 'briefs', 'v1.md');
const BRIEF_DIR = path.dirname(BRIEF);
const PROMPT = 'Read the file W/state/briefs/v1.md and carry out the brief in it exactly. It is your whole task.';
const NO_HOME = { home: path.join('W', 'nohome'), env: {} };

test('Claude Code invocation', () => {
  const safe = agent('claude').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', model: 'opus' });
  assert.equal(safe.file, 'claude');
  assert.equal(safe.output, 'claude-stream');
  assert.deepEqual(safe.args, [
    '-p', PROMPT, '--output-format', 'stream-json', '--verbose',
    '--permission-mode', 'acceptEdits',
    '--allowedTools', 'Read,Edit,Write,MultiEdit,Glob,Grep,Skill,TodoWrite,WebFetch,Bash(*impeccable*),Bash(git status:*),Bash(git diff:*),Bash(ls:*)',
    '--add-dir', BRIEF_DIR,
    '--model', 'opus',
  ]);
  const full = agent('claude').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'full' });
  assert.deepEqual(full.args, ['-p', PROMPT, '--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions']);
});

test('Codex CLI invocation: exec --json, workspace-write sandbox, no --full-auto', () => {
  const safe = agent('codex').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', model: 'gpt-5.5' });
  assert.equal(safe.file, 'codex');
  assert.equal(safe.output, 'codex-json');
  assert.deepEqual(safe.args, [
    'exec', '--json',
    '--sandbox', 'workspace-write', '-c', 'approval_policy=never',
    '--skip-git-repo-check', '-C', CWD,
    '-m', 'gpt-5.5',
    PROMPT,
  ]);
  const full = agent('codex').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'full' });
  assert.deepEqual(full.args, ['exec', '--json', '--dangerously-bypass-approvals-and-sandbox', '--skip-git-repo-check', '-C', CWD, PROMPT]);
  assert.ok(!safe.args.includes('--full-auto'), '--full-auto was removed from codex exec');
  assert.equal(safe.args.at(-1), PROMPT, 'the prompt is the trailing positional');
});

test('Copilot CLI invocation: -p with JSON output, deny list, brief and skill dirs added', () => {
  const safe = agent('copilot').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', model: 'gpt-5.4', ...NO_HOME });
  assert.equal(safe.file, 'copilot');
  assert.equal(safe.output, 'copilot-json');
  assert.deepEqual(safe.args, [
    '-p', PROMPT, '--output-format', 'json', '--no-ask-user', '--no-color',
    '--allow-all-tools',
    '--allow-all-paths',
    '--deny-tool=shell(git push)', '--deny-tool=shell(git commit)', '--deny-tool=shell(rm)',
    '--add-dir', BRIEF_DIR,
    '--model', 'gpt-5.4',
  ]);
  const full = agent('copilot').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'full', ...NO_HOME });
  assert.deepEqual(full.args, ['-p', PROMPT, '--output-format', 'json', '--no-ask-user', '--no-color', '--allow-all']);

  // User-wide skill folders that exist are made readable to the agent.
  const home = tmp();
  try {
    mkdirSync(path.join(home, '.copilot', 'skills', 'impeccable'), { recursive: true });
    const withSkills = agent('copilot').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', home, env: {} });
    assert.deepEqual(withSkills.args.slice(-2), ['--add-dir', path.join(home, '.copilot', 'skills')]);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('Gemini CLI invocation: stream-json, auto_edit plus a shell policy, brief folder included', () => {
  const safe = agent('gemini').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', model: 'gemini-3-pro' });
  const policy = path.join(BRIEF_DIR, 'gemini-policy.toml');
  assert.equal(safe.file, 'gemini');
  assert.equal(safe.output, 'gemini-stream');
  assert.deepEqual(safe.args, [
    '-p', PROMPT, '--output-format', 'stream-json', '--skip-trust',
    '--approval-mode', 'auto_edit', '--policy', policy,
    '--include-directories', BRIEF_DIR,
    '-m', 'gemini-3-pro',
  ]);
  assert.match(safe.files?.[policy] ?? '', /toolName = "run_shell_command"\ncommandPrefix = \[[^\]]*"npx impeccable"/);
  const full = agent('gemini').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'full' });
  assert.deepEqual(full.args, ['-p', PROMPT, '--output-format', 'stream-json', '--skip-trust', '--approval-mode', 'yolo', '--include-directories', BRIEF_DIR]);
  assert.deepEqual(full.files, {});
});

test('Cursor CLI invocation: print mode, stream-json, trusted workspace, brief folder added', () => {
  const safe = agent('cursor').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', model: 'sonnet-4.6' });
  assert.equal(safe.file, 'cursor-agent');
  assert.equal(safe.output, 'cursor-stream');
  assert.deepEqual(safe.args, [
    '-p', PROMPT, '--output-format', 'stream-json', '--trust',
    '--workspace', CWD, '--add-dir', BRIEF_DIR, '--force',
    '--model', 'sonnet-4.6',
  ]);
  const full = agent('cursor').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'full' });
  assert.deepEqual(full.args.slice(-3), ['--force', '--sandbox', 'disabled']);
});

test('OpenCode invocation: run --format json, permissions and MCP in OPENCODE_CONFIG_CONTENT', () => {
  const safe = agent('opencode').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', model: 'opencode/big-pickle', ...NO_HOME });
  assert.equal(safe.file, 'opencode');
  assert.equal(safe.output, 'opencode-json');
  assert.deepEqual(safe.args, ['run', '--format', 'json', '-m', 'opencode/big-pickle', PROMPT]);
  const cfg = JSON.parse(safe.env?.OPENCODE_CONFIG_CONTENT ?? '');
  assert.deepEqual(cfg.permission, {
    question: 'deny',
    doom_loop: 'deny',
    bash: { '*': 'deny', '*impeccable*': 'allow', 'git status*': 'allow', 'git diff*': 'allow', 'ls*': 'allow' },
    external_directory: { '*': 'deny', [`${BRIEF_DIR.replace(/\\/g, '/')}/**`]: 'allow' },
  });
  assert.deepEqual(Object.keys(cfg.permission.bash)[0], '*', 'the catch-all comes first: the last matching rule wins');
  assert.equal(cfg.mcp, undefined);

  const full = agent('opencode').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'full', ...NO_HOME });
  assert.deepEqual(full.args, ['run', '--format', 'json', '--auto', PROMPT]);
  assert.deepEqual(JSON.parse(full.env?.OPENCODE_CONFIG_CONTENT ?? '').permission, { question: 'deny', doom_loop: 'deny' });

  // User-wide skill folders that exist are readable outside the worktree.
  const home = tmp();
  try {
    mkdirSync(path.join(home, '.config', 'opencode', 'skills', 'impeccable'), { recursive: true });
    const inv = agent('opencode').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', home, env: {} });
    const ext = JSON.parse(inv.env?.OPENCODE_CONFIG_CONTENT ?? '').permission.external_directory;
    assert.equal(ext[`${path.join(home, '.config', 'opencode', 'skills').replace(/\\/g, '/')}/**`], 'allow');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('Grok Build invocation: -p with Claude-style stream, dontAsk plus an allow list, trusted folder', () => {
  const safe = agent('grok').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', model: 'grok-build' });
  assert.equal(safe.file, 'grok');
  assert.equal(safe.output, 'grok-stream');
  assert.deepEqual(safe.args, [
    '-p', PROMPT, '--output-format', 'streaming-messages-json', '--no-auto-update', '--trust',
    '--permission-mode', 'dontAsk',
    '--allow', 'Read', '--allow', 'Edit', '--allow', 'Grep',
    '--allow', 'Bash(*impeccable*)', '--allow', 'Bash(git status*)', '--allow', 'Bash(git diff*)', '--allow', 'Bash(ls*)',
    '-m', 'grok-build',
  ]);
  const full = agent('grok').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'full' });
  assert.deepEqual(full.args, ['-p', PROMPT, '--output-format', 'streaming-messages-json', '--no-auto-update', '--trust', '--always-approve']);
  assert.equal(agent('grok').mcp, false, 'MCP servers come only from Grok\'s config files');
  const withMcp = agent('grok').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', mcp: { playwright: { command: 'npx', args: [] } } });
  assert.deepEqual(withMcp.args, safe.args.slice(0, -2));
});

test('Hermes Agent invocation: one-shot chat with stream-json, narrowed toolsets in safe mode', () => {
  const safe = agent('hermes').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', model: 'anthropic/claude-sonnet-4.6' });
  assert.equal(safe.file, 'hermes');
  assert.equal(safe.output, 'hermes-stream');
  assert.deepEqual(safe.args, [
    'chat', '--oneshot', '-q', PROMPT, '--format', 'stream-json', '--source', 'tool',
    '-t', 'file,terminal,skills,todo',
    '-m', 'anthropic/claude-sonnet-4.6',
  ]);
  const full = agent('hermes').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'full' });
  assert.deepEqual(full.args, ['chat', '--oneshot', '-q', PROMPT, '--format', 'stream-json', '--source', 'tool', '--yolo']);
  assert.equal(agent('hermes').mcp, false);
});

test('Pi invocation: print mode with JSON events; safe mode drops the shell and trusts only skill folders', () => {
  const safe = agent('pi').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', model: 'anthropic/claude-sonnet-4-6' });
  assert.equal(safe.file, 'pi');
  assert.equal(safe.output, 'pi-json');
  assert.deepEqual(safe.args, [
    '-p', '--mode', 'json', '--no-session',
    '--no-approve', '--tools', 'read,edit,write,grep,find,ls',
    '--model', 'anthropic/claude-sonnet-4-6',
    PROMPT,
  ]);
  assert.ok(!safe.args.join(',').includes('bash'));
  const full = agent('pi').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'full' });
  assert.deepEqual(full.args, ['-p', '--mode', 'json', '--no-session', '--approve', PROMPT]);
  assert.equal(agent('pi').mcp, false);

  // The worktree's skill folders are loaded explicitly, without trusting the project.
  const wt = tmp();
  try {
    mkdirSync(path.join(wt, '.pi', 'skills', 'impeccable'), { recursive: true });
    const inv = agent('pi').invocation({ cwd: wt, briefPath: BRIEF, permissions: 'safe' });
    assert.deepEqual(inv.args.slice(inv.args.indexOf('--skill'), inv.args.indexOf('--skill') + 2), ['--skill', path.join(wt, '.pi/skills')]);
    assert.equal(inv.args.filter((a) => a === '--skill').length, 1);
  } finally {
    rmSync(wt, { recursive: true, force: true });
  }
});

test('Antigravity invocation: flags first, prompt last, brief folder added', () => {
  const safe = agent('antigravity').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', model: 'gemini-3.6-flash' });
  assert.equal(safe.file, 'agy');
  assert.equal(safe.output, 'antigravity-stream');
  assert.deepEqual(safe.args, ['--output-format', 'stream-json', '--add-dir', BRIEF_DIR, '--model', 'gemini-3.6-flash', '-p', PROMPT]);
  const full = agent('antigravity').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'full' });
  assert.deepEqual(full.args, ['--output-format', 'stream-json', '--add-dir', BRIEF_DIR, '--dangerously-skip-permissions', '-p', PROMPT]);
  assert.equal(agent('antigravity').mcp, false);
});

test('Codex through OpenRouter: the configured provider and its key variable are read', () => {
  const home = tmp();
  try {
    assert.equal(codexProvider(home), null, 'no config.toml');
    writeFileSync(path.join(home, 'config.toml'), 'model = "gpt-5.5"\n');
    assert.equal(codexProvider(home), null, 'OpenAI by default');
    writeFileSync(
      path.join(home, 'config.toml'),
      [
        'model = "anthropic/claude-sonnet-4.6"',
        'model_provider = "openrouter"',
        '',
        '[model_providers.openai]',
        'env_key = "OPENAI_API_KEY"',
        '',
        '[model_providers.openrouter]',
        'name = "OpenRouter"',
        'base_url = "https://openrouter.ai/api/v1"',
        'env_key = "OPENROUTER_API_KEY"',
        '',
      ].join('\n'),
    );
    assert.deepEqual(codexProvider(home), { id: 'openrouter', envKey: 'OPENROUTER_API_KEY' });
    writeFileSync(path.join(home, 'config.toml'), '[profiles.x]\nmodel_provider = "openrouter"\n');
    assert.equal(codexProvider(home), null, 'a provider inside a table is not the default');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('binCandidates also looks in ~/.grok/bin, where Grok Build installs', () => {
  const home = tmp();
  try {
    const bin = path.join(home, '.grok', 'bin');
    mkdirSync(bin, { recursive: true });
    const file = path.join(bin, process.platform === 'win32' ? 'grok.CMD' : 'grok');
    writeFileSync(file, '');
    const found = binCandidates('grok', { PATH: '', HOME: home, USERPROFILE: home, PATHEXT: '.CMD' });
    assert.deepEqual(found.map((f) => f.toLowerCase()), [file.toLowerCase()]);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('binCandidates also looks in ~/.local/bin, where Cursor installs', () => {
  const home = tmp();
  try {
    const bin = path.join(home, '.local', 'bin');
    mkdirSync(bin, { recursive: true });
    const file = path.join(bin, process.platform === 'win32' ? 'cursor-agent.CMD' : 'cursor-agent');
    writeFileSync(file, '');
    const found = binCandidates('cursor-agent', { PATH: '', HOME: home, USERPROFILE: home, PATHEXT: '.CMD' });
    assert.equal(found.length, 1);
    assert.equal(found[0].toLowerCase(), file.toLowerCase());
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('skill locations match where each agent reads skills', () => {
  const home = path.join('H');
  const project = path.join('P');
  const where = { home, projectRoot: project, env: {} };
  assert.deepEqual(skillLocations(agent('claude'), 'impeccable', where), [
    path.join(project, '.claude/skills', 'impeccable'),
    path.join(home, '.claude', 'skills', 'impeccable'),
  ]);
  assert.deepEqual(skillLocations(agent('codex'), 'impeccable', where), [
    path.join(project, '.agents/skills', 'impeccable'),
    path.join(project, '.codex/skills', 'impeccable'),
    path.join(home, '.agents', 'skills', 'impeccable'),
    path.join(home, '.codex', 'skills', 'impeccable'),
  ]);
  assert.deepEqual(skillLocations(agent('copilot'), 'impeccable', where), [
    path.join(project, '.github/skills', 'impeccable'),
    path.join(project, '.agents/skills', 'impeccable'),
    path.join(project, '.claude/skills', 'impeccable'),
    path.join(home, '.copilot', 'skills', 'impeccable'),
    path.join(home, '.agents', 'skills', 'impeccable'),
  ]);
  assert.deepEqual(skillLocations(agent('gemini'), 'impeccable', where), [
    path.join(project, '.gemini/skills', 'impeccable'),
    path.join(project, '.agents/skills', 'impeccable'),
    path.join(home, '.gemini', 'skills', 'impeccable'),
    path.join(home, '.agents', 'skills', 'impeccable'),
  ]);
  assert.deepEqual(skillLocations(agent('cursor'), 'impeccable', where), [
    path.join(project, '.cursor/skills', 'impeccable'),
    path.join(project, '.agents/skills', 'impeccable'),
    path.join(project, '.claude/skills', 'impeccable'),
    path.join(home, '.cursor', 'skills', 'impeccable'),
    path.join(home, '.agents', 'skills', 'impeccable'),
    path.join(home, '.claude', 'skills', 'impeccable'),
  ]);
  assert.deepEqual(skillLocations(agent('opencode'), 'impeccable', where), [
    path.join(project, '.opencode/skills', 'impeccable'),
    path.join(project, '.agents/skills', 'impeccable'),
    path.join(project, '.claude/skills', 'impeccable'),
    path.join(home, '.config', 'opencode', 'skills', 'impeccable'),
    path.join(home, '.agents', 'skills', 'impeccable'),
    path.join(home, '.claude', 'skills', 'impeccable'),
  ]);
  assert.deepEqual(skillLocations(agent('grok'), 'impeccable', where), [
    path.join(project, '.grok/skills', 'impeccable'),
    path.join(project, '.agents/skills', 'impeccable'),
    path.join(project, '.claude/skills', 'impeccable'),
    path.join(home, '.grok', 'skills', 'impeccable'),
    path.join(home, '.agents', 'skills', 'impeccable'),
    path.join(home, '.claude', 'skills', 'impeccable'),
  ]);
  assert.equal(skillLocations(agent('grok'), 's', { home, env: { GROK_HOME: path.resolve('GH') } })[0], path.join(path.resolve('GH'), 'skills', 's'));
  assert.deepEqual(skillLocations(agent('hermes'), 'impeccable', where), [
    path.join(project, '.hermes/skills', 'impeccable'),
    path.join(project, '.agents/skills', 'impeccable'),
    path.join(home, '.hermes', 'skills', 'impeccable'),
  ]);
  assert.deepEqual(skillLocations(agent('hermes'), 's', { home, env: { HERMES_HOME: path.resolve('HH') } }), [
    path.join(path.resolve('HH'), 'skills', 's'),
    path.join(home, '.hermes', 'skills', 's'),
  ]);
  assert.deepEqual(skillLocations(agent('pi'), 'impeccable', where), [
    path.join(project, '.pi/skills', 'impeccable'),
    path.join(project, '.agents/skills', 'impeccable'),
    path.join(home, '.pi', 'agent', 'skills', 'impeccable'),
    path.join(home, '.agents', 'skills', 'impeccable'),
  ]);
  assert.equal(skillLocations(agent('pi'), 's', { home, env: { PI_CODING_AGENT_DIR: path.resolve('PA') } })[0], path.join(path.resolve('PA'), 'skills', 's'));
  assert.deepEqual(skillLocations(agent('antigravity'), 'impeccable', where), [
    path.join(project, '.agents/skills', 'impeccable'),
    path.join(project, '.agent/skills', 'impeccable'),
    path.join(home, '.gemini', 'antigravity-cli', 'skills', 'impeccable'),
  ]);
  // OpenCode's config folder follows OPENCODE_CONFIG_DIR, then XDG_CONFIG_HOME.
  assert.equal(skillLocations(agent('opencode'), 's', { home, env: { XDG_CONFIG_HOME: path.resolve('XC') } })[0], path.join(path.resolve('XC'), 'opencode', 'skills', 's'));
  assert.equal(
    skillLocations(agent('opencode'), 's', { home, env: { XDG_CONFIG_HOME: path.resolve('XC'), OPENCODE_CONFIG_DIR: path.resolve('OC') } })[0],
    path.join(path.resolve('OC'), 'skills', 's'),
  );
  // Each CLI's home override is honoured.
  const env = { CLAUDE_CONFIG_DIR: path.resolve('C1'), CODEX_HOME: path.resolve('X1'), COPILOT_HOME: path.resolve('G1') };
  assert.equal(skillLocations(agent('claude'), 's', { home, env })[0], path.join(path.resolve('C1'), 'skills', 's'));
  assert.equal(skillLocations(agent('codex'), 's', { home, env })[1], path.join(path.resolve('X1'), 'skills', 's'));
  assert.equal(skillLocations(agent('copilot'), 's', { home, env })[0], path.join(path.resolve('G1'), 'skills', 's'));
});

test('hasSkill finds Impeccable only where that agent looks', () => {
  const home = tmp();
  const project = tmp();
  try {
    const put = (/** @type {string} */ dir) => {
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, 'SKILL.md'), '---\nname: impeccable\n---\n');
    };
    const where = { home, projectRoot: project, env: {} };
    assert.equal(AGENTS.some((a) => hasSkill(a, 'impeccable', where)), false);

    put(path.join(home, '.agents', 'skills', 'impeccable'));
    assert.equal(hasSkill(agent('codex'), 'impeccable', where), true);
    assert.equal(hasSkill(agent('copilot'), 'impeccable', where), true, 'Copilot also reads ~/.agents/skills');
    assert.equal(hasSkill(agent('claude'), 'impeccable', where), false);

    put(path.join(project, '.github', 'skills', 'impeccable'));
    assert.equal(hasSkill(agent('copilot'), 'impeccable', { ...where, home: project }), true);
    assert.equal(hasSkill(agent('codex'), 'impeccable', { ...where, home: project }), false, 'Codex does not read .github/skills');

    mkdirSync(path.join(home, '.claude', 'skills', 'impeccable'), { recursive: true });
    assert.equal(hasSkill(agent('claude'), 'impeccable', where), false, 'a folder without SKILL.md does not count');
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  }
});

test('the brief names the skill the way each agent expects', () => {
  const base = {
    variant: 1, count: 3, approach: /** @type {const} */ ('redesign'), direction: 'swiss', brief: '', routes: [],
    appRel: '', stackName: 'Vite', stackId: 'vite', styles: '', hasProduct: false, hasDesign: false,
  };
  assert.match(writeBrief({ ...base, agent: 'codex' }), /\(`\$impeccable`; load the skill/);
  assert.match(writeBrief({ ...base, agent: 'copilot' }), /\(`\/impeccable`; load the skill/);
  assert.match(writeBrief({ ...base, agent: 'claude' }), /\(`\/impeccable`; load the skill/);
  assert.match(writeBrief(base), /\(`\/impeccable`; load the skill/);
  assert.match(writeBrief({ ...base, agent: 'pi' }), /\(`\/skill:impeccable`; load the skill/);
});

test('install-skill writes the one SKILL.md into each agent\'s user-wide skills folder', async () => {
  const home = tmp();
  try {
    const source = readFileSync(SKILL_SOURCE, 'utf8');
    assert.match(source, /^---\nname: variantly\ndescription: /, 'agents need name and description front matter');
    const results = await installSkill({ providers: ['claude', 'codex', 'copilot'], scope: 'global', home, env: {} });
    assert.deepEqual(
      results.map((r) => [r.agent, path.relative(home, r.file), r.status]),
      [
        ['claude', path.join('.claude', 'skills', 'variantly', 'SKILL.md'), 'written'],
        ['codex', path.join('.agents', 'skills', 'variantly', 'SKILL.md'), 'written'],
        ['copilot', path.join('.copilot', 'skills', 'variantly', 'SKILL.md'), 'written'],
      ],
    );
    for (const r of results) assert.equal(readFileSync(r.file, 'utf8'), source);
    // Every agent sees it once installed for all of them.
    await installSkill({ providers: AGENTS.map((a) => a.id), scope: 'global', home, env: {} });
    for (const a of AGENTS) assert.equal(hasSkill(a, 'variantly', { home, env: {} }), true, `${a.id} can now see it`);

    // Again: nothing to do. A stale copy is replaced.
    writeFileSync(results[1].file, 'old');
    const again = await installSkill({ providers: ['codex', 'copilot'], scope: 'global', home, env: {} });
    assert.deepEqual(again.map((r) => r.status), ['updated', 'unchanged']);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('install-skill --scope=project writes inside the repository', async () => {
  const project = tmp();
  try {
    const results = await installSkill({ providers: ['copilot', 'codex'], scope: 'project', projectRoot: project, home: path.join(project, 'nohome'), env: {} });
    assert.deepEqual(
      results.map((r) => path.relative(project, r.file)),
      [path.join('.agents', 'skills', 'variantly', 'SKILL.md'), path.join('.github', 'skills', 'variantly', 'SKILL.md')],
    );
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test('install-skill rejects unknown providers and parses the flag', async () => {
  await assert.rejects(installSkill({ providers: ['aider'], scope: 'global', home: tmp(), env: {} }), /Unknown provider aider/);
  assert.deepEqual(parseProviders(' Claude, codex,,codex '), ['claude', 'codex']);
  assert.deepEqual(parseProviders(undefined), []);
});

test('every agent gets the Playwright MCP server when the browser check is on', () => {
  const mcp = { playwright: { command: 'npx', args: ['--yes', '@playwright/mcp@0.0.83', '--headless', '--isolated'] } };
  const claude = agent('claude').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', mcp });
  const cfg = claude.args[claude.args.indexOf('--mcp-config') + 1];
  assert.deepEqual(JSON.parse(cfg), { mcpServers: mcp });
  assert.match(claude.args[claude.args.indexOf('--allowedTools') + 1], /,mcp__playwright$/);

  const codex = agent('codex').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', mcp });
  assert.ok(codex.args.includes('mcp_servers.playwright.command="npx"'));
  assert.ok(codex.args.includes('mcp_servers.playwright.args=["--yes","@playwright/mcp@0.0.83","--headless","--isolated"]'));
  assert.equal(codex.args.at(-1), PROMPT);

  const copilot = agent('copilot').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', mcp, ...NO_HOME });
  const extra = JSON.parse(copilot.args[copilot.args.indexOf('--additional-mcp-config') + 1]);
  assert.deepEqual(extra.mcpServers.playwright, { type: 'local', tools: ['*'], ...mcp.playwright });

  // Gemini and Cursor take MCP servers only from files, written beside the brief.
  const gemini = agent('gemini').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', mcp });
  const settings = path.join(BRIEF_DIR, 'gemini-settings.json');
  assert.equal(gemini.env?.GEMINI_CLI_SYSTEM_SETTINGS_PATH, settings);
  assert.deepEqual(JSON.parse(gemini.files?.[settings] ?? ''), { mcpServers: { playwright: { trust: true, ...mcp.playwright } } });
  assert.deepEqual(gemini.args.slice(gemini.args.indexOf('--allowed-mcp-server-names'), gemini.args.indexOf('--allowed-mcp-server-names') + 2), ['--allowed-mcp-server-names', 'playwright']);

  const cursor = agent('cursor').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', mcp });
  const plugin = path.join(BRIEF_DIR, 'cursor-plugin');
  assert.deepEqual(cursor.args.slice(cursor.args.indexOf('--approve-mcps'), cursor.args.indexOf('--approve-mcps') + 3), ['--approve-mcps', '--plugin-dir', plugin]);
  assert.deepEqual(JSON.parse(cursor.files?.[path.join(plugin, '.mcp.json')] ?? ''), { mcpServers: mcp });
  assert.equal(JSON.parse(cursor.files?.[path.join(plugin, '.cursor-plugin', 'plugin.json')] ?? '').name, 'variantly');

  // OpenCode takes them in its inline config, as a command array.
  const opencode = agent('opencode').invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', mcp, ...NO_HOME });
  assert.deepEqual(JSON.parse(opencode.env?.OPENCODE_CONFIG_CONTENT ?? '').mcp, {
    playwright: { type: 'local', command: ['npx', ...mcp.playwright.args], enabled: true },
  });

  // Without it, nothing changes.
  for (const id of ['claude', 'codex', 'copilot', 'gemini', 'cursor']) {
    const inv = agent(id).invocation({ cwd: CWD, briefPath: BRIEF, permissions: 'safe', ...NO_HOME });
    assert.doesNotMatch(inv.args.join(' '), /mcp/);
    assert.ok(!Object.keys(inv.files ?? {}).some((f) => /settings|plugin/.test(f)));
    assert.equal(inv.env, undefined);
  }
});

test('Impeccable copies anywhere count as sources, including the Antigravity app\'s and OpenCode\'s', () => {
  const home = tmp();
  try {
    assert.deepEqual(impeccableSources(home, {}), []);
    for (const d of [path.join('.gemini', 'config', 'skills'), path.join('.config', 'opencode', 'skills'), path.join('.pi', 'agent', 'skills')]) {
      mkdirSync(path.join(home, d, 'impeccable'), { recursive: true });
      writeFileSync(path.join(home, d, 'impeccable', 'SKILL.md'), '---\nname: impeccable\n---\n');
    }
    assert.deepEqual(new Set(impeccableSources(home, {})), new Set([
      path.join(home, '.gemini', 'config', 'skills', 'impeccable'),
      path.join(home, '.config', 'opencode', 'skills', 'impeccable'),
      path.join(home, '.pi', 'agent', 'skills', 'impeccable'),
    ]));
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
