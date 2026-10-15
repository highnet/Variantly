// @ts-check
/*
 * Every variant is a git worktree. That gives each agent a full, isolated copy
 * of the project to edit, gives us a diff of exactly what it changed, and lets
 * the chosen one be applied back onto the user's tree with git's own
 * three-way merge, so nothing they had uncommitted gets trampled.
 */
import { cp, lstat, mkdir, readFile, rm, symlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { isWindows, run, runOk } from "./proc.mjs";

/** @param {string} cwd @param {string[]} args */
const git = (cwd, args) => runOk("git", args, { cwd, timeout: 300_000 });

/**
 * The top of the git repository containing `dir`, or null.
 * @param {string} dir
 */
export async function repoRoot(dir) {
  const res = await run("git", ["rev-parse", "--show-toplevel"], { cwd: dir });
  return res.code === 0 ? path.resolve(res.stdout.trim()) : null;
}

/** @param {string} root */
export async function hasCommits(root) {
  return (await run("git", ["rev-parse", "--verify", "HEAD"], { cwd: root })).code === 0;
}

/**
 * The commit every variant starts from. When the tree has uncommitted edits
 * to tracked files, `git stash create` snapshots them into a commit without
 * touching the working tree or the stash list, so the agents see exactly what
 * the user sees in their browser.
 * @param {string} root
 * @returns {Promise<{ base: string, dirty: boolean, untracked: string[] }>}
 */
export async function snapshotBase(root) {
  const stash = (await git(root, ["stash", "create", "variantly base"])).trim();
  const head = (await git(root, ["rev-parse", "HEAD"])).trim();
  const untracked = (await git(root, ["ls-files", "--others", "--exclude-standard"]))
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return { base: stash || head, dirty: Boolean(stash), untracked };
}

/**
 * @param {string} root
 * @param {string} dir   where the worktree goes
 * @param {string} branch
 * @param {string} base
 */
export async function addWorktree(root, dir, branch, base) {
  if (existsSync(dir)) await removeWorktree(root, dir);
  await mkdir(path.dirname(dir), { recursive: true });
  await run("git", ["branch", "-D", branch], { cwd: root });
  await git(root, ["worktree", "add", "-f", "-b", branch, dir, base]);
}

/** @param {string} root @param {string} dir */
export async function removeWorktree(root, dir) {
  await run("git", ["worktree", "remove", "--force", dir], { cwd: root });
  // Junctions to node_modules must be unlinked, never recursed into.
  await unlinkShared(dir);
  // Windows keeps a directory locked for a moment after the process that
  // had it as its working directory exits; retry instead of failing.
  await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  await run("git", ["worktree", "prune"], { cwd: root });
}

/** @param {string} root @param {string} prefix */
export async function deleteBranches(root, prefix) {
  const list = await git(root, ["branch", "--list", `${prefix}*`, "--format=%(refname:short)"]);
  for (const branch of list.split("\n").map((s) => s.trim()).filter(Boolean)) {
    await run("git", ["branch", "-D", branch], { cwd: root });
  }
}

/**
 * Link or copy the files a project needs to run but never commits: installed
 * dependencies, env files, a local SQLite database. Directories become
 * symlinks (junctions on Windows, which need no admin rights); files are
 * copied, so an agent editing `.env` can't reach the original.
 * @param {string} fromDir   app root in the user's checkout
 * @param {string} toDir     app root in the worktree
 * @param {{ link: string[], copy: string[] }} spec
 * @returns {Promise<string[]>} the relative paths that were placed
 */
export async function placeShared(fromDir, toDir, spec) {
  /** @type {string[]} */
  const placed = [];
  for (const rel of spec.link) {
    const src = path.join(fromDir, rel);
    const dest = path.join(toDir, rel);
    if (!existsSync(src) || existsSync(dest)) continue;
    await mkdir(path.dirname(dest), { recursive: true });
    const stat = await lstat(src);
    if (stat.isDirectory()) {
      await symlink(src, dest, isWindows ? "junction" : "dir");
    } else {
      await symlink(src, dest, "file").catch(() => cp(src, dest));
    }
    placed.push(rel);
  }
  for (const rel of spec.copy) {
    const src = path.join(fromDir, rel);
    const dest = path.join(toDir, rel);
    if (!existsSync(src) || existsSync(dest)) continue;
    await mkdir(path.dirname(dest), { recursive: true });
    await cp(src, dest, { recursive: true });
    placed.push(rel);
  }
  await writeMarker(toDir, placed);
  return placed;
}

const MARKER = ".variantly-shared.json";

/** @param {string} dir @param {string[]} placed */
async function writeMarker(dir, placed) {
  const { writeFile } = await import("node:fs/promises");
  const markerPath = path.join(dir, MARKER);
  /** @type {string[]} */
  let prior = [];
  try {
    prior = JSON.parse(await readFile(markerPath, "utf8"));
  } catch {}
  await writeFile(markerPath, JSON.stringify([...new Set([...prior, ...placed])]));
}

/**
 * Remove every link placeShared made under `worktree` (at any app root) so
 * that deleting the worktree can never follow a junction into the user's
 * real node_modules.
 * @param {string} worktree
 */
async function unlinkShared(worktree) {
  const { readdir, unlink } = await import("node:fs/promises");
  /** @param {string} dir @param {number} depth */
  const visit = async (dir, depth) => {
    const marker = path.join(dir, MARKER);
    if (existsSync(marker)) {
      /** @type {string[]} */
      let rels = [];
      try {
        rels = JSON.parse(await readFile(marker, "utf8"));
      } catch {}
      for (const rel of rels) {
        const p = path.join(dir, rel);
        try {
          const stat = await lstat(p);
          if (stat.isSymbolicLink()) await unlink(p).catch(() => rm(p, { force: true }));
        } catch {}
      }
    }
    if (depth <= 0) return;
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory() && !e.isSymbolicLink() && e.name !== ".git" && e.name !== "node_modules") {
        await visit(path.join(dir, e.name), depth - 1);
      }
    }
  };
  await visit(worktree, 3);
}

