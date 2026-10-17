import * as THREE from 'three';

import type { SceneKind } from './variants';

export type Built = { camera: THREE.Camera; update: (t: number, px: number) => void };

const NOISE = /* glsl */ `
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
float n(vec3 p){
  vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);
}`;

const persp = (z = 8) => {
  const c = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  c.position.set(0, 0, z);
  return c;
};

/* Glossy noise-displaced blobs drifting like soft clay. */
const clay = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = persp(9);
  const mats = colors.map(
    (c) =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color(c) } },
        vertexShader: `${NOISE}
uniform float uTime; varying vec3 vN; varying vec3 vV;
void main(){
  float d = n(normal*1.6 + uTime*0.25)*0.45;
  vec3 p = position + normal*d;
  vN = normalize(normalMatrix*normal);
  vec4 mv = modelViewMatrix*vec4(p,1.0); vV = -mv.xyz;
  gl_Position = projectionMatrix*mv;
}`,
        fragmentShader: `
uniform vec3 uCol; varying vec3 vN; varying vec3 vV;
void main(){
  vec3 N=normalize(vN); vec3 V=normalize(vV); vec3 L=normalize(vec3(-0.4,0.8,0.6));
  float dif = max(dot(N,L),0.0)*0.6+0.5;
  float spec = pow(max(dot(reflect(-L,N),V),0.0), 24.0)*0.6;
  float rim = pow(1.0-max(dot(N,V),0.0), 2.5)*0.35;
  gl_FragColor = vec4(uCol*dif + spec + rim, 1.0);
}`,
      }),
  );
  const spots: [number, number, number, number][] = [
    [-4.2, 1.4, 0, 1.5],
    [4.4, 1.9, -1, 1.2],
    [2.2, -2.2, 0.5, 0.9],
  ];
  const meshes = spots.map(([x, y, z, r], i) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 48), mats[i % mats.length]);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  });
  return {
    camera,
    update: (t, px) => {
      meshes.forEach((m, i) => {
        (m.material as THREE.ShaderMaterial).uniforms.uTime.value = t + i * 3;
        m.position.y = spots[i][1] + Math.sin(t * 0.5 + i * 2) * 0.35;
        m.rotation.set(t * 0.1 + i, t * 0.13, 0);
      });
      camera.position.x = px * 0.8;
      camera.lookAt(0, 0, 0);
    },
  };
};

/* A torus knot printed as screen-space halftone dots in one ink. */
const halftone = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = persp(10);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uCol: { value: new THREE.Color(colors[0]) } },
    vertexShader: `varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
uniform vec3 uCol; varying vec3 vN;
void main(){
  float l = max(dot(normalize(vN), normalize(vec3(-0.5,0.7,0.6))),0.0);
  vec2 g = gl_FragCoord.xy / 7.0;
  mat2 r = mat2(0.966,-0.259,0.259,0.966); g = r*g;
  float d = length(fract(g)-0.5);
  float rad = (1.0-l)*0.62 + 0.08;
  if (d > rad) discard;
  gl_FragColor = vec4(uCol, 0.9);
}`,
  });
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(2.1, 0.62, 260, 40, 2, 3), mat);
  knot.position.set(3.2, 0.6, 0);
  scene.add(knot);
  return {
    camera,
    update: (t, px) => {
      knot.rotation.set(t * 0.15, t * 0.22 + px * 0.6, 0);
    },
  };
};

