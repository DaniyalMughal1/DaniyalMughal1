// A fighter = a rig + keyframed channels + constraints.
//
// Evaluation order for a frame:
//   1. pose angles from keyframes (each joint sampled with its own lag -> overlap/follow-through)
//   2. root channels (x, y, body rotation, facing, squash)
//   3. gait solver (procedural footsteps from root travel distance, no sliding)
//   4. foot plants and hand reaches (2-bone IK, blended by weight)
//   5. tremble noise, then FK -> world points
import { FLOOR } from "../config";
import { add, clamp, dirPhi, E, lerp, mix, mul, noise, rotate, smoothstep, type Ease, type V2 } from "../core/math";
import { num, step, Track } from "../core/track";
import { POSES, type PoseName } from "./poses";
import { fk, ik2, JOINTS, lerpPose, type Dims, type Joint, type Pose } from "./skeleton";

export type PoseArg = PoseName | Partial<Pose> | [PoseName, Partial<Pose>];
type Target = V2 | ((t: number) => V2);

interface Plant {
  foot: "R" | "L";
  t0: number;
  t1: number;
  bin: number;
  bout: number;
  target?: Target;
  locked?: V2;
  locking?: boolean;
}
interface Reach {
  hand: "R" | "L";
  t0: number;
  t1: number;
  bin: number;
  bout: number;
  target: Target;
  bend: number;
}
export interface GaitOpts {
  /** steps per second at walking pace and at full run */
  cadence: [number, number];
  stance: number;
  lift: number;
  bob: number;
  height: number;
  swing: number;
  armR: boolean;
  armL: boolean;
  blend: number;
  run: boolean;
}
interface Gait extends GaitOpts {
  t0: number;
  t1: number;
  x0: number;
  dir: number;
  /** precomputed (time, phase, x) table: phase advances with cadence, so stride scales with speed */
  tt: number[];
  cc: number[];
  xx: number[];
}
interface Tremble {
  t0: number;
  t1: number;
  amp: number;
  freq: number;
  root: number;
}

export interface World {
  pelvis: V2; chest: V2; neck: V2; head: V2; shoulder: V2;
  elbowR: V2; handR: V2; wandTip: V2; elbowL: V2; handL: V2;
  kneeR: V2; footR: V2; kneeL: V2; footL: V2;
  headAngle: number;
  facing: number;
  rot: number;
}

const DEFAULT_LAG: Record<Joint, number> = {
  lean: 0, bend: 0.018, head: 0.045,
  shR: 0.022, elR: 0.05, wrR: 0.075,
  shL: 0.03, elL: 0.06, wrL: 0.06,
  hipR: 0, kneeR: 0.02, hipL: 0, kneeL: 0.02,
};

const weightAt = (t: number, t0: number, t1: number, bin: number, bout: number) => {
  if (t < t0 - bin || t > t1 + bout) return 0;
  if (t < t0) return smoothstep((t - (t0 - bin)) / Math.max(bin, 1e-6));
  if (t > t1) return smoothstep(1 - (t - t1) / Math.max(bout, 1e-6));
  return 1;
};

export class Fighter {
  pose: Track<Pose>;
  x = num(0);
  y = num(0);
  rot = num(0);
  sx = num(1);
  sy = num(1);
  pivot = num(0);
  facing = step(1);
  wandOn = step(true);
  visible = step(true);
  plants: Plant[] = [];
  reaches: Reach[] = [];
  gaits: Gait[] = [];
  trembles: Tremble[] = [];
  lag: Record<Joint, number> = { ...DEFAULT_LAG };
  lagScale = num(1);
  /** time of the previous key on any channel: every tween starts there (pose-to-pose) */
  private lastT = -Infinity;

  constructor(public name: string, public d: Dims, pose0: PoseName, x0: number, facing0: number) {
    this.pose = new Track<Pose>({ ...POSES[pose0] }, lerpPose);
    this.x = num(x0);
    this.facing = step(facing0);
    this.y = num(this.groundY(POSES[pose0], 0, 0));
  }

