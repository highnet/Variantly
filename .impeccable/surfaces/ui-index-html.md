---
version: 1
slug: "ui-index-html"
primary_target: "ui/index.html"
related_targets: ["ui/app.js","ui/app.css"]
---

# Surface brief: the variantly local app (ui/)

Scope: the app `npx variantly` opens on localhost: check-in (wizard), the
generation board, the comparison view with 1…N picker and before/after slider,
and the kept-variant result. Visitor mode: Operate.

Audience and job: a developer with a generic-looking site and an agent CLI,
deciding between whole-page redesigns in one sitting. Task: configure in about
30 seconds, watch N agents work with legible progress and cost, compare
variants against the original, keep one.

Constraints: the user's site must dominate the comparison view; variantly's
chrome is nearly invisible there. Avoid: generic SaaS dashboard, heavy setup,
opaque waiting, playful costume. Fully keyboard-operable; WCAG 2.2 AA. Works
offline (no CDN fonts): fonts ship in ui/fonts.

## Direction contract

THESIS: Variants depart like flights. The run is a live departures board that reranks in place as agents work, and a change holds its alert until you've seen it; the category default it refuses is a dashboard of cards with spinners.

OWN-WORLD: Travel-document surfaces. Panel #E6E8EB and surface #FFFFFF with ink #0D0D10, slate #1C2127, steel #6B7178; one alert yellow #FFD400 reserved for change and the single primary action. Martian Mono (condensed width) for labels, figures and the board; system UI sans for prose. Segmented pass panels with labelled fields, perforation rules, tabular figures, black solid buttons, scan-block texture as the only ornament.

STORY: Check in on one segmented pass (FROM app, VIA agent, TO direction, SEATS count), every field prefilled by detection, so it reads before it asks. Then the board: rows depart as variants finish, each status cell flips, and a changed row stays lit until seen. Then compare: your site full-bleed, a hairline divider with a BEFORE/AFTER tab, and the board shrunk to one strip of numbered cells at the bottom edge. Keeping a variant issues a pass: its number, direction, files changed, branch, next steps.

FIRST VIEWPORT: Check-in. Left two-thirds: one boarding-pass panel, four labelled segments in a 2×2 grid at every width (four-in-a-row left each value about 130px, too narrow for a large figure), each a large condensed value on two reserved lines (e.g. NEXT.JS / CLAUDE / REDESIGN / 04) with its editable detail beneath; a perforated stub on the right edge holding the summary and the one yellow "Generate 4 variants" action. Right third: the departures board, empty rows pre-printed V01…V04 with status SCHEDULED, so the result of checking in is visible before it starts.

FORM: Gate Board (vernacular-ephemera-boarding-pass-and-gate-board), a dealt challenger chosen by the user over the assigned Cupping Table (position 7 on my list); seed key 23d5b20b. Signature interaction: split-flap status cells that flip on change and hold yellow until seen; rows rerank with preserved identity (FLIP). Raises kept from declined challengers: chrome stays monochrome so the sites are the only colour (Datamatics); strict registration of path and scroll between panes (Botanical Folio); the active strip cell lifts while the rest dim (Streaming wall); size carries hierarchy, the active variant number is the only large figure in compare mode (Star atlas).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Website (site/) is a separate Persuade surface in the same world; its own brief comes later.
