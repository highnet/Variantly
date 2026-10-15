// @ts-check
/*
 * Stack adapters. variantly never builds a project itself; it runs the
 * project's own dev server once per variant, each on its own port. An adapter
 * knows four things about a stack: how to recognise it, what command serves
 * it on a given port, which uncommitted files a fresh checkout needs to run
 * (installed dependencies, env files, a local database), and where its styles
 * live, which goes into the agent's brief.
 *
 * Every command is a template. `{port}` is the port the preview proxies to,
 * `{port2}` a second free port for stacks that run an asset server next to
 * the app (Laravel + Vite, Reflex), `{run}` the package runner the lockfile
 * implies (npx, pnpm exec, yarn, bunx), `{python}` the project's interpreter.
 * The wizard shows the resolved command and lets the user rewrite it, so an
 * adapter only has to be right for the common layout, never for every one.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * @typedef {object} ProjectInfo
 * @property {string} dir          absolute path of the candidate app root
 * @property {Record<string, string>} deps   package.json deps + devDeps
 * @property {Record<string, string>} scripts
 * @property {(rel: string) => boolean} has
 * @property {(rel: string) => string} read  file contents, "" when missing
 */

/**
 * @typedef {object} StackAdapter
 * @property {string} id
 * @property {string} name
 * @property {string} stack        the stack line from the compatibility list
 * @property {(p: ProjectInfo) => number} detect   0 = no, higher = more certain
 * @property {(p: ProjectInfo) => string} command
 * @property {number} defaultPort  where the user's own server usually runs
 * @property {string[]} link       directories/files to link into a worktree
 * @property {string[]} copy       files to copy into a worktree
 * @property {string} styles       where the look lives, for the agent brief
 * @property {number} [bootTimeout] ms to wait for the first response
 * @property {boolean} [needsInstall] linked deps don't work; install instead
 * @property {boolean} [fixedPorts] the stack can't be moved off its ports
 * @property {string} [note]       shown in the wizard
 */

const ENV_FILES = [".env", ".env.local", ".env.development", ".env.development.local"];
const has = (/** @type {Record<string,string>} */ deps, /** @type {string[]} */ ...names) =>
  names.some((n) => n in deps);

