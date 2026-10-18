# Homepage concepts

Each homepage concept ("a fresh look") is one folder, `concepts/<id>/`. A
concept agent works **only inside its own folder**: no shared file needs to
change to add, replace or restyle a concept. All 20 ids (a–t) are already
registered. h–t are placeholders, scaffolded from
`.impeccable/decision/concepts-13.json`, waiting for their real design, and
marked `status: 'draft'` so visitors never see them (see **Drafts** below).

```
concepts/
  types.ts        the contract (ConceptMeta, ConceptScene, ConceptLook, ...)
  metas.ts        server-safe list: CONCEPTS, CONCEPT_IDS, CONCEPT_BY_ID, ConceptId
  index.ts        registry: CONCEPT_LOADERS (lazy), prefetchConcept, conceptAt
  families.ts     switcher column order (FAMILIES) and groupByFamily()
  styles.ts       imports every concept.css (loaded with the page, no flash)
  <id>/
    meta.ts       name, family, swatch, tile font, grain
    concept.css   every [data-variant='<id>'] rule: tokens + page styling
    Backdrop.tsx  the 2D background composition (default export)
    scene.ts      the three.js backdrop scene (export const scene)
    look.ts       the 3D title's materials and cast shadow (export const look)
```

## Replace a placeholder (h–t)

Edit or overwrite the five files in `concepts/<id>/`. Keep each file's export
name and type. Nothing else changes.

1. **`meta.ts`**: `export const meta: ConceptMeta`.
   - `id`: the folder's letter, unchanged.
   - `name`: the switcher label.
   - `family`: one of `FAMILIES` in `families.ts` (Print & Type, Hand & Material,
     Screen & Signal, Light & Illusion). The switcher groups by it. An unknown
     family still shows, as an extra column at the end.
   - `swatch`: `{ light: [c1, c2, c3], dark: [c1, c2, c3] }`, the three colours
     on the switcher tile and dock chip.
   - `font`: CSS `font-family` for the tile name, e.g. `var(--font-clay)`. Use a
     face the layout already loads (`--font-*` vars in `lib/introFonts.ts` and
     `app/layout.tsx`); a name it does not load falls back to the next entry.
   - `grain`: strength (0–0.5) of the film grain GlField puts on the scene's
     shapes: 0 none, 0.2 clearly grainy, 0.4 heavy print grain. Optional
     `grainChroma` (0–1, default 0.35) is its share of colour noise. The 2D
     art's grain is `--art-grain` (0–1) and the page surfaces' grain is
     `--grain-tile` (`var(--grain-soft|mid|strong)` or `none`), both set in
     `concept.css`; see "Grainy gradients" in `app/globals.css`.
   - `status`: `'draft'` while the concept is being built; delete the line
     (or set `'live'`) when it is finished. See **Drafts**.
     **No text around the title.** Nothing is written above or below the 3D
     word: no captions, credits, labels, figure numbers or readouts in the
     title card or the backdrop art around it. Credits belong in the source
     (a comment in `Backdrop.tsx`), not on the page.
2. **`concept.css`**: every rule starts with `:root[data-variant='<id>']`
   (theme: add `[data-theme='dark']`). It must set the page tokens in **both
   themes**:
   `--panel --surface --rule --steel --ink --alert --alert-hover --on-alert`,
   `--hero-bg --hero-ink --hero-mute --hero-line --hero-box --hero-face --title --hero-alpha`,
   `--board-*` (bg raised line mute text deep ok), `--flap-bg --flap-ink`,
   `--blob-o`, and the backdrop art colours `--art-1 --art-2 --art-3` (plus any
   `--art-*` your Backdrop uses). Then style the page through the existing hooks
   (`.vy-title`, `.vy-letter`, `#hero-title`, `[data-hero-title]`,
   `[data-hero-grid]`, `[data-hero-side]`, `main > div h2`,
   `main > div .bg-surface`, `.flap-cell`, `.vy-loadbar*`). See `a`–`g`.
   Concept rules load **after** `app/globals.css`, so at equal specificity they
   win over shared rules; the shared nested-card reset
   (`main > div .bg-surface .bg-surface`) is the one to leave alone.
