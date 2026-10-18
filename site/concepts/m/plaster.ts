import * as THREE from 'three';

import { NOISE } from '@/components/backdrop/sceneKit';
import { LIGHT_TURN } from '@/lib/titleLight';

/*
 * Chalky plaster with hairline cracks (thin isolines of a 3D noise), shared by
 * the scene and the 3D title; and its liar of a reflection: the same body,
 * mirrored about a floor, recoloured as another variant and fading with depth.
 */
const VERT = /* glsl */ `
uniform float uMirror;
uniform float uFloor;
uniform float uWorld;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
varying float vDepth;
void main() {
  vec3 p = position;
  vec3 nn = normal;
  // Mirrored copy: flip about the floor (object y = uFloor).
  if (uMirror > 0.5) { p.y = 2.0 * uFloor - p.y; nn.y = -nn.y; }
  vP = position;
  // How far below the floor: in object units (the title), or world units
  // (scene reflections, mirrored by their transform).
  vDepth = uWorld > 0.5 ? max(0.0, uFloor - (modelMatrix * vec4(p, 1.0)).y) : max(0.0, uFloor - p.y);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vV = -mv.xyz;
  vN = normalize(normalMatrix * nn);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform mat3 uLightTurn;
${NOISE}
uniform vec3 uCol;
uniform vec3 uShade;
uniform float uCrack;
uniform float uScale;
uniform float uMirror;
uniform float uFade;
uniform float uAlpha;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
varying float vDepth;
void main() {
  vec3 nr = normalize(vN);
  if (!gl_FrontFacing) nr = -nr;
  vec3 v = normalize(vV);
  vec3 L = normalize(uLightTurn * vec3(-0.5, 0.75, 0.45));
  float wrap = clamp((dot(nr, L) + 0.35) / 1.35, 0.0, 1.0);
  vec3 q = vP * uScale;
  // Chalk: two octaves of fine tooth.
  float tooth = n(q * 9.0) * 0.6 + n(q * 23.0) * 0.4;
  // Hairline cracks: where a slow noise crosses one value.
  float k = n(q * 1.7 + 4.0);
  float crack = smoothstep(0.012, 0.0, abs(k - 0.5)) * step(0.45, n(q * 0.9 + 9.0));
  vec3 c = mix(uShade, uCol, wrap) * (0.9 + 0.12 * tooth);
  c *= 1.0 - crack * uCrack;
  c += pow(1.0 - abs(dot(nr, v)), 3.0) * 0.08;
  float a = uAlpha;
  a *= exp(-vDepth * uFade);
  gl_FragColor = vec4(c, a);
  #include <colorspace_fragment>
}`;

export type PlasterOpts = {
  col: string;
  shade: string;
  crack?: number;
  scale?: number;
  mirror?: boolean;
  // A reflection: transparent, fading with depth below `floor`.
  reflection?: boolean;
  // Depth measured in world units (scene) rather than object units (title).
  world?: boolean;
  floor?: number;
  fade?: number;
  alpha?: number;
};

export const plaster = (o: PlasterOpts) =>
  new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uLightTurn: LIGHT_TURN,
      uCol: { value: new THREE.Color(o.col) },
      uShade: { value: new THREE.Color(o.shade) },
      uCrack: { value: o.crack ?? 0.55 },
      uScale: { value: o.scale ?? 1 },
      uMirror: { value: o.mirror ? 1 : 0 },
      uFloor: { value: o.floor ?? 0 },
      uWorld: { value: o.world ? 1 : 0 },
      uFade: { value: o.reflection ? (o.fade ?? 1) : 0 },
      uAlpha: { value: o.alpha ?? 1 },
    },
    transparent: !!o.reflection,
    depthWrite: !o.reflection,
    side: o.reflection ? THREE.DoubleSide : THREE.FrontSide,
    toneMapped: false,
  });
