# 13 new concepts (h–t)

Impeccable direction roll (`concept-seed --scope direction --mode persuade`, seed:1c22451124ce250d). Five dealt challengers were fused into concepts h–l. The torn-flyer challenger was declined because it duplicates f Cut & Paste (kept: concepts already viewed persist as a record). m–t are grounded directions. Each was raised by a donor (lines below). Constraints: filter-free backgrounds, seamless 24s loops, a three.js scene, a letterLook material family. Previously dropped: Synth Sunset (not re-proposed).

## h — Pixel Metropolis

*Every variant is a building in one crisp isometric pixel city; the site is a block you can zoom into.*

- **Lineage:** eBoy pixoramas: isometric RGB pixel cities on one hard grid
- **Palette light:** #f4f1e8 #16161d #ff2e4c #1fb6ff #ffd23f
- **Palette dark:** #0d0d1a #f4f1e8 #ff2e4c #1fb6ff #7cff4f
- **Materials:** integer-scaled pixel blocks, zero anti-aliasing; deliberate 2-colour dithering; isometric 2:1 tile grid
- **Type:** Silkscreen for UI labels, Pixelify Sans for the title; title built as stacked isometric pixel blocks
- **Background:** isometric tile field (repeating-linear-gradient diamonds) with pixel cars sliding along 2:1 streets in steps(); 24s loop = one street length
- **3D title (letterLook):** voxel bricks: flat-shaded MeshLambert cubes per letter-pixel, no smoothing, primary RGB faces
- **three.js scene:** InstancedMesh voxel city block under an orthographic iso camera; cranes and blinking windows stepping on a 24s cycle
- **Motion:** stepped, frame-quantised (steps(n)), never eased; zoom in whole multiples
- **Risk:** Turns into retro-game nostalgia costume ('level up' copy) instead of a city grammar; pixel text is unreadable below 12px.
- **Raise (challenger-datamatics):** Only integer scales and one grid unit for everything, chrome included; no half pixels.
- **Raise (own):** One hidden joke per block at deeper zoom, never in body copy.

## i — Data Sublime

*Variants as frequencies: a strobing field of hairline bars where the design is the signal and everything else is data.*

- **Lineage:** Ryoji Ikeda datamatics: barcode fields, sine lattices, pure black and white
- **Palette light:** #ffffff #000000 #000000 #ffffff
- **Palette dark:** #000000 #ffffff #ffffff #000000
- **Materials:** hairline barcode bars; monospace numerics at data density; full-frame inversion
- **Type:** Space Mono / JetBrains Mono only; title as a barcode wordmark: 'variantly' above its own bar encoding
- **Background:** vertical repeating-linear-gradient bar fields at three widths drifting at coprime speeds whose LCM is 24s; one SVG sine path scrolling via stroke-dashoffset
- **3D title (letterLook):** binary: unlit MeshBasic pure white/black faces with hairline EdgesGeometry, no shading
- **three.js scene:** LineSegments lattice forming a sine surface plus a point-cloud barcode wall; rare 1-frame invert
- **Motion:** strobe and snap; 1-frame cuts, otherwise dead still
- **Risk:** Collapses into TVA Terminal if any colour creeps in; strobing must respect reduced-motion and stay under 3 flashes/s.
- **Raise (challenger-instruments):** Every number on screen is a real value (variant count, port, ms), never decorative noise.

## j — Night Cockpit

*Your variants are six instruments you trust through cloud; one glowing needle tells you which to keep.*

- **Lineage:** the six-pack of a light aircraft at night: luminous gauges in a black panel
- **Palette light:** #e9e6df #1d1f22 #ff8a1f #9fd8c9 #5a5f66
- **Palette dark:** #07090b #d9f7ee #ff8a1f #3fe0b5 #2a2f35
- **Materials:** matte black crackle panel; radium-lume numerals; brushed bezels with screw heads
- **Type:** B612 / B612 Mono (cockpit faces) for UI, title in Saira Stencil One with lume fill
- **Background:** grid of circular gauge faces (conic-gradient tick rings) with needles on 24s looped keyframes; attitude ball tilting
- **3D title (letterLook):** lume and bezel: emissive mint numerals on satin black MeshStandard body with a thin metallic bevel
- **three.js scene:** attitude-indicator sphere (sky/ground halves) gently banking inside a ring of tick marks
- **Motion:** damped, overshooting needles (spring); slow banking
- **Risk:** Skeuomorphic dashboard cliche that reads as a fake analytics panel.
- **Raise (challenger-tensegrity):** Each needle is honest: it points at real state (current variant, load progress).

