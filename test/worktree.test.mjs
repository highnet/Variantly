import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { addWorktree, commitAll, discardChanges, pendingPaths, placeShared, removeWorktree } from '../src/git.mjs';

const git = (/** @type {string} */ cwd, /** @type {string[]} */ args) => execFileSync('git', args, { cwd, encoding: 'utf8' });

/** A committed repo with a gitignored, installed node_modules. */
const repoWithDeps = () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'variantly-wt-'));
  const repo = path.join(root, 'app');
  mkdirSync(path.join(repo, 'node_modules', 'vite'), { recursive: true });
  writeFileSync(path.join(repo, 'node_modules', 'vite', 'index.js'), 'export {}');
  writeFileSync(path.join(repo, '.gitignore'), 'node_modules\n.env\n');
  writeFileSync(path.join(repo, '.env'), 'A=1\n');
  writeFileSync(path.join(repo, 'app.css'), 'body {}\n');
  git(repo, ['init', '-q']);
  git(repo, ['add', '-A']);
  git(repo, ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'init']);
  return { root, repo, wt: path.join(root, 'wt', 'v1') };
};

test('a variant that links a gitignored node_modules still commits', async (t) => {
  const { root, repo, wt } = repoWithDeps();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  await addWorktree(repo, wt, 'variantly/t/v1', 'HEAD');
  const placed = await placeShared(repo, wt, { link: ['node_modules'], copy: ['.env'] });
  assert.deepEqual(placed, ['node_modules', '.env']);
  writeFileSync(path.join(wt, 'app.css'), 'body { color: red }\n');
  assert.deepEqual(await commitAll(wt, 'variant', placed), ['app.css']);
  await removeWorktree(repo, wt);
});

test('removing a worktree never empties the linked node_modules', async (t) => {
  const { root, repo, wt } = repoWithDeps();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  await addWorktree(repo, wt, 'variantly/t/v1', 'HEAD');
  await placeShared(repo, wt, { link: ['node_modules'], copy: [] });
  // A lost marker must not matter either: links are found by walking.
  rmSync(path.join(wt, '.variantly-shared.json'));
  await removeWorktree(repo, wt);
  assert.equal(existsSync(wt), false);
  assert.equal(readFileSync(path.join(repo, 'node_modules', 'vite', 'index.js'), 'utf8'), 'export {}');
});

test('a rollout commits only its own work, and a cancelled one leaves placed files alone', async (t) => {
  const { root, repo, wt } = repoWithDeps();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  await addWorktree(repo, wt, 'variantly/t/v1', 'HEAD');
  await placeShared(repo, wt, { link: ['node_modules'], copy: [] });
  // An untracked, unignored file variantly copied in (like .claude/skills).
  mkdirSync(path.join(wt, '.claude', 'skills', 'impeccable'), { recursive: true });
  writeFileSync(path.join(wt, '.claude', 'skills', 'impeccable', 'SKILL.md'), '# skill\n');
  const before = await pendingPaths(wt);
  assert.ok(before.includes('.claude'));

  // Cancelled: the agent's edits and new files go, the placed ones stay.
  writeFileSync(path.join(wt, 'app.css'), 'body { color: blue }\n');
  writeFileSync(path.join(wt, 'about.css'), 'h1 {}\n');
  await discardChanges(wt, before);
  assert.equal(readFileSync(path.join(wt, 'app.css'), 'utf8'), 'body {}\n');
  assert.equal(existsSync(path.join(wt, 'about.css')), false);
  assert.equal(existsSync(path.join(wt, '.claude', 'skills', 'impeccable', 'SKILL.md')), true);
  assert.equal(existsSync(path.join(wt, 'node_modules', 'vite', 'index.js')), true);

  // Finished: only the agent's files are committed.
  writeFileSync(path.join(wt, 'about.css'), 'h1 {}\n');
  assert.deepEqual(await commitAll(wt, 'rollout', before), ['about.css']);
  await removeWorktree(repo, wt);
});