/** @type {StackAdapter[]} */
export const ADAPTERS = [
  {
    id: "nextjs",
    name: "Next.js",
    stack: "Next.js App Router + React 19 + Tailwind + shadcn/ui",
    detect: (p) => (has(p.deps, "next") ? 90 : 0),
    command: () => "{run} next dev --port {port}",
    defaultPort: 3000,
    link: [],
    copy: ENV_FILES,
    // Turbopack refuses a node_modules that is a link pointing outside the
    // project root, so Next variants get a real install. With pnpm or bun
    // that is a hard-link pass over the store and takes seconds.
    needsInstall: true,
    styles: "app/globals.css (Tailwind v4 @theme tokens or tailwind.config), components/ui/* (shadcn), app/layout.tsx (fonts via next/font)",
  },
  {
    id: "sveltekit",
    name: "SvelteKit",
    stack: "SvelteKit 2 + Svelte 5 + Tailwind + Bits UI / Melt UI",
    detect: (p) => (has(p.deps, "@sveltejs/kit") ? 90 : 0),
    command: () => "{run} vite dev --port {port} --strictPort",
    defaultPort: 5173,
    link: ["node_modules"],
    copy: ENV_FILES,
    styles: "src/app.css (Tailwind), src/routes/+layout.svelte, src/lib/components/*",
  },
  {
    id: "astro",
    name: "Astro",
    stack: "Astro with React / Svelte / Vue islands + Tailwind + MDX",
    detect: (p) => (has(p.deps, "astro") ? 90 : 0),
    command: () => "{run} astro dev --port {port}",
    defaultPort: 4321,
    link: ["node_modules"],
    copy: ENV_FILES,
    styles: "src/styles/*.css, src/layouts/*.astro, src/components/*",
  },
  {
    id: "nuxt",
    name: "Nuxt",
    stack: "Nuxt 3+ (Vue 3) + Tailwind + Nuxt UI / PrimeVue",
    detect: (p) => (has(p.deps, "nuxt") ? 90 : 0),
    command: () => "{run} nuxi dev --port {port}",
    defaultPort: 3000,
    link: ["node_modules"],
    copy: ENV_FILES,
    styles: "assets/css/main.css, app.config.ts (Nuxt UI theme), layouts/*.vue, components/*",
  },
  {
    id: "wasp",
    name: "Wasp",
    stack: "Wasp (React + TanStack Query + Prisma)",
    detect: (p) => (p.has("main.wasp") || p.has("main.wasp.ts") || p.has(".wasproot") ? 95 : 0),
    command: () => "wasp start",
    defaultPort: 3000,
    link: ["node_modules", ".wasp"],
    copy: [".env.server", ".env.client"],
    fixedPorts: true,
    bootTimeout: 300_000,
    note: "Wasp always serves on 3000/3001, so variants are previewed one at a time.",
    styles: "src/**/*.css (Tailwind), src/client/* or src/*Page.tsx",
  },
  {
    id: "laravel",
    name: "Laravel",
    stack: "Laravel 11+ with Inertia (Vue/React) or Livewire + Tailwind",
    detect: (p) => (p.has("artisan") && p.has("composer.json") ? 95 : 0),
    command: (p) =>
      p.has("vite.config.js") || p.has("vite.config.ts")
        ? "{run} concurrently -k \"php artisan serve --port={port}\" \"{run} vite --port {port2} --strictPort\""
        : "php artisan serve --port={port}",
    defaultPort: 8000,
    link: ["vendor", "node_modules", "database/database.sqlite"],
    copy: [".env"],
    styles: "resources/css/app.css, resources/js/Pages/* (Inertia) or resources/views/**/*.blade.php",
    note: "Runs php artisan serve and Vite together; needs the concurrently package or edit the command.",
  },
  {
    id: "rails",
    name: "Rails",
    stack: "Rails 8 + Hotwire (Turbo + Stimulus) + Tailwind",
    detect: (p) => (p.has("Gemfile") && p.has("config/application.rb") ? 95 : 0),
    command: (p) =>
      p.read("Procfile.dev").includes("tailwindcss")
        ? "bin/rails tailwindcss:build && bin/rails server -p {port}"
        : "bin/rails server -p {port}",
    defaultPort: 3000,
    link: ["storage", "node_modules", "vendor/bundle"],
    copy: ["config/master.key", ".env"],
    styles: "app/assets/tailwind/application.css or app/assets/stylesheets/*, app/views/layouts/application.html.erb, app/views/**/*",
    bootTimeout: 180_000,
  },
  {
    id: "reflex",
    name: "Reflex",
    stack: "Python + Reflex (pure Python UI)",
    detect: (p) => (p.has("rxconfig.py") ? 95 : 0),
    command: () => "{python} -m reflex run --frontend-port {port} --backend-port {port2}",
    defaultPort: 3000,
    link: [".venv", "venv"],
    copy: [".env"],
    bootTimeout: 240_000,
    styles: "the rx.App(theme=...) call and component style props in the app module",
  },
  {
    id: "django",
    name: "Django",
    stack: "Python + Django (templates, HTMX + Alpine)",
    detect: (p) => (p.has("manage.py") ? 90 : 0),
    command: () => "{python} manage.py runserver 127.0.0.1:{port}",
    defaultPort: 8000,
    link: [".venv", "venv", "db.sqlite3"],
    copy: [".env"],
    styles: "templates/**/*.html, static/css/*, */static/**/*.css",
  },
  {
    id: "fastapi",
    name: "FastAPI",
    stack: "Python + FastAPI (Jinja templates, HTMX + Alpine)",
    detect: (p) => (fastapiModule(p) ? 85 : 0),
    command: (p) => `{python} -m uvicorn ${fastapiModule(p) ?? "main:app"} --port {port} --reload`,
    defaultPort: 8000,
    link: [".venv", "venv"],
    copy: [".env"],
    styles: "templates/**/*.html, static/**/*.css",
  },
  {
    id: "go",
    name: "Go",
    stack: "Go (Templ / html/template, HTMX + Alpine, Chi / Fiber)",
    // A Go module that renders no HTML is an API; a frontend next to it
    // (web/ on Vite) is what gets redesigned, so it must outrank it.
    detect: (p) => (!p.has("go.mod") ? 0 : rendersHtml(p, /github\.com\/a-h\/templ/, "go.mod") ? 80 : 50),
    command: (p) =>
      p.read("go.mod").includes("github.com/a-h/templ") ? "go tool templ generate && go run ." : "go run .",
    defaultPort: 8080,
    link: [],
    copy: [".env"],
    bootTimeout: 180_000,
    styles: "*.templ components, templates/*.html, static/**/*.css",
    note: "The server must read its port from the PORT environment variable.",
  },
  {
    id: "rust",
    name: "Rust",
    stack: "Rust (Axum + Askama / Maud, HTMX)",
    detect: (p) => (!p.has("Cargo.toml") ? 0 : rendersHtml(p, /\b(askama|maud|tera|minijinja|leptos|dioxus|yew)\b/, "Cargo.toml") ? 80 : 50),
    command: () => "cargo run",
    defaultPort: 3000,
    link: [],
    copy: [".env"],
    bootTimeout: 600_000,
    styles: "templates/*.html (Askama) or view functions (Maud), static/**/*.css",
    note: "Each variant compiles in its own target directory; the first build is slow. The server must read PORT.",
  },
  {
    id: "vite",
    name: "Vite (React / Svelte / Vue)",
    stack: "React or Svelte on Vite, in front of a Go / Rust / Python API",
    detect: (p) => (has(p.deps, "vite") ? 60 : 0),
    command: () => "{run} vite --port {port} --strictPort",
    defaultPort: 5173,
    link: ["node_modules"],
    copy: ENV_FILES,
    styles: "src/index.css, src/App.*, src/components/*",
  },
  {
    id: "bun",
    name: "Bun",
    stack: "Bun.serve with HTML imports or a Bun-run dev script",
    detect: (p) =>
      (p.has("bun.lock") || p.has("bun.lockb") || p.has("bunfig.toml")) && /\bbun\b/.test(p.scripts.dev ?? "") ? 70 : 0,
    command: () => "bun run dev",
    defaultPort: 3000,
    link: ["node_modules"],
    copy: ENV_FILES,
    styles: "*.css next to the HTML entry points, src/**/*",
    note: "The dev script must read its port from the PORT environment variable.",
  },
  {
    id: "static",
    name: "Static HTML",
    stack: "Plain HTML, CSS and JavaScript",
    detect: (p) => (p.has("index.html") ? 20 : 0),
    command: () => '{node} "{variantly}/src/static-server.mjs" {port}',
    defaultPort: 8080,
    link: [],
    copy: [],
    styles: "*.html, *.css",
  },
];

