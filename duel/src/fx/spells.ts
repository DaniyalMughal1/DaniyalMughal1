// Wand magic: travelling bolts (with trails, muzzle flashes, impacts) and the
// continuous beams + crackling collision ball of the spell clash.
import { angleOf, clamp, E, lerp, noise, rng, sub, type V2 } from "../core/math";
import { attr, g, n1, rotateCh, translate, type Node } from "../core/svg";
import type { LayerName, Scene } from "../scene";
import { glowFx, ringFx, sparks } from "./particles";

export type Magic = "red" | "green";
const within = (t0: number, t1: number) => (t: number) => t >= t0 && t < t1;

const drop = (r: number, L: number) => `M0 ${n1(-r)}A${n1(r)} ${n1(r)} 0 0 1 0 ${n1(r)}L${n1(-L)} 0Z`;

export interface Bolt {
  t0: number;
  t1: number;
  at: (t: number) => V2;
  dir: (t: number) => V2;
}

export function bolt(
  sc: Scene,
  o: {
    t0: number;
    t1: number;
    from: V2;
    to: V2;
    ctrl?: V2;
    kind: Magic;
    size?: number;
    end?: "burst" | "fizzle" | "none" | "small";
    layer?: LayerName;
    muzzle?: boolean;
    seed?: number;
  },
): Bolt {
  const c = sc.th[o.kind];
  const s = o.size ?? 1;
  const ease = E.lin;
  const at = (t: number): V2 => {
    const u = ease(clamp((t - o.t0) / (o.t1 - o.t0), 0, 1));
    if (!o.ctrl) return [lerp(o.from[0], o.to[0], u), lerp(o.from[1], o.to[1], u)];
    const a = (1 - u) ** 2, b = 2 * (1 - u) * u, d = u * u;
    return [a * o.from[0] + b * o.ctrl[0] + d * o.to[0], a * o.from[1] + b * o.ctrl[1] + d * o.to[1]];
  };
  const dir = (t: number): V2 => {
    const a = at(t - 0.004), b = at(t + 0.004);
    const v = sub(b, a);
    return Math.hypot(v[0], v[1]) < 1e-6 ? sub(o.to, o.from) : v;
  };
  const vis = within(o.t0, o.t1);
  const layer = o.layer ?? "fx";
  const grow = (t: number) => E.outQ(clamp((t - o.t0) / 0.05, 0, 1));
  const shape: Node = g(
    [
      { tag: "path", a: { d: drop(7 * s, 40 * s), fill: c.glow, opacity: 0.3 } },
      { tag: "path", a: { d: drop(3.6 * s, 30 * s), fill: c.body } },
      { tag: "path", a: { d: drop(1.7 * s, 18 * s), fill: c.core } },
    ],
    {},
    [
      translate(at, { tol: 0.4 }),
      rotateCh((t) => angleOf(dir(t)), { tol: 1 }),
      { kind: "scale", f: (t) => [grow(t), lerp(0.4, 1, grow(t))], fmt: (v) => `${n1(v[0])} ${n1(v[1])}`, tol: 0.05 },
    ],
    vis,
  );
  sc.add(layer, shape);

  // sparkle trail
  const r = rng(o.seed ?? Math.round(o.t0 * 1000));
  for (let ti = o.t0 + 0.02; ti < o.t1; ti += 0.04) {
    const p = at(ti);
    const life = 0.22 + r() * 0.12;
    const drift: V2 = [(r() - 0.5) * 16, (r() - 0.5) * 16 - 6];
    const rad = (0.9 + r() * 0.9) * s;
    sc.add(layer, {
      tag: "circle",
      a: { r: n1(rad), fill: r() < 0.5 ? c.core : c.glow },
      ch: [
        translate((t) => {
          const u = clamp((t - ti) / life, 0, 1);
          return [p[0] + drift[0] * E.outQ(u), p[1] + drift[1] * E.outQ(u)];
        }, { tol: 0.4 }),
        attr("opacity", (t) => 0.9 * (1 - clamp((t - ti) / life, 0, 1))),
      ],
      vis: within(ti, ti + life),
    });
  }

  if (o.muzzle !== false) muzzle(sc, o.t0, o.from, o.kind, angleOf(sub(at(o.t0 + 0.02), o.from)), s);
  const end = o.end ?? "burst";
  const pe = at(o.t1);
  if (end === "burst") impact(sc, o.t1, pe, o.kind, angleOf(dir(o.t1 - 0.01)), s);
  if (end === "small") impact(sc, o.t1, pe, o.kind, angleOf(dir(o.t1 - 0.01)), s * 0.6);
  if (end === "fizzle")
    sparks(sc, layer, o.t1, pe, { n: 5, color: c.glow, speed: [40, 120], life: 0.25, g: 120, dir: angleOf(dir(o.t1 - 0.01)), spread: 80 });
  return { t0: o.t0, t1: o.t1, at, dir };
}

