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
 * Optional Impeccable passes the owner can add on top of the redesign. Each
 * maps to the Impeccable command that does it.
 */
export const EXTRAS = /** @type {const} */ ([
  { id: 'copy', command: 'clarify', label: 'Rewrite the copy', hint: 'Sharper headlines, buttons and labels. Facts, prices and names stay.' },
  { id: 'motion', command: 'animate', label: 'Add motion', hint: 'Purposeful transitions and entrances, with reduced motion respected.' },
  { id: 'delight', command: 'delight', label: 'Add delight', hint: 'Small moments of personality: empty states, hovers, details.' },
  { id: 'mobile', command: 'adapt', label: 'Polish for phones', hint: 'Check every chosen page at phone width and fix what breaks.' },
  { id: 'a11y', command: 'harden', label: 'Harden', hint: 'Accessibility, focus states, long text and error states.' },
]);

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
 * @property {string[]} routes    the pages to redesign; empty means the home page
 * @property {string[]} [extras]  ids from EXTRAS
 * @property {string} appRel      app root relative to the repository
 * @property {string} stackName
 * @property {string} styles      where the look lives
 * @property {boolean} hasProduct PRODUCT.md exists (theirs or written from answers)
 * @property {boolean} hasDesign  DESIGN.md exists
 * @property {string} stackId
 * @property {string} [agent]     an agent id (claude, codex, opencode, ...) or demo: how the skill is named
 * @property {string} [previewUrl] the variant's live preview, when the agent has a browser
 * @property {string} [shots] where browser output (screenshots) goes, outside the worktree
 */

/** @param {string | undefined} agent */
const skillCall = (agent) => SKILL_CALL[agent ?? ""] ?? "/impeccable";

/** @param {string | undefined} shots */
const shotsRule = (shots) =>
  shots
    ? ` Save screenshots only in ${shots} (pass a full path there as the file
   name, or no file name); never write screenshots or other check output into
   the project.`
    : "";

/** @param {string | undefined} previewUrl @param {string} [shots] */
const verifyRule = (previewUrl, shots) =>
  previewUrl
    ? `7. Verify in the browser. You have Playwright browser tools (the
   \`playwright\` MCP server); your variant is live at ${previewUrl}. Open
   it, take screenshots at desktop (1280 wide) and phone (390 wide) widths,
   and fix what looks wrong. If it doesn't answer, verify by reading code.${shotsRule(shots)}`
    : `7. Verify by reading your code, not by screenshots: there is no browser for
   you here. Run the project's type check or linter if it is quick.`;

/** How each agent's prompt names a skill. Codex mentions skills with a dollar sign, Pi as /skill:name. */
const SKILL_CALL = /** @type {Record<string, string>} */ ({ codex: "$impeccable", pi: "/skill:impeccable" });

