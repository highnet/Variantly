import scores from '@/lib/demo-scores.json';
import { SITE_URL, SKILLS_URL } from '@/lib/site';

// Everything on the page that is data, in one place.
//
// The six variants of examples/oak-and-iron were made by six Claude Code
// agents in parallel, each from a short variantly-style brief (saved next to
// it as BRIEF.md in public/demo/oak-and-iron/vN). The summaries are edited
// from each agent's SUMMARY line. The scores are what variantly's
// axe-core and Lighthouse check measured on each page's home page, read
// from lib/demo-scores.json (regenerate with `npm run score-demo`).

export type DemoVariant = {
  n: number;
  direction: string;
  summary: string;
  files: string[];
};

/** The original Oak & Iron home page, scored the same way. */
export const DEMO_ORIGINAL_SCORES = scores.v0;

const FILES = ['index.html', 'style.css'];

/** Lighthouse accessibility (0–100) and axe-core's flagged element count. */
export type DemoScores = { a11y: number; axe: number };

const DEMO_VARIANT_LIST: DemoVariant[] = [
  {
    n: 1,
    direction: 'Nordic catalogue',
    summary:
      'A printed Scandinavian catalogue: pale birch paper, ink-blue rules and type, numbered sections, product plates with line drawings and dimensions.',
    files: FILES,
  },
  {
    n: 2,
    direction: 'Mingei craft',
    summary:
      'Japanese folk craft: Shippori Mincho serif, indigo and persimmon on speckled washi paper, vertical accents and a quiet, spacious layout.',
    files: FILES,
  },
  {
    n: 3,
    direction: 'Trade catalogue',
    summary:
      'An 1890s ironmonger’s catalogue on rag paper: double-ruled borders, numbered stock items, dotted price leaders, sepia ink with rust accents.',
    files: FILES,
  },
  {
    n: 4,
    direction: 'Art Deco',
    summary:
      'A 1920s Art Deco salon: Limelight and Poiret One display type, brass on deep green, a sunburst, stepped frames and diamond rules.',
    files: FILES,
  },
  {
    n: 5,
    direction: 'Brutalist',
    summary:
      'Raw brutalist grid: black rules, square corners, system mono with Archivo Black headings, stark white and black, safety-orange accents.',
    files: FILES,
  },
  {
    n: 6,
    direction: 'Risograph zine',
    summary:
      'A stapled cream zine page: misregistered pink-and-teal overprint headings, Courier Prime body text, halftone dots and drawn product plates.',
    files: FILES,
  },
];

export const DEMO_VARIANTS: (DemoVariant & DemoScores)[] = DEMO_VARIANT_LIST.map((v) => {
  const s = (scores as Record<string, DemoScores>)[`v${v.n}`];
  if (!s) throw new Error(`lib/demo-scores.json has no v${v.n}; run npm run score-demo`);
  return { ...v, ...s };
});

export const STEPS: { label: string; title: string; body: string; artifact: string }[] = [
  {
    label: 'Paste',
    title: 'Paste one command',
    body: 'Run it in a {{terminal}} in your **site’s folder**. A short wizard asks: **how many designs**, **which pages**, any **extras**.',
    artifact: 'npx variantly',
  },
  {
    label: 'Wait',
    title: 'Your AI designs',
    body: '**Your own assistant** redesigns the site several ways, each in a **{{worktree}}** on its own {{branch}} of your site’s timeline. Your files stay **untouched**.',
    artifact: 'Start with 4',
  },
  {
    label: 'Keep',
    title: 'Keep one',
    body: '**Flick through** in your browser, like the demo above. **Compare**, press **Keep**. Or run again.',
    artifact: 'Keep',
  },
];

// Plain answers to the questions a first-time visitor asks.
export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Do I need to be a developer?',
    a: 'No. If you can **paste a command**, you’re set. Your **AI assistant** does the design work, and can **set variantly up for you**: send it this page.',
  },
  {
    q: 'What does it cost?',
    a: 'variantly is **free and open source**. Each design = **one AI session** on your own plan. **Start with four.**',
  },
  {
    q: 'Can it break my site?',
    a: 'No. Designs are made in **separate copies**. When you press Keep, the change is left **for you to review**.',
  },
  {
    q: 'What if I don’t like any of them?',
    a: '**Run it again** with a sharper brief. **Nothing is kept** unless you press Keep.',
  },
];