export function muzzle(sc: Scene, t: number, p: V2, kind: Magic, dirDeg: number, s = 1) {
  const c = sc.th[kind];
  glowFx(sc, "fx", t, p, { r0: 6 * s, r1: 16 * s, life: 0.16, grad: `glow-${kind}`, peak: 0.95 });
  sparks(sc, "fx", t, p, { n: 4, color: c.core, speed: [80, 200], life: 0.16, g: 0, dir: dirDeg, spread: 70, width: 1.2, len: 0.02 });
}

export function impact(sc: Scene, t: number, p: V2, kind: Magic, dirDeg: number, s = 1) {
  const c = sc.th[kind];
  glowFx(sc, "fx", t, p, { r0: 8 * s, r1: 26 * s, life: 0.28, grad: `glow-${kind}`, peak: 1 });
  ringFx(sc, "fx", t, p, { r0: 3 * s, r1: 20 * s, life: 0.24, color: c.body, width: 2.4 * s });
  sparks(sc, "fx", t, p, { n: Math.round(9 * s), color: c.body, speed: [120, 300], life: 0.34, g: 500, dir: dirDeg + 180, spread: 200 });
  sparks(sc, "fx", t, p, { n: Math.round(5 * s), color: sc.th.spark, speed: [80, 200], life: 0.3, g: 600, dir: -90, spread: 160, seed: Math.round(t * 333) });
}

// ---------------------------------------------------------------- continuous beams (clash)
export function beam(
  sc: Scene,
  layer: LayerName,
  o: { t0: number; t1: number; from: (t: number) => V2; to: (t: number) => V2; kind: Magic; width: (t: number) => number; seed: number },
) {
  const c = sc.th[o.kind];
  const N = 9;
  const pts = (t: number, amp: number, k: number) => {
    const a = o.from(t), b = o.to(t);
    const d = sub(b, a);
    const L = Math.hypot(d[0], d[1]) || 1;
    const nx = -d[1] / L, ny = d[0] / L;
    const out: number[] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const env = Math.sin(Math.PI * u) ** 0.7;
      const w = noise(u * 3.2 + t * 9 * k + o.seed, o.seed + k) * amp * env * o.width(t);
      out.push(a[0] + d[0] * u + nx * w, a[1] + d[1] * u + ny * w);
    }
    return out;
  };
  const fmt = (v: number[]) => {
    let s = `M${n1(v[0])} ${n1(v[1])}`;
    for (let i = 2; i < v.length; i += 2) s += `L${n1(v[i])} ${n1(v[i + 1])}`;
    return s;
  };
  const vis = within(o.t0, o.t1);
  const mk = (stroke: string, wf: number, amp: number, k: number, op: number): Node => ({
    tag: "path",
    a: { fill: "none", stroke, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: op },
    ch: [
      { kind: "attr", attr: "d", f: (t) => pts(t, amp, k), fmt, tol: 0.7, fps: 30 },
      attr("stroke-width", (t) => o.width(t) * wf, { tol: 0.15, fps: 30 }),
    ],
    vis,
  });
  sc.add(layer, mk(c.glow, 4.2, 1.4, 1, 0.28), mk(c.body, 1.7, 0.9, 1.3, 1), mk(c.core, 0.6, 0.5, 1.7, 1));
}

