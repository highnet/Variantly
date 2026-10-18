import * as THREE from 'three';

import { patch, plain } from '@/lib/lookKit';
import type { ConceptLook } from '@/concepts/types';

/*
 * i · Liquid Glass. The cheap looks (all phones get) fake the glass in one
 * pass: the view ray refracts through the normal (ior 1.45) into a soft
 * colour field with hairlines, the same ground the backdrop's lenses bend,
 * with dispersion and a thin specular bevel (no glowing rim), tinted by the
 * letter's own colour. Desktop adds real transmission glass.
 */
const GLASS_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = -mv.xyz;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}`;

const GLASS_FRAG = /* glsl */ `
uniform vec3 uTint;
uniform vec3 uTop;
uniform vec3 uBot;
uniform vec3 uField;
uniform vec3 uHi;
uniform float uClear;
varying vec3 vN;
varying vec3 vV;
// What the glass shows: a soft field in screen space (so it runs on across
// letters, like a real backdrop), a diagonal light band and hairlines.
vec3 ground(vec2 q) {
  vec3 c = mix(uBot, uTop, clamp(q.y * 0.5 + 0.55, 0.0, 1.0));
  c = mix(c, uField, smoothstep(0.9, 0.0, length(q - vec2(0.5, 0.15))) * 0.85);
  c = mix(c, uHi, smoothstep(0.12, 0.0, abs(q.x * 0.55 + q.y - 0.25)) * 0.6);
  c = mix(c, uHi, step(0.86, fract(q.y * 7.0)) * 0.18);
  return c;
}
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vV);
  float ndv = abs(dot(n, v));
  vec2 s = -vV.xy / vV.z * 3.0;
  vec3 r = vec3(
    ground(s + refract(-v, n, 0.67).xy * 0.8).r,
    ground(s + refract(-v, n, 0.69).xy * 0.86).g,
    ground(s + refract(-v, n, 0.71).xy * 0.92).b);
  vec3 c = mix(r * uTint * 1.1, r, uClear);
  vec3 L = normalize(vec3(-0.45, 0.6, 0.65));
  float spec = pow(max(dot(reflect(-L, n), v), 0.0), 90.0);
  c += uHi * spec * 1.4;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

const glass = (tint: string, dark: boolean, clear: number) =>
  new THREE.ShaderMaterial({
    vertexShader: GLASS_VERT,
    fragmentShader: GLASS_FRAG,
    uniforms: {
      uTint: { value: new THREE.Color(tint) },
      uTop: { value: new THREE.Color(dark ? '#3a4a66' : '#ffffff') },
      uBot: { value: new THREE.Color(dark ? '#0b1220' : '#4f7299') },
      uField: { value: new THREE.Color(dark ? '#4a78b8' : '#c6e6ee') },
      uHi: { value: new THREE.Color(dark ? '#e6f0ff' : '#ffffff') },
      uClear: { value: clear },
    },
    toneMapped: false,
  });

export const look: ConceptLook = {
  pool: (ink, dark, phone) => {
    const looks = (dark ? [0.15, 0.55, 0] : [0.45, 0.8, 0.25]).map((clear) =>
      plain(glass(ink.face, dark, clear), glass(ink.side, dark, clear * 0.5)),
    );
    if (phone) return looks;
    // Desktop: true transmission glass (ior 1.45, thickness 0.6), lit by the studio.
    const grain = patch('glass', false);
    const phys = (tint: string, iridescence: number) =>
      grain(
        new THREE.MeshPhysicalMaterial({
          color: tint,
          transmission: 1,
          thickness: 0.6,
          ior: 1.45,
          roughness: 0.04,
          metalness: 0,
          iridescence,
          iridescenceIOR: 1.3,
          specularIntensity: 1,
          clearcoat: 1,
          clearcoatRoughness: 0.03,
          attenuationColor: new THREE.Color(tint),
          attenuationDistance: 4,
        }),
      );
    looks.push(
      plain(phys(ink.face, 0.25), phys(ink.side, 0.25), true),
      plain(phys(dark ? ink.face : '#ffffff', 0.4), phys(ink.side, 0.4), true),
      plain(phys(ink.face, 0), phys(ink.face, 0), true),
    );
    return looks;
  },
  shadow: (dark) => ({
    color: dark ? '#000000' : '#23364d',
    opacity: dark ? 0.5 : 0.16,
    radius: 1,
    dir: [-0.3, 0.6, 1],
  }),
};
