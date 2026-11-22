// A tiny SVG scene graph whose attributes are functions of time.
//
// Every animated attribute is sampled at 60 fps, then reduced with a
// Ramer-Douglas-Peucker pass (value error, not geometric distance) so the
// emitted SMIL keeps only the keys linear interpolation actually needs.
// The same graph renders a static frame (for stills / reduced motion).

export type Fmt = (v: number[]) => string;

export interface Chan {
  kind: "attr" | "translate" | "rotate" | "scale";
  attr?: string;
  f: (t: number) => number[];
  fmt: Fmt;
  /** max error allowed by keyframe reduction, in output units */
  tol?: number;
  /** step between samples instead of interpolating (anime "on twos" flicker) */
  discrete?: boolean;
  fps?: number;
}

export interface Node {
  tag: string;
  a?: Record<string, string | number | undefined>;
  kids?: (Node | string | null | undefined | false)[];
  ch?: Chan[];
  /** display toggling; invisible stretches are held so they cost no keys */
  vis?: (t: number) => boolean;
}

export interface Ctx {
  mode: "anim" | "still";
  /** poster time: used for the still and for base attribute values */
  t: number;
  T: number;
  stats?: { anims: number; keys: number };
}

export const n1 = (v: number) => {
  const r = Math.round(v * 10) / 10;
  return Object.is(r, -0) ? "0" : String(r);
};
export const n2 = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? "0" : String(r);
};
export const n0 = (v: number) => String(Math.round(v));

export const fmtXY: Fmt = (v) => `${n1(v[0])} ${n1(v[1])}`;
export const fmt1: Fmt = (v) => n1(v[0]);
export const fmt2: Fmt = (v) => n2(v[0]);
export const fmtRot: Fmt = (v) => n1(v[0]);

// ---------------------------------------------------------------- helpers to build channels
export const attr = (name: string, f: (t: number) => number, opts: Partial<Chan> = {}): Chan => ({
  kind: "attr",
  attr: name,
  f: (t) => [f(t)],
  fmt: fmt2,
  tol: name === "opacity" ? 0.035 : 0.01,
  ...opts,
});
export const translate = (f: (t: number) => [number, number], opts: Partial<Chan> = {}): Chan => ({
  kind: "translate",
  f,
  fmt: fmtXY,
  tol: 0.25,
  ...opts,
});
export const rotateCh = (f: (t: number) => number, opts: Partial<Chan> = {}): Chan => ({
  kind: "rotate",
  f: (t) => [f(t)],
  fmt: fmtRot,
  tol: 0.4,
  ...opts,
});
export const scaleCh = (f: (t: number) => [number, number], opts: Partial<Chan> = {}): Chan => ({
  kind: "scale",
  f,
  fmt: (v) => `${n2(v[0])} ${n2(v[1])}`,
  tol: 0.01,
  ...opts,
});

