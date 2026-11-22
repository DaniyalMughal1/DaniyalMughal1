// Loose props with simple rigid-body physics: dropped wands, detached bones.
import { FLOOR } from "../config";
import { clamp, lerp, type V2 } from "../core/math";
import { n1, type Node } from "../core/svg";

const within = (t0: number, t1: number) => (t: number) => t >= t0 && t < t1;

/** Simulate a thin rod (two endpoints) falling, spinning and bouncing to rest on the floor. */
export function rodSim(a: V2, b: V2, v: V2, spin: number, o: { floor?: number; bounce?: number; maxT?: number; radius?: number } = {}) {
  const floor = (o.floor ?? FLOOR) - (o.radius ?? 1);
  let cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  let ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  let vx = v[0], vy = v[1], w = (spin * Math.PI) / 180;
  const dt = 1 / 240;
  const frames: number[][] = [];
  let bounces = 0;
  for (let i = 0; i * dt < (o.maxT ?? 3); i++) {
    const hx = (Math.cos(ang) * L) / 2, hy = (Math.sin(ang) * L) / 2;
    frames.push([cx - hx, cy - hy, cx + hx, cy + hy]);
    vy += 1900 * dt;
    cx += vx * dt;
    cy += vy * dt;
    ang += w * dt;
    const low = cy + Math.abs((Math.sin(ang) * L) / 2);
    if (low > floor) {
      cy -= low - floor;
      if (vy > 0) {
        bounces++;
        vy = bounces > (o.bounce ?? 2) || Math.abs(vy) < 120 ? 0 : -vy * 0.33;
        vx *= 0.5;
        // a bounce on one end flips the spin and flattens the rod
        w = -w * 0.4 + (Math.sin(ang) * Math.cos(ang) > 0 ? -3 : 3);
      }
      if (vy === 0) {
        // settle flat
        const target = Math.round(ang / Math.PI) * Math.PI;
        ang = lerp(ang, target, 0.08);
        w *= 0.8;
        vx *= 0.9;
      }
    }
  }
  return (t: number): number[] => {
    const i = clamp(t / dt, 0, frames.length - 1);
    const k = Math.floor(i), f = i - k;
    const p = frames[k], q = frames[Math.min(k + 1, frames.length - 1)];
    return p.map((x, j) => lerp(x, q[j], f));
  };
}

export function rodNode(sim: (dt: number) => number[], t0: number, t1: number, style: Record<string, string | number>): Node {
  return {
    tag: "path",
    a: { "stroke-linecap": "round", fill: "none", ...style },
    ch: [
      {
        kind: "attr",
        attr: "d",
        f: (t) => sim(t - t0),
        fmt: (v) => `M${n1(v[0])} ${n1(v[1])}L${n1(v[2])} ${n1(v[3])}`,
        tol: 0.35,
      },
    ],
    vis: within(t0, t1),
  };
}
