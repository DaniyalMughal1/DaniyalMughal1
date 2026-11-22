// Super Saiyan kit: growing hair, flame aura, lightning, cracks, rising energy and debris.
import { FLOOR } from "../config";
import { clamp, E, lerp, noise, rng, type V2 } from "../core/math";
import { attr, n1, translate, type Node } from "../core/svg";
import type { Fighter } from "../rig/fighter";
import type { Scene } from "../scene";

const within = (t0: number, t1: number) => (t: number) => t >= t0 && t < t1;
const polyFmt = (close: boolean) => (v: number[]) => {
  let s = `M${n1(v[0])} ${n1(v[1])}`;
  for (let i = 2; i < v.length; i += 2) s += `L${n1(v[i])} ${n1(v[i + 1])}`;
  return close ? s + "Z" : s;
};

// ---------------------------------------------------------------- hair
// Spikes in head space (facing +x, up = -y). Angle 0 = straight up, + toward the face.
interface HairShape {
  ang: number[]; // where each spike sits on the skull
  tip: number[]; // direction each spike points
  len: number[];
  wid: number[]; // half-width at the root, degrees of skull
}
const TUFT: HairShape = {
  ang: [-118, -82, -52, -22, 8, 34],
  tip: [-120, -95, -60, -30, 5, 40],
  len: [0, 1.6, 3.6, 4.6, 3.6, 1.2],
  wid: [6, 9, 11, 11, 10, 7],
};
const SPROUT: HairShape = {
  ang: [-122, -92, -62, -32, -2, 28],
  tip: [-96, -70, -44, -20, 6, 40],
  len: [3.5, 5.5, 6.5, 6.5, 5, 3],
  wid: [10, 12, 12, 12, 12, 9],
};
// Goku-style: big spikes standing up and sweeping back, short bangs at the front
const SSJ: HairShape = {
  ang: [-128, -98, -68, -38, -8, 26],
  tip: [-82, -58, -34, -14, 6, 44],
  len: [15, 21, 25, 22, 15, 7],
  wid: [12, 14, 15, 15, 13, 10],
};
const mixHair = (a: HairShape, b: HairShape, u: number): HairShape => ({
  ang: a.ang.map((x, i) => lerp(x, b.ang[i], u)),
  tip: a.tip.map((x, i) => lerp(x, b.tip[i], u)),
  len: a.len.map((x, i) => lerp(x, b.len[i], u)),
  wid: a.wid.map((x, i) => lerp(x, b.wid[i], u)),
});

function hairPoints(h: HairShape, R: number, jitter = 0, seed = 0): number[] {
  const pol = (deg: number, r: number) => [Math.sin((deg * Math.PI) / 180) * r, -Math.cos((deg * Math.PI) / 180) * r];
  const out: number[] = [];
  out.push(...pol(-150, R + 0.4));
  h.ang.forEach((a, i) => {
    const w = h.wid[i];
    const base = pol(a, R + 0.4);
    const L = h.len[i] + (jitter ? noise(seed + i * 3.1, 9) * jitter : 0);
    const td = h.tip[i];
    const tip = [base[0] + Math.sin((td * Math.PI) / 180) * L, base[1] - Math.cos((td * Math.PI) / 180) * L];
    out.push(...pol(a - w, R + 0.4), ...tip, ...pol(a + w, R + 0.4));
  });
  out.push(...pol(60, R + 0.4), ...pol(56, R * 0.45), ...pol(-140, R * 0.45));
  return out;
}

export interface HairPlan {
  sprout: number; // dark spikes appear
  grow0: number; // start lengthening
  flick0: number; // flicker dark/gold
  flash: number; // fully gold
}

