---
version: 1
slug: "site-app-page-tsx"
primary_target: "site/app/page.tsx"
related_targets: ["site/components"]
---

# Surface brief: variantly.tools homepage (site/app/page.tsx)

Scope: the homepage of variantly.tools, with the "I'm a human" / "I'm an agent"
fork. Visitor mode: Persuade (human view); the agent view is a Read-mode
quickstart. Inherits the Gate Board world from DESIGN.md (no new identity).

Audience and job: developers with a site that looks generic who use an agent
CLI; agents sent to find out how to run variantly. In seconds a human should
know what variantly does (N whole-page redesigns, live, keep one), see it, and
leave with `npx variantly`. An agent should leave with the exact commands and
the rule never to choose for the user.

Proof and content: real demo-agent output on the Oak & Iron example
(site/public/demo/oak-and-iron/v0–v6, labelled as crude demo-agent output, no
AI); real CLI commands; the real stack list. No testimonials, counts,
benchmarks or invented timings.

Constraints: Next.js 16 + Tailwind v4 + shadcn-style CVA Button/Typography
(site/AGENTS.md conventions); tokens from DESIGN.md; works without JS for
reading; keyboard-operable slider and fork; WCAG 2.2 AA.

## Direction contract

THESIS: The page cycles itself. A split-flap headline names a direction while the before/after beneath swaps to that redesign in sync, so the first viewport shows six whole-page redesigns of one site without a click; it refuses the feature-section landing page and the tour of the app's screens (the check-in desk was built and rejected).

OWN-WORLD: The Gate Board world from DESIGN.md: panel ground, white surfaces, slate dock, ink, one alert yellow for change and the single primary action, Martian Mono condensed figures and labels, system sans prose. Stack and agent logos in one ink colour.

STORY: The visitor reads "Oak & Iron, as EDITORIAL" flip to SWISS, WARM, TECHNICAL while the right side of a large, real before/after keeps changing; they grab the divider or press 1–6 and the cycle stops; they see each variant was made by Claude Code with Impeccable from variantly's own brief (linked); then a three-step how-it-works strip, the stacks and agents as logos, and the install.

FIRST VIEWPORT: Header strip with wordmark, the human/agent fork, GitHub. One line of flap headline across the top ("Oak & Iron, as" + the flapping direction word). Under it, 70% of the viewport height, the before/after with a refined grip and pane tags; directly beneath, the slate dock: 01–06 cells with the active direction name, a "Read the brief" link and the install chip; the yellow is the install's copy action only.

FORM: Flip Headline, dealt structure 3 of my re-rolled list (seed 5dded72f, reroll 1), chosen by the user over Compare Is the Hero and Diptych Spreads. Signature interaction: the split-flap word flips character by character in sync with the right pane cross-fading to the next variant every ~5s; any pointer, key or drag hands control to the visitor and the cycle stops for good. Motion: that one cycle; everything else static.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