  resolvePose(p: PoseArg, base: Pose): Pose {
    if (typeof p === "string") return { ...POSES[p] };
    if (Array.isArray(p)) return { ...POSES[p[0]], ...p[1] };
    return { ...base, ...p };
  }

  /** Key any set of channels at time t. `y: "G"` plants the pose on the floor. */
  key(
    t: number,
    s: { pose?: PoseArg; x?: number; y?: number | "G"; dy?: number; rot?: number; sx?: number; sy?: number; pivot?: number; face?: number },
    e: Ease = E.io,
    posE?: Ease,
  ) {
    const from = this.lastT;
    const start = (tr: Track<any>) => {
      if (from < t) tr.hold(from);
    };
    if (s.pose !== undefined) {
      start(this.pose);
      this.pose.to(t, this.resolvePose(s.pose, this.pose.last.v), posE ?? e);
    }
    if (s.x !== undefined) (start(this.x), this.x.to(t, s.x, e));
    if (s.rot !== undefined) (start(this.rot), this.rot.to(t, s.rot, e));
    if (s.pivot !== undefined) (start(this.pivot), this.pivot.to(t, s.pivot, e));
    if (s.sx !== undefined) (start(this.sx), this.sx.to(t, s.sx, e));
    if (s.sy !== undefined) (start(this.sy), this.sy.to(t, s.sy, e));
    this.lastT = Math.max(this.lastT, t);
    if (s.y !== undefined) {
      start(this.y);
      const y = s.y === "G" ? this.groundY(this.pose.at(t), this.rot.at(t), this.pivot.at(t)) + (s.dy ?? 0) : s.y;
      this.y.to(t, y, e);
    }
    if (s.face !== undefined) this.facing.set(t, s.face);
    return this;
  }
  hold(t: number) {
    for (const tr of [this.pose, this.x, this.y, this.rot, this.sx, this.sy, this.pivot] as Track<any>[]) tr.hold(t);
    this.lastT = Math.max(this.lastT, t);
    return this;
  }

  plant(foot: "R" | "L" | "both", t0: number, t1: number, opts: { at?: Target; bin?: number; bout?: number } = {}) {
    for (const f of foot === "both" ? (["R", "L"] as const) : [foot])
      this.plants.push({ foot: f, t0, t1, bin: opts.bin ?? 0.05, bout: opts.bout ?? 0.06, target: opts.at });
    return this;
  }
  reach(hand: "R" | "L", t0: number, t1: number, target: Target, opts: { bin?: number; bout?: number; bend?: number } = {}) {
    this.reaches.push({ hand, t0, t1, target, bin: opts.bin ?? 0.12, bout: opts.bout ?? 0.12, bend: opts.bend ?? -1 });
    return this;
  }
  gait(t0: number, t1: number, o: Partial<GaitOpts> = {}) {
    const run = o.run ?? false;
    const opts: GaitOpts = {
      cadence: run ? [3.6, 4.6] : [1.9, 3.2],
      stance: run ? 0.36 : 0.62,
      lift: run ? 12 : 5,
      bob: run ? 2.4 : 1.4,
      height: run ? 0.87 : 0.95,
      swing: run ? 36 : 18,
      armR: true,
      armL: true,
      blend: 0.1,
      run,
      ...o,
    };
    const x0 = this.x.at(t0), x1 = this.x.at(t1);
    const tt: number[] = [], cc: number[] = [], xx: number[] = [];
    const dt = 1 / 240;
    let c = 0;
    for (let t = t0; t <= t1 + 1e-9; t += dt) {
      const v = Math.abs(this.x.at(t + dt / 2) - this.x.at(t - dt / 2)) / dt;
      const cad = lerp(opts.cadence[0], opts.cadence[1], clamp((v - 60) / 200, 0, 1));
      tt.push(t);
      cc.push(c);
      xx.push(this.x.at(t));
      c += (cad / 2) * dt * clamp(v / 25, 0, 1);
    }
    this.gaits.push({ ...opts, t0, t1, x0, dir: Math.sign(x1 - x0) || 1, tt, cc, xx });
    return this;
  }
  tremble(t0: number, t1: number, amp = 3, freq = 14, root = 0.6) {
    this.trembles.push({ t0, t1, amp, freq, root });
    return this;
  }

