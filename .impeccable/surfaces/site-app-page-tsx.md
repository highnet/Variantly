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

THESIS: Scrolling is travelling. The page is the app's own journey in four counters (check-in, board, compare, keep), each a working miniature of the real tool, so the visitor has used variantly before they install it; it refuses the feature-grid landing page with a screenshot hero.

OWN-WORLD: The Gate Board world as recorded in DESIGN.md: panel ground, white passes, slate board, ink, one alert yellow for change and the one primary action per screen, Martian Mono condensed figures and labels, system sans prose, perforated stubs and the scan barcode.

STORY: The visitor reads one plain promise, then checks in Oak & Iron on a real pass (FROM static HTML, VIA Claude, TO redesign, 04 variants), presses the yellow Generate, watches the board flip rows to READY with the demo run's real summaries, drags the before/after across real variants with the 1…N dock, and is issued a kept pass whose stub carries the install command, then the honest fine print: agents, stacks, cost, what it is not.

FIRST VIEWPORT: Header strip: wordmark left, the human/agent fork as two tabs centre, GitHub right. Left 7/12: headline as a gate-display figure "N redesigns. Keep one." with one lead sentence and the install command chip; right 5/12 begins counter 1, the check-in pass for Oak & Iron, its stub's yellow "Generate 4 variants" the only yellow on screen.

FORM: Check-in Desk, dealt structure 6 of my ordered list (seed key 5dded72f), locked by the user over Terminal + Board (the roll's lead) and Departures Hall. Signature interaction: pressing Generate on the pass scrolls to the board, which flips its rows SCHEDULED → WORKING → READY in order (split-flap, held yellow until hovered), then the compare counter's dock lights up. Motion: one orchestrated run sequence, nothing else animates.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
