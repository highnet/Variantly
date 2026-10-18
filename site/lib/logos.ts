import {
  siAstro,
  siBun,
  siClaude,
  siDjango,
  siFastapi,
  siCursor,
  siGithubcopilot,
  siGooglegemini,
  siOpencode,
  siGo,
  siHtml5,
  siLaravel,
  siNextdotjs,
  siNuxt,
  siReflex,
  siRubyonrails,
  siRust,
  siSvelte,
  siVite,
} from 'simple-icons';

// Brand marks from simple-icons (CC0). Wasp, OpenAI and Grok Build have no
// entry there, so they render as a name tile or a neutral terminal glyph.

export type Logo = { title: string; path: string | null };

const mark = (icon: { title: string; path: string }): Logo => ({
  title: icon.title,
  path: icon.path,
});

export type StackLogo = Logo & { command: string };

export const STACK_LOGOS: StackLogo[] = [
  { ...mark(siNextdotjs), command: 'next dev' },
  { ...mark(siSvelte), title: 'SvelteKit', command: 'vite dev' },
  { ...mark(siAstro), command: 'astro dev' },
  { ...mark(siNuxt), command: 'nuxi dev' },
  { ...mark(siVite), command: 'vite' },
  { ...mark(siBun), command: 'bun run dev' },
  { ...mark(siHtml5), title: 'Static HTML', command: 'built-in server' },
  { ...mark(siLaravel), command: 'artisan serve + Vite' },
  { ...mark(siRubyonrails), title: 'Rails 8', command: 'rails server' },
  { ...mark(siDjango), command: 'runserver' },
  { ...mark(siFastapi), command: 'uvicorn' },
  { ...mark(siReflex), command: 'reflex run' },
  { ...mark(siGo), command: 'go run .' },
  { ...mark(siRust), command: 'cargo run' },
  { title: 'Wasp', path: null, command: 'wasp start' },
];

export const AGENT_LOGOS: (Logo & { name: string; install: string })[] = [
  { ...mark(siClaude), name: 'Claude Code', install: 'npm i -g @anthropic-ai/claude-code' },
  { title: 'Codex', path: null, name: 'Codex CLI', install: 'npm i -g @openai/codex' },
  { ...mark(siGithubcopilot), name: 'GitHub Copilot CLI', install: 'npm i -g @github/copilot' },
  { ...mark(siGooglegemini), name: 'Gemini CLI', install: 'npm i -g @google/gemini-cli' },
  { ...mark(siCursor), name: 'Cursor CLI', install: 'curl https://cursor.com/install -fsS | bash' },
  { ...mark(siOpencode), name: 'OpenCode', install: 'npm i -g opencode-ai' },
  {
    title: 'Grok Build',
    path: null,
    name: 'Grok Build',
    install: 'curl -fsSL https://x.ai/cli/install.sh | bash',
  },
];