## k — Tension Rig

*Opposed forces held in balance: the page is a rigid structure that visibly breathes, the way variants pull against the original.*

- **Lineage:** Kenneth Snelson tensegrity: carbon rods held by red cord
- **Palette light:** #efeeea #141414 #e02a1b #8a8a86
- **Palette dark:** #121212 #ededea #ff3b2a #4a4a48
- **Materials:** matte carbon rods; taut red cord; machined aluminium end caps
- **Type:** Big Shoulders Display for the title (letters as rods with cord crossings), Archivo Narrow for UI
- **Background:** SVG rods and red cords forming a tensegrity prism, nodes moving on a closed 24s breathing path
- **3D title (letterLook):** strut and cord: anodised black metal rods with red TubeGeometry wrapped between glyph nodes
- **three.js scene:** 3-strut tensegrity column (CylinderGeometry + red TubeGeometry) that inhales and lengthens on a sine
- **Motion:** slow inhale/exhale, tension-held; nothing ever falls
- **Risk:** Reads as a generic architecture-firm diagram; red on grey can look corporate.
- **Raise (challenger-pixel):** One structural unit (rod length) scales all spacing, the way the pixel does.

## l — Event Horizon

*Choosing is a threshold: variants orbit a dark centre and the one you keep crosses the horizon.*

