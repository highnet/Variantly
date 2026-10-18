# DESIGN: Surreal distortion: the long room

Oak & Iron, Winter 2026 run, variant 2 of 10. Static HTML/CSS; fonts from Google Fonts; all art is inline SVG or CSS. phone.html/phone.css skin the shared phone bands in the same world.

## World
A familiar showroom made uncanny: an arched window into a violet dusk room with a moon, a glowing door, a floor that keeps going and a table with impossibly long legs. Products sit on a horizon with mirrored reflections; each is stretched, elongated or skewed. Feature panels are arches of different heights.

## Type
- Instrument Serif for display, set very large, with stretched (scaleX/scaleY) moments in the logo and numbers.
- Manrope for body and UI.

## Colour
Charcoal night #15151d, panel #242234, icy blue #bfe3f5, silver #d9dde6, violet #9a83f0. Default dark; a light theme ("glacial day") is provided under data-theme=light. Body text is plain and high contrast so the strangeness lives in the art, not the reading.

## The digital effect
The headline is reflected in the floor beneath it: a flipped, blurred, masked copy (CSS attr()), plus -webkit-box-reflect on product drawings.

## Accessibility
Body text meets 4.5:1; visible focus-visible outlines; nav, header, main and footer landmarks; no horizontal scroll at 390px; motion respects prefers-reduced-motion.
