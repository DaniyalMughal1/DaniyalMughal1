// Kamehameha: the charging sphere between cupped hands, then the beam.
import { W } from "../config";
import { clamp, E, lerp, noise, rng, type V2 } from "../core/math";
import { attr, n1, translate, type Node } from "../core/svg";
import type { Scene } from "../scene";
import { glowFx, ringFx, sparks } from "./particles";

const within = (t0: number, t1: number) => (t: number) => t >= t0 && t < t1;
const polyFmt = (close: boolean) => (v: number[]) => {
  let s = `M${n1(v[0])} ${n1(v[1])}`;
  for (let i = 2; i < v.length; i += 2) s += `L${n1(v[i])} ${n1(v[i + 1])}`;
  return close ? s + "Z" : s;
};

export interface KamePlan {
  appear: number; // first glint between the palms
  peak: number; // fully charged
  still: number; // the held breath before release
  fire: number; // hands thrust forward
  stop: number; // beam cuts out
}

export function chargeRadius(p: KamePlan, t: number) {
  if (t < p.appear) return 0;
  if (t < p.peak) {
    const u = (t - p.appear) / (p.peak - p.appear);
    return lerp(1.5, 13, E.inQ(u) * 0.6 + u * 0.4) + noise(t * 20, 2) * lerp(0.2, 1.6, u);
  }
  if (t < p.still) return 13 + noise(t * 26, 2) * 1.8;
  if (t < p.fire) return 14;
  return lerp(14, 6, clamp((t - p.fire) / 0.15, 0, 1));
}

