// Reusable particle effects: sparks, rings, soft flashes, dust puffs, debris.
import { FLOOR } from "../config";
import { clamp, E, lerp, rng, type V2 } from "../core/math";
import { attr, n1, n2, translate, type Node } from "../core/svg";
import type { LayerName, Scene } from "../scene";

const within = (t0: number, t1: number) => (t: number) => t >= t0 && t < t1;

/** Ballistic point: p0 + v*t + g*t^2/2 with optional floor bounce. */
export function ballistic(p0: V2, v: V2, g: number, drag = 0, floor = Infinity) {
  return (dt: number): V2 => {
    dt = Math.max(0, dt);
    const k = drag > 0 ? (1 - Math.exp(-drag * dt)) / drag : dt;
    let x = p0[0] + v[0] * k;
    let y = p0[1] + v[1] * k + 0.5 * g * dt * dt;
    if (y > floor) y = floor - (y - floor) * 0.15;
    return [x, y];
  };
}

/** Streaky sparks flying out from a point. */
export function sparks(
  sc: Scene,
  layer: LayerName,
  t: number,
  p: V2,
  o: { n?: number; speed?: [number, number]; color: string; life?: number; g?: number; seed?: number; dir?: number; spread?: number; width?: number; len?: number },
) {
  const r = rng(o.seed ?? Math.round(t * 1000 + p[0]));
  const n = o.n ?? 8;
  for (let i = 0; i < n; i++) {
    const spread = o.spread ?? 360;
    const ang = ((o.dir ?? 0) + (r() - 0.5) * spread) * (Math.PI / 180);
    const sp = lerp(o.speed?.[0] ?? 120, o.speed?.[1] ?? 320, r());
    const v: V2 = [Math.cos(ang) * sp, Math.sin(ang) * sp];
    const life = (o.life ?? 0.32) * lerp(0.6, 1.2, r());
    const g = o.g ?? 500;
    const pos = ballistic(p, v, g, 3.2);
    const L = (o.len ?? 0.03);
    const t0 = t + r() * 0.02;
    sc.add(layer, {
      tag: "path",
      a: { stroke: o.color, "stroke-width": o.width ?? 1.6, "stroke-linecap": "round", fill: "none" },
      ch: [
        {
          kind: "attr",
          attr: "d",
          f: (tt) => {
            const dt = clamp(tt - t0, 0, life);
            const a = pos(dt), b = pos(Math.max(0, dt - L));
            return [...a, ...b];
          },
          fmt: (v) => `M${n1(v[0])} ${n1(v[1])}L${n1(v[2])} ${n1(v[3])}`,
          tol: 0.4,
        },
        attr("opacity", (tt) => 1 - E.inQ(clamp((tt - t0) / life, 0, 1))),
      ],
      vis: within(t0, t0 + life),
    });
  }
}

/** Expanding ring. */
export function ringFx(sc: Scene, layer: LayerName, t: number, p: V2, o: { r0: number; r1: number; life: number; color: string; width?: number; sy?: number; opacity?: number }) {
  sc.add(layer, {
    tag: "ellipse",
    a: { cx: n1(p[0]), cy: n1(p[1]), fill: "none", stroke: o.color },
    ch: [
      attr("rx", (tt) => lerp(o.r0, o.r1, E.outC(clamp((tt - t) / o.life, 0, 1))), { fmt: (v) => n1(v[0]), tol: 0.3 }),
      attr("ry", (tt) => lerp(o.r0, o.r1, E.outC(clamp((tt - t) / o.life, 0, 1))) * (o.sy ?? 1), { fmt: (v) => n1(v[0]), tol: 0.3 }),
      attr("stroke-width", (tt) => lerp(o.width ?? 3, 0.3, clamp((tt - t) / o.life, 0, 1)), { tol: 0.1 }),
      attr("opacity", (tt) => (o.opacity ?? 1) * (1 - E.inQ(clamp((tt - t) / o.life, 0, 1)))),
    ],
    vis: within(t, t + o.life),
  });
}

/** Soft radial glow (needs a radial gradient id from defs). */
export function glowFx(sc: Scene, layer: LayerName, t: number, p: V2 | ((t: number) => V2), o: { r0: number; r1: number; life: number; grad: string; peak?: number; attack?: number }) {
  const P = typeof p === "function" ? p : () => p;
  const atk = o.attack ?? 0.04;
  sc.add(layer, {
    tag: "circle",
    a: { fill: `url(#${o.grad})` },
    ch: [
      attr("cx", (tt) => P(tt)[0], { fmt: (v) => n1(v[0]), tol: 0.3 }),
      attr("cy", (tt) => P(tt)[1], { fmt: (v) => n1(v[0]), tol: 0.3 }),
      attr("r", (tt) => lerp(o.r0, o.r1, E.outC(clamp((tt - t) / o.life, 0, 1))), { fmt: (v) => n1(v[0]), tol: 0.3 }),
      attr("opacity", (tt) => {
        const dt = tt - t;
        const peak = o.peak ?? 1;
        if (dt < atk) return peak * (dt / atk);
        return peak * (1 - E.outQ(clamp((dt - atk) / (o.life - atk), 0, 1)));
      }),
    ],
    vis: within(t, t + o.life),
  });
}

