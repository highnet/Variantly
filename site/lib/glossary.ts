// Plain-words explanations for the terms a first-timer stalls on. Copy in
// lib/content.ts marks one with {{key}} (or {{key|the words shown}}) and
// <Rich> turns it into a <Tip>; components use <GlossaryTip term="key" />.
// One or two honest sentences each. `code` in backticks shows as code.

export type GlossaryEntry = {
  /** The term as it reads when shown on its own. */
  label: string;
  body: string;
  href?: string;
  hrefLabel?: string;
  /** A bold first line. */
  title?: string;
  /** A command to show, with its copy button, above the body. */
  command?: string;
};

export const GLOSSARY = {
  cmd: {
    label: 'one command',
    title: 'The whole setup is one line',
    command: 'npx variantly',
    body: 'Run it in your site’s folder.',
  },
  terminal: {
    label: 'terminal',
    body: 'A window where you type commands instead of clicking. In VS Code it’s the menu Terminal → New Terminal; on a Mac the Terminal app works too.',
  },
  npx: {
    label: 'npx',
    body: 'A command that comes with Node.js. It downloads a tool and runs it in one go, so there’s nothing to install first.',
    href: 'https://docs.npmjs.com/cli/commands/npx',
    hrefLabel: 'npx docs',
  },
  node: {
    label: 'Node.js',
    body: 'The program that runs JavaScript tools on your computer. variantly runs on it even if your site doesn’t, and installing it gives you npx.',
    href: 'https://nodejs.org/en/download',
    hrefLabel: 'Download Node.js',
  },
  git: {
    label: 'git',
    body: 'Keeps the history of your code, so any change can be undone and parallel versions can sit side by side. variantly uses it to keep every design apart from your files.',
    href: 'https://git-scm.com/downloads',
    hrefLabel: 'Get git',
  },
  commit: {
    label: 'commit',
    body: 'One saved, timestamped snapshot of your files in git. variantly needs at least one so every design starts from the same point in time.',
  },
  worktree: {
    label: 'separate copy',
    body: 'A git worktree: a second checkout of your project in its own folder, on its own branch. The AI edits that copy, never the files you work in.',
  },
  branch: {
    label: 'branch',
    body: 'A parallel timeline of your code in git. Each design gets its own, so nothing reaches your files until you keep one.',
  },
  agent: {
    label: 'AI coding agent',
    body: 'An AI that works inside a project folder: it reads files, runs commands and edits code. variantly gives each design to one session of it.',
  },
  'claude-code': {
    label: 'Claude Code',
    body: 'Anthropic’s AI coding agent. It runs in your terminal, reads your project and makes the edits you ask for.',
    href: 'https://docs.anthropic.com/en/docs/claude-code/overview',
    hrefLabel: 'About Claude Code',
  },
  openrouter: {
    label: 'OpenRouter',
    body: 'One account and API key for many AI models, paid as you go. Claude Code and Codex can run through it instead of their own plan.',
    href: 'https://openrouter.ai',
    hrefLabel: 'openrouter.ai',
  },
  skill: {
    label: 'design skill',
    body: 'A skill is written instructions an AI agent reads before it works. Impeccable’s teaches it design (type, colour, layout) and what to avoid.',
    href: 'https://impeccable.style',
    hrefLabel: 'impeccable.style',
  },
  flags: {
    label: 'flags',
    body: 'Extra options typed after a command, each starting with --. For example `npx variantly --count 6` makes six designs.',
  },
  live: {
    label: 'live',
    body: 'Each design runs as a working copy of your site, so you click around it in your browser instead of looking at a screenshot.',
  },
  keep: {
    label: 'keep one',
    body: 'Press Keep on the one you like and its changes land in your files, for you to review before you commit. The other timelines stay as git branches until you run `npx variantly clean`.',
  },
} satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof GLOSSARY;

export const isGlossaryKey = (key: string): key is GlossaryKey => key in GLOSSARY;
