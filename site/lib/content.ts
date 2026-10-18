import scores from '@/lib/demo-scores.json';
import { DEMO, REPO_URL, SITE_URL, SKILLS_URL } from '@/lib/site';

// Everything on the page that is data, in one place.
//
// The twenty variants of examples/oak-and-iron were made by twenty Claude
// Code agents in parallel, each from a short variantly-style brief (saved
// next to it as BRIEF.md in public/demo/oak-and-iron/vN) and working with
// the Impeccable design skill. The summaries are edited
// from each agent's SUMMARY line. The scores are what variantly's
// axe-core and Lighthouse check measured on each page's home page, read
// from lib/demo-scores.json, keyed by run folder then variant (regenerate
// with `npm run score-demo`).

export type DemoVariant = {
  n: number;
  direction: string;
  summary: string;
  files: string[];
};

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
  {
    n: 7,
    direction: 'Swiss punk editorial',
    summary:
      'A Swiss punk editorial poster: a strict 12-column grid flush left on white, Inter Tight at 900 weight, one signal red, and huge numerals: the year, 1-2-3, and prices as big as headlines.',
    files: FILES,
  },
  {
    n: 8,
    direction: 'Liquid glass',
    summary:
      'Apple-style liquid glass: frosted, saturated panes with bright edges and soft highlights floating over a drifting field of peach, sky, lilac and mint, set in crisp Geist with blue pill buttons.',
    files: FILES,
  },
  {
    n: 9,
    direction: 'Memphis revival',
    summary:
      'Memphis as today’s brand studios use it: a terrazzo-confetti ground, cobalt, tomato and butter shapes, squiggle underlines, fat Unbounded headlines, and outlined product cards on clashing colour panels.',
    files: FILES,
  },
  {
    n: 10,
    direction: 'Aura gradient',
    summary:
      'A calm, wellness-brand aura: soft peach, sage and lavender gradients under fine film grain, an oversized airy Instrument Serif with an italic accent, quiet sans text, and plum pill buttons.',
    files: FILES,
  },
  {
    n: 11,
    direction: 'Spec sheet',
    summary:
      'A modern product spec sheet on cyanotype blue: white technical linework, dimension callouts on every piece, a ruled title block, condensed caps and mono measurements.',
    files: FILES,
  },
  {
    n: 12,
    direction: 'Y2K chrome',
    summary:
      'Early-2000s web optimism: brushed silver, liquid-metal headline type, holographic foil, and glossy aqua gel buttons on bubbly rounded pods.',
    files: FILES,
  },
  {
    n: 13,
    direction: 'Neon night market',
    summary:
      'A late-night street market: glowing neon sign lettering on near-black, striped stall awnings over each piece, and a wet-street reflection in amber, pink and cyan.',
    files: FILES,
  },
  {
    n: 14,
    direction: 'Neo-brutalist web',
    summary:
      'Loud contemporary neo-brutalism: thick black outlines, hard offset shadows, flat pink, yellow, mint and blue fills, chunky grotesk caps and a starburst sticker.',
    files: FILES,
  },
  {
    n: 15,
    direction: 'Weekend feature',
    summary:
      'A weekend-supplement feature spread: towering Bodoni headlines cut with a heavy grotesk, a drop-capped three-column story, a pull quote between double rules, all in one oxblood ink on newsprint white.',
    files: FILES,
  },
  {
    n: 16,
    direction: 'Pixel item shop',
    summary:
      'A bitmap item shop: Press Start 2P headings over readable Pixelify Sans, the 16-colour PICO-8 palette, notched 4px frames, 1-bit dither shading and pixel-art furniture in an inventory grid.',
    files: FILES,
  },
  {
    n: 17,
    direction: 'Workbench bento',
    summary:
      'A calm workbench bento: stone-grey rounded tiles sized by what they hold, tight Geist headlines, Geist Mono only for prices and lead time, and a single forge-orange accent for heat.',
    files: FILES,
  },
  {
    n: 18,
    direction: 'Acid rave chrome',
    summary:
      'A rave flyer laid out like a magazine: black ground, liquid-chrome Unbounded headlines, acid-green signal and line art, a warped wireframe grid, pill buttons.',
    files: FILES,
  },
  {
    n: 19,
    direction: 'Kinetic type',
    summary:
      'Typography as the whole layout: one variable grotesque at huge scale and tight tracking, cobalt as the only colour, products listed as giant type rows.',
    files: FILES,
  },
  {
    n: 20,
    direction: 'Terminal shop',
    summary:
      'The whole shop as one terminal session: phosphor green on near-black, amber prompts and prices, VT323 headlines, double-ruled ASCII boxes and a blinking cursor.',
    files: FILES,
  },
];

