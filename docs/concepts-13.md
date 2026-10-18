# 13 new concepts (h–t), Winter 2026-27 re-roll

Impeccable direction roll (`concept-seed --scope direction --mode persuade`, seed:347c81f99c52957b). The owner pinned the brief, and a pinned brief beats the roll. Two parts: the Winter 2026-27 trend forecast (ten trends, with its season palette and the key line "human-made texture meets digital surrealism"), and the most popular contemporary graphic and web styles that a 2025-26 NYU, Parsons or SVA design class would study. All 13 are grounded directions. The four dealt challengers were fused, then declined: the silkscreen loft and the jet-age ticket wallet are historical, the risograph system duplicates b, and the particle-detector display is not a design style. Their disciplines are kept as named raises. Constraints: filter-free backgrounds, seamless 24s loops, a three.js scene, a letterLook material family, and Google Fonts OFL display faces.

Two v1 concepts were kept in reworked form: **h Pixel Metropolis → Dither Machine** and **j Night Cockpit → Instrument OS**. The other 11 are new.

## Families (renamed)

- **Print & Type:** b, d, e, f, o, q, r
- **Hand & Material:** a, k, p, s, t
- **Screen & Signal:** c, h, j
- **Light & Illusion:** g, i, l, m, n

## Trend coverage

- **1 Tactile imperfection:** h, k, p
- **2 Surrealism & reality distortion:** i, m
- **3 Cinematic drama:** n
- **4 Maximalist collage:** q
- **5 Retro-tech nostalgia:** h, j
- **6 Expressive typography:** k, l, o, r
- **7 Warm eclecticism / modern nostalgia:** j, s
- **8 Neo-folk & cultural craft:** p
- **9 Sensory 3D & material fantasy:** i, l, m
- **10 Quiet organic minimalism:** t
- **Human-made texture meets digital surrealism:** h, k, m, p, s, t

## h — Dither Machine  ·  Screen & Signal

*Every variant is printed through one 1-bit dither on toothy paper: two inks, a pixel grid, and tone made entirely of pattern, with a digital light sweeping across it.*

