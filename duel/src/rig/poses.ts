// Pose library. Each pose is a full set of joint angles (see skeleton.ts for the
// conventions). Poses describe intent ("wind-up", "release", "brace"), and the
// choreography blends between them with easing, overlap and IK on top.
import type { Pose } from "./skeleton";

const P = (p: Partial<Pose>): Pose => ({
  lean: 2, bend: 2, head: -2,
  shR: 10, elR: 16, wrR: 40,
  shL: -8, elL: 14, wrL: 0,
  hipR: 8, kneeR: 4, hipL: -7, kneeL: 4,
  ...p,
});

export const POSES = {
  stand: P({}),
  // weight settled, a little life
  idle: P({ lean: 4, bend: 3, head: -4, shR: 14, elR: 30, wrR: 30, shL: -10, elL: 20, hipR: 12, kneeR: 8, hipL: -10, kneeL: 8 }),
  // duel-ready: knees soft, wand forward, free arm back for balance
  guard: P({ lean: 10, bend: 6, head: -10, shR: 62, elR: 26, wrR: 8, shL: -30, elL: 46, hipR: 26, kneeR: 26, hipL: -22, kneeL: 18 }),
  guardLow: P({ lean: 16, bend: 8, head: -14, shR: 58, elR: 30, wrR: 6, shL: -34, elL: 52, hipR: 40, kneeR: 50, hipL: -20, kneeL: 40 }),
  // overhand flick: anticipation (coil back), release (snap through), follow-through
  castWind: P({ lean: -10, bend: -8, head: -12, shR: 168, elR: 44, wrR: 30, shL: 40, elL: 30, hipR: 22, kneeR: 12, hipL: -26, kneeL: 26 }),
  castRelease: P({ lean: 20, bend: 8, head: -6, shR: 86, elR: 4, wrR: 0, shL: -54, elL: 30, hipR: 32, kneeR: 32, hipL: -30, kneeL: 6 }),
  castThrough: P({ lean: 24, bend: 10, head: -2, shR: 70, elR: 2, wrR: -12, shL: -48, elL: 40, hipR: 34, kneeR: 36, hipL: -28, kneeL: 8 }),
  // side-arm whip (faster, flatter shots)
  whipWind: P({ lean: 4, bend: -4, head: -8, shR: 30, elR: 110, wrR: 40, shL: 50, elL: 40, hipR: 24, kneeR: 20, hipL: -24, kneeL: 20 }),
  whipRelease: P({ lean: 18, bend: 8, head: -8, shR: 92, elR: 0, wrR: 2, shL: -40, elL: 36, hipR: 30, kneeR: 30, hipL: -30, kneeL: 8 }),
  // power cast for the beam clash
  bigWind: P({ lean: -14, bend: -10, head: -6, shR: 190, elR: 30, wrR: 40, shL: 60, elL: 50, hipR: 30, kneeR: 22, hipL: -34, kneeL: 34 }),
  bigRelease: P({ lean: 22, bend: 10, head: -10, shR: 84, elR: 0, wrR: 0, shL: 70, elL: 30, hipR: 42, kneeR: 44, hipL: -36, kneeL: 8 }),
  // spell clash: wand locked forward, free hand bracing the wrist
  clash: P({ lean: 18, bend: 8, head: -8, shR: 82, elR: 6, wrR: 4, shL: 74, elL: 26, hipR: 40, kneeR: 42, hipL: -36, kneeL: 10 }),
  clashStrain: P({ lean: 26, bend: 12, head: 2, shR: 80, elR: 10, wrR: 4, shL: 72, elL: 30, hipR: 46, kneeR: 54, hipL: -40, kneeL: 14 }),
  clashLosing: P({ lean: 2, bend: -2, head: 16, shR: 86, elR: 18, wrR: 10, shL: 80, elL: 34, hipR: 34, kneeR: 40, hipL: -30, kneeL: 36 }),
  // dodges
  limbo: P({ lean: -48, bend: -18, head: -12, shR: 96, elR: 30, wrR: 10, shL: 70, elL: 30, hipR: 56, kneeR: 86, hipL: 34, kneeL: 76 }),
  sideLean: P({ lean: -24, bend: -10, head: -14, shR: 40, elR: 50, wrR: 20, shL: 30, elL: 50, hipR: 20, kneeR: 30, hipL: -20, kneeL: 10 }),
  duck: P({ lean: 40, bend: 18, head: 14, shR: 56, elR: 70, wrR: 20, shL: 24, elL: 70, hipR: 84, kneeR: 128, hipL: 24, kneeL: 130 }),
  // jumping
  crouch: P({ lean: 26, bend: 10, head: -12, shR: 40, elR: 50, wrR: 20, shL: -40, elL: 40, hipR: 70, kneeR: 104, hipL: 10, kneeL: 96 }),
  takeoff: P({ lean: 10, bend: 2, head: -10, shR: 140, elR: 20, wrR: 10, shL: 120, elL: 20, hipR: 14, kneeR: 2, hipL: -18, kneeL: 6 }),
  tuck: P({ lean: 18, bend: 14, head: -4, shR: 90, elR: 40, wrR: 10, shL: 50, elL: 70, hipR: 100, kneeR: 130, hipL: 80, kneeL: 132 }),
  airSplit: P({ lean: 8, bend: 4, head: -10, shR: 100, elR: 20, wrR: 0, shL: 110, elL: 30, hipR: 70, kneeR: 40, hipL: -40, kneeL: 50 }),
  land: P({ lean: 28, bend: 12, head: -12, shR: 50, elR: 60, wrR: 10, shL: -30, elL: 50, hipR: 78, kneeR: 116, hipL: 14, kneeL: 104 }),
  slide: P({ lean: 22, bend: 10, head: -12, shR: 66, elR: 30, wrR: 8, shL: -50, elL: 40, hipR: 56, kneeR: 50, hipL: -30, kneeL: 40 }),
  roll: P({ lean: 40, bend: 30, head: 30, shR: 60, elR: 80, wrR: 30, shL: 50, elL: 90, hipR: 110, kneeR: 140, hipL: 100, kneeL: 145 }),
  // parry: wand flicks up and across
  parry: P({ lean: -6, bend: -6, head: -16, shR: 150, elR: 20, wrR: 30, shL: -30, elL: 40, hipR: 24, kneeR: 20, hipL: -26, kneeL: 18 }),
  // locomotion upper bodies (legs come from the gait solver)
  walk: P({ lean: 3, bend: 0, head: -4, shR: 10, elR: 24, wrR: 40, shL: -8, elL: 20 }),
  strut: P({ lean: -2, bend: -6, head: -10, shR: 14, elR: 30, wrR: 50, shL: -12, elL: 24 }),
  run: P({ lean: 16, bend: 6, head: -10, shR: 30, elR: 90, wrR: 20, shL: -20, elL: 90 }),
  runWand: P({ lean: 18, bend: 6, head: -12, shR: 60, elR: 40, wrR: 10, shL: -20, elL: 90 }),
  skid: P({ lean: -16, bend: -6, head: -6, shR: 50, elR: 40, wrR: 10, shL: 40, elL: 40, hipR: 44, kneeR: 20, hipL: -10, kneeL: 40 }),
  sneak: P({ lean: 10, bend: 12, head: 10, shR: 16, elR: 50, wrR: 20, shL: 10, elL: 60 }),
  sprint: P({ lean: 34, bend: 8, head: -6, shR: 40, elR: 90, wrR: 20, shL: -30, elL: 90 }),
  // getting hit
  hitFly: P({ lean: -34, bend: -20, head: -34, shR: 76, elR: 14, wrR: 0, shL: 104, elL: 12, hipR: 64, kneeR: 24, hipL: 44, kneeL: 44 }),
  hitTumble: P({ lean: 10, bend: 20, head: 10, shR: 130, elR: 40, wrR: 20, shL: 150, elL: 30, hipR: 80, kneeR: 70, hipL: 30, kneeL: 90 }),
  // face down on the floor (used with body rot +90 when facing +x)
  proneDown: P({ lean: 0, bend: 2, head: 10, shR: 168, elR: 12, wrR: 6, shL: 24, elL: 18, hipR: 4, kneeR: 8, hipL: -8, kneeL: 26 }),
  proneImpact: P({ lean: 6, bend: 10, head: 24, shR: 150, elR: 30, wrR: 10, shL: 60, elL: 40, hipR: 30, kneeR: 50, hipL: -20, kneeL: 60 }),
  // getting back up
  pushUp: P({ lean: 0, bend: 6, head: 40, shR: 96, elR: -6, wrR: 30, shL: 96, elL: -6, hipR: 6, kneeR: 10, hipL: -2, kneeL: 30 }),
  kneel: P({ lean: 30, bend: 18, head: 36, shR: 40, elR: 10, wrR: 30, shL: 30, elL: 10, hipR: 94, kneeR: 96, hipL: -6, kneeL: 104 }),
  rising: P({ lean: 22, bend: 18, head: 32, shR: 10, elR: 6, wrR: 30, shL: -6, elL: 8, hipR: 30, kneeR: 34, hipL: -16, kneeL: 22 }),
  tired: P({ lean: 12, bend: 16, head: 28, shR: 6, elR: 4, wrR: 30, shL: -4, elL: 6, hipR: 14, kneeR: 12, hipL: -14, kneeL: 10 }),
  // super saiyan
  powerCrouch: P({ lean: 14, bend: 10, head: 24, shR: -24, elR: 104, wrR: 0, shL: -28, elL: 100, hipR: 34, kneeR: 38, hipL: -34, kneeL: 38 }),
  powerStrain: P({ lean: 8, bend: 4, head: 14, shR: -30, elR: 116, wrR: 0, shL: -34, elL: 112, hipR: 36, kneeR: 40, hipL: -36, kneeL: 40 }),
  scream: P({ lean: -10, bend: -14, head: -34, shR: 34, elR: 64, wrR: 0, shL: -34, elL: 64, hipR: 32, kneeR: 24, hipL: -32, kneeL: 24 }),
  ssjStand: P({ lean: 0, bend: -4, head: -6, shR: 14, elR: 22, wrR: 0, shL: -14, elL: 22, hipR: 18, kneeR: 6, hipL: -18, kneeL: 6 }),
  // kamehameha
  kameSet: P({ lean: 4, bend: 2, head: -6, shR: -40, elR: 60, wrR: 0, shL: -34, elL: 70, hipR: 40, kneeR: 40, hipL: -34, kneeL: 30 }),
  kameCharge: P({ lean: -6, bend: -4, head: -8, shR: -62, elR: 44, wrR: 0, shL: -56, elL: 52, hipR: 50, kneeR: 54, hipL: -38, kneeL: 34 }),
  kameFire: P({ lean: 20, bend: 8, head: -8, shR: 92, elR: 0, wrR: 0, shL: 92, elL: 0, hipR: 46, kneeR: 50, hipL: -42, kneeL: 4 }),
  kamePush: P({ lean: 24, bend: 10, head: -4, shR: 94, elR: -4, wrR: 0, shL: 94, elL: -4, hipR: 48, kneeR: 54, hipL: -44, kneeL: 2 }),
  // villain beats
  gloat: P({ lean: -4, bend: -10, head: -16, shR: 116, elR: 22, wrR: 6, shL: -16, elL: 30, hipR: 14, kneeR: 4, hipL: -14, kneeL: 4 }),
  dustOff: P({ lean: 4, bend: 0, head: 6, shR: 46, elR: 76, wrR: 30, shL: 58, elL: 80, hipR: 12, kneeR: 4, hipL: -12, kneeL: 4 }),
  dustOff2: P({ lean: 4, bend: 0, head: 6, shR: 52, elR: 64, wrR: 30, shL: 50, elL: 92, hipR: 12, kneeR: 4, hipL: -12, kneeL: 4 }),
  confused: P({ lean: -2, bend: -2, head: -18, shR: 30, elR: 50, wrR: 20, shL: 20, elL: 70, hipR: 14, kneeR: 8, hipL: -14, kneeL: 8 }),
  wary: P({ lean: -10, bend: -8, head: -26, shR: 70, elR: 40, wrR: 10, shL: 30, elL: 60, hipR: 20, kneeR: 24, hipL: -26, kneeL: 14 }),
  panicCast: P({ lean: -14, bend: -10, head: -20, shR: 96, elR: 6, wrR: 0, shL: 60, elL: 70, hipR: 24, kneeR: 30, hipL: -30, kneeL: 16 }),
  brace: P({ lean: 22, bend: 14, head: 22, shR: 124, elR: 86, wrR: 0, shL: 112, elL: 96, hipR: 36, kneeR: 44, hipL: -42, kneeL: 10 }),
  blown: P({ lean: -20, bend: -16, head: -24, shR: 140, elR: 30, wrR: 0, shL: 160, elL: 20, hipR: 30, kneeR: 30, hipL: -34, kneeL: 14 }),
  // aftermath
  lookUp: P({ lean: -2, bend: -6, head: -30, shR: 8, elR: 8, wrR: 0, shL: -8, elL: 8, hipR: 10, kneeR: 2, hipL: -10, kneeL: 2 }),
  scratch: P({ lean: 0, bend: -4, head: -22, shR: 150, elR: 120, wrR: 0, shL: -8, elL: 10, hipR: 10, kneeR: 2, hipL: -10, kneeL: 2 }),
  bendPick: P({ lean: 58, bend: 18, head: 8, shR: 70, elR: 10, wrR: 0, shL: 20, elL: 30, hipR: 70, kneeR: 84, hipL: -6, kneeL: 66 }),
  reachUp: P({ lean: -4, bend: -6, head: -28, shR: 172, elR: 6, wrR: 0, shL: -10, elL: 10, hipR: 2, kneeR: 0, hipL: -4, kneeL: 0 }),
  facing: P({ lean: 0, bend: 0, head: 0, shR: 9, elR: 4, wrR: 0, shL: -9, elL: 4, hipR: 6, kneeR: 1, hipL: -6, kneeL: 1 }),
  awkward: P({ lean: 0, bend: 2, head: 8, shR: 14, elR: 30, wrR: 0, shL: -14, elL: 30, hipR: 4, kneeR: 2, hipL: -4, kneeL: 2 }),
} satisfies Record<string, Pose>;

export type PoseName = keyof typeof POSES;