const W26_VARIANT_LIST: DemoVariant[] = [
  {
    n: 1,
    direction: 'Hand-stitched ledger',
    summary:
      'A hand-bound workshop ledger: grainy ivory paper, rust stitching and stamps, masking tape, a brushed ochre underline and soft wonky Fraunces with handwritten Kalam notes, and one green scanner line drifting over an oak sample.',
    files: FILES,
  },
  {
    n: 2,
    direction: 'Uncanny showroom',
    summary:
      'A showroom from a dream: an arched violet dusk room with a moon, a glowing door and a table on impossibly long legs; icy-blue and silver Instrument Serif headlines reflected in a black floor; stretched, mirrored product drawings.',
    files: FILES,
  },
  {
    n: 3,
    direction: 'Noir film stills',
    summary:
      'Stills from a noir film about a furniture maker: a letterboxed hero with oxblood velvet curtains, a hard spotlight and venetian-blind shadows, italic Bodoni titles over Courier screenplay slugs, a burned-in REC timecode, ending on THE END.',
    files: FILES,
  },
  {
    n: 4,
    direction: 'Scrapbook collage',
    summary:
      'A maximalist scrapbook: torn cream sheets with hard ink shadows, cut-out gingham, sunset and wood-grain pictures, taped cards on stripes, polka dots and checkerboard, round stickers, heavy Bricolage Grotesque with DM Serif italics and one holographic foil sticker.',
    files: FILES,
  },
  {
    n: 5,
    direction: 'Workshop desktop',
    summary:
      'An early desktop OS, re-typeset: ivory windows with striped oxblood title bars on a dotted glacial-teal desktop, pixel-drawn table, stool and shelf, Bricolage Grotesque headlines, windows that zoom open.',
    files: FILES,
  },
  {
    n: 6,
    direction: 'Puffed letters',
    summary:
      'Letters as the furniture: a giant inflated oxblood wordmark that breathes letter by letter, a handwritten arc of text, product names in puffy, wonky-serif and Caveat lettering, prices circled by hand.',
    files: FILES,
  },
  {
    n: 7,
    direction: 'The front room',
    summary:
      'An inherited front room: teal damask wallpaper, a walnut wainscot, products hung in oval, arched and matted gilt frames with manila price tags, a postcard newsletter, and a lamp that warms as dusk falls on scroll.',
    files: FILES,
  },
  {
    n: 8,
    direction: 'Dalarna kurbits',
    summary:
      'A painted Dalarna farmhouse cupboard: warm ivory, oxblood and muted teal, a kurbits bloom that paints itself in inside an arched door panel, Young Serif headings and pigment-tinted product cards.',
    files: FILES,
  },
  {
    n: 9,
    direction: 'Inflated materials',
    summary:
      'A shop of soft, touchable objects: a slowly re-flowing liquid-chrome blob, a frosted glacial-glass slab, an oxblood cushion, inflated pill buttons and puffy tube-rendered furniture in rounded Unbounded type.',
    files: FILES,
  },
  {
    n: 10,
    direction: 'Clay and linen',
    summary:
      'A calm, warm room: linen paper, a stacked cairn of clay, sage and mist stones, fine single-line drawings on pebble plinths, Instrument Serif and slow drifting window light.',
    files: FILES,
  },
];

type ScoreFile = Record<string, Record<string, DemoScores>>;