/* A wireframe landscape, like a 1970s vector display. */
const terrain = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, -9, 2.6);
  camera.lookAt(0, 2, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color(colors[0]) } },
    vertexShader: `${NOISE}
uniform float uTime; varying vec2 vUv; varying float vD;
void main(){
  vUv = uv; vec3 p = position;
  float e = n(vec3(p.x*0.3, p.y*0.3 - uTime*0.25, 0.0))*2.2 * smoothstep(0.0,6.0,abs(p.x));
  p.z += e;
  vec4 mv = modelViewMatrix*vec4(p,1.0); vD = -mv.z;
  gl_Position = projectionMatrix*mv;
}`,
    fragmentShader: `
uniform vec3 uCol; varying vec2 vUv; varying float vD;
void main(){
  vec2 g = abs(fract(vUv*vec2(48.0,36.0))-0.5);
  float line = 1.0 - smoothstep(0.0, 0.06, min(g.x,g.y));
  float fade = 1.0 - smoothstep(6.0, 24.0, vD);
  if (line*fade < 0.02) discard;
  gl_FragColor = vec4(uCol, line*fade);
}`,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(30, 30, 120, 120), mat);
  plane.position.y = 8;
  scene.add(plane);
  return {
    camera,
    update: (t, px) => {
      mat.uniforms.uTime.value = t;
      camera.position.x = px * 1.2;
    },
  };
};

/* Nested wireframe solids spinning, zine-cover style. */
const wire = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = persp(9);
  const outer = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.6, 1)),
    new THREE.LineBasicMaterial({ color: colors[0] }),
  );
  const inner = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.3)),
    new THREE.LineBasicMaterial({ color: colors[1] }),
  );
  const group = new THREE.Group();
  group.add(outer, inner);
  group.position.set(3.6, 0.4, 0);
  scene.add(group);
  return {
    camera,
    update: (t, px) => {
      outer.rotation.set(t * 0.3, t * 0.4 + px, 0);
      inner.rotation.set(-t * 0.6, -t * 0.5, t * 0.2);
    },
  };
};

/* Flat-shaded primitives in an orthographic still life. */
const bauhaus = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 100);
  camera.position.set(0, 0, 20);
  scene.add(new THREE.AmbientLight('#ffffff', 1.4));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(-3, 5, 6);
  scene.add(sun);
  const mat = (c: string) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), mat(colors[0]));
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 16), mat(colors[1]));
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.8, 3), mat(colors[2]));
  cube.position.set(4.2, 1.8, 0);
  ball.position.set(6.4, -1.8, 0);
  cone.position.set(2.2, -2.4, 0);
  scene.add(cube, ball, cone);
  return {
    camera,
    update: (t, px) => {
      cube.rotation.set(t * 0.3, t * 0.4 + px, 0);
      ball.position.y = -1.8 + Math.sin(t * 0.8) * 0.5;
      cone.rotation.set(0.3, t * 0.5, Math.sin(t * 0.4) * 0.3);
    },
  };
};

/* A neon grid floor rolling toward the horizon. */
const synth = (scene: THREE.Scene, colors: string[]): Built => {
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.set(0, 1.2, 8);
  camera.lookAt(0, 1.4, -10);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uA: { value: new THREE.Color(colors[0]) },
      uB: { value: new THREE.Color(colors[1]) },
    },
    vertexShader: `varying vec2 vW; void main(){ vW = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
uniform float uTime; uniform vec3 uA; uniform vec3 uB; varying vec2 vW;
void main(){
  vec2 p = vec2(vW.x, vW.y + uTime*2.0);
  vec2 g = abs(fract(p*0.5)-0.5)/fwidth(p*0.5);
  float line = 1.0 - min(min(g.x,g.y), 1.0);
  float depth = clamp((vW.y + 40.0)/60.0, 0.0, 1.0);
  vec3 col = mix(uB, uA, depth);
  float a = line * smoothstep(0.0, 0.35, 1.0-depth) + line*0.25;
  if (a < 0.02) discard;
  gl_FragColor = vec4(col, a);
}`,
    extensions: { derivatives: true } as never,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -20;
  scene.add(floor);
  return {
    camera,
    update: (t, px) => {
      mat.uniforms.uTime.value = t;
      camera.position.x = px * 1.5;
      camera.lookAt(0, 1.4, -10);
    },
  };
};

export const SCENES: Record<SceneKind, (s: THREE.Scene, c: string[]) => Built> = {
  clay,
  halftone,
  terrain,
  wire,
  bauhaus,
  synth,
};
