# Design: Swiss punk editorial

A new-grotesk revival of the Swiss International poster: one strict 12-column grid, everything flush-left ragged-right, black type on white with a single red, and numerals blown up until they are the layout.

## Colour
- Paper `#fff`, ink `#111`, mute `#4a4a4a`
- Red `#d40019` (hover `#b80016`) - the only colour; used for the year, the first numeral, the euro signs, the active nav square and the hero bar
- Dark: ink `#111` ground, `#f2f2f2` type, red lifted to `#ff3a46`

## Type
- Inter Tight 400/500/700/800/900 only
- Display numerals 900 at up to 300px, tracking -0.06em; headline 800, tracking -0.05em, line-height .92
- Section labels are plain 18px bold in the left 3 columns; content starts at column 4

## Layout and components
- 12-col grid with subgrid; columns 1-3 carry labels, 4-12 carry content
- Thick 6px rules top and bottom of the page, 2px rules between sections, 1px between products
- Prices are the product hero: 116px tabular numerals; drawings are heavy 5px stroke pictograms
- Single authored motion: hero numerals and headline wipe in once (clip-path), off under reduced motion

## Rules
- Copy, data, links and the newsletter form match the other variants; presentation only.
- Focus is always visible; body text >= 4.5:1; no horizontal scroll at 390px.
- Phone edition (phone.html/phone.css) skins the shared bands in ../phone.css and never resizes them.