/** One batch of redesigns of Oak & Iron, served from public/demo/<id>/vN. */
export type DemoRun = {
  id: string;
  /** Short name on the run toggle. */
  label: string;
  /** One line on what this run's agents were asked, shown with the briefs. */
  brief: string;
  /** The run's folder in public/demo, also its key in demo-scores.json. */
  folder: string;
  /** Where the run's vN folders are served from. */
  base: string;
  /** The original page, scored the same way (every run starts from it). */
  original: DemoScores;
  variants: (DemoVariant & DemoScores)[];
};

const makeRun = (run: Omit<DemoRun, 'base' | 'original' | 'variants'>, list: DemoVariant[]) => {
  const all = scores as ScoreFile;
  const own = all[run.folder];
  const original = own?.v0 ?? all['oak-and-iron']?.v0;
  if (!own || !original)
    throw new Error(`lib/demo-scores.json has no ${run.folder}; run npm run score-demo`);
  return {
    ...run,
    base: `/demo/${run.folder}`,
    original,
    variants: list.map((v) => {
      const s = own[`v${v.n}`];
      if (!s)
        throw new Error(
          `lib/demo-scores.json has no ${run.folder}/v${v.n}; run npm run score-demo`,
        );
      return { ...v, ...s };
    }),
  };
};

export const DEMO_RUNS: DemoRun[] = [
  makeRun(
    {
      id: 'classic',
      folder: 'oak-and-iron',
      label: 'Classic',
      brief:
        'Redesign the home page from scratch, one pinned visual direction per design, keeping every word of the content.',
    },
    DEMO_VARIANT_LIST,
  ),
  makeRun(
    {
      id: 'w26',
      folder: 'oak-and-iron-w26',
      label: 'Winter 2026',
      brief:
        'Redesign the shop in the Winter 2026–27 design trends: tactile imperfection, surrealism, cinematic drama, maximalist collage, retro-tech nostalgia, expressive typography, warm eclecticism, neo-folk craft, sensory 3D materials, quiet organic minimalism. Combine human-made texture with one unexpected digital effect.',
    },
    W26_VARIANT_LIST,
  ),
];

