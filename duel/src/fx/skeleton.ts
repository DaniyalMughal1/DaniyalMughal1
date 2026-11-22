// The punchline: a tiny cartoon skeleton that cracks, loses an arm, and crumbles to dust.
import { FLOOR } from "../config";
import { add, clamp, E, lerp, mix, mul, noise, rng, sub, type V2 } from "../core/math";
import { attr, g, n1, rotateCh, scaleCh, translate, type Node } from "../core/svg";
import type { Fighter, World } from "../rig/fighter";
import type { Scene } from "../scene";

const within = (t0: number, t1: number) => (t: number) => t >= t0 && t < t1;
const P = (p: V2) => `${n1(p[0])} ${n1(p[1])}`;

export interface SkeletonPlan {
  show: number;
  crack: number;
  tilt: number;
  armOff: number;
  collapse: number;
  puff: number;
  gone: number;
}

function bone(sc: Scene, pts: V2[], w = 2.4): (Node | string)[] {
  const th = sc.th;
  const d = "M" + pts.map(P).join("L");
  const knobs = pts.map((p) => `<circle cx="${n1(p[0])}" cy="${n1(p[1])}" r="${n1(w * 0.78)}"/>`).join("");
  return [
    { tag: "path", a: { d, fill: "none", stroke: th.boneEdge, "stroke-width": n1(w + 2), "stroke-linecap": "round", "stroke-linejoin": "round" } },
    `<g fill="${th.boneEdge}">${pts.map((p) => `<circle cx="${n1(p[0])}" cy="${n1(p[1])}" r="${n1(w * 0.78 + 1)}"/>`).join("")}</g>`,
    { tag: "path", a: { d, fill: "none", stroke: th.bone, "stroke-width": n1(w), "stroke-linecap": "round", "stroke-linejoin": "round" } },
    `<g fill="${th.bone}">${knobs}</g>`,
  ];
}

