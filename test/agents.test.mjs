import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AGENTS, agentById, hasSkill, skillLocations } from '../src/agents.mjs';
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
  await assert.rejects(installSkill({ providers: ['cursor'], scope: 'global', home: tmp(), env: {} }), /Unknown provider cursor/);
  assert.deepEqual(parseProviders(' Claude, codex,,codex '), ['claude', 'codex']);
  assert.deepEqual(parseProviders(undefined), []);
});