  get legLen() {
    return this.d.thigh + this.d.shin;
  }

  // ------------------------------------------------------------ geometry
  private pivotLocal(p: Pose, pivot: number): V2 {
    const j = fk(p, this.d);
    return mix(j.pelvis, j.chest, pivot);
  }

  /** Root y that rests the lowest part of the body on the floor. */
  groundY(p: Pose, rot: number, pivot: number) {
    const j = fk(p, this.d);
    const pv = mix(j.pelvis, j.chest, pivot);
    const pts: V2[] = [j.footR, j.footL, j.kneeR, j.kneeL, j.handR, j.handL, j.elbowR, j.elbowL, j.pelvis, j.chest, j.neck];
    let maxY = -1e9;
    for (const q of pts) {
      const r = add(pv, rotate([q[0] - pv[0], q[1] - pv[1]], rot));
      maxY = Math.max(maxY, r[1]);
    }
    const hb = add(pv, rotate([j.head[0] - pv[0], j.head[1] - pv[1]], rot));
    maxY = Math.max(maxY, hb[1] + this.d.headR - this.d.stroke / 2);
    return FLOOR - this.d.stroke / 2 - maxY;
  }

  private basePose(t: number): Pose {
    const ls = this.lagScale.at(t);
    const o = {} as Pose;
    // evaluate each joint with its own lag: the head and hands trail the torso
    const cache = new Map<number, Pose>();
    for (const jn of JOINTS) {
      const tt = t - this.lag[jn] * ls;
      const key = Math.round(tt * 1e5);
      let p = cache.get(key);
      if (!p) {
        p = this.pose.at(tt);
        cache.set(key, p);
      }
      o[jn] = p[jn];
    }
    return o;
  }

  private root(t: number) {
    return {
      x: this.x.at(t),
      y: this.y.at(t),
      rot: this.rot.at(t),
      sx: this.sx.at(t),
      sy: this.sy.at(t),
      f: this.facing.at(t),
      pivot: this.pivot.at(t),
    };
  }

  private toWorld(q: V2, pv: V2, r: ReturnType<Fighter["root"]>): V2 {
    const l = add(pv, rotate([q[0] - pv[0], q[1] - pv[1]], r.rot));
    let wx = r.x + r.f * l[0];
    let wy = r.y + l[1];
    wx = r.x + (wx - r.x) * r.sx;
    wy = FLOOR + (wy - FLOOR) * r.sy;
    return [wx, wy];
  }
  private toLocal(w: V2, pv: V2, r: ReturnType<Fighter["root"]>): V2 {
    const X = ((w[0] - r.x) / r.sx) * r.f;
    const Y = (FLOOR + (w[1] - FLOOR) / r.sy) - r.y;
    return add(pv, rotate([X - pv[0], Y - pv[1]], -r.rot));
  }

