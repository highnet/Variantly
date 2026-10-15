---
name: variantly
description: Whole-page redesign variants, live. Gate Board: travel-document passes on a light ground, a slate departures board, one alert yellow.
colors:
  ink: "#0d0d10"
  slate: "#1c2127"
  slate-raised: "#262c33"
  slate-line: "#353c45"
  steel: "#5f656c"
  steel-on-slate: "#a9b0b8"
  rule: "#c7cbd0"
  panel: "#e6e8eb"
  surface: "#ffffff"
  alert: "#ffd400"
  alert-hover: "#ffe14d"
  alert-wash: "#fff6c2"
  fail: "#b3261e"
  fail-on-slate: "#ff8a80"
  fail-wash: "#fbe3e1"
  log-ink: "#d5dae0"
typography:
  display:
    fontFamily: "Martian Mono, ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "clamp(32px, 8cqi, 64px)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
    fontVariation: "'wdth' 75"
  display-issued:
    fontFamily: "Martian Mono, ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "clamp(64px, 9vw, 120px)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
    fontVariation: "'wdth' 75"
  headline:
    fontFamily: "Martian Mono, ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "clamp(28px, 3vw, 40px)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 75"
  title:
    fontFamily: "Martian Mono, ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 75"
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  data:
    fontFamily: "Martian Mono, ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "tnum"
    fontVariation: "'wdth' 87.5"
  label:
    fontFamily: "Martian Mono, ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "10.5px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.08em"
    fontVariation: "'wdth' 87.5"
  button:
    fontFamily: "Martian Mono, ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 87.5"
rounded:
  flap: "3px"
  keycap: "4px"
  control: "6px"
  pass: "10px"
  dock: "12px"
spacing:
  hair: "8px"
  board-inset: "18px"
  pass-inset: "22px"
  page: "24px"
components:
  button-primary:
    backgroundColor: "{colors.alert}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.alert-hover}"
  button-primary-big:
    backgroundColor: "{colors.alert}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 22px"
    height: "52px"
  button-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "40px"
  button-solid-hover:
    backgroundColor: "{colors.slate-raised}"
  button-outline:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "40px"
  button-outline-hover:
    backgroundColor: "{colors.surface}"
  button-ghost:
    textColor: "{colors.steel}"
    rounded: "{rounded.control}"
    padding: "6px 10px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.data}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
    height: "40px"
  pass:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pass}"
  pass-segment:
    backgroundColor: "{colors.surface}"
    padding: "18px 22px 20px"
  pass-segment-open:
    backgroundColor: "{colors.panel}"
  board:
    backgroundColor: "{colors.slate}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pass}"
  status-cell:
    backgroundColor: "{colors.slate-raised}"
    textColor: "{colors.surface}"
    rounded: "{rounded.flap}"
    padding: "5px 7px"
  status-cell-ready:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  status-cell-unseen:
    backgroundColor: "{colors.alert}"
    textColor: "{colors.ink}"
  dock:
    backgroundColor: "{colors.slate}"
    textColor: "{colors.surface}"
    rounded: "{rounded.dock}"
    padding: "6px"
  dock-cell:
    backgroundColor: "{colors.slate-raised}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 8px"
    height: "36px"
    width: "46px"
  dock-cell-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    width: "62px"
  tag:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.flap}"
    padding: "4px 6px"
---

# Design System: variantly

## Overview

**Creative North Star: "The Gate Board"**

Variants depart like flights. The system is built from two travel materials and nothing else: white boarding passes cut into labelled segments, lying on a cool grey counter, and a slate departures board whose status cells flip as agents work. A change stays lit in alert yellow until it has been seen. The vernacular is airport ephemera (perforations, stubs, tabular figures, a barcode block), never a dashboard of cards with spinners.

The chrome is monochrome so that the sites being compared are the only colour on screen. Hierarchy is carried by size rather than weight or hue: a few large condensed mono figures (the segment values, the variant number) against small tracked uppercase labels and plain system-sans prose. Density is moderate and documentary; every value has a label above it, the way a pass has field names.