/** The crackling ball where two beams meet. */
export function clashBall(sc: Scene, t0: number, t1: number, at: (t: number) => V2, power: (t: number) => number) {
  const th = sc.th;
  const vis = within(t0, t1);
  const R = (t: number) => (7 + 2.2 * noise(t * 18, 4) + 1.5 * Math.sin(t * 50)) * power(t);
  sc.add("fx", {
    tag: "circle",
    a: { fill: "url(#glow-clash)" },
    ch: [
      attr("cx", (t) => at(t)[0], { fmt: (v) => n1(v[0]), tol: 0.4, fps: 30 }),
      attr("cy", (t) => at(t)[1], { fmt: (v) => n1(v[0]), tol: 0.4, fps: 30 }),
      attr("r", (t) => R(t) * 3.2, { fmt: (v) => n1(v[0]), tol: 0.5, fps: 30 }),
    ],
    vis,
  });
  sc.add("fx", {
    tag: "circle",
    a: { fill: th.clash.core, stroke: th.clash.ring, "stroke-width": 1.5 },
    ch: [
      attr("cx", (t) => at(t)[0], { fmt: (v) => n1(v[0]), tol: 0.4, fps: 30 }),
      attr("cy", (t) => at(t)[1], { fmt: (v) => n1(v[0]), tol: 0.4, fps: 30 }),
      attr("r", (t) => R(t), { fmt: (v) => n1(v[0]), tol: 0.3, fps: 30 }),
    ],
    vis,
  });
  // crackle: jagged arcs that re-draw on twos
  const arcs = 4;
  for (let k = 0; k < arcs; k++) {
    const col = [th.red.body, th.green.body, th.clash.ring, th.clash.core][k];
    sc.add("fx", {
      tag: "path",
      a: { fill: "none", stroke: col, "stroke-width": 1.4, "stroke-linecap": "round", "stroke-linejoin": "round" },
      ch: [
        {
          kind: "attr",
          attr: "d",
          discrete: true,
          fps: 15,
          f: (t) => {
            const fr = Math.floor(t * 15);
            const r = rng(fr * 31 + k * 7);
            const c = at(t);
            const a0 = r() * Math.PI * 2;
            const len = (12 + r() * 14) * power(t);
            const out: number[] = [];
            let ang = a0;
            for (let i = 0; i <= 4; i++) {
              const rr = (len * i) / 4 + R(t) * 0.6;
              ang += (r() - 0.5) * 1.1;
              out.push(c[0] + Math.cos(ang) * rr, c[1] + Math.sin(ang) * rr);
            }
            return out;
          },
          fmt: (v) => {
            let s = `M${n1(v[0])} ${n1(v[1])}`;
            for (let i = 2; i < v.length; i += 2) s += `L${n1(v[i])} ${n1(v[i + 1])}`;
            return s;
          },
        },
        attr("opacity", (t) => (rng(Math.floor(t * 15) * 13 + k)() < 0.55 ? 1 : 0), { discrete: true, fps: 15, fmt: (v) => String(v[0]) }),
      ],
      vis,
    });
  }
  // shed particles
  const r = rng(77);
  for (let t = t0 + 0.05; t < t1 - 0.05; t += 0.07) {
    const p = at(t);
    const kind = r() < 0.5 ? "red" : "green";
    sparks(sc, "fx", t, p, { n: 2, color: th[kind].body, speed: [90, 220], life: 0.4, g: 380, dir: -90 + (r() - 0.5) * 120, spread: 90, seed: Math.round(t * 997) });
  }
}

export const BOLT_DEFS = (th: Scene["th"]) => {
  const rad = (id: string, inner: string, outer: string, o0 = 1) =>
    `<radialGradient id="${id}"><stop offset="0" stop-color="${inner}" stop-opacity="${o0}"/><stop offset="0.35" stop-color="${outer}" stop-opacity="0.55"/><stop offset="1" stop-color="${outer}" stop-opacity="0"/></radialGradient>`;
  return (
    rad("glow-red", th.red.core, th.red.glow) +
    rad("glow-green", th.green.core, th.green.glow) +
    rad("glow-clash", th.clash.core, th.clash.ring) +
    rad("glow-gold", th.gold.bright, th.gold.aura) +
    rad("glow-blue", th.kame.core, th.kame.glow) +
    rad("glow-blue-soft", th.kame.glow, th.kame.outer, 0.6) +
    // dark-mode aura: hot white-gold core falling off to orange at the flame tips
    [1, 2, 3]
      .map(
        (k) =>
          `<radialGradient id="aura-${k}" cx="0.5" cy="0.62" r="0.62"><stop offset="0" stop-color="${th.gold.bright}" stop-opacity="${k === 3 ? 0.95 : 0.7}"/><stop offset="0.55" stop-color="${th.gold.aura}" stop-opacity="${k === 3 ? 0.75 : 0.55}"/><stop offset="1" stop-color="#ff9a1a" stop-opacity="${k === 1 ? 0.12 : 0.28}"/></radialGradient>`,
      )
      .join("")
  );
};