/** @param {BriefInput} b */
export const writeBrief = (b) => {
  const routes = b.routes.length ? b.routes : ['/'];
  const target = routes.length === 1 && routes[0] === '/' ? 'the home page (`/`) only' : `these pages: ${routes.map((r) => '`' + r + '`').join(', ')}`;
  const extras = EXTRAS.filter((x) => (b.extras ?? []).includes(x.id));
  const keepsCopy = !extras.some((x) => x.id === 'copy');
  const also = extras.length
    ? `\n## Also, after the redesign\n\n${extras.map((x) => `- **${x.label}**: run Impeccable's \`${x.command}\` on the same pages. ${x.hint}`).join('\n')}\n`
    : '';
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

Use the **Impeccable** skill for all of the design work
(\`${skillCall(b.agent)}\`; load the skill before you start). ${task}

Shared layout, header, footer and global styles may change so these pages
work; leave the content of other pages alone.

Build the look so the rest of the site can inherit it. If this variant is
kept, the same style is rolled out to every other page, so put it where
those pages already read from: design tokens (CSS custom properties or the
theme config), the global stylesheet, the shared layout and the shared
components (buttons, cards, forms, nav). Avoid styles scoped only to these
pages when a shared token or component would do.
${also}
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
2. Change presentation, not behaviour. Keep every route, ${keepsCopy ? 'every piece of copy' : 'the facts in the copy (names, prices, numbers, claims)'}
   and data, every form field and handler. Markup structure, styles, tokens,
   fonts, images and motion are yours to change.
3. **Do not install packages or touch lockfiles.** Installed dependencies are
   shared with other variants. Load fonts with CSS (\`@import\`, \`@font-face\`)
   or the framework's built-in font loader; use what is already installed.
4. **Do not start, stop or restart any server.** variantly runs one dev server
   per variant and is already previewing yours; it reloads on its own.
5. **Do not commit, branch or push.** variantly commits your work for you.
6. Stay inside this working directory.
${verifyRule(b.previewUrl, b.shots)}

## As soon as you have chosen the world

Print one line that starts with \`DIRECTION:\` and names it in two to four words
(for example \`DIRECTION: Night-shift field manual\`). The person watching the
board sees it right away.

## When you are done

End your final message with one line that starts with \`SUMMARY:\` and says, in
under 30 words, what your variant is (the world, the type, the colour), so the
person choosing can tell it apart.
`;
};

/**
 * @typedef {object} ReviewInput
 * @property {number} variant
 * @property {string} [agent]
 * @property {string[]} routes
 * @property {string} [previewUrl]  set when the agent has a browser
 * @property {string} [shots]
 * @property {string} [audit]       axe-core and Lighthouse findings, as Markdown
 */

/**
 * The second pass over a finished variant: Impeccable's own critique and
 * audit, plus the machine scores, then fix what they find. A separate run
 * so the reviewer judges the result instead of defending its own choices.
 * @param {ReviewInput} r
 */
export const writeReviewBrief = (r) => {
  const call = skillCall(r.agent);
  const target = r.routes.length ? r.routes.join(', ') : 'the main pages, starting with the home page';
  return `<!-- variantly ${JSON.stringify({ review: true, variant: r.variant })} -->
# variantly review: variant ${r.variant}

This working directory holds a finished redesign (variant ${r.variant}), not yet
committed. Your job is quality control on it, not a new design. Use the
**Impeccable** skill (\`${call}\`; load it before you start).

## Task

1. Run Impeccable's **critique** on ${target}: what a senior designer would
   push back on (hierarchy, rhythm, type, colour, states, consistency).
2. Run Impeccable's **audit**: accessibility, responsiveness, performance and
   theming problems in the code.
3. ${r.audit ? 'Read the automated scores below (axe-core and Lighthouse, measured on the live variant).' : 'There are no automated scores for this variant.'}
4. Fix the most important problems you found, worst first. Every
   critical or serious accessibility violation must go.

${r.audit ? `## Automated scores

${r.audit}
` : ''}
## Rules

1. This run is **non-interactive**. Never ask a question or wait for an answer.
2. **Keep the direction.** Do not change the visual world, palette or type
   choices except where they cause a real problem (contrast, legibility).
3. Change presentation, not behaviour. Keep every route, every piece of copy
   and data, every form field and handler.
4. Do not install packages, touch lockfiles, start servers, commit or push.
5. Stay inside this working directory.
${verifyRule(r.previewUrl, r.shots).replace(/^7\./, '6.')}
7. Update DESIGN.md if a fix changes a token or rule.

## When you are done

End your final message with one line that starts with \`REVIEW:\` and says,
in under 30 words, what you found and fixed.
`;
};

/**
 * @typedef {object} RolloutInput
 * @property {number} variant
 * @property {string} [agent]
 * @property {string[]} done     the pages the variant already redesigned
 * @property {string[]} pages    the site's other pages, as far as variantly can tell
 * @property {string} appRel
 * @property {string} direction  the world the variant built, for the agent's bearings
 */

/**
 * After a variant is kept: carry its style from the pages it redesigned to
 * the rest of the site, so keeping it restyles the whole site, not one page.
 * @param {RolloutInput} r
 */
export const writeRolloutBrief = (r) => {
  const call = skillCall(r.agent);
  const list = (/** @type {string[]} */ xs) => xs.map((x) => '`' + x + '`').join(', ');
  const done = r.done.length ? r.done : ['/'];
  const where = r.appRel ? `The app lives in \`${r.appRel}/\` inside this repository.` : 'The app lives at the root of this repository.';
  const pages = r.pages.length
    ? `These are the other pages variantly found: ${list(r.pages)}. The list may be incomplete: find every page, template and view the app renders and restyle all of them.`
    : 'variantly could not list the other pages for this stack: find every page, template and view the app renders and restyle all of them.';
  return `<!-- variantly ${JSON.stringify({ rollout: true, variant: r.variant, appRel: r.appRel })} -->
# variantly rollout: variant ${r.variant}

This working directory holds the redesign the owner chose (variant ${r.variant}${r.direction ? `, ${r.direction}` : ''}).
It restyled ${list(done)}. The owner kept it, so now **the whole site** must
wear the same style. Use the **Impeccable** skill (\`${call}\`; load it before you start). ${where}

## Task

1. Read DESIGN.md and the pages already redesigned (${list(done)}). They are
   the reference: the tokens, type, colour, spacing, components and motion.
2. ${pages}
3. Apply the same visual world to every one of them, including error pages,
   empty states, forms, auth and account pages, and anything behind a layout
   the redesigned pages don't share.
4. Move one-off styles onto the shared tokens and components where you can,
   so the next page added inherits the look too.

## Rules

1. This run is **non-interactive**. Never ask a question or wait for an answer.
2. **Do not redesign.** No new direction, palette or type choices: extend the
   one that exists. Leave the already-redesigned pages as they are unless a
   shared change needs them to follow.
3. Change presentation, not behaviour. Keep every route, every piece of copy
   and data, every form field and handler.
4. Do not install packages, touch lockfiles, start servers, commit or push.
5. Stay inside this working directory.
6. Verify by reading your code; run the project's type check or linter if it is quick.
7. Update DESIGN.md if you add a token or a rule.

## When you are done

End your final message with one line that starts with \`ROLLOUT:\` and says,
in under 30 words, which pages you restyled.
`;
};

/**
 * The ROLLOUT line from the rollout pass.
 * @param {string} text
 */
export const extractRollout = (text) => {
  const last = [...text.matchAll(/ROLLOUT:\s*(.+)/g)].at(-1)?.[1]?.trim() ?? '';
  return last.replace(/[*_`]+/g, '').replace(/\\n.*$/, '').slice(0, 240);
};

/**
 * The REVIEW line from the review pass.
 * @param {string} text
 */
export const extractReview = (text) => {
  const last = [...text.matchAll(/REVIEW:\s*(.+)/g)].at(-1)?.[1]?.trim() ?? '';
  return last.replace(/[*_`]+/g, '').replace(/\\n.*$/, '').slice(0, 240);
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
 * @typedef {object} ChatBriefInput
 * @property {number} variant
 * @property {string} agent
 * @property {string} direction   what this variant became (its picked world or pinned direction)
 * @property {string} appRel
 * @property {string} message     what the owner just asked for
 * @property {{ role: 'user' | 'agent', text: string }[]} history  earlier turns, oldest first
 * @property {string} [previewUrl]
 * @property {string} [shots]
 */

/**
 * A follow-up brief from the chat: a small, focused change to a finished
 * variant, in the owner's words, with the conversation so far for context.
 * @param {ChatBriefInput} c
 */
export const writeChatBrief = (c) => {
  const meta = JSON.stringify({ variant: c.variant, appRel: c.appRel, chat: true, message: c.message.slice(0, 400) });
  const where = c.appRel ? `The app lives in \`${c.appRel}/\` inside this repository.` : 'The app lives at the root of this repository.';
  const past = c.history.length
    ? `\n## The conversation so far\n\n${c.history.map((t) => `- **${t.role === 'user' ? 'Owner' : 'You'}:** ${t.text.replace(/\s+/g, ' ').slice(0, 600)}`).join('\n')}\n`
    : '';
  const look = c.previewUrl
    ? `Check the result at ${c.previewUrl} in the browser before you finish.${shotsRule(c.shots)}`
    : 'Verify by reading your code; there is no browser here.';
  return `<!-- variantly ${meta} -->
# A change to variant ${c.variant}

You built this variant${c.direction ? ` (${c.direction})` : ''}. Its owner is looking at it and asked for a change.
${where}
${past}
## The owner asks

${c.message.trim()}

## How to work

1. Make exactly this change, in the variant's existing visual language. Keep everything else as it is.
2. Keep it small and focused. Do not start a new redesign, rename things, or touch unrelated files.
3. ${look}
4. If the request is unclear or would break the design, make the most sensible version of it and say what you assumed.
5. Finish with one or two plain sentences for the owner: what you changed, where. No headings, no lists.
`;
};

/**
 * Read the machine header back out of a brief (used by the demo agent).
 * @param {string} brief
 */
export const readBriefMeta = (brief) => {
  const m = brief.match(/<!-- variantly (\{.*?\}) -->/);
  return m ? JSON.parse(m[1]) : null;
};
