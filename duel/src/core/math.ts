// Small math kit shared by every module: vectors, easing, seeded noise, springs.

export type V2 = [number, number];
export type Ease = (u: number) => number;

export const DEG = Math.PI / 180;
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const invLerp = (a: number, b: number, v: number) => (b === a ? 0 : (v - a) / (b - a));
/** 0..1 progress of t through [t0, t1], clamped. */
export const prog = (t: number, t0: number, t1: number) => clamp(invLerp(t0, t1, t), 0, 1);
export const smoothstep = (u: number) => u * u * (3 - 2 * u);

export const add = (a: V2, b: V2): V2 => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: V2, s: number): V2 => [a[0] * s, a[1] * s];
export const len = (a: V2) => Math.hypot(a[0], a[1]);
export const dist = (a: V2, b: V2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const mix = (a: V2, b: V2, u: number): V2 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
export const norm = (a: V2): V2 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};
/** Rotate clockwise on screen (SVG, y down) by `deg`. */
export const rotate = (a: V2, deg: number): V2 => {
  const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG);
  return [a[0] * c - a[1] * s, a[0] * s + a[1] * c];
};
/** Rig angle convention: phi = 0 points straight down, +90 points forward (+x), 180 straight up. */
export const dirPhi = (phi: number): V2 => [Math.sin(phi * DEG), Math.cos(phi * DEG)];
export const phiOf = (v: V2) => Math.atan2(v[0], v[1]) / DEG;
/** Screen angle (degrees, clockwise from +x) of a vector — what SVG rotate() wants. */
export const angleOf = (v: V2) => Math.atan2(v[1], v[0]) / DEG;
export const wrapDeg = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

// ---------------------------------------------------------------- easing
const bez = (x1: number, y1: number, x2: number, y2: number): Ease => (s) => {
  if (s <= 0) return 0;
  if (s >= 1) return 1;
  let lo = 0, hi = 1;
  for (let i = 0; i < 22; i++) {
    const m = (lo + hi) / 2;
    const x = 3 * (1 - m) ** 2 * m * x1 + 3 * (1 - m) * m * m * x2 + m ** 3;
    if (x < s) lo = m;
    else hi = m;
  }
  const u = (lo + hi) / 2;
  return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3;
};

export const E = {
  lin: ((u) => u) as Ease,
  step: ((u) => (u < 1 ? 0 : 1)) as Ease,
  inQ: ((u) => u * u) as Ease,
  outQ: ((u) => 1 - (1 - u) * (1 - u)) as Ease,
  inOutQ: ((u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u))) as Ease,
  inC: ((u) => u * u * u) as Ease,
  outC: ((u) => 1 - (1 - u) ** 3) as Ease,
  inOutC: ((u) => (u < 0.5 ? 4 * u ** 3 : 1 - 4 * (1 - u) ** 3)) as Ease,
  inQuart: ((u) => u ** 4) as Ease,
  outQuart: ((u) => 1 - (1 - u) ** 4) as Ease,
  outExpo: ((u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u))) as Ease,
  inExpo: ((u) => (u <= 0 ? 0 : Math.pow(2, 10 * (u - 1)))) as Ease,
  sine: ((u) => 0.5 - 0.5 * Math.cos(Math.PI * u)) as Ease,
  /** classic animator "slow in / slow out" */
  io: bez(0.45, 0, 0.55, 1),
  /** fast attack, long settle — snaps, strikes */
  snap: bez(0.1, 0.7, 0.2, 1),
  /** heavy start — anticipation into release */
  heavy: bez(0.7, 0, 0.84, 0),
  out: bez(0.1, 0.6, 0.3, 1),
  in: bez(0.55, 0, 0.9, 0.4),
  outBack: ((u) => {
    const c = 1.9;
    return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2;
  }) as Ease,
  outBackSoft: ((u) => {
    const c = 1.1;
    return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2;
  }) as Ease,
  inBack: ((u) => {
    const c = 1.7;
    return (c + 1) * u ** 3 - c * u * u;
  }) as Ease,
};

/** Damped oscillation starting at 1 and decaying to 0 over roughly `dur` seconds. */
export const ring = (dt: number, freq: number, dur: number) =>
  dt < 0 ? 0 : Math.exp((-dt * 4.6) / dur) * Math.cos(2 * Math.PI * freq * dt);

// ---------------------------------------------------------------- deterministic randomness
export function rng(seed: number) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
/** Smooth 1D value noise in [-1, 1]. */
export function noise(x: number, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash(i + seed * 101.7) * 2 - 1, b = hash(i + 1 + seed * 101.7) * 2 - 1;
  return lerp(a, b, smoothstep(f));
}
