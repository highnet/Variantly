// @ts-check
/*
 * Agent adapters. variantly brings no model and no API key: it drives the
 * coding agent the user already has, signed in with their own account, in
 * headless mode. Each adapter turns "work in this folder, read this brief"
 * into that CLI's non-interactive invocation.
 *
 * The brief is always a file and the prompt only points at it. That keeps the
 * command line short and free of quoting hazards on every shell, including
 * cmd.exe running a `.cmd` shim.
 */
import { existsSync } from "node:fs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unavailableReason } from "./agent-output.mjs";
import { run } from "./proc.mjs";

/**
 * @typedef {object} AgentRun
 * @property {string} file
 * @property {string[]} args
 * @property {NodeJS.ProcessEnv} [env]
 * @property {import("./agent-output.mjs").OutputKind} output
 */

/**
 * Where an agent reads skills from: folders that hold one folder per skill,
 * each with a SKILL.md. The first entry of each list is where variantly
 * installs; the rest are also read by the agent and count when detecting.
 * @typedef {object} SkillHomes
 * @property {(home: string, env: NodeJS.ProcessEnv) => string[]} global  absolute
 * @property {string[]} project                                          relative to the project root
 */

/**
 * @typedef {object} InvocationInput
 * @property {string} cwd
 * @property {string} briefPath
 * @property {string} [model]
 * @property {"safe" | "full"} permissions
 * @property {string} [home]              defaults to the user's home
 * @property {NodeJS.ProcessEnv} [env]    defaults to process.env
 */

/**
 * @typedef {object} AgentAdapter
 * @property {string} id
 * @property {string} name
 * @property {string} bin
 * @property {string} install     how to get it
 * @property {SkillHomes} skills
 * @property {(o: InvocationInput) => AgentRun} invocation
 */

/** @param {string} briefPath */
const pointer = (briefPath) =>
  `Read the file ${briefPath.replace(/\\/g, "/")} and carry out the brief in it exactly. It is your whole task.`;

/** @param {NodeJS.ProcessEnv} env @param {string} key @param {string} fallback */
const dirFrom = (env, key, fallback) => (env[key] ? path.resolve(String(env[key])) : fallback);

/** @type {AgentAdapter[]} */
export const AGENTS = [
  {
    id: "claude",
    name: "Claude Code",
    bin: "claude",
    install: "npm install -g @anthropic-ai/claude-code",
    skills: {
      global: (home, env) => [path.join(dirFrom(env, "CLAUDE_CONFIG_DIR", path.join(home, ".claude")), "skills")],
      project: [".claude/skills"],
    },
    invocation: ({ briefPath, model, permissions }) => ({
      file: "claude",
      args: [
        "-p",
        pointer(briefPath),
        "--output-format",
        "stream-json",
        "--verbose",
        ...(permissions === "full"
          ? ["--dangerously-skip-permissions"]
          : [
              "--permission-mode",
              "acceptEdits",
              "--allowedTools",
              "Read,Edit,Write,MultiEdit,Glob,Grep,Skill,TodoWrite,WebFetch,Bash(*impeccable*),Bash(git status:*),Bash(git diff:*),Bash(ls:*)",
              "--add-dir",
              path.dirname(briefPath),
            ]),
        ...(model ? ["--model", model] : []),
      ],
      output: "claude-stream",
    }),
  },
  {
    // `codex exec`, checked against codex-cli 0.162. `--full-auto` is gone:
    // the sandbox is chosen with --sandbox and approvals with the
    // approval_policy config key. workspace-write lets the agent write its
    // worktree and read anything, which covers the brief outside it.
    id: "codex",
    name: "Codex CLI",
    bin: "codex",
    install: "npm install -g @openai/codex",
    skills: {
      // ~/.agents/skills is current; $CODEX_HOME/skills is where older releases looked.
      global: (home, env) => [
        path.join(home, ".agents", "skills"),
        path.join(dirFrom(env, "CODEX_HOME", path.join(home, ".codex")), "skills"),
      ],
      project: [".agents/skills", ".codex/skills"],
    },
    invocation: ({ cwd, briefPath, model, permissions }) => ({
      file: "codex",
      args: [
        "exec",
        "--json",
        ...(permissions === "full"
          ? ["--dangerously-bypass-approvals-and-sandbox"]
          : ["--sandbox", "workspace-write", "-c", "approval_policy=never"]),
        "--skip-git-repo-check",
        "-C",
        cwd,
        ...(model ? ["-m", model] : []),
        pointer(briefPath),
      ],
      output: "codex-json",
    }),
  },
  {
    // `copilot -p`, checked against Copilot CLI 1.0.98. In prompt mode tools
    // are allowed wholesale minus a deny list; file access is the working
    // directory plus --add-dir, so the brief's folder and the user-wide skill
    // folders are added.
    id: "copilot",
    name: "GitHub Copilot CLI",
    bin: "copilot",
    install: "npm install -g @github/copilot",
    skills: {
      global: (home, env) => [
        path.join(dirFrom(env, "COPILOT_HOME", path.join(home, ".copilot")), "skills"),
        path.join(home, ".agents", "skills"),
      ],
      project: [".github/skills", ".agents/skills", ".claude/skills"],
    },
    invocation: ({ briefPath, model, permissions, home = os.homedir(), env = process.env }) => ({
      file: "copilot",
      args: [
        "-p",
        pointer(briefPath),
        "--output-format",
        "json",
        "--no-ask-user",
        "--no-color",
        ...(permissions === "full"
          ? ["--allow-all"]
          : [
              "--allow-all-tools",
              "--deny-tool=shell(git push)",
              "--deny-tool=shell(git commit)",
              "--deny-tool=shell(rm)",
              "--add-dir",
              path.dirname(briefPath),
              ...existingGlobalSkillDirs("copilot", home, env).flatMap((d) => ["--add-dir", d]),
            ]),
        ...(model ? ["--model", model] : []),
      ],
      output: "copilot-json",
    }),
  },
];