These tokens also govern the marketing site (site/, Next.js + Tailwind v4). Every frontmatter colour key carries 1:1 into `@theme` as `--color-<key>`, the two stacks as `--font-mono` / `--font-sans`, and the radii as `--radius-<key>`; the material rules below are what keep the site in the same world, not the token names.

**Key Characteristics:**
- Two materials: white pass on grey panel (light, documentary) and slate board (dark, live).
- One alert yellow, rationed to change, the single primary action, and focus on slate.
- Martian Mono, condensed (wdth 75) for figures, semi-condensed (wdth 87.5) for labels and data; system sans for prose only.
- Split-flap status cells and a barcode scan block are the only ornaments.
- Soft, low shadows that lift whole objects; no outlines-as-decoration, no gradients.

## Colors

A cool monochrome of ink, slate and steel on grey and white, with one high-visibility yellow that means "look here".

### Primary
- **Gate Yellow** (alert): the single primary action per view (Generate, Compare, Keep, Start a new run), the unseen state of a status cell, the unseen pip on a dock cell, the dock's mark, text selection, and the focus ring on slate. Its brighter hover (alert-hover) and pale wash (alert-wash, for advisory notes) are its only variants.

### Neutral
- **Ticket Ink** (ink): all text on light surfaces, solid buttons, the open-segment underline, log panels, the compare divider, BEFORE/AFTER tags, toasts.
- **Board Slate** (slate): the departures board, the dock, the info drawer, waiting cards. Everything live sits on slate.
- **Raised Slate** (slate-raised): unflipped status cells, inactive dock cells, hovered or expanded board rows, hover on solid and slate-outline buttons.
- **Slate Seam** (slate-line): row rules and header rules inside slate objects, the dock separator.
- **Steel** (steel): labels and secondary text on light surfaces (darkened from the contract's #6B7178 to clear 5.6:1 on panel).
- **Steel on Slate** (steel-on-slate): labels, metadata and muted status text on slate (7.4:1).
- **Perforation Grey** (rule): every 1px rule on light surfaces, the dashed stub and remarks perforations, input borders.
- **Counter Grey** (panel): the page ground, the open segment, drawers, the stub notches, neutral notes and tags.
- **Pass White** (surface): pass panels, inputs, option tickets, the ready status cell, the active dock cell.
- **Log Ink** (log-ink): monospace log output on ink and slate.

### Failure
- **Fail Red** (fail) on light, **Fail on Slate** (fail-on-slate) on the board, **Fail Wash** (fail-wash) behind failure tags and notes. Failure is a state colour, never decoration.

### Named Rules
**The One Yellow Rule.** Yellow means change or go. Use it only for the one primary action in a view, for unseen changes, and for focus on slate; never for decoration, headings, borders or a second button.

**The Sites Are the Colour Rule.** Chrome stays ink, slate, steel, grey and white. Anything that is not the user's site and not Gate Yellow or a failure state carries no hue.

## Typography

**Display Font:** Martian Mono (variable, self-hosted woff2, weight 100–800, width 75–112.5%), with ui-monospace, Cascadia Mono, Consolas
**Body Font:** system-ui, with -apple-system, Segoe UI, Roboto
**Label/Mono Font:** Martian Mono at semi-condensed width

**Character:** A condensed mono that reads like printed flight data, set against the reader's own system sans for anything that is a sentence. Mono is for things you scan; sans is for things you read.

### Hierarchy
- **Display** (700, clamp(32px, 8cqi, 64px), 0.95, uppercase, wdth 75, tabular): the four segment values on the pass (NEXT.JS / CLAUDE / REDESIGN / 04), sized to the pass container, two lines reserved so all values share a baseline. Drops to clamp(26px, 8cqi, 40px) when the pass is under 540px. The stepper figure uses the same face at 64px.
- **Display Issued** (700, clamp(64px, 9vw, 120px)): the kept variant's number on the issued pass. The largest type in the system.
- **Headline** (700, clamp(28px, 3vw, 40px)): the board view title ("04 variants").
- **Title** (700, 22px; 18px on board heads): pass and board headings. Variant numbers in board rows are 22px (18px on phones).
- **Body** (400, 15px, 1.5): prose, hints (13px, max 70ch), board summaries (13px, max 62ch), the brief textarea.
- **Data** (500, 13px, 1.4, wdth 87.5, tabular): field values, inputs, branch and hash readouts, stub values (600, 14px).
- **Label** (500, 10.5px, 0.08em, uppercase, wdth 87.5): every field name and column head, steel on light and steel-on-slate on the board.
- **Button** (700, 12px, 0.06em, uppercase, wdth 87.5): buttons, segmented toggles (11px), status cells (11px).

### Named Rules
**The Size Not Weight Rule.** Hierarchy comes from scale. Large figures are condensed 700; everything else stays small. In compare, the active variant number in the dock (24px) is the only large figure in the chrome.

**The Mono Scans, Sans Reads Rule.** Anything a person reads as a sentence is system sans; anything they scan, compare or copy (values, numbers, paths, statuses) is Martian Mono with tabular figures.

## Layout

Pages sit on the Counter Grey ground with a 48px top bar (hidden in compare). Content is capped at 1500px and centred with 24px padding (16px under 860px).

- **Check-in:** a two-column grid, pass at 2.3fr and the board at minmax(320px, 1fr), 20px gap; stacks to one column under 1100px. Inside the pass, the main body takes the remaining width and the stub is a fixed 270px column; under 860px the stub moves below with a horizontal perforation.
- **Pass segments:** a 2×2 grid by default; when the pass's main body is at least 1000px wide (container query) the four segments sit in one row. Accepted by the user on 2026-10-15 after the finish review: four-in-a-row at normal widths leaves each value too narrow for a large figure.
- **Board view:** the board fills the 1500px column; on phones Time, Files and Latest columns drop and cell padding tightens to 12px.
- **Compare:** the site is full-bleed (100vh). Chrome floats: BEFORE/AFTER tags 12px from the top corners, the dock centred 14px from the bottom, the summary flag 74px from the bottom, the info drawer pinned top-right at 380px. Under 640px the dock spans edge to edge (8px insets) and wraps, cells first, sharing the full width.
- **Rhythm:** 8px between related items, 14–18px inside slate objects, 22px inside passes, 24px page gutters.

## Elevation & Depth

Depth is objects lying on a counter: a pass, a board, a card sits slightly above the ground with one soft compound shadow. Nothing inside an object is elevated except a lifted dock cell. Tonal layering does the rest (slate, raised slate, ink for nested log panels).

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 1px 1px rgb(13 13 16 / 0.06), 0 8px 24px -12px rgb(13 13 16 / 0.28)`): passes, boards, waiting cards, the info drawer, help, toasts.
- **Dock float** (`box-shadow: 0 1px 0 rgb(255 255 255 / 0.06) inset, 0 18px 40px -14px rgb(13 13 16 / 0.65)`): the dock over the user's site.
- **Flag float** (`box-shadow: 0 10px 30px -12px rgb(13 13 16 / 0.5)`): the summary flag above the dock.
- **Active cell** (`box-shadow: 0 8px 16px -8px rgb(0 0 0 / 0.7)` with translateY(-3px)): the current dock cell.

### Named Rules
**The Objects Lift, Content Doesn't Rule.** Shadows belong to whole physical objects (pass, board, dock, flag). Rows, segments, fields and buttons stay flat and change by tone.

## Shapes

Gently rounded rectangles throughout: 10px for passes and slate objects, 12px for the dock, 6px for controls and cells, 4px for keycaps and inline code, 3px for status flaps and tags. Rules are 1px solid on light (rule) and on slate (slate-line). Perforations are dashed: 2px dashed between the pass body and its stub, 1px dashed above the remarks. The stub carries two 20px circular notches cut from the counter colour at the perforation's ends. The scan block is a 34px barcode built from a repeating ink gradient at 0.85 opacity.

**The Perforation Rule.** A dashed line means "tear here": it only separates a pass from its stub or its remarks. Section breaks elsewhere are solid hairlines.

## Components

### Buttons
Solid, uppercase, a little industrial.
- **Shape:** gently rounded (6px), 40px tall; big 52px; small 30px; 36px in the dock.
- **Primary:** Gate Yellow with ink text, one per view; hover brightens to alert-hover.
- **Solid:** ink with white text; hover to raised slate.
- **Outline:** transparent with ink border; hover fills white. On slate (board, dock) the text turns white, the border steel-on-slate, and hover fills raised slate.
- **Ghost:** borderless steel label text (11px, 0.08em); hover shows a rule border and ink text.
- **Active / Disabled:** press nudges down 1px; disabled is 40% opacity.
- **Icons:** 16px inline SVG strokes (1.6 stroke, round caps), never glyphs.

### Pass (signature)
The check-in and the issued result are the same object: a white pass with a header (title, check-in label, branch and base readouts), labelled segments, an optional drawer in Counter Grey, a dashed remarks row, and a stub holding the summary list, the one primary action, a one-line cost statement, and the scan block. A segment is a button: label, display figure, two-line clamped detail; hover tints to #f5f6f7; open turns Counter Grey with a 3px ink bar along its bottom edge.

### Departures Board (signature)
A slate table. Column heads are labels; rows hold the variant number (22px figure), the direction in data caps with a sans summary beneath, a status cell, time, files and the latest log line in steel-on-slate. Rows rerank in place with FLIP (520ms, the system ease) preserving identity. Expanding a row reveals an ink log panel with Log Ink text and slate-outline actions.

### Split-flap Status Cell (signature)
An 11ch flap in raised slate, 11px button type, with a 1px seam across its middle (dark at 0.3 on unflipped states, 0.12 on light ones) that never strikes through the text. Ready flips to white with ink text; failed uses fail-on-slate text; scheduled and cancelled use steel-on-slate. On change the text rotates through the seam (420ms). A finished change holds Gate Yellow until hovered or seen. Working adds three pulsing 3px bars.

### Dock (signature)
The board shrunk to one strip for compare: slate, 12px radius, mark in yellow, numbered cells, a separator, the mode switch (an ink well of 34×32 icon buttons), the path field, and the primary Keep action. Cells are 46px, 55% opacity; the current cell lifts 3px, turns white, grows to 24px type and 62px wide while the rest stay dim. A 6px pip marks unseen (yellow), failed (fail-on-slate) or working (pulsing steel). While the user scrolls their site the dock tucks to 0.14 opacity and returns on hover or focus.

### Inputs / Fields
- **Style:** white, 1px rule border, 6px radius, 40px min height, data type; the textarea uses body sans.
- **Hover / Focus:** border to steel on hover; focus is an ink border plus a 1px ink ring. On slate, the path field focuses to a yellow border.
- **Options as tickets:** white tickets with a rule border; checked gains an ink border and inset ink ring.
- **Segmented toggle:** ink-bordered strip, pressed segment fills ink.

### Chips / Tags
Small 10px label-type flaps (3px radius) in Counter Grey; ok fills ink; bad uses Fail Wash with fail text. In compare, BEFORE/AFTER tags are ink with a soft shadow and fade while tucked.

### Navigation
A 48px Counter Grey bar with a rule beneath: wordmark (barcode mark plus condensed 15px uppercase name), the project path in steel data type behind a rule, an ink phase chip, and a ghost "Keys" toggle opening a white help card with keycap kbd elements.

## Do's and Don'ts

### Do:
- **Do** keep Gate Yellow to the one primary action per view, unseen changes, and focus on slate.
- **Do** put a label above every value, the way a pass names its fields.
- **Do** set figures in condensed Martian Mono 700 with tabular numerals, and set sentences in system sans.
- **Do** use the slate material for anything live (board, dock, logs, waiting) and the white pass for anything you fill in or are issued.
- **Do** flip a status cell on change and hold it yellow until seen; rerank rows in place without losing their identity.
- **Do** use 2px ink focus rings on light surfaces and Gate Yellow rings on slate; respect prefers-reduced-motion by removing all animation.
- **Do** ship the font locally; the app must work offline.

### Don't:
- **Don't** introduce a second accent or tint the chrome; the sites being compared are the only colour.
- **Don't** render progress as cards with spinners; progress is a board row and a flipping cell.
- **Don't** use dashed lines anywhere except a pass's tear lines.
- **Don't** shadow rows, segments, fields or buttons; only whole objects lift.
- **Don't** let compare chrome compete with the site: one large figure (the active cell), everything else small and tuckable.
- **Don't** use text glyphs as icons; icons are inline SVG strokes.