export function skeleton(sc: Scene, v: Fighter, plan: SkeletonPlan) {
  const th = sc.th;
  const w: World = v.at(plan.show);
  const face = w.facing;
  const vis = within(plan.show, plan.collapse + 0.24);

  // collapse: each part drops with gravity and fades as the dust takes over
  const drop = (delay: number, dy: number, rot: number, pivot: V2) => [
    translate((t) => [0, dy * E.inQ(clamp((t - plan.collapse - delay) / 0.18, 0, 1))], { tol: 0.3 }),
    rotateCh((t) => rot * E.inQ(clamp((t - plan.collapse - delay) / 0.18, 0, 1)), { fmt: (v) => `${n1(v[0])} ${P(pivot)}`, tol: 0.5 }),
  ];
  const fade = attr("opacity", (t) => 1 - clamp((t - plan.collapse - 0.08) / 0.14, 0, 1));

  // legs + pelvis
  const pelvis: Node = {
    tag: "path",
    a: {
      d: `M${P(add(w.pelvis, [-5, -2]))}Q${P(add(w.pelvis, [0, 5]))} ${P(add(w.pelvis, [5, -2]))}Z`,
      fill: th.bone,
      stroke: th.boneEdge,
      "stroke-width": 1.2,
    },
  };
  sc.add("chars", g([...bone(sc, [w.footR, w.kneeR, w.pelvis]), ...bone(sc, [w.footL, w.kneeL, w.pelvis]), pelvis], {}, [...drop(0.04, 6, 0, w.pelvis), fade], vis));

  // spine (vertebrae) + ribs
  const ctrl: V2 = sub(mul(w.chest, 2), mul(add(w.pelvis, w.neck), 0.5));
  const spineD = `M${P(w.pelvis)}Q${P(ctrl)} ${P(w.neck)}`;
  const ribs: string[] = [];
  for (const s of [0.42, 0.6, 0.78]) {
    const c = mix(w.chest, w.neck, s * 1.4 - 0.4);
    const dir = sub(w.neck, w.chest);
    const L = Math.hypot(dir[0], dir[1]) || 1;
    const nx = -dir[1] / L, ny = dir[0] / L;
    const half = 6.5 - (s - 0.42) * 6;
    const a = add(c, [nx * half, ny * half]), b = add(c, [-nx * half, -ny * half]);
    const bow = add(c, mul(dir, -2.8 / L));
    ribs.push(`M${P(a)}Q${P(add(bow, mul([dir[0], dir[1]], -1.5 / L)))} ${P(b)}`);
  }
  const torso = g(
    [
      { tag: "path", a: { d: ribs.join(""), fill: "none", stroke: th.boneEdge, "stroke-width": 3.4, "stroke-linecap": "round" } },
      { tag: "path", a: { d: ribs.join(""), fill: "none", stroke: th.bone, "stroke-width": 1.6, "stroke-linecap": "round" } },
      { tag: "path", a: { d: spineD, fill: "none", stroke: th.boneEdge, "stroke-width": 4.4, "stroke-linecap": "round" } },
      { tag: "path", a: { d: spineD, fill: "none", stroke: th.bone, "stroke-width": 2.6, "stroke-linecap": "butt", "stroke-dasharray": "2.6 1.3" } },
    ],
    {},
    [...drop(0.07, FLOOR - w.chest[1] - 10, face * -40, w.pelvis), fade],
    vis,
  );
  sc.add("chars", torso);

  // right arm stays on until the collapse
  sc.add("chars", g(bone(sc, [w.shoulder, w.elbowR, w.handR], 2.1), {}, [...drop(0.05, FLOOR - w.elbowR[1] - 6, face * 70, w.shoulder), fade], vis));

  // left arm detaches and falls on its own
  const arm: V2[] = [w.shoulder, w.elbowL, w.handL];
  const armC: V2 = mix(w.shoulder, w.handL, 0.5);
  const fallDur = 0.3;
  const armLow = Math.max(...arm.map((p) => p[1]));
  const armTr = (t: number): V2 => {
    const u = clamp((t - plan.armOff) / fallDur, 0, 1);
    const dy = (FLOOR - armLow - 1.5) * E.inQ(u);
    const bounce = u >= 1 ? -Math.abs(Math.sin((t - plan.armOff - fallDur) * 22)) * 3 * Math.exp(-(t - plan.armOff - fallDur) * 10) : 0;
    return [face * -6 * u, dy + bounce + (u > 0 ? 6 * E.inQ(u) : 0)];
  };
  sc.add(
    "chars",
    g(
      bone(sc, arm, 2.1),
      {},
      [
        translate(armTr, { tol: 0.3 }),
        rotateCh((t) => face * 75 * E.inQ(clamp((t - plan.armOff) / fallDur, 0, 1)), { fmt: (v) => `${n1(v[0])} ${P(armC)}`, tol: 0.6 }),
        fade,
      ],
      vis,
    ),
  );

  // skull: tilts after the crack, then drops last
  const skullLocal = [
    { tag: "circle", a: { r: 8, fill: th.bone, stroke: th.boneEdge, "stroke-width": 1.3 } },
    { tag: "path", a: { d: "M-1.5 5.2h6.4v2.2a1.2 1.2 0 0 1-1.2 1.2h-4a1.2 1.2 0 0 1-1.2-1.2z", fill: th.bone, stroke: th.boneEdge, "stroke-width": 1.1 } },
    `<circle cx="3.1" cy="-0.6" r="2.1" fill="${th.boneEdge}"/><circle cx="-2" cy="-0.6" r="1.8" fill="${th.boneEdge}"/><path d="M1.2 2.2l1 2h-2z" fill="${th.boneEdge}"/><path d="M0.4 6.1v1.9M2 6.1v1.9M3.6 6.1v1.9" stroke="${th.boneEdge}" stroke-width="0.7"/>`,
    { tag: "path", a: { d: "M-3 -7.4l1.6 2.6l-1.4 1.6l1.8 2.6", fill: "none", stroke: th.boneEdge, "stroke-width": 1, "stroke-linecap": "round", "stroke-linejoin": "round" }, vis: (t: number) => t >= plan.crack },
  ] as Node["kids"];
  const tiltU = (t: number) => E.outBack(clamp((t - plan.tilt) / 0.22, 0, 1));
  sc.add(
    "chars",
    g(
      [
        g(
          [g(skullLocal, { transform: `scale(${face} 1)` })],
          {},
          [rotateCh((t) => face * (w.headAngle * face) * (1 - tiltU(t)) + face * -24 * tiltU(t) + (t > plan.crack && t < plan.crack + 0.12 ? Math.sin((t - plan.crack) * 90) * 3 : 0), { fmt: (v) => `${n1(v[0])} 0 7`, tol: 0.5 })],
        ),
      ],
      {},
      [
        translate((t) => {
          const u = clamp((t - plan.collapse - 0.1) / 0.2, 0, 1);
          return [w.head[0] + face * 2 * u, lerp(w.head[1], FLOOR - 9, E.inQ(u))];
        }, { tol: 0.3 }),
        attr("opacity", (t) => 1 - clamp((t - plan.collapse - 0.2) / 0.12, 0, 1)),
      ],
      within(plan.show, plan.collapse + 0.34),
    ),
  );

  // smoke wisps after the blast
  for (let k = 0; k < 3; k++) {
    const x0 = w.chest[0] + (k - 1) * 8;
    const y0 = w.chest[1] - 10 - k * 6;
    const t0 = plan.show + 0.05 + k * 0.12;
    const life = 0.9;
    sc.add("fx", {
      tag: "path",
      a: { fill: "none", stroke: th.smoke, "stroke-width": 2, "stroke-linecap": "round" },
      ch: [
        {
          kind: "attr",
          attr: "d",
          f: (t) => {
            const u = clamp((t - t0) / life, 0, 1);
            const y = y0 - 26 * E.outQ(u);
            const s = 4 + u * 4;
            return [x0, y + 10, x0 + s, y + 5, x0 - s * 0.6, y, x0 + s * 0.4, y - 6];
          },
          fmt: (v) => `M${n1(v[0])} ${n1(v[1])}C${n1(v[2])} ${n1(v[3])} ${n1(v[4])} ${n1(v[5])} ${n1(v[6])} ${n1(v[7])}`,
          tol: 0.5,
        },
        attr("opacity", (t) => 0.55 * Math.sin(Math.PI * clamp((t - t0) / life, 0, 1))),
      ],
      vis: within(t0, t0 + life),
    });
  }

  dust(sc, v, w, plan);
}

