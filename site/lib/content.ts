import { SKILLS_URL } from '@/lib/site';

// Everything on the page that is data, in one place.
//
// The six variants of examples/oak-and-iron were made by six Claude Code
// agents in parallel, each from a short variantly-style brief (saved next to
// it as BRIEF.md in public/demo/oak-and-iron/vN). The summaries are edited
// from each agent's SUMMARY line. The scores are what variantly's
// axe-core and Lighthouse check measured on each page's home page.

export type DemoVariant = {
  n: number;
  direction: string;
  summary: string;
  files: string[];
  /** Lighthouse accessibility, 0–100 */
  a11y: number;
  /** elements axe-core flags */
  axe: number;
};

/** The original Oak & Iron home page, scored the same way. */
export const DEMO_ORIGINAL_SCORES = { a11y: 97, axe: 21 };

const FILES = ['index.html', 'style.css'];

export const DEMO_VARIANTS: DemoVariant[] = [
  {
    n: 1,
    direction: 'Nordic catalogue',
    summary:
      'A printed Scandinavian catalogue: pale birch paper, ink-blue rules and type, numbered sections, product plates with line drawings and dimensions.',
    files: FILES,
    a11y: 98,
    axe: 1,
  },
  {
    n: 2,
    direction: 'Mingei craft',
    summary:
      'Japanese folk craft: Shippori Mincho serif, indigo and persimmon on speckled washi paper, vertical accents and a quiet, spacious layout.',
    files: FILES,
    a11y: 98,
    axe: 16,
  },
  {
    n: 3,
    direction: 'Trade catalogue',
    summary:
      'An 1890s ironmonger’s catalogue on rag paper: double-ruled borders, numbered stock items, dotted price leaders, sepia ink with rust accents.',
    files: FILES,
    a11y: 98,
    axe: 1,
  },
  {
    n: 4,
    direction: 'Art Deco',
    summary:
      'A 1920s Art Deco salon: Limelight and Poiret One display type, brass on deep green, a sunburst, stepped frames and diamond rules.',
    files: FILES,
    a11y: 98,
    axe: 1,
  },
  {
    n: 5,
    direction: 'Brutalist',
    summary:
      'Raw brutalist grid: black rules, square corners, system mono with Archivo Black headings, stark white and black, safety-orange accents.',
    files: FILES,
    a11y: 98,
    axe: 2,
  },
  {
    n: 6,
    direction: 'Risograph zine',
    summary:
      'A stapled cream zine page: misregistered pink-and-teal overprint headings, Courier Prime body text, halftone dots and drawn product plates.',
    files: FILES,
    a11y: 98,
    axe: 1,
  },
];

export const STEPS: { label: string; title: string; body: string; artifact: string }[] = [
  {
    label: 'Paste',
    title: 'Paste one command',
    body: 'In a terminal, inside your website’s folder. A short wizard asks how many designs, which pages (just the home page to start), and any extras.',
    artifact: 'npx variantly',
  },
  {
    label: 'Wait',
    title: 'Your AI makes the designs',
    body: 'Your own assistant redesigns the site several ways, each in a separate copy. Your real files are not touched.',
    artifact: 'Start with 4',
  },
  {
    label: 'Keep',
    title: 'Pick your favourite',
    body: 'A page opens in your browser, just like the demo above. Flick through, compare, press Keep. Or run it again.',
    artifact: 'Keep',
  },
];

// Plain answers to the questions a first-time visitor asks.
export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Do I need to be a developer?',
    a: 'You need to be comfortable pasting a command into a terminal. Your AI coding assistant does the design work, and it can set variantly up for you: send it this page.',
  },
  {
    q: 'What does it cost?',
    a: 'variantly is free and open source. Each design is one session of your own AI assistant, so it uses your plan or credits. Start with four.',
  },
  {
    q: 'Can it break my site?',
    a: 'No. Every design is made in a separate copy. Nothing in your project changes until you press Keep, and even then the change is left for you to review.',
  },
  {
    q: 'What if I don’t like any of them?',
    a: 'Run it again, or tell the wizard more about what you want. Nothing is kept unless you press Keep.',
  },
];

// What a first-timer checks before running it. Each item says how to check.
/** Ready-made prompts to paste into the person's own AI assistant. */
export const PROMPTS = {
  setup: `Set up variantly for this website. Read ${SKILLS_URL}, run \`npx variantly doctor\` in this folder and fix anything it marks ✗ (ask me before installing anything). Then start a run with 4 designs and give me the link it prints so I can compare them.`,
  demo: 'Run `npx variantly --demo` in this folder and give me the link it prints. It shows ready-made designs without using any AI credits.',
};

export const CHECKLIST: { id: string; need: string; how: string; prompt: string }[] = [
  {
    id: 'agent',
    need: 'An AI coding assistant installed',
    how: 'Claude Code, Codex or GitHub Copilot CLI, signed in. If you use Cursor or Lovable only, install Claude Code first.',
    prompt:
      'Help me install Claude Code on this computer and sign in. Tell me each command to run and check it works with `claude --version`.',
  },
  {
    id: 'code',
    need: 'Your site’s code on your computer',
    how: 'A folder you can open in a terminal. Sites that only live inside a website builder won’t work.',
    prompt:
      'Help me get my website’s code onto this computer. Ask me where the site is hosted, then walk me through downloading or cloning it into a folder.',
  },
  {
    id: 'git',
    need: 'The code saved with git',
    how: 'At least one commit. Not sure? Ask your assistant: “commit everything in this folder”.',
    prompt:
      'Make sure this folder is a git repository and commit everything in it with the message "before variantly". Initialise git first if needed.',
  },
  {
    id: 'run',
    need: 'The site runs on your computer',
    how: 'You can start it and open it in your browser. Node.js 20.11 or newer.',
    prompt:
      'Get this website running locally. Check Node.js is 20.11 or newer, install its dependencies and start the dev server, then tell me the address to open.',
  },
];

// Optional Impeccable passes the wizard offers on top of a redesign. Mirrors
// EXTRAS in src/brief.mjs.
export const EXTRAS: { label: string; hint: string }[] = [
  {
    label: 'Rewrite the copy',
    hint: 'Sharper headlines, buttons and labels. Facts, prices and names stay.',
  },
  {
    label: 'Add motion',
    hint: 'Purposeful transitions and entrances, with reduced motion respected.',
  },
  { label: 'Add delight', hint: 'Small moments of personality: empty states, hovers, details.' },
  {
    label: 'Polish for phones',
    hint: 'Check every chosen page at phone width and fix what breaks.',
  },
  { label: 'Harden', hint: 'Accessibility, focus states, long text and error states.' },
];