// What a first-timer checks before running it. Each item says how to check.
/** Ready-made prompts to paste into the person's own AI assistant. */
export const PROMPTS = {
  setup: `Redesign this website with variantly. Read ${SKILLS_URL} first. In this folder, run \`npx variantly doctor\` and fix anything it marks ✗ (ask me before installing anything). Then ask me in one line what I want to change about the look, and start a run of 4 designs with my answer as the brief. Each design is one session on my AI account. Give me the link it prints, and don't keep a design until I pick one.`,
  doctor:
    "Run `npx variantly doctor` in this folder. For each line it marks ✗, tell me in plain words what's missing and fix it, asking me before installing anything. Run it again until nothing is marked ✗.",
  demo: 'Run `npx variantly --demo` in this folder and give me the link it prints. It shows ready-made designs without using any AI credits.',
  docs: `variantly's docs for AI agents are at ${SKILLS_URL} and ${SITE_URL}/llms.txt. Read both before you do anything. Use them to answer my questions about variantly and to run its commands for me in this folder, explaining each one in a sentence before you run it. Start with \`npx variantly doctor\` and tell me in plain words what it found.`,
  walkthrough: `I'm a total beginner and I've never used a terminal. I want to try variantly (${SITE_URL}) on my website: it redesigns the site when I run \`npx variantly\` in my website's folder. Walk me through it one small step at a time. First ask whether I'm on Mac or Windows and which code editor I have (if none, help me install VS Code). For each step, say in one plain sentence what it does, tell me exactly what to click or type, then stop and wait until I say "done" or paste what I see. If I paste an error, explain it simply and how to fix it. The steps: open my website's folder in the editor, open a terminal there, check Node.js is 20.11 or newer with \`node --version\` (and help me install it if not), then run \`npx variantly\` and open the link it prints. If my site is already running in a terminal, have me open a second one and leave the first alone.`,
};

export const CHECKLIST: { id: string; need: string; how: string; prompt: string }[] = [
  {
    id: 'agent',
    need: 'An {{agent}} on your computer',
    how: '**[Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview)**, **[Codex](https://github.com/openai/codex)**, **[Copilot CLI](https://github.com/github/copilot-cli)**, **[Gemini CLI](https://github.com/google-gemini/gemini-cli)** or **[Cursor CLI](https://cursor.com/cli)**, signed in or on [OpenRouter](https://openrouter.ai). variantly **finds the one you have**, or installs one and opens its sign-in. [Lovable](https://lovable.dev)/v0 only? Those run in the browser; install Claude Code.',
    prompt:
      'Help me install Claude Code on this computer and sign in. Tell me each command to run and check it works with `claude --version`.',
  },
  {
    id: 'code',
    need: 'Your site’s code on your computer',
    how: 'A **local folder**. Website-builder-only sites **won’t work**.',
    prompt:
      'Help me get my website’s code onto this computer. Ask me where the site is hosted, then walk me through downloading or cloning it into a folder.',
  },
  {
    id: 'git',
    need: 'The code saved with git',
    how: 'A {{git}} repository. **No {{commit}} yet? Variantly makes the first one for you.**',
    prompt:
      'Make sure this folder is a git repository and commit everything in it with the message "before variantly". Initialise git first if needed.',
  },
  {
    id: 'run',
    need: 'The site runs on your computer',
    how: 'Starts locally and opens in a browser. Plus **{{node}} 20.11+**, whatever your site is built with: variantly itself runs on it (that’s what **{{npx}}** runs), and most AI agents install with it.',
    prompt:
      'Get this website running locally and tell me the address to open. Also check Node.js is 20.11 or newer (`node --version`) and install it if not: variantly runs on Node even if the site doesn’t.',
  },
];

// Optional Impeccable passes the wizard offers on top of a redesign. Mirrors
// EXTRAS in src/brief.mjs.
export const EXTRAS: { label: string; hint: string }[] = [
  {
    label: 'Rewrite the copy',
    hint: 'Sharper headlines and buttons. **Facts stay.**',
  },
  {
    label: 'Add motion',
    hint: 'Purposeful transitions. **Reduced motion respected.**',
  },
  { label: 'Add delight', hint: 'Personality in **hovers, empty states, details**.' },
  {
    label: 'Polish for phones',
    hint: 'Checks **phone width**, fixes what breaks.',
  },
  { label: 'Harden', hint: '**Accessibility**, focus, long text, errors.' },
];