export function hairNode(sc: Scene, f: Fighter, plan: HairPlan): Node {
  const th = sc.th;
  const R = f.d.headR;
  const shape = (t: number): HairShape => {
    if (t < plan.sprout) return TUFT;
    if (t < plan.grow0) return mixHair(TUFT, SPROUT, E.outBack(clamp((t - plan.sprout) / (plan.grow0 - plan.sprout), 0, 1)));
    if (t < plan.flash) return mixHair(SPROUT, SSJ, 0.72 * E.io(clamp((t - plan.grow0) / (plan.flash - plan.grow0), 0, 1)));
    const pre = mixHair(SPROUT, SSJ, 0.72);
    return t < plan.flash + 0.12 ? mixHair(pre, SSJ, E.outBack(clamp((t - plan.flash) / 0.12, 0, 1))) : SSJ;
  };
  const gold = (t: number) => {
    if (t >= plan.flash) return 1;
    if (t < plan.flick0) return 0;
    // flicker: mostly dark at first, mostly gold just before the flash
    const fr = Math.floor(t * 12);
    const u = (t - plan.flick0) / (plan.flash - plan.flick0);
    return rng(fr * 17)() < 0.25 + u * 0.6 ? 1 : 0;
  };
  return {
    tag: "path",
    a: { "stroke-linejoin": "round" },
    ch: [
      {
        kind: "attr",
        attr: "d",
        f: (t) => hairPoints(shape(t), R, t > plan.flick0 && t < plan.flash ? 1.6 : 0, Math.floor(t * 12)),
        fmt: polyFmt(true),
        tol: 0.25,
        fps: 30,
      },
      attr("fill", gold, { discrete: true, fmt: (v) => (v[0] ? th.gold.hair : th.ink) }),
      attr("stroke", gold, { discrete: true, fmt: (v) => (v[0] ? th.gold.edge : th.ink) }),
      attr("stroke-width", gold, { discrete: true, fmt: (v) => (v[0] ? "0.9" : "0.6") }),
    ],
  };
}

// ---------------------------------------------------------------- aura
export function aura(sc: Scene, f: Fighter, t0: number, t1: number, strength: (t: number) => number) {
  const th = sc.th;
  const N = 16;
  const shapeAt = (t: number, scale: number, seed: number) => {
    const fr = Math.floor(t * 12);
    const w = f.at(t);
    const c: V2 = [(w.chest[0] + w.pelvis[0]) / 2, (w.chest[1] + w.pelvis[1]) / 2 - 6];
    const spread = Math.abs(w.footR[0] - w.footL[0]);
    const rx = (20 + spread * 0.28) * scale;
    const ry = 50 * scale;
    const s = strength(t);
    const out: number[] = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const up = Math.max(0, -Math.cos(a)); // 1 at the top
      const flame = i % 2 === 0 ? 1 + 0.42 * up : 1 - 0.06;
      const jit = 1 + 0.13 * (rng(fr * 31 + i * 7 + seed)() - 0.5) * 2;
      const r = flame * jit;
      let x = Math.sin(a) * rx * r;
      let y = -Math.cos(a) * ry * r;
      if (up > 0.2 && i % 2 === 0) y -= 12 * up * s * scale; // tongues lick upward
      y += Math.max(0, Math.cos(a)) * 6; // flat-ish base
      out.push(c[0] + x * (0.6 + 0.4 * s), c[1] + y * (0.6 + 0.4 * s) - (1 - s) * 4);
    }
    return out;
  };
  const vis = within(t0, t1);
  // low-alpha gold turns olive on a dark page, so there the aura is a bright radial glow instead
  const dark = th.name === "dark";
  const layer = (scale: number, fill: string, op0: number, seed: number): Node => {
    const op = dark ? Math.min(0.95, op0 * 2.2) : op0;
    return {
    tag: "path",
    a: { fill: dark ? `url(#aura-${seed})` : fill, "stroke-linejoin": "round" },
    ch: [
      { kind: "attr", attr: "d", f: (t) => shapeAt(t, scale, seed), fmt: polyFmt(true), discrete: true, fps: 12 },
      attr("opacity", (t) => op * strength(t) * (0.85 + 0.15 * (rng(Math.floor(t * 12) * 5 + seed)() - 0.5) * 2), { discrete: true, fps: 12 }),
    ],
    vis,
    };
  };
  sc.add("back", layer(1.12, th.gold.aura, 0.22, 1), layer(0.9, th.gold.aura, 0.32, 2), layer(0.66, th.gold.bright, 0.4, 3));
}

// ---------------------------------------------------------------- lightning
export function lightning(sc: Scene, t: number, around: (t: number) => V2, o: { n?: number; color: string; size?: number; seed?: number; dur?: number }) {
  const r = rng(o.seed ?? Math.round(t * 1000));
  const n = o.n ?? 2;
  for (let i = 0; i < n; i++) {
    const c = around(t);
    const a = r() * Math.PI * 2;
    const R0 = 10 + r() * 14;
    const L = (16 + r() * 18) * (o.size ?? 1);
    const pts: number[] = [];
    let x = c[0] + Math.cos(a) * R0, y = c[1] + Math.sin(a) * R0 * 1.6;
    const dir = a + (r() - 0.5) * 1.2;
    for (let k = 0; k < 5; k++) {
      pts.push(x, y);
      const seg = L / 4;
      const zig = (k % 2 ? 1 : -1) * (3 + r() * 4);
      x += Math.cos(dir) * seg + Math.cos(dir + Math.PI / 2) * zig;
      y += Math.sin(dir) * seg + Math.sin(dir + Math.PI / 2) * zig;
    }
    const tt = t + i * 0.05;
    const dur = o.dur ?? 0.1;
    sc.add("fx", {
      tag: "path",
      a: { d: polyFmt(false)(pts), fill: "none", stroke: o.color, "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" },
      vis: within(tt, tt + dur),
    });
    sc.add("fx", {
      tag: "path",
      a: { d: polyFmt(false)(pts), fill: "none", stroke: "#ffffff", "stroke-width": 0.6, "stroke-linecap": "round", "stroke-linejoin": "round" },
      vis: within(tt, tt + dur * 0.7),
    });
  }
}

