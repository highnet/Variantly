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
 * @property {"claude-stream" | "text"} output
 */

/**
 * @typedef {object} AgentAdapter
 * @property {string} id
 * @property {string} name
 * @property {string} bin
 * @property {string} install     how to get it
 * @property {string[]} skillDirs where Impeccable lives for this agent, relative to home or project
 * @property {(o: { cwd: string, briefPath: string, model?: string, permissions: "safe" | "full" }) => AgentRun} invocation
 */

/** @param {string} briefPath */
const pointer = (briefPath) =>
  `Read the file ${briefPath.replace(/\\/g, "/")} and carry out the brief in it exactly. It is your whole task.`;

/** @type {AgentAdapter[]} */
export const AGENTS = [
  {
    id: "claude",
    name: "Claude Code",
    bin: "claude",
    install: "npm install -g @anthropic-ai/claude-code",
    skillDirs: [".claude/skills/impeccable"],
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
    id: "codex",
    name: "Codex CLI",
    bin: "codex",
    install: "npm install -g @openai/codex",
    skillDirs: [".codex/skills/impeccable", ".agents/skills/impeccable"],
    invocation: ({ cwd, briefPath, model, permissions }) => ({
      file: "codex",
      args: [
        "exec",
        ...(permissions === "full" ? ["--dangerously-bypass-approvals-and-sandbox"] : ["--full-auto"]),
        "--skip-git-repo-check",
        "-C",
        cwd,
        ...(model ? ["-m", model] : []),
        pointer(briefPath),
      ],
      output: "text",
    }),
  },
  {
    id: "copilot",
    name: "GitHub Copilot CLI",
    bin: "copilot",
    install: "npm install -g @github/copilot",
    skillDirs: [".copilot/skills/impeccable", ".github/skills/impeccable", ".agents/skills/impeccable"],
    invocation: ({ briefPath, model, permissions }) => ({
      file: "copilot",
      args: [
        "-p",
        pointer(briefPath),
        "--allow-all-tools",
        ...(permissions === "full" ? [] : ["--deny-tool", "shell(git push)", "--deny-tool", "shell(rm)"]),
        "--add-dir",
        path.dirname(briefPath),
        ...(model ? ["--model", model] : []),
      ],
      output: "text",
    }),
  },
];

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
  skillDirs: [],
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
 * Which agents are installed, their versions, and whether Impeccable is
 * installed where each one looks for skills.
 * @param {string} projectRoot
 */
export async function detectAgents(projectRoot) {
  const home = os.homedir();
  return Promise.all(
    AGENTS.map(async (agent) => {
      const binPath = which(agent.bin);
      let version = "";
      if (binPath) {
        const res = await run(agent.bin, ["--version"], { timeout: 15_000 });
        version = (res.stdout || res.stderr).trim().split("\n")[0].slice(0, 60);
      }
      const impeccable = agent.skillDirs.some(
        (dir) => existsSync(path.join(projectRoot, dir, "SKILL.md")) || existsSync(path.join(home, dir, "SKILL.md")),
      );
      return { id: agent.id, name: agent.name, installed: Boolean(binPath), version, impeccable, install: agent.install };
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
