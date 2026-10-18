# Design: Liquid glass

Apple-2025-style translucent panes floating over a slowly drifting colour field: blurred, saturated glass with a bright top rim and a soft diagonal highlight that reads as refraction.

## Colour
- Field `#eef0f7` with blurred blobs peach `#ffb38a`, sky `#9ec5ff`, lilac `#c9a7ff`, mint `#9ee6c9`
- Glass `rgba(255,255,255,.52)` / raised `.72`, rim `rgba(255,255,255,.85)`
- Text `#14161c`, secondary `#3f4452`, accent blue `#1f5fd6` on pill buttons
- Dark: `#0c0e16` field, deep jewel blobs, smoked glass, accent `#7fb0ff`

## Type
- Geist 400-700, a crisp SF-like grotesk
- Headline 600, up to 88px, tracking -0.045em
- Body 17px/1.55

## Layout and components
- `.glass`: backdrop-filter blur(24px) saturate(1.7), 28px radius, inset top rim + soft drop shadow, ::before soft-light diagonal highlight
- Floating pill navbar, sticky, with a glass 'selected' segment
- Products: one wide card + two; line drawings sit in a raised inner pane
- Motion: background blobs drift slowly, off under reduced motion; buttons lift 1px on hover
- Text always sits on glass at >= .5 white so contrast holds over any blob

## Rules
- Copy, data, links and the newsletter form match the other variants; presentation only.
- Focus is always visible; body text >= 4.5:1; no horizontal scroll at 390px.
- Phone edition (phone.html/phone.css) skins the shared bands in ../phone.css and never resizes them.