// ---------------------------------------------------------------- floor cracks
export function cracks(sc: Scene, t0: number, x: number, o: { n?: number; len?: number; seed?: number; grow?: number; fadeAt: number; color: string }) {
  const r = rng(o.seed ?? 5);
  const n = o.n ?? 5;
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const L = (o.len ?? 40) * lerp(0.5, 1.1, r());
    const pts: number[] = [x + side * r() * 4, FLOOR + 0.5];
    let px = pts[0], py = pts[1];
    const steps = 5;
    let length = 0;
    for (let k = 0; k < steps; k++) {
      const nx = px + side * (L / steps) * lerp(0.6, 1.3, r());
      const ny = FLOOR + 0.5 + (r() - 0.35) * 3.2 * (k + 1) * 0.45;
      length += Math.hypot(nx - px, ny - py);
      pts.push(nx, ny);
      px = nx;
      py = ny;
    }
    const st = t0 + i * 0.05;
    const grow = o.grow ?? 0.3;
    sc.add("floor", {
      tag: "path",
      a: { d: polyFmt(false)(pts), fill: "none", stroke: o.color, "stroke-width": 1.2, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": n1(length + 1) },
      ch: [
        attr("stroke-dashoffset", (t) => (length + 1) * (1 - E.outC(clamp((t - st) / grow, 0, 1))), { fmt: (v) => n1(v[0]), tol: 0.5 }),
        attr("opacity", (t) => 1 - clamp((t - o.fadeAt) / 0.35, 0, 1)),
      ],
      vis: within(st, o.fadeAt + 0.36),
    });
  }
}

// ---------------------------------------------------------------- rising energy streaks
export function risingLines(sc: Scene, t0: number, t1: number, around: (t: number) => V2, color: string, rate = 18, seed = 3) {
  const r = rng(seed);
  for (let t = t0; t < t1; t += 1 / rate) {
    const c = around(t);
    const x = c[0] + (r() - 0.5) * 60;
    const y0 = c[1] + 20 + r() * 26;
    const L = 8 + r() * 14;
    const life = 0.32 + r() * 0.2;
    const rise = 40 + r() * 40;
    sc.add("back", {
      tag: "path",
      a: { d: `M0 0L0 ${n1(L)}`, stroke: color, "stroke-width": 1.4, "stroke-linecap": "round" },
      ch: [
        translate((tt) => [x, y0 - rise * E.outQ(clamp((tt - t) / life, 0, 1))], { tol: 0.4 }),
        attr("opacity", (tt) => 0.8 * Math.sin(Math.PI * clamp((tt - t) / life, 0, 1))),
      ],
      vis: within(t, t + life),
    });
  }
}

/** Pebbles lifted by the power-up, hovering, then dropping. */
export function floatingDebris(sc: Scene, t0: number, t1: number, x: number, color: string, n = 9, seed = 21) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const px = x + (r() - 0.5) * 110;
    const start = t0 + r() * 0.6;
    const h = 16 + r() * 46;
    const s = 1.2 + r() * 1.8;
    const spin = (r() - 0.5) * 300;
    const end = t1 + r() * 0.2;
    const fall = 0.32;
    sc.add("fx", {
      tag: "rect",
      a: { x: n1(-s / 2), y: n1(-s / 2), width: n1(s), height: n1(s), fill: color },
      ch: [
        translate((t) => {
          let y: number;
          if (t < end) y = FLOOR - s / 2 - h * E.out(clamp((t - start) / 0.9, 0, 1)) + Math.sin(t * 3 + i) * 2;
          else y = lerp(FLOOR - s / 2 - h + Math.sin(end * 3 + i) * 2, FLOOR - s / 2, E.inQ(clamp((t - end) / fall, 0, 1)));
          return [px + Math.sin(t * 1.7 + i) * 3, y];
        }, { tol: 0.4 }),
        { kind: "rotate", f: (t) => [spin * (t - start)], fmt: (v) => n1(v[0]), tol: 4 },
      ],
      vis: within(start, end + fall + 0.25),
    });
  }
}