  /** Gait: foot targets in world space + root bob + arm swing. */
  private gaitAt(t: number) {
    for (const g of this.gaits) {
      const w = weightAt(t, g.t0, g.t1, g.blend, g.blend);
      if (w <= 0) continue;
      const tc = clamp(t, g.t0, g.t1);
      const n = g.tt.length;
      const fi = clamp((tc - g.t0) * 240, 0, n - 1);
      const i0 = Math.floor(fi);
      const phase = lerp(g.cc[i0], g.cc[Math.min(i0 + 1, n - 1)], fi - i0);
      // body x when the phase reached `c` (binary search in the monotonic phase table)
      const xAtPhase = (c: number) => {
        if (c <= g.cc[0]) return g.xx[0] - (g.cc[0] - c) * 0; // feet start under the body
        if (c >= g.cc[n - 1]) return g.xx[n - 1];
        let lo = 0, hi = n - 1;
        while (hi - lo > 1) {
          const m = (lo + hi) >> 1;
          if (g.cc[m] <= c) lo = m;
          else hi = m;
        }
        const f = (c - g.cc[lo]) / Math.max(1e-9, g.cc[hi] - g.cc[lo]);
        return lerp(g.xx[lo], g.xx[hi], f);
      };
      const footFloor = FLOOR - this.d.stroke / 2;
      const feet: Record<"R" | "L", V2> = { R: [0, 0], L: [0, 0] };
      for (const [foot, off] of [["R", 0.25], ["L", 0.75]] as const) {
        const cf = phase + off;
        const k = Math.floor(cf), f = cf - k;
        const P = (kk: number) => xAtPhase(kk + g.stance / 2 - off);
        if (f < g.stance) feet[foot] = [P(k), footFloor];
        else {
          const u = (f - g.stance) / (1 - g.stance);
          const vv = Math.abs(this.x.at(tc + 0.01) - this.x.at(tc - 0.01)) / 0.02;
          const lift = g.lift * lerp(0.45, 1, clamp((vv - 60) / 180, 0, 1));
          feet[foot] = [lerp(P(k), P(k + 1), E.sine(u)), footFloor - lift * Math.sin(Math.PI * u)];
        }
      }
      const s2 = 2 * (phase + 0.25) - g.stance;
      // speed shapes the gait: slow = upright walk, fast = low, bouncy run
      const v = Math.abs(this.x.at(tc + 0.01) - this.x.at(tc - 0.01)) / 0.02;
      const sp = clamp((v - 60) / 180, 0, 1);
      const amp = clamp(v / 60, 0, 1);
      const bob = lerp(-1.3, g.run ? g.bob : 1.4, sp) * amp * Math.cos(2 * Math.PI * s2);
      const gy = footFloor - this.legLen * (g.run ? lerp(0.95, g.height, sp) : g.height) + bob;
      const swing = g.swing * lerp(0.55, 1, sp) * amp * Math.sin(2 * Math.PI * (phase + 0.25));
      return { w, feet, gy, swing, g };
    }
    return null;
  }

  private plantTarget(p: Plant, t: number): V2 {
    if (p.target) return typeof p.target === "function" ? p.target(t) : p.target;
    if (!p.locked) {
      p.locking = true;
      const w = this.evaluate(p.t0, p);
      p.locking = false;
      p.locked = p.foot === "R" ? w.footR : w.footL;
      p.locked = [p.locked[0], Math.min(p.locked[1], FLOOR - this.d.stroke / 2)];
    }
    return p.locked;
  }

