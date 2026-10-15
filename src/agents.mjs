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
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run, which } from "./proc.mjs";

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
 * Which agents are installed, their versions, and whether Impeccable is
 * installed where each one looks for skills.
 * @param {string} projectRoot
 */
export async function detectAgents(projectRoot) {
  return Promise.all(
    AGENTS.map(async (agent) => {
      const binPath = which(agent.bin);
      let version = "";
      if (binPath) {
        const res = await run(agent.bin, ["--version"], { timeout: 15_000 });
        version = (res.stdout || res.stderr).trim().split("\n")[0].slice(0, 60);
      }
      const impeccable = hasSkill(agent, "impeccable", { projectRoot });
      const variantlySkill = hasSkill(agent, "variantly", { projectRoot });
      return { id: agent.id, name: agent.name, installed: Boolean(binPath), version, impeccable, variantlySkill, install: agent.install };
    }),
  );
}

/**
 * Impeccable's own installer, scoped to the user's machine so nothing is
 * written into their project.
 * @param {string} agentId
 */
export function impeccableInstallCommand(agentId) {
  return `npx impeccable install --providers=${agentId} --scope=global`;
}
