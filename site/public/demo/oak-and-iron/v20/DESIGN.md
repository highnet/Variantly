# Oak & Iron: Terminal shop

The store is one shell session: prompt lines in amber, phosphor-green output and box-drawn panels. Readability comes first. Body text is JetBrains Mono at 16px with ligatures off; display text is VT323.

## Colour
- Ground `#0a0f0b` with faint scanlines, panel `#0f1711`, rules `#2f6a43`
- Text `#b8f5c8`, bright `#54ff8e`, muted `#8fc9a0` (all ≥ 7:1)
- Amber `#ffb84d`: prompts, labels, prices and focus rings (dashed)
- `data-theme="light"` gives a paper printout: dark green on `#f1f4ec`, amber darkened to `#8a4d00`

## Components
- Nav items as `[Home]`; the active or hovered item is shown in reverse video
- Each section head is preceded by an `oak@iron:~$ cat` prompt (CSS generated, so the copy is unchanged)
- README box (double rule with an inset title) around the intro; products in double-ruled panels with a dashed title bar
- Buttons are solid green blocks with a `>` prefix and turn amber on hover
- A blinking block cursor follows the H1 and stops under reduced motion

## Layout
A single 1080px column with dashed separators between sections; it collapses to one column under 760px.
