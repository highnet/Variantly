// @ts-check
/*
 * The brief each agent receives. Two things make N variants worth comparing
 * rather than N copies of the same safe answer: every variant gets a
 * different direction, and the brief tells the agent which number it is and
 * that its siblings exist.
 *
 * "Redesign" directions are visual worlds for Impeccable's new-work flow.
 * "Refine" directions are Impeccable's own commands, so a variant is exactly
 * what `/impeccable bolder` or `/impeccable typeset` would have produced.
 */

/** @typedef {{ id: string, label: string, detail: string }} Direction */

/** @type {Direction[]} */
export const REDESIGN_DIRECTIONS = [
  { id: "editorial", label: "Editorial", detail: "magazine typography: a confident display face, long measure, generous whitespace, rules and folios" },
  { id: "swiss", label: "Swiss precision", detail: "a strict grid, one grotesk in several weights, flush-left text, colour used only to signal" },
  { id: "warm", label: "Warm & tactile", detail: "paper and clay tones, soft depth, rounded geometry, a humane serif or rounded sans" },
  { id: "technical", label: "Dark technical", detail: "a high-contrast dark theme, monospaced accents, dense information, precise hairlines" },
  { id: "bold", label: "Loud & bold", detail: "oversized type, saturated colour fields, hard edges, a layout that takes a position" },
  { id: "quiet", label: "Quiet minimal", detail: "distilled to essentials: few elements, lots of air, one accent, restrained motion" },
  { id: "playful", label: "Playful", detail: "friendly shapes, bright secondary colours, illustrative accents, bouncy but purposeful motion" },
  { id: "luxury", label: "Refined luxury", detail: "a high-end register: fine serif, slow reveals, deep neutrals, metallic or jewel accents used sparingly" },
  { id: "brutalist", label: "Brutalist", detail: "raw structure on show: system fonts, visible borders, stark blocks, deliberate roughness" },
  { id: "retro", label: "Retro-futurist", detail: "a period aesthetic reinterpreted: era-specific type, gradients or grain, nostalgic but not costume" },
];

/** @type {Direction[]} */
export const REFINE_DIRECTIONS = [
  { id: "polish", label: "Polish", detail: "the final quality pass: alignment, spacing, states, consistency" },
  { id: "bolder", label: "Bolder", detail: "amplify a safe or bland design" },
  { id: "typeset", label: "Typeset", detail: "fix and elevate the typography" },
  { id: "colorize", label: "Colorize", detail: "add strategic colour to a monochrome UI" },
  { id: "layout", label: "Layout", detail: "rework spacing, rhythm and composition" },
  { id: "quieter", label: "Quieter", detail: "tone down an aggressive or overstimulating design" },
  { id: "distill", label: "Distill", detail: "strip to the essence, remove complexity" },
  { id: "delight", label: "Delight", detail: "add moments of personality and joy" },
  { id: "animate", label: "Animate", detail: "add purposeful motion and micro-interactions" },
  { id: "clarify", label: "Clarify", detail: "make copy, labels and hierarchy easier to understand" },
];

/**
 * Pick `count` distinct directions, in list order.
 * @param {"redesign" | "refine"} approach
 * @param {number} count
 */
export function defaultDirections(approach, count) {
  const list = approach === "refine" ? REFINE_DIRECTIONS : REDESIGN_DIRECTIONS;
  return Array.from({ length: count }, (_, i) => list[i % list.length].id);
}

/** @param {"redesign" | "refine"} approach @param {string} id */
export function directionFor(approach, id) {
  const list = approach === "refine" ? REFINE_DIRECTIONS : REDESIGN_DIRECTIONS;
  return list.find((d) => d.id === id) ?? { id, label: id, detail: id };
}

/**
 * @typedef {object} BriefInput
 * @property {number} variant
 * @property {number} count
 * @property {"redesign" | "refine"} approach
 * @property {string} direction   a direction id, or free text from the user
 * @property {string} brief       the user's own words, may be empty
 * @property {string[]} routes    the pages that matter, may be empty
 * @property {string} appRel      app root relative to the repository
 * @property {string} stackName
 * @property {string} styles      where the look lives
 * @property {boolean} hasProduct PRODUCT.md exists
 * @property {boolean} hasDesign  DESIGN.md exists
 * @property {string} stackId
 */