export const STEPS: { label: string; title: string; body: string; artifact: string }[] = [
  {
    label: 'Paste',
    title: 'Paste {{cmd}}',
    body: 'Run it in a {{terminal}} in your **site’s folder**. A short wizard asks: **how many designs**, **which pages**, any **extras**.',
    artifact: 'npx variantly',
  },
  {
    label: 'Wait',
    title: 'Your AI designs',
    body: '**Your own assistant** redesigns the site several ways, each in a **separate copy** on its own branch of your site’s timeline. Your files stay **untouched**.',
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
    a: 'Not while you compare: designs are made in **separate git worktrees**, outside your folder. Keep applies one design to your files as an **unstaged change for you to review**; if it is wrong, undo it with git. See [what it does to your repo](/safety).',
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
    how: '**[Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview)**, **[Codex](https://github.com/openai/codex)**, **[Copilot CLI](https://github.com/github/copilot-cli)**, **[Gemini CLI](https://github.com/google-gemini/gemini-cli)**, **[Cursor CLI](https://cursor.com/cli)**, **[OpenCode](https://opencode.ai)**, **[Grok Build](https://x.ai/cli)**, **[Hermes Agent](https://hermes-agent.nousresearch.com)**, **[Pi](https://pi.dev)** or **[Antigravity CLI](https://antigravity.google)**, signed in or on [OpenRouter](https://openrouter.ai). variantly **finds the one you have**, or installs one and opens its sign-in. [Lovable](https://lovable.dev)/v0 only? Those run in the browser; install Claude Code.',
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

// The local walkthrough with the demo agent, checked against a real run of
// `variantly --demo` on examples/oak-and-iron.
export const DEMO_STEPS: { title: string; body: string; commands?: string[] }[] = [
  {
    title: 'Get a sample project',
    body:
      'Any site in a git repository works. Or use the made-up shop from the comparison above, copied out of [the repository](' +
      REPO_URL +
      '/tree/main/examples/oak-and-iron) into a fresh git repo of its own.',
    commands: [
      `git clone ${REPO_URL}.git`,
      'cp -r variantly/examples/oak-and-iron oak && cd oak',
      'git init -q && git add -A && git commit -qm before',
    ],
  },
  {
    title: 'Start the demo run',
    body: 'Opens the wizard at **localhost:4477** with the demo agent picked. Each design gets its own git worktree and branch; the demo agent needs no model or account.',
    commands: [DEMO],
  },
  {
    title: 'Compare them live',
    body: 'Every design runs as a **live preview** next to the original. Flick between them and drag the line to compare. The demo agent’s looks are crude on purpose: a real agent redesigns from scratch.',
  },
  {
    title: 'Keep one',
    body: 'Press **Keep** (or run `npx variantly keep 2`). Its change lands in your folder as an **unstaged diff**, merged with any edits you had not committed.',
  },
  {
    title: 'Review the code',
    body: '`git diff` shows exactly what changed. Commit it like any other edit, or throw it away.',
    commands: ['git diff'],
  },
  {
    title: 'Undo or clean up',
    body: '`git restore <file>` drops a kept change (and anything else uncommitted in that file, so commit your own work first). `npx variantly clean` removes the worktrees, branches and state.',
    commands: ['npx variantly clean'],
  },
];

// What variantly does to the repository, each step with the code behind it
// (a path in the repository, linked from the page). Checked against a run of
// `variantly --demo` with an uncommitted edit in the tree.
export const TRUST: { title: string; body: string; source: string }[] = [
  {
    title: 'Your uncommitted edits are snapshotted, not touched',
    body: 'Before a run, `git stash create` turns uncommitted changes to tracked files into a commit without changing your folder, your index or your stash list. Designs start from exactly what you see. Untracked files are not in the snapshot.',
    source: 'src/git.mjs#L38',
  },
  {
    title: 'Each design gets its own worktree and branch',
    body: 'Variant n is a git worktree on branch `variantly/<run>/v<n>`, under `~/.variantly/`, outside your folder. The agent works only there. `node_modules` is linked in and `.env`-style files are copied, so an agent editing them cannot reach yours.',
    source: 'src/git.mjs#L77',
  },
  {
    title: 'variantly commits the agent’s work to that branch',
    body: 'The agent is told not to commit; variantly does it, as author “variantly”, with hooks skipped. Your branches and your checkout stay where they were.',
    source: 'src/git.mjs#L265',
  },
  {
    title: 'Keep applies one diff, unstaged',
    body: 'The kept branch’s diff is applied to your working tree with `git apply`, falling back to a three-way merge if you edited the same files meanwhile; overlaps are left as conflict markers. Nothing is staged or committed: review it with `git diff`.',
    source: 'src/git.mjs#L287',
  },
  {
    title: 'The other designs stay as branches',
    body: 'After a keep the worktrees are removed but every `variantly/…` branch stays, so nothing is lost. `npx variantly clean` deletes the worktrees, those branches and the state folder.',
    source: 'bin/variantly.mjs#L261',
  },
  {
    title: 'Rolling back',
    body: 'Before Keep there is nothing to undo: your folder is unchanged. After Keep, `git restore <file>` (or `git checkout -- <file>`) drops the change, and the kept branch is still there to re-apply.',
    source: 'src/session.mjs#L874',
  },
];

// Limits and the operations that can change things, said plainly.
export const TRUST_CAVEATS: string[] = [
  '**No commits yet?** The wizard offers to make the first one for you: it runs `git add -A` and commits **everything not gitignored** as “Before variantly”. Check your `.gitignore` covers secrets first.',
  '**Undoing a keep with `git restore` also discards your own uncommitted edits in those files.** Commit your work before you press Keep.',
  '**Agents run unattended.** By default they may edit files and run only a short list of read-only commands; the wizard’s full-permissions option drops those limits. A worktree keeps edits out of your folder, but it is not a sandbox for your machine.',
  '**Keep rolls the design out to the rest of the site first** (one more agent run). Use `--no-rollout` to apply only the pages the variants redesigned.',
  '**Changed dependencies** (package.json, lockfiles…) are applied like any file; run your install command afterwards.',
  'Each design is **one session on your AI plan**. variantly brings no model and sends nothing to its own servers; the agent you choose talks to its provider as usual.',
];