/**
 * An agent's user-wide skill folders that exist on this machine.
 * @param {string} id @param {string} home @param {NodeJS.ProcessEnv} env
 */
function existingGlobalSkillDirs(id, home, env) {
  const agent = AGENTS.find((a) => a.id === id);
  return agent ? agent.skills.global(home, env).filter((d) => existsSync(d)) : [];
}

/**
 * A stand-in agent that needs no model: it restyles the page with a fixed
 * palette per variant number. It exists so the whole pipeline can be tested,
 * demoed and filmed on a machine with no agent signed in.
 */
export const DEMO = /** @type {AgentAdapter} */ ({
  id: "demo",
  name: "Demo (no AI)",
  bin: process.execPath,
  install: "built in",
  skills: { global: () => [], project: [] },
  invocation: ({ briefPath }) => ({
    file: process.execPath,
    args: [fileURLToPath(new URL("./demo-agent.mjs", import.meta.url)), briefPath],
    output: "text",
  }),
});

/** @param {string} id */
export function agentById(id) {
  return [...AGENTS, DEMO].find((a) => a.id === id) ?? null;
}

/**
 * Every folder where `agent` would find a skill called `name`.
 * @param {AgentAdapter} agent
 * @param {string} name
 * @param {{ projectRoot?: string, home?: string, env?: NodeJS.ProcessEnv }} [where]
 */
export function skillLocations(agent, name, where = {}) {
  const home = where.home ?? os.homedir();
  const env = where.env ?? process.env;
  const root = where.projectRoot;
  return [
    ...(root ? agent.skills.project.map((d) => path.join(root, d, name)) : []),
    ...agent.skills.global(home, env).map((d) => path.join(d, name)),
  ];
}

/**
 * Whether `agent` can see a skill called `name`, in the project or user-wide.
 * @param {AgentAdapter} agent
 * @param {string} name
 * @param {{ projectRoot?: string, home?: string, env?: NodeJS.ProcessEnv }} [where]
 */
export function hasSkill(agent, name, where = {}) {
  return skillLocations(agent, name, where).some((dir) => existsSync(path.join(dir, "SKILL.md")));
}

/**
 * Launchers that sit on PATH under an agent's name but are not the agent:
 * VS Code's Copilot Chat drops a `copilot` bootstrapper into its terminals'
 * PATH that, run headless, prints "Cannot find GitHub Copilot CLI" and exits 0.
 * @param {string} file
 */
export const isKnownShim = (file) => /[\\/]github\.copilot-chat[\\/]copilotCli[\\/]/i.test(file);

/**
 * Every file on PATH (and in npm's global bin) that would run `bin`, real
 * agents first and known shims last.
 * @param {string} bin
 * @param {NodeJS.ProcessEnv} [env]
 */
