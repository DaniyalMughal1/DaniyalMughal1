// Turns a Fighter into animated SVG: one stroked path for the body (spine drawn
// as a curve through the chest so torsos flex), a filled head, a wand, and an
// optional hair layer that rides the head transform.
import { n1, attr, g, translate, rotateCh, scaleCh, type Chan, type Node } from "../core/svg";
import type { Fighter, World } from "../rig/fighter";
import type { V2 } from "../core/math";

const P = (p: V2) => `${n1(p[0])} ${n1(p[1])}`;

export function bodyPoints(w: World): number[] {
  const ctrl: V2 = [2 * w.chest[0] - (w.pelvis[0] + w.neck[0]) / 2, 2 * w.chest[1] - (w.pelvis[1] + w.neck[1]) / 2];
  return [
    ...w.footR, ...w.kneeR, ...w.pelvis, ...w.kneeL, ...w.footL,
    ...w.pelvis, ...ctrl, ...w.neck,
    ...w.handL, ...w.elbowL, ...w.shoulder, ...w.elbowR, ...w.handR,
  ];
}
export function bodyD(v: number[]) {
  const p = (i: number) => `${n1(v[i * 2])} ${n1(v[i * 2 + 1])}`;
  return `M${p(0)}L${p(1)}L${p(2)}L${p(3)}L${p(4)}M${p(5)}Q${p(6)} ${p(7)}M${p(8)}L${p(9)}L${p(10)}L${p(11)}L${p(12)}`;
}

export interface FigureStyle {
  ink: string;
  /** optional colour switch, e.g. black silhouette inside the beam */
  inkAlt?: string;
  alt?: (t: number) => boolean;
  wand?: { color: string; edge?: string; width: number };
  hair?: Node;
  vis?: (t: number) => boolean;
  /** hide the wand from this time on (it becomes a prop) */
  wandVis?: (t: number) => boolean;
}

export function figureNode(f: Fighter, st: FigureStyle): Node {
  const W = (t: number) => f.at(t);
  const colour = (prop: string): Chan[] =>
    st.alt && st.inkAlt
      ? [attr(prop, (t) => (st.alt!(t) ? 1 : 0), { discrete: true, fmt: (v) => (v[0] ? st.inkAlt! : st.ink) })]
      : [];
  const body: Node = {
    tag: "path",
    a: { fill: "none", stroke: st.ink, "stroke-width": f.d.stroke, "stroke-linecap": "round", "stroke-linejoin": "round" },
    ch: [{ kind: "attr", attr: "d", f: (t) => bodyPoints(W(t)), fmt: bodyD, tol: 0.32 }, ...colour("stroke")],
  };
  const wandNodes: Node[] = [];
  if (st.wand) {
    const wd = st.wand;
    const d = (t: number) => {
      const w = W(t);
      return [...w.handR, ...w.wandTip];
    };
    const fmt = (v: number[]) => `M${n1(v[0])} ${n1(v[1])}L${n1(v[2])} ${n1(v[3])}`;
    if (wd.edge)
      wandNodes.push({
        tag: "path",
        a: { stroke: wd.edge, "stroke-width": wd.width + 1.4, "stroke-linecap": "round" },
        ch: [{ kind: "attr", attr: "d", f: d, fmt, tol: 0.35 }],
        vis: st.wandVis,
      });
    wandNodes.push({
      tag: "path",
      a: { stroke: wd.color, "stroke-width": wd.width, "stroke-linecap": "round" },
      ch: [{ kind: "attr", attr: "d", f: d, fmt, tol: 0.35 }],
      vis: st.wandVis,
    });
  }
  const head = g(
    [
      g(
        [
          { tag: "circle", a: { r: f.d.headR, fill: st.ink }, ch: colour("fill") },
          st.hair ? g([st.hair], {}, [scaleCh((t) => [W(t).facing, 1], { discrete: true })]) : null,
        ],
        {},
        [rotateCh((t) => W(t).headAngle, { tol: 0.6 })],
      ),
    ],
    {},
    [translate((t) => W(t).head, { tol: 0.3 })],
  );
  return g([...wandNodes, body, head], {}, undefined, st.vis);
}

export { P };
