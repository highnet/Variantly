# LinkedIn post: noisy gradient balls

Attach `infographic.png` (1080×1350, portrait, rendered at 2x).

---

How we made the grainy, "printed" 3D balls on variantly.style 🎨

People keep asking. It's not a texture or an image. It's a smooth WebGL sphere plus one post-processing pass. Here's the recipe:

1️⃣ Shade a blob
An icosphere in three.js with a custom ShaderMaterial. 3D value noise pushes each vertex out along its normal, so it wobbles like clay. Diffuse + specular + a rim light give the gradient.

2️⃣ Add grain by luminance
After the scene renders, copy the frame into a texture and draw it again through a full-screen shader. Each pixel moves by noise weighted to its brightness: strongest in midtones, gentle in darks and highlights. Summing two random values gives a triangular, film-like distribution. A bit of per-channel noise adds chroma.

3️⃣ Stipple the edges
Dither the alpha with the same noise where the edge fades out. Soft edges break into scattered dots, like a grainy gradient in print, instead of a smooth blur.

4️⃣ Paint a grainy halo
Blur the frame with 12 taps on a golden-angle spiral, rotated by a random angle per pixel. The blur comes out grainy by design. Lay it under the shape and break it up more as it fades.

Three things that saved us:
→ Use an integer hash (PCG), not fract(sin(dot())). The classic one drew repeating diagonal "worms" on some GPUs.
→ Key the noise to pixels only, no time input. The balls drift, the grain never shimmers.
→ Phones get SVG, not WebGL. Each shape is drawn twice, filled with a grain PNG tile at two sizes (one turned 37°), so the tile never visibly repeats. No filters, rasterised once, cheap to scroll.

Bonus: un-premultiply the colour before adding grain, so the empty background stays perfectly clean.

Try it live: variantly.style
Code is open source on GitHub (see the site's header).

#frontend #webgl #threejs #glsl #creativecoding #webdesign #shaders
