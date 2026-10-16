// @ts-check
/*
 * Process helpers. Everything that spawns goes through here so that Windows
 * gets the same behaviour as macOS and Linux: commands are found on PATH with
 * PATHEXT, `.cmd` shims run through the shell, and stopping a dev server
 * stops the whole tree it started rather than just the shell in front of it.
 */
import { spawn, execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import net from "node:net";

export const isWindows = process.platform === "win32";

/**
 * Find an executable on PATH. Returns its absolute path, or null.
 * @param {string} name
 * @returns {string | null}
 */
export function which(name) {
  const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  const exts = isWindows
    ? ["", ...(process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").toLowerCase().split(";")]
    : [""];
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, name + ext);
      if (existsSync(candidate) && (!isWindows || ext !== "")) return candidate;
    }
  }
  return null;
}

/**
 * Run a command to completion and collect its output.
 * @param {string} file
 * @param {string[]} args
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, timeout?: number, input?: string, signal?: AbortSignal }} [opts]
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
 */
export function run(file, args, opts = {}) {
  return new Promise((resolve) => {
    const resolved = which(file) ?? file;
    const shell = isWindows && /\.(cmd|bat)$/i.test(resolved);
    const child = execFile(
      shell ? quoteForCmd(resolved) : resolved,
      shell ? args.map(quoteForCmd) : args,
      {
        cwd: opts.cwd,
        env: opts.env ?? process.env,
        timeout: opts.timeout ?? 120_000,
        maxBuffer: 32 * 1024 * 1024,
        windowsHide: true,
        shell,
        signal: opts.signal,
      },
      (error, stdout, stderr) => {
        const code = error ? (typeof error.code === "number" ? error.code : 1) : 0;
        resolve({ code, stdout: String(stdout), stderr: String(stderr) });
      },
    );
    if (opts.input !== undefined) child.stdin?.end(opts.input);
  });
}

/**
 * Like run(), but throws with the command's stderr when it fails.
 * @param {string} file
 * @param {string[]} args
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, timeout?: number }} [opts]
 */
export async function runOk(file, args, opts) {
  const result = await run(file, args, opts);
  if (result.code !== 0) {
    const detail = (result.stderr || result.stdout).trim().split("\n").slice(-6).join("\n");
    throw new Error(`${file} ${args.join(" ")} failed (exit ${result.code})\n${detail}`);
  }
  return result.stdout;
}

/**
 * Quote one argument for cmd.exe. Only used for .cmd/.bat shims, and only for
 * short arguments variantly builds itself; long prompts go through a file.
 * @param {string} arg
 */
function quoteForCmd(arg) {
  if (/^[\w./:\\=@+-]+$/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '""')}"`;
}

/**
 * Start a long-running process (a dev server, an agent). The command is a
 * single shell string because dev commands are written by people, with
 * `&&`, env assignments and npm scripts in them.
 * @param {string} command
 * @param {{ cwd: string, env?: NodeJS.ProcessEnv }} opts
 */
export function spawnShell(command, opts) {
  return spawn(command, {
    cwd: opts.cwd,
    env: opts.env ?? process.env,
    shell: true,
    windowsHide: true,
    // Its own process group on POSIX, so kill(-pid) reaches the grandchildren.
    detached: !isWindows,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/**
 * Start an executable with an argument list (no shell on POSIX).
 * @param {string} file
 * @param {string[]} args
 * @param {{ cwd: string, env?: NodeJS.ProcessEnv }} opts
 */
export function spawnArgs(file, args, opts) {
  const resolved = which(file) ?? file;
  const shell = isWindows && /\.(cmd|bat)$/i.test(resolved);
  return spawn(shell ? quoteForCmd(resolved) : resolved, shell ? args.map(quoteForCmd) : args, {
    cwd: opts.cwd,
    env: opts.env ?? process.env,
    shell,
    windowsHide: true,
    detached: !isWindows,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

/**
 * Stop a process and everything it started.
 * @param {import("node:child_process").ChildProcess} child
 */
export async function killTree(child) {
  if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  if (isWindows) {
    await run("taskkill", ["/pid", String(child.pid), "/T", "/F"], { timeout: 15_000 });
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
    const timer = setTimeout(() => {
      try {
        process.kill(-(/** @type {number} */ (child.pid)), "SIGKILL");
      } catch {}
    }, 5_000);
    timer.unref();
  }
  await Promise.race([exited, new Promise((r) => setTimeout(r, 8_000))]);
}

/**
 * Ask the OS for a free TCP port on loopback.
 * @param {number} [preferred]
 * @returns {Promise<number>}
 */
export function freePort(preferred = 0) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", (err) => {
      if (preferred) freePort(0).then(resolve, reject);
      else reject(err);
    });
    server.listen(preferred, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

/**
 * Is something answering HTTP on this URL? Any status counts: a 404 or a
 * 500 still means the dev server is up and can show us an error page.
 * @param {string} url
 * @param {number} [timeoutMs]
 */
export async function isUp(url, timeoutMs = 2_000) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: "manual" });
    await res.body?.cancel();
    return true;
  } catch {
    return false;
  }
}

/**
 * Open a URL in the default browser.
 * @param {string} url
 */
export function openBrowser(url) {
  const [file, args] = isWindows
    ? ["cmd", ["/c", "start", '""', url]]
    : process.platform === "darwin"
      ? ["open", [url]]
      : ["xdg-open", [url]];
  const child = spawn(file, /** @type {string[]} */ (args), { stdio: "ignore", detached: true, windowsHide: true });
  child.on("error", () => {});
  child.unref();
}

/**
 * Keep the last N lines of a stream, for showing a failing server's output.
 */
export class LineBuffer {
  /** @param {number} max */
  constructor(max = 400) {
    this.max = max;
    /** @type {string[]} */
    this.lines = [];
    this.partial = "";
  }
  /** @param {Buffer | string} chunk */
  push(chunk) {
    const text = this.partial + String(chunk);
    const parts = text.split(/\r?\n/);
    this.partial = parts.pop() ?? "";
    for (const line of parts) this.lines.push(stripAnsi(line));
    if (this.lines.length > this.max) this.lines.splice(0, this.lines.length - this.max);
    return parts.map(stripAnsi);
  }
  tail(n = 40) {
    return this.lines.slice(-n);
  }
}

/** @param {string} text */
export function stripAnsi(text) {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "");
}