// ---------------------------------------------------------------- reduction
function rdp(ts: number[], vs: number[][], tol: number): number[] {
  const n = ts.length;
  if (n <= 2) return [...Array(n).keys()];
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  const dims = vs[0].length;
  while (stack.length) {
    const [a, b] = stack.pop()!;
    if (b - a < 2) continue;
    let worst = -1, wi = -1;
    const ta = ts[a], tb = ts[b], va = vs[a], vb = vs[b];
    for (let k = a + 1; k < b; k++) {
      const u = (ts[k] - ta) / (tb - ta);
      const vk = vs[k];
      let e = 0;
      for (let d = 0; d < dims; d++) {
        const err = Math.abs(vk[d] - (va[d] + (vb[d] - va[d]) * u));
        if (err > e) e = err;
      }
      if (e > worst) {
        worst = e;
        wi = k;
      }
    }
    if (worst > tol) {
      keep[wi] = 1;
      stack.push([a, wi], [wi, b]);
    }
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(i);
  return out;
}

function visibleMask(vis: ((t: number) => boolean) | undefined, ts: number[]) {
  return ts.map((t) => (vis ? vis(t) : true));
}

/** Replace samples where the node is hidden with the nearest visible value (held → free). */
function holdHidden(vs: number[][], mask: boolean[]) {
  const n = vs.length;
  let first = mask.indexOf(true);
  if (first < 0) return vs;
  const out = vs.slice();
  for (let i = 0; i < first; i++) out[i] = vs[first];
  let lastVis = vs[first];
  for (let i = first; i < n; i++) {
    if (mask[i]) lastVis = vs[i];
    else out[i] = lastVis;
  }
  return out;
}

const kt = (t: number, T: number) => {
  const s = (t / T).toFixed(5);
  return s.replace(/0+$/, "").replace(/\.$/, "") || "0";
};

function emitChan(c: Chan, ctx: Ctx, vis?: (t: number) => boolean, keepConst = false): string {
  const T = ctx.T;
  const fps = c.fps ?? 60;
  const N = Math.round(T * fps);
  const ts: number[] = [];
  for (let i = 0; i <= N; i++) ts.push((i / N) * T);
  const mask = visibleMask(vis, ts);
  let vs = ts.map((t) => c.f(t));
  vs = holdHidden(vs, mask);

  let idx: number[];
  let vals: string[];
  if (c.discrete) {
    idx = [0];
    vals = [c.fmt(vs[0])];
    for (let i = 1; i < vs.length - 1; i++) {
      const s = c.fmt(vs[i]);
      if (s !== vals[vals.length - 1]) {
        idx.push(i);
        vals.push(s);
      }
    }
  } else {
    idx = rdp(ts, vs, c.tol ?? 0.3);
    vals = idx.map((i) => c.fmt(vs[i]));
  }
  // drop the animation entirely if it never changes
  if (!keepConst && vals.every((v) => v === vals[0])) return "";
  if (vals.length === 1) {
    idx.push(vs.length - 1);
    vals.push(vals[0]);
  }
  if (ctx.stats) {
    ctx.stats.anims++;
    ctx.stats.keys += idx.length;
  }
  const keyTimes = idx.map((i) => kt(ts[i], T)).join(";");
  const common = `values="${vals.join(";")}" keyTimes="${keyTimes}" dur="${T}s" repeatCount="indefinite"${c.discrete ? ' calcMode="discrete"' : ""}`;
  if (c.kind === "attr") return `<animate attributeName="${c.attr}" ${common}/>`;
  return `<animateTransform attributeName="transform" type="${c.kind}" ${common}%ADD%/>`;
}

function emitVis(vis: (t: number) => boolean, ctx: Ctx): string {
  const T = ctx.T;
  const N = Math.round(T * 60);
  const vals: string[] = [];
  const times: number[] = [];
  let prev: boolean | null = null;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * T;
    const v = vis(t);
    if (v !== prev) {
      vals.push(v ? "inline" : "none");
      times.push(t);
      prev = v;
    }
  }
  if (vals.length <= 1) return "";
  return `<animate attributeName="display" values="${vals.join(";")}" keyTimes="${times
    .map((t) => kt(t, T))
    .join(";")}" dur="${T}s" calcMode="discrete" repeatCount="indefinite"/>`;
}

function tfString(c: Chan, v: number[]) {
  if (c.kind === "translate") return `translate(${n1(v[0])} ${n1(v[1])})`;
  if (c.kind === "rotate") return `rotate(${c.fmt(v)})`;
  return `scale(${c.fmt(v)})`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function render(node: Node | string | null | undefined | false, ctx: Ctx): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  const still = ctx.mode === "still";
  if (still && node.vis && !node.vis(ctx.t)) return "";
  const attrs: Record<string, string> = {};
  for (const [k, v] of Object.entries(node.a ?? {})) if (v !== undefined) attrs[k] = String(v);

  const anims: string[] = [];
  const tfs: string[] = [];
  let tfCount = 0;
  const keepConst = (node.ch ?? []).filter((c) => c.kind !== "attr").length >= 2;
  for (const c of node.ch ?? []) {
    const v0 = c.f(ctx.t);
    if (c.kind === "attr") attrs[c.attr!] = c.fmt(v0);
    else tfs.push(tfString(c, v0));
    if (!still) {
      let s = emitChan(c, ctx, node.vis, keepConst && c.kind !== "attr");
      if (s && c.kind !== "attr") {
        s = s.replace("%ADD%", tfCount > 0 ? ' additive="sum"' : "");
        tfCount++;
      }
      if (s) anims.push(s);
    }
  }
  if (tfs.length) attrs.transform = (attrs.transform ? attrs.transform + " " : "") + tfs.join(" ");
  if (!still && node.vis) {
    const s = emitVis(node.vis, ctx);
    if (s) anims.push(s);
    if (!node.vis(ctx.t)) attrs.display = "none";
  }
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join("");
  const inner = anims.join("") + (node.kids ?? []).map((k) => render(k, ctx)).join("");
  return inner ? `<${node.tag}${attrStr}>${inner}</${node.tag}>` : `<${node.tag}${attrStr}/>`;
}

export const g = (kids: Node["kids"], a: Node["a"] = {}, ch?: Chan[], vis?: Node["vis"]): Node => ({
  tag: "g",
  a,
  kids,
  ch,
  vis,
});