export const CUSTOM = /** @type {StackAdapter} */ ({
  id: "custom",
  name: "Custom",
  stack: "Anything with a dev server",
  detect: () => 0,
  command: () => "",
  defaultPort: 3000,
  link: ["node_modules", ".venv", "vendor"],
  copy: ENV_FILES,
  styles: "",
});

/** @param {string} id */
export function adapterById(id) {
  return ADAPTERS.find((a) => a.id === id) ?? CUSTOM;
}

/**
 * Whether a Go or Rust project serves pages itself rather than only an API:
 * a templating dependency in its manifest, or a templates/views folder.
 * @param {ProjectInfo} p
 * @param {RegExp} deps
 * @param {string} manifest
 */
function rendersHtml(p, deps, manifest) {
  if (deps.test(p.read(manifest))) return true;
  if (["templates", "views", "static", "web/templates", "internal/views", "internal/templates"].some((rel) => p.has(rel))) return true;
  try {
    return readdirSync(p.dir).some((f) => /\.(templ|html)$/.test(f));
  } catch {
    return false;
  }
}

/** @param {ProjectInfo} p */
function fastapiModule(p) {
  for (const rel of ["main.py", "app/main.py", "src/main.py", "app.py", "server.py"]) {
    const src = p.read(rel);
    const m = src.match(/^(\w+)\s*=\s*FastAPI\(/m);
    if (m) return `${rel.replace(/\.py$/, "").replace(/\//g, ".")}:${m[1]}`;
  }
  return null;
}

/**
 * @param {string} dir
 * @returns {ProjectInfo}
 */
export function projectInfo(dir) {
  /** @type {Record<string, any>} */
  let pkg = {};
  try {
    pkg = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8").replace(/^﻿/, ""));
  } catch {}
  return {
    dir,
    deps: { ...pkg.dependencies, ...pkg.devDependencies },
    scripts: pkg.scripts ?? {},
    has: (rel) => existsSync(path.join(dir, rel)),
    read: (rel) => {
      try {
        return readFileSync(path.join(dir, rel), "utf8");
      } catch {
        return "";
      }
    },
  };
}

/**
 * @typedef {object} Detection
 * @property {string} appRoot   absolute
 * @property {string} rel       relative to the repository root ("" = root)
 * @property {StackAdapter} adapter
 * @property {number} score
 */

const SKIP = new Set(["node_modules", ".git", "vendor", "templates", ".venv", "venv", "dist", "build", ".next", "target", "storage", "public", "tmp"]);

/**
 * Look at the repository root and two levels below it (apps/web,
 * frontend/, packages/site, ...) and rank every place a known stack lives.
 * The best guess is first; the wizard offers the rest.
 * @param {string} repo
 * @returns {Detection[]}
 */
export function detect(repo) {
  /** @type {Detection[]} */
  const found = [];
  /** @param {string} dir @param {number} depth */
  const visit = (dir, depth) => {
    const info = projectInfo(dir);
    let best = null;
    for (const adapter of ADAPTERS) {
      const score = adapter.detect(info);
      if (score > 0 && (!best || score > best.score)) best = { adapter, score };
    }
    if (best) {
      const rel = path.relative(repo, dir).replace(/\\/g, "/");
      // Prefer the root slightly, and prefer folders named like a frontend.
      const bonus = (rel === "" ? 5 : 0) + (/(^|\/)(web|site|frontend|client|app|www)$/.test(rel) ? 4 : 0);
      found.push({ appRoot: dir, rel, adapter: best.adapter, score: best.score + bonus });
    }
    if (depth <= 0) return;
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith(".") && !SKIP.has(e.name)) visit(path.join(dir, e.name), depth - 1);
    }
  };
  visit(repo, 2);
  return found.sort((a, b) => b.score - a.score);
}