/** The charging orb. `at` = midpoint of the cupped hands. */
export function chargeOrb(sc: Scene, p: KamePlan, at: (t: number) => V2) {
  const th = sc.th;
  const t1 = p.fire + 0.15;
  const vis = within(p.appear, t1);
  const R = (t: number) => chargeRadius(p, t);
  const circ = (fill: string, k: number, op: number, layer: "back" | "fx" = "fx") =>
    sc.add(layer, {
      tag: "circle",
      a: { fill, opacity: op },
      ch: [
        attr("cx", (t) => at(t)[0], { fmt: (v) => n1(v[0]), tol: 0.3 }),
        attr("cy", (t) => at(t)[1], { fmt: (v) => n1(v[0]), tol: 0.3 }),
        attr("r", (t) => R(t) * k, { fmt: (v) => n1(v[0]), tol: 0.3 }),
      ],
      vis,
    });
  // light spilling onto the hero (behind him)
  sc.add("back", {
    tag: "circle",
    a: { fill: "url(#glow-blue-soft)" },
    ch: [
      attr("cx", (t) => at(t)[0], { fmt: (v) => n1(v[0]), tol: 0.5 }),
      attr("cy", (t) => at(t)[1], { fmt: (v) => n1(v[0]), tol: 0.5 }),
      attr("r", (t) => 18 + R(t) * 4.5, { fmt: (v) => n1(v[0]), tol: 0.5 }),
      attr("opacity", (t) => 0.55 * clamp((t - p.appear) / (p.peak - p.appear), 0, 1)),
    ],
    vis,
  });
  circ("url(#glow-blue)", 3.1, 0.9);
  circ(th.kame.outer, 1.2, 0.9);
  circ(th.kame.mid, 0.95, 1);
  circ(th.kame.core, 0.58, 1);

  // energy streaming inward
  const r = rng(404);
  for (let ti = p.appear + 0.05; ti < p.still - 0.1; ti += 1 / 26) {
    const ang = r() * Math.PI * 2;
    const d0 = 34 + r() * 40;
    const life = 0.26 + r() * 0.12;
    const L = 5 + r() * 6;
    const col = r() < 0.5 ? th.kame.mid : th.kame.core;
    sc.add("fx", {
      tag: "path",
      a: { stroke: col, "stroke-width": 1.3, "stroke-linecap": "round", fill: "none" },
      ch: [
        {
          kind: "attr",
          attr: "d",
          f: (t) => {
            const c = at(t);
            const u = E.inQ(clamp((t - ti) / life, 0, 1));
            const dd = lerp(d0, R(t) * 0.8, u);
            const tail = dd + L * (1 - u * 0.6);
            return [c[0] + Math.cos(ang) * dd, c[1] + Math.sin(ang) * dd, c[0] + Math.cos(ang) * tail, c[1] + Math.sin(ang) * tail];
          },
          fmt: polyFmt(false),
          tol: 0.5,
        },
        attr("opacity", (t) => Math.min(1, ((t - ti) / life) * 4)),
      ],
      vis: within(ti, ti + life),
    });
  }
  // orbiting motes near the peak
  for (let k = 0; k < 4; k++) {
    const t0 = p.peak - 0.6 + k * 0.05;
    sc.add("fx", {
      tag: "circle",
      a: { r: 1.4, fill: th.kame.core },
      ch: [
        translate((t) => {
          const c = at(t);
          const a = t * 11 + (k * Math.PI) / 2;
          const rr = R(t) + 6 + k * 1.5;
          return [c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr * 0.6];
        }, { tol: 0.6, fps: 30 }),
      ],
      vis: within(t0, p.still),
    });
  }
  // electric arcs on twos
  for (let k = 0; k < 3; k++) {
    sc.add("fx", {
      tag: "path",
      a: { fill: "none", stroke: k === 2 ? th.kame.core : th.kame.mid, "stroke-width": 1.2, "stroke-linecap": "round", "stroke-linejoin": "round" },
      ch: [
        {
          kind: "attr",
          attr: "d",
          discrete: true,
          fps: 12,
          f: (t) => {
            const fr = Math.floor(t * 12);
            const rr = rng(fr * 19 + k * 3);
            const c = at(t);
            const a0 = rr() * Math.PI * 2;
            const out: number[] = [];
            let a = a0;
            for (let i = 0; i <= 4; i++) {
              const d = R(t) * 0.8 + i * (4 + rr() * 3);
              a += (rr() - 0.5) * 0.9;
              out.push(c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d);
            }
            return out;
          },
          fmt: polyFmt(false),
        },
        attr("opacity", (t) => (rng(Math.floor(t * 12) * 7 + k)() < 0.6 ? 1 : 0), { discrete: true, fps: 12, fmt: (v) => String(v[0]) }),
      ],
      vis: within(p.appear + 0.7, p.still),
    });
  }
}

