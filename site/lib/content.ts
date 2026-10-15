// Everything on the page that is data, in one place. The demo variants are
// the built-in demo agent's real output on examples/oak-and-iron (generated
// into public/demo/oak-and-iron/v1–v6); the summaries are its SUMMARY lines.

export type DemoVariant = {
  n: number;
  direction: string;
  summary: string;
  files: string[];
};

export const DEMO_VARIANTS: DemoVariant[] = [
  {
    n: 1,
    direction: 'Editorial',
    summary: 'Georgia type on #f6f1e7 with #8a2c1b accents.',
    files: ['style.css'],
  },
  {
    n: 2,
    direction: 'Swiss precision',
    summary: 'Helvetica Neue type on #ffffff with #e30613 accents.',
    files: ['style.css'],
  },
  {
    n: 3,
    direction: 'Warm & tactile',
    summary: 'Trebuchet MS type on #efe4d6 with #c4622d accents.',
    files: ['style.css'],
  },
  {
    n: 4,
    direction: 'Dark technical',
    summary: 'ui-monospace type on #0d1117 with #3fb950 accents.',
    files: ['style.css'],
  },
  {
    n: 5,
    direction: 'Loud & bold',
    summary: 'Impact type on #ffe600 with #ff2d55 accents.',
    files: ['style.css'],
  },
  {
    n: 6,
    direction: 'Quiet minimal',
    summary: 'system-ui type on #fafaf9 with #57534e accents.',
    files: ['style.css'],
  },
];

export const STACKS: { name: string; command: string }[] = [
  { name: 'Next.js', command: 'next dev --port {port}' },
  { name: 'SvelteKit', command: 'vite dev --port {port}' },
  { name: 'Astro', command: 'astro dev --port {port}' },
  { name: 'Nuxt', command: 'nuxi dev --port {port}' },
  { name: 'Vite', command: 'vite --port {port}' },
  { name: 'Bun', command: 'bun run dev' },
  { name: 'Static HTML', command: 'built-in server' },
  { name: 'Laravel', command: 'php artisan serve + Vite' },
  { name: 'Rails 8', command: 'bin/rails server -p {port}' },
  { name: 'Django', command: 'manage.py runserver' },
  { name: 'FastAPI', command: 'uvicorn app:app --port {port}' },
  { name: 'Reflex', command: 'reflex run --frontend-port {port}' },
  { name: 'Go', command: 'go run . (reads PORT)' },
  { name: 'Rust', command: 'cargo run (reads PORT)' },
  { name: 'Wasp', command: 'wasp start (one at a time)' },
];

export const AGENTS: { name: string; install: string; runs: string }[] = [
  { name: 'Claude Code', install: 'npm install -g @anthropic-ai/claude-code', runs: 'claude -p' },
  { name: 'Codex CLI', install: 'npm install -g @openai/codex', runs: 'codex exec --full-auto' },
  { name: 'GitHub Copilot CLI', install: 'npm install -g @github/copilot', runs: 'copilot -p' },
];