/** Soft dust puff on landings / impacts. */
export function dustPuff(sc: Scene, t: number, p: V2, o: { n?: number; size?: number; color: string; spread?: number; seed?: number; up?: number; life?: number }) {
  const r = rng(o.seed ?? Math.round(t * 977));
  const n = o.n ?? 6;
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const vx = side * lerp(30, 110, r()) * (o.spread ?? 1);
    const vy = -lerp(8, 40, r()) * (o.up ?? 1);
    const life = (o.life ?? 0.55) * lerp(0.7, 1.2, r());
    const rad = (o.size ?? 4) * lerp(0.6, 1.3, r());
    const p0: V2 = [p[0] + side * r() * 6, p[1] - rad * 0.6];
    const pos = ballistic(p0, [vx, vy], 0, 5);
    sc.add("fx", {
      tag: "circle",
      a: { fill: o.color },
      ch: [
        attr("cx", (tt) => pos(tt - t)[0], { fmt: (v) => n1(v[0]), tol: 0.3 }),
        attr("cy", (tt) => pos(tt - t)[1], { fmt: (v) => n1(v[0]), tol: 0.3 }),
        attr("r", (tt) => rad * lerp(0.5, 1.6, E.outQ(clamp((tt - t) / life, 0, 1))), { fmt: (v) => n1(v[0]), tol: 0.2 }),
        attr("opacity", (tt) => 0.55 * (1 - E.inQ(clamp((tt - t) / life, 0, 1)))),
      ],
      vis: within(t, t + life),
    });
  }
}

/** Little chips that fly, spin and settle on the floor. */
export function debris(
  sc: Scene,
  t: number,
  p: V2,
  o: { n?: number; color: string; speed?: [number, number]; dir?: number; spread?: number; seed?: number; size?: number; life?: number; floor?: number; fade?: number },
) {
  const r = rng(o.seed ?? Math.round(t * 733 + p[1]));
  const n = o.n ?? 6;
  const floor = o.floor ?? FLOOR - 1;
  for (let i = 0; i < n; i++) {
    const ang = ((o.dir ?? -90) + (r() - 0.5) * (o.spread ?? 140)) * (Math.PI / 180);
    const sp = lerp(o.speed?.[0] ?? 90, o.speed?.[1] ?? 260, r());
    const v: V2 = [Math.cos(ang) * sp, Math.sin(ang) * sp];
    const s = (o.size ?? 2.2) * lerp(0.6, 1.4, r());
    const spin = lerp(-900, 900, r());
    const life = o.life ?? 1.1;
    const fade = o.fade ?? 0.35;
    // simple sim with one bounce then slide to rest
    const pts: V2[] = [];
    let x = p[0], y = p[1], vx = v[0], vy = v[1];
    const dt = 1 / 120;
    for (let k = 0; k * dt < life + 0.1; k++) {
      pts.push([x, y]);
      vy += 900 * dt;
      x += vx * dt;
      y += vy * dt;
      if (y > floor) {
        y = floor;
        vy = Math.abs(vy) > 80 ? -vy * 0.3 : 0;
        vx *= 0.5;
      }
    }
    const at = (tt: number): V2 => {
      const i2 = clamp((tt - t) / dt, 0, pts.length - 1);
      const kk = Math.floor(i2);
      const f = i2 - kk;
      const a = pts[kk], b = pts[Math.min(kk + 1, pts.length - 1)];
      return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
    };
    sc.add("fx", {
      tag: "path",
      a: { d: `M${n1(-s)} ${n1(-s * 0.6)}L${n1(s)} ${n1(-s * 0.3)}L${n1(s * 0.3)} ${n1(s * 0.8)}Z`, fill: o.color },
      ch: [
        translate((tt) => at(tt), { tol: 0.3 }),
        { kind: "rotate", f: (tt) => [spin * clamp(tt - t, 0, life * 0.5)], fmt: (v) => n1(v[0]), tol: 3 },
        attr("opacity", (tt) => 1 - clamp((tt - (t + life - fade)) / fade, 0, 1)),
      ],
      vis: within(t, t + life),
    });
  }
}

/** Anime impact frame: a jagged star that pops and vanishes in a few frames. */
export function impactStar(sc: Scene, layer: LayerName, t: number, p: V2, o: { r: number; fill: string; edge?: string; life?: number; points?: number; seed?: number; rot?: number }) {
  const r = rng(o.seed ?? Math.round(t * 991));
  const n = o.points ?? 9;
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((i / (n * 2)) * 360 + (o.rot ?? 0) + (r() - 0.5) * 12) * (Math.PI / 180);
    const rr = i % 2 === 0 ? o.r * lerp(0.75, 1.15, r()) : o.r * lerp(0.3, 0.42, r());
    pts.push(`${n1(Math.cos(a) * rr)} ${n1(Math.sin(a) * rr)}`);
  }
  const life = o.life ?? 0.13;
  // static placement on the group; the animated scale lives on the path (an animateTransform replaces its own element's transform)
  sc.add(layer, {
    tag: "g",
    a: { transform: `translate(${n1(p[0])} ${n1(p[1])})` },
    kids: [
      {
        tag: "path",
        a: { d: "M" + pts.join("L") + "Z", fill: o.fill, stroke: o.edge ?? "none", "stroke-width": 1.5, "stroke-linejoin": "round" },
        ch: [
          { kind: "scale", f: (tt) => { const k = lerp(0.35, 1.15, E.outQ(clamp((tt - t) / life, 0, 1))); return [k, k]; }, fmt: (v) => `${n2(v[0])} ${n2(v[1])}`, tol: 0.03 },
          attr("opacity", (tt) => 1 - E.inQ(clamp((tt - t) / life, 0, 1))),
        ],
      },
    ],
    vis: within(t, t + life),
  });
}