function dust(sc: Scene, v: Fighter, w: World, plan: SkeletonPlan) {
  const th = sc.th;
  const r = rng(99);
  const cx = w.pelvis[0];
  // the pile
  const pile: Node = {
    tag: "path",
    a: { d: `M${n1(cx - 17)} ${FLOOR}Q${n1(cx - 6)} ${FLOOR - 11} ${n1(cx + 1)} ${FLOOR - 10}Q${n1(cx + 8)} ${FLOOR - 9} ${n1(cx + 18)} ${FLOOR}Z`, fill: th.dust },
  };
  // scale about the pile's base: translate(c) * scale * translate(-c)
  const pileScale = scaleCh((t) => {
    const grow = E.outQ(clamp((t - plan.collapse - 0.1) / 0.16, 0, 1));
    const blow = 1 - E.inOutQ(clamp((t - plan.puff) / 0.35, 0, 1));
    return [1 + (1 - blow) * 0.3, Math.max(0.001, grow * blow)];
  }, { tol: 0.02 });
  sc.add(
    "chars",
    g([g([g([pile], { transform: `translate(${n1(-cx)} ${-FLOOR})` })], {}, [pileScale])], { transform: `translate(${n1(cx)} ${FLOOR})` }, undefined, within(plan.collapse + 0.1, plan.puff + 0.4)),
  );

  // grains: fall into the pile with the bones, then get carried off by a puff of air
  const src: V2[] = [w.head, w.neck, w.chest, w.pelvis, w.elbowR, w.handR, w.kneeR, w.kneeL, w.footR, w.footL];
  const N = 54;
  for (let i = 0; i < N; i++) {
    const a = src[i % src.length], b = src[(i * 3 + 1) % src.length];
    const s0 = mix(a, b, r());
    const rest: V2 = [cx + (r() - 0.5) * 30, FLOOR - 1 - r() * 8];
    const linger = i % 9 === 0;
    const vx = linger ? 30 + r() * 40 : 140 + r() * 220;
    const vy = -(10 + r() * 50);
    const tFall = plan.collapse + 0.02 + r() * 0.16;
    const tBlow = plan.puff + r() * 0.18;
    const life = linger ? plan.gone - tBlow : 0.5 + r() * 0.45;
    const rad = 0.7 + r() * 1.3;
    const pos = (t: number): V2 => {
      if (t < tBlow) {
        const u = E.inQ(clamp((t - tFall) / 0.22, 0, 1));
        return mix(s0, rest, u);
      }
      const dt = t - tBlow;
      return [rest[0] + vx * dt + noise(t * 3 + i, 4) * 10 * dt, rest[1] + vy * dt * (1 - dt * 0.6) + noise(t * 4 + i, 5) * 6 * dt];
    };
    sc.add("fx", {
      tag: "circle",
      a: { r: n1(rad), fill: th.dust },
      ch: [
        translate(pos, { tol: 0.5 }),
        attr("opacity", (t) => (t < tBlow ? Math.min(1, (t - tFall) / 0.08) : 1 - E.inQ(clamp((t - tBlow) / life, 0, 1)))),
      ],
      vis: within(tFall, tBlow + life),
    });
  }
  // the puff itself: two faint swooshes
  for (let k = 0; k < 2; k++) {
    const t0 = plan.puff - 0.04 + k * 0.08;
    const y = FLOOR - 10 - k * 9;
    sc.add("fx", {
      tag: "path",
      a: { d: `M${n1(cx - 70)} ${y}q40 -8 80 0t80 0`, fill: "none", stroke: th.dust, "stroke-width": 1.3, "stroke-linecap": "round", "stroke-dasharray": "60 400" },
      ch: [
        attr("stroke-dashoffset", (t) => 60 - 220 * E.out(clamp((t - t0) / 0.5, 0, 1)), { fmt: (v) => n1(v[0]), tol: 1 }),
        attr("opacity", (t) => 0.6 * Math.sin(Math.PI * clamp((t - t0) / 0.5, 0, 1))),
      ],
      vis: within(t0, t0 + 0.5),
    });
  }
  void v;
}
