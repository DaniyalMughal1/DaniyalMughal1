// Keyframe tracks. Each key carries the easing used to arrive at it (After Effects style).
import { E, lerp, type Ease } from "./math";

export interface Key<V> {
  t: number;
  v: V;
  e: Ease;
}

const EPS = 1e-4;

export class Track<V> {
  keys: Key<V>[];
  constructor(v0: V, private mixFn: (a: V, b: V, u: number) => V) {
    this.keys = [{ t: -1e6, v: v0, e: E.lin }];
  }
  get last() {
    return this.keys[this.keys.length - 1];
  }
  /** Tween to `v`, arriving at time t. */
  to(t: number, v: V, e: Ease = E.io) {
    if (t <= this.last.t) t = this.last.t + EPS;
    this.keys.push({ t, v, e });
    return this;
  }
  /** Keep the current value until t. */
  hold(t: number) {
    if (t > this.last.t + EPS) this.keys.push({ t, v: this.last.v, e: E.lin });
    return this;
  }
  /** Jump to v exactly at t (no tween). */
  set(t: number, v: V) {
    this.hold(t - EPS);
    this.keys.push({ t: Math.max(t, this.last.t + EPS / 2), v, e: E.lin });
    return this;
  }
  index(t: number) {
    const k = this.keys;
    let lo = 0, hi = k.length - 1;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (k[m].t <= t) lo = m;
      else hi = m - 1;
    }
    return lo;
  }
  at(t: number): V {
    const i = this.index(t);
    const k = this.keys;
    if (i >= k.length - 1) return k[k.length - 1].v;
    const a = k[i], b = k[i + 1];
    const u = (t - a.t) / (b.t - a.t);
    return this.mixFn(a.v, b.v, b.e(u));
  }
}

export const num = (v0 = 0) => new Track<number>(v0, lerp);
/** Values that never interpolate (facing, flags). */
export const step = <V>(v0: V) => new Track<V>(v0, (a, b, u) => (u >= 1 ? b : a));
export const vec = (v0: number[]) =>
  new Track<number[]>(v0, (a, b, u) => a.map((x, i) => lerp(x, b[i], u)));