export function binCandidates(bin, env = process.env) {
  const win = process.platform === "win32";
  const exts = win ? (env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").toLowerCase().split(";").filter(Boolean) : [""];
  const npmBin = env.APPDATA && win ? [path.join(env.APPDATA, "npm")] : [];
  const dirs = [...(env.PATH ?? env.Path ?? "").split(path.delimiter).filter(Boolean), ...npmBin];
  /** @type {string[]} */
  const found = [];
  for (const dir of dirs) {
    for (const ext of exts) {
      const file = path.join(dir, bin + ext);
      if (existsSync(file) && !found.some((f) => f.toLowerCase() === file.toLowerCase())) found.push(file);
    }
  }
  return [...found.filter((f) => !isKnownShim(f)), ...found.filter(isKnownShim)];
}

/**
 * The first line of `--version` output, when it looks like a version and not
 * like a launcher apologising that the real CLI is missing.
 * @param {string} output
 */
export function versionFrom(output) {
  const first = output.trim().split(/\r?\n/)[0]?.trim() ?? "";
  if (!/\d+\.\d+/.test(first) || unavailableReason(output)) return null;
  return first.slice(0, 60);
}

/** @type {Map<string, string>} the binary that answered --version, per agent id */
const resolved = new Map();

/**
 * Find the binary that really is this agent: the first candidate whose
 * `--version` prints a version. Shims are tried last and reported.
 * @param {AgentAdapter} agent
 * @param {NodeJS.ProcessEnv} [env]
 */
export async function probeAgent(agent, env = process.env) {
  let note = "";
  for (const file of binCandidates(agent.bin, env)) {
    const res = await run(file, ["--version"], { timeout: 15_000 });
    const out = `${res.stdout}
${res.stderr}`;
    const version = res.code === 0 ? versionFrom(out) : null;
    if (version) {
      resolved.set(agent.id, file);
      return { path: file, version, note };
    }
    note ||= `${file} is not ${agent.name}: ${(unavailableReason(out) ?? "`--version` printed no version").slice(0, 160)}`;
  }
  resolved.delete(agent.id);
  return { path: "", version: "", note };
}

/**
 * The file to run for an agent, probing once if detection hasn't yet.
 * @param {AgentAdapter} agent
 */
export async function agentFile(agent) {
  if (agent.id === "demo") return agent.bin;
  return resolved.get(agent.id) ?? ((await probeAgent(agent)).path || agent.bin);
}

/**
 * Which agents are installed, their versions, and whether Impeccable is
 * installed where each one looks for skills.
 * @param {string} projectRoot
 */
/** The command that signs a person in, run in its own window. */
const LOGIN = /** @type {Record<string, string>} */ ({ copilot: "copilot login", codex: "codex login", claude: "claude" });

/**
 * Free sign-in check (no prompt, no credits). Copilot uses the GitHub CLI's
 * login when there is one; its own login lands in ~/.copilot/config.json.
 * Codex keeps ~/.codex/auth.json. Claude Code is assumed signed in when it
 * has ~/.claude.json (it asks on first run otherwise). null = unknown.
 * @param {string} id
 * @returns {Promise<boolean | null>}
 */
const isSignedIn = async (id) => {
  const home = os.homedir();
  if (id === "copilot") {
    if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN || process.env.COPILOT_GITHUB_TOKEN) return true;
    try {
      const cfg = fs.readFileSync(path.join(home, ".copilot", "config.json"), "utf8");
      if (/logged_in_users|"user"/.test(cfg)) return true;
    } catch {}
    const gh = await run("gh", ["auth", "status"], { timeout: 15_000 });
    return gh.code === 0;
  }
  if (id === "codex") return fs.existsSync(path.join(home, ".codex", "auth.json"));
  if (id === "claude") return fs.existsSync(path.join(home, ".claude.json")) || null;
  return null;
};

/** @param {string} projectRoot */
export async function detectAgents(projectRoot) {
  return Promise.all(
    AGENTS.map(async (agent) => {
      const { path: binPath, version, note } = await probeAgent(agent);
      // variantly copies the skill into each worktree from any of these, so
      // a copy in any of them counts.
      const impeccable =
        hasSkill(agent, "impeccable", { projectRoot }) ||
        [".claude/skills", ".agents/skills", ".github/skills", ".copilot/skills", ".codex/skills"].some((d) =>
          fs.existsSync(path.join(os.homedir(), d, "impeccable", "SKILL.md")),
        );
      const variantlySkill = hasSkill(agent, "variantly", { projectRoot });
      const signedIn = binPath ? await isSignedIn(agent.id) : false;
      return { id: agent.id, name: agent.name, installed: Boolean(binPath), path: binPath, note, version, impeccable, variantlySkill, signedIn, install: agent.install, login: LOGIN[agent.id] ?? null };
    }),
  );
}

/**
 * Impeccable's own installer, scoped to the user's machine so nothing is
 * written into their project.
 * @param {string} agentId
 */
export function impeccableInstallCommand(agentId) {
  return `npx --yes impeccable install --providers=${agentId} --scope=global --yes --no-hooks`;
}