  evaluate(t: number, skip?: Plant): World {
    const P = this.basePose(t);
    const r = this.root(t);

    // gait
    const gait = this.gaitAt(t);
    const footT: Partial<Record<"R" | "L", { at: V2; w: number }>> = {};
    if (gait) {
      r.y = lerp(r.y, gait.gy, gait.w);
      if (gait.g.armR) P.shR += gait.swing * gait.w;
      if (gait.g.armL) P.shL -= gait.swing * gait.w;
      if (gait.g.run) {
        if (gait.g.armR) P.elR += Math.max(0, gait.swing) * 0.4 * gait.w;
        if (gait.g.armL) P.elL += Math.max(0, -gait.swing) * 0.4 * gait.w;
      }
      footT.R = { at: gait.feet.R, w: gait.w };
      footT.L = { at: gait.feet.L, w: gait.w };
    }
    // plants override gait
    for (const p of this.plants) {
      if (p === skip || p.locking) continue;
      const w = weightAt(t, p.t0, p.t1, p.bin, p.bout);
      if (w <= 0) continue;
      const at = this.plantTarget(p, clamp(t, p.t0, p.t1));
      const prev = footT[p.foot];
      if (!prev || w >= prev.w) footT[p.foot] = { at, w };
      else footT[p.foot] = { at: mix(prev.at, at, w), w: prev.w };
    }
    // tremble
    for (const tr of this.trembles) {
      const w = weightAt(t, tr.t0, tr.t1, 0.08, 0.12);
      if (w <= 0) continue;
      P.lean += noise(t * tr.freq, 3) * tr.amp * w;
      P.head += noise(t * tr.freq * 1.3, 7) * tr.amp * 1.2 * w;
      P.shR += noise(t * tr.freq * 1.1, 11) * tr.amp * 0.6 * w;
      P.shL += noise(t * tr.freq * 0.9, 13) * tr.amp * 0.6 * w;
      r.x += noise(t * tr.freq * 0.8, 17) * tr.root * w;
    }

    // IK needs the rotation pivot from the (pre-IK) spine, which IK never changes
    const pv = this.pivotLocal(P, r.pivot);
    for (const foot of ["R", "L"] as const) {
      const ft = footT[foot];
      if (!ft) continue;
      const loc = this.toLocal(ft.at, pv, r);
      const s = ik2([0, 0], loc, this.d.thigh, this.d.shin, 1);
      const hipK = foot === "R" ? "hipR" : "hipL", kneeK = foot === "R" ? "kneeR" : "kneeL";
      P[hipK] = lerp(P[hipK], s.p1, ft.w);
      P[kneeK] = lerp(P[kneeK], s.p1 - s.p2, ft.w);
    }
    for (const rc of this.reaches) {
      const w = weightAt(t, rc.t0, rc.t1, rc.bin, rc.bout);
      if (w <= 0) continue;
      const tc = clamp(t, rc.t0, rc.t1);
      const tgt = typeof rc.target === "function" ? rc.target(tc) : rc.target;
      const j0 = fk(P, this.d);
      const loc = this.toLocal(tgt, pv, r);
      const s = ik2(j0.shoulder, loc, this.d.upper, this.d.fore, rc.bend);
      const shK = rc.hand === "R" ? "shR" : "shL", elK = rc.hand === "R" ? "elR" : "elL";
      P[shK] = lerp(P[shK], s.p1 - j0.down, w);
      P[elK] = lerp(P[elK], s.p2 - s.p1, w);
    }

    const j = fk(P, this.d);
    const W = (q: V2) => this.toWorld(q, pv, r);
    return {
      pelvis: W(j.pelvis), chest: W(j.chest), neck: W(j.neck), head: W(j.head), shoulder: W(j.shoulder),
      elbowR: W(j.elbowR), handR: W(j.handR), wandTip: W(j.wandTip), elbowL: W(j.elbowL), handL: W(j.handL),
      kneeR: W(j.kneeR), footR: W(j.footR), kneeL: W(j.kneeL), footL: W(j.footL),
      headAngle: r.f * (j.headTilt + r.rot),
      facing: r.f,
      rot: r.rot,
    };
  }

  /** Cached evaluation (choreography and renderers ask for the same frames many times). */
  private memo = new Map<number, World>();
  at(t: number): World {
    const k = Math.round(t * 1e4);
    let w = this.memo.get(k);
    if (!w) {
      w = this.evaluate(t);
      this.memo.set(k, w);
    }
    return w;
  }
  clearCache() {
    this.memo.clear();
    for (const p of this.plants) p.locked = undefined;
  }
}

export const lerpV = (a: V2, b: V2, u: number): V2 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
export const along = (from: V2, phi: number, l: number): V2 => add(from, mul(dirPhi(phi), l));