/**
 * Commit whatever the agent changed, minus the files variantly placed.
 * @param {string} worktree
 * @param {string} message
 * @param {string[]} exclude  paths relative to the worktree root
 * @returns {Promise<string[]>} changed files
 */
export async function commitAll(worktree, message, exclude) {
  const pathspec = [".", `:(exclude)${MARKER}`, `:(exclude)**/${MARKER}`, ...exclude.map((p) => `:(exclude)${p.replace(/\\/g, "/")}`)];
  await git(worktree, ["add", "-A", "--", ...pathspec]);
  const changed = (await git(worktree, ["diff", "--cached", "--name-only"])).split("\n").filter(Boolean);
  if (changed.length) {
    await git(worktree, [
      "-c", "user.name=variantly",
      "-c", "user.email=variantly@users.noreply.github.com",
      "-c", "commit.gpgsign=false",
      "commit", "--no-verify", "-q", "-m", message,
    ]);
  }
  return changed;
}

/**
 * Apply what one branch changed relative to `base` onto the user's working
 * tree. Uses --3way so edits the user made since the snapshot are merged,
 * not overwritten; conflicts are left as markers for them to resolve.
 * @param {string} root
 * @param {string} base
 * @param {string} branch
 */
export async function applyBranch(root, base, branch) {
  const patch = await git(root, ["diff", "--binary", base, branch]);
  if (!patch.trim()) return { applied: false, conflicts: [], files: [] };
  const files = (await git(root, ["diff", "--name-only", base, branch])).split("\n").filter(Boolean);
  // The snapshot included the user's unstaged edits, so on an untouched tree
  // the patch applies to the working tree as is, without involving the index.
  const plain = await run("git", ["apply", "--whitespace=nowarn", "-"], { cwd: root, input: patch, timeout: 120_000 });
  if (plain.code === 0) return { applied: true, conflicts: [], files };

  // The user edited the same files since the snapshot: merge instead.
  const res = await run("git", ["apply", "--3way", "--whitespace=nowarn", "-"], {
    cwd: root,
    input: patch,
    timeout: 120_000,
  });
  const conflicts = [...(res.stderr + res.stdout).matchAll(/Applied patch to '(.+?)' with conflicts/g)].map((m) => m[1]);
  if (res.code !== 0 && !conflicts.length) {
    throw new Error(`git apply failed:\n${(res.stderr || res.stdout || plain.stderr).trim()}`);
  }
  // --3way stages what applied cleanly; give the user an unstaged change set
  // like any other edit, so their own commit flow decides what goes in.
  await run("git", ["reset", "-q", "--", ...files], { cwd: root });
  return { applied: true, conflicts, files };
}
