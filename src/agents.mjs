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
 * @property {Record<string, string>} [files]  written before the run: config for agents
 *                                             that take MCP servers only from a file
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
 * @property {Record<string, McpServer>} [mcp]  MCP servers to give the agent for this run
 */

/**
 * @typedef {object} McpServer
 * @property {string} command
 * @property {string[]} args
 */

/**
 * @typedef {object} AgentAdapter
 * @property {string} id
 * @property {string} name
 * @property {string} bin
 * @property {string} install     how to get it
 * @property {SkillHomes} skills
 * @property {false} [mcp]        false: the CLI takes MCP servers only from the
 *                                user's own config, so runs get no browser
 * @property {(o: InvocationInput) => AgentRun} invocation
 */

/** @param {string} briefPath */
const pointer = (briefPath) =>
  `Read the file ${briefPath.replace(/\\/g, "/")} and carry out the brief in it exactly. It is your whole task.`;

/** @param {Record<string, McpServer> | undefined} mcp */
const mcpJson = (mcp, extra = {}) =>
  JSON.stringify({ mcpServers: Object.fromEntries(Object.entries(mcp ?? {}).map(([k, v]) => [k, { ...extra, command: v.command, args: v.args }])) });

/** @param {NodeJS.ProcessEnv} env @param {string} key @param {string} fallback */
const dirFrom = (env, key, fallback) => (env[key] ? path.resolve(String(env[key])) : fallback);

/** OpenCode's user config folder, the way Impeccable resolves it. @param {string} home @param {NodeJS.ProcessEnv} env */
const opencodeConfigDir = (home, env) =>
  env.OPENCODE_CONFIG_DIR
    ? path.resolve(String(env.OPENCODE_CONFIG_DIR))
    : path.join(env.XDG_CONFIG_HOME ? path.resolve(String(env.XDG_CONFIG_HOME)) : path.join(home, ".config"), "opencode");