- **Trends:** 5 Retro-tech nostalgia; 1 Tactile imperfection; texture-meets-surreal
- **Texture × surreal pairing:** paper-tooth print grain + a digital light sweep through the dither
- **Origin:** reworked from v1 h Pixel Metropolis (kept the integer-grid discipline, dropped the eBoy city costume)
- **Lineage:** 1-bit / bitmap revival: Bayer and Atkinson dithering as a contemporary image language (Obra Dinn, Low-Tech Magazine's solar site, Playdate)
- **Palette light:** #efe7d6 #1b1915 #1b1915 #b5482a
- **Palette dark:** #0e0e0e #e9e2cf #e9e2cf #d0623f
- **Materials:** ordered Bayer 4x4 dither tiles; pre-baked paper tooth tile under the ink; one rust accent pixel colour
- **Type:** Silkscreen for the title (dithered fill) with contemporary Space Grotesk UI; all sizes are integer multiples of the 8px cell
- **Background:** four pre-baked Bayer threshold tiles stacked as a gradient field; a tonal light sweeps across by stepping background-position in steps(48) over 24s
- **3D title (letterLook):** dithered voxel: unlit MeshBasic with a 2-tone ordered-dither shader on lit faces, nearest-filtered
- **three.js scene:** low-poly landscape rendered through a dither ShaderMaterial (threshold per fragment); orthographic camera orbiting one full turn per 24s
- **Motion:** stepped and quantised; frames hold, then snap
- **Risk:** Reads as a retro-game filter or Mac Classic nostalgia; 1-bit text below 12px gets illegible; must stay distinct from c Amber Terminal (no green phosphor, no CRT).
- **Sources:** Lucas Pope, Return of the Obra Dinn (2018); Low-Tech Magazine solar website; Panic, Playdate console UI; Surma, 'Ditherpunk' (2021)
- **Raise (challenger-silkscreen-loft):** Variation is real: every variant swatch is the same image re-dithered with a different threshold, never decorative noise.

## i — Liquid Glass  ·  Light & Illusion

*Variants sit under one sheet of liquid glass that bends and lenses whatever is behind it; choosing is looking through.*

- **Trends:** 9 Sensory 3D & material fantasy; 2 Surrealism & reality distortion
- **Origin:** new
- **Lineage:** Apple's 2025 Liquid Glass UI (WWDC25): refractive, lensing glass controls floating over content
- **Palette light:** #eef2f6 #0b0c10 #5b8db8 #ffffff #b8c3d1
- **Palette dark:** #05070b #f2f5f9 #8fb4e6 #1b1e27 #3a3f4c
- **Materials:** refractive glass slabs with specular rims; content-coloured caustics; soft pill controls
- **Type:** Inter Tight variable for the title, Instrument Sans for UI
- **Background:** large soft colour fields (radial-gradients) drifting under glass-rim highlights drawn with conic-gradients on a closed 24s path, no backdrop-filter
- **3D title (letterLook):** glass: MeshPhysicalMaterial transmission 1, thickness 0.6, ior 1.45, light iridescence, thin specular bevel
- **three.js scene:** rounded glass capsules merging and separating over a glacial gradient plane, refracting it; 24s cycle
- **Motion:** fluid, elastic, spring-settled; glass stretches toward the pointer
- **Risk:** Becomes a dated glassmorphism card or an Apple knock-off; text on glass fails contrast fast.
- **Sources:** Apple, Liquid Glass (WWDC 2025); Apple Human Interface Guidelines, Materials (2025); Brand New coverage of the iOS 26 redesign
- **Raise (challenger-detector-display):** One physical rule everywhere: everything refracts the same way, controls included.

## j — Instrument OS  ·  Screen & Signal

*variantly as a beautiful little device: each variant is a preset on a hardware synth, dialled with knobs and read off a dot-matrix display.*

- **Trends:** 5 Retro-tech nostalgia; 7 Warm eclecticism / modern nostalgia
- **Origin:** reworked from v1 j Night Cockpit (kept honest, state-driven readouts; dropped aviation skeuomorphism)
- **Lineage:** retro-futurist hardware UI: Teenage Engineering OP-1, Nothing's dot-matrix glyph UI, Braun via Dieter Rams
- **Palette light:** #e9e6df #161514 #c4462a #9a978f #3c6e71
- **Palette dark:** #111111 #efebe3 #e0583a #3a3936 #5a9a9d
- **Materials:** matte anodised aluminium; dot-matrix LED readouts; coloured rubber knobs and keycaps
- **Type:** Doto (dot-matrix) for the title and readouts, Space Grotesk for UI
- **Background:** grid of dot-matrix cells (radial-gradient dots) with a level-meter waveform scrolling by background-position over 24s; knob ticks rotate on looped keyframes
- **3D title (letterLook):** machined: brushed-aluminium MeshStandard bodies with rust and grey rubber inset keys
- **three.js scene:** exploded-view hardware unit: knobs, keys and screen parts floating apart and reassembling on a 24s loop
- **Motion:** tactile and clicky; detents, snaps, short springs
- **Risk:** Product-render cosplay of Teenage Engineering or Nothing; knobs as UI can frustrate on touch.
- **Sources:** Teenage Engineering, OP-1 field and TP-7; Nothing, Phone glyph interface; Dieter Rams / Braun ET66; Doto typeface (Google Fonts, 2024)
- **Raise (challenger-ticket-wallet):** Every state stamps itself on the device: active preset, loading and kept are visible, nothing disappears.

## k — Ink & Stitch  ·  Hand & Material

*Every variant is a swatch-book page of torn ivory paper, brushed ink and rust running stitches, and the stitches lift off the page and hover in 3D.*

- **Trends:** 1 Tactile imperfection; 6 Expressive typography (handwritten); texture-meets-surreal
- **Texture × surreal pairing:** real hand stitching + stitches levitating off the page
- **Origin:** new
- **Lineage:** tactile imperfection: raw cotton paper, dry-brush ink and visible machine stitching, the handmade-mark revival
- **Palette light:** #f3ecdf #1d1a17 #a8432a #c9962e #7d8b86
- **Palette dark:** #15120f #efe6d6 #d0623f #d8a640 #4b5a56
- **Materials:** deckle-edged cotton paper; dry-brush ink strokes; running-stitch thread
- **Type:** Caveat Brush for the title (brushed), Newsreader for UI
- **Background:** pre-scanned paper-fibre tile under SVG brushstroke paths revealed by stroke-dashoffset, stitch dashes travelling along seams; 24s loop
- **3D title (letterLook):** thread-bound: matte paper-white MeshStandard glyphs sewn with rust TubeGeometry stitches piercing the faces
- **three.js scene:** a paper sheet with a slow vertex wave whose stitches detach, hover as floating thread loops, then re-sew; 24s
- **Motion:** hand-paced: strokes draw at uneven speed, stitches pull taut
- **Risk:** Etsy craft-fair cliche; scanned textures look fake if the repeat is visible.
- **Sources:** It's Nice That, handmade-mark trend coverage (2025); Kenya Hara / Nippon Design Center paper work; Pentagram hand-lettered identities; Winter 2026-27 tactile-imperfection forecast
- **Raise (challenger-silkscreen-loft):** Imperfection is editioned: each variant gets its own stitch path, never random jitter.

## l — Inflated Chrome  ·  Light & Illusion

*The word is a balloon of liquid chrome: puffy, warped letters reflecting an acid-green wireframe world, with tiny technical captions.*

- **Trends:** 6 Expressive typography; 9 Sensory 3D & material fantasy
- **Origin:** new (absorbs the contemporary-list acid / chrome-type style)
- **Lineage:** inflated and liquid-chrome display type from the acid-graphics and Y2K poster revival
- **Palette light:** #e6e6e6 #0a0a0a #c6ff00 #9b9b9b #8fb4e6
- **Palette dark:** #050505 #eaeaea #c6ff00 #4a4a4a #8fb4e6
- **Materials:** inflated liquid chrome; acid-green vector wireframes; micro technical captions
- **Type:** Syne ExtraBold for the title (inflated in 3D), Major Mono Display for captions
- **Background:** perspective wireframe grid (repeating-linear-gradient on a rotateX plane) scrolling toward the viewer, starburst glints rotating; 24s loop
- **3D title (letterLook):** chrome: MeshStandard metalness 1, roughness 0.05, mirrored environment, inflated (pillowed) extrusions
- **three.js scene:** the pillowed chrome wordmark and floating starbursts orbiting over a green wireframe terrain
- **Motion:** bouncy inflation, glints on a 120bpm grid
- **Risk:** Cheap 2000s screensaver chrome; overlaps g Candy 3D if it goes candy-coloured (it stays mirror-silver only).
- **Sources:** Acid Graphics (Are.na / Instagram movement); Hassan Rahim / 12:01 Studio chrome work; Warp Records reissue sleeves; Brand New, chrome/inflated type trend notes
- **Raise (challenger-detector-display):** Captions carry real data (port, variant count, build ms) like a detector printout.

## m — Uncanny Mirror  ·  Light & Illusion

*A cold dream room: a rough plaster wordmark stands on an endless mirror floor, and its reflection shows a different variant than the object.*

- **Trends:** 2 Surrealism & reality distortion; 9 Sensory 3D & material fantasy; texture-meets-surreal
- **Texture × surreal pairing:** rough plaster object + a lying digital reflection
- **Origin:** new
- **Lineage:** surrealism and reality distortion: Magritte reread through Erik Johansson and Alex Prager, impossible scale and dreamlike light
- **Palette light:** #e7ecf1 #1f2229 #6f8fb8 #a7a9b4 #7a63b8
- **Palette dark:** #0d0f14 #e3e8ef #8fb4e6 #3c3f4a #9a82e0
- **Materials:** chalky plaster; glacial mirror floor; violet dream haze (gradient, no blur)
- **Type:** Italiana for the title, Manrope for UI
- **Background:** horizon split: sky gradient above, mirrored duplicate below with shifted hue; a giant moon disc slides along the horizon on a 24s loop
- **3D title (letterLook):** plaster cast: rough matte white MeshStandard with hairline cracks; the Reflector copy is recoloured as another variant
- **three.js scene:** oversized plaster letters and a tiny doorway on a Reflector floor; the reflection runs a beat out of sync
- **Motion:** slow and dreamlike; object and reflection slightly out of time
- **Risk:** Surreal stock-art cliche (floating rocks, desert doors); the trick reads as a bug if it isn't clearly intentional.
- **Sources:** Erik Johansson, photo-surrealism; Alex Prager, staged film stills; René Magritte, La reproduction interdite (1937); Winter 2026-27 surrealism forecast
- **Raise (challenger-detector-display):** Break one physical rule only: reflections lie, everything else obeys.

## n — Noir Velvet  ·  Light & Illusion

*variantly as an opening title: one spotlight on oxblood velvet, venetian-blind shadows sweeping across a high-contrast Didone wordmark.*

- **Trends:** 3 Cinematic drama
- **Origin:** new
- **Lineage:** cinematic drama: film-noir shadow, theatrical spotlight and velvet, as in A24 titles and Saul Bass sequences
- **Palette light:** #efe7dc #140d0c #6e1420 #c79a5b #3a2e2b
- **Palette dark:** #080506 #f1e6d8 #9b1c2c #d4a96a #231a19
- **Materials:** crushed velvet; hard spotlight pool; venetian-blind shadow bars
- **Type:** Bodoni Moda for the title, Cormorant Garamond small caps for credits
- **Background:** velvet fold gradients with a radial spotlight pool and diagonal blind-shadow bars sweeping across on a 24s loop; pre-baked film-grain tile
- **3D title (letterLook):** velvet lacquer: MeshPhysical sheen 1 with oxblood sheenColor and a gold rim bevel
- **three.js scene:** a curtain opening on a stage, one shadow-mapped SpotLight casting blind shadows across the title
- **Motion:** slow, theatrical curtain timing; one dramatic cut per change
- **Risk:** Hollywood cliche, too dark; red-on-black text can fail contrast.
- **Sources:** A24 film title design; Saul Bass title sequences; The Third Man (1949) cinematography; Winter 2026-27 cinematic-drama forecast
- **Raise (own):** Light is the layout: only the spotlit area holds readable text.

## o — Swiss Punk  ·  Print & Type

*A typographic poster that won't sit still: one enormous grotesk word, a visible hard grid, and oxblood rules cutting across it.*

- **Trends:** 6 Expressive typography; contemporary list: Swiss punk / new grotesk
- **Origin:** new
- **Lineage:** Swiss punk / new grotesk editorial: Weingart's broken grid reread by Experimental Jetset, Studio Dumbar and Order
- **Palette light:** #f1eee8 #151412 #8c1c13 #bdb8ae
- **Palette dark:** #0d0d0c #f1eee8 #c0392b #3a3835
- **Materials:** oversized grotesk set solid; cutting rules; visible modular grid
- **Type:** Archivo (variable width/weight) for the title at poster scale, IBM Plex Mono for captions
- **Background:** hairline 12-column grid with red bars sliding across columns and giant cropped numerals translating on a 24s loop
- **3D title (letterLook):** enamel sign: flat matte oxblood and black MeshStandard with crisp chamfers
- **three.js scene:** monumental extruded letters rotating as slabs on a grid floor, cropping each other
- **Motion:** abrupt, sliding, editorial cuts
- **Risk:** A design-student homage poster; the broken grid hurts dense reading. Distinct from e Bauhaus (geometry, primaries) by being type-only.
- **Sources:** Experimental Jetset, Stedelijk Museum identity; Studio Dumbar, Dutch identities; Order (NYC), editorial systems; Wolfgang Weingart, Typography (2000)
- **Raise (challenger-silkscreen-loft):** Grid density courage: show the grid lines, never hide the structure.

## p — Tenango Thread  ·  Hand & Material

*Variants as embroidered panels: flat single-colour animals and flowers in dense satin stitch on white cotton, credited to the craft, with threads that drift as if weightless.*

- **Trends:** 8 Neo-folk & cultural craft; 1 Tactile imperfection; texture-meets-surreal
- **Texture × surreal pairing:** real satin stitch + threads floating weightless
- **Origin:** new
- **Lineage:** neo-folk and cultural craft: Tenango embroidery by Otomí (Hñähñu) artisans of Tenango de Doria, Hidalgo, Mexico
- **Palette light:** #fbf8f2 #1d1b1a #c2263a #1b8a7f #e08a3c
- **Palette dark:** #14110f #f6f1e8 #ef476f #2ec4b6 #ffb563
- **Materials:** satin-stitch thread fields; white cotton manta; one colour per motif
- **Type:** Grandstander for the title (stitched outline), Work Sans for UI
- **Background:** symmetric motif panel from SVG stitch-direction hatching; motifs breathe and a thread line runs round the border, 24s loop
- **3D title (letterLook):** embroidered: MeshStandard with anisotropic thread normal map, glossy satin
- **three.js scene:** an embroidered cloth panel whose birds and deer gently lift off and settle back, loose threads swaying in zero gravity
- **Motion:** gentle, folkloric, small sway
- **Risk:** Appropriation or generic 'Mexican' decoration; it must credit Tenango de Doria artisans by name, use real motif grammar and avoid pastiche.
- **Sources:** Tenango de Doria embroidery cooperatives, Hidalgo; Museo de Arte Popular, Mexico City; Carla Fernández, design with Mexican artisans; It's Nice That, neo-folk coverage (2025)
- **Raise (challenger-ticket-wallet):** Provenance on the surface: a credit line names the craft origin and stays visible.

## q — Sticker Bomb  ·  Print & Type

*Variants arrive as stickers slapped on one device lid: holographic, die-cut, overlapping, yet the wordmark stays clear on a clean white sticker.*

- **Trends:** 4 Maximalist collage
- **Origin:** new
- **Lineage:** digital maximalism: sticker-bombed laptop lids and Gen-Z brand identities, clashing patterns kept readable
- **Palette light:** #f7f7f2 #111111 #ff3ea5 #00c2ff #c4f000
- **Palette dark:** #121212 #fafafa #ff3ea5 #00c2ff #c4f000
- **Materials:** vinyl die-cut stickers with white kiss-cut borders; holographic foil; clashing checker and flame patterns
- **Type:** Rubik Mono One for the title sticker, Bricolage Grotesque for UI
- **Background:** dense sticker tiles (CSS shapes and gradients) on brushed aluminium, a few peeling and re-sticking on a 24s loop
- **3D title (letterLook):** vinyl: glossy MeshPhysical clearcoat, iridescence on holo stickers, white border extrusions
- **three.js scene:** a laptop lid where stickers drop in, slap flat with a bounce, and one peels its corner; 24s
- **Motion:** slap, bounce, peel
- **Risk:** Chaos with no hierarchy. Differs from f Cut & Paste by being glossy digital vinyl on a device, not paper collage.
- **Sources:** MSCHF drops and packaging; Collins, Spotify Wrapped maximalism; Sticker culture (Redbubble, laptop lids); Winter 2026-27 maximalist-collage forecast
- **Raise (own):** One clean zone: the title sticker and CTA are never overlapped.

## r — Kinetic Type  ·  Print & Type

*The wordmark is the whole show: 'variantly' stretches, compresses and morphs through its axes, one shape per variant.*

- **Trends:** 6 Expressive typography; contemporary list: kinetic / variable type
- **Origin:** new
- **Lineage:** kinetic and variable typography: type as motion, from DIA Studio to variable-font identities
- **Palette light:** #efece6 #0f0f0f #3c6e71 #8c1c13
- **Palette dark:** #0b0b0b #efece6 #5a9a9d #c0392b
- **Materials:** variable-width letterforms; type-on-path and tiled type; flat ink and two signal colours
- **Type:** Anybody (variable width 50-150, weight 100-900) for display, Fragment Mono for UI
- **Background:** rows of the word sliding in alternating directions, font-variation-settings animated through wdth and wght on a 24s loop
- **3D title (letterLook):** elastic letter: flat MeshStandard with morph targets between condensed and expanded extrusions
- **three.js scene:** a ribbon of extruded type wrapped round a rotating cylinder, letters stretching as they pass the front
- **Motion:** rhythmic, typographic, beat-synced
- **Risk:** A motion-reel gimmick that makes reading impossible; heavy variable animation can jank on low-end devices.
- **Sources:** DIA Studio (Mitch Paone) kinetic identities; Pentagram / Order variable-type identities; Google Fonts Knowledge, variable fonts; SVA MFA Design motion-type coursework
- **Raise (challenger-silkscreen-loft):** One subject in many editions: the same word reshaped per variant, never new imagery.

## s — Lived-in Den  ·  Hand & Material

*A warm listening room: walnut shelves of objects from different decades, an amber lamp, the variants as records you slide out, and one object quietly floating.*

- **Trends:** 7 Warm eclecticism / modern nostalgia; texture-meets-surreal
- **Texture × surreal pairing:** real wood grain + one object hovering against gravity
- **Origin:** new
- **Lineage:** warm eclecticism / modern nostalgia: walnut, mixed-era objects and amber lamps, as in record-bar and hospitality interiors
- **Palette light:** #f4ead9 #2a1d15 #a0522d #5b8a86 #d9a441
- **Palette dark:** #1a120c #f2e4cc #c8693a #6fa39e #e6b450
- **Materials:** oiled walnut grain; amber lamplight; boucle and brass
- **Type:** Fraunces (soft, wonky axis) for the title, DM Sans for UI
- **Background:** wood-grain gradient bands with an amber glow pool; record sleeves slide along a shelf by translateX, 24s loop
- **3D title (letterLook):** walnut: MeshStandard wood map with clearcoat and brass inlay edges
- **three.js scene:** a shelf vignette (lamp, records, plant, vintage phone) where one object levitates slightly while the lamp light breathes
- **Motion:** unhurried, warm, slide-and-settle
- **Risk:** Pinterest mid-century cliche; too cosy for a developer tool.
- **Sources:** Studio Ashby interiors; Japanese listening bars (JBS Tokyo); Kinfolk magazine; Winter 2026-27 warm-eclecticism forecast
- **Raise (own):** Mixed eras, one light: everything is lit by the same amber source.

## t — Stone & Linen  ·  Hand & Material

*Almost nothing: a linen field, one soft stone silhouette and the word, with a window shadow drifting across as if the sun is moving.*

- **Trends:** 10 Quiet organic minimalism; texture-meets-surreal
- **Texture × surreal pairing:** linen and stone + an impossible floating pebble
- **Origin:** new
- **Lineage:** quiet organic minimalism: natural materials, soft silhouettes and negative space (Aesop, Studio Mumbai, Japandi)
- **Palette light:** #efe9df #2b2824 #7d8f86 #b9a48a #d8d1c4
- **Palette dark:** #171512 #ece5d8 #9aaa9b #7e6c58 #2a2622
- **Materials:** washed linen weave; honed limestone; soft window light
- **Type:** Cormorant for the title (light weight), Karla for UI
- **Background:** linen weave tile with a large soft window-shadow shape moving across the page and one pebble silhouette; 24s loop
- **3D title (letterLook):** honed stone: rough MeshStandard limestone with soft micro-normals
- **three.js scene:** pebbles on a linen plane under a slowly turning light that casts a window shadow; one pebble floats a few millimetres up
- **Motion:** barely moving; only the light travels
- **Risk:** Reads as empty or an Aesop knock-off; too little for a tool that sells variety.
- **Sources:** Aesop store design; Studio Mumbai; Kinfolk / Japandi interiors; Winter 2026-27 quiet-organic forecast
- **Raise (own):** Negative space is measured: two-thirds of the viewport stays empty around the wordmark.

## Switcher at 20

Twenty concepts overflow the 7-chip row, so the switcher becomes a two-level picker grouped into four renamed families that fit the Winter 2026-27 set better than the v1 ones: Print & Type: b, d, e, f, o, q, r; Hand & Material: a, k, p, s, t; Screen & Signal: c, h, j; Light & Illusion: g, i, l, m, n. Desktop: a compact trigger (current swatch, letter, name) opens a 4-column popover, one family per column; each tile is a 3-colour chip plus the name set in that concept's display face. Keyboard order stays a to t with roving arrow focus and [ / ] stepping through all 20 without opening the grid. Mobile: bottom sheet with family tabs over a snap-scroll strip of large tiles and 44px prev/next. Persist the choice, deep-link with ?v=<id>, and include a 'shuffle' tile.

## v1 roll, superseded

The first roll (seed:1c22451124ce250d) leaned historical and craft-based. This roll replaces it: Pixel Metropolis, Data Sublime, Night Cockpit, Tension Rig, Event Horizon, Cyanotype Plan, Delft Tile, Herbarium Sheet, Urushi Lacquer, Transit Wayfinding, Stained Glass, Survey Contour, Terrazzo Floor.
