// Everything on the page that is data, in one place.
//
// The six variants of examples/oak-and-iron were made by Claude Code with the
// Impeccable skill, each from the brief variantly writes for that variant
// (saved next to it as BRIEF.md in public/demo/oak-and-iron/vN). The summaries
// are the agent's own SUMMARY lines.

export type DemoVariant = {
  n: number;
  direction: string;
  summary: string;
  files: string[];
};

const FILES = ['index.html', 'about.html', 'style.css'];

export const DEMO_VARIANTS: DemoVariant[] = [
  {
    n: 1,
    direction: 'Editorial',
    summary:
      'A printed magazine: Gloock masthead, cover-line hero with a scale drawing, numbered catalogue entries and a subscription slip.',
    files: FILES,
  },
  {
    n: 2,
    direction: 'Swiss precision',
    summary:
      'A strict 12-column grid in one grotesk, flush left, red used only to signal; the products become a specification table.',
    files: FILES,
  },
  {
    n: 3,
    direction: 'Warm & tactile',
    summary:
      'Clay, sage and bone with soft depth: a pill navigation, an illustrated stool, rounded product tiles and drawn icons.',
    files: FILES,
  },
  {
    n: 4,
    direction: 'Dark technical',
    summary:
      'The workshop spec sheet: blueprint grid, a dimensioned drawing of the table, mono readouts and a parts list.',
    files: FILES,
  },
  {
    n: 5,
    direction: 'Loud & bold',
    summary:
      'Cobalt, yellow and tomato fields, giant condensed caps, a marquee top bar and prices you can read across the room.',
    files: FILES,
  },
  {
    n: 6,
    direction: 'Quiet minimal',
    summary:
      'Distilled: light type, one column of attention, a lot of air, one olive accent and the products as a quiet list.',
    files: FILES,
  },
];

export const STEPS: { label: string; title: string; body: string; artifact: string }[] = [
  {
    label: 'Paste',
    title: 'Paste one command',
    body: 'In a terminal, inside your website’s folder. A few questions follow: what the site is for, and how many designs you want.',
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
export const CHECKLIST: { id: string; need: string; how: string }[] = [
  {
    id: 'agent',
    need: 'An AI coding assistant installed',
    how: 'Claude Code, Codex or GitHub Copilot CLI, signed in. If you use Cursor or Lovable only, install Claude Code first.',
  },
  {
    id: 'code',
    need: 'Your site’s code on your computer',
    how: 'A folder you can open in a terminal. Sites that only live inside a website builder won’t work.',
  },
  {
    id: 'git',
    need: 'The code saved with git',
    how: 'At least one commit. Not sure? Ask your assistant: “commit everything in this folder”.',
  },
  {
    id: 'run',
    need: 'The site runs on your computer',
    how: 'Something like npm run dev opens it in your browser. Node.js 20.11 or newer.',
  },
];
