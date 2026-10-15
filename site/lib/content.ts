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

export const STEPS: { title: string; body: string; command?: string }[] = [
  {
    title: 'Run it in your project',
    body: 'A short wizard reads your stack, finds your agent and asks how many directions you want.',
    command: 'npx variantly',
  },
  {
    title: 'Your agent redesigns, N times',
    body: 'Each variant is its own git worktree and its own agent session with Impeccable, in a different direction.',
  },
  {
    title: 'Compare live, keep one',
    body: 'Every variant runs as your real site. Drag the line, press a number, keep the one you like.',
  },
];
