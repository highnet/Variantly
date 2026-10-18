import * as THREE from 'three';

/*
 * Liquid chrome without an environment map: the reflected ray reads a tiny
 * procedural world (a soft sky with a softbox band, a hot horizon and a dark
 * floor ruled in acid-green wireframe), so every chrome surface reflects the
 * same world the backdrop shows. One pass, no textures, no allocation.
 */
export const CHROME_VERT = /* glsl */ `
uniform float uPuff;
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = -mv.xyz;
  // Pillowing: a flat cap gets a dome's normals (tilted away from the glyph's
  // middle), so the reflections bend across it like a balloon's.
  vec3 nn = normal;
  if (uPuff > 0.0 && abs(normal.z) > 0.9) nn = normalize(vec3(position.xy - vec2(0.0, 0.7), 1.0 / max(uPuff, 1e-3)) * vec3(1.0, 1.0, sign(normal.z)));
  vN = normalize(normalMatrix * nn);
  gl_Position = projectionMatrix * mv;
}`;

export const CHROME_FRAG = /* glsl */ `
uniform vec3 uSky;
uniform vec3 uFloor;
uniform vec3 uGrid;
uniform vec3 uTint;
uniform float uGridA;
uniform float uDark;
varying vec3 vN;
varying vec3 vV;
vec3 world(vec3 r) {
  if (r.y > 0.0) {
    vec3 c = mix(uSky * 1.05, uSky * 0.55 + 0.1, pow(r.y, 0.6));
    c += smoothstep(0.06, 0.0, abs(r.y - 0.42)) * 0.9;
    c += smoothstep(0.12, 0.0, abs(r.x + 0.55)) * step(0.15, r.y) * 0.5;
    return c + smoothstep(0.08, 0.0, r.y) * 0.6;
  }
  vec2 g = r.xz / max(-r.y, 0.04) * 1.6;
  // Antialiased lines; where the grid gets finer than a pixel it fades out
  // rather than sparkling (curved chrome compresses it fast).
  vec2 w = fwidth(g);
  vec2 f = abs(fract(g) - 0.5);
  vec2 l2 = smoothstep(0.5 - 0.04 - w, 0.5 - 0.04 + w, f) * (1.0 - smoothstep(0.15, 0.4, w));
  float line = max(l2.x, l2.y);
  float fade = smoothstep(0.0, 0.25, -r.y);
  return mix(uFloor, uGrid, line * uGridA * fade) + smoothstep(0.1, 0.0, -r.y) * 0.5;
}
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vV);
  vec3 r = reflect(-v, n);
  float fres = pow(1.0 - abs(dot(n, v)), 4.0);
  vec3 c = world(r) * uTint;
  c = mix(c, vec3(1.0), fres * 0.35);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

export type ChromeOpts = {
  dark: boolean;
  tint?: string;
  // How domed a flat cap reads (0 = flat).
  puff?: number;
  grid?: number;
  // Override the floor (a darker floor reads as black chrome).
  floor?: string;
};

export const chrome = ({ dark, tint = '#ffffff', puff = 0, grid = 0.9, floor }: ChromeOpts) =>
  new THREE.ShaderMaterial({
    vertexShader: CHROME_VERT,
    fragmentShader: CHROME_FRAG,
    uniforms: {
      uSky: { value: new THREE.Color(dark ? '#8a8f96' : '#f4f5f6') },
      uFloor: { value: new THREE.Color(floor ?? (dark ? '#050505' : '#1a1a1a')) },
      uGrid: { value: new THREE.Color('#c6ff00') },
      uTint: { value: new THREE.Color(tint) },
      uGridA: { value: grid },
      uDark: { value: dark ? 1 : 0 },
      uPuff: { value: puff },
    },
    toneMapped: false,
  });