/** The beam itself. */
export function beam(sc: Scene, p: KamePlan, origin: (t: number) => V2, o: { half: number; reach: number; seed?: number }) {
  const th = sc.th;
  const t0 = p.fire, t1 = p.stop + 0.14;
  const vis = within(t0, t1);
  const front = (t: number) => {
    const u = clamp((t - t0) / 0.2, 0, 1);
    return lerp(origin(t)[0] + 4, W + 120, E.out(u));
  };
  const heightK = (t: number) => {
    if (t < t0) return 0;
    const grow = E.outBack(clamp((t - t0) / 0.1, 0, 1));
    const fade = t > p.stop ? 1 - E.inQ(clamp((t - p.stop) / 0.12, 0, 1)) : 1;
    const pulse = 1 + 0.05 * Math.sin(t * 38) + 0.04 * noise(t * 9, 4);
    return grow * fade * pulse;
  };
  const N = 10;
  const outline = (t: number, scale: number, rough: number, seed: number) => {
    const O = origin(t);
    const Fx = front(t);
    const k = heightK(t) * scale;
    const H = o.half;
    const fr = Math.floor(t * 15);
    const len = Math.max(1, Fx - O[0]);
    const top: number[] = [], bot: number[] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const x = O[0] + len * u;
      // flare out of the hands, full thickness after ~45px
      const flare = clamp((x - O[0]) / 46, 0, 1);
      let hh = H * k * lerp(0.6, 1, E.outQ(flare));
      // angular turbulence that crawls along the beam
      const n1v = noise(u * 7 - t * 16 + seed, seed) * rough;
      const n2v = noise(u * 7 - t * 16 + seed + 40, seed + 1) * rough;
      const spikeT = rng(fr * 13 + i * 7 + seed)() < 0.18 ? 1 : 0;
      const spikeB = rng(fr * 17 + i * 5 + seed)() < 0.18 ? 1 : 0;
      top.push(x, O[1] - hh - (n1v + spikeT * rough * 0.9) * k);
      bot.push(x, O[1] + hh + (n2v + spikeB * rough * 0.9) * k);
    }
    // rounded head of the beam
    const cap: number[] = [];
    const capR = o.half * k * 1.08;
    for (let i = 1; i < 6; i++) {
      const a = -Math.PI / 2 + (i / 6) * Math.PI;
      cap.push(Fx + Math.cos(a) * capR * 0.8, O[1] + Math.sin(a) * capR);
    }
    const out = [...top, ...cap];
    for (let i = bot.length - 2; i >= 0; i -= 2) out.push(bot[i], bot[i + 1]);
    return out;
  };
  const layer = (fill: string, scale: number, rough: number, seed: number, op = 1): Node => ({
    tag: "path",
    a: { fill, opacity: op, "stroke-linejoin": "round" },
    ch: [{ kind: "attr", attr: "d", f: (t) => outline(t, scale, rough, seed), fmt: polyFmt(true), tol: 1, fps: 15 }],
    vis,
  });
  sc.add("back", layer(th.kame.glow, 1.38, 7, 3, 0.28), layer(th.kame.outer, 1, 6, 5, 0.95), layer(th.kame.mid, 0.72, 4.5, 9), layer(th.kame.core, 0.4, 2.5, 13));

  // fast streaks flowing along the beam
  const r = rng(o.seed ?? 8);
  for (let k = 0; k < 6; k++) {
    const side = k % 2 ? 1 : -1;
    const off = side * (0.48 + r() * 0.32);
    const dash = 40 + r() * 70, gap = 70 + r() * 120;
    const speed = 1900 + r() * 900;
    sc.add("back", {
      tag: "path",
      a: { fill: "none", stroke: k % 3 === 0 ? th.kame.core : th.kame.mid, "stroke-width": 1 + r() * 0.8, "stroke-linecap": "round", "stroke-dasharray": `${n1(dash)} ${n1(gap)}`, opacity: 0.85 },
      ch: [
        {
          kind: "attr",
          attr: "d",
          f: (t) => {
            const O = origin(t);
            const y = O[1] + off * o.half * heightK(t) * 0.8;
            return [O[0] + 30, y, Math.max(O[0] + 31, front(t) - 10), y];
          },
          fmt: polyFmt(false),
          tol: 0.6,
        },
        attr("stroke-dashoffset", (t) => -(t - t0) * speed, { fmt: (v) => n1(v[0]), tol: 0.5 }),
      ],
      vis: within(t0 + 0.06, p.stop),
    });
  }
  // shockwaves at the hands
  for (let ti = t0; ti < p.stop - 0.1; ti += 0.22) {
    ringFx(sc, "fx", ti, origin(ti), { r0: 6, r1: o.half * 1.5, life: 0.26, color: th.kame.mid, width: 3, sy: 1.6, opacity: 0.8 });
  }
  glowFx(sc, "fx", t0, origin(t0), { r0: 24, r1: 90, life: 0.3, grad: "glow-blue", peak: 1, attack: 0.03 });
  sparks(sc, "fx", t0, origin(t0), { n: 12, color: th.kame.core, speed: [200, 420], life: 0.3, g: 0, dir: 0, spread: 120, width: 1.6 });
  return { front, heightK };
}
