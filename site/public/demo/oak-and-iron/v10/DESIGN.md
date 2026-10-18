# Design: Aura gradient

Wellness-brand calm: a soft mesh of peach, sage and lavender aura gradients under a fine film grain, an oversized airy serif set against a quiet sans, lots of air.

## Colour
- Ground `#f6efe9`; aura peach `#f7c6a9`, sage `#c8d7c1`, lavender `#d9c6ef`, sand `#f3dcc0`
- Text plum-ink `#2b2230`, secondary `#584c5c`, hairlines `rgba(43,34,48,.16)`
- Dark: `#1a1520` ground with deep rose/forest/violet auras

## Type
- Instrument Serif for display (up to 120px, italic for 'made by hand.'), headings, product names and prices
- Instrument Sans 400-600 for body and controls

## Layout and components
- Fixed aura layer of four radial gradients that breathes slowly; SVG feTurbulence grain overlay
- Centered hero, generous section padding, hairline section rules
- Products on veiled cards with 32px radius; each drawing sits on its own mini aura
- Buttons: plum pill primary, outlined pill secondary
- Motion: one slow breathing aura, off under reduced motion

## Rules
- Copy, data, links and the newsletter form match the other variants; presentation only.
- Focus is always visible; body text >= 4.5:1; no horizontal scroll at 390px.
- Phone edition (phone.html/phone.css) skins the shared bands in ../phone.css and never resizes them.
