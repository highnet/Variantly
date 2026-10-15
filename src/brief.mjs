// @ts-check
/*
 * The brief each agent receives. variantly does not choose the look: each
 * agent runs Impeccable's own direction flow, which rolls a different visual
 * world per run, so N variants come out genuinely different. The owner can
 * still pin a direction for any variant in their own words.
 *
 * What variantly does supply is product truth: the owner's answers to
 * Impeccable's init questions, written as PRODUCT.md into every variant, so
 * no agent has to guess what the site is for.
 */

/**
 * One empty slot per variant: blank means "Impeccable decides".
 * @param {number} count
 */
export const defaultDirections = (count) => Array.from({ length: count }, () => '');

/** How a variant's direction reads on the board and in the picker. */
export const directionLabel = (/** @type {string} */ direction) =>
  direction.trim() ? direction.trim().slice(0, 48) : 'Impeccable’s pick';

/**
 * @typedef {object} ProductAnswers
 * @property {string} users     who it is for and what they come to do
 * @property {string} purpose   what it does and what makes it different
 * @property {string} keep      what must stay: brand, content, constraints
 */

/**
 * PRODUCT.md from the owner's answers, in Impeccable's product schema.
 * @param {string} name
 * @param {ProductAnswers} a
 */
export const productMarkdown = (name, a) => `# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

${a.users.trim() || 'Not stated by the owner; infer from the site.'}

## Product Purpose

${a.purpose.trim() || 'Not stated by the owner; infer from the site.'}

## Brand Commitments

${a.keep.trim() || 'None stated.'}

<!-- Written by variantly from the owner's answers for ${name}. -->
`;

/** @param {ProductAnswers | undefined} a */
export const hasAnswers = (a) => Boolean(a && (a.users.trim() || a.purpose.trim() || a.keep.trim()));

/**
 * @typedef {object} BriefInput
 * @property {number} variant
 * @property {number} count
 * @property {"redesign" | "refine"} approach
 * @property {string} direction   the owner's own words for this variant, or ''
 * @property {string} brief       the owner's free-text brief, may be empty
 * @property {string[]} routes    the pages that matter, may be empty
 * @property {string} appRel      app root relative to the repository
 * @property {string} stackName
 * @property {string} styles      where the look lives
 * @property {boolean} hasProduct PRODUCT.md exists (theirs or written from answers)
 * @property {boolean} hasDesign  DESIGN.md exists
 * @property {string} stackId
 */

/** @param {BriefInput} b */
export const writeBrief = (b) => {
  const target = b.routes.length ? b.routes.join(', ') : "the site's main pages, starting with the home page";
  const where = b.appRel ? `The app lives in \`${b.appRel}/\` inside this repository.` : 'The app lives at the root of this repository.';
  const pinned = b.direction.trim();
  const meta = JSON.stringify({ variant: b.variant, count: b.count, approach: b.approach, direction: pinned, appRel: b.appRel, stack: b.stackId });

  const task =
    b.approach === 'refine'
      ? pinned
        ? `Refine ${target}, keeping the existing visual identity. The owner asked for this: **${pinned}**. Use the Impeccable command that fits it best.`
        : `Refine ${target}, keeping the existing visual identity. Critique it with Impeccable first, then run the one Impeccable command that would improve it most.`
      : pinned
        ? `Redesign ${target}. Follow Impeccable's new-work flow and commit to one replacement visual world in the direction the owner pinned for this variant: **${pinned}**.`
        : `Redesign ${target}. Follow Impeccable's new-work flow and let it choose the world: run the direction concept seed and build the direction it assigns, fully committed. This run is non-interactive, so take the assignment instead of presenting choices. The other ${b.count - 1} variants roll their own seeds, so commit to yours rather than playing safe.`;

  return `<!-- variantly ${meta} -->
# variantly brief: variant ${b.variant} of ${b.count}

You are one of ${b.count} agents each producing a different design for the same
site, in parallel, in separate git worktrees. A person will flick between all
${b.count} in a browser and keep one. The current working directory is your own
isolated copy; edit anything in it.

## Task

Use the **Impeccable** skill for all of the design work (\`/impeccable\`; load
the skill before you start). ${task}

${b.brief ? `What the owner asked for, in their words:\n\n> ${b.brief.replace(/\n/g, '\n> ')}\n` : ''}
## The project

- Stack: ${b.stackName}. ${where}
- Where the look lives: ${b.styles || 'find the global stylesheet, layout and shared components first'}.
- ${b.hasProduct ? 'PRODUCT.md exists: it is the product truth. Honour it and do not rewrite it.' : 'There is no PRODUCT.md. Do not run `/impeccable init` and do not ask questions; infer the product from the code and content.'}
- ${b.hasDesign ? (b.approach === 'refine' ? 'DESIGN.md exists: it is the identity to keep.' : 'DESIGN.md describes the look you are replacing.') : 'There is no DESIGN.md yet.'}
- ${b.approach === 'refine' ? 'Update DESIGN.md if your refinement changes a token or rule.' : 'When you are done, write DESIGN.md for the world you built, as Impeccable\'s finish step does.'}

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
};

/**
 * Pull the SUMMARY line out of an agent's final output.
 * @param {string} text
 */
export const extractSummary = (text) => {
  const matches = [...text.matchAll(/SUMMARY:\s*(.+)/g)];
  const last = matches.at(-1)?.[1]?.trim() ?? '';
  return last.replace(/[*_`]+/g, '').replace(/\\n.*$/, '').slice(0, 240);
};

/**
 * Read the machine header back out of a brief (used by the demo agent).
 * @param {string} brief
 */
export const readBriefMeta = (brief) => {
  const m = brief.match(/<!-- variantly (\{.*?\}) -->/);
  return m ? JSON.parse(m[1]) : null;
};
