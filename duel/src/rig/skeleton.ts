// The articulated stickman: proportions, joint angles, forward and inverse kinematics.
//
// Angles are degrees in "rig space": phi = 0 points straight down, +90 points
// forward (the way the character faces), 180 straight up. Children are relative
// to their parent, so bones never change length while poses interpolate.
import { add, clamp, DEG, dirPhi, mix, mul, phiOf, sub, type V2 } from "../core/math";

export const JOINTS = [
  "lean", // lower spine, + leans forward
  "bend", // upper spine relative to lower (+ hunches forward)
  "head", // head tilt relative to upper spine (+ chin down / forward)
  "shR", "elR", "wrR", // wand arm: shoulder (0 = hanging along torso, 90 = forward), elbow, wrist
  "shL", "elL", "wrL", // free arm
  "hipR", "kneeR", // legs: hip (0 = straight down, + forward), knee bend (+ bends the shin back)
  "hipL", "kneeL",
] as const;
export type Joint = (typeof JOINTS)[number];
export type Pose = Record<Joint, number>;

export interface Dims {
  headR: number;
  neck: number;
  spine1: number;
  spine2: number;
  upper: number;
  fore: number;
  thigh: number;
  shin: number;
  wand: number;
  stroke: number;
  /** where the arms attach along the upper spine (1 = at the neck) */
  shoulderAt: number;
}

export interface Joints {
  pelvis: V2;
  chest: V2;
  neck: V2;
  head: V2;
  shoulder: V2;
  elbowR: V2;
  handR: V2;
  wandTip: V2;
  elbowL: V2;
  handL: V2;
  kneeR: V2;
  footR: V2;
  kneeL: V2;
  footL: V2;
  /** world rotation of the head frame (deg, SVG clockwise) */
  headAngle: number;
  /** world screen angle of the wand */
  facing: number;
}

export const POINT_KEYS = [
  "pelvis", "chest", "neck", "head", "shoulder", "elbowR", "handR", "wandTip",
  "elbowL", "handL", "kneeR", "footR", "kneeL", "footL",
] as const;

/** Forward kinematics in local space: pelvis at origin, facing +x, y down, no body rotation. */
export function fk(p: Pose, d: Dims) {
  const pelvis: V2 = [0, 0];
  const a1 = 180 - p.lean;
  const chest = add(pelvis, mul(dirPhi(a1), d.spine1));
  const a2 = 180 - (p.lean + p.bend);
  const neck = add(chest, mul(dirPhi(a2), d.spine2));
  const a3 = 180 - (p.lean + p.bend + p.head);
  const head = add(neck, mul(dirPhi(a3), d.neck + d.headR));
  const shoulder = mix(chest, neck, d.shoulderAt);
  const down = a2 - 180;
  const upR = down + p.shR, foR = upR + p.elR;
  const elbowR = add(shoulder, mul(dirPhi(upR), d.upper));
  const handR = add(elbowR, mul(dirPhi(foR), d.fore));
  const wandTip = add(handR, mul(dirPhi(foR + p.wrR), d.wand));
  const upL = down + p.shL, foL = upL + p.elL;
  const elbowL = add(shoulder, mul(dirPhi(upL), d.upper));
  const handL = add(elbowL, mul(dirPhi(foL), d.fore));
  const kneeR = add(pelvis, mul(dirPhi(p.hipR), d.thigh));
  const footR = add(kneeR, mul(dirPhi(p.hipR - p.kneeR), d.shin));
  const kneeL = add(pelvis, mul(dirPhi(p.hipL), d.thigh));
  const footL = add(kneeL, mul(dirPhi(p.hipL - p.kneeL), d.shin));
  return {
    pelvis, chest, neck, head, shoulder, elbowR, handR, wandTip, elbowL, handL, kneeR, footR, kneeL, footL,
    headTilt: p.lean + p.bend + p.head,
    down,
  };
}

/**
 * Two-bone IK. Returns absolute phi for both bones.
 * bend = +1 rotates the first bone toward +phi (knees forward when the limb points down).
 */
export function ik2(root: V2, target: V2, a: number, b: number, bend: number) {
  const dv = sub(target, root);
  let dd = Math.hypot(dv[0], dv[1]);
  dd = clamp(dd, Math.abs(a - b) + 1e-3, (a + b) * 0.9995);
  const phiT = phiOf(dv);
  const cosA = clamp((a * a + dd * dd - b * b) / (2 * a * dd), -1, 1);
  const A = Math.acos(cosA) / DEG;
  const p1 = phiT + bend * A;
  const mid = add(root, mul(dirPhi(p1), a));
  const p2 = phiOf(sub(target, mid));
  return { p1, p2 };
}

export const lerpPose = (a: Pose, b: Pose, u: number): Pose => {
  const o = {} as Pose;
  for (const j of JOINTS) o[j] = a[j] + (b[j] - a[j]) * u;
  return o;
};