/**
 * The package runner implied by the lockfile, looking upward to the repo
 * root so workspaces resolve correctly.
 * @param {string} appRoot
 * @param {string} repo
 */
export function packageRunner(appRoot, repo) {
  let dir = appRoot;
  for (;;) {
    if (existsSync(path.join(dir, "pnpm-lock.yaml"))) return { run: "pnpm exec", install: "pnpm install --prefer-offline --frozen-lockfile" };
    if (existsSync(path.join(dir, "bun.lock")) || existsSync(path.join(dir, "bun.lockb"))) return { run: "bunx", install: "bun install --frozen-lockfile" };
    if (existsSync(path.join(dir, "yarn.lock"))) return { run: "yarn", install: "yarn install --frozen-lockfile" };
    if (existsSync(path.join(dir, "package-lock.json"))) return { run: "npx --no-install", install: "npm ci --prefer-offline --no-audit --no-fund" };
    if (dir === repo || path.dirname(dir) === dir) break;
    dir = path.dirname(dir);
  }
  return { run: "npx --no-install", install: "npm install --prefer-offline --no-audit --no-fund" };
}

/**
 * Whether a dependency install in a variant worktree really failed. pnpm 10+
 * exits non-zero when it skipped build scripts the project never approved
 * (ERR_PNPM_IGNORED_BUILDS), yet every package is installed and the user's
 * own checkout was installed exactly the same way, so that one is fine.
 * @param {number} code
 * @param {string} output
 */
export function installFailed(code, output) {
  return code !== 0 && !/ERR_PNPM_IGNORED_BUILDS/.test(output);
}

/**
 * The project's Python: its virtualenv when it has one.
 * @param {string} appRoot
 */
export function pythonFor(appRoot) {
  for (const venv of [".venv", "venv"]) {
    const exe = process.platform === "win32" ? path.join(appRoot, venv, "Scripts", "python.exe") : path.join(appRoot, venv, "bin", "python");
    if (existsSync(exe)) return JSON.stringify(exe);
  }
  return process.platform === "win32" ? "python" : "python3";
}

/**
 * Fill a command template.
 * @param {string} template
 * @param {Record<string, string | number>} values
 */
export function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (whole, key) => (key in values ? String(values[key]) : whole));
}
