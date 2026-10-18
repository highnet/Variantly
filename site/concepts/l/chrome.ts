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
  // Sky: a studio cyclorama with two long softboxes and a strip light, so
  // pillowed glyphs pick up clean, continuous highlights.
  if (r.y > 0.0) {
    vec3 c = mix(uSky, uSky * 0.72, smoothstep(0.0, 0.9, r.y));
    c += smoothstep(0.09, 0.0, abs(r.y - 0.34)) * 0.85;
    c += smoothstep(0.05, 0.0, abs(r.y - 0.72)) * 0.55;
    c += smoothstep(0.1, 0.0, abs(r.x + 0.5)) * smoothstep(0.1, 0.3, r.y) * 0.35;
    return c + smoothstep(0.1, 0.0, r.y) * 0.5;
  }
  // Floor: a smooth fall from a hot horizon to the dark floor, with one thin
  // acid-green horizon line and, at most, a faint ghost of the grid.
  float d = -r.y;
  vec3 c = mix(uSky * 0.9, uFloor, smoothstep(0.0, 0.35, d));
  c += uGrid * smoothstep(0.035, 0.0, abs(d - 0.05)) * 0.55;
  vec2 g = r.xz / max(d, 0.04) * 1.6;
  vec2 w = fwidth(g);
  vec2 f = abs(fract(g) - 0.5);
  vec2 l2 = smoothstep(0.5 - 0.04 - w, 0.5 - 0.04 + w, f) * (1.0 - smoothstep(0.08, 0.2, w));
  return mix(c, uGrid, max(l2.x, l2.y) * uGridA * smoothstep(0.0, 0.25, d));
}
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vV);
  vec3 r = reflect(-v, n);
  // The reflected world only: no white fresnel rim.
  vec3 c = world(r) * uTint;
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

export const chrome = ({ dark, tint = '#ffffff', puff = 0, grid = 0, floor }: ChromeOpts) =>
  new THREE.ShaderMaterial({
    vertexShader: CHROME_VERT,
    fragmentShader: CHROME_FRAG,
    uniforms: {
      uSky: { value: new THREE.Color(dark ? '#9aa0a8' : '#eef0f2') },
      uFloor: { value: new THREE.Color(floor ?? (dark ? '#0a0a0b' : '#3a3c40')) },
      uGrid: { value: new THREE.Color('#c6ff00') },
      uTint: { value: new THREE.Color(tint) },
      uGridA: { value: grid },
      uDark: { value: dark ? 1 : 0 },
      uPuff: { value: puff },
    },
    toneMapped: false,
  });