- **Lineage:** accretion-disk imagery (EHT image, Interstellar's Gargantua)
- **Palette light:** #f6efe4 #1a120b #ff9a3c #b33a1a #ffe2b0
- **Palette dark:** #000000 #ffe7c4 #ff9a3c #c2410c #3b1d0b
- **Materials:** incandescent plasma rings; lensed photon ring; absolute black void
- **Type:** Unbounded for the title, warped around the ring on a curved text path; Syne for UI
- **Background:** concentric conic + radial gradient rings rotating at differing speeds (24s LCM) around a pure black disc, with a skewed duplicate ring for the lensed arc
- **3D title (letterLook):** plasma: emissive orange-gold MeshPhysical with sheen, fading to black at glyph cores
- **three.js scene:** RingGeometry disk with additive orbiting particles around a black sphere, top arc tilted for lensing
- **Motion:** slow orbit, time-dilated: outer rings fast, inner slow
- **Risk:** Space wallpaper; the glow drifts into AI-startup purple-orange cliche.
- **Raise (challenger-datamatics):** Total commitment to black: the void is true #000 and takes real area.

## m — Cyanotype Plan

*Each variant is a sun-printed plan of your page: white line on Prussian blue, exposed, washed and pinned.*

- **Lineage:** sun-printed cyanotypes and architects' diazo blueprints
- **Palette light:** #e8eef3 #0f2c5c #1d4e9e #f7f4ea #c58b2a
- **Palette dark:** #0b2149 #e8f0fb #7fb2ff #13306a #e0b25a
- **Materials:** Prussian-blue cotton rag; white chalk linework; brass drafting pins
- **Type:** Rubik Mono One for the title with construction lines and dimension arrows; IBM Plex Mono for labels
- **Background:** drafting grid (repeating-linear-gradient) with dimension lines drawing on via stroke-dashoffset and a T-square sweep; 24s
- **3D title (letterLook):** blueprint enamel: deep blue matte with white emissive edge lines (wireframe overlay)
- **three.js scene:** white wireframe architectural massing (EdgesGeometry) slowly orbiting in blue fog
- **Motion:** drafted: lines draw, then hold; measured easing
- **Risk:** Generic 'blueprint' tech trope; white-on-blue body copy is tiring to read.
- **Raise (challenger-instruments):** Annotations are real: dimensions label actual layout widths.

## n — Delft Tile

*Variants as hand-painted tiles: a wall of cobalt-on-white squares, each telling one version of the story.*

- **Lineage:** Delftware tin-glaze tiles and Portuguese azulejos
- **Palette light:** #f7f5ef #1b2a6b #2f4fb5 #d9dde9 #a26b2c
- **Palette dark:** #0e1530 #eef1fb #6f8ff0 #1e2a5c #c8955a
- **Materials:** crackled tin glaze; cobalt brushwork; grout lines
- **Type:** Fraunces (soft, wonky) for the title in brushed cobalt with corner-ornament frames; Cormorant for UI
- **Background:** tile grid whose corner ornaments (radial-gradient quarter circles) join into continuous motifs; a tile-flip wave crosses the wall in 24s
- **3D title (letterLook):** glazed ceramic: clearcoat white MeshPhysical with a cobalt-painted face map and slight wobble normals
- **three.js scene:** curved wall of tiles flipping in a travelling wave
- **Motion:** gentle, rhythmic tile flips
- **Risk:** Souvenir-shop kitsch; drifts toward Soft Clay if the glaze is too soft.
- **Raise (challenger-pixel):** The tile is the only grid unit; everything snaps to it.

## o — Herbarium Sheet

*Each variant is a pressed specimen taped to acid-free card with its label: collected, named, compared.*

- **Lineage:** Victorian herbarium sheets: pressed specimens, gummed tape, archival labels
- **Palette light:** #f1ece0 #2b2a22 #5c7a3a #b5523b #d8cfb8
- **Palette dark:** #1a1c16 #ece6d6 #9cbf6e #e07a5f #33362b
- **Materials:** acid-free cotton card; gummed linen tape; foxing spots; pressed leaf silhouettes
- **Type:** Playfair Display italic for the title with a typed accession label in Courier Prime
- **Background:** pressed-leaf silhouettes (clip-path shapes) swaying slightly, tape strips, and a slow light sweep across the card; 24s
- **3D title (letterLook):** pressed paper: rough MeshStandard card with leaf-vein relief and taped corners
- **three.js scene:** a few flat leaf planes drifting and turning as if under a lifting glass
- **Motion:** quiet, slow drift; long holds
- **Risk:** Wedding-stationery / cottagecore costume; may be too quiet for a tool site.
- **Raise (challenger-datamatics):** Labels carry real fields (variant id, date, model) in strict tabular form.

## p — Urushi Lacquer

*Deep layered black and vermilion lacquer: the variant you keep is polished until it reflects you.*

- **Lineage:** Japanese urushi lacquerware with maki-e gold
- **Palette light:** #f3ede4 #1a0f0c #b4231a #c9a24a #3b1a14
- **Palette dark:** #0a0606 #f2e6d4 #d0352a #d8b25a #2a1210
- **Materials:** mirror-polished black lacquer; vermilion layer showing through wear; sprinkled gold maki-e
- **Type:** Shippori Mincho B1 for the title with a gold-dust stroke; Zen Kaku Gothic New for UI
- **Background:** layered vermilion/black bands with a slow specular streak (linear-gradient sweep) and drifting gold flecks; 24s
- **3D title (letterLook):** lacquer: MeshPhysical clearcoat 1, roughness 0.05, black and vermilion, gold flake sparkle
- **three.js scene:** a lacquer bowl reflecting an environment map, with a slow highlight orbit
- **Motion:** slow, weighty, reflective glints
- **Risk:** Orientalist pastiche; must avoid fake-Japanese copy and stay led by the material.
- **Raise (challenger-tensegrity):** Restraint of means: two colours plus gold, nothing else.

## q — Transit Wayfinding

*Every variant is a line on one map; you ride to a station and keep the stop you like.*

- **Lineage:** Vignelli's NYC subway diagram and Kinneir/Calvert station signage
- **Palette light:** #ffffff #111111 #ee352e #0039a6 #00933c #fccc0a
- **Palette dark:** #121314 #f5f5f5 #ff4b42 #4a7dff #22c55e #fccc0a
- **Materials:** enamel signage panels; route bullets; 45-degree line geometry
- **Type:** Overpass (Highway Gothic heir) for the title on a black sign band with coloured route bullets; Inter Tight for UI
- **Background:** 45/90-degree coloured lines (SVG paths) with train dots running along them via offset-path; 24s round trip
- **3D title (letterLook):** enamel sign: glossy painted steel, white vinyl-cut letters, coloured disc bullets
- **three.js scene:** 3D tube map: coloured TubeGeometry lines with small cars moving along the curves
- **Motion:** punctual, linear, constant speed
- **Risk:** Overlaps Bauhaus primaries; a generic 'map metaphor'.
- **Raise (challenger-instruments):** Stations are real: each stop is an actual variant or step.

## r — Stained Glass

*Variants as panes in one window; light passes through the one you choose.*

- **Lineage:** Gothic and Tiffany leaded glass
- **Palette light:** #f5f1ea #1b1a1f #1f5fbf #c0262d #e6a81b #2e8b57
- **Palette dark:** #0c0b10 #efeaf7 #4f8ff0 #ff4a52 #ffc23a #3fbf7f
- **Materials:** leaded came lines; seeded cathedral glass; sunlight caustics
- **Type:** Cinzel Decorative for the title as leaded glyphs (thick black came around jewel fills); Alegreya for UI
- **Background:** field of clip-path polygon panes; a light band sweeps across, changing pane brightness; 24s
- **3D title (letterLook):** glass: MeshPhysical transmission 0.9 with thickness, jewel tints and a black came outline
- **three.js scene:** rotating rose-window disc of transparent coloured shards with a moving light
- **Motion:** slow luminous sweep, like the sun moving
- **Risk:** Ecclesiastical heaviness; transmission materials cost a lot of GPU.
- **Raise (challenger-pixel):** Came lines share one stroke width everywhere, UI borders included.

## s — Survey Contour

*Variants as terrain: contour lines show how far each one climbs from the original.*

- **Lineage:** Ordnance Survey / USGS topographic maps
- **Palette light:** #f4efe2 #2a2620 #b0602c #3a7d5c #4f86b8
- **Palette dark:** #13161a #ebe4d2 #e08a4f #5fbf8a #7fb0e0
- **Materials:** map paper; brown contour ink; hachures and spot heights
- **Type:** Barlow Condensed for the title as raised terrain with contours following the letterforms; Spectral for text
- **Background:** nested contour rings (repeating-radial-gradient) offset into hills, with a survey line and pin marching across; 24s
- **3D title (letterLook):** terraced relief: one extruded layer per contour, sand-to-green banding
- **three.js scene:** PlaneGeometry heightfield with contour-line shading in a slow flyover
- **Motion:** steady drift, a surveyor's patience
- **Risk:** Generic hiking app; contour noise can muddy text contrast.
- **Raise (challenger-datamatics):** Spot heights are true numbers (e.g. diff size per variant).

## t — Terrazzo Floor

*Variants as chips set in one poured floor; polishing reveals the composition.*

- **Lineage:** Venetian terrazzo and Memphis-era terrazzo laminates
- **Palette light:** #f2ede6 #2a2422 #e2725b #5b8c85 #f0b84a #9aa6c9
- **Palette dark:** #1c1a19 #efe9e1 #ff8a70 #7fbfb6 #ffc95e #aab6dd
- **Materials:** polished cementitious matrix; marble and glass chips; brass divider strips
- **Type:** Bricolage Grotesque for the title with a chip-flecked fill; DM Serif Display for accents
- **Background:** scattered clip-path chips drifting in place, plus a polish highlight sweep; 24s
- **3D title (letterLook):** polished stone: MeshPhysical roughness 0.25 matrix with embedded chip colours
- **three.js scene:** instanced flat chips tumbling slowly above a polished plane
- **Motion:** settled, slow, slightly playful
- **Risk:** Instagram-cafe decor; overlaps Candy 3D's playfulness.
- **Raise (challenger-tensegrity):** Brass strips impose structure: a strict division grid under the play.

## Switcher at 20

Twenty swatches overflow the current row of 7 chips, so the switcher should become a two-level picker grouped into families (Print & Paper: b, d, f, m, o; Material & Craft: a, n, p, r, t; Screen & Signal: c, h, i, j; Structure & Space: e, k, l, q, s; plus g). On desktop: a compact trigger showing the current concept's swatch, letter and name. It opens a popover grid, 4-5 columns with one family per column. Each tile is a 3-colour chip plus the name in that concept's own display face, so you preview the world before you click. Keep keyboard order a to t, roving arrow-key focus, and [ / ] (and the existing shortcuts) to step through all 20 without opening the grid. On mobile: the trigger becomes a bottom sheet with a horizontal snap-scroll strip of large tiles under family tabs, plus prev/next buttons at 44px or more. Persist the choice, deep-link with ?v=<id>, and offer a 'shuffle' tile so 20 concepts read as abundance, not a long menu.
