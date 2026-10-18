import * as THREE from 'three';

/*
 * The title's moving light. The pointer (a finger on phones) turns the light
 * the 3D letters are lit by, so every highlight glides across the word: the
 * scene's key light for the lit (BSDF) looks, and this shared uniform for
 * the hand-written shaders, which keep their own authored light direction
 * and rotate it by the turn (`normalize(uLightTurn * vec3(...))`). One
 * uniform object shared by every material: a turn is one write.
 */
export const LIGHT_TURN = { value: new THREE.Matrix3() };

// How far the pointer turns the light from rest at the screen's edges,
// radians: left/right, up/down.
const YAW = 0.55;
const PITCH = 0.4;

export type LightAim = { yaw: number; pitch: number };

// The aim for a pointer at (x, y) on a w x h screen: toward its side.
export const aimAt = (x: number, y: number, w: number, h: number, out: LightAim) => {
  out.yaw = (x / w - 0.5) * 2 * YAW;
  out.pitch = (y / h - 0.5) * 2 * PITCH;
  return out;
};

const euler = new THREE.Euler();
const quat = new THREE.Quaternion();
const m4 = new THREE.Matrix4();

// Writes the turn for an aim; returns its rotation for the scene's lights.
export const turnLight = (aim: LightAim) => {
  quat.setFromEuler(euler.set(aim.pitch, aim.yaw, 0, 'YXZ'));
  LIGHT_TURN.value.setFromMatrix4(m4.makeRotationFromQuaternion(quat));
  return quat;
};