3. **`Backdrop.tsx`**: a default-exported component, no props. Compose with
   `Piece` from `@/components/backdrop/artKit` (an SVG in a 100×100 box placed
   with Tailwind classes; `float={0|1|2}` picks a drift path) or your own
   absolutely placed elements and CSS classes from `concept.css`. Colours come
   from `--art-*` tokens, never literals, so the light/dark switch is pure CSS.
4. **`scene.ts`**: `export const scene: ConceptScene = { colors: { light, dark }, build }`.
   `build(threeScene, colors)` adds objects and returns
   `{ camera, update(t, px) }`; `t` is seconds (seekable: same `t` = same
   frame), `px` is unused parallax (0). Helpers: `persp`, `NOISE` in
   `@/components/backdrop/sceneKit`. The host (`components/backdrop/GlField.tsx`)
   owns the renderer, sizing, disposal and the frame budget.
5. **`look.ts`**: `export const look: ConceptLook = { pool, shadow }`.
   `pool(ink, dark, phone)` returns up to six `LetterLook`s (the first three
   are what phones get, so keep those cheap); colour each from `ink.face` /
   `ink.side` (the 2D letter's CSS colour and text-shadow) using `shader`,
   `both`, `plain`, `patch` from `@/lib/lookKit` or three's materials.
   `shadow(dark)` returns `{ color, opacity, radius, dir }` for the shadow the
   letters cast. The API Letters3D uses (`lib/letterLook.ts`) stays the same.

To regenerate a placeholder from the JSON: `node scripts/scaffold-concept.mjs <id> --force`
(`--meta` rewrites only `meta.ts` and `concept.css`).

## Drafts

A concept whose `meta.ts` has `status: 'draft'` is hidden from visitors: it is
left out of the switcher (dock count, picker, families), `[` / `]`, shuffle,
"a fresh look", and a saved pick of it falls back to `a`. Finished concepts
omit `status` (or say `'live'`). To review drafts on the homepage:

- **`?v=<id>`** (e.g. `/?v=h`) opens that one concept directly, draft or not.
  The dock shows it with a `draft` count; stepping from it moves into the
  live list.
- **`?drafts=1`** lists every concept, drafts included (tagged _Draft_ in the
  picker), for the rest of the browser session. **`?drafts=0`** ends it.

The boot script (`lib/variantBoot.ts`) records the flag as `html[data-drafts]`
before first paint; `shownIds()` / `shownConcepts()` in `metas.ts` give the
list in effect. To ship a concept, remove its `status: 'draft'` line in the
same PR that finishes it.

## Add a 21st concept

Run the scaffold (or copy a folder), then list the id once in `metas.ts` (the
import, `ConceptId` and `CONCEPTS`), `index.ts` (`CONCEPT_LOADERS`), `posters.ts`
and `styles.ts`. Those four lines are the only shared edits, and only for a new
id.

## Rules

- **Filter-free backgrounds.** No CSS/SVG `filter`, `backdrop-filter`,
  `mix-blend-mode` or `mask-image` on large or moving layers. Plain shapes,
  gradients and patterns, rasterised once.
- **Seamless 24s loops.** Every keyframe set starts and ends on the same state
  (`0%, 100% { ... }`) and every period divides 24s (24, 12, 8, 6 ...), so the
  whole composition returns to its exact start. The 0% pose is the poster frame:
  it is what calm mode, the low perf tier and seek renders show, so make it a
  good still.
- **Transform and opacity only** in animations. Each moving element is its own
  small layer; never animate a full-viewport SVG.
- **Light and dark.** Both themes are designed, through tokens.
- **Calm / seek / perf.** You get these for free when you animate with CSS
  inside the backdrop and keep `t`-driven scenes: reduced motion and
  `html[data-calm]` load no scene and stop CSS loops; `html[data-seek]`
  (seekreel, `?t=`) freezes; `html[data-perf='low']` and the concept-swap wipe
  (`html[data-swapping]`) pause every `.vy-backdrop` animation; on touch screens
  only `.vy-art-float-0` keeps drifting. Do not add your own rAF loops or
  listeners outside `scene.update`.
- **Perf budget.** Only the active concept's scene and look are downloaded
  (lazy imports; the switcher prefetches on hover/focus); live concepts'
  Backdrops are server HTML. Keep each
  `Backdrop.tsx` under ~6 kB, a scene under ~100k triangles at 24fps (it renders
  one still frame on phones), and look shaders free of per-frame allocation.
  `concept.css` loads for everyone, so keep it lean (a–g are 2–4 kB each).
- **No shared-file edits.** If something seems to need one, add a hook in your
  own `concept.css` instead, or ask for a new shared hook.

## How it runs

- `lib/variantBoot.ts` sets `html[data-variant]` in `<head>` from `?v=`, the
  saved pick, else `a`, before first paint (plus `html[data-drafts]` and a
  remembered `html[data-perf='low']`); every `concept.css` is already loaded,
  so there is no flash. Client chrome (backdrop, switcher dock) renders from
  that attribute (`useConcept()` in `lib/variant.ts`), not the store, so its
  first frame already shows the right concept.
- `components/backdrop/BackdropPoster.tsx` server-renders every live
  concept's `Backdrop.tsx` (via `posters.ts`) into the page HTML; CSS shows the
  one `html[data-variant]` names, so the shapes paint with the first frame and
  a swap restyles them instantly. Keep `Backdrop.tsx` server-renderable (no
  hooks or browser APIs while rendering) and lean: every live concept's art
  ships in the HTML.
- `components/backdrop/Backdrop.tsx` renders `GlField` (and a previewed
  draft's `Backdrop.tsx`, lazily): the scene, lazy, one still frame on
  phones / calm / low tier; ~24fps otherwise, paused while scrolled, hidden,
  swapping or while the title dispatches `vy:gl-busy`. Each scene's canvas
  fades in after its first draw, and on a concept or theme change the old
  scene stays under the new one until it has faded in.
- `lib/letterLook.ts` loads the active `look.ts` and serves `lookPool` /
  `letterShadow` to the 3D title.
- `lib/perfTier.ts` publishes `html[data-perf]` (`?perf=low|high` overrides;
  otherwise rAF sampling: a 30fps cap such as iOS Low Power Mode, or slow
  frames, means low) and a `vy:perf` event.
- `lib/variant.ts`: `setVariant(id)` prefetches the concept, then swaps (a view
  transition wipe on desktop, a short hero crossfade on touch / low tier), and
  writes `?v=`. `stepVariant`, `shuffleVariant` serve the switcher, `[` / `]`
  and "a fresh look".

## The Lens and the doorway swap

The hero's **Lens** (`components/Lens.tsx`) is a doorway that follows the
cursor and shows the hero in another concept; a click keeps it. Every concept
switch (the switcher, `[` / `]`, shuffle, "a fresh look", the Lens) opens the
same doorway: `setVariant(id, { origin })` (`lib/lensSwap.ts`).

Your concept works in the Lens with no extra code, as long as it follows the
rules above:

- **Scoping hook.** The Lens renders your hero inside a shadow root whose
  stylesheet is the page's, copied once, with every `:root` (and `html` type
  selector) rewritten to `.vy-lens-root`, an element that carries your id as
  `data-variant` plus the page's other html attributes (theme, perf, motion)
  (`lib/lensScope.ts`). So key everything on `:root[data-variant='x']`, as
  now. Do not style the hero from `body`, from JS-set inline styles on
  `<html>`, or with `@font-face` / `@property` declared only in concept.css
  (those stay document-level, which the shadow root still sees).
- **What shows inside the door.** Your page ground (`--panel`), your
  `Backdrop.tsx` laid over the viewport, your title card (`[data-hero-title]`)
  and 2D word (`.vy-title`, `.vy-letter`). On desktop at the high tier the
  title's canvas also draws your `look.ts` letters and your `scene.ts` (at
  the backdrop's ~0.55x resolution) through the door; phones and the low tier
  show the 2D hero only. Keep the 0% pose of your art a good still: it is
  what phones see in the door.
- **Typefaces.** The Lens gives each concept its own per-letter faces, picked
  from those that morph cleanly from the page's (`lensFace` in
  `lib/lens3d.ts`, stable per id).
- **Glitch.** `lib/lensGlitch.ts` (`glitchIntensity(id)`) is stronger for
  Screen & Signal concepts, gentler for Hand & Material. `?glitch=0` turns it
  off; calm and seek renders never glitch.
- **Off switches.** `?lens=0` hides the Lens; `?t=` seek renders never show it.