/** Shell commands Gemini CLI may run unasked in safe mode (its policy engine's TOML). */
const GEMINI_POLICY = `[[rule]]
toolName = "run_shell_command"
commandPrefix = ["npx impeccable", "npx --yes impeccable", "git status", "git diff", "ls"]
decision = "allow"
priority = 100
`;

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
    invocation: ({ briefPath, model, permissions, mcp }) => ({
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
              "Read,Edit,Write,MultiEdit,Glob,Grep,Skill,TodoWrite,WebFetch,Bash(*impeccable*),Bash(git status:*),Bash(git diff:*),Bash(ls:*)" +
                Object.keys(mcp ?? {}).map((k) => `,mcp__${k}`).join(""),
              "--add-dir",
              path.dirname(briefPath),
            ]),
        ...(mcp && Object.keys(mcp).length ? ["--mcp-config", mcpJson(mcp)] : []),
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
    invocation: ({ cwd, briefPath, model, permissions, mcp }) => ({
      file: "codex",
      args: [
        "exec",
        "--json",
        ...(permissions === "full"
          ? ["--dangerously-bypass-approvals-and-sandbox"]
          : ["--sandbox", "workspace-write", "-c", "approval_policy=never"]),
        ...Object.entries(mcp ?? {}).flatMap(([k, v]) => [
          "-c",
          `mcp_servers.${k}.command=${JSON.stringify(v.command)}`,
          "-c",
          `mcp_servers.${k}.args=${JSON.stringify(v.args)}`,
        ]),
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
    invocation: ({ briefPath, model, permissions, mcp, home = os.homedir(), env = process.env }) => ({
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
              // Path checks also scan shell arguments: the Impeccable launcher's
              // `--target /` (a route) reads as the drive root and is denied
              // under --no-ask-user. Tool denies and URL checks still apply.
              "--allow-all-paths",
              "--deny-tool=shell(git push)",
              "--deny-tool=shell(git commit)",
              "--deny-tool=shell(rm)",
              "--add-dir",
              path.dirname(briefPath),
              ...existingGlobalSkillDirs("copilot", home, env).flatMap((d) => ["--add-dir", d]),
            ]),
        ...(mcp && Object.keys(mcp).length ? ["--additional-mcp-config", mcpJson(mcp, { type: "local", tools: ["*"] })] : []),
        ...(model ? ["--model", model] : []),
      ],
      output: "copilot-json",
    }),
  },
  {
    // `gemini -p`, checked against Gemini CLI 0.64. Headless runs can't
    // answer approval prompts, so safe mode auto-approves edits and a policy
    // file allows the shell commands Impeccable needs. MCP servers come only
    // from settings files: a system settings file beside the brief carries them.
    // Gemini skips that file when a parent folder is world-writable (/tmp), so
    // it relies on the brief living under ~/.variantly.
    id: "gemini",
    name: "Gemini CLI",
    bin: "gemini",
    install: "npm install -g @google/gemini-cli",
    skills: {
      global: (home, env) => [
        path.join(dirFrom(env, "GEMINI_CLI_HOME", home), ".gemini", "skills"),
        path.join(home, ".agents", "skills"),
      ],
      project: [".gemini/skills", ".agents/skills"],
    },
    invocation: ({ briefPath, model, permissions, mcp }) => {
      const settings = path.join(path.dirname(briefPath), "gemini-settings.json");
      const policy = path.join(path.dirname(briefPath), "gemini-policy.toml");
      const withMcp = Boolean(mcp && Object.keys(mcp).length);
      const safe = permissions !== "full";
      return {
        file: "gemini",
        args: [
          "-p",
          pointer(briefPath),
          "--output-format",
          "stream-json",
          "--skip-trust",
          ...(safe ? ["--approval-mode", "auto_edit", "--policy", policy] : ["--approval-mode", "yolo"]),
          "--include-directories",
          path.dirname(briefPath),
          ...(withMcp ? ["--allowed-mcp-server-names", ...Object.keys(mcp ?? {})] : []),
          ...(model ? ["-m", model] : []),
        ],
        ...(withMcp ? { env: { GEMINI_CLI_SYSTEM_SETTINGS_PATH: settings } } : {}),
        files: {
          ...(safe ? { [policy]: GEMINI_POLICY } : {}),
          ...(withMcp ? { [settings]: mcpJson(mcp, { trust: true }) } : {}),
        },
        output: "gemini-stream",
      };
    },
  },
  {
    // `cursor-agent -p`, checked against Cursor CLI 2026.10.16. In print
    // mode it may write files; shell commands need --force. MCP servers come
    // from mcp.json files or a plugin, so a plugin folder beside the brief
    // carries them.
    id: "cursor",
    name: "Cursor CLI",
    bin: "cursor-agent",
    install:
      process.platform === "win32"
        ? `powershell -NoProfile -Command "irm 'https://cursor.com/install?win32=true' | iex"`
        : "curl https://cursor.com/install -fsS | bash",
    skills: {
      global: (home) => [path.join(home, ".cursor", "skills"), path.join(home, ".agents", "skills"), path.join(home, ".claude", "skills")],
      project: [".cursor/skills", ".agents/skills", ".claude/skills"],
    },
    invocation: ({ cwd, briefPath, model, permissions, mcp }) => {
      const plugin = path.join(path.dirname(briefPath), "cursor-plugin");
      const withMcp = Boolean(mcp && Object.keys(mcp).length);
      return {
        file: "cursor-agent",
        args: [
          "-p",
          pointer(briefPath),
          "--output-format",
          "stream-json",
          "--trust",
          "--workspace",
          cwd,
          "--add-dir",
          path.dirname(briefPath),
          // Impeccable's checks run from the shell, and Cursor has no
          // per-command allow list on the command line: both modes need
          // --force. Full mode also leaves Cursor's sandbox off.
          "--force",
          ...(permissions === "full" ? ["--sandbox", "disabled"] : []),
          ...(withMcp ? ["--approve-mcps", "--plugin-dir", plugin] : []),
          ...(model ? ["--model", model] : []),
        ],
        ...(withMcp
          ? {
              files: {
                [path.join(plugin, ".cursor-plugin", "plugin.json")]: JSON.stringify({ name: "variantly" }),
                [path.join(plugin, ".mcp.json")]: mcpJson(mcp),
              },
            }
          : {}),
        output: "cursor-stream",
      };
    },
  },
  {
    // `opencode run --format json`, checked against opencode-ai 1.19.3 (and
    // run end to end with a free OpenCode Zen model). Permissions and MCP
    // servers come from config; OPENCODE_CONFIG_CONTENT carries both for this
    // run only. Headless, an "ask" can't be answered, so safe mode answers
    // every one up front: edits yes, the Impeccable and read-only git/ls
    // commands yes, other shell commands and paths outside the worktree no
    // (except the brief's folder and the skill folders).
    id: "opencode",
    name: "OpenCode",
    bin: "opencode",
    install: "npm install -g opencode-ai",
    skills: {
      global: (home, env) => [path.join(opencodeConfigDir(home, env), "skills"), path.join(home, ".agents", "skills"), path.join(home, ".claude", "skills")],
      project: [".opencode/skills", ".agents/skills", ".claude/skills"],
    },
    invocation: ({ briefPath, model, permissions, mcp, home = os.homedir(), env = process.env }) => {
      const outside = [path.dirname(briefPath), ...existingGlobalSkillDirs("opencode", home, env)].map((d) => `${d.replace(/\\/g, "/")}/**`);
      const config = {
        permission: {
          question: "deny",
          doom_loop: "deny",
          ...(permissions === "full"
            ? {}
            : {
                bash: { "*": "deny", "*impeccable*": "allow", "git status*": "allow", "git diff*": "allow", "ls*": "allow" },
                external_directory: { "*": "deny", ...Object.fromEntries(outside.map((d) => [d, "allow"])) },
              }),
        },
        ...(mcp && Object.keys(mcp).length
          ? { mcp: Object.fromEntries(Object.entries(mcp).map(([k, v]) => [k, { type: "local", command: [v.command, ...v.args], enabled: true }])) }
          : {}),
      };
      return {
        file: "opencode",
        args: ["run", "--format", "json", ...(permissions === "full" ? ["--auto"] : []), ...(model ? ["-m", model] : []), pointer(briefPath)],
        env: { OPENCODE_CONFIG_CONTENT: JSON.stringify(config) },
        output: "opencode-json",
      };
    },
  },
  {
    // `grok -p`, checked against Grok Build 1.0.62 (flags, output and skill
    // loading run here without an account). streaming-messages-json is
    // Claude Code's stream-json shape. Headless, `dontAsk` silently denies
    // whatever isn't allowed, so safe mode lists what is: reads, edits, search
    // and the shell commands Impeccable needs. Project skills load only in a
    // trusted folder, hence --trust (the flag Impeccable's install notes give).
    // Grok takes MCP servers only from its config files, so no browser.
    id: "grok",
    name: "Grok Build",
    bin: "grok",
    install:
      process.platform === "win32"
        ? `powershell -NoProfile -Command "irm https://x.ai/cli/install.ps1 | iex"`
        : "curl -fsSL https://x.ai/cli/install.sh | bash",
    mcp: false,
    skills: {
      global: (home, env) => [
        path.join(dirFrom(env, "GROK_HOME", path.join(home, ".grok")), "skills"),
        path.join(home, ".agents", "skills"),
        path.join(home, ".claude", "skills"),
      ],
      project: [".grok/skills", ".agents/skills", ".claude/skills"],
    },
    invocation: ({ briefPath, model, permissions }) => ({
      file: "grok",
      args: [
        "-p",
        pointer(briefPath),
        "--output-format",
        "streaming-messages-json",
        "--no-auto-update",
        "--trust",
        ...(permissions === "full"
          ? ["--always-approve"]
          : [
              "--permission-mode",
              "dontAsk",
              ...["Read", "Edit", "Grep", "Bash(*impeccable*)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls*)"].flatMap((r) => ["--allow", r]),
            ]),
        ...(model ? ["-m", model] : []),
      ],
      output: "grok-stream",
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
  // Installers that put the agent in their own folder, which a fresh shell
  // may not have on PATH yet: Cursor (~/.local/bin), Grok Build (~/.grok/bin).
  const home = env.HOME ?? env.USERPROFILE;
  const localBin = home ? [path.join(home, ".local", "bin"), path.join(home, ".grok", "bin")] : [];
  const dirs = [...(env.PATH ?? env.Path ?? "").split(path.delimiter).filter(Boolean), ...npmBin, ...localBin];
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
/**
 * The model provider Codex is set to use, when it isn't OpenAI's own: the
 * top-level `model_provider` in config.toml and that provider's `env_key`.
 * @param {string} codexHome
 * @returns {{ id: string, envKey?: string } | null}
 */
export function codexProvider(codexHome) {
  let toml = "";
  try {
    toml = fs.readFileSync(path.join(codexHome, "config.toml"), "utf8");
  } catch {
    return null;
  }
  // Keys before the first [table] are top level.
  const [top, ...tables] = toml.split(/^\s*\[/m);
  const id = top.match(/^\s*model_provider\s*=\s*["']([^"']+)["']/m)?.[1];
  if (!id || id === "openai") return null;
  const table = tables.find((t) => t.replace(/["'\s]/g, "").startsWith(`model_providers.${id}]`)) ?? "";
  const envKey = table.match(/^\s*env_key\s*=\s*["']([^"']+)["']/m)?.[1];
  return { id, ...(envKey ? { envKey } : {}) };
}

/** The command that signs a person in, run in its own window. */
const LOGIN = /** @type {Record<string, string>} */ ({
  copilot: "copilot login",
  codex: "codex login",
  claude: "claude",
  gemini: "gemini",
  cursor: "cursor-agent login",
  opencode: "opencode auth login",
  grok: "grok login",
});

/**
 * Free sign-in check (no prompt, no credits). Copilot uses the GitHub CLI's
 * login when there is one; its own login lands in ~/.copilot/config.json.
 * Codex keeps ~/.codex/auth.json, or uses a custom model provider (OpenRouter,
 * say) whose key is in that provider's env_key variable. Claude Code is
 * assumed signed in when it has ~/.claude.json (or $CLAUDE_CONFIG_DIR's),
 * ANTHROPIC_API_KEY, or a gateway such as OpenRouter (ANTHROPIC_BASE_URL with
 * ANTHROPIC_AUTH_TOKEN); it asks on first run otherwise. Gemini CLI takes an
 * API key, Vertex AI, or its Google sign-in (~/.gemini/oauth_creds.json).
 * Cursor CLI takes CURSOR_API_KEY or its own auth.json. OpenCode keeps
 * provider keys in its auth.json. Grok Build takes XAI_API_KEY or the login
 * it caches in ~/.grok/auth.json. null = unknown.
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
  if (id === "codex") {
    const codexHome = dirFrom(process.env, "CODEX_HOME", path.join(home, ".codex"));
    if (fs.existsSync(path.join(codexHome, "auth.json")) || process.env.CODEX_API_KEY) return true;
    const provider = codexProvider(codexHome);
    if (!provider) return false;
    return provider.envKey ? Boolean(process.env[provider.envKey]) : null;
  }
  if (id === "gemini") {
    const env = process.env;
    if (env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.GOOGLE_GENAI_USE_VERTEXAI || env.GOOGLE_GENAI_USE_GCA) return true;
    return fs.existsSync(path.join(dirFrom(env, "GEMINI_CLI_HOME", home), ".gemini", "oauth_creds.json")) || null;
  }
  if (id === "cursor") {
    if (process.env.CURSOR_API_KEY) return true;
    const file =
      process.platform === "win32"
        ? path.join(process.env.APPDATA || path.join(home, "AppData", "Roaming"), "Cursor", "auth.json")
        : process.platform === "darwin"
          ? path.join(home, ".cursor", "auth.json")
          : path.join(process.env.XDG_CONFIG_HOME || path.join(home, ".config"), "cursor", "auth.json");
    return fs.existsSync(file);
  }
  if (id === "grok") {
    if (process.env.XAI_API_KEY) return true;
    return fs.existsSync(path.join(dirFrom(process.env, "GROK_HOME", path.join(home, ".grok")), "auth.json")) || null;
  }
  if (id === "opencode") {
    // Its free OpenCode Zen models need no sign-in, so a missing auth.json
    // doesn't mean it can't run.
    const data = process.env.XDG_DATA_HOME || path.join(home, ".local", "share");
    return fs.existsSync(path.join(data, "opencode", "auth.json")) || null;
  }
  if (id === "claude") {
    if (process.env.ANTHROPIC_API_KEY) return true;
    if (process.env.ANTHROPIC_BASE_URL && process.env.ANTHROPIC_AUTH_TOKEN) return true;
    const dir = process.env.CLAUDE_CONFIG_DIR;
    return fs.existsSync(dir ? path.join(dir, ".claude.json") : path.join(home, ".claude.json")) || null;
  }
  return null;
};

/**
 * User-wide copies of Impeccable on this machine, any agent's. variantly
 * copies one into each worktree where that run's agent reads project skills.
 * @param {string} [home] @param {NodeJS.ProcessEnv} [env]
 */
export function impeccableSources(home = os.homedir(), env = process.env) {
  const dirs = [
    ...[".claude/skills", ".agents/skills", ".github/skills", ".copilot/skills", ".codex/skills", ".gemini/skills", ".cursor/skills"].map((d) => path.join(home, d)),
    ...AGENTS.flatMap((a) => a.skills.global(home, env)),
  ];
  return [...new Set(dirs)].map((d) => path.join(d, "impeccable")).filter((d) => existsSync(path.join(d, "SKILL.md")));
}

/** @param {string} projectRoot */
export async function detectAgents(projectRoot) {
  return Promise.all(
    AGENTS.map(async (agent) => {
      const { path: binPath, version, note } = await probeAgent(agent);
      // variantly copies the skill into each worktree from any of these, so
      // a copy in any of them counts.
      const impeccable =
        hasSkill(agent, "impeccable", { projectRoot }) ||
        impeccableSources().length > 0;
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
