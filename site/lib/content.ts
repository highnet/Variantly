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

// The promise under the hero, in plain words.
export const SELLING_POINTS = [
  'Several complete redesigns from one command',
  'Click through each one as a working site',
  'Keep the one you like; nothing changes until you do',
  'Not quite right? Run it again',
];

export const STEPS: { label: string; title: string; body: string; artifact: string }[] = [
  {
    label: 'Step 1',
    title: 'Paste one command',
    body: 'Open a terminal in your website’s folder and run it. A short wizard asks what your site is for and how many designs you want.',
    artifact: 'npx variantly',
  },
  {
    label: 'Step 2',
    title: 'Your AI assistant redesigns it',
    body: 'The coding assistant you already use (like Claude Code) makes each design in its own copy of your site, so your real files stay untouched.',
    artifact: 'about 4 designs is a good start',
  },
  {
    label: 'Step 3',
    title: 'Compare and keep one',
    body: 'A page opens in your browser. Click through the designs, slide between before and after, and press Keep on your favourite.',
    artifact: 'Keep · or run it again',
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
    q: 'Can I try it without any AI?',
    a: 'Yes. The demo runs the whole flow with ready-made designs, so you can see how it works first.',
  },
];
