# Oak & Iron: Pixel item shop

The bitmap revival seen in current brand identities: the shop as a game item shop, with a 16-colour palette, pixel display type and ordered 1-bit dither for shading.

## Colour
Exactly the 16 PICO-8 values (`--c0`..`--c15`), and nothing else. The ground is navy #1d2b53, panels are black, frames are grey #c2c3c7, headings are yellow #ffec27, prices are green #00e436, the primary button is orange #ffa300 and badges are red, orange or green. A light theme swaps to peach #ffccaa with cream panels.

## Type
- Display and controls: Press Start 2P (headings, buttons, badges, labels).
- Body: Pixelify Sans at 1.2rem, so the copy stays readable.

## Texture
A 2x2 ordered dither checker, made with `conic-gradient` on a 4px tile, shades the hero, the sprite wells and the footer edge. The pixel art is SVG built from rects with `shape-rendering: crispEdges`.

## Components
- Panels: a 4px stepped frame with an 8px hard drop shadow. The hard shadow is earned by this world.
- Buttons: bevelled with an inset highlight and shade; they press in on :active.
- Inventory: a 3-up grid of item slots, followed by dashed empty slots.
- Focus: a 4px yellow outline. The blinking cursor respects reduced-motion.