/** @param {BriefInput} b */
export function writeBrief(b) {
  const dir = directionFor(b.approach, b.direction);
  const target = b.routes.length ? b.routes.join(", ") : "the site's main pages, starting with the home page";
  const where = b.appRel ? `The app lives in \`${b.appRel}/\` inside this repository.` : "The app lives at the root of this repository.";
  const meta = JSON.stringify({ variant: b.variant, count: b.count, approach: b.approach, direction: dir.id, appRel: b.appRel, stack: b.stackId });

  const task =
    b.approach === "refine"
      ? `Run Impeccable's \`${dir.id}\` command on ${target}: ${dir.detail}. Keep the existing visual identity; this is a refinement, not a redesign.`
      : `Redesign ${target}. This is a redesign, not a polish: follow Impeccable's new-work flow, treat the current look as evidence of what to replace, and commit to one replacement visual world. Your direction is **${dir.label}**: ${dir.detail}. Push it far enough that someone flicking between the ${b.count} variants can name yours at a glance.`;

  return `<!-- variantly ${meta} -->
# variantly brief: variant ${b.variant} of ${b.count}

You are one of ${b.count} agents each producing a different design for the same
site, in parallel, in separate git worktrees. A person will flick between all
${b.count} in a browser and keep one. The current working directory is your own
isolated copy; edit anything in it.

## Task

Use the **Impeccable** skill for all of the design work (\`/impeccable\`; load
the skill before you start). ${task}

${b.brief ? `What the owner asked for, in their words:\n\n> ${b.brief.replace(/\n/g, "\n> ")}\n` : ""}
## The project

- Stack: ${b.stackName}. ${where}
- Where the look lives: ${b.styles || "find the global stylesheet, layout and shared components first"}.
- ${b.hasProduct ? "PRODUCT.md exists: honour it." : "There is no PRODUCT.md. Do not run `/impeccable init` and do not ask questions; infer the product from the code and content."}
- ${b.hasDesign ? (b.approach === "refine" ? "DESIGN.md exists: it is the identity to keep." : "DESIGN.md describes the look you are replacing. Update it to describe your new world when you are done.") : "There is no DESIGN.md."}

## Rules

1. This run is **non-interactive**. Never ask a question or wait for an answer;
   make the call a senior designer would and note it in your summary.
2. Change presentation, not behaviour. Keep every route, every piece of copy
   and data, every form field and handler. Markup structure, styles, tokens,
   fonts, images and motion are yours to change.
3. **Do not install packages or touch lockfiles.** Installed dependencies are
   shared with other variants. Load fonts with CSS (\`@import\`, \`@font-face\`)
   or the framework's built-in font loader; use what is already installed.
4. **Do not start, stop or restart any server.** variantly runs one dev server
   per variant and is already previewing yours; it reloads on its own.
5. **Do not commit, branch or push.** variantly commits your work for you.
6. Stay inside this working directory.
7. Verify by reading your code, not by screenshots: there is no browser for
   you here. Run the project's type check or linter if it is quick.

## When you are done

End your final message with one line that starts with \`SUMMARY:\` and says, in
under 30 words, what your variant is (the world, the type, the colour), so the
person choosing can tell it apart.
`;
}

/**
 * Pull the SUMMARY line out of an agent's final output.
 * @param {string} text
 */
export function extractSummary(text) {
  const matches = [...text.matchAll(/SUMMARY:\s*(.+)/g)];
  const last = matches.at(-1)?.[1]?.trim() ?? "";
  return last.replace(/[*_`]+/g, "").replace(/\\n.*$/, "").slice(0, 240);
}

/**
 * Read the machine header back out of a brief (used by the demo agent).
 * @param {string} brief
 */
export function readBriefMeta(brief) {
  const m = brief.match(/<!-- variantly (\{.*?\}) -->/);
  return m ? JSON.parse(m[1]) : null;
}
